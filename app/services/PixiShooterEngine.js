/**
 * PixiShooterEngine — отделённый от UI игровой движок для страницы-стрелялки.
 * Отвечает за инициализацию PIXI, обработку ввода, тики, создание сущностей,
 * стрельбу (projectile/raycast), события и эффекты.
 */
import * as PIXI from 'pixi.js';
import {
  calculateFinalAngle,
  calculateRangeWithSpread,
  applyRecoil,
  canFireWeapon,
  consumeAmmo,
  checkScreenBounds,
  isAtScreenEdge,
  calculateWallRicochet,
  calculateRaycastWallRicochet,
  createMuzzleFlash,
} from '~/utils/pixiHelpers.js';
import {
  calculateDistance,
  normalizeAngle,
  calculateAngleBetween,
  checkPlayerObstacleCollision,
  checkBulletObstacleCollision,
  dealDamage,
  createRespawnFunction,
  createPlayer,
  createObstacle,
  createBullet as createBulletHelper,
  updateHomingSystem,
  updateGravitySystem,
  updateBulletMovement,
  shouldRemoveBullet,
  constrainPlayerToBounds,
} from '~/utils/gameHelpers.js';
import {
  createRayVisual,
  createImpactPoint,
  createExplosion,
  triggerBulletEvent,
  applyStandardEffect,
  updatePlayerRotation,
  updatePlayerMovement,
  updateReloadSystem,
} from '~/utils/effectHelpers.js';

export default class PixiShooterEngine {
  /**
   * @param {HTMLElement} mountEl - DOM-элемент для канваса PIXI
   * @param {object} weaponConfig - реактивная конфигурация оружия (Vue reactive)
   */
  constructor(mountEl, weaponConfig) {
    this.mountEl = mountEl;
    this.weaponConfig = weaponConfig;

    // PIXI/Application & сцена
    /** @type {PIXI.Application | null} */
    this.app = null;

    // Сущности/состояния
    /** @type {PIXI.Graphics | null} */
    this.player = null;
    this.obstacles = [];
    this.bullets = [];
    this.explosions = [];
    this.rayEffects = [];
    this.impactEffects = [];

    // Ввод/стрельба
    this.keys = {};
    this.playerMoveSpeed = 5;
    this.mousePosition = { x: 400, y: 300 };
    this.isMouseDown = false;
    this.lastFireTime = 0;

    // Обойма
    this.currentAmmo = weaponConfig.maxAmmo;
    this.isReloading = false;
    this.reloadStartTime = 0;

    // Respawn
    this.respawnCallback = null;

    // Привязки обработчиков
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onPointerUpOutside = this._onPointerUpOutside.bind(this);

    this._tick = this._tick.bind(this);
  }

  async start() {
    if (!this.mountEl) throw new Error('PixiShooterEngine: mount element is required');

    // Создаём приложение PIXI
    this.app = new PIXI.Application();
    await this.app.init({ width: 800, height: 600, background: 0x222222 });
    this.mountEl.appendChild(this.app.canvas);

    // Игрок
    this.player = createPlayer(400, 300);
    this.app.stage.addChild(this.player);

    // Препятствия
    const obstacle = createObstacle(200, 250, 1);
    this.obstacles = [obstacle];
    this.app.stage.addChild(obstacle);

    // Respawn
    this.respawnCallback = createRespawnFunction(2000, this.app.screen);

    // Ввод
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);

    // Указатель мыши
    this.app.stage.interactive = true;
    this.app.stage.hitArea = this.app.screen;
    this.app.stage.on('pointermove', this._onPointerMove);
    this.app.stage.on('pointerdown', this._onPointerDown);
    this.app.stage.on('pointerup', this._onPointerUp);
    this.app.stage.on('pointerupoutside', this._onPointerUpOutside);

