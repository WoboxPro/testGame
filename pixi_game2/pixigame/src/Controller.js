/**
 * 🎮 Controller - Базовый класс контроллеров
 *
 * Контроллер управляет чем-то: сущностью, камерой, звуком и т.д.
 * Может существовать независимо и быть привязан к цели позже.
 */

export class Controller {
  constructor(options = {}) {
    this.id = options.id || `controller_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    this.type = options.type || 'base';

    this.target = options.target || null;
    this.targetId = options.targetId || null;

    this.enabled = options.enabled !== undefined ? options.enabled : true;

    console.log(`🎮 Controller создан: ${this.id}, type=${this.type}`);
  }

  /**
   * Привязать контроллер к цели
   */
  attachTo(target) {
    this.target = target;
    this.targetId = target?.id || null;
    console.log(`🔗 Controller ${this.id} привязан к: ${this.targetId}`);
  }

  /**
   * Отвязать от цели
   */
  detach() {
    this.target = null;
    this.targetId = null;
    console.log(`🔓 Controller ${this.id} отвязан`);
  }

  /**
   * Включить/выключить контроллер
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Обновление контроллера (вызывается каждый кадр)
   * Override в наследниках
   */
  update(dt) {
    if (!this.enabled) return;
  }

  /**
   * Очистка ресурсов
   */
  destroy() {
    this.detach();
    console.log(`🗑️ Controller ${this.id} уничтожен`);
  }

  getInfo() {
    return {
      id: this.id,
      type: this.type,
      targetId: this.targetId,
      enabled: this.enabled
    };
  }
}
