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
  triggerBulletEvent,
  applyStandardEffect,
  updatePlayerRotation,
  updatePlayerMovement,
  updateReloadSystem,
} from '~/utils/effectHelpers.js';
import { getEffectById } from '~/effects/registry.js';
import World from './World.js';
import Camera from './Camera.js';

/**
 * 🚀 ОПТИМИЗАЦИЯ 3: Spatial Grid для эффективных коллизий
 * Разделяет мир на секторы 50×50 для быстрого поиска близких объектов
 */
class SpatialGrid {
  constructor(worldWidth, worldHeight, sectorSize = 50) {
    this.sectorSize = sectorSize;
    this.cols = Math.ceil(worldWidth / sectorSize);
    this.rows = Math.ceil(worldHeight / sectorSize);
    this.clear();
    
    console.log(`🗂️ SpatialGrid создан: ${this.cols}×${this.rows} секторов (${this.cols * this.rows} всего)`);
  }
  
  clear() {
    this.sectors = new Map(); // "x,y" -> {bullets: [], obstacles: []}
  }
  
  getSectorKey(x, y) {
    const sectorX = Math.floor(x / this.sectorSize);
    const sectorY = Math.floor(y / this.sectorSize);
    return `${sectorX},${sectorY}`;
  }
  
  getSector(x, y) {
    const key = this.getSectorKey(x, y);
    if (!this.sectors.has(key)) {
      this.sectors.set(key, { bullets: [], obstacles: [] });
    }
    return this.sectors.get(key);
  }
  
  addBullet(bullet) {
    const sector = this.getSector(bullet.x, bullet.y);
    sector.bullets.push(bullet);
  }
  
  addObstacle(obstacle) {
    const sector = this.getSector(obstacle.x, obstacle.y);
    sector.obstacles.push(obstacle);
  }
  
  // Возвращает массив ключей соседних секторов (включая текущий)
  getNearbyKeys(x, y) {
    const centerX = Math.floor(x / this.sectorSize);
    const centerY = Math.floor(y / this.sectorSize);
    const keys = [];
    
    // Проверяем 3×3 область (текущий + 8 соседних секторов)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const sectorX = centerX + dx;
        const sectorY = centerY + dy;
        if (sectorX >= 0 && sectorX < this.cols && sectorY >= 0 && sectorY < this.rows) {
          keys.push(`${sectorX},${sectorY}`);
        }
      }
    }
    return keys;
  }
}

/**
 * 🏗️ ENTITY SYSTEM: Управление игровыми сущностями
 * Отделяет создание объектов от привязки оружий для максимальной гибкости
 */
class EntityManager {
  constructor(app, engine = null) {
    this.app = app;
    this.engine = engine; // Ссылка на движок для совместимости
    this.entities = new Map(); // id -> entity
    this._entitySeq = 1;
  }

  /**
   * Создает новую игровую сущность
   * @param {Object} options - параметры сущности
   * @param {number} options.x - позиция X
   * @param {number} options.y - позиция Y  
   * @param {string} options.type - тип сущности ('unit', 'structure')
   * @param {string} options.visual - визуал ('triangle', 'square', 'circle')
   * @param {string} options.faction - фракция ('player', 'enemy', 'neutral')
   * @param {Object} options.characteristics - игровые характеристики
   * @param {Array} options.weapons - массив оружий с настройками
   * @param {string} options.movementController - контроллер движения (null, 'wasd', 'arrows', 'mouse')
   * @returns {Object} созданная сущность
   */
  createEntity({ 
    x = 0, y = 0, 
    type = 'unit', 
    visual = 'triangle', 
    faction = 'neutral',
    characteristics = {},
    weapons = [],
    movementController = null 
  } = {}) {
    const id = this._entitySeq++;
    
    // Создаем PIXI спрайт в зависимости от типа визуала
    const sprite = this._createVisual(visual, x, y);
    
    // Дефолтные характеристики в зависимости от типа и фракции
    const defaultCharacteristics = this._getDefaultCharacteristics(type, faction);
    const finalCharacteristics = { ...defaultCharacteristics, ...characteristics };
    
    // Подготавливаем оружия с дефолтными настройками
    const preparedWeapons = weapons.map((weapon, index) => ({
      weaponId: weapon.weaponId || `weapon_${index}`,
      weaponConfig: weapon.weaponConfig || {},
      controller: weapon.controller || 'player',
      lastFireTime: 0,
      ammoState: {
        currentAmmo: (weapon.weaponConfig?.maxAmmo || 30),
        isReloading: false,
      },
      reloadStartTime: 0,
    }));
    
    const entity = {
      id,
      x, y,
      type,                  // 'unit', 'structure'
      visual,                // 'triangle', 'square', 'circle'
      faction,               // 'player', 'enemy', 'neutral'
      
      // 📊 ХАРАКТЕРИСТИКИ: Игровые свойства
      characteristics: finalCharacteristics,
      
      // 🔫 ОРУЖИЯ: Встроенные в entity (Вариант 1)
      weapons: preparedWeapons,
      
      // 🎮 ИГРОВОЕ СОСТОЯНИЕ
      movementController,    // Контроллер движения
      isAlive: true,
      
      // 🎨 ВИЗУАЛ И ФИЗИКА
      sprite,
      velocity: { x: 0, y: 0 },
      
      // 🔧 СЛУЖЕБНОЕ
      controller: 'entity',  // Помечаем как entity (не shooter)
    };
    
    this.entities.set(id, entity);
    this.app.stage.addChild(sprite);
    
    // 🔧 СОВМЕСТИМОСТЬ: Добавляем врагов в obstacles для коллизий
    if (faction === 'enemy' && this.engine && this.engine.obstacles) {
      // Подготавливаем спрайт для совместимости со старой системой коллизий
      sprite.isAlive = true;
      sprite.entityType = 'box';
      sprite.entityId = id; // Связываем с entity
      sprite.health = finalCharacteristics.hp; // 🩸 ВАЖНО: Добавляем health для dealDamage
      sprite.maxHealth = finalCharacteristics.maxHp; // 🩸 ВАЖНО: Добавляем maxHealth для respawn
      this.engine.obstacles.push(sprite);
      console.log(`🔗 Враг добавлен в obstacles: hp=${sprite.health}/${sprite.maxHealth}, isAlive=${sprite.isAlive}`);
    }
    
    console.log(`🏗️ Entity создан: id=${id}, type=${type}, faction=${faction}, visual=${visual}, weapons=${weapons.length}`);
    return entity;
  }

