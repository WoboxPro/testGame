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
    
    // 🎛️ Фильтрация объектов
    this.visibleTypes = options.visibleTypes || 'all'; // 'all' или массив типов ['building', 'unit']
    this.hiddenTypes = options.hiddenTypes || []; // Массив скрытых типов ['bullet', 'effect']
    
    // 🎨 Стиль камеры
    this.style = {
      border: {
        enabled: options.style?.border?.enabled !== false, // По умолчанию включены
        width: options.style?.border?.width || 2,
        color: options.style?.border?.color || 0x00FF00,   // По умолчанию зеленый
        ...options.style?.border
      },
      ...options.style
    };
    
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
    
    // 📍 ИСПРАВЛЕНИЕ: Позиционируем контейнер в нужном месте канваса
    this.container.x = this.x;
    this.container.y = this.y;
    
    canvas.app.stage.addChild(this.container);
    
    // ✂️ Создаем маску для ограничения области рендеринга  
    this.mask = new PIXI.Graphics();
    this.mask.rect(0, 0, this.width, this.height); // ← Маска теперь относительно контейнера!
    this.mask.fill({ color: 0xFFFFFF });
    
    // 📍 ИСПРАВЛЕНИЕ: Маска позиционируется вместе с контейнером
    this.mask.x = this.x;
    this.mask.y = this.y;
    
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
    
    // 🔄 Обновляем позицию контейнера
    if (this.container) {
      this.container.x = this.x;
      this.container.y = this.y;
    }
    
    // 🔄 Обновляем маску
    if (this.mask) {
      this.mask.clear();
      this.mask.rect(0, 0, this.width, this.height); // Относительно контейнера
      this.mask.fill({ color: 0xFFFFFF });
      this.mask.x = this.x;
      this.mask.y = this.y;
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
   * 🎛️ Проверить должен ли объект отображаться в этой камере
   */
  _shouldRenderEntity(entity) {
    // 🔍 Проверяем скрытые типы
    if (this.hiddenTypes.includes(entity.type)) {
      return false;
    }
    
    // 🔍 Проверяем видимые типы
    if (this.visibleTypes !== 'all') {
      if (!this.visibleTypes.includes(entity.type)) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * 🔲 Обновить рамку камеры
   */
  _updateBorder() {
    if (!this.border) return;
    
    this.border.clear();
    
    // 🎨 Проверяем включена ли рамка
    if (!this.style.border.enabled) {
      return; // Не рисуем рамку если отключена
    }
    
    // 🔲 Рисуем рамку с настройками из стиля
    this.border.rect(this.x, this.y, this.width, this.height);
    this.border.stroke({ 
      color: this.style.border.color, 
      width: this.style.border.width 
    });
    
    // 📝 Добавляем подпись камеры в левый верхний угол
    const text = new PIXI.Text({
      text: `${this.id} (${this.zoom}x)`,
      style: {
        fontSize: 12,
        fill: this.style.border.color,
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
    
    // 🎨 Рендерим отфильтрованные сущности из мира
    const entities = this.world.getAllEntities();
    
    for (const entity of entities) {
      // 🎛️ Проверяем фильтр перед рендерингом
      if (this._shouldRenderEntity(entity)) {
        this._renderEntity(entity);
      }
    }
  }
  
  /**
   * 🎨 Рендеринг одной сущности
   */
  _renderEntity(entity) {
    // 🌍➡️📱 Конвертируем координаты мира в координаты камеры
    const relativeX = (entity.x - this.focusX) * this.zoom;
    const relativeY = (entity.y - this.focusY) * this.zoom;
    
    // 📍 Позиция в камере (от центра камеры)
    const cameraX = relativeX + this.width / 2;
    const cameraY = relativeY + this.height / 2;
    
    // 🕵️ ОТЛАДКА: логируем для всех объектов в detail_camera
    if (this.id === 'detail_camera') {
      console.log(`🎯 ${this.id}: entity(${entity.x},${entity.y}) type=${entity.type} → focus(${this.focusX},${this.focusY}) → relative(${relativeX.toFixed(1)},${relativeY.toFixed(1)}) → camera(${cameraX.toFixed(1)},${cameraY.toFixed(1)})`);
    }
    
    // 📏 Проверяем, видна ли сущность в области камеры
    const margin = 200; // Увеличенный запас для отладки
    const isVisible = !(cameraX < -margin || cameraX > this.width + margin ||
        cameraY < -margin || cameraY > this.height + margin);
    
    // 🕵️ ОТЛАДКА: логируем отсечение объектов в detail_camera
    if (this.id === 'detail_camera') {
      console.log(`   → visible=${isVisible} (bounds: ${-margin} < ${cameraX.toFixed(1)} < ${this.width + margin}, ${-margin} < ${cameraY.toFixed(1)} < ${this.height + margin})`);
    }
    
    if (!isVisible) {
      return; // Не видна, пропускаем
    }
    
    // 🎨 Создаем графический объект для сущности
    const graphics = new PIXI.Graphics();
    
    // 🎯 Рисуем в зависимости от типа
    switch (entity.type) {
      // 🏠 ЗДАНИЯ - большие квадраты
      case 'building':
        graphics.rect(-10 * this.zoom, -10 * this.zoom, 20 * this.zoom, 20 * this.zoom);
        graphics.fill({ color: 0x8B4513 }); // Коричневый
        break;
        
      // 👥 ЮНИТЫ - средние круги  
      case 'unit':
        graphics.circle(0, 0, 7 * this.zoom);
        graphics.fill({ color: 0x00FF00 }); // Зеленый
        break;
        
      // 💎 РЕСУРСЫ - ромбы
      case 'resource':
        const size = 6 * this.zoom;
        graphics.poly([
          -size, 0,    // лево
          0, -size,    // верх
          size, 0,     // право
          0, size      // низ
        ]);
        graphics.fill({ color: 0xFFD700 }); // Золотой
        break;
        
      // 🔫 ПУЛИ - маленькие красные точки
      case 'bullet':
        graphics.circle(0, 0, 2 * this.zoom);
        graphics.fill({ color: 0xFF4500 }); // Оранжево-красный
        break;
        
      // ✨ ЭФФЕКТЫ - мерцающие звезды
      case 'effect':
        const star = 5 * this.zoom;
        graphics.star(0, 0, 6, star, star * 0.5);
        graphics.fill({ color: 0xFF00FF }); // Фиолетовый
        break;
        
      // 🌟 ЧАСТИЦЫ - крошечные точки
      case 'particle':
        graphics.circle(0, 0, 1 * this.zoom);
        graphics.fill({ color: 0xFFFFFF }); // Белый
        break;
        
      // 🔴 СТАРЫЕ ТИПЫ для совместимости
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
        graphics.fill({ color: 0xAAAAAA }); // Серый
        break;
    }
    
    // 📍 Устанавливаем позицию В КОНТЕЙНЕРЕ КАМЕРЫ (контейнер уже сдвинут в нужное место канваса)
    graphics.x = cameraX;
    graphics.y = cameraY;
    
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
