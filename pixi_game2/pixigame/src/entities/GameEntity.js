/**
 * GameEntity - Игровые сущности (Unit, Build и т.д.)
 *
 * Типы (subtype):
 * - 'unit' - юниты (персонажи, мобы и т.д.)
 * - 'build' - здания (сооружения)
 * - 'prop' - пропсы (декорации, объекты окружения)
 * - etc.
 */

import { Entity } from './Entity.js';

export class GameEntity extends Entity {
  /**
   * @param {Partial<Entity> & {
   *  subtype?: 'unit'|'build'|'prop',
   *  velocity?: {x:number,y:number},
   *  movement?: {
   *    maxSpeed?: number,
   *    acceleration?: number,
   *    friction?: number
   *  },
   *  appearance?: {
   *    shape: 'circle'|'rect'|'sprite',
   *    color?: number|string,
   *    size?: number,
   *    width?: number,
   *    height?: number,
   *    textureUrl?: string,
   *    tint?: number|string
   *  },
   *  hasCollision?: boolean,
   *  collision?: Array<any>,
   *  animations?: {
   *    enabled?: boolean,
   *    spritesheetUrl?: string,
   *    defaultState?: string,
   *    speedMultiplier?: number,
   *    events?: Object,
   *    states?: Object
   *  }
   * }} options
   */
  constructor(options = {}) {
    super({ ...options, type: 'game' });

    // Подтип игровой сущности
    this.subtype = options.subtype || 'unit';

    // Initialize baseScale from appearance.scale if not provided
    if (!this.baseScale && this.appearance?.scale) {
      this.baseScale = { x: Number(this.appearance.scale) || 1, y: Number(this.appearance.scale) || 1 };
    }

    // Движение (используется EntityController и ECS velocity компонентом)
    this.velocity = options.velocity
      ? { x: Number(options.velocity.x) || 0, y: Number(options.velocity.y) || 0 }
      : { x: 0, y: 0 };

    // Параметры движения (характеристики сущности)
    this.movement = {
      maxSpeed: options.movement?.maxSpeed !== undefined ? options.movement.maxSpeed : 200,
      acceleration: options.movement?.acceleration !== undefined ? options.movement.acceleration : 1000,
      friction: options.movement?.friction !== undefined ? options.movement.friction : 5
    };

    // Внешний вид
    this.appearance = {
      shape: options.appearance?.shape || 'circle', // 'circle' | 'rect' | 'sprite'
      color: options.appearance?.color !== undefined ? options.appearance.color : 0xffffff,
      size: Number(options.appearance?.size) || 30,
      width: Number(options.appearance?.width) || 40,
      height: Number(options.appearance?.height) || 40,
      textureUrl: options.appearance?.textureUrl || null,
      scale: Number(options.appearance?.scale) || 1.0, // масштаб спрайта
      tint: options.appearance?.tint || null
    };

    // Коллизия
    this.hasCollision = options.hasCollision !== undefined ? options.hasCollision : false;

    // Коллизионный тип (для новой системы)
    this.collisionType = options.collisionType || this.subtype || 'unit'; // unit, build, etc

    // Параметры коллизии (переопределяют appearance)
    this.collisionShape = options.collisionShape || null;  // circle, rect
    this.collisionSize = options.collisionSize || null;     // для circle
    this.collisionWidth = options.collisionWidth || null;   // для rect
    this.collisionHeight = options.collisionHeight || null; // для rect
    this.collisionOffset = options.collisionOffset || { x: 0, y: 0 };
    this.collisionScale = options.collisionScale !== undefined ? options.collisionScale : 1.0; // масштаб коллизии (1.0 = 100%)

    // Показывать границы коллизии (для debug)
    this.showCollisionBounds = options.showCollisionBounds !== undefined ? options.showCollisionBounds : false;

    // Если есть коллизия - создаём компонент для ECS
    if (this.hasCollision) {
      this.collision = this._createCollisionComponent();
    }

    // 🎬 Анимации
    this.animations = this._createAnimationsComponent(options);

    // Слоты (attachment points)
    this.slots = options.slots || [];

    // 📊 Stats System
    this.statsSystem = options.statsSystem === true;
    
    // Характеристики (расширяемая структура)
    // Пользователь может добавлять свои статы: stats.mana = { current: 50, max: 50 }
    if (this.statsSystem) {
      this.stats = {
        hp: {
          current: options.stats?.hp?.current ?? options.stats?.hp ?? 100,
          max: options.stats?.hp?.max ?? 100
        },
        ...options.stats // Позволяет переопределить hp или добавить свои статы
      };
      
      // Удаляем дубликаты (если hp был в ...options.stats)
      if (options.stats?.hp) {
        this.stats.hp = {
          current: options.stats.hp.current ?? options.stats.hp ?? 100,
          max: options.stats.hp.max ?? 100
        };
      }
    } else {
      this.stats = null;
    }
  }

