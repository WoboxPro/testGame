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
    
    // 🎯 Состояние выбора для управления
    this.isSelected = false;
    
    // 📹 Система слежения за сущностями
    this.followedEntity = null;      // Сущность за которой следим
    this.followOffset = { x: 0, y: 0 }; // Смещение от центра сущности
    this.respectWorldBounds = options.respectWorldBounds || false; // Учитывать границы мира при слежении (по умолчанию выключено)
    
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

    // 🔁 Кэш отображения сущностей (для избежания аллокаций каждый кадр)
    this._entityDisplayObjects = new Map(); // entityId -> PIXI.Container
    
    // Camera создана
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
    
    // 📍 Позиция контейнера в канвасе
    this.container.x = this.x;
    this.container.y = this.y;
    
    canvas.app.stage.addChild(this.container);
    
    // ✂️ Маска ограничивает область рендеринга (на stage, чтобы не масштабировалась)
    this.mask = new PIXI.Graphics();
    this.mask.rect(0, 0, this.width, this.height);
    this.mask.fill({ color: 0xFFFFFF });
    this.mask.x = this.x;
    this.mask.y = this.y;
    this.container.mask = this.mask;
    canvas.app.stage.addChild(this.mask);

    // 🎨 Создаем фон мира (Graphics прямоугольник с цветом мира)
    this.worldBackground = new PIXI.Graphics();
    this._drawWorldBackground();
    this.container.addChild(this.worldBackground);
    
    // 🌍 Слой мира, который масштабируется зумом
    this.worldLayer = new PIXI.Container();
    this.worldLayer.x = 0 + this.width / 2;
    this.worldLayer.y = 0 + this.height / 2;
    this.container.addChild(this.worldLayer);
    
    // 🔲 Создаем рамку камеры для визуализации границ
    this.border = new PIXI.Graphics();
    this.borderLabel = null; // Один Text для подписи
    this._updateBorder();
    canvas.app.stage.addChild(this.border);
    
    // Camera инициализирована
  }
  
  /**
   * 🧹 Очистка при удалении из канваса
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
    
    this.graphics.clear();
    // 🧹 Очищаем кэш отображения
    this._entityDisplayObjects.forEach(obj => obj.destroy({ children: true }));
    this._entityDisplayObjects.clear();
    // Camera очищена
  }
  
  /**
   * 🎯 Установить фокус камеры (координаты в мире)
   */
  setFocus(worldX, worldY) {
    this.focusX = worldX;
    this.focusY = worldY;
  }
  
  /**
   * 🔍 Установить зум камеры
   */
  setZoom(newZoom) {
    this.zoom = Math.max(0.1, Math.min(10.0, newZoom));
    if (this.border) {
      this._updateBorder();
    }
  }
  
  /**
   * 📹 Следить за сущностью
   */
  followEntity(entity, offsetX = 0, offsetY = 0) {
    if (!entity) {
      console.warn('📹 Попытка установить слежение за несуществующей сущностью');
      return false;
    }
    
    // 🎯 Останавливаем предыдущее слежение
    if (this.followedEntity) {
      this.stopFollowing();
    }
    
    this.followedEntity = entity;
    this.followOffset.x = offsetX;
    this.followOffset.y = offsetY;
    
    // 🎯 Сразу центрируем камеру на сущности
    this._updateFollowing();
    
    //console.log(`📹 Камера "${this.id}" теперь следит за сущностью: ${entity.name} (${entity.id})`);
    return true;
  }
  
  /**
   * 🛑 Прекратить слежение
   */
  stopFollowing() {
    if (this.followedEntity) {
      //console.log(`🛑 Камера "${this.id}" прекратила слежение за: ${this.followedEntity.name}`);
      this.followedEntity = null;
      this.followOffset.x = 0;
      this.followOffset.y = 0;
      return true;
    }
    return false;
  }
  
  /**
   * 📹 Установить смещение слежения
   */
  setFollowOffset(offsetX, offsetY) {
    this.followOffset.x = offsetX;
    this.followOffset.y = offsetY;
    
    if (this.followedEntity) {
      this._updateFollowing();
      //console.log(`📹 Смещение слежения обновлено: (${offsetX}, ${offsetY})`);
    }
  }
  
  /**
   * 🔍 Получить сущность за которой следим
   */
  getFollowedEntity() {
    return this.followedEntity;
  }
  
  /**
   * ❓ Проверить следим ли за сущностью
   */
  isFollowing() {
    return this.followedEntity !== null;
  }
  
  /**
   * 🌍 Включить/выключить учет границ мира
   */
  setRespectWorldBounds(enabled) {
    this.respectWorldBounds = enabled;
    //console.log(`🌍 Камера "${this.id}": учет границ мира ${enabled ? 'включен' : 'выключен'}`);
  }
  
  /**
   * 🌍 Получить статус учета границ мира
   */
  getRespectWorldBounds() {
    return this.respectWorldBounds;
  }
  
  /**
   * 🎯 Обновить позицию камеры для слежения
   */
  _updateFollowing() {
    if (!this.followedEntity) return;
    
    // 🎯 Вычисляем желаемую позицию фокуса
    let targetX = this.followedEntity.x + this.followOffset.x;
    let targetY = this.followedEntity.y + this.followOffset.y;
    
    // 🌍 Ограничиваем фокус границами мира если включено
    if (this.respectWorldBounds && this.world && this.world.bounds) {
      const clampedFocus = this._clampFocusToWorldBounds(targetX, targetY);
      targetX = clampedFocus.x;
      targetY = clampedFocus.y;
    }
    
    this.setFocus(targetX, targetY);
  }
  
  /**
   * 🌍 Ограничить фокус камеры границами мира
   */
  _clampFocusToWorldBounds(targetFocusX, targetFocusY) {
    if (!this.world || !this.world.bounds) {
      return { x: targetFocusX, y: targetFocusY };
    }
    
    // 📐 Вычисляем половину видимой области камеры
    const halfVisibleWidth = (this.width / 2) / this.zoom;
    const halfVisibleHeight = (this.height / 2) / this.zoom;
    
    // 🌍 Границы мира
    const worldBounds = this.world.bounds;
    
    // 📏 Вычисляем минимальные и максимальные позиции фокуса
    const minFocusX = worldBounds.left + halfVisibleWidth;
    const maxFocusX = worldBounds.right - halfVisibleWidth;
    const minFocusY = worldBounds.top + halfVisibleHeight;
    const maxFocusY = worldBounds.bottom - halfVisibleHeight;
    
    // 🎯 Ограничиваем фокус
    const clampedX = Math.max(minFocusX, Math.min(maxFocusX, targetFocusX));
    const clampedY = Math.max(minFocusY, Math.min(maxFocusY, targetFocusY));
    
    return { x: clampedX, y: clampedY };
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
  // ВТОРОЙ setZoom был дубликатом — удален, логика объединена выше
  
  /**
   * 🎨 Нарисовать фон мира в камере
   */
  _drawWorldBackground() {
    if (!this.worldBackground || !this.world) return;
    
    this.worldBackground.clear();
    
    // Получаем цвет фона мира
    let backgroundColor = 0x2c3e50; // Дефолт 
    if (this.world.backgroundColor) {
      if (typeof this.world.backgroundColor === 'string') {
        // Конвертируем '#ff0000' → 0xff0000
        backgroundColor = parseInt(this.world.backgroundColor.replace('#', ''), 16);
      } else {
        backgroundColor = this.world.backgroundColor;
      }
    }
    
    // Рисуем прямоугольник размером с камеру
    this.worldBackground.rect(0, 0, this.width, this.height);
    this.worldBackground.fill(backgroundColor);
    
    //console.log(`🎨 Камера "${this.id}": фон мира нарисован 0x${backgroundColor.toString(16).toUpperCase()}`);
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
    
    // 🧹 Очищаем графику рамки
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
    
    // 📝 Обновляем/создаем подпись камеры один раз
    if (!this.borderLabel) {
      this.borderLabel = new PIXI.Text({
        text: '',
        style: {
          fontSize: 12,
          fill: this.style.border.color,
          fontWeight: 'bold'
        }
      });
      this.border.addChild(this.borderLabel);
    }
    this.borderLabel.style.fill = this.style.border.color;
    this.borderLabel.text = `${this.id} (${this.zoom.toFixed(2)}x)`;
    this.borderLabel.x = this.x + 4;
    this.borderLabel.y = this.y + 4;
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
    
    // 📹 Автоматически обновляем позицию если следим за сущностью
    if (this.followedEntity) {
      this._updateFollowing();
    }
    
    // Обновляем масштаб слоя мира
    if (this.worldLayer) {
      this.worldLayer.scale.set(this.zoom);
    }
    
    // 🎨 Рендерим отфильтрованные сущности из мира
    const entities = this.world.getAllEntities();
    const aliveIds = new Set();
    
    for (const entity of entities) {
      // 🎛️ Проверяем фильтр перед рендерингом
      if (this._shouldRenderEntity(entity)) {
        this._renderEntity(entity, aliveIds);
      }
    }

    // 🧹 Удаляем объекты, которых больше нет в мире/в фильтре
    for (const [entityId, displayObject] of this._entityDisplayObjects) {
      if (!aliveIds.has(entityId)) {
        if (this.worldLayer) this.worldLayer.removeChild(displayObject);
        displayObject.destroy({ children: true });
        this._entityDisplayObjects.delete(entityId);
      }
    }
  }
  
  /**
   * 🎨 Рендеринг одной сущности
   */
  _renderEntity(entity, aliveIds) {
    // 🌍➡️📱 Конвертируем координаты мира в координаты камеры
    const relativeX = (entity.x - this.focusX);
    const relativeY = (entity.y - this.focusY);
    
    // 📍 Позиция в камере (от центра камеры)
    const cameraX = relativeX;
    const cameraY = relativeY;
    
    // DEBUG: Логируем позиции для центрального объекта
    // Центр объект отладка убрана
    
    // 📏 ВРЕМЕННО ОТКЛЮЧЕН: Проверяем, видна ли сущность в области камеры
    const margin = 200; // Увеличенный запас для отладки
    const isVisible = !(cameraX < -margin || cameraX > this.width + margin ||
        cameraY < -margin || cameraY > this.height + margin);
    
    // DEBUG: Показываем все объекты для диагностики
    // if (!isVisible) {
    //   Объект скрыт (отладка убрана)
    //   return; // Не видна, пропускаем
    // }
    
    // ⚡ Переиспользуем или создаем контейнер сущности
    let entityContainer = this._entityDisplayObjects.get(entity.id);
    if (!entityContainer) {
      entityContainer = new PIXI.Container();
      entity.render(entityContainer);
      this._entityDisplayObjects.set(entity.id, entityContainer);
      if (this.worldLayer) this.worldLayer.addChild(entityContainer);
    }
    
    // Обновляем позицию
    entityContainer.x = cameraX;
    entityContainer.y = cameraY;
    
    // Отмечаем как актуальный
    if (aliveIds) aliveIds.add(entity.id);
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
      isInitialized: !!this.container,
      // 📹 Информация о слежении
      isFollowing: this.isFollowing(),
      followedEntityId: this.followedEntity?.id || null,
      followedEntityName: this.followedEntity?.name || null,
      followOffset: { ...this.followOffset },
      respectWorldBounds: this.respectWorldBounds
    };
  }
}
