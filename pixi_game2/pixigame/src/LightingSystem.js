/**
 * 💡 LightingSystem - Система освещения мира
 *
 * Поддерживает:
 * - Ambient light (равномерное базовое освещение)
 * - Global light (направленный свет)
 */

export class LightingSystem {
  /**
   * @param {World} world - Ссылка на мир
   * @param {Object} options - Настройки
   * @param {boolean} options.enabled - Включено ли освещение
   * @param {number} options.ambientIntensity - Интенсивность ambient (0=тьма, 1=день)
   * @param {boolean} options.globalEnabled - Включён ли global свет
   * @param {number} options.globalIntensity - Интенсивность global света
   * @param {number} options.globalAngle - Угол направления света (0=верх, 90=право, 180=низ, 270=лево)
   */
  constructor(world, options = {}) {
    this.world = world;

    this.enabled = options.enabled === true;
    this.ambientIntensity = options.ambientIntensity !== undefined 
      ? Math.max(0, Math.min(1, Number(options.ambientIntensity))) 
      : 0.1;
    this.globalEnabled = options.globalEnabled === true;
    this.globalIntensity = options.globalIntensity !== undefined 
      ? Math.max(0, Math.min(1, Number(options.globalIntensity))) 
      : 0.5;
    this.globalAngle = options.globalAngle !== undefined 
      ? Number(options.globalAngle) % 360 
      : 45;

    console.log(`💡 LightingSystem создана: ambient=${this.ambientIntensity}, global=${this.globalEnabled ? this.globalIntensity : 'off'}, angle=${this.globalAngle}°`);
  }

  /**
   * Установить интенсивность ambient света
   * @param {number} value - 0..1
   */
  setAmbientIntensity(value) {
    this.ambientIntensity = Math.max(0, Math.min(1, Number(value)));
  }

  /**
   * Включить/выключить global свет
   * @param {boolean} enabled
   */
  setGlobalEnabled(enabled) {
    this.globalEnabled = enabled === true;
  }

  /**
   * Установить интенсивность global света
   * @param {number} value - 0..1
   */
  setGlobalIntensity(value) {
    this.globalIntensity = Math.max(0, Math.min(1, Number(value)));
  }

  /**
   * Установить угол global света
   * @param {number} value - 0..360
   */
  setGlobalAngle(value) {
    this.globalAngle = Number(value) % 360;
  }

  /**
   * Включить/выключить освещение
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled === true;
  }

  /**
   * Получить направление света в виде вектора
   * @returns {{x: number, y: number}}
   */
  getLightDirection() {
    const radians = (this.globalAngle - 90) * (Math.PI / 180);
    return {
      x: Math.cos(radians),
      y: Math.sin(radians)
    };
  }

  /**
   * Получить описание угла света
   * @returns {string}
   */
  getAngleDescription() {
    const angle = this.globalAngle;
    if (angle >= 337.5 || angle < 22.5) return 'сверху';
    if (angle >= 22.5 && angle < 67.5) return 'сверху-справа';
    if (angle >= 67.5 && angle < 112.5) return 'справа';
    if (angle >= 112.5 && angle < 157.5) return 'снизу-справа';
    if (angle >= 157.5 && angle < 202.5) return 'снизу';
    if (angle >= 202.5 && angle < 247.5) return 'снизу-слева';
    if (angle >= 247.5 && angle < 292.5) return 'слева';
    if (angle >= 292.5 && angle < 337.5) return 'сверху-слева';
    return 'сверху';
  }

  getInfo() {
    return {
      enabled: this.enabled,
      ambientIntensity: this.ambientIntensity,
      globalEnabled: this.globalEnabled,
      globalIntensity: this.globalIntensity,
      globalAngle: this.globalAngle,
      angleDescription: this.getAngleDescription()
    };
  }
}
