/**
 * 🔫 Weapon fire support: projectile config + muzzle controller
 */

export class ProjectileConfig {
  constructor(input = {}) {
    const defaults = {
      weaponType: 'projectile', // 'projectile' | 'raycast' | 'laser' (laser alias)
      bulletSpeed: 10,          // px per tick step
      bulletsPerShot: 1,        // bullets spawned per shot
      maxRange: 400,            // px
      fireRate: 200,            // ms between shots
      bulletLifetime: 2.0,      // seconds (for projectile)
      autoFire: true,
      // combat
      damage: 1,
      friendlyFire: false,
      validTargets: { block: ['building','structure'], hit: ['unit'] },
      penetration: 1,           // for raycast: count of entities to pierce through (hit targets)
      // visuals
      size: 2, // legacy
      width: undefined,
      height: undefined,
      color: 0xFFD700,
      // raycast visuals (tracer/beam)
      raycastAnimation: 'laser', // 'laser' | 'impact' | 'none'
      tracerWidth: 2,
      tracerColor: 0xFF4444,
      tracerAlpha: 0.9,
      tracerTtlMs: 60,
      // new grouped configs
      sizeBullet: undefined,
      bulletConfigs: {
        collideAsPoint: false,
        collisionRadius: null, // null -> use sizeBullet
        useCCD: false,
        validTargets: undefined
      }
    };
    const cfg = { ...defaults, ...(input || {}) };
    const bc = cfg.bulletConfigs || {};
    this.weaponType = cfg.weaponType;
    this.bulletSpeed = Number(cfg.bulletSpeed) || defaults.bulletSpeed;
    this.bulletsPerShot = Math.max(1, Math.floor(cfg.bulletsPerShot || defaults.bulletsPerShot));
    this.maxRange = Math.max(0, Number(cfg.maxRange) || defaults.maxRange);
    this.fireRate = Math.max(1, Number(cfg.fireRate) || defaults.fireRate);
    this.bulletLifetimeMs = Math.max(0, Math.floor((cfg.bulletLifetime != null ? cfg.bulletLifetime : defaults.bulletLifetime) * 1000));
    this.autoFire = !!cfg.autoFire;
    // combat
    this.damage = Number(cfg.damage) || defaults.damage;
    this.friendlyFire = !!cfg.friendlyFire;
    this.validTargets = (bc.validTargets) || cfg.validTargets || defaults.validTargets;
    this.penetration = Math.max(0, Number(cfg.penetration != null ? cfg.penetration : defaults.penetration));
    // visuals
    this.sizeBullet = (cfg.sizeBullet != null) ? cfg.sizeBullet : ((cfg.size != null) ? cfg.size : defaults.size);
    this.width = cfg.width;
    this.height = cfg.height;
    this.color = (cfg.color != null) ? cfg.color : defaults.color;
    this.raycastAnimation = cfg.raycastAnimation;
    this.tracerWidth = Number(cfg.tracerWidth != null ? cfg.tracerWidth : defaults.tracerWidth);
    this.tracerColor = (cfg.tracerColor != null) ? cfg.tracerColor : defaults.tracerColor;
    this.tracerAlpha = (cfg.tracerAlpha != null) ? cfg.tracerAlpha : defaults.tracerAlpha;
    this.tracerTtlMs = Math.max(0, Number(cfg.tracerTtlMs != null ? cfg.tracerTtlMs : defaults.tracerTtlMs));
    // collision behavior
    this.collideAsPoint = !!bc.collideAsPoint;
    this.collisionRadius = (bc.collisionRadius != null) ? bc.collisionRadius : null;
    this.useCCD = !!bc.useCCD;
  }
}

// 🔁 Shared per-world ticker for all muzzle controllers to avoid multiple timers and rate stacking
const WORLD_MUZZLE_TICKERS = new WeakMap();

class SharedMuzzleTicker {
  constructor(world) {
    this.world = world;
    this.controllers = new Set();
    this._timer = null;
  }

  add(controller) {
    this.controllers.add(controller);
    this._ensure();
  }