  /**
   * Возвращает дефолтные характеристики для типа и фракции
   */
  _getDefaultCharacteristics(type, faction) {
    const defaults = {
      hp: 100,
      maxHp: 100,
      damage: 0,
      armor: 0,
      speed: 5,
      canTakeDamage: true,
      canMove: true,
    };

    // Настройки по типу
    if (type === 'structure') {
      defaults.canMove = false;
      defaults.hp = 1000;
      defaults.maxHp = 1000;
    }

    // Настройки по фракции
    if (faction === 'enemy') {
      defaults.hp = 1;           // Враги слабые по умолчанию
      defaults.maxHp = 1;
      defaults.damage = 5;
    } else if (faction === 'player') {
      defaults.hp = 100;         // Игрок сильный
      defaults.maxHp = 100;
      defaults.damage = 10;
    }

    return defaults;
  }

  /**
   * Создает визуал для сущности
   */
  _createVisual(visualType, x, y) {
    switch (visualType) {
      case 'triangle':
        return this._createTriangleSprite(x, y);
      case 'square':
        return this._createSquareSprite(x, y);
      case 'circle':
        return this._createCircleSprite(x, y);
      default:
        console.warn(`Неизвестный тип визуала: ${visualType}, используем triangle`);
        return this._createTriangleSprite(x, y);
    }
  }

  /**
   * Создает треугольный спрайт (для игроков)
   */
  _createTriangleSprite(x, y) {
    const triangle = new PIXI.Graphics();
    triangle.beginFill(0xde3249); // Красный как у старого игрока
    // 🔄 ИСПРАВЛЕНИЕ: треугольник смотрит ВПРАВО (по оси +X), а не вверх
    triangle.moveTo(10, 0);   // Острый угол вправо
    triangle.lineTo(-8, -8);  // Левый нижний угол  
    triangle.lineTo(-8, 8);   // Левый верхний угол
    triangle.closePath();
    triangle.endFill();
    triangle.x = x;
    triangle.y = y;
    return triangle;
  }

  /**
   * Создает квадратный спрайт (для врагов/структур)
   */
  _createSquareSprite(x, y) {
    const square = new PIXI.Graphics();
    square.beginFill(0xff0000); // Красный для врагов
    square.drawRect(-10, -10, 20, 20);
    square.endFill();
    square.x = x;
    square.y = y;
    return square;
  }

  /**
   * Создает круглый спрайт (для декораций)
   */
  _createCircleSprite(x, y) {
    const circle = new PIXI.Graphics();
    circle.beginFill(0x0000ff); // Синий для декораций
    circle.drawCircle(0, 0, 10);
    circle.endFill();
    circle.x = x;
    circle.y = y;
    return circle;
  }

  /**
   * Получить сущность по ID
   */
  getEntity(id) {
    return this.entities.get(id);
  }

  /**
   * Получить все сущности
   */
  getAllEntities() {
    return Array.from(this.entities.values());
  }

  /**
   * Удалить сущность
   */
  removeEntity(id) {
    const entity = this.entities.get(id);
    if (entity) {
      this.app.stage.removeChild(entity.sprite);
      try { entity.sprite.destroy(); } catch (_) {}
      this.entities.delete(id);
      console.log(`🗑️ Entity удален: id=${id}`);
      return true;
    }
    return false;
  }
}

export function getDefaultWeaponConfig() {
  return {
    weaponType: 'projectile',
    raycastAnimation: 'laser',
    bulletSpeed: 10,
    penetration: 2,
    bulletsPerShot: 1,
    maxRange: 400,
    bulletLifetime: 2.0,
    fireRate: 200,
    spread: 0.1,
    maxSpreadAngle: 5,
    rangeSpread: 0.1,
    maxRangeLoss: 20,
    fanSpread: false,
    fanAngle: 30,
    ricochetWalls: false,
    ricochetEnemies: false,
    maxRicochets: 3,
    recoil: 2.0,
    bulletDamage: 1,
    homingEnabled: false,
    homingStrength: 0.1,
    maxTurnRate: 3.0,
    homingDelay: 300,
    spawnAtCursor: false,
    largeBullets: false,
    bulletSize: 8,
    allowOffScreen: false,
    infiniteOffScreen: false,
    offScreenLimit: 500,
    useAmmoSystem: false,
    maxAmmo: 30,
    reloadTime: 2.0,
    ammoPerShot: true,
    gravityEnabled: false,
    gravityStrength: 0.05,
    gravityDelay: 200,
    maxFallSpeed: 15,
    gravityDirection: 90,
    autoFire: true,
    autoReload: false,
    // Источник стрельбы: 'player' — в сторону курсора; 'object' — автонаведение
    fireSource: 'player',
    objectFire: {
      // Режим наведения: 'nearest' — на ближайшую цель; 'angle' — фиксированный угол
      mode: 'nearest',
      angleDeg: 0,
    },
    events: {
      onFlight: [],
      onHitEnemy: [],
      onRicochet: [],
      onExpire: [],
      onScreenEdge: [],
    },
  };
}

