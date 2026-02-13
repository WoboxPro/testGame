/**
 * MuzzleEntity - Стволы оружия (точки спавна пуль/лучей)
 *
 * Отдельный тип сущности для определения позиции и направления,
 * откуда будут вылетать пули или мгновенные лучи.
 *
 * Особенности:
 * - Крепится ТОЛЬКО через слоты к другим сущностям
 * - В слотах работает только с physicsMode: 'instant'
 * - Имеет направление (direction) - вектор куда направлен ствол
 * - Поддерживает два типа огня: projectile (снаряды) и ray (мгновенные лучи)
 * - Поддерживает веерную стрельбу несколькими пулями/лучами
 */

import { Entity } from './Entity.js';

export class MuzzleEntity extends Entity {
  /**
   * @param {Partial<Entity> & {
   *  direction?: {x:number, y:number},
   *  directionMode?: 'static' | 'relative',
   *  showDebug?: boolean,
   *  debugColor?: string,
   *  fireType?: 'projectile' | 'ray',
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
   *  rangeSpreadPercent?: number,
   *  bulletLifetime?: number,
   *  bulletPiercing?: number,
   *  rayColor?: string,
   *  rayThickness?: number,
   *  rayCollisionThickness?: number,
   *  showRay?: boolean
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

    // 🔫 Тип огня: 'projectile' (снаряды) или 'ray' (мгновенные лучи)
    this.fireType = options.fireType || 'projectile';

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

    // Время жизни пули в секундах (0 = бесконечно, определяется расстоянием)
    this.bulletLifetime = options.bulletLifetime !== undefined ? Number(options.bulletLifetime) : 0;

    // 🎯 Пробитие пули/луча
    // 1 = только первая цель (по умолчанию)
    // 2-100 = пробивает N целей
    // 0 = бесконечное пробитие
    this.bulletPiercing = options.bulletPiercing !== undefined ? 
      Math.max(0, Math.min(100, Number(options.bulletPiercing))) : 1;

    // ⚡ Параметры для raycast (только для fireType: 'ray')
    // Показывать луч визуально
    this.showRay = options.showRay !== undefined ? Boolean(options.showRay) : true;
    // Цвет луча (hex)
    this.rayColor = options.rayColor || '#FF0000';
    // Толщина визуального луча (пиксели)
    this.rayThickness = options.rayThickness !== undefined ? 
      Math.max(1, Math.min(50, Number(options.rayThickness))) : 3;
    // Толщина коллизии луча (пиксели) - может отличаться от визуальной
    this.rayCollisionThickness = options.rayCollisionThickness !== undefined ? 
      Math.max(1, Math.min(100, Number(options.rayCollisionThickness))) : 10;
    // Длительность отображения луча (мс) - для визуального эффекта
    this.rayDuration = options.rayDuration !== undefined ? 
      Math.max(10, Math.min(1000, Number(options.rayDuration))) : 100;

    // 📡 События (callbacks)
    this.onFire = options.onFire || null;  // (bulletIds) => void - вызывается при создании пуль
    this.onRayHit = options.onRayHit || null;  // (hits) => void - вызывается при попадании луча

    // Внутреннее состояние для стрельбы
    this._lastFireTime = 0;
    this._isFiring = false;
    
    // Внутреннее состояние для raycast визуализации
    this._activeRays = []; // [{startX, startY, endX, endY, color, thickness, endTime}]
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

  /**
   * 🔫 Установить время жизни пули
   * @param {number} lifetime - Время жизни в секундах (0 = бесконечно)
   */
  setBulletLifetime(lifetime) {
    const val = Number(lifetime);
    this.bulletLifetime = Math.max(0, isNaN(val) ? 0 : val);
  }

  /**
   * 🎯 Установить пробитие пули/луча
   * @param {number} piercing - Пробитие (0 = бесконечно, 1-100 = количество целей)
   */
  setBulletPiercing(piercing) {
    const val = Number(piercing);
    this.bulletPiercing = Math.max(0, Math.min(100, isNaN(val) ? 1 : val));
  }

  /**
   * ⚡ Установить тип огня
   * @param {'projectile' | 'ray'} fireType - Тип огня
   */
  setFireType(fireType) {
    if (fireType === 'projectile' || fireType === 'ray') {
      this.fireType = fireType;
    }
  }

  /**
   * ⚡ Установить цвет луча
   * @param {string} color - Hex цвет (#FF0000)
   */
  setRayColor(color) {
    this.rayColor = color || '#FF0000';
  }

  /**
   * ⚡ Установить толщину визуального луча
   * @param {number} thickness - Толщина в пикселях (1-50)
   */
  setRayThickness(thickness) {
    this.rayThickness = Math.max(1, Math.min(50, Number(thickness) || 3));
  }

  /**
   * ⚡ Установить толщину коллизии луча
   * @param {number} thickness - Толщина в пикселях (1-100)
   */
  setRayCollisionThickness(thickness) {
    this.rayCollisionThickness = Math.max(1, Math.min(100, Number(thickness) || 10));
  }

  /**
   * ⚡ Установить показ луча
   * @param {boolean} show - Показывать луч визуально
   */
  setShowRay(show) {
    this.showRay = Boolean(show);
  }

  /**
   * ⚡ Установить длительность отображения луча
   * @param {number} duration - Длительность в мс (10-1000)
   */
  setRayDuration(duration) {
    this.rayDuration = Math.max(10, Math.min(1000, Number(duration) || 100));
  }

  /**
   * ⚡ Добавить активный луч для визуализации
   * @param {Object} ray - {startX, startY, endX, endY}
   */
  addActiveRay(ray) {
    this._activeRays.push({
      ...ray,
      color: this.rayColor,
      thickness: this.rayThickness,
      remainingTime: this.rayDuration // Используем remainingTime вместо endTime
    });
  }

  /**
   * ⚡ Обновить лучи (вызывается из ProjectileSystem.update с учётом timeScale)
   * @param {number} dt - delta time в миллисекундах (уже с учётом timeScale)
   */
  updateRays(dt) {
    for (const ray of this._activeRays) {
      ray.remainingTime -= dt;
    }
    this._activeRays = this._activeRays.filter(r => r.remainingTime > 0);
  }

  /**
   * ⚡ Очистить просроченные лучи (deprecated - используйте updateRays)
   * @deprecated
   */
  clearExpiredRays() {
    this._activeRays = this._activeRays.filter(r => r.remainingTime > 0);
  }

  /**
   * ⚡ Получить активные лучи для рендеринга
   * @returns {Array} Массив активных лучей
   */
  getActiveRays() {
    return this._activeRays;
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
      fireType: this.fireType,
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
      bulletLifetime: this.bulletLifetime,
      bulletPiercing: this.bulletPiercing,
      showRay: this.showRay,
      rayColor: this.rayColor,
      rayThickness: this.rayThickness,
      rayCollisionThickness: this.rayCollisionThickness,
      rayDuration: this.rayDuration,
      isFiring: this._isFiring,
      hasOnFire: !!this.onFire,
      hasOnRayHit: !!this.onRayHit,
      activeRaysCount: this._activeRays.length
    };
  }
}