  remove(controller) {
    this.controllers.delete(controller);
    if (this.controllers.size === 0) this._stop();
  }

  _ensure() {
    if (this._timer || !this.world) return;
    this._timer = this.world.setGameInterval(() => this._tick(), 16);
  }

  _stop() {
    if (this._timer && this.world) this.world.clearGameTimer(this._timer);
    this._timer = null;
  }

  _tick() {
    const dt = (this._timer && this._timer.repeat) ? this._timer.repeat : 16;
    // Tick all controllers once per world
    for (const ctrl of this.controllers) {
      try {
        ctrl._step(dt);
      } catch (_) {
        // ignore controller errors to keep ticker alive
      }
    }
  }
}

function getWorldMuzzleTicker(world) {
  if (!world) return null;
  let ticker = WORLD_MUZZLE_TICKERS.get(world);
  if (!ticker) {
    ticker = new SharedMuzzleTicker(world);
    WORLD_MUZZLE_TICKERS.set(world, ticker);
  }
  return ticker;
}

/**
 * 🎯 Controls firing from a specific weapon slot (e.g., 'muzzle')
 */
export class MuzzleFireController {
  constructor(world, weaponEntity, slotName, projectileConfig) {
    this.world = world;
    this.weapon = weaponEntity;
    this.slotName = slotName;
    this.config = projectileConfig instanceof ProjectileConfig ? projectileConfig : new ProjectileConfig(projectileConfig);

    this._fireTimer = null;      // deprecated: not used after accumulator
    this._stepTimer = null;      // deprecated: replaced by shared world ticker
    this._active = false;        // true when auto is running
    this._autoActive = false;    // internal auto-fire flag
    this._fireAccMs = 0;         // accumulator for precise fire rate
    this._activeProjectiles = []; // { id, vx, vy, traveled, lifetimeMsRemaining }
    this._onWorldDeath = null;   // listener to stop on death
    this._lastFireMs = 0;        // wall-clock timestamp of last shot (auto or manual)
    // Shared per-world ticker
    this._sharedTicker = getWorldMuzzleTicker(this.world);
    if (this._sharedTicker) this._sharedTicker.add(this);
    // Auto-start based on configuration
    if (this.config.autoFire) {
      this.startAuto();
    }
  }

  getSlotName() {
    return this.slotName;
  }

  startAuto() {
    if (!this.world || !this.weapon) return;
    // Use accumulator with shared world ticker
    if (this._fireTimer && this.world) this.world.clearGameTimer(this._fireTimer);
    this._fireTimer = null;
    this._autoActive = true;
    this._active = true;
    this._ensureStepper();
    // Stop auto-fire if owner or weapon dies
    if (!this._onWorldDeath && this.world?.on) {
      this._onWorldDeath = ({ entity }) => {
        if (!entity) return;
        if (entity.id === this.weapon.id || entity.id === this.weapon.parent) {
          this.stopAuto();
        }
      };
      this.world.on('entity_death', this._onWorldDeath);
    }
  }

  stopAuto() {
    if (this._fireTimer && this.world) this.world.clearGameTimer(this._fireTimer);
    this._fireTimer = null;
    this._autoActive = false;
    this._active = false;
    if (this._onWorldDeath && this.world?.off) {
      this.world.off('entity_death', this._onWorldDeath);
      this._onWorldDeath = null;
    }
  }

  destroy() {
    this.stopAuto();
    // Unregister from shared world ticker
    if (this._sharedTicker) this._sharedTicker.remove(this);
    if (this._stepTimer && this.world) this.world.clearGameTimer(this._stepTimer);
    this._stepTimer = null;
    this._activeProjectiles.length = 0;
    this.world = null;
    this.weapon = null;
  }

