/**
 * MuzzleEntity - Стволы оружия (точки спавна пуль)
 *
 * Отдельный тип сущности для определения позиции и направления,
 * откуда будут вылетать пули.
 *
 * Особенности:
 * - Крепится ТОЛЬКО через слоты к другим сущностям
 * - В слотах работает только с physicsMode: 'instant'
 * - Имеет направление (direction) - вектор куда направлен ствол
 * - Может стрелять пулями с заданными параметрами
 * - Поддерживает веерную стрельбу несколькими пулями
 */

import { Entity } from './Entity.js';

export class MuzzleEntity extends Entity {
  /**
   * @param {Partial<Entity> & {
   *  direction?: {x:number, y:number},
   *  directionMode?: 'static' | 'relative',
   *  showDebug?: boolean,
   *  debugColor?: string,
   *  fireRate?: number,
   *  bulletSpeed?: number,
   *  bulletRange?: number,
   *  bulletSize?: number,
   *  bulletColor?: string,
   *  autoFire?: boolean,
   *  bulletCount?: number,
   *  isSpread?: boolean,
   *  spreadAngle?: number,
   *  scatterChance?: number,
   *  rangeScatterChance?: number,
   *  rangeSpreadPercent?: number
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

    // 🔫 Параметры стрельбы
    // Скорострельность (выстрелов в секунду)
    this.fireRate = options.fireRate !== undefined ? Number(options.fireRate) : 5;

    // Скорость полета пули (пикселей в секунду)
    this.bulletSpeed = options.bulletSpeed !== undefined ? Number(options.bulletSpeed) : 500;

    // Дальность полета пули (пикселей)
    this.bulletRange = options.bulletRange !== undefined ? Number(options.bulletRange) : 1000;

    // Размер пули (пикселей)
    this.bulletSize = options.bulletSize !== undefined ? Number(options.bulletSize) : 8;

    // Цвет пули
    this.bulletColor = options.bulletColor || '#FFFFFF';

    // Автоогонь (true = зажатая кнопка, false = одиночный выстрел при клике)
    this.autoFire = options.autoFire !== undefined ? Boolean(options.autoFire) : false;

    // 🔫 Множественная стрельба
    // Количество пуль за выстрел (1-20)
    this.bulletCount = Math.min(20, Math.max(1, Number(options.bulletCount) || 1));

    // Веерная стрельба (true = пули разлетаются веером)
    this.isSpread = options.isSpread !== undefined ? Boolean(options.isSpread) : false;

    // Угол веера в градусах (для isSpread = true)
    this.spreadAngle = options.spreadAngle !== undefined ? Number(options.spreadAngle) : 45;

    // Шанс разброса (0-1) для режима без равномерного веера
    // 0 = никогда не разбрасывает, все летят по центру
    // 1 = всегда разбрасывает
    this.scatterChance = options.scatterChance !== undefined ? Number(options.scatterChance) : 0;

    // Шанс разброса по дальности (0-1)
    // 0 = все пули летят на максимальную дальность
    // 1 = все пули имеют случайную дальность в пределах rangeSpreadPercent
    this.rangeScatterChance = options.rangeScatterChance !== undefined ? Number(options.rangeScatterChance) : 0;

    // Процент разброса по дальности (0-100)
    // Определяет диапазон случайной дальности от максимальной
    // Например: 10% при дальности 400 = пули летят от 360 до 400
    this.rangeSpreadPercent = options.rangeSpreadPercent !== undefined ? Number(options.rangeSpreadPercent) : 10;

    // Внутреннее состояние для стрельбы
    this._lastFireTime = 0;
    this._isFiring = false;
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

  /**
   * 🔫 Установить режим стрельбы (зажата кнопка или нет)
   * @param {boolean} isFiring - true если кнопка зажата
   */
  setFiring(isFiring) {
    this._isFiring = isFiring;
  }

  /**
   * 🔫 Проверить можно ли сейчас произвести выстрел
   * @param {number} currentTime - Текущее время (performance.now())
   * @returns {boolean} - true если можно стрелять
   */
  canFire(currentTime) {
    const fireInterval = 1000 / this.fireRate; // мс между выстрелами
    return currentTime - this._lastFireTime >= fireInterval;
  }

  /**
   * 🔫 Произвести выстрел (обновить время последнего выстрела)
   * @param {number} currentTime - Текущее время (performance.now())
   */
  fire(currentTime) {
    this._lastFireTime = currentTime;
  }

