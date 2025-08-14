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
    
    // 🎮 PIXI приложение
    this.app = null;
    this.isStarted = false;
    
    // 📷 Камеры привязанные к этому канвасу
    this.cameras = new Map(); // id -> Camera
    
    console.log(`🖼️ Canvas создан: ${this.width}×${this.height}, фон=${this.backgroundColor}`);
  }
  
  /**
   * 🚀 Запустить PIXI приложение
   */
  async start(domContainer) {
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
      
      // 📱 Добавляем в DOM
      domContainer.appendChild(this.app.canvas);
      
      this.isStarted = true;
      console.log(`✅ Canvas запущен в DOM, размер: ${this.width}×${this.height}`);
      
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