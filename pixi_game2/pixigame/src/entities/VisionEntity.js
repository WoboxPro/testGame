/**
 * VisionEntity - Сущность зрения/обзора
 *
 * Определяет зону видимости для юнита.
 * Крепится через слоты к другим сущностям.
 *
 * Формы:
 * - circle: круговой обзор (360°)
 * - arc: сектор обзора (угол + направление)
 */

import { Entity } from './Entity.js';

export class VisionEntity extends Entity {
  /**
   * @param {Partial<Entity> & {
   *  shape?: 'circle' | 'arc',
   *  range?: number,
   *  fovAngle?: number,
   *  direction?: {x:number, y:number},
   *  directionMode?: 'static' | 'relative',
   *  showDebug?: boolean,
   *  debugColor?: string
   * }} options
   */
  constructor(options = {}) {
    super({ ...options, type: 'effect', subtype: 'vision' });

    // Форма обзора: круг или дуга (сектор)
    this.shape = options.shape || 'arc'; // 'circle' | 'arc'

    // Радиус обзора (пиксели)
    this.range = options.range !== undefined ? Number(options.range) : 500;

    // Угол обзора в градусах (только для arc)
    this.fovAngle = options.fovAngle !== undefined ? Number(options.fovAngle) : 90;

    // Направление взгляда (только для arc)
    // { x: 1, y: 0 } = вправо, { x: -1, y: 0 } = влево, { x: 0, y: 1 } = вниз
    this.direction = options.direction || { x: 1, y: 0 };

    // Режим направления:
    // - 'static': направление фиксировано в мировых координатах
    // - 'relative': направление вращается вместе с родительской сущностью
    this.directionMode = options.directionMode || 'relative';

    // Debug визуализация
    this.showDebug = options.showDebug !== false; // default: true
    this.debugColor = options.debugColor || '#00FF00'; // green по умолчанию
  }

  /**
   * Установить форму обзора
   * @param {'circle' | 'arc'} shape - Форма обзора
   */
  setShape(shape) {
    if (shape === 'circle' || shape === 'arc') {
      this.shape = shape;
    }
  }

  /**
   * Установить радиус обзора
   * @param {number} range - Радиус в пикселях (1-2000)
   */
  setRange(range) {
    this.range = Math.max(1, Math.min(2000, Number(range) || 500));
  }

  /**
   * Установить угол обзора
   * @param {number} angle - Угол в градусах (1-360)
   */
  setFovAngle(angle) {
    this.fovAngle = Math.max(1, Math.min(360, Number(angle) || 90));
  }

  /**
   * Установить направление взгляда
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
   * Установить режим направления
   * @param {'static' | 'relative'} mode - Режим направления
   */
  setDirectionMode(mode) {
    if (mode === 'static' || mode === 'relative') {
      this.directionMode = mode;
    }
  }

  /**
   * Получить режим направления
   * @returns {'static' | 'relative'} Режим направления
   */
  getDirectionMode() {
    return this.directionMode;
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
   * @param {string} color - Hex цвет (#00FF00)
   */
  setDebugColor(color) {
    this.debugColor = color;
  }

  getInfo() {
    return {
      ...super.getInfo?.() || {},
      shape: this.shape,
      range: this.range,
      fovAngle: this.fovAngle,
      direction: this.direction,
      directionMode: this.directionMode,
      showDebug: this.showDebug,
      debugColor: this.debugColor
    };
  }
}
