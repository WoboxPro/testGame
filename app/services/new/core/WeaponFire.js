/**
 * 🔫 Weapon fire support: projectile config + muzzle controller
 */

export class ProjectileConfig {
  constructor(input = {}) {
    const defaults = {
      weaponType: 'projectile', // 'projectile' | 'laser' (hitscan)
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
      // visuals
      size: 2, // legacy
      width: undefined,
      height: undefined,
      color: 0xFFD700,
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
    // visuals
    this.sizeBullet = (cfg.sizeBullet != null) ? cfg.sizeBullet : ((cfg.size != null) ? cfg.size : defaults.size);
    this.width = cfg.width;
    this.height = cfg.height;
    this.color = (cfg.color != null) ? cfg.color : defaults.color;
    // collision behavior
    this.collideAsPoint = !!bc.collideAsPoint;
    this.collisionRadius = (bc.collisionRadius != null) ? bc.collisionRadius : null;
    this.useCCD = !!bc.useCCD;
  }
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
    this._stepTimer = null;      // game interval handle for stepping
    this._active = false;        // true when auto is running
    this._autoActive = false;    // internal auto-fire flag
    this._fireAccMs = 0;         // accumulator for precise fire rate
    this._activeProjectiles = []; // { id, vx, vy, traveled, lifetimeMsRemaining }
    this._onWorldDeath = null;   // listener to stop on death
    // Auto-start based on configuration
    if (this.config.autoFire) {
      this.startAuto();
    }
  }

  startAuto() {
    if (!this.world || !this.weapon) return;
    // Use accumulator in stepper instead of interval-per-shot
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
    if (this._stepTimer && this.world) this.world.clearGameTimer(this._stepTimer);
    this._stepTimer = null;
    this._activeProjectiles.length = 0;
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
        // Future: apply damage/effects; for now do nothing visual
        break;
      case 'projectile':
      default:
        this._fireOnceImmediate(t.x, t.y, facing);
        this._ensureStepper();
        break;
    }
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
    if (this._stepTimer || !this.world) return;
    // Step projectiles at ~60 FPS
    this._stepTimer = this.world.setGameInterval(() => this._step(), 16);
  }

  _step() {
    if (!this.world) return;
    // Compute effective dt from timer repeat
    const dt = (this._stepTimer && this._stepTimer.repeat) ? this._stepTimer.repeat : 16;
    // Accumulate auto-fire
    if (this._autoActive) {
      const owner = this.weapon.parent ? this.world.getEntity(this.weapon.parent) : this.weapon;
      if (this.weapon.isDead || owner?.isDead) {
        this.stopAuto();
      } else {
        this._fireAccMs += dt;
        while (this._fireAccMs >= this.config.fireRate) {
          const t = this.weapon.getSlotWorldTransform(this.slotName) || this.weapon.getWorldTransform?.();
          if (t) {
            const facing = (t.facing != null) ? t.facing : (t.angle || 0);
            this._fireOnceImmediate(t.x, t.y, facing);
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
      if (this.config.bulletLifetimeMs > 0) p.lifetimeMsRemaining -= dt;
      if (p.traveled >= this.config.maxRange || (this.config.weaponType === 'projectile' && this.config.bulletLifetimeMs > 0 && p.lifetimeMsRemaining <= 0)) {
        this.world.removeEntity(e.id);
        this._activeProjectiles.splice(i, 1);
      }
    }
    // Auto-stop stepping if nothing to do and auto not active
    if (this._activeProjectiles.length === 0 && !this._active && this._stepTimer) {
      this.world.clearGameTimer(this._stepTimer);
      this._stepTimer = null;
    }
  }
}


