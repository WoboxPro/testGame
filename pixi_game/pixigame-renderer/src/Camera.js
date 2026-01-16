/**
 * 📷 Camera - Viewport into world
 * 
 * Камера прикрепляется к canvas и миру. Определяет:
 * - Где на canvas расположена (absolute или relative)
 * - Где в мире смотрит (фокус)
 * - Какой зум
 * 
 * Positioning modes:
 * - absolute: Позиция в пикселях от верхнего левого угла canvas
 * - relative: Позиция в процентах от размера canvas
 * 
 * Anchor points (где фокус на камере):
 * - center: Фокус в центре камеры (по умолчанию)
 * - topleft: Фокус в левом верхнем углу
 * - topright: Фокус в правом верхнем углу
 * - bottomleft: Фокус в левом нижнем углу
 * - bottomright: Фокус в правом нижнем углу
 */

import * as PIXI from 'pixi.js';

export class Camera {
  constructor(options = {}) {
    this.id = options.id || `camera_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // 📐 Размеры камеры на canvas
    this.width = options.width || 400;
    this.height = options.height || 300;
    
    // 📍 Позиция камеры НА canvas
    this.positionMode = options.positionMode || 'absolute'; // 'absolute' | 'relative'
    this.x = options.x || 0; // Для absolute: пиксели, для relative: проценты
    this.y = options.y || 0;
    
    // 🎯 Фокус камеры В мире
    this.anchor = options.anchor || 'center'; // 'center' | 'topleft' | 'topright' | 'bottomleft' | 'bottomright'
    this.focusX = options.focusX || 0;
    this.focusY = options.focusY || 0;
    
    // 🔗 Привязки
    this.world = options.world || null; // Ссылка на World из pixigame
    this.canvas = options.canvas || null; // Ссылка на Canvas из pixigame-renderer
    
    // 🔍 Зум
    this.zoom = options.zoom || 1.0;
    this.maxZoom = options.maxZoom || 5.0;
    this.minZoom = options.minZoom || 0.1;
    
    // 🎛️ Приоритет рендеринга (нижний = сверху)
    this.priority = options.priority || 0;
    
    // 🎮 PIXI контейнеры
    this.container = null; // Контейнер камеры на stage
    this.worldLayer = null; // Слой мира (внутри container)
    this.uiLayer = null; // UI слой (поверх мира, внутри container)
    this.mask = null; // Маска (обрезка до размеров камеры)
    this.border = null; // Рамка камеры (визуализация)
    this.borderText = null; // Текст на рамке камеры
    
    // 📦 Кэш отображения сущностей
    this._entityDisplayObjects = new Map(); // entityId -> PIXI.Container
    
    console.log(`📷 Камера создана: ${this.id}, anchor=${this.anchor}, mode=${this.positionMode}`);
  }
  
  /**
   * 🔗 Инициализация для canvas (вызывается Canvas.addCamera)
   */
  _initForCanvas(canvas) {
    if (!canvas.app) {
      throw new Error('Canvas должен быть запущен перед добавлением камеры');
    }
    
    // Создаем контейнер для этой камеры
    this.container = new PIXI.Container();
    this.container.sortableChildren = true;
    
    // Устанавливаем позицию контейнера в зависимости от mode
    if (this.positionMode === 'absolute') {
      this.container.x = this.x;
      this.container.y = this.y;
    } else {
      // Relative mode - конвертируем проценты в пиксели
      this.container.x = (this.x / 100) * canvas.width;
      this.container.y = (this.y / 100) * canvas.height;
    }
    
    // Создаем маску (обрезка до размеров камеры)
    this.mask = new PIXI.Graphics();
    this.mask.rect(0, 0, this.width, this.height);
    this.mask.fill({ color: 0xFFFFFF });
    this.container.mask = this.mask;
    canvas.app.stage.addChild(this.mask);
    
    // Создаем слой мира (внутри container)
    this.worldLayer = new PIXI.Container();
    this.worldLayer.zIndex = 1;
    this.container.addChild(this.worldLayer);
    
    // Создаем UI слой (поверх мира)
    this.uiLayer = new PIXI.Container();
    this.uiLayer.zIndex = 2;
    this.container.addChild(this.uiLayer);
    
    // Добавляем контейнер на stage
    canvas.app.stage.addChild(this.container);
    
    // Создаем рамку для визуализации
    this._createBorder();
    canvas.app.stage.addChild(this.border);
    canvas.app.stage.addChild(this.borderText);
    
    // Обновляем позицию мира
    this._updateWorldPosition();
  }
  
  /**
   * 🔲 Создать рамку для визуализации
   */
  _createBorder() {
    this.border = new PIXI.Graphics();
    this.borderText = new PIXI.Text({
      text: `📷 ${this.id} (${this.zoom.toFixed(1)}x) ${this.anchor}`,
      style: {
        fontFamily: 'Arial',
        fontSize: 10,
        fill: 0x00FF00
      }
    });
    this._updateBorder();
  }
  
  /**
   * 🔲 Обновить рамку
   */
  _updateBorder() {
    if (!this.border || !this.borderText || !this.canvas) return;
    
    this.border.clear();
    
    let canvasX, canvasY;
    
    if (this.positionMode === 'absolute') {
      canvasX = this.x;
      canvasY = this.y;
      this.border.rect(this.x, this.y, this.width, this.height);
    } else {
      // Relative mode
      canvasX = (this.x / 100) * this.canvas.width;
      canvasY = (this.y / 100) * this.canvas.height;
      this.border.rect(canvasX, canvasY, this.width, this.height);
    }
    
    this.border.stroke({ 
      color: 0x00FF00, 
      width: 2
    });
    
    // Обновляем текст
    this.borderText.text = `📷 ${this.id} (${this.zoom.toFixed(1)}x) ${this.anchor}`;
    this.borderText.x = canvasX + 4;
    this.borderText.y = canvasY + 4;
  }
  
  /**
   * 📷 Установить фокус камеры (координаты в мире)
   */
  setFocus(worldX, worldY) {
    this.focusX = worldX;
    this.focusY = worldY;
    this._updateWorldPosition();
  }
  
  /**
   * 🔍 Установить зум
   */
  setZoom(newZoom) {
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, Number(newZoom) || 1.0));
    this._updateWorldPosition();
    this._updateBorder();
  }
  
  /**
   * 📍 Установить позицию камеры на canvas (absolute)
   */
  setAbsolutePosition(x, y) {
    this.positionMode = 'absolute';
    this.x = x;
    this.y = y;
    if (this.container) {
      this.container.x = x;
      this.container.y = y;
    }
    this._updateBorder();
  }
  
  /**
   * 📍 Установить позицию камеры на canvas (relative)
   */
  setRelativePosition(xPercent, yPercent) {
    this.positionMode = 'relative';
    this.x = xPercent;
    this.y = yPercent;
    if (this.container) {
      this.container.x = (xPercent / 100) * this.canvas.width;
      this.container.y = (yPercent / 100) * this.canvas.height;
    }
    this._updateBorder();
  }
  
  /**
   * 🔄 Обновить позицию мира в камере
   */
  _updateWorldPosition() {
    if (!this.worldLayer) {
      console.warn('Camera._updateWorldPosition: worldLayer is null');
      return;
    }
    
    if (!this.worldLayer.scale) {
      console.warn('Camera._updateWorldPosition: worldLayer.scale is null');
      return;
    }
    
    // Рассчитываем сдвиг мира в зависимости от anchor
    let offsetX = 0;
    let offsetY = 0;
    
    switch (this.anchor) {
      case 'center':
        offsetX = this.width / 2;
        offsetY = this.height / 2;
        break;
      case 'topleft':
        offsetX = 0;
        offsetY = 0;
        break;
      case 'topright':
        offsetX = this.width;
        offsetY = 0;
        break;
      case 'bottomleft':
        offsetX = 0;
        offsetY = this.height;
        break;
      case 'bottomright':
        offsetX = this.width;
        offsetY = this.height;
        break;
    }
    
    const newWorldX = offsetX - (this.focusX * this.zoom);
    const newWorldY = offsetY - (this.focusY * this.zoom);
    
    // Устанавливаем позицию и зум мира
    this.worldLayer.x = newWorldX;
    this.worldLayer.y = newWorldY;
    
    // Применяем зум
    this.worldLayer.scale.set(this.zoom);
  }
  
  /**
   * 🌍➡️📱 Конвертация координат: мир → экран (canvas)
   */
  worldToScreen(worldX, worldY) {
    const screenX = this.focusX * this.zoom;
    const screenY = this.focusY * this.zoom;
    
    let anchorX = 0;
    let anchorY = 0;
    
    switch (this.anchor) {
      case 'center':
        anchorX = this.width / 2;
        anchorY = this.height / 2;
        break;
      case 'topleft':
        anchorX = 0;
        anchorY = 0;
        break;
      case 'topright':
        anchorX = this.width;
        anchorY = 0;
        break;
      case 'bottomleft':
        anchorX = 0;
        anchorY = this.height;
        break;
      case 'bottomright':
        anchorX = this.width;
        anchorY = this.height;
        break;
    }
    
    let canvasX = anchorX - screenX;
    let canvasY = anchorY - screenY;
    
    if (this.positionMode === 'absolute') {
      canvasX += this.x;
      canvasY += this.y;
    } else {
      canvasX += (this.x / 100) * this.canvas.width;
      canvasY += (this.y / 100) * this.canvas.height;
    }
    
    return { x: canvasX, y: canvasY };
  }
  
  /**
   * 📱➡️🌍 Конвертация координат: экран (canvas) → мир
   */
  screenToWorld(screenX, screenY) {
    // Корректируем позицию камеры на canvas
    let canvasX = screenX;
    let canvasY = screenY;
    
    if (this.positionMode === 'absolute') {
      canvasX -= this.x;
      canvasY -= this.y;
    } else {
      canvasX -= (this.x / 100) * this.canvas.width;
      canvasY -= (this.y / 100) * this.canvas.height;
    }
    
    // Корректируем anchor
    let anchorX = 0;
    let anchorY = 0;
    
    switch (this.anchor) {
      case 'center':
        anchorX = this.width / 2;
        anchorY = this.height / 2;
        break;
      case 'topleft':
        anchorX = 0;
        anchorY = 0;
        break;
      case 'topright':
        anchorX = this.width;
        anchorY = 0;
        break;
      case 'bottomleft':
        anchorX = 0;
        anchorY = this.height;
        break;
      case 'bottomright':
        anchorX = this.width;
        anchorY = this.height;
        break;
    }
    
    const worldX = (anchorX - canvasX) / this.zoom;
    const worldY = (anchorY - canvasY) / this.zoom;
    
    return { x: worldX, y: worldY };
  }
  
  /**
   * 🎨 Рендеринг камеры (пока пустой, без world)
   */
  render() {
    if (!this.world || !this.container) return;
    
    // TODO: Рендерить сущности из World
    // Пока просто обновляем позицию мира
    this._updateWorldPosition();
  }
  
  /**
   * 🧹 Очистка при удалении из canvas
   */
  _cleanupFromCanvas() {
    if (this.worldLayer) {
      this.worldLayer.destroy({ children: true });
      this.worldLayer = null;
    }
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
    if (this.borderText) {
      this.borderText.destroy();
      this.borderText = null;
    }
    
    // Очищаем кэш
    this._entityDisplayObjects.forEach(obj => obj.destroy({ children: true }));
    this._entityDisplayObjects.clear();
    
    console.log(`📷 Камера ${this.id} очищена`);
  }
  
  /**
   * 📊 Получить информацию о камере
   */
  getInfo() {
    return {
      id: this.id,
      width: this.width,
      height: this.height,
      positionMode: this.positionMode,
      x: this.x,
      y: this.y,
      anchor: this.anchor,
      focusX: this.focusX,
      focusY: this.focusY,
      zoom: this.zoom,
      priority: this.priority
    };
  }
}
