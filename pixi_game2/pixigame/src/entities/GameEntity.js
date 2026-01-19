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
   *  collision?: Array<any>
   * }} options
   */
  constructor(options = {}) {
    super({ ...options, type: 'game' });

    // Подтип игровой сущности
    this.subtype = options.subtype || 'unit';

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

    // Если есть коллизия - создаём компонент для ECS
    if (this.hasCollision) {
      this.collision = this._createCollisionComponent();
    }
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
      scale: this.collisionScale  // масштаб коллизии (1.0 = 100%)
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

  getInfo() {
    return {
      ...super.getInfo?.() || {},
      subtype: this.subtype,
      velocity: this.velocity,
      movement: this.movement,
      appearance: this.appearance,
      hasCollision: this.hasCollision,
      collision: this.collision
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
