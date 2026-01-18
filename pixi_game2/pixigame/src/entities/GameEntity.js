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

    // Если есть коллизия - создаём её на основе appearance
    if (this.hasCollision && (!options.collision || options.collision.length === 0)) {
      this._createDefaultCollision();
    } else {
      this.collision = Array.isArray(options.collision) ? options.collision : [];
    }
  }

  /**
   * Создать коллизию по умолчанию на основе формы
   */
  _createDefaultCollision() {
    const shape = this.appearance.shape;
    const size = this.appearance.size;
    const width = this.appearance.width;
    const height = this.appearance.height;

    if (shape === 'circle') {
      this.collision = [
        {
          id: `${this.id}_collision`,
          enabled: true,
          offset: { x: 0, y: 0 },
          shape: 'circle',
          radius: size / 2,
          type: 'hitbox',
          layer: 'default',
          mask: ['default'],
          active: true,
          debugVisible: false,
          debugColor: '#00ff00'
        }
      ];
    } else if (shape === 'rect') {
      this.collision = [
        {
          id: `${this.id}_collision`,
          enabled: true,
          offset: { x: 0, y: 0 },
          shape: 'rect',
          width: width,
          height: height,
          type: 'hitbox',
          layer: 'default',
          mask: ['default'],
          active: true,
          debugVisible: false,
          debugColor: '#00ff00'
        }
      ];
    }
  }

  /**
   * Обновить внешний вид
   */
  setAppearance(appearance) {
    this.appearance = { ...this.appearance, ...appearance };

    // Если есть коллизия и изменилась форма - обновить коллизию
    if (this.hasCollision && appearance.shape) {
      this._createDefaultCollision();
    }
  }

  /**
   * Включить/выключить коллизию
   */
  setCollision(hasCollision) {
    this.hasCollision = hasCollision;
    if (hasCollision && this.collision.length === 0) {
      this._createDefaultCollision();
    } else if (!hasCollision) {
      this.collision = [];
    }
  }

  getInfo() {
    return {
      ...super.getInfo?.() || {},
      subtype: this.subtype,
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
