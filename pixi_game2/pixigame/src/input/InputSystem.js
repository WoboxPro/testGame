/**
 * ⌨️ InputSystem - Глобальная система управления вводом (ECS)
 *
 * Обрабатывает все типы ввода:
 * - Touch события для виртуальных джостиков
 * - Виртуальные кнопки (задел)
 * - Унифицированный API для контроллеров
 */

import { VirtualJoystick } from './VirtualJoystick.js';

export class InputSystem {
  constructor() {
    // Джостики
    this.joysticks = new Map(); // id -> VirtualJoystick

    // Кнопки (задел)
    this.buttons = new Map(); // id -> VirtualButton

    // PIXI контейнер для отрисовки
    this._pixiContainer = null;

    // Активные тачи
    this._activeTouches = new Map(); // touchId -> { joystickId | buttonId, type }

    console.log('⌨️ InputSystem инициализирована (глобальная)');
  }

  /**
   * Установить PIXI контейнер для отрисовки виртуальных элементов
   */
  setPixiContainer(container) {
    this._pixiContainer = container;
    console.log(`📱 PIXI контейнер установлен:`, container?.width, 'x', container?.height);

    // Реинициализируем все джостики с новым контейнером
    let initialized = 0;
    for (const joystick of this.joysticks.values()) {
      if (!joystick._container) {
        console.log(`🔧 Инициализация джостика ${joystick.id}...`);
        joystick.init(container);
        initialized++;
      }
    }
    console.log(`✅ Инициализировано джостиков: ${initialized}`);
  }

  /**
   * Добавить джостик в систему
   */
  addJoystick(config) {
    console.log(`➕ Добавляем джостик:`, config);
    const joystick = new VirtualJoystick(config);

    if (this._pixiContainer) {
      console.log(`📦 PIXI контейнер существует, инициализируем...`);
      joystick.init(this._pixiContainer);
    } else {
      console.log(`⚠️ PIXI контейнер еще не установлен, джостик будет инициализирован позже`);
    }

    this.joysticks.set(joystick.id, joystick);

    // Подписываемся на изменения для уведомлений
    if (!this._listeners) {
      this._listeners = new Set();
    }

    console.log(`✅ Джостик добавлен: ${joystick.id}, инициализирован: ${!!joystick._container}`);

    return joystick;
  }

  /**
   * Удалить джостик
   */
  removeJoystick(id) {
    const joystick = this.joysticks.get(id);
    if (joystick) {
      joystick.destroy();
      this.joysticks.delete(id);
      console.log(`🗑️ Джостик удален: ${id}`);
    }
  }

  /**
   * Получить джостик по ID
   */
  getJoystick(id) {
    return this.joysticks.get(id);
  }

  /**
   * Получить значения оси джостика
   */
  getAxis(id) {
    const joystick = this.joysticks.get(id);
    return joystick ? joystick.getAxis() : { x: 0, y: 0 };
  }

  /**
   * Добавить кнопку (задел)
   */
  addButton(config) {
    // TODO: реализовать VirtualButton
    console.log('⚠️ addButton пока не реализован');
    return null;
  }

  /**
   * Проверить нажатие кнопки
   */
  isPressed(id) {
    // TODO: реализовать
    return false;
  }

  /**
   * Обработать touch start
   */
  handleTouchStart(event, canvasWidth, canvasHeight) {
    console.log(`👆 touchStart: changedTouches=${event.changedTouches.length}, joysticks=${this.joysticks.size}`);
    if (!this._pixiContainer) {
      console.log(`⚠️ Нет PIXI контейнера!`);
      return;
    }

    for (const touch of event.changedTouches) {
      const x = touch.clientX;
      const y = touch.clientY;
      console.log(`  👆 Тач at (${x}, ${y}), canvas: ${canvasWidth}x${canvasHeight}`);

      // Ищем джостик, который может принять этот тач
      for (const joystick of this.joysticks.values()) {
        console.log(`    🕹️ Проверяем ${joystick.id}: active=${joystick._active}, initialized=${!!joystick._container}`);
        if (!joystick._active && joystick.isPointInZone(x, y, canvasWidth, canvasHeight)) {
          console.log(`      ✅ В зоне!`);
          if (joystick.handleTouchStart(x, y, touch.identifier)) {
            this._activeTouches.set(touch.identifier, {
              type: 'joystick',
              id: joystick.id
            });
            console.log(`        🎯 Джостик ${joystick.id} активирован!`);
            break;
          }
        }
      }
    }
  }

  /**
   * Обработать touch move
   */
  handleTouchMove(event) {
    for (const touch of event.changedTouches) {
      const active = this._activeTouches.get(touch.identifier);
      if (!active) continue;

      if (active.type === 'joystick') {
        const joystick = this.joysticks.get(active.id);
        if (joystick) {
          joystick.handleTouchMove(touch.clientX, touch.clientY, touch.identifier);
        }
      }
    }
  }

  /**
   * Обработать touch end
   */
  handleTouchEnd(event) {
    for (const touch of event.changedTouches) {
      const active = this._activeTouches.get(touch.identifier);
      if (!active) continue;

      if (active.type === 'joystick') {
        const joystick = this.joysticks.get(active.id);
        if (joystick) {
          joystick.handleTouchEnd(touch.identifier);
        }
      }

      this._activeTouches.delete(touch.identifier);
    }
  }

  /**
   * Подписаться на изменения ввода
   */
  onChange(callback) {
    if (!this._listeners) {
      this._listeners = new Set();
    }
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  /**
   * Уведомить слушателей
   */
  _notify(inputId, axis, pressed) {
    if (!this._listeners) return;

    for (const callback of this._listeners) {
      try {
        callback(inputId, axis, pressed);
      } catch (err) {
        console.error(`InputSystem listener error:`, err);
      }
    }
  }

  /**
   * Обновление системы (вызывается каждый кадр)
   */
  update(dt) {
    // Ничего не обновляем каждый кадр, всё работает через события
  }

  /**
   * Получить информацию о системе
   */
  getInfo() {
    return {
      joystickCount: this.joysticks.size,
      buttonCount: this.buttons.size,
      joysticks: Array.from(this.joysticks.values()).map(j => j.getInfo())
    };
  }

  /**
   * Очистить все элементы управления
   */
  clear() {
    for (const joystick of this.joysticks.values()) {
      joystick.destroy();
    }
    this.joysticks.clear();
    this._activeTouches.clear();
  }
}

// Глобальный синглтон для всей игры
export const inputSystem = new InputSystem();
