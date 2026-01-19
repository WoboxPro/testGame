/**
 * 🕹️ VirtualJoystick - Виртуальный джостик для touch управления
 *
 * Поддерживает:
 * - Статичное и динамическое позиционирование
 * - Настраиваемые размеры кругов
 * - Deadzone (мертвая зона)
 * - Рендеринг через PIXI.Graphics
 */

import * as PIXI from 'pixi.js';

export class VirtualJoystick {
  constructor(options = {}) {
    this.id = options.id || `joystick_${Date.now()}`;

    // Размеры
    this.outerRadius = options.outerRadius !== undefined ? options.outerRadius : 60;
    this.innerRadius = options.innerRadius !== undefined ? options.innerRadius : 25;

    // Проверка: внутренний круг не может быть больше наружного
    if (this.innerRadius > this.outerRadius) {
      this.innerRadius = this.outerRadius;
    }

    // Мертвая зона (0-1)
    this.deadzone = options.deadzone !== undefined ? Math.max(0, Math.min(1, options.deadzone)) : 0.1;

    // Тип позиционирования
    this.type = options.type || 'static'; // 'static' | 'dynamic'

    // Позиция (для static)
    this.position = {
      x: options.position?.x ?? 80,
      y: options.position?.y ?? null // null = center
    };

    // Зона для dynamic (null = весь экран, 'left-half' | 'right-half')
    this.zone = options.zone || null;

    // Состояние джостика
    this._active = false;
    this._center = { x: 0, y: 0 }; // Центр джостика
    this._stick = { x: 0, y: 0 };  // Текущая позиция стика
    this._touchId = null;           // ID активного тача

    // PIXI объекты для рендеринга
    this._container = null;
    this._outerCircle = null;
    this._innerCircle = null;

    // Callback для обновления родительского контейнера
    this._onUpdate = null;

    console.log(`🕹️ VirtualJoystick создан: ${this.id}, type=${this.type}, outer=${this.outerRadius}, inner=${this.innerRadius}`);
  }

  /**
   * Инициализация PIXI Graphics
   */
  init(container) {
    this._container = container;

    // Создаем внешний круг (основание)
    this._outerCircle = new PIXI.Graphics();
    this._drawOuterCircle();

    // Создаем внутренний круг (стик)
    this._innerCircle = new PIXI.Graphics();
    this._drawInnerCircle();

    // Добавляем в контейнер
    container.addChild(this._outerCircle);
    container.addChild(this._innerCircle);

    // Изначально скрываем
    this.setVisible(false);

    return this;
  }

  /**
   * Нарисовать внешний круг
   */
  _drawOuterCircle() {
    this._outerCircle.clear();
    this._outerCircle.circle(0, 0, this.outerRadius);
    this._outerCircle.fill({
      color: 0x4fc3f7,
      alpha: 0.15
    });
    this._outerCircle.stroke({
      width: 2,
      color: 0x4fc3f7,
      alpha: 0.4
    });

    this._outerCircle.position.set(this._center.x, this._center.y);
  }

  /**
   * Нарисовать внутренний круг (стик)
   */
  _drawInnerCircle() {
    this._innerCircle.clear();
    this._innerCircle.circle(0, 0, this.innerRadius);
    this._innerCircle.fill({
      color: 0x4fc3f7,
      alpha: 0.6
    });
    this._innerCircle.stroke({
      width: 2,
      color: 0xffffff,
      alpha: 0.8
    });

    this._innerCircle.position.set(
      this._center.x + this._stick.x,
      this._center.y + this._stick.y
    );
  }

  /**
   * Установить видимость джостика
   */
  setVisible(visible) {
    if (this._outerCircle) {
      this._outerCircle.visible = visible;
      this._outerCircle.alpha = visible ? 1 : 0;
    }
    if (this._innerCircle) {
      this._innerCircle.visible = visible;
      this._innerCircle.alpha = visible ? 1 : 0;
    }
  }

  /**
   * Обработать начало тача
   */
  handleTouchStart(x, y, touchId) {
    console.log(`    🎮 ${this.id}.handleTouchStart(${x}, ${y}, ${touchId}), initialized=${!!this._container}`);
    if (this._active && this._touchId !== null) {
      console.log(`      ❌ Уже активен с touchId=${this._touchId}`);
      return;
    }

    if (this.type === 'dynamic') {
      // Для динамического - центр в месте тача
      this._center = { x, y };
    } else {
      // Для статического - используем заданную позицию
      this._center = this._getStaticPosition();
      console.log(`      📍 Статическая позиция: (${this._center.x}, ${this._center.y})`);
    }

    this._stick = { x: 0, y: 0 };
    this._active = true;
    this._touchId = touchId;

    console.log(`      🔵 outerCircle=${!!this._outerCircle}, innerCircle=${!!this._innerCircle}`);

    // Обновляем позицию внешнего круга
    if (this._outerCircle) {
      this._outerCircle.position.set(this._center.x, this._center.y);
    }
    this._updateInnerCircle();

    // Показываем джостик
    this.setVisible(true);
    console.log(`      ✅ Джостик показан!`);

    return true;
  }

