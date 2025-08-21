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
import { EntityController } from './core/EntityController.js';
import { AIController } from './core/AIController.js';


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
    
    // 🎮 Контроллеры управления сущностями
    this.entityControllers = new Map(); // id -> EntityController
    
    // ⏱️ Масштаб времени игры (1 = нормальная скорость)
    this.timeScale = 1;

    // 🤖 AI контроллер
    this.aiController = null;
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
        // Применяем текущий масштаб времени к тикеру
        this.mainApp.ticker.speed = this.timeScale;
      }
    }
  }
  
  /**
   * 🔄 Главный tick (как в PixiShooterEngine)
   */
  _tick = (ticker) => {
    if (!this.isRunning) return;
    
    try {
      const dt = ticker.deltaMS; // мс, уже умножено на ticker.speed (= timeScale)
      // 🎮 Обновляем CameraController
      if (this.cameraController) {
        this.cameraController._updateFromTicker(ticker);
      }
      
      // 🎮 Обновляем EntityControllers
      this.entityControllers.forEach(controller => {
        controller._updateFromTicker(ticker);
      });
      
      // 🌍 Обновляем все миры
      this.worlds.forEach(world => {
        world.update(dt);
        // Обновляем ИИ
        if (!this.aiController) this.aiController = new AIController(world);
        this.aiController.update(dt);
      });
      
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
    
    // 🧹 Очищаем все EntityControllers
    this.entityControllers.forEach(controller => controller.destroy());
    this.entityControllers.clear();

    
    this.canvases.forEach(canvas => canvas.destroy());
    this.canvases.clear();
    this.cameras.clear();
    this.worlds.clear();
    
    this.selectedCamera = null;  // 🔧 ФИКС: очищаем ссылки!
    
    // PixiGame остановлен
  }

  /**
   * ⏱️ Установить масштаб времени игры
   */
  setTimeScale(scale) {
    const clamped = Math.max(0, Number(scale) || 0);
    this.timeScale = clamped;
    if (this.mainApp && this.mainApp.ticker) {
      this.mainApp.ticker.speed = this.timeScale;
    }
  }

  /**
   * ⏱️ Получить текущий масштаб времени
   */
  getTimeScale() {
    return this.timeScale;
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
   * 🎮 Создать контроллер для сущности
   */
  createEntityController(options = {}) {
    // 🎮 Создаем новый EntityController
    const controller = new EntityController(this, options);
    
    // 🎯 Генерируем ID если не указан
    const controllerId = options.id || `entity_controller_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // 📦 Сохраняем в коллекции
    this.entityControllers.set(controllerId, controller);
    
    //console.log(`🎮 EntityController создан: ${controllerId}`);
    return controller;
  }
  
  /**
   * 🎮 Получить EntityController по ID
   */
  getEntityController(controllerId) {
    return this.entityControllers.get(controllerId);
  }
  
  /**
   * 🗑️ Удалить EntityController
   */
  removeEntityController(controllerId) {
    const controller = this.entityControllers.get(controllerId);
    if (controller) {
      controller.destroy();
      this.entityControllers.delete(controllerId);
      //console.log(`🗑️ EntityController удален: ${controllerId}`);
      return true;
    }
    return false;
  }
  
  /**
   * 📊 Получить все EntityControllers
   */
  getAllEntityControllers() {
    return Array.from(this.entityControllers.values());
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
      entityControllerCount: this.entityControllers.size,
      selectedCamera: this.selectedCamera?.id || null,
      worlds: Array.from(this.worlds.values()).map(w => w.getInfo()),
      canvases: Array.from(this.canvases.values()).map(c => c.getInfo()),
      cameras: Array.from(this.cameras.values()).map(c => c.getInfo()),
      entityControllers: Array.from(this.entityControllers.values()).map(c => c.getInfo())
    };
  }
}

// 🚀 Экспорт классов для прямого использования
export { World, Canvas, Camera };
