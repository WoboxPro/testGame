/**
 * LightEntity - локальный источник света
 *
 * Идея: свет не рисуется "поверх мира", а используется как вырез в слое темноты.
 * Рендерер строит маску (1 = темно, 0 = полностью вырезано) на основе этих сущностей.
 */
 
import { Entity } from './Entity.js';
 
export class LightEntity extends Entity {
  /**
   * @param {Partial<Entity> & {
   *  shape?: 'circle' | 'arc',
   *  radius?: number,
   *  falloffRadius?: number,
   *  intensity?: number,
   *  tint?: string | null,
   *  fovAngle?: number,
   *  direction?: {x:number, y:number},
   *  directionMode?: 'static' | 'relative',
   *  showDebug?: boolean,
   *  debugColor?: string
   * }} options
   */
  constructor(options = {}) {
    super({ ...options, type: 'effect', subtype: 'light' });
 
    this.shape = options.shape || 'circle'; // 'circle' | 'arc'
 
    // Основной радиус (полный свет)
    this.radius = options.radius !== undefined ? Number(options.radius) : 220;
 
    // Радиус угасания (градиент до 0)
    this.falloffRadius = options.falloffRadius !== undefined ? Number(options.falloffRadius) : 140;
 
    // Интенсивность (0..1) — насколько сильно "вырезает" темноту
    const rawIntensity = options.intensity !== undefined ? Number(options.intensity) : 1.0;
    this.intensity = Math.max(0, Math.min(1, rawIntensity));
 
    // Опциональный цвет (пока используется только для debug/UI; сам "вырез" — без цвета)
    this.tint = options.tint === undefined ? null : options.tint;
 
    // Arc-параметры
    this.fovAngle = options.fovAngle !== undefined ? Number(options.fovAngle) : 90;
    this.direction = options.direction || { x: 1, y: 0 };
    this.directionMode = options.directionMode || 'relative';
 
    // Debug
    this.showDebug = options.showDebug !== false;
    this.debugColor = options.debugColor || '#FFD54F'; // тёплый жёлтый
  }
 
  setIntensity(value) {
    this.intensity = Math.max(0, Math.min(1, Number(value)));
  }
 
  setRadius(value) {
    this.radius = Math.max(0, Number(value) || 0);
  }
 
  setFalloffRadius(value) {
    this.falloffRadius = Math.max(0, Number(value) || 0);
  }
 
  setTint(value) {
    this.tint = value == null || value === '' ? null : String(value);
  }
 
  setShape(shape) {
    if (shape === 'circle' || shape === 'arc') {
      this.shape = shape;
    }
  }
 
  setFovAngle(angle) {
    this.fovAngle = Math.max(1, Math.min(360, Number(angle) || 90));
  }
 
  setDirection(x, y) {
    this.direction = { x: Number(x) || 0, y: Number(y) || 0 };
  }
 
  setDirectionMode(mode) {
    if (mode === 'static' || mode === 'relative') {
      this.directionMode = mode;
    }
  }
 
  getInfo() {
    return {
      ...super.getInfo?.() || {},
      shape: this.shape,
      radius: this.radius,
      falloffRadius: this.falloffRadius,
      intensity: this.intensity,
      tint: this.tint,
      fovAngle: this.fovAngle,
      direction: this.direction,
      directionMode: this.directionMode,
      showDebug: this.showDebug,
      debugColor: this.debugColor
    };
  }
}