  /**
   * Обработать движение тача
   */
  handleTouchMove(x, y, touchId) {
    if (!this._active || this._touchId !== touchId) return false;

    // Вычисляем смещение от центра
    const dx = x - this._center.x;
    const dy = y - this._center.y;

    // Расстояние от центра
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Максимальное отклонение (с учетом deadzone)
    const maxDistance = this.outerRadius - this.innerRadius;

    if (distance <= maxDistance) {
      // В пределах круга
      this._stick = { x: dx, y: dy };
    } else {
      // Ограничиваем по кругу
      const angle = Math.atan2(dy, dx);
      this._stick = {
        x: Math.cos(angle) * maxDistance,
        y: Math.sin(angle) * maxDistance
      };
    }

    this._updateInnerCircle();
    return true;
  }

  /**
   * Обработать конец тача
   */
  handleTouchEnd(touchId) {
    if (!this._active || this._touchId !== touchId) return false;

    // Возвращаем стик в центр
    this._stick = { x: 0, y: 0 };
    this._active = false;
    this._touchId = null;

    this._updateInnerCircle();

    // Скрываем для динамического (статический оставляем видимым)
    if (this.type === 'dynamic') {
      this.setVisible(false);
    }

    return true;
  }

  /**
   * Обновить позицию внутреннего круга
   */
  _updateInnerCircle() {
    if (this._innerCircle) {
      this._innerCircle.position.set(
        this._center.x + this._stick.x,
        this._center.y + this._stick.y
      );
    }

    // Уведомляем об изменении
    if (this._onUpdate) {
      this._onUpdate(this.getAxis());
    }
  }

  /**
   * Получить статическую позицию джостика
   */
  _getStaticPosition() {
    const container = this._container;
    if (!container) return { x: 0, y: 0 };

    const width = container.width || 0;
    const height = container.height || 0;

    let x = this.position.x;
    let y = this.position.y;

    // Обработка relative позиций
    if (typeof x === 'string') {
      if (x.startsWith('right-')) {
        const offset = parseInt(x.replace('right-', '')) || 0;
        x = width - offset;
      } else if (x === 'center') {
        x = width / 2;
      }
    }

    if (y === null || y === 'center') {
      y = height / 2;
    } else if (typeof y === 'string') {
      if (y.startsWith('center-')) {
        const offset = parseInt(y.replace('center-', '')) || 0;
        y = height / 2 - offset;
      } else if (y.startsWith('center+')) {
        const offset = parseInt(y.replace('center+', '')) || 0;
        y = height / 2 + offset;
      }
    }

    return { x, y };
  }

  /**
   * Получить осевые значения (-1 до 1)
   */
  getAxis() {
    if (!this._active) {
      return { x: 0, y: 0 };
    }

    const maxDistance = this.outerRadius - this.innerRadius;

    // Нормализуем от -1 до 1
    let x = this._stick.x / maxDistance;
    let y = this._stick.y / maxDistance;

    // Применяем deadzone
    const distance = Math.sqrt(x * x + y * y);
    if (distance < this.deadzone) {
      return { x: 0, y: 0 };
    }

    // Ресейклим после deadzone
    const scale = (distance - this.deadzone) / (1 - this.deadzone);
    x = (x / distance) * scale;
    y = (y / distance) * scale;

    // Ограничиваем от -1 до 1
    x = Math.max(-1, Math.min(1, x));
    y = Math.max(-1, Math.min(1, y));

    return { x, y };
  }

  /**
   * Проверить, находится ли точка в зоне джостика
   */
  isPointInZone(x, y, containerWidth, containerHeight) {
    if (this.zone === 'left-half') {
      return x < containerWidth / 2;
    } else if (this.zone === 'right-half') {
      return x >= containerWidth / 2;
    }
    return true; // весь экран
  }

  /**
   * Подписаться на изменения
   */
  onUpdate(callback) {
    this._onUpdate = callback;
  }

  /**
   * Уничтожить джостик
   */
  destroy() {
    if (this._outerCircle) {
      this._outerCircle.destroy();
      this._outerCircle = null;
    }
    if (this._innerCircle) {
      this._innerCircle.destroy();
      this._innerCircle = null;
    }
    this._container = null;
    this._onUpdate = null;
  }

  /**
   * Получить информацию о джостике
   */
  getInfo() {
    return {
      id: this.id,
      type: this.type,
      outerRadius: this.outerRadius,
      innerRadius: this.innerRadius,
      deadzone: this.deadzone,
      position: this.position,
      zone: this.zone,
      active: this._active,
      axis: this.getAxis()
    };
  }
}
