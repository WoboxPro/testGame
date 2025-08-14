/**
 * 🎮 PixiGame 2.0 - Гибкий игровой движок
 * 
 * Архитектура:
 * World (мир) → Canvas (холст) → Camera (камеры в холсте)
 */

import { World } from './core/World.js';
import { Canvas } from './core/Canvas.js';
import { Camera } from './core/Camera.js';
import { CameraController } from './core/CameraController.js';
import { FPSCounter } from './core/FPSCounter.js';

export class PixiGame {
  constructor() {
    // 🎮 Состояние движка
    this.isRunning = false;
    this.mainApp = null;        // 🎯 Главное PIXI приложение для ticker
    
    // 📊 Хранилища компонентов
    this.worlds = new Map();   // id -> World
    this.canvases = new Map(); // id -> Canvas  
    this.cameras = new Map();  // id -> Camera
    
    // 🎯 Выбранная камера для управления
    this.selectedCamera = null;
    
    // 🎮 Контроллер управления камерой
    this.cameraController = null;
    
    // 📊 Счетчик FPS
    this.fpsCounter = null;
    
    // PixiGame 2.0 создан
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
  async startCanvas(canvas, domContainer = null) {
    await canvas.start(domContainer);
    
    // 🔗 Добавляем отложенные камеры
    if (canvas._pendingCameras) {
      for (const camera of canvas._pendingCameras) {
        canvas.addCamera(camera);
      }
      canvas._pendingCameras = [];
    }
    
    // ▶️ Запускаем ticker если еще не запущен
    if (!this.isRunning) {
      this.isRunning = true;
      
      // 🎯 Используем первый канвас как главный для ticker
      if (!this.mainApp && canvas.app) {
        this.mainApp = canvas.app;
        // Подключаемся к ticker как в PixiShooterEngine
        this.mainApp.ticker.add(this._tick);
      }
    }
  }
  
  /**
   * 🔄 Главный tick (как в PixiShooterEngine)
   */
  _tick = (ticker) => {
    if (!this.isRunning) return;
    
    try {
      // 🎮 Обновляем CameraController
      if (this.cameraController) {
        this.cameraController._updateFromTicker(ticker);
      }
      
      // 📊 Обновляем FPS Counter
      if (this.fpsCounter) {
        this.fpsCounter._updateFromTicker(ticker);
      }
      
      // 🎨 Рендерим все канвасы
      this.canvases.forEach(canvas => {
        canvas.render();
      });
      
    } catch (error) {
      console.error('❌ Ошибка в главном tick:', error);
    }
  }
  
  /**
   * 🛑 Остановить движок
   */
  stop() {
    this.isRunning = false;
    
    // 🎯 Отключаемся от ticker как в PixiShooterEngine
    if (this.mainApp && this.mainApp.ticker) {
      this.mainApp.ticker.remove(this._tick);
      this.mainApp = null;
    }
    
    // 🔧 ФИКС: Очищаем ВСЕ компоненты!
    if (this.cameraController) {
      this.cameraController.destroy();
      this.cameraController = null;
    }
    
    if (this.fpsCounter) {
      this.fpsCounter.destroy();
      this.fpsCounter = null;
    }
    
    this.canvases.forEach(canvas => canvas.destroy());
    this.canvases.clear();
    this.cameras.clear();
    this.worlds.clear();
    
    this.selectedCamera = null;  // 🔧 ФИКС: очищаем ссылки!
    
    // PixiGame остановлен
  }
  
  /**
   * 🎯 Выбрать камеру для управления
   */
  selectCamera(camera) {
    if (!camera) {
      // Камера не передана
      return;
    }
    
    // 🔍 Проверяем что камера существует в нашей системе
    if (!this.cameras.has(camera.id)) {
      // Камера не найдена в движке
      return;
    }
    
    // 🎯 Снимаем выделение с предыдущей камеры
    if (this.selectedCamera) {
      this.selectedCamera.isSelected = false;
      // Камера снята с управления
    }
    
    // 🎯 Выбираем новую камеру
    this.selectedCamera = camera;
    this.selectedCamera.isSelected = true;
    
    // Камера выбрана для управления
    
    return camera;
  }
  
  /**
   * ❌ Снять выделение с камеры
   */
  deselectCamera() {
    if (this.selectedCamera) {
      this.selectedCamera.isSelected = false;
      // Камера снята с управления
      this.selectedCamera = null;
    } else {
      // Нет выбранной камеры
    }
  }
  
  /**
   * 📹 Получить выбранную камеру
   */
  getSelectedCamera() {
    return this.selectedCamera;
  }
  
  /**
   * 🎮 Создать контроллер управления камерой
   */
  createCameraController(options = {}) {
    // 🧹 Удаляем старый контроллер если есть
    if (this.cameraController) {
      this.cameraController.destroy();
    }
    
    // 🎮 Создаем новый контроллер
    this.cameraController = new CameraController(this, options);
    
    // CameraController создан
    return this.cameraController;
  }
  
  /**
   * 🎮 Получить контроллер управления
   */
  getCameraController() {
    return this.cameraController;
  }
  
  /**
   * 📊 Создать счетчик FPS
   */
  createFPSCounter(options = {}) {
    // 🧹 Удаляем старый счетчик если есть
    if (this.fpsCounter) {
      this.fpsCounter.destroy();
    }
    
    // 📊 Создаем новый счетчик
    this.fpsCounter = new FPSCounter(options);
    
    // FPS Counter создан
    return this.fpsCounter;
  }
  
  /**
   * 📊 Получить счетчик FPS
   */
  getFPSCounter() {
    return this.fpsCounter;
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
      selectedCamera: this.selectedCamera?.id || null,
      worlds: Array.from(this.worlds.values()).map(w => w.getInfo()),
      canvases: Array.from(this.canvases.values()).map(c => c.getInfo()),
      cameras: Array.from(this.cameras.values()).map(c => c.getInfo())
    };
  }
}

// 🚀 Экспорт классов для прямого использования
export { World, Canvas, Camera };
