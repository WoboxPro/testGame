/**
 * 🖼️ Canvas - Холст для отрисовки
 * 
 * PIXI приложение с поддержкой множественных камер
 */

import * as PIXI from 'pixi.js';

export class Canvas {
  constructor(options = {}) {
    this.id = options.id || `canvas_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    this.width = options.width || 800;
    this.height = options.height || 600;
    this.backgroundColor = options.backgroundColor || '#333333'; // Цвет незанятых областей
    this.containerId = options.containerId || null; // 🎯 ID DOM элемента
    
    // 🎮 PIXI приложение
    this.app = null;
    this.isStarted = false;
    
    // 📷 Камеры привязанные к этому канвасу
    this.cameras = new Map(); // id -> Camera
    
    console.log(`🖼️ Canvas создан: ${this.width}×${this.height}, фон=${this.backgroundColor}, containerId=${this.containerId}`);
  }
  
  /**
   * 🚀 Запустить PIXI приложение
   */
  async start(domContainer = null) {
    if (this.isStarted) {
      console.warn('⚠️ Canvas уже запущен');
      return;
    }
    
    try {
      // 🎮 Создаем PIXI приложение
      this.app = new PIXI.Application();
      await this.app.init({
        width: this.width,
        height: this.height,
        backgroundColor: this.backgroundColor,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true
      });
      
      // 📱 Определяем куда добавлять канвас
      let targetContainer = domContainer;
      
      if (!targetContainer && this.containerId) {
        // 🎯 Ищем по ID если контейнер не передан
        targetContainer = document.getElementById(this.containerId);
        if (!targetContainer) {
          throw new Error(`DOM элемент с ID '${this.containerId}' не найден`);
        }
      }
      
      if (!targetContainer) {
        throw new Error('Не указан DOM контейнер для канваса');
      }
      
      // 📱 Добавляем в DOM
      targetContainer.appendChild(this.app.canvas);
      
      // 🖱️ Настраиваем события клика
      this._setupClickEvents();
      
      this.isStarted = true;
      console.log(`✅ Canvas запущен в DOM элемент: ${this.containerId || 'переданный контейнер'}, размер: ${this.width}×${this.height}`);
      
    } catch (error) {
      console.error('❌ Ошибка запуска Canvas:', error);
      throw error;
    }
  }
  
  /**
   * 📷 Добавить камеру к канвасу
   */
  addCamera(camera) {
    if (!camera.id) {
      throw new Error('Camera должна иметь ID');
    }
    
    this.cameras.set(camera.id, camera);
    console.log(`📷 Camera добавлена к Canvas: ID=${camera.id}`);
    
    // 🔄 Инициализируем камеру для этого канваса
    camera._initForCanvas(this);
  }
  
  /**
   * 🗑️ Удалить камеру из канваса
   */
  removeCamera(cameraId) {
    const camera = this.cameras.get(cameraId);
    if (camera) {
      camera._cleanupFromCanvas();
      this.cameras.delete(cameraId);
      console.log(`🗑️ Camera удалена из Canvas: ID=${cameraId}`);
      return true;
    }
    return false;
  }
  
  /**
   * 🎨 Рендерить все камеры (вызывается каждый кадр)
   */
  render() {
    if (!this.app || !this.isStarted) return;
    
    // 📷 Рендерим камеры по порядку priority
    const sortedCameras = Array.from(this.cameras.values())
      .sort((a, b) => a.priority - b.priority);
    
    for (const camera of sortedCameras) {
      camera.render();
    }
  }
  
  /**
   * 🛑 Остановить и очистить
   */
  destroy() {
    if (this.app) {
      this.app.destroy(true, true);
      this.app = null;
    }
    
    this.cameras.clear();
    this.isStarted = false;
    console.log('🛑 Canvas уничтожен');
  }
  
  /**
   * 🖱️ Настройка событий клика
   */
  _setupClickEvents() {
    if (!this.app.canvas) return;
    
    // 🖱️ Добавляем обработчик клика на канвас
    this.app.canvas.addEventListener('click', (event) => {
      this._handleCanvasClick(event);
    });
    
    // 📱 Делаем канвас интерактивным
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;
    
    console.log('🖱️ События клика настроены для Canvas');
  }
  
  /**
   * 🎯 Обработка клика по канвасу
   */
  _handleCanvasClick(event) {
    // 📍 Получаем координаты клика на канвасе
    const rect = this.app.canvas.getBoundingClientRect();
    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;
    
    console.log(`🖱️ Клик по канвасу: (${canvasX.toFixed(1)}, ${canvasY.toFixed(1)})`);
    
    // 🔍 Проверяем все камеры этого канваса
    for (const [cameraId, camera] of this.cameras) {
      if (this._isClickInCamera(canvasX, canvasY, camera)) {
        // 🌍 Преобразуем координаты канваса в координаты мира через камеру
        const worldCoords = camera.screenToWorld(canvasX, canvasY);
        
        console.log(`🎯 Клик в камере ${camera.id}:`);
        console.log(`   Канвас: (${canvasX.toFixed(1)}, ${canvasY.toFixed(1)})`);
        console.log(`   Мир: (${worldCoords.x.toFixed(1)}, ${worldCoords.y.toFixed(1)}) zoom=${camera.zoom}x`);
        
        // 🎪 Вызываем событие для этой камеры
        this._emitCameraClick(camera, worldCoords, { canvasX, canvasY });
      }
    }
  }
  
  /**
   * 🎯 Проверить попадает ли клик в область камеры
   */
  _isClickInCamera(canvasX, canvasY, camera) {
    return canvasX >= camera.x && 
           canvasX <= camera.x + camera.width &&
           canvasY >= camera.y && 
           canvasY <= camera.y + camera.height;
  }
  
  /**
   * 🎪 Генерация события клика по камере
   */
  _emitCameraClick(camera, worldCoords, canvasCoords) {
    // 📢 Можно добавить event emitter или callback
    if (camera.onWorldClick) {
      camera.onWorldClick(worldCoords, canvasCoords, camera);
    }
    
    // 🎯 Также можно вызвать глобальный обработчик канваса
    if (this.onCameraClick) {
      this.onCameraClick(camera, worldCoords, canvasCoords);
    }
  }
  
  /**
   * 📊 Информация о канвасе
   */
  getInfo() {
    return {
      width: this.width,
      height: this.height,
      backgroundColor: this.backgroundColor,
      isStarted: this.isStarted,
      cameraCount: this.cameras.size
    };
  }
}