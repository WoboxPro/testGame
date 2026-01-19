/**
 * ⏱️ TimeSystem - Глобальная система управления временем (ECS)
 *
 * Глобальный синглтон для управления временем всей игры.
 * НЕ привязан к конкретному миру - используется всеми системами.
 *
 * Поддерживает:
 * - timeScale: масштаб времени (1.0 = норм, 0.5 = медленно, 2.0 = быстро)
 * - paused: флаг паузы (останавливает все игровые обновления)
 * - onChange: подписка на изменения настроек времени
 *
 * Используется в EntityController, World.update() и других системах
 * для масштабирования delta time.
 */

export class TimeSystem {
  constructor() {
    // Масштаб времени (1.0 = нормальная скорость)
    this._timeScale = 1.0;

    // Флаг паузы
    this._paused = false;

    // Слушатели изменений
    this._listeners = new Set();

    console.log(`⏱️ TimeSystem инициализирована (глобальная)`);
  }

  /**
   * Получить масштаб времени
   */
  getTimeScale() {
    return this._timeScale;
  }

  /**
   * Установить масштаб времени
   * @param {number} scale - новый масштаб (рекомендуется 0.1 - 5.0)
   */
  setTimeScale(scale) {
    const oldScale = this._timeScale;
    this._timeScale = Math.max(0, Number(scale) || 1.0);
    this._notify('timeScale', this._timeScale, oldScale);
  }

  /**
   * Проверить, игра на паузе
   */
  isPaused() {
    return this._paused;
  }

  /**
   * Установить паузу
   * @param {boolean} paused
   */
  setPaused(paused) {
    const oldPaused = this._paused;
    this._paused = Boolean(paused);
    this._notify('paused', this._paused, oldPaused);
  }

  /**
   * Переключить паузу
   */
  togglePaused() {
    this.setPaused(!this._paused);
  }

  /**
   * Получить масштабированный delta time
   * @param {number} dt - оригинальный delta time
   * @returns {number} - масштабированный dt (0 если пауза)
   */
  getDelta(dt) {
    if (this._paused) return 0;
    return dt * this._timeScale;
  }

  /**
   * Подписаться на изменения настроек
   * @param {Function} callback - функция (key, newValue, oldValue)
   * @returns {Function} - функция отписки
   */
  onChange(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  /**
   * Уведомить слушателей об изменении
   */
  _notify(key, newValue, oldValue) {
    for (const callback of this._listeners) {
      try {
        callback(key, newValue, oldValue);
      } catch (err) {
        console.error(`TimeSystem listener error:`, err);
      }
    }
  }

  /**
   * Сбросить настройки к значениям по умолчанию
   */
  reset() {
    this._timeScale = 1.0;
    this._paused = false;
    this._notify('reset', null, null);
  }

  /**
   * Получить информацию о системе
   */
  getInfo() {
    return {
      timeScale: this._timeScale,
      paused: this._paused
    };
  }
}

// Глобальный синглтон для всей игры
export const timeSystem = new TimeSystem();