    // Тик-цикл
    this.app.ticker.add(this._tick);
  }

  destroy() {
    if (!this.app) return;

    // Снять обработчики ввода
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this.app.stage.off('pointermove', this._onPointerMove);
    this.app.stage.off('pointerdown', this._onPointerDown);
    this.app.stage.off('pointerup', this._onPointerUp);
    this.app.stage.off('pointerupoutside', this._onPointerUpOutside);

    // Отключить тикер
    this.app.ticker.remove(this._tick);

    // Очистить сцену и приложение
    try {
      this.app.destroy(true, true);
    } catch (_) {}

    this.app = null;
    this.player = null;
    this.obstacles = [];
    this.bullets = [];
    this.explosions = [];
    this.rayEffects = [];
    this.impactEffects = [];
  }

  // ---------- ВВОД ----------
  _onKeyDown(e) {
    this.keys[e.code] = true;
    // Перезарядка на Space
    if (e.code === 'Space') {
      e.preventDefault();
      this._startReload();
    }
  }

  _onKeyUp(e) {
    this.keys[e.code] = false;
  }

  _onPointerMove(event) {
    const p = event.global;
    this.mousePosition.x = p.x;
    this.mousePosition.y = p.y;
  }

  _onPointerDown() {
    this.isMouseDown = true;
    if (!this.weaponConfig.autoFire) {
      if (this.weaponConfig.weaponType === 'raycast') this._createRaycast();
      else this._createBullet();
    }
  }

  _onPointerUp() { this.isMouseDown = false; }
  _onPointerUpOutside() { this.isMouseDown = false; }

  // ---------- ОБОЙМА ----------
  _startReload() {
    if (!this.weaponConfig.useAmmoSystem) return;
    if (this.isReloading) return;
    if (this.currentAmmo >= this.weaponConfig.maxAmmo) return;
    this.isReloading = true;
    this.reloadStartTime = Date.now();
  }

  // ---------- СОБЫТИЯ ЭФФЕКТОВ ----------
  _triggerBulletEvent(bullet, eventName, ticker, extraData = {}) {
    if (!this.app) return;
    const effectContext = {
      app: this.app,
      explosions: this.explosions,
      obstacles: this.obstacles,
      respawnCallback: this.respawnCallback,
    };

    triggerBulletEvent(
      bullet,
      eventName,
      ticker,
      this.weaponConfig,
      (b, effectName, data) => applyStandardEffect(b, effectName, effectContext, data),
      extraData,
    );
  }

  // ---------- СТРЕЛЬБА (RAYCAST) ----------
  _createRaycast() {
    if (!this.app || !this.player) return;
    const currentTime = Date.now();
    const ammoState = { currentAmmo: this.currentAmmo, isReloading: this.isReloading };
    if (!canFireWeapon(currentTime, this.lastFireTime, this.weaponConfig, ammoState)) return;

    const baseAngle = Math.atan2(this.mousePosition.y - this.player.y, this.mousePosition.x - this.player.x);

    for (let i = 0; i < this.weaponConfig.bulletsPerShot; i++) {
      const finalAngle = calculateFinalAngle(baseAngle, i, this.weaponConfig);
      const rayMaxRange = calculateRangeWithSpread(this.weaponConfig);
      this._performRaycast(this.player.x, this.player.y, finalAngle, rayMaxRange, this.weaponConfig.penetration, this.weaponConfig.maxRicochets);
    }

    createMuzzleFlash(this.player.x, this.player.y, this.app, this.impactEffects);

    const ammoStateForConsume = { currentAmmo: this.currentAmmo, isReloading: this.isReloading };
    consumeAmmo(ammoStateForConsume, this.weaponConfig, this.weaponConfig.bulletsPerShot);
    this.currentAmmo = ammoStateForConsume.currentAmmo;

    applyRecoil(this.player, baseAngle, this.weaponConfig, this.app.screen);
    this.lastFireTime = currentTime;
  }

  _performRaycast(startX, startY, angle, maxRange, penetrationLeft, ricochetsLeft, hasTriggeredScreenEdge = false) {
    if (!this.app) return;
    const stepSize = 5;
    let currentX = startX;
    let currentY = startY;
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    let travelDistance = 0;
    const hitTargets = [];

    while (travelDistance < maxRange && penetrationLeft > 0) {
      currentX += dirX * stepSize;
      currentY += dirY * stepSize;
      travelDistance += stepSize;

      const atEdge = currentX <= 0 || currentX >= this.app.screen.width || currentY <= 0 || currentY >= this.app.screen.height;
      if (atEdge && !hasTriggeredScreenEdge) {
        const fakeBullet = { x: currentX, y: currentY };
        const fakeTicker = { elapsedMS: 0 };
        this._triggerBulletEvent(fakeBullet, 'onScreenEdge', fakeTicker);
        hasTriggeredScreenEdge = true;
      }

      if (this.weaponConfig.ricochetWalls && ricochetsLeft > 0) {
        const ric = calculateRaycastWallRicochet(currentX, currentY, angle, this.app.screen);
        if (ric.hasRicocheted) {
          currentX = ric.x; currentY = ric.y;
          const fakeBullet = { x: currentX, y: currentY };
          const fakeTicker = { elapsedMS: 0 };
          this._triggerBulletEvent(fakeBullet, 'onRicochet', fakeTicker);

          if (this.weaponConfig.raycastAnimation === 'laser') {
            createRayVisual(startX, startY, currentX, currentY, this.app, this.rayEffects);
          } else if (this.weaponConfig.raycastAnimation === 'impact') {
            createImpactPoint(currentX, currentY, 'ricochet', this.app, this.impactEffects);
          }

          ricochetsLeft -= 1;
          return this._performRaycast(currentX, currentY, ric.angle, maxRange - travelDistance, penetrationLeft, ricochetsLeft, hasTriggeredScreenEdge);
        }
      }

      if (checkScreenBounds({ x: currentX, y: currentY }, this.app.screen, this.weaponConfig)) break;

      for (const obstacle of this.obstacles) {
        if (obstacle.isAlive && !hitTargets.includes(obstacle)) {
          const dx = currentX - obstacle.x;
          const dy = currentY - obstacle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const obstacleRadius = 20; // TODO: хранить на объекте
          if (distance <= obstacleRadius) {
            hitTargets.push(obstacle);
            dealDamage(obstacle, this.weaponConfig.bulletDamage, this.respawnCallback);

            const fakeBullet = { x: currentX, y: currentY };
            const fakeTicker = { elapsedMS: 0 };
            this._triggerBulletEvent(fakeBullet, 'onHitEnemy', fakeTicker, { target: obstacle });

            if (this.weaponConfig.raycastAnimation === 'impact') {
              createImpactPoint(currentX, currentY, 'hit', this.app, this.impactEffects);
            }

            penetrationLeft -= 1;

            if (penetrationLeft <= 0 && this.weaponConfig.ricochetEnemies && ricochetsLeft > 0) {
              const rb = { x: currentX, y: currentY };
              const ft = { elapsedMS: 0 };
              this._triggerBulletEvent(rb, 'onRicochet', ft, { target: obstacle });
              if (this.weaponConfig.raycastAnimation === 'laser') {
                createRayVisual(startX, startY, currentX, currentY, this.app, this.rayEffects);
              } else if (this.weaponConfig.raycastAnimation === 'impact') {
                createImpactPoint(currentX, currentY, 'ricochet', this.app, this.impactEffects);
              }
              const randomAngle = Math.random() * Math.PI * 2;
              ricochetsLeft -= 1;
              penetrationLeft = 1;
              return this._performRaycast(currentX, currentY, randomAngle, maxRange - travelDistance, penetrationLeft, ricochetsLeft, hasTriggeredScreenEdge);
            }

            break;
          }
        }
      }
    }

    const fakeBullet = { x: currentX, y: currentY };
    const fakeTicker = { elapsedMS: 0 };
    this._triggerBulletEvent(fakeBullet, 'onExpire', fakeTicker);

    if (this.weaponConfig.raycastAnimation === 'laser') {
      createRayVisual(startX, startY, currentX, currentY, this.app, this.rayEffects);
    } else if (this.weaponConfig.raycastAnimation === 'impact') {
      createImpactPoint(currentX, currentY, 'end', this.app, this.impactEffects);
    }
  }

  // ---------- СТРЕЛЬБА (ПУЛИ) ----------
  _createBullet() {
    if (!this.app || !this.player) return;
    const currentTime = Date.now();
    const ammoState = { currentAmmo: this.currentAmmo, isReloading: this.isReloading };
    if (!canFireWeapon(currentTime, this.lastFireTime, this.weaponConfig, ammoState)) return;

    const baseAngle = Math.atan2(this.mousePosition.y - this.player.y, this.mousePosition.x - this.player.x);

    for (let i = 0; i < this.weaponConfig.bulletsPerShot; i++) {
      const finalAngle = calculateFinalAngle(baseAngle, i, this.weaponConfig);
      const vx = Math.cos(finalAngle) * this.weaponConfig.bulletSpeed;
      const vy = Math.sin(finalAngle) * this.weaponConfig.bulletSpeed;
      const bulletMaxRange = calculateRangeWithSpread(this.weaponConfig);

      const spawnX = this.weaponConfig.spawnAtCursor ? this.mousePosition.x : this.player.x;
      const spawnY = this.weaponConfig.spawnAtCursor ? this.mousePosition.y : this.player.y;

      const bullet = createBulletHelper(spawnX, spawnY, vx, vy, this.weaponConfig, bulletMaxRange);
      this.bullets.push(bullet);
      this.app.stage.addChild(bullet);
    }

    const ammoStateForConsume = { currentAmmo: this.currentAmmo, isReloading: this.isReloading };
    consumeAmmo(ammoStateForConsume, this.weaponConfig, this.weaponConfig.bulletsPerShot);
    this.currentAmmo = ammoStateForConsume.currentAmmo;

    applyRecoil(this.player, baseAngle, this.weaponConfig, this.app.screen);
    this.lastFireTime = currentTime;
  }

  // ---------- ТИК ----------
  _tick(ticker) {
    if (!this.app || !this.player) return;

    // Перезарядка
    const ammoState = { currentAmmo: this.currentAmmo, isReloading: this.isReloading };
    if (updateReloadSystem(ammoState, this.weaponConfig, Date.now(), this.reloadStartTime)) {
      this.currentAmmo = ammoState.currentAmmo;
      this.isReloading = ammoState.isReloading;
    }

    // Игрок
    updatePlayerRotation(this.player, this.mousePosition, 0.1);
    updatePlayerMovement(this.player, this.keys, this.playerMoveSpeed, ticker.deltaTime);

    // Автоогонь
    if (this.weaponConfig.autoFire && this.isMouseDown) {
      if (this.weaponConfig.weaponType === 'raycast') this._createRaycast();
      else this._createBullet();
    }

    // Пули
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      this._triggerBulletEvent(b, 'onFlight', ticker);
      updateHomingSystem(b, this.mousePosition, this.weaponConfig, ticker);
      updateGravitySystem(b, this.weaponConfig, ticker);
      updateBulletMovement(b, ticker);

      let remove = shouldRemoveBullet(b);

      if (isAtScreenEdge(b, this.app.screen, 4) && !b.hasTriggeredScreenEdge) {
        this._triggerBulletEvent(b, 'onScreenEdge', ticker);
        b.hasTriggeredScreenEdge = true;
      }

      if (this.weaponConfig.ricochetWalls && b.ricochetsLeft > 0) {
        const ric = calculateWallRicochet(b, this.app.screen, 4);
        if (ric.hasRicocheted) {
          this._triggerBulletEvent(b, 'onRicochet', ticker);
          b.ricochetsLeft -= 1;
        }
      }

      if (checkScreenBounds(b, this.app.screen, this.weaponConfig)) {
        remove = true;
      }

      for (const obstacle of this.obstacles) {
        if (obstacle.isAlive && checkBulletObstacleCollision(b, obstacle)) {
          if (b.penetrationLeft > 0) {
            dealDamage(obstacle, b.damage, this.respawnCallback);
            this._triggerBulletEvent(b, 'onHitEnemy', ticker, { target: obstacle });
            b.penetrationLeft -= 1;

            if (b.penetrationLeft <= 0) {
              if (this.weaponConfig.ricochetEnemies && b.ricochetsLeft > 0) {
                this._triggerBulletEvent(b, 'onRicochet', ticker, { target: obstacle });
                const randomAngle = Math.random() * Math.PI * 2;
                const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
                b.vx = Math.cos(randomAngle) * speed;
                b.vy = Math.sin(randomAngle) * speed;
                b.ricochetsLeft -= 1;
                b.penetrationLeft = 1;
              } else {
                remove = true;
              }
            }
          } else {
            if (this.weaponConfig.ricochetEnemies && b.ricochetsLeft > 0) {
              dealDamage(obstacle, b.damage, this.respawnCallback);
              const randomAngle = Math.random() * Math.PI * 2;
              const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
              b.vx = Math.cos(randomAngle) * speed;
              b.vy = Math.sin(randomAngle) * speed;
              b.ricochetsLeft -= 1;
              b.penetrationLeft = 1;
            } else {
              remove = true;
            }
          }
          break;
        }
      }

      if (remove) {
        this._triggerBulletEvent(b, 'onExpire', ticker);
        this.app.stage.removeChild(b);
        try { b.destroy(); } catch (_) {}
        this.bullets.splice(i, 1);
      }
    }

    // Коллизии игрока и коробок
    for (const obstacle of this.obstacles) {
      if (obstacle.isAlive && obstacle.entityType === 'box' && checkPlayerObstacleCollision(this.player, obstacle)) {
        if (this.respawnCallback) this.respawnCallback(obstacle);
      }
    }

    // Границы для игрока
    constrainPlayerToBounds(this.player, this.app.screen);

    // Примитивное поведение препятствий (пример)
    for (const obstacle of this.obstacles) {
      if (obstacle.isAlive) obstacle.rotation -= 0.015 * ticker.deltaTime;
    }
  }
}

