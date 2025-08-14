/**
 * 📷 Camera - Камера (viewport в канвасе)
 * 
 * Отображает часть мира в указанной области канваса
 */

import * as PIXI from 'pixi.js';

export class Camera {
  constructor(options = {}) {
    this.id = options.id || `camera_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // 📐 Размеры камеры
    this.width = options.width || 800;
    this.height = options.height || 600;
    
    // 📍 Позиция камеры В канвасе (где рисовать)
    this.x = options.x || 0;
    this.y = options.y || 0;
    
    // 🎯 Фокус камеры В мире (на что смотрим)
    this.focusX = options.focusX || 0;
    this.focusY = options.focusY || 0;
    
    // 🔗 Привязки
    this.world = options.world || null;
    this.canvas = options.canvas || null;
    
    // ⚙️ Параметры
    this.zoom = options.zoom || 1.0;
    this.priority = options.priority || 1; // Порядок отрисовки
    
    // 🎮 PIXI контейнеры
    this.container = null;
    this.mask = null;
    this.graphics = new Map(); // entityId -> PIXI.Graphics
    
    console.log(`📷 Camera создана: ID=${this.id}, размер=${this.width}×${this.height}, позиция в канвасе=(${this.x}, ${this.y}), фокус=(${this.focusX}, ${this.focusY}), zoom=${this.zoom}, priority=${this.priority}`);
  }
  
  /**
   * 🔗 Инициализация для канваса (вызывается Canvas.addCamera)
   */
  _initForCanvas(canvas) {
    if (!canvas.app) {
      throw new Error('Canvas должен быть запущен перед добавлением камеры');
    }
    
    // 📦 Создаем контейнер для этой камеры
    this.container = new PIXI.Container();
    canvas.app.stage.addChild(this.container);
    
    // ✂️ Создаем маску для ограничения области рендеринга
    this.mask = new PIXI.Graphics();
    this.mask.rect(this.x, this.y, this.width, this.height);
    this.mask.fill({ color: 0xFFFFFF });
    
    this.container.mask = this.mask;
    canvas.app.stage.addChild(this.mask);
    
    // 🔲 Создаем рамку камеры для визуализации границ
    this.border = new PIXI.Graphics();
    this._updateBorder();
    canvas.app.stage.addChild(this.border);
    
    console.log(`🔗 Camera инициализирована для Canvas: контейнер, маска и рамка созданы`);
  }
  
  /**
   * 🧹 Очистка при удалении из канваса
   */
  _cleanupFromCanvas() {
    if (this.container) {
      this.container.destroy({ children: true });
      this.container = null;
    }
    
    if (this.mask) {
      this.mask.destroy();
      this.mask = null;
    }
    
    if (this.border) {
      this.border.destroy();
      this.border = null;
    }
    
    this.graphics.clear();
    console.log(`🧹 Camera очищена: контейнер, маска и рамка удалены`);
  }
  
  /**
   * 🎯 Установить фокус камеры (координаты в мире)
   */
  setFocus(worldX, worldY) {
    this.focusX = worldX;
    this.focusY = worldY;
  }
  
  /**
   * 📍 Установить позицию камеры в канвасе
   */
  setPosition(canvasX, canvasY) {
    this.x = canvasX;
    this.y = canvasY;
    
    // 🔄 Обновляем маску
    if (this.mask) {
      this.mask.clear();
      this.mask.rect(this.x, this.y, this.width, this.height);
      this.mask.fill({ color: 0xFFFFFF });
    }
    
    // 🔄 Обновляем рамку
    if (this.border) {
      this._updateBorder();
    }
  }
  
  /**
   * 🔍 Установить зум
   */
  setZoom(zoomLevel) {
    this.zoom = Math.max(0.1, zoomLevel); // Минимальный зум 0.1
    
    // 🔄 Обновляем рамку (чтобы показать новый zoom в подписи)
    if (this.border) {
      this._updateBorder();
    }
  }
  
  /**
   * 🔲 Обновить рамку камеры
   */
  _updateBorder() {
    if (!this.border) return;
    
    this.border.clear();
    
    // 🎨 Определяем цвет рамки по priority
    let borderColor;
    switch (this.priority) {
      case 1: borderColor = 0x00FF00; break; // Зеленый для основной камеры
      case 2: borderColor = 0x0080FF; break; // Синий для мини-карты
      case 3: borderColor = 0xFF8000; break; // Оранжевый для детальной
      default: borderColor = 0xFFFFFF; break; // Белый по умолчанию
    }
    
    // 🔲 Рисуем рамку (толщина 2px)
    this.border.rect(this.x, this.y, this.width, this.height);
    this.border.stroke({ color: borderColor, width: 2 });
    
    // 📝 Добавляем подпись камеры в левый верхний угол
    const text = new PIXI.Text({
      text: `${this.id} (${this.zoom}x)`,
      style: {
        fontSize: 12,
        fill: borderColor,
        fontWeight: 'bold'
      }
    });
    
    text.x = this.x + 4;
    text.y = this.y + 4;
    this.border.addChild(text);
  }
  
  /**
   * 🌍➡️📱 Конвертация координат: мир → экран
   */
  worldToScreen(worldX, worldY) {
    // 📐 Учитываем фокус камеры, зум и позицию в канвасе
    const screenX = this.x + (worldX - this.focusX) * this.zoom + this.width / 2;
    const screenY = this.y + (worldY - this.focusY) * this.zoom + this.height / 2;
    
    return { x: screenX, y: screenY };
  }
  
  /**
   * 📱➡️🌍 Конвертация координат: экран → мир
   */
  screenToWorld(screenX, screenY) {
    const worldX = this.focusX + (screenX - this.x - this.width / 2) / this.zoom;
    const worldY = this.focusY + (screenY - this.y - this.height / 2) / this.zoom;
    
    return { x: worldX, y: worldY };
  }
  
  /**
   * 🎨 Рендеринг камеры (вызывается каждый кадр)
   */
  render() {
    if (!this.world || !this.container) return;
    
    // 🧹 Очищаем старые графические объекты
    this.container.removeChildren();
    
    // 🎨 Рендерим все сущности из мира
    const entities = this.world.getAllEntities();
    
    for (const entity of entities) {
      this._renderEntity(entity);
    }
  }
  
  /**
   * 🎨 Рендеринг одной сущности
   */
  _renderEntity(entity) {
    // 🌍➡️📱 Конвертируем координаты
    const screenPos = this.worldToScreen(entity.x, entity.y);
    
    // 📏 Проверяем, видна ли сущность в этой камере
    if (screenPos.x < this.x - 20 || screenPos.x > this.x + this.width + 20 ||
        screenPos.y < this.y - 20 || screenPos.y > this.y + this.height + 20) {
      return; // Не видна, пропускаем
    }
    
    // 🎨 Создаем графический объект для сущности
    const graphics = new PIXI.Graphics();
    
    // 🎯 Рисуем в зависимости от типа
    switch (entity.type) {
      case 'center':
        graphics.circle(0, 0, 8 * this.zoom);
        graphics.fill({ color: 0xFF0000 }); // Красный
        break;
        
      case 'corner':
        graphics.rect(-6 * this.zoom, -6 * this.zoom, 12 * this.zoom, 12 * this.zoom);
        graphics.fill({ color: 0x00FF00 }); // Зеленый
        break;
        
      case 'random':
        graphics.circle(0, 0, 6 * this.zoom);
        graphics.fill({ color: 0x0080FF }); // Синий
        break;
        
      default:
        graphics.circle(0, 0, 4 * this.zoom);
        graphics.fill({ color: 0xFFFFFF }); // Белый
        break;
    }
    
    // 📍 Устанавливаем позицию (относительно камеры)
    graphics.x = screenPos.x - this.x;
    graphics.y = screenPos.y - this.y;
    
    // ➕ Добавляем в контейнер камеры
    this.container.addChild(graphics);
  }
  
  /**
   * 📊 Информация о камере
   */
  getInfo() {
    return {
      id: this.id,
      width: this.width,
      height: this.height,
      position: { x: this.x, y: this.y },
      focus: { x: this.focusX, y: this.focusY },
      zoom: this.zoom,
      priority: this.priority,
      hasWorld: !!this.world,
      hasCanvas: !!this.canvas,
      isInitialized: !!this.container
    };
  }
}