export default class PixiShooterEngine {
  /**
   * @param {HTMLElement} mountEl - DOM-элемент для канваса PIXI
   * @param {object} weaponConfig - реактивная конфигурация оружия (Vue reactive)
   * @param {object} options - дополнительные настройки
   * @param {string} options.mountTarget - CSS селектор для поиска mount элемента
   * @param {object} options.canvas - настройки canvas (width, height, background, showFPS)
   * @param {object} options.world - настройки мира (type, width, height, gravity, boundaries)
   */
  constructor(mountEl, weaponConfig, options = {}) {
    this.mountEl = mountEl;
    this.weaponConfig = weaponConfig || getDefaultWeaponConfig();
    this.options = options || {};

    // PIXI/Application & сцена
    /** @type {PIXI.Application | null} */
    this.app = null;

    // 🏗️ ENTITY SYSTEM: Управление всеми игровыми объектами
    this.entityManager = null; // Инициализируется в start()

    // 🎮 ИГРОВЫЕ ОБЪЕКТЫ: Пули, эффекты, etc.
    this.bullets = [];
    this.explosions = [];
    this.rayEffects = [];
    this.impactEffects = [];

    // 🚀 ОПТИМИЗАЦИЯ: Spatial Grid для коллизий (инициализируется в start())
    this.spatialGrid = null;

    // 🔧 СОВМЕСТИМОСТЬ: Для старого кода (будет удалено позже)
    this.obstacles = [];  // Временно для совместимости с коллизиями
    this.shooters = [];   // Временно для совместимости (теперь используем Entity систему)
    


    // Ввод/стрельба
    this.keys = {};
    this.playerMoveSpeed = 5;
    this.mousePosition = { x: 400, y: 300 };
    this.isMouseDown = false;

    // Respawn
    this.respawnCallback = null;

    // FPS счетчик
    this.fpsText = null;
    this.showFPS = false;
    this.fpsFrames = 0;
    this.fpsLastTime = performance.now();

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
    // Определяем целевой контейнер монтирования
    let mountElement = this.mountEl;
    if (!mountElement && this.options.mountTarget) {
      if (typeof this.options.mountTarget === 'string') {
        mountElement = document.querySelector(this.options.mountTarget);
      } else if (this.options.mountTarget && typeof this.options.mountTarget.appendChild === 'function') {
        mountElement = this.options.mountTarget;
      }
    }

    // Подготавливаем настройки PIXI приложения
    const pixiOptions = {
      width: 800,
      height: 600,
      background: 0x222222
    };

    // Если переданы настройки canvas, используем их
    if (this.options.canvas) {
      if (this.options.canvas.width) pixiOptions.width = this.options.canvas.width;
      if (this.options.canvas.height) pixiOptions.height = this.options.canvas.height;
      if (this.options.canvas.background) {
        // Поддерживаем как hex строки (#dddddd), так и числа (0xdddddd)
        if (typeof this.options.canvas.background === 'string') {
          pixiOptions.background = parseInt(this.options.canvas.background.replace('#', ''), 16);
        } else {
          pixiOptions.background = this.options.canvas.background;
        }
      }
      // Настройка отображения FPS
      if (this.options.canvas.showFPS !== undefined) {
        this.showFPS = this.options.canvas.showFPS;
      }
    }

    // Создаём World (мир игры) с учетом canvas размеров
    this.world = new World(this.options.world || {}, pixiOptions.width, pixiOptions.height);
    
    // 🌍 СОЗДАЁМ ОБЪЕКТ worldBounds для замены this.app.screen
    this.worldBounds = {
      width: this.world.width,
      height: this.world.height,
      x: 0,
      y: 0
    };

    // 🚀 ОПТИМИЗАЦИЯ 3: Инициализируем Spatial Grid (условно)
    const spatialConfig = this.options.world?.spatialGrid || {};
    if (spatialConfig.enabled) {
      const sectorSize = spatialConfig.sectorSize || 50;
      this.spatialGrid = new SpatialGrid(this.world.width, this.world.height, sectorSize);
      console.log(`🚀 Spatial Grid включен с размером сектора: ${sectorSize}px`);
    } else {
      this.spatialGrid = null;
      console.log(`🚀 Spatial Grid отключен, используем стандартные коллизии`);
    }

    // 🏗️ ENTITY SYSTEM: Инициализируем EntityManager
    this.entityManager = new EntityManager(null, this); // app будет передан после создания, передаем ссылку на движок
    console.log(`🏗️ Entity System инициализирован`);
    
    // Создаём Camera (камеру) для навигации по миру
    this.camera = new Camera(pixiOptions.width, pixiOptions.height, this.world);

    // Если mountElement не найден, но есть canvas настройки - создаём контейнер автоматически
    if (!mountElement && this.options.canvas) {
      mountElement = document.body; // Fallback на body
    }
    
    if (!mountElement) throw new Error('PixiShooterEngine: mount element is required');

    // Создаём приложение PIXI
    this.app = new PIXI.Application();
    await this.app.init(pixiOptions);
    mountElement.appendChild(this.app.canvas);

    // 🏗️ Передаем app в EntityManager
    this.entityManager.app = this.app;

    // Создаём UI контейнер (не двигается с камерой)
    this.uiContainer = new PIXI.Container();
    this.uiContainer.zIndex = 1000; // Поверх всего остального
    this.app.stage.addChild(this.uiContainer);

    // Создаём FPS счетчик если включен
    if (this.showFPS) {
      this.fpsText = new PIXI.Text({
        text: 'FPS: 60',
        style: {
          fontFamily: 'Arial',
          fontSize: 16,
          fill: 0xffffff,
          fontWeight: 'bold'
        }
      });
      this.fpsText.x = 10;
      this.fpsText.y = 10;
      this.uiContainer.addChild(this.fpsText); // Добавляем в UI контейнер
    }

    // Добавляем инструкции управления камерой (только если камера может двигаться)
    if (this.camera.canMove()) {
      const cameraInstructions = new PIXI.Text({
        text: 'Camera: 1←2↓3→5↑ (Numpad or digits)',
        style: {
          fontFamily: 'Arial',
          fontSize: 14,
          fill: 0xffff00,
          fontWeight: 'bold'
        }
      });
      cameraInstructions.x = 10;
      cameraInstructions.y = this.showFPS ? 35 : 10;
      this.uiContainer.addChild(cameraInstructions);
    }

    // Создание визуальных границ мира
    this.worldBorders = new PIXI.Graphics();
    this.world.createVisualBorders(this.worldBorders);
    this.app.stage.addChild(this.worldBorders);

    // 🏗️ Движок инициализирован! Все объекты создаются через addEntity() API
    console.log(`🎮 PixiShooterEngine готов! Используйте engine.addEntity() для создания объектов`);

    // 🔄 РЕСПАВН: Создаем функцию респавна для совместимости с obstacles
    const originalRespawnFn = createRespawnFunction(2000, this.worldBounds);
    this.respawnCallback = (obj) => {
      console.log(`🔄 РЕСПАВН вызван! obj.health=${obj.health}, obj.isAlive=${obj.isAlive}`);
      originalRespawnFn(obj);
      console.log(`💀 После респавна: obj.isAlive=${obj.isAlive}, obj.visible=${obj.visible}`);
    };
    console.log(`🔄 Respawn функция создана для worldBounds: ${this.worldBounds.width}x${this.worldBounds.height}`);

    // Ввод
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);

