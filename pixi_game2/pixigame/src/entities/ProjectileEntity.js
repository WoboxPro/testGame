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
 * - Поддерживает коллизию (point/circle)
 *
 * События:
 * - onHit(targetComp, point, targetId) - попадание во что-то
 * - onDeath(reason) - смерть пули (range/lifetime/block)
 */

import { Entity } from './Entity.js';

export class ProjectileEntity extends Entity {
  /**
   * @param {Partial<Entity> & {
   *  direction?: {x:number, y:number},
   *  speed?: number,
   *  range?: number,
   *  damage?: number,
   *  lifetime?: number,
   *  onHit?: Function,
   *  onDeath?: Function
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

    // Время жизни в секундах (0 = бесконечно, только по дальности)
    this.lifetime = options.lifetime !== undefined ? Number(options.lifetime) : 0;

    // Пройденная дистанция
    this._traveledDistance = 0;

    // Прожитое время в секундах
    this._aliveTime = 0;

    // Флаг внешнего уничтожения
    this._killed = false;

    // Внешний вид - белая кругляшка
    this.appearance = {
      shape: 'circle',
      color: options.color || '#FFFFFF',
      size: options.size || 8
    };

    // Collision настройки
    this.collisionType = 'projectile';
    this.collisionShape = 'point';  // 'point' | 'circle'
    this.hasCollision = true;

    // 📡 События (callbacks)
    this.onHit = options.onHit || null;        // (targetComp, point, targetId) => void
    this.onDeath = options.onDeath || null;    // (reason) => void  reason: 'range' | 'lifetime' | 'block'
  }

  /**
   * Убить пулю внешне
   * @param {string} reason - причина смерти ('block' | 'range' | 'lifetime' | 'manual')
   */
  kill(reason = 'manual') {
    if (this._killed) return;  // уже мертва
    this._killed = true;
    if (this.onDeath) {
      this.onDeath(reason);
    }
  }

  /**
   * Обновить позицию пули
   * @param {number} dt - delta time в миллисекундах
   * @returns {boolean} - true если пуля еще жива, false если достигла лимита дальности или времени
   */
  update(dt) {
    // Если уже убита внешне
    if (this._killed) return false;

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

    // Обновляем прожитое время
    this._aliveTime += dtSeconds;

    // Проверяем достигнута ли максимальная дальность
    if (this._traveledDistance >= this.range) {
      this.kill('range');
      return false;
    }

    // Проверяем истекло ли время жизни
    if (this.lifetime > 0 && this._aliveTime >= this.lifetime) {
      this.kill('lifetime');
      return false;
    }

    return true;
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
   * Получить прожитое время
   */
  getAliveTime() {
    return this._aliveTime;
  }

  /**
   * Получить оставшееся время жизни
   */
  getRemainingLifetime() {
    if (this.lifetime <= 0) return Infinity;
    return Math.max(0, this.lifetime - this._aliveTime);
  }

  /**
   * Проверка жива ли пуля (не достигла ли лимита дальности или времени)
   */
  isAlive() {
    if (this._traveledDistance >= this.range) return false;
    if (this.lifetime > 0 && this._aliveTime >= this.lifetime) return false;
    return true;
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
      lifetime: this.lifetime,
      traveledDistance: this._traveledDistance,
      remainingRange: this.getRemainingRange(),
      aliveTime: this._aliveTime,
      remainingLifetime: this.getRemainingLifetime(),
      alive: this.isAlive(),
      killed: this._killed,
      collisionType: this.collisionType,
      collisionShape: this.collisionShape
    };
  }
}

// Удобные фабрики для создания типовых снарядов
export class BulletEntity extends ProjectileEntity {
  constructor(options = {}) {
    super({ ...options, subtype: 'bullet' });
  }
}