  fireOnce() {
    if (!this.world || !this.weapon) return;
    if (!this.weapon.getSlotWorldTransform) return;
    // Do not fire if weapon or owner is dead
    const owner = this.weapon.parent ? this.world.getEntity(this.weapon.parent) : this.weapon;
    if (this.weapon.isDead || owner?.isDead) return;
    const t = this.weapon.getSlotWorldTransform(this.slotName) || this.weapon.getWorldTransform?.();
    if (!t) return;
    const facing = (t.facing != null) ? t.facing : (t.angle || 0);
    switch (this.config.weaponType) {
      case 'laser':
        // Hitscan stub: instant effect along a ray of length maxRange
        // Future: apply damage/effects; for now treat as raycast with laser visuals
        this._fireRaycast(t.x, t.y, facing);
        break;
      case 'raycast':
        this._fireRaycast(t.x, t.y, facing);
        this._lastFireMs = Date.now();
        break;
      case 'projectile':
      default:
        this._fireOnceImmediate(t.x, t.y, facing);
        this._lastFireMs = Date.now();
        this._ensureStepper();
        break;
    }
  }

  fireOnceRespectingRate() {
    const now = Date.now();
    if (now - this._lastFireMs < this.config.fireRate) return;
    this.fireOnce();
  }

  _fireOnceImmediate(x, y, facing) {
    for (let i = 0; i < this.config.bulletsPerShot; i++) {
      this._spawnProjectile(x, y, facing);
    }
  }

  _spawnProjectile(x, y, angle) {
    const speed = this.config.bulletSpeed;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const useRect = (this.config.width != null && this.config.height != null);
    const visualSize = this.config.sizeBullet;
    const collisionRadius = this.config.collideAsPoint ? 1 : (this.config.collisionRadius != null ? this.config.collisionRadius : (visualSize != null ? visualSize : 2));
    const bullet = this.world.addEntity({
      x, y,
      type: 'bullet',
      form: useRect ? 'rectangle' : 'bullet',
      size: useRect ? undefined : (visualSize != null ? visualSize : 2),
      width: useRect ? this.config.width : undefined,
      height: useRect ? this.config.height : undefined,
      color: this.config.color,
      collision: {
        enabled: true,
        name: 'projectile',
        form: useRect ? 'rect' : 'circle',
        radius: useRect ? undefined : collisionRadius,
        width: useRect ? (this.config.width || 2) : undefined,
        height: useRect ? (this.config.height || 2) : undefined,
        collisionType: 'trigger',
        layer: 'projectiles'
      }
    });
    // 📦 Содержимое боевого блока пули во время полёта:
    // bullet.combat = {
    //   damage: number,
    //   ownership: { entityId, displayName, factionId },
    //   friendlyFire: boolean,
    //   validTargets: { block: string[], hit: string[] },
    //   sizeBullet: number,
    //   collideAsPoint: boolean,
    //   collisionRadius: number|null,
    //   useCCD: boolean,
    //   ttlMs: number,
    //   rangeLeft: number
    // }
    const shooter = this.weapon?.parent ? this.world.getEntity(this.weapon.parent) : this.weapon;
    const factionId = (this.world?.factionSystem?.getEntityFaction(shooter)?.id) || shooter?.factionId || null;
    bullet.combat = {
      damage: this.config.damage,
      ownership: { entityId: shooter?.id, displayName: shooter?.name, factionId },
      friendlyFire: this.config.friendlyFire,
      validTargets: this.config.validTargets,
      penetration: (this.config.penetration != null) ? Number(this.config.penetration) : 0,
      sizeBullet: visualSize != null ? visualSize : 2,
      collideAsPoint: this.config.collideAsPoint,
      collisionRadius: this.config.collisionRadius,
      useCCD: this.config.useCCD,
      ttlMs: this.config.bulletLifetimeMs,
      rangeLeft: this.config.maxRange
    };
    const proj = {
      id: bullet.id,
      vx, vy,
      traveled: 0,
      lifetimeMsRemaining: this.config.bulletLifetimeMs
    };
    this._activeProjectiles.push(proj);
  }

  _ensureStepper() {
    // Ensure shared world ticker is running
    if (this._sharedTicker) this._sharedTicker._ensure();
  }

