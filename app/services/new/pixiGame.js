/**
 * 🎮 PixiGame 2.0 - Гибкий игровой движок
 * 
 * Архитектура:
 * World (мир) → Canvas (холст) → Camera (камеры в холсте)
 */

import { World } from './core/World.js';
import { Canvas } from './core/Canvas.js';
import { Camera } from './core/Camera.js';

export class PixiGame {
  constructor() {
    // 🎮 Состояние движка
    this.isRunning = false;
    this.lastTime = 0;
    
    // 📊 Хранилища компонентов
    this.worlds = new Map();   // id -> World
    this.canvases = new Map(); // id -> Canvas  
    this.cameras = new Map();  // id -> Camera
    
    console.log('🎮 PixiGame 2.0 создан с гибкой архитектурой');
  }
  
  /**
   * 🌍 Создать мир
   */
  createWorld(options = {}) {
    const world = new World(options);
    this.worlds.set(world.id || 'default', world);
    return world;
  }
  
  /**
   * 🖼️ Создать канвас
   */
  createCanvas(options = {}) {
    const canvas = new Canvas(options);
    this.canvases.set(canvas.id || 'default', canvas);
    return canvas;
  }
  
  /**
   * 📷 Создать камеру
   */
  createCamera(options = {}) {
    const camera = new Camera(options);
    this.cameras.set(camera.id, camera);
    
    // 🔗 Автоматически добавляем камеру к канвасу (только если канвас уже запущен)
    if (options.canvas && options.canvas.isStarted) {
      options.canvas.addCamera(camera);
    } else if (options.canvas) {
      // 📝 Сохраняем для добавления после запуска канваса
      if (!options.canvas._pendingCameras) {
        options.canvas._pendingCameras = [];
      }
      options.canvas._pendingCameras.push(camera);
    }
    
    return camera;
  }
  
  /**
   * 🚀 Запустить канвас
   */
  async startCanvas(canvas, domContainer) {
    await canvas.start(domContainer);
    
    // 🔗 Добавляем отложенные камеры
    if (canvas._pendingCameras) {
      for (const camera of canvas._pendingCameras) {
        canvas.addCamera(camera);
      }
      canvas._pendingCameras = [];
    }
    
    // ▶️ Запускаем игровой цикл если еще не запущен
    if (!this.isRunning) {
      this.isRunning = true;
      this.lastTime = performance.now();
      this._gameLoop();
    }
  }
  
  /**
   * 🔄 Главный игровой цикл
   */
  _gameLoop = () => {
    if (!this.isRunning) return;
    
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    // 🎨 Рендерим все канвасы
    this.canvases.forEach(canvas => {
      canvas.render();
    });
    
    // 🔁 Следующий кадр
    requestAnimationFrame(this._gameLoop);
  }
  
  /**
   * 🛑 Остановить движок
   */
  stop() {
    this.isRunning = false;
    
    this.canvases.forEach(canvas => canvas.destroy());
    this.canvases.clear();
    this.cameras.clear();
    this.worlds.clear();
    
    console.log('🛑 PixiGame остановлен');
  }
  
  /**
   * 📊 Отладочная информация
   */
  getDebugInfo() {
    return {
      isRunning: this.isRunning,
      worldCount: this.worlds.size,
      canvasCount: this.canvases.size,
      cameraCount: this.cameras.size,
      worlds: Array.from(this.worlds.values()).map(w => w.getInfo()),
      canvases: Array.from(this.canvases.values()).map(c => c.getInfo()),
      cameras: Array.from(this.cameras.values()).map(c => c.getInfo())
    };
  }
}

// 🚀 Экспорт классов для прямого использования
export { World, Canvas, Camera };