  /**
   * 📊 Получить значение стата
   * @param {string} statName - Имя стата (например, 'hp')
   * @returns {{current: number, max: number}|null}
   */
  getStat(statName) {
    if (!this.statsSystem || !this.stats) return null;
    return this.stats[statName] || null;
  }

  /**
   * 📊 Установить текущее значение стата
   * @param {string} statName - Имя стата
   * @param {number} value - Новое значение
   */
  setStat(statName, value) {
    if (!this.statsSystem || !this.stats) return;
    const stat = this.stats[statName];
    if (stat) {
      stat.current = Math.max(0, Math.min(stat.max, value));
    }
  }

  /**
   * 📊 Изменить стат на величину (положительную или отрицательную)
   * @param {string} statName - Имя стата
   * @param {number} delta - Изменение (отрицательное = уменьшение)
   * @returns {number} Новое значение
   */
  addStat(statName, delta) {
    if (!this.statsSystem || !this.stats) return 0;
    const stat = this.stats[statName];
    if (stat) {
      stat.current = Math.max(0, Math.min(stat.max, stat.current + delta));
      return stat.current;
    }
    return 0;
  }

  /**
   * 📊 Добавить новый стат
   * @param {string} statName - Имя стата
   * @param {number} current - Текущее значение
   * @param {number} max - Максимальное значение
   */
  addNewStat(statName, current, max) {
    if (!this.statsSystem || !this.stats) return;
    this.stats[statName] = { current, max };
  }

  /**
   * 📊 Проверить, жива ли сущность (hp > 0)
   * @returns {boolean}
   */
  isAlive() {
    if (!this.statsSystem || !this.stats?.hp) return true;
    return this.stats.hp.current > 0;
  }

  /**
   * 📊 Нанести урон
   * @param {number} damage - Величина урона
   * @returns {number} Оставшееся hp
   */
  takeDamage(damage) {
    return this.addStat('hp', -damage);
  }

  /**
   * 📊 Восстановить здоровье
   * @param {number} amount - Величина восстановления
   * @returns {number} Текущее hp
   */
  heal(amount) {
    return this.addStat('hp', amount);
  }

  /**
   * Создать collision компонент для ECS
   */
  _createCollisionComponent() {
    const shape = this.collisionShape || this.appearance.shape;

    return {
      type: this.collisionType,  // 'unit' | 'build' | ...
      shape: shape,              // 'circle' | 'rect'
      size: this.collisionSize || this.appearance.size,
      width: this.collisionWidth || this.appearance.width,
      height: this.collisionHeight || this.appearance.height,
      offset: { ...this.collisionOffset },
      scale: this.collisionScale,  // масштаб коллизии (1.0 = 100%)
      showBounds: this.showCollisionBounds  // показывать границы коллизии
    };
  }

  /**
   * Создать animations компонент для ECS
   */
  _createAnimationsComponent(options) {
    const animationsEnabled = options.animations?.enabled !== undefined
      ? options.animations.enabled
      : (options.appearance?.shape === 'sprite' && options.appearance?.textureUrl);

    if (!animationsEnabled) {
      return { enabled: false };
    }

    return {
      enabled: true,
      spritesheetUrl: options.animations?.spritesheetUrl || null,
      defaultState: options.animations?.defaultState || 'idle',
      currentState: 'idle',
      currentFrameIndex: 0,
      frameTimer: 0,
      speedMultiplier: options.animations?.speedMultiplier || 1.0,
      paused: false,
      started: false,
      completed: false,
      onCompleteTriggered: false,
      loopCount: 0,
      nextState: null,
      events: options.animations?.events || {},
      states: options.animations?.states || {}
    };
  }

