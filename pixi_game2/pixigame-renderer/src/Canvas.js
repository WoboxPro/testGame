/**
 * 🖼️ Canvas - PIXI.js rendering surface
 */

import * as PIXI from 'pixi.js';
import { Camera } from './Camera.js';
import { EntityRenderer } from './EntityRenderer.js';

export class Canvas {
  constructor(options = {}) {
    this.id = options.id || `canvas_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    this.sizeMode = options.sizeMode || 'fixed';
    
    if (this.sizeMode === 'fixed') {
      this.width = options.width || 800;
      this.height = options.height || 600;
    } else {
      this.widthPercent = options.widthPercent || 100;
      this.heightPercent = options.heightPercent || 100;
      this.width = 0;
      this.height = 0;
    }
    
    this.backgroundColor = options.backgroundColor || '#333333';
    this.canvasBackgroundColor = options.canvasBackgroundColor || null;
    
    this.cameras = new Map();
    
    this.app = null;
    this.isStarted = false;
    this.containerId = options.containerId || null;
    
    this.entityRenderer = null;
    
    this._canvasBackgroundLayer = null;
    this._cameraBordersLayer = null;
    
    console.log(`🖼️ Canvas создан: ${this.id}, mode=${this.sizeMode}`);
  }
  
  async start(domContainer = null, options = {}) {
    if (this.isStarted) {
      console.log(`🖼️ Canvas ${this.id} уже запущен`);
      return;
    }
    
    if (this.sizeMode === 'responsive') {
      this.width = window.innerWidth * (this.widthPercent / 100);
      this.height = window.innerHeight * (this.heightPercent / 100);
    }
    
    this.app = new PIXI.Application();
    await this.app.init({
      width: this.width,
      height: this.height,
      backgroundColor: this.backgroundColor,
      antialias: options.antialias || false,
      resolution: options.resolution || 1,
      autoDensity: options.autoDensity || true
    });
    
    try { this.app.stage.sortableChildren = true; } catch (_) {}
    
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
    
    targetContainer.appendChild(this.app.canvas);
    
    this._initLayers();
    this.entityRenderer = new EntityRenderer(this);
    
    this.isStarted = true;
    console.log(`🖼️ Canvas ${this.id} запущен: ${this.width}x${this.height}`);
  }
  
  _initLayers() {
    this._canvasBackgroundLayer = new PIXI.Container();
    this._canvasBackgroundLayer.zIndex = 1;
    this.app.stage.addChild(this._canvasBackgroundLayer);
    
    if (this.canvasBackgroundColor) {
      this.setCanvasBackground(this.canvasBackgroundColor);
    }
    
    this._cameraBordersLayer = new PIXI.Container();
    this._cameraBordersLayer.zIndex = 999;
    this.app.stage.addChild(this._cameraBordersLayer);
  }
  
  setCanvasBackground(color) {
    this.canvasBackgroundColor = color;
    
    if (!this._canvasBackgroundLayer) return;
    
    this._canvasBackgroundLayer.removeChildren();
    
    if (color && color !== 'transparent') {
      const graphics = new PIXI.Graphics();
      graphics.rect(0, 0, this.width, this.height).fill(color);
      this._canvasBackgroundLayer.addChild(graphics);
    }
  }
  
  addCamera(camera) {
    if (!camera.id) {
      throw new Error('Камера должна иметь ID');
    }
    
    this.cameras.set(camera.id, camera);
    
    if (this.isStarted && !camera._isInitialized) {
      camera._initForCanvas(this);
    }
    
    console.log(`📷 Камера ${camera.id} добавлена к canvas ${this.id}`);
  }
  
  removeCamera(cameraId) {
    const camera = this.cameras.get(cameraId);
    if (!camera) return false;
    
    camera._cleanupFromCanvas();
    this.entityRenderer.clearCameraCache(cameraId);
    
    const removed = this.cameras.delete(cameraId);
    if (removed) {
      console.log(`📷 Камера ${cameraId} удалена из canvas ${this.id}`);
    }
    return removed;
  }
  
  render() {
    if (!this.app || !this.isStarted) return;
    
    const sortedCameras = Array.from(this.cameras.values())
      .sort((a, b) => (a.priority || 0) - (b.priority || 0));
    
    for (const camera of sortedCameras) {
      if (!camera.world) continue;
      
      this._updateCameraViewport(camera);
      
      if (camera.worldBackgroundColor) {
        this._renderWorldBackground(camera);
      }
      
      if (camera.cameraBackgroundColor) {
        this._renderCameraBackground(camera);
      }
      
      this.entityRenderer.renderEntities(
        camera,
        camera.world,
        camera.entitiesContainer
      );
    }
    
    this._updateCameraBorders();
    
    this.app.renderer.render(this.app.stage);
  }
  
  _updateCameraViewport(camera) {
    if (!camera.container || !camera.worldLayer) return;
    
    let offsetX = 0;
    let offsetY = 0;
    
    switch (camera.anchor) {
      case 'center':
        offsetX = camera.width / 2;
        offsetY = camera.height / 2;
        break;
      case 'topleft':
        offsetX = 0;
        offsetY = 0;
        break;
      case 'topright':
        offsetX = camera.width;
        offsetY = 0;
        break;
      case 'bottomleft':
        offsetX = 0;
        offsetY = camera.height;
        break;
      case 'bottomright':
        offsetX = camera.width;
        offsetY = camera.height;
        break;
    }
    
    camera.worldLayer.x = offsetX - (camera.focusX * camera.zoom);
    camera.worldLayer.y = offsetY - (camera.focusY * camera.zoom);
    camera.worldLayer.scale.set(camera.zoom);
  }
  
  _renderWorldBackground(camera) {
    if (!camera.worldBackgroundLayer) return;
    
    camera.worldBackgroundLayer.removeChildren();
    
    if (camera.worldBackgroundColor && camera.worldBackgroundColor !== 'transparent') {
      const graphics = new PIXI.Graphics();
      const bounds = camera._getWorldBoundsInView();
      
      graphics.rect(
        bounds.minX,
        bounds.minY,
        bounds.maxX - bounds.minX,
        bounds.maxY - bounds.minY
      ).fill(camera.worldBackgroundColor);
      
      camera.worldBackgroundLayer.addChild(graphics);
    }
  }
  
  _renderCameraBackground(camera) {
    if (!camera.cameraBackgroundLayer) return;
    
    camera.cameraBackgroundLayer.removeChildren();
    
    if (camera.cameraBackgroundColor && camera.cameraBackgroundColor !== 'transparent') {
      const graphics = new PIXI.Graphics();
      graphics.rect(0, 0, camera.width, camera.height).fill(camera.cameraBackgroundColor);
      camera.cameraBackgroundLayer.addChild(graphics);
    }
  }
  
  _updateCameraBorders() {
    if (!this._cameraBordersLayer) return;
    
    this._cameraBordersLayer.removeChildren();
    
    for (const camera of this.cameras.values()) {
      if (!camera._isInitialized) continue;
      
      const border = new PIXI.Graphics();
      
      let canvasX, canvasY;
      
      if (camera.positionMode === 'absolute') {
        canvasX = camera.x;
        canvasY = camera.y;
        border.rect(camera.x, camera.y, camera.width, camera.height);
      } else {
        canvasX = (camera.x / 100) * this.width;
        canvasY = (camera.y / 100) * this.height;
        border.rect(canvasX, canvasY, camera.width, camera.height);
      }
      
      border.stroke({ 
        color: '#00FF00', 
        width: 2
      });
      
      this._cameraBordersLayer.addChild(border);
    }
  }
  
  destroy() {
    if (this.app) {
      this.app.destroy(true, true);
      this.app = null;
    }
    
    if (this.entityRenderer) {
      this.entityRenderer._clearAllCache();
      this.entityRenderer = null;
    }
    
    this.cameras.clear();
    this.isStarted = false;
    console.log(`🖼️ Canvas ${this.id} уничтожен`);
  }
  
  getInfo() {
    return {
      id: this.id,
      sizeMode: this.sizeMode,
      width: this.width,
      height: this.height,
      backgroundColor: this.backgroundColor,
      isStarted: this.isStarted,
      cameraCount: this.cameras.size
    };
  }
}