  _step(dt) {
    if (!this.world) return;
    const effectiveDt = (typeof dt === 'number' && dt > 0) ? dt : 16;
    // Accumulate auto-fire
    if (this._autoActive) {
      const owner = this.weapon.parent ? this.world.getEntity(this.weapon.parent) : this.weapon;
      if (this.weapon.isDead || owner?.isDead) {
        this.stopAuto();
      } else {
        this._fireAccMs += effectiveDt;
        while (this._fireAccMs >= this.config.fireRate) {
          const t = this.weapon.getSlotWorldTransform(this.slotName) || this.weapon.getWorldTransform?.();
          if (t) {
            const facing = (t.facing != null) ? t.facing : (t.angle || 0);
            if (this.config.weaponType === 'raycast' || this.config.weaponType === 'laser') {
              this._fireRaycast(t.x, t.y, facing);
            } else {
              this._fireOnceImmediate(t.x, t.y, facing);
            }
            this._lastFireMs = Date.now();
          }
          this._fireAccMs -= this.config.fireRate;
        }
      }
    }
    for (let i = this._activeProjectiles.length - 1; i >= 0; i--) {
      const p = this._activeProjectiles[i];
      const e = this.world.getEntity(p.id);
      if (!e) { this._activeProjectiles.splice(i, 1); continue; }
      e.x += p.vx;
      e.y += p.vy;
      p.traveled += Math.hypot(p.vx, p.vy);
      if (this.config.bulletLifetimeMs > 0) p.lifetimeMsRemaining -= effectiveDt;
      if (p.traveled >= this.config.maxRange || (this.config.weaponType === 'projectile' && this.config.bulletLifetimeMs > 0 && p.lifetimeMsRemaining <= 0)) {
        this.world.removeEntity(e.id);
        this._activeProjectiles.splice(i, 1);
      }
    }
    // With shared ticker, no need to manage per-controller timers here
  }

  _fireRaycast(x, y, angle) {
    const maxDist = this.config.maxRange;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const endX = x + dx * maxDist;
    const endY = y + dy * maxDist;
    const shooter = this.weapon?.parent ? this.world.getEntity(this.weapon.parent) : this.weapon;
    const factionSystem = this.world?.factionSystem;
    const vt = this.config.validTargets || {};
    const blocks = new Set(vt.block || []);
    const hits = new Set(vt.hit || []);

    // Collect all intersections
    const entities = this.world.getAllEntities();
    const intersections = [];
    for (const e of entities) {
      if (!e || e.isDead || e.id === shooter?.id) continue;
      if (!e.collision?.enabled) continue;
      if (e.type === 'vision' || e.type === 'bullet') continue;
      // Tag matching
      const tags = new Set();
      if (e.collision?.name) tags.add(e.collision.name);
      if (e.type) tags.add(e.type);
      const isBlock = [...blocks].some(t => tags.has(t));
      const isHit = [...hits].some(t => tags.has(t));
      if (!isBlock && !isHit) continue;
      // 🏳️ Если цель без фракции и это hit-цель, а friendlyFire=false — пропускаем (не враг)
      if (isHit && this.config.friendlyFire === false && factionSystem) {
        const targetFaction = factionSystem.getEntityFaction(e);
        if (!targetFaction) {
          continue;
        }
        if (shooter && !factionSystem.canEntityAttack(shooter, e)) continue;
      }

      const tParam = this._intersectRayWithEntity(x, y, dx, dy, maxDist, e);
      if (tParam == null) continue;
      const ix = x + dx * tParam;
      const iy = y + dy * tParam;
      intersections.push({ t: tParam, x: ix, y: iy, entity: e, isBlock, isHit });
    }
    intersections.sort((a, b) => a.t - b.t);

    // Apply hits along the ray
    let remainingPen = Math.max(0, this.config.penetration || 0);
    let rayEndX = endX;
    let rayEndY = endY;
    for (const hit of intersections) {
      // Stop if beyond current ray end
      const distToHit = hit.t;
      const distCurrentEnd = Math.hypot(rayEndX - x, rayEndY - y);
      if (distToHit > distCurrentEnd + 1e-6) break;

      if (hit.isHit) {
        const dmg = Number(this.config.damage) || 0;
        if (dmg > 0 && hit.entity?.stats) {
          hit.entity.stats.takeDamage(dmg, hit.entity);
        }
        if (remainingPen <= 0) {
          rayEndX = hit.x; rayEndY = hit.y;
          break;
        } else {
          remainingPen -= 1;
        }
      }
      if (hit.isBlock) {
        rayEndX = hit.x; rayEndY = hit.y;
        break;
      }
    }

    // Visual tracer
    if (this.config.raycastAnimation !== 'none') {
      // 🔒 Клэмп к границам мира, чтобы трассер не терялся за пределами карты
      const b = this.world?.bounds;
      if (b && isFinite(b.left) && isFinite(b.top) && isFinite(b.right) && isFinite(b.bottom)) {
        const tExit = this._intersectRayAABB(x, y, dx, dy, maxDist, b.left, b.top, b.right, b.bottom);
        if (tExit != null) {
          const currentLen = Math.hypot(rayEndX - x, rayEndY - y);
          if (tExit < currentLen) {
            rayEndX = x + dx * tExit;
            rayEndY = y + dy * tExit;
          }
        }
      }
      this._spawnTracer(x, y, rayEndX, rayEndY, angle);
    }
  }

