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
      autoFire: true
    };
    const cfg = { ...defaults, ...(input || {}) };
    this.weaponType = cfg.weaponType;
    this.bulletSpeed = Number(cfg.bulletSpeed) || defaults.bulletSpeed;
    this.bulletsPerShot = Math.max(1, Math.floor(cfg.bulletsPerShot || defaults.bulletsPerShot));
    this.maxRange = Math.max(0, Number(cfg.maxRange) || defaults.maxRange);
    this.fireRate = Math.max(1, Number(cfg.fireRate) || defaults.fireRate);
    this.bulletLifetimeMs = Math.max(0, Math.floor((cfg.bulletLifetime != null ? cfg.bulletLifetime : defaults.bulletLifetime) * 1000));
    this.autoFire = !!cfg.autoFire;
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

    this._fireTimer = null;      // game interval handle for auto fire
    this._stepTimer = null;      // game interval handle for projectile stepping
    this._active = false;
    this._activeProjectiles = []; // { id, vx, vy, traveled, lifetimeMsRemaining }
  }

  startAuto() {
    if (!this.world || !this.weapon) return;
    if (this._fireTimer) this.world.clearGameTimer(this._fireTimer);
    const intervalMs = this.config.fireRate;
    this._fireTimer = this.world.setGameInterval(() => this.fireOnce(), intervalMs);
    this._active = true;
    this._ensureStepper();
  }

  stopAuto() {
    if (this._fireTimer && this.world) this.world.clearGameTimer(this._fireTimer);
    this._fireTimer = null;
    this._active = false;
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
        for (let i = 0; i < this.config.bulletsPerShot; i++) {
          this._spawnProjectile(t.x, t.y, facing);
        }
        this._ensureStepper();
        break;
    }
  }

  _spawnProjectile(x, y, angle) {
    const speed = this.config.bulletSpeed;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    const bullet = this.world.addEntity({
      x, y,
      type: 'bullet',
      form: 'bullet',
      size: 2,
      color: 0xFFD700
    });
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
    for (let i = this._activeProjectiles.length - 1; i >= 0; i--) {
      const p = this._activeProjectiles[i];
      const e = this.world.getEntity(p.id);
      if (!e) { this._activeProjectiles.splice(i, 1); continue; }
      e.x += p.vx;
      e.y += p.vy;
      p.traveled += Math.hypot(p.vx, p.vy);
      if (this.config.bulletLifetimeMs > 0) p.lifetimeMsRemaining -= 16;
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