    // Указатель мыши
    this.app.stage.interactive = true;
    this.app.stage.eventMode = 'static';
    // 🌍 ИСПРАВЛЕНИЕ: hitArea должна быть размером МИРА, а не canvas!
    this.app.stage.hitArea = new PIXI.Rectangle(0, 0, this.world.width, this.world.height);
    this.app.stage.on('pointermove', this._onPointerMove);
    this.app.stage.on('pointerdown', this._onPointerDown);
    this.app.stage.on('pointerup', this._onPointerUp);
    this.app.stage.on('pointerupoutside', this._onPointerUpOutside);
    
    console.log('🔧 Stage интерактивность настроена:', {
      canvasSize: `${this.app.renderer.width}×${this.app.renderer.height}`,
      worldSize: `${this.world.width}×${this.world.height}`,
      hitArea: `${this.world.width}×${this.world.height}`
    });

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
    // 🏗️ ENTITY SYSTEM: Удаляем сущности
    if (this.entityManager) {
      const allEntities = this.entityManager.getAllEntities();
      for (const entity of allEntities) {
        try { this.app.stage.removeChild(entity.sprite); } catch (_) {}
        try { entity.sprite.destroy(); } catch (_) {}
      }
    }
    
    // 🔧 СОВМЕСТИМОСТЬ: Очищаем старые массивы
    this.shooters = [];
    this.mainShooterId = null;
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
    const canvasPos = event.global; // Позиция относительно canvas
    