  /**
   * Обновить внешний вид
   */
  setAppearance(appearance) {
    this.appearance = { ...this.appearance, ...appearance };

    // Если есть коллизия - обновить
    if (this.hasCollision) {
      this.collision = this._createCollisionComponent();
    }
  }

  /**
   * Включить/выключить коллизию
   */
  setCollision(hasCollision) {
    this.hasCollision = hasCollision;
    if (hasCollision) {
      this.collision = this._createCollisionComponent();
    } else {
      this.collision = null;
    }
  }

  /**
   * Включить/выключить показ границ коллизии
   */
  setShowCollisionBounds(showBounds) {
    this.showCollisionBounds = showBounds;
    if (this.hasCollision && this.collision) {
      this.collision.showBounds = showBounds;
    }
  }

  /**
   * 🎬 Переключить состояние анимации
   */
  setAnimationState(stateName, nextState = null) {
    if (!this.animations || !this.animations.enabled) {
      return;
    }

    // Событие onStateChange для предыдущего состояния
    this._triggerAnimationEvent('onStateChange', {
      from: this.animations.currentState,
      to: stateName
    });

    this.animations.currentState = stateName;
    this.animations.nextState = nextState;
    this.animations.currentFrameIndex = 0;
    this.animations.frameTimer = 0;
    this.animations.started = false;
    this.animations.completed = false;
    this.animations.onCompleteTriggered = false;
    this.animations.loopCount = 0;
  }

  /**
   * 🎬 Приостановить анимацию
   */
  pauseAnimation() {
    if (this.animations) {
      this.animations.paused = true;
    }
  }

  /**
   * 🎬 Продолжить анимацию
   */
  playAnimation() {
    if (this.animations) {
      this.animations.paused = false;
    }
  }

  /**
   * 🎬 Установить скорость анимации
   */
  setAnimationSpeed(speedMultiplier) {
    if (this.animations) {
      this.animations.speedMultiplier = Number(speedMultiplier) || 1.0;
    }
  }

  /**
   * 🎬 Получить текущее состояние анимации
   */
  getAnimationState() {
    if (!this.animations || !this.animations.enabled) {
      return null;
    }

    return {
      state: this.animations.currentState,
      frameIndex: this.animations.currentFrameIndex,
      frameTimer: this.animations.frameTimer,
      speedMultiplier: this.animations.speedMultiplier,
      paused: this.animations.paused
    };
  }

  /**
   * 🎬 Добавить событие для анимации
   */
  onAnimationEvent(stateName, eventType, callback) {
    if (!this.animations) return;

    if (!this.animations.events) {
      this.animations.events = {};
    }

    if (!this.animations.events[stateName]) {
      this.animations.events[stateName] = {};
    }

    this.animations.events[stateName][eventType] = callback;
  }

  /**
   * 🎬 Удалить событие для анимации
   */
  removeAnimationEvent(stateName, eventType) {
    if (!this.animations || !this.animations.events) return;

    if (this.animations.events[stateName]) {
      delete this.animations.events[stateName][eventType];
    }
  }

  /**
   * 🎬 Вызвать событие анимации
   */
  _triggerAnimationEvent(eventType, data = {}) {
    if (!this.animations || !this.animations.events) return;

    const stateEvents = this.animations.events[this.animations.currentState] || {};
    const callback = stateEvents[eventType];

    if (typeof callback === 'function') {
      try {
        callback(data);
      } catch (error) {
        console.error(`Animation event error: ${eventType}`, error);
      }
    }
  }

  getInfo() {
    return {
      ...super.getInfo?.() || {},
      subtype: this.subtype,
      velocity: this.velocity,
      movement: this.movement,
      appearance: this.appearance,
      hasCollision: this.hasCollision,
      collision: this.collision,
      animations: this.animations,
      statsSystem: this.statsSystem,
      stats: this.stats
    };
  }
}

// Удобные фабрики для создания типовых сущностей
export class UnitEntity extends GameEntity {
  constructor(options = {}) {
    super({ ...options, subtype: 'unit' });
  }
}

export class BuildEntity extends GameEntity {
  constructor(options = {}) {
    super({ ...options, subtype: 'build' });
  }
}

export class PropEntity extends GameEntity {
  constructor(options = {}) {
    super({ ...options, subtype: 'prop' });
  }
}
