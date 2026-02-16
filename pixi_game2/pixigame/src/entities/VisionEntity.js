/**
 * VisionEntity - Сущность зрения/обзора
 *
 * Определяет зону видимости для юнита.
 * Крепится через слоты к другим сущностям.
 *
 * Формы:
 * - circle: круговой обзор (360°)
 * - arc: сектор обзора (угол + направление)
 *
 * Детекция:
 * - detectEntities: включить детекцию сущностей в зоне обзора
 * - detectTypes: типы сущностей для детекции (unit, build, prop)
 */

import { Entity } from './Entity.js';

export const VISION_DETECT_TYPES = ['unit', 'build', 'prop'];

export class VisionEntity extends Entity {
  /**
   * @param {Partial<Entity> & {
   *  shape?: 'circle' | 'arc',
   *  range?: number,
   *  fovAngle?: number,
   *  direction?: {x:number, y:number},
   *  directionMode?: 'static' | 'relative',
   *  showDebug?: boolean,
   *  debugColor?: string,
   *  detectEntities?: boolean,
   *  detectTypes?: string[]
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

    // Детекция сущностей
    this.detectEntities = options.detectEntities || false;
    this.detectTypes = options.detectTypes || ['unit'];
    this.visibleEntities = [];
    this._lastDetectionTime = 0;
    this._detectionInterval = 100;

    // Скрытие сущностей вне зоны видимости (туман войны)
    this.hideOutOfVision = options.hideOutOfVision || false;
    this.hideTypes = options.hideTypes || ['unit'];
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

  /**
   * Включить/выключить детекцию сущностей
   * @param {boolean} detect
   */
  setDetectEntities(detect) {
    this.detectEntities = detect;
    if (!detect) {
      this.visibleEntities = [];
    }
  }

  /**
   * Установить типы сущностей для детекции
   * @param {string[]} types - Массив типов (unit, build, prop)
   */
  setDetectTypes(types) {
    this.detectTypes = types.filter(t => VISION_DETECT_TYPES.includes(t));
  }

  /**
   * Добавить тип для детекции
   * @param {string} type - Тип сущности (unit, build, prop)
   */
  addDetectType(type) {
    if (VISION_DETECT_TYPES.includes(type) && !this.detectTypes.includes(type)) {
      this.detectTypes.push(type);
    }
  }

  /**
   * Удалить тип из детекции
   * @param {string} type - Тип сущности
   */
  removeDetectType(type) {
    const index = this.detectTypes.indexOf(type);
    if (index > -1) {
      this.detectTypes.splice(index, 1);
    }
  }

  /**
   * Проверить, находится ли точка в зоне обзора
   * @param {number} targetX - X координата цели
   * @param {number} targetY - Y координата цели
   * @param {number} visionX - X координата центра обзора
   * @param {number} visionY - Y координата центра обзора
   * @param {number} rotation - Текущий поворот (радианы)
   * @param {{x:number, y:number}} mirrorDirection - Направление отражения
   * @returns {boolean}
   */
  isPointInVision(targetX, targetY, visionX, visionY, rotation = 0, mirrorDirection = { x: 1, y: 1 }) {
    const dx = targetX - visionX;
    const dy = targetY - visionY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > this.range) return false;

    if (this.shape === 'circle') return true;

    const dirX = this.direction.x;
    const dirY = this.direction.y;

    let finalDirX = dirX;
    let finalDirY = dirY;

    if (this.directionMode === 'relative') {
      const rotatedDirX = dirX * Math.cos(rotation) - dirY * Math.sin(rotation);
      const rotatedDirY = dirX * Math.sin(rotation) + dirY * Math.cos(rotation);
      finalDirX = rotatedDirX * mirrorDirection.x;
      finalDirY = rotatedDirY * mirrorDirection.y;
    }

    const dirLength = Math.sqrt(finalDirX * finalDirX + finalDirY * finalDirY);
    if (dirLength > 0) {
      finalDirX /= dirLength;
      finalDirY /= dirLength;
    }

    const targetAngle = Math.atan2(dy, dx);
    const visionAngle = Math.atan2(finalDirY, finalDirX);
    
    let angleDiff = targetAngle - visionAngle;
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

    const halfFov = (this.fovAngle * Math.PI) / 360;
    
    return Math.abs(angleDiff) <= halfFov;
  }

  /**
   * Получить видимые сущности
   * @returns {Array<{id: string, type: string, distance: number}>}
   */
  getVisibleEntities() {
    return [...this.visibleEntities];
  }

  /**
   * Включить/выключить скрытие вне зоны видимости
   * @param {boolean} hide
   */
  setHideOutOfVision(hide) {
    this.hideOutOfVision = hide;
  }

  /**
   * Установить типы сущностей для скрытия
   * @param {string[]} types - Массив типов (unit, build, prop)
   */
  setHideTypes(types) {
    this.hideTypes = types.filter(t => VISION_DETECT_TYPES.includes(t));
  }

  /**
   * Добавить тип для скрытия
   * @param {string} type - Тип сущности (unit, build, prop)
   */
  addHideType(type) {
    if (VISION_DETECT_TYPES.includes(type) && !this.hideTypes.includes(type)) {
      this.hideTypes.push(type);
    }
  }

  /**
   * Удалить тип из скрытия
   * @param {string} type - Тип сущности
   */
  removeHideType(type) {
    const index = this.hideTypes.indexOf(type);
    if (index > -1) {
      this.hideTypes.splice(index, 1);
    }
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
      debugColor: this.debugColor,
      detectEntities: this.detectEntities,
      detectTypes: this.detectTypes,
      visibleEntities: this.visibleEntities,
      hideOutOfVision: this.hideOutOfVision,
      hideTypes: this.hideTypes
    };
  }
}