    // 🌍 ПРЕОБРАЗОВАНИЕ: canvas координаты → world координаты
    this.mousePosition.x = canvasPos.x + this.camera.x;
    this.mousePosition.y = canvasPos.y + this.camera.y;
    

  }

  _onPointerDown() {
    this.isMouseDown = true;
    if (!this.weaponConfig.autoFire) {
      if (this.weaponConfig.fireSource === 'player') {
        if (this.weaponConfig.weaponType === 'raycast') this._createRaycast();
        else this._createBullet();
      }
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
    triggerBulletEvent(
      bullet,
      eventName,
      ticker,
      this.weaponConfig,
      (b, effectId, params, data) => {
        const def = getEffectById(effectId);
        if (def?.handler) {
          def.handler({
            app: this.app,
            engine: this,
            bullet: b,
            obstacles: this.obstacles,
            respawnCallback: this.respawnCallback,
            params,
            extraData: data,
          });
          return;
        }
        const effectContext = {
          app: this.app,
          explosions: this.explosions,
          obstacles: this.obstacles,
          respawnCallback: this.respawnCallback,
        };
        applyStandardEffect(b, effectId, effectContext, data);
      },
      extraData,
    );
  }

  // ---------- СТРЕЛЬБА (RAYCAST) ----------
  _createRaycastFor(shooter) {
    if (!this.app || !shooter) return;
    // 📦 ОПТИМИЗАЦИЯ 2: Используем кешированную weaponConfig из _tick()
    const cfg = this.weaponConfig;
    const currentTime = Date.now();
    if (!canFireWeapon(currentTime, shooter.lastFireTime || 0, cfg, shooter.ammoState)) return;

    const baseAngle = this._getFireAngleFor(shooter);

    for (let i = 0; i < cfg.bulletsPerShot; i++) {
      const finalAngle = calculateFinalAngle(baseAngle, i, cfg);
      const rayMaxRange = calculateRangeWithSpread(cfg);
      this._performRaycast(shooter.sprite.x, shooter.sprite.y, finalAngle, rayMaxRange, cfg.penetration, cfg.maxRicochets);
    }

    createMuzzleFlash(shooter.sprite.x, shooter.sprite.y, this.app, this.impactEffects);

    consumeAmmo(shooter.ammoState, cfg, cfg.bulletsPerShot);
    if (cfg.useAmmoSystem && shooter.ammoState.currentAmmo <= 0 && !shooter.ammoState.isReloading && this._shouldAutoReloadCfg(cfg)) {
      shooter.ammoState.isReloading = true;
      shooter.reloadStartTime = Date.now();
    }

    applyRecoil(shooter.sprite, baseAngle, cfg, this.worldBounds);
    shooter.lastFireTime = currentTime;
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

      const atEdge = currentX <= 0 || currentX >= this.worldBounds.width || currentY <= 0 || currentY >= this.worldBounds.height;
      if (atEdge && !hasTriggeredScreenEdge) {
        const fakeBullet = { x: currentX, y: currentY };
        const fakeTicker = { elapsedMS: 0 };
        this._triggerBulletEvent(fakeBullet, 'onScreenEdge', fakeTicker);
        hasTriggeredScreenEdge = true;
      }

      if (this.weaponConfig.ricochetWalls && ricochetsLeft > 0) {
        const ric = calculateRaycastWallRicochet(currentX, currentY, angle, this.worldBounds);
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
          // 👻 invisible - никаких эффектов рикошета от стен

          ricochetsLeft -= 1;
          return this._performRaycast(currentX, currentY, ric.angle, maxRange - travelDistance, penetrationLeft, ricochetsLeft, hasTriggeredScreenEdge);
        }
      }

              if (checkScreenBounds({ x: currentX, y: currentY }, this.worldBounds, this.weaponConfig)) break;

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

            if (this.weaponConfig.raycastAnimation === 'impact' || this.weaponConfig.raycastAnimation === 'invisible') {
              createImpactPoint(currentX, currentY, 'hit', this.app, this.impactEffects);
            }
            // 👻 invisible - показываем только попадания в цели, НЕ показываем луч

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
              // 👻 invisible - никаких эффектов рикошета от врагов
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
    // 👻 invisible - никаких эффектов окончания луча
  }

  // ---------- СТРЕЛЬБА (ПУЛИ) ----------
  _createBulletFor(shooter) {
    if (!this.app || !shooter) return;
    const cfg = shooter.weaponConfig;
    const currentTime = Date.now();
    if (!canFireWeapon(currentTime, shooter.lastFireTime || 0, cfg, shooter.ammoState)) return;

    const baseAngle = this._getFireAngleFor(shooter);

    for (let i = 0; i < cfg.bulletsPerShot; i++) {
      const finalAngle = calculateFinalAngle(baseAngle, i, cfg);
      const vx = Math.cos(finalAngle) * cfg.bulletSpeed;
      const vy = Math.sin(finalAngle) * cfg.bulletSpeed;
      const bulletMaxRange = calculateRangeWithSpread(cfg);

      const spawnX = cfg.spawnAtCursor ? this.mousePosition.x : shooter.sprite.x;
      const spawnY = cfg.spawnAtCursor ? this.mousePosition.y : shooter.sprite.y;

      const bullet = createBulletHelper(spawnX, spawnY, vx, vy, cfg, bulletMaxRange);
      this.bullets.push(bullet);
      this.app.stage.addChild(bullet);
    }

    consumeAmmo(shooter.ammoState, cfg, cfg.bulletsPerShot);
    if (cfg.useAmmoSystem && shooter.ammoState.currentAmmo <= 0 && !shooter.ammoState.isReloading && this._shouldAutoReloadCfg(cfg)) {
      shooter.ammoState.isReloading = true;
      shooter.reloadStartTime = Date.now();
    }

    applyRecoil(shooter.sprite, baseAngle, cfg, this.worldBounds);
    shooter.lastFireTime = currentTime;
  }

  // --- Обертки для одиночных выстрелов от главного шутера (используются в pointerdown) ---
  _getMainShooter() {
    // 🏗️ ENTITY SYSTEM: Ищем первую сущность игрока с оружием
    if (!this.entityManager) return null;
    
    const playerEntities = this.entityManager.getAllEntities().filter(entity => 
      entity.faction === 'player' && 
      entity.weapons && 
      entity.weapons.length > 0 &&
      entity.isAlive
    );
    
    if (playerEntities.length === 0) return null;
    
    // Возвращаем в формате старого shooter для совместимости
    const entity = playerEntities[0];
    return {
      id: entity.id,
      sprite: entity.sprite,
      controller: 'player',
      weaponConfig: entity.weapons[0].weaponConfig // Берем первое оружие
    };
  }

  _createBullet() {
    const shooter = this._getMainShooter();
    if (shooter) this._createBulletFor(shooter);
  }

  _createRaycast() {
    const shooter = this._getMainShooter();
    if (shooter) this._createRaycastFor(shooter);
  }

  // ---------- ТИК ----------
  _tick(ticker) {
    try {
      // 🛡️ ЗАЩИТНАЯ ПРОВЕРКА: убеждаемся что все массивы инициализированы
      if (!this.shooters) {
        console.warn('🚨 this.shooters не инициализирован! Инициализируем пустым массивом.');
        this.shooters = [];
      }
      
      const sp = this._getMainShooterSprite();
      if (!this.app || !sp) return;
    } catch (error) {
      console.error('🚨 Ошибка в начале _tick:', error);
      console.error('🔍 this.shooters =', this.shooters);
      console.error('🔍 typeof this.shooters =', typeof this.shooters);
      throw error;
    }

    // 📦 ОПТИМИЗАЦИЯ 2: Кешируем weaponConfig один раз в начале тика
    const weaponCfg = this.weaponConfig;
    const homingEnabled = weaponCfg.homingEnabled;
    const gravityEnabled = weaponCfg.gravityEnabled;
    const ricochetWalls = weaponCfg.ricochetWalls;
    const ricochetEnemies = weaponCfg.ricochetEnemies;

    // Обновление FPS счетчика
    if (this.showFPS && this.fpsText) {
      this.fpsFrames++;
      const currentTime = performance.now();
      const deltaTime = currentTime - this.fpsLastTime;
      
      // Обновляем FPS каждые 250ms
      if (deltaTime >= 250) {
        const fps = Math.round((this.fpsFrames * 1000) / deltaTime);
        const bulletCount = this.bullets.length;
        
        // Информация о Spatial Grid
        let spatialInfo = 'SG: false';
        if (this.spatialGrid) {
          const sectorCount = this.spatialGrid.sectors.size;
          spatialInfo = `SG: true (${sectorCount})`;
        }
        
        this.fpsText.text = `FPS: ${fps} | Bullets: ${bulletCount} | ${spatialInfo}`;
        this.fpsFrames = 0;
        this.fpsLastTime = currentTime;
      }
    }

    // 🚀 ОПТИМИЗАЦИЯ 3: Заполняем Spatial Grid каждый тик (если включен)
    if (this.spatialGrid) {
      this.spatialGrid.clear();
      
      // 🛡️ ЗАЩИТНЫЕ ПРОВЕРКИ массивов
      if (!this.bullets) this.bullets = [];
      if (!this.obstacles) this.obstacles = [];
      
      // Добавляем все пули в соответствующие секторы
      for (const bullet of this.bullets) {
        this.spatialGrid.addBullet(bullet);
      }
      
      // Добавляем все препятствия в соответствующие секторы
      for (const obstacle of this.obstacles) {
        if (obstacle.isAlive) {
          this.spatialGrid.addObstacle(obstacle);
        }
      }
    }

    // Обновление камеры
    if (this.camera) {
      this.camera.update(this.keys);
      this.camera.applyToStage(this.app.stage, this.uiContainer);
    }

    // 🏗️ ENTITY SYSTEM: Перезарядка у всех сущностей с оружием
    if (this.entityManager) {
      const entitiesWithWeapons = this.entityManager.getAllEntities().filter(entity => 
        entity.weapons && entity.weapons.length > 0 && entity.isAlive
      );
      
      for (const entity of entitiesWithWeapons) {
        for (const weapon of entity.weapons) {
          if (!weapon.ammoState) continue;
          if (updateReloadSystem(weapon.ammoState, weapon.weaponConfig, Date.now(), weapon.reloadStartTime || 0)) {
            // завершили перезарядку
          }
          if (
            weapon.weaponConfig.useAmmoSystem &&
            weapon.ammoState.currentAmmo <= 0 &&
            !weapon.ammoState.isReloading &&
            this._shouldAutoReloadCfg(weapon.weaponConfig)
          ) {
            weapon.ammoState.isReloading = true;
            weapon.reloadStartTime = Date.now();
          }
        }
      }
    }

    // 🏗️ ENTITY SYSTEM: Поворот/движение всех сущностей с оружием
    if (this.entityManager) {
      const entitiesWithWeapons = this.entityManager.getAllEntities().filter(entity => 
        entity.weapons && entity.weapons.length > 0 && entity.isAlive
      );
      
      for (const entity of entitiesWithWeapons) {
        // Для каждого оружия проверяем его controller
        for (const weapon of entity.weapons) {
          const cfg = weapon.weaponConfig;
          const isObjectMode = (weapon.controller === 'object') || (cfg && cfg.fireSource === 'object');
          
          if (isObjectMode) {
            // Автонаведение для AI/object режима (пока упрощенно)
            const angle = Math.atan2(this.mousePosition.y - entity.sprite.y, this.mousePosition.x - entity.sprite.x);
            const targetPos = {
              x: entity.sprite.x + Math.cos(angle) * 100,
              y: entity.sprite.y + Math.sin(angle) * 100,
            };
            updatePlayerRotation(entity.sprite, targetPos, 0.1);
          } else if (weapon.controller === 'player') {
            // Игроковое управление - мгновенный поворот к мыши
            updatePlayerRotation(entity.sprite, this.mousePosition, 1.0);
            if (entity.movementController === 'wasd' || entity.faction === 'player') {
              updatePlayerMovement(entity.sprite, this.keys, this.playerMoveSpeed, ticker.deltaTime);
            }
          }
        }
      }
    }

    // 🏗️ ENTITY SYSTEM: Автоогонь у всех сущностей с оружием
    if (this.entityManager) {
      const entitiesWithWeapons = this.entityManager.getAllEntities().filter(entity => 
        entity.weapons && entity.weapons.length > 0 && entity.isAlive
      );
      
      for (const entity of entitiesWithWeapons) {
        for (const weapon of entity.weapons) {
          const cfg = weapon.weaponConfig;
          const isObjectMode = (weapon.controller === 'object') || (cfg && cfg.fireSource === 'object');
          const triggerHeld = isObjectMode ? true : this.isMouseDown;
          
          if (cfg.autoFire && triggerHeld) {
            // Создаем совместимый объект shooter для старых функций
            const compatShooter = {
              id: entity.id,
              sprite: entity.sprite,
              controller: weapon.controller,
              weaponConfig: weapon.weaponConfig,
              lastFireTime: weapon.lastFireTime,
              ammoState: weapon.ammoState,
              reloadStartTime: weapon.reloadStartTime
            };
            
            if (cfg.weaponType === 'raycast') this._createRaycastFor(compatShooter);
            else this._createBulletFor(compatShooter);
            
            // Обновляем состояние оружия
            weapon.lastFireTime = compatShooter.lastFireTime;
            weapon.ammoState = compatShooter.ammoState;
            weapon.reloadStartTime = compatShooter.reloadStartTime;
          }
        }
      }
    }

    // Пули
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      this._triggerBulletEvent(b, 'onFlight', ticker);
      
      // 🚀 ОПТИМИЗАЦИЯ 1a: Early exit для системы самонаведения
      if (homingEnabled) {
        updateHomingSystem(b, this.mousePosition, weaponCfg, ticker);
      }
      
      // 🚀 ОПТИМИЗАЦИЯ 1b: Early exit для системы гравитации
      if (gravityEnabled) {
        updateGravitySystem(b, weaponCfg, ticker);
      }
      
      updateBulletMovement(b, ticker);

      let remove = shouldRemoveBullet(b);

      if (isAtScreenEdge(b, this.worldBounds, 4) && !b.hasTriggeredScreenEdge) {
        this._triggerBulletEvent(b, 'onScreenEdge', ticker);
        b.hasTriggeredScreenEdge = true;
      }

      if (ricochetWalls && b.ricochetsLeft > 0) {
        const ric = calculateWallRicochet(b, this.worldBounds, 4);
        if (ric.hasRicocheted) {
          this._triggerBulletEvent(b, 'onRicochet', ticker);
          b.ricochetsLeft -= 1;
        }
      }

      if (checkScreenBounds(b, this.worldBounds, weaponCfg)) {
        remove = true;
      }

      // 🚀 ОПТИМИЗАЦИЯ 3: Проверка коллизий (Spatial Grid или стандартный способ)
      if (this.spatialGrid) {
        // Новый способ: Spatial Grid коллизии (проверяем только близкие секторы)
        const nearbyKeys = this.spatialGrid.getNearbyKeys(b.x, b.y);
        let hitObstacle = false;
        
        for (const key of nearbyKeys) {
          if (!this.spatialGrid.sectors.has(key)) continue;
          const sector = this.spatialGrid.sectors.get(key);
          
          for (const obstacle of sector.obstacles) {
            if (obstacle.isAlive && checkBulletObstacleCollision(b, obstacle)) {
              hitObstacle = true;
              if (b.penetrationLeft > 0) {
                dealDamage(obstacle, b.damage, this.respawnCallback);
                this._triggerBulletEvent(b, 'onHitEnemy', ticker, { target: obstacle });
                b.penetrationLeft -= 1;

                if (b.penetrationLeft <= 0) {
                  if (ricochetEnemies && b.ricochetsLeft > 0) {
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
                if (ricochetEnemies && b.ricochetsLeft > 0) {
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
          if (hitObstacle) break; // Выходим из проверки секторов
        }
      } else {
        // Старый способ: проверяем все препятствия подряд
        for (const obstacle of this.obstacles) {
          if (obstacle.isAlive && checkBulletObstacleCollision(b, obstacle)) {
            if (b.penetrationLeft > 0) {
              dealDamage(obstacle, b.damage, this.respawnCallback);
              this._triggerBulletEvent(b, 'onHitEnemy', ticker, { target: obstacle });
              b.penetrationLeft -= 1;

              if (b.penetrationLeft <= 0) {
                if (ricochetEnemies && b.ricochetsLeft > 0) {
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
              if (ricochetEnemies && b.ricochetsLeft > 0) {
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
      }

      if (remove) {
        this._triggerBulletEvent(b, 'onExpire', ticker);
        this.app.stage.removeChild(b);
        try { b.destroy(); } catch (_) {}
        this.bullets.splice(i, 1);
      }
    }

    // 🏗️ ENTITY SYSTEM: Коллизии игроков с препятствиями  
    if (this.entityManager) {
      const playerEntities = this.entityManager.getAllEntities().filter(entity => 
        entity.faction === 'player' && entity.isAlive
      );
      
      for (const player of playerEntities) {
        for (const obstacle of this.obstacles) {
          if (obstacle.isAlive && obstacle.entityType === 'box' && checkPlayerObstacleCollision(player.sprite, obstacle)) {
            if (this.respawnCallback) this.respawnCallback(obstacle);
          }
        }
      }
    }

    // 🏗️ ENTITY SYSTEM: Движение игроков с учетом границ мира
    const worldBounds = {
      width: this.world.width,
      height: this.world.height
    };
    
    if (this.entityManager) {
      const playerEntities = this.entityManager.getAllEntities().filter(entity => 
        entity.faction === 'player' && entity.isAlive
      );
      
      for (const entity of playerEntities) {
        constrainPlayerToBounds(entity.sprite, worldBounds);
      }
    }

    // Примитивное поведение препятствий (пример)
    for (const obstacle of this.obstacles) {
      if (obstacle.isAlive) obstacle.rotation -= 0.015 * ticker.deltaTime;
    }
  }

  // ---------- ВЫБОР УГЛА СТРЕЛЬБЫ ----------
  _getFireAngleFor(shooter) {
    const sp = shooter.sprite;
    const cfg = shooter.weaponConfig;
    if (!sp) return 0;
    const isObjectMode = (shooter.controller === 'object') || (cfg && cfg.fireSource === 'object');
    if (!isObjectMode) {
      return Math.atan2(this.mousePosition.y - sp.y, this.mousePosition.x - sp.x);
    }

    const mode = cfg.objectFire?.mode || 'nearest';
    if (mode === 'angle') {
      const deg = cfg.objectFire?.angleDeg ?? 0;
      return (deg * Math.PI) / 180;
    }

    // nearest: ищем ближайшую живую цель из препятствий
    let nearest = null;
    let nearestDist = Infinity;
    for (const obstacle of this.obstacles) {
      if (!obstacle.isAlive) continue;
      const dx = obstacle.x - sp.x;
      const dy = obstacle.y - sp.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < nearestDist) {
        nearestDist = d2;
        nearest = obstacle;
      }
    }
    if (nearest) {
      return Math.atan2(nearest.y - sp.y, nearest.x - sp.x);
    }
    // Если целей нет — оставляем текущий поворот
    return sp.rotation;
  }

  _shouldAutoReloadCfg(cfg) {
    // Для object-контроллера автоперезарядка всегда включена
    if (cfg.fireSource === 'object') return true;
    return !!cfg.autoReload;
  }

  // ---------- ШУТЕРЫ ----------
  _createShooter({ x, y, controller = 'player', weaponConfig } = {}) {
    const sprite = createPlayer(x ?? 0, y ?? 0);
    this.app.stage.addChild(sprite);
    const shooter = {
      id: this._shooterSeq++,
      sprite,
      controller: controller === 'object' ? 'object' : 'player',
      weaponConfig: weaponConfig || JSON.parse(JSON.stringify(this.weaponConfig)),
      ammoState: {
        currentAmmo: (weaponConfig || this.weaponConfig).maxAmmo,
        isReloading: false,
      },
      reloadStartTime: 0,
      lastFireTime: 0,
    };
    this.shooters.push(shooter);
    return shooter;
  }

  _getMainShooterSprite() {
    // 🏗️ ENTITY SYSTEM: Ищем первую сущность с фракцией 'player' и оружием
    if (!this.entityManager) return null;
    
    const playerEntities = this.entityManager.getAllEntities().filter(entity => 
      entity.faction === 'player' && 
      entity.weapons && 
      entity.weapons.length > 0 &&
      entity.isAlive
    );
    
    if (playerEntities.length === 0) return null;
    return playerEntities[0].sprite;
  }

  // Public API
  addShooter({ x = 0, y = 0, controller = 'player', weaponConfig } = {}) {
    if (!this.app) return null;
    const shooter = this._createShooter({ x, y, controller, weaponConfig });
    return shooter.id;
  }

  setMainShooter(id) {
    if (!this.shooters.find(s => s.id === id)) return false;
    this.mainShooterId = id;
    return true;
  }

  setShooterPosition(id, x, y) {
    const s = this.shooters.find(s => s.id === id);
    if (!s) return false;
    s.sprite.x = x;
    s.sprite.y = y;
    return true;
  }

  getShooters() {
    return this.shooters.map(s => ({ id: s.id, x: s.sprite.x, y: s.sprite.y, controller: s.controller }));
  }

  // 🏗️ ENTITY SYSTEM API

  /**
   * Создает новую игровую сущность (Вариант 1: с weapons внутри)
   * @param {Object} options - параметры сущности
   * @returns {number} ID созданной сущности
   */
  addEntity(options = {}) {
    if (!this.entityManager) {
      console.warn('EntityManager не инициализирован');
      return null;
    }
    const entity = this.entityManager.createEntity(options);
    return entity.id;
  }

  /**
   * Получить информацию о сущности
   * @param {number} entityId - ID сущности
   * @returns {Object|null} информация о сущности
   */
  getEntity(entityId) {
    const entity = this.entityManager?.getEntity(entityId);
    if (!entity) return null;

    return {
      id: entity.id,
      x: entity.sprite.x,
      y: entity.sprite.y,
      type: entity.type,
      visual: entity.visual,
      faction: entity.faction,
      characteristics: { ...entity.characteristics },
      weapons: entity.weapons.map(w => ({ weaponId: w.weaponId, controller: w.controller })),
      isAlive: entity.isAlive,
      movementController: entity.movementController
    };
  }

  /**
   * Получить все сущности
   * @returns {Array} массив сущностей
   */
  getAllEntities() {
    if (!this.entityManager) return [];
    return this.entityManager.getAllEntities().map(entity => this.getEntity(entity.id));
  }

  /**
   * Удалить сущность
   * @param {number} entityId - ID сущности
   * @returns {boolean} успешность операции
   */
  removeEntity(entityId) {
    if (!this.entityManager) return false;
    return this.entityManager.removeEntity(entityId);
  }
}

