/**
 * ProjectileEntity - Снаряды (пули, снаряды и т.д.)
 *
 * Типы (subtype):
 * - 'bullet' - обычные пули
 * - 'rocket' - ракеты
 * - etc.
 *
 * Особенности:
 * - Движется по прямой в заданном направлении
 * - Удаляется по достижению максимальной дистанции
 * - Белая кругляшка (пока без коллизии)
 */

import { Entity } from './Entity.js';

export class ProjectileEntity extends Entity {
  /**
   * @param {Partial<Entity> & {
   *  direction?: {x:number, y:number},
   *  speed?: number,
   *  range?: number,
   *  damage?: number
   * }} options
   */
  constructor(options = {}) {
    // Projectile - это type: 'projectile', subtype: 'bullet'
    super({ ...options, type: 'projectile', subtype: options.subtype || 'bullet' });

    // Направление полета (нормализованный вектор)
    this.direction = options.direction || { x: 1, y: 0 };

    // Скорость полета (пикселей в секунду)
    this.speed = options.speed !== undefined ? Number(options.speed) : 500;

    // Максимальная дальность полета (пикселей)
    this.range = options.range !== undefined ? Number(options.range) : 1000;

    // Урон (для будущего)
    this.damage = options.damage !== undefined ? Number(options.damage) : 10;

    // Пройденная дистанция
    this._traveledDistance = 0;

    // Внешний вид - белая кругляшка
    this.appearance = {
      shape: 'circle',
      color: options.color || '#FFFFFF',
      size: options.size || 8
    };
  }

  /**
   * Обновить позицию пули
   * @param {number} dt - delta time в миллисекундах
   * @returns {boolean} - true если пуля еще жива, false если достигла лимита дальности
   */
  update(dt) {
    // Нормализуем направление если нужно
    const { x, y } = this.direction;
    const length = Math.sqrt(x * x + y * y);
    const normalizedDir = length === 0 ? { x: 1, y: 0 } : { x: x / length, y: y / length };

    // Вычисляем смещение за этот кадр
    const dtSeconds = dt / 1000;
    const distance = this.speed * dtSeconds;

    // Обновляем позицию
    this.position.x += normalizedDir.x * distance;
    this.position.y += normalizedDir.y * distance;

    // Обновляем пройденную дистанцию
    this._traveledDistance += distance;

    // Проверяем достигнута ли максимальная дальность
    return this._traveledDistance < this.range;
  }

  /**
   * Получить пройденную дистанцию
   */
  getTraveledDistance() {
    return this._traveledDistance;
  }

  /**
   * Получить оставшуюся дальность
   */
  getRemainingRange() {
    return Math.max(0, this.range - this._traveledDistance);
  }

  /**
   * Проверка жива ли пуля (не достигла ли лимита дальности)
   */
  isAlive() {
    return this._traveledDistance < this.range;
  }

  /**
   * Установить направление полета
   * @param {number} x - X компонента вектора направления
   * @param {number} y - Y компонента вектора направления
   */
  setDirection(x, y) {
    this.direction = { x: Number(x) || 0, y: Number(y) || 0 };
  }

  /**
   * Получить направление как нормализованный вектор
   */
  getNormalizedDirection() {
    const { x, y } = this.direction;
    const length = Math.sqrt(x * x + y * y);
    if (length === 0) return { x: 1, y: 0 };
    return { x: x / length, y: y / length };
  }

  getInfo() {
    return {
      ...super.getInfo?.() || {},
      direction: this.direction,
      normalizedDirection: this.getNormalizedDirection(),
      speed: this.speed,
      range: this.range,
      damage: this.damage,
      traveledDistance: this._traveledDistance,
      remainingRange: this.getRemainingRange(),
      alive: this.isAlive()
    };
  }
}

// Удобные фабрики для создания типовых снарядов
export class BulletEntity extends ProjectileEntity {
  constructor(options = {}) {
    super({ ...options, subtype: 'bullet' });
  }
}