  /**
   * 🔫 Проверить нужно ли стрелять сейчас
   * @param {number} currentTime - Текущее время (performance.now())
   * @returns {boolean} - true если нужно произвести выстрел
   */
  shouldFire(currentTime) {
    if (this.autoFire) {
      // Автоогонь - стреляем пока кнопка зажата
      return this._isFiring && this.canFire(currentTime);
    } else {
      // Одиночный выстрел - стреляем при первом нажатии
      if (this._isFiring && this.canFire(currentTime)) {
        this._isFiring = false; // сбрасываем после выстрела
        return true;
      }
      return false;
    }
  }

  /**
   * 🔫 Установить скорострельность
   * @param {number} rate - Выстрелов в секунду
   */
  setFireRate(rate) {
    this.fireRate = Math.max(0.1, Number(rate) || 1);
  }

  /**
   * 🔫 Установить скорость пули
   * @param {number} speed - Пикселей в секунду
   */
  setBulletSpeed(speed) {
    this.bulletSpeed = Math.max(1, Number(speed) || 100);
  }

  /**
   * 🔫 Установить дальность пули
   * @param {number} range - Пикселей
   */
  setBulletRange(range) {
    this.bulletRange = Math.max(1, Number(range) || 100);
  }

  /**
   * 🔫 Установить автоогонь
   * @param {boolean} auto - true для автоогня
   */
  setAutoFire(auto) {
    this.autoFire = Boolean(auto);
  }

  /**
   * 🔫 Установить размер пули
   * @param {number} size - Размер пули в пикселях
   */
  setBulletSize(size) {
    this.bulletSize = Math.max(1, Number(size) || 8);
  }

  /**
   * 🔫 Установить цвет пули
   * @param {string} color - Hex цвет (#FFFFFF)
   */
  setBulletColor(color) {
    this.bulletColor = color || '#FFFFFF';
  }

  /**
   * 🔫 Установить количество пуль за выстрел
   * @param {number} count - Количество пуль (1-20)
   */
  setBulletCount(count) {
    this.bulletCount = Math.min(20, Math.max(1, Number(count) || 1));
  }

  /**
   * 🔫 Установить веерную стрельбу
   * @param {boolean} spread - true для веерной стрельбы
   */
  setIsSpread(spread) {
    this.isSpread = Boolean(spread);
  }

  /**
   * 🔫 Установить угол веера
   * @param {number} angle - Угол веера в градусах
   */
  setSpreadAngle(angle) {
    this.spreadAngle = Math.max(1, Math.min(360, Number(angle) || 45));
  }

  /**
   * 🔫 Установить шанс разброса
   * @param {number} chance - Шанс разброса (0-1)
   */
  setScatterChance(chance) {
    const val = Number(chance);
    this.scatterChance = Math.max(0, Math.min(1, isNaN(val) ? 0 : val));
  }

  /**
   * 🔫 Установить шанс разброса по дальности
   * @param {number} chance - Шанс разброса по дальности (0-1)
   */
  setRangeScatterChance(chance) {
    const val = Number(chance);
    this.rangeScatterChance = Math.max(0, Math.min(1, isNaN(val) ? 0 : val));
  }

  /**
   * 🔫 Установить процент разброса по дальности
   * @param {number} percent - Процент разброса (0-100)
   */
  setRangeSpreadPercent(percent) {
    const val = Number(percent);
    this.rangeSpreadPercent = Math.max(0, Math.min(100, isNaN(val) ? 10 : val));
  }

  getInfo() {
    return {
      ...super.getInfo?.() || {},
      direction: this.direction,
      directionMode: this.directionMode,
      normalizedDirection: this.getNormalizedDirection(),
      directionAngle: this.getDirectionAngle(),
      showDebug: this.showDebug,
      debugColor: this.debugColor,
      fireRate: this.fireRate,
      bulletSpeed: this.bulletSpeed,
      bulletRange: this.bulletRange,
      bulletSize: this.bulletSize,
      bulletColor: this.bulletColor,
      autoFire: this.autoFire,
      bulletCount: this.bulletCount,
      isSpread: this.isSpread,
      spreadAngle: this.spreadAngle,
      scatterChance: this.scatterChance,
      rangeScatterChance: this.rangeScatterChance,
      rangeSpreadPercent: this.rangeSpreadPercent,
      isFiring: this._isFiring
    };
  }
}
