/**
 * 🖼️ Canvas - PIXI.js rendering surface
 * 
 * Canvas - это "экран" для отрисовки. Сам по себе ничего не показывает без камеры.
 * Поддерживает 2 режима размера:
 * - fixed: Фиксированные размеры (например 800x600)
 * - responsive: Относительно экрана (проценты от window.innerWidth/innerHeight)
 */

import * as PIXI from 'pixi.js';

export class Canvas {
  constructor(options = {}) {
    this.id = options.id || `canvas_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // 📏 Canvas size mode
    this.sizeMode = options.sizeMode || 'fixed'; // 'fixed' | 'responsive'
    
    // 📏 Canvas dimensions
    if (this.sizeMode === 'fixed') {
      this.width = options.width || 800;
      this.height = options.height || 600;
    } else {
      // Responsive mode
      const widthPercent = options.widthPercent || 100; // 100% = весь экран
      const heightPercent = options.heightPercent || 100;
      
      this.widthPercent = widthPercent;
      this.heightPercent = heightPercent;
      
      // Will be set on start()
      this.width = 0;
      this.height = 0;
    }
    
    // 🎨 Background color
    this.backgroundColor = options.backgroundColor || '#333333';
    
    // 📦 Camera storage
    this.cameras = new Map(); // cameraId -> Camera
    
    // 🎮 PIXI Application
    this.app = null;
    this.isStarted = false;
    
    // 📱 Container DOM element
    this.containerId = options.containerId || null;
    
    console.log(`🖼️ Canvas создан: ${this.id}, mode=${this.sizeMode}`);
  }
  
  /**
   * 🚀 Start PIXI application
   */
  async start(domContainer = null, options = {}) {
    if (this.isStarted) {
      console.log(`🖼️ Canvas ${this.id} уже запущен`);
      return;
    }
    
    // Определяем размеры для responsive mode
    if (this.sizeMode === 'responsive') {
      this.width = window.innerWidth * (this.widthPercent / 100);
      this.height = window.innerHeight * (this.heightPercent / 100);
    }
    
    // Создаем PIXI application
    this.app = new PIXI.Application();
    await this.app.init({
      width: this.width,
      height: this.height,
      backgroundColor: this.backgroundColor,
      antialias: options.antialias || false,
      resolution: options.resolution || 1,
      autoDensity: options.autoDensity || true
    });
    
    // Разрешаем сортировку по zIndex для корректного порядка слоёв
    try { this.app.stage.sortableChildren = true; } catch (_) {}
    
    // Определяем DOM контейнер
    let targetContainer = domContainer;
    if (!targetContainer && this.containerId) {
      targetContainer = document.getElementById(this.containerId);
      if (!targetContainer) {
        throw new Error(`DOM элемент с ID '${this.containerId}' не найден`);
      }
    }
    
    if (!targetContainer) {
      throw new Error('Не указан DOM контейнер для canvas');
    }
    
    // Добавляем canvas в DOM
    targetContainer.appendChild(this.app.canvas);
    
    this.isStarted = true;
    console.log(`🖼️ Canvas ${this.id} запущен: ${this.width}x${this.height}`);
  }
  
  /**
   * 📷 Add camera to canvas
   */
  addCamera(camera) {
    if (!camera.id) {
      throw new Error('Камера должна иметь ID');
    }
    
    this.cameras.set(camera.id, camera);
    console.log(`📷 Камера ${camera.id} добавлена к canvas ${this.id}`);
  }
  
  /**
   * 🗑️ Remove camera from canvas
   */
  removeCamera(cameraId) {
    const removed = this.cameras.delete(cameraId);
    if (removed) {
      console.log(`📷 Камера ${cameraId} удалена из canvas ${this.id}`);
    }
    return removed;
  }
  
  /**
   * 🎨 Render all cameras
   */
  render() {
    if (!this.app || !this.isStarted) return;
    
    // Рендерим камеры по priority
    const sortedCameras = Array.from(this.cameras.values())
      .sort((a, b) => (a.priority || 0) - (b.priority || 0));
    
    for (const camera of sortedCameras) {
      camera.render();
    }
  }
  
  /**
   * 🛑 Stop and cleanup
   */
  destroy() {
    if (this.app) {
      this.app.destroy(true, true);
      this.app = null;
    }
    
    this.cameras.clear();
    this.isStarted = false;
    console.log(`🖼️ Canvas ${this.id} уничтожен`);
  }
  
  /**
   * 📊 Get canvas info
   */
  getInfo() {
    return {
      id: this.id,
      sizeMode: this.sizeMode,
      width: this.width,
      height: this.height,
      widthPercent: this.widthPercent,
      heightPercent: this.heightPercent,
      backgroundColor: this.backgroundColor,
      isStarted: this.isStarted,
      cameraCount: this.cameras.size
    };
  }
}
