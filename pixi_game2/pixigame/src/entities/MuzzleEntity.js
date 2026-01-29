/**
 * MuzzleEntity - Стволы оружия (точки спавна пуль)
 *
 * Отдельный тип сущности для определения позиции и направления,
 * откуда будут вылетать пули в будущем.
 *
 * Особенности:
 * - Крепится ТОЛЬКО через слоты к другим сущностям
 * - В слотах работает только с physicsMode: 'instant'
 * - Имеет направление (direction) - вектор куда направлен ствол
 */

import { Entity } from './Entity.js';

export class MuzzleEntity extends Entity {
  /**
   * @param {Partial<Entity> & {
   *  direction?: {x:number, y:number},
   *  directionMode?: 'static' | 'relative',
   *  showDebug?: boolean,
   *  debugColor?: string
   * }} options
   */
  constructor(options = {}) {
    // Muzzle - это type: 'effect', subtype: 'muzzle'
    super({ ...options, type: 'effect', subtype: 'muzzle' });

    // Направление выстрела (вектор нормализованный или нет)
    // { x: 1, y: 0 } = вправо, { x: -1, y: 0 } = влево, { x: 0, y: 1 } = вниз
    this.direction = options.direction || { x: 1, y: 0 };

    // Режим направления:
    // - 'static': направление фиксировано в мировых координатах
    // - 'relative': направление вращается вместе с родительской сущностью
    this.directionMode = options.directionMode || 'relative';

    // Debug визуализация
    this.showDebug = options.showDebug !== false; // default: true
    this.debugColor = options.debugColor || '#FF00FF'; // magenta по умолчанию
  }

  /**
   * Установить направление ствола
   * @param {number} x - X компонента вектора направления
   * @param {number} y - Y компонента вектора направления
   */
  setDirection(x, y) {
    this.direction = { x: Number(x) || 0, y: Number(y) || 0 };
  }

  /**
   * Получить направление как нормализованный вектор
   * @returns {{x:number, y:number}} Нормализованный вектор направления
   */
  getNormalizedDirection() {
    const { x, y } = this.direction;
    const length = Math.sqrt(x * x + y * y);
    if (length === 0) return { x: 1, y: 0 };
    return { x: x / length, y: y / length };
  }

  /**
   * Получить угол направления в радианах
   * @returns {number} Угол в радианах
   */
  getDirectionAngle() {
    return Math.atan2(this.direction.y, this.direction.x);
  }

  /**
   * Включить/выключить debug визуализацию
   * @param {boolean} show
   */
  setShowDebug(show) {
    this.showDebug = show;
  }

  /**
   * Установить цвет debug визуализации
   * @param {string} color - Hex цвет (#FF00FF)
   */
  setDebugColor(color) {
    this.debugColor = color;
  }

  /**
   * Установить режим направления
   * @param {'static' | 'relative'} mode - Режим направления
   */
  setDirectionMode(mode) {
    this.directionMode = mode;
  }

  /**
   * Получить режим направления
   * @returns {'static' | 'relative'} Режим направления
   */
  getDirectionMode() {
    return this.directionMode;
  }

  getInfo() {
    return {
      ...super.getInfo?.() || {},
      direction: this.direction,
      directionMode: this.directionMode,
      normalizedDirection: this.getNormalizedDirection(),
      directionAngle: this.getDirectionAngle(),
      showDebug: this.showDebug,
      debugColor: this.debugColor
    };
  }
}