  _spawnTracer(x1, y1, x2, y2, angle) {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const tracer = this.world.addEntity({
      x: cx,
      y: cy,
      type: 'effect',
      form: 'rectangle',
      width: Math.max(2, dist),
      height: Math.max(1, this.config.tracerWidth || 2),
      color: this.config.tracerColor || 0xFF4444,
      rotation: angle,
      collision: { enabled: false }
    });
    const ttl = Math.max(0, this.config.tracerTtlMs || 60);
    if (ttl > 0) {
      this.world.setGameTimeout(() => {
        this.world.removeEntity(tracer.id);
      }, ttl);
    }
  }

  _intersectRayWithEntity(x, y, dx, dy, maxDist, entity) {
    // returns distance t along ray (0..maxDist) or null
    const coll = entity.collision;
    if (!coll) return null;
    if (coll.form === 'circle') {
      const r = coll.radius || entity.size || 10;
      return this._intersectRayCircle(x, y, dx, dy, maxDist, entity.x, entity.y, r);
    } else if (coll.form === 'rect') {
      const w = coll.width || entity.width || entity.size || 20;
      const h = coll.height || entity.height || entity.size || 20;
      return this._intersectRayAABB(x, y, dx, dy, maxDist, entity.x - w/2, entity.y - h/2, entity.x + w/2, entity.y + h/2);
    }
    return null;
  }

  _intersectRayCircle(ox, oy, dx, dy, maxDist, cx, cy, r) {
    // Ray: p = o + t*d, t>=0
    const lx = cx - ox;
    const ly = cy - oy;
    const tca = lx * dx + ly * dy; // projection length
    const d2 = lx*lx + ly*ly - tca*tca;
    const r2 = r*r;
    if (d2 > r2) return null;
    const thc = Math.sqrt(Math.max(0, r2 - d2));
    const t0 = tca - thc;
    const t1 = tca + thc;
    const t = (t0 >= 0) ? t0 : (t1 >= 0 ? t1 : null);
    if (t == null) return null;
    if (t > maxDist) return null;
    return t;
  }

  _intersectRayAABB(ox, oy, dx, dy, maxDist, minX, minY, maxX, maxY) {
    const invDx = 1 / (dx === 0 ? 1e-9 : dx);
    const invDy = 1 / (dy === 0 ? 1e-9 : dy);
    let t1 = (minX - ox) * invDx;
    let t2 = (maxX - ox) * invDx;
    let t3 = (minY - oy) * invDy;
    let t4 = (maxY - oy) * invDy;
    const tmin = Math.max(Math.min(t1, t2), Math.min(t3, t4));
    const tmax = Math.min(Math.max(t1, t2), Math.max(t3, t4));
    if (tmax < 0) return null;
    if (tmin > tmax) return null;
    const t = tmin >= 0 ? tmin : tmax; // entry point
    if (t < 0 || t > maxDist) return null;
    return t;
  }
}


