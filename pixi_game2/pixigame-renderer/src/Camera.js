/**
 * 📷 Camera - Viewport into world
 */

import * as PIXI from 'pixi.js';

export class Camera {
  constructor(options = {}) {
    this.id = options.id || `camera_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    this.width = options.width || 400;
    this.height = options.height || 300;
    
    this.positionMode = options.positionMode || 'absolute';
    this.x = options.x || 0;
    this.y = options.y || 0;
    
    this.anchor = options.anchor || 'center';
    this.focusX = options.focusX || 0;
    this.focusY = options.focusY || 0;
    
    this.world = options.world || null;
    this.canvas = options.canvas || null;
    
    this.zoom = options.zoom || 1.0;
    this.maxZoom = options.maxZoom || 5.0;
    this.minZoom = options.minZoom || 0.1;
    
    this.priority = options.priority || 0;
    
    this.worldBackgroundColor = options.worldBackgroundColor || null;
    this.cameraBackgroundColor = options.cameraBackgroundColor || null;
    
    this._isInitialized = false;
    this.container = null;
    this.mask = null;
    this.worldLayer = null;
    this.worldBackgroundLayer = null;
    this.entitiesContainer = null;
    this.worldBoundsLayer = null;
    this.cameraBackgroundLayer = null;
    
    if (this.canvas) {
      this.canvas.addCamera(this);
    }
    
    console.log(`📷 Камера создана: ${this.id}, anchor=${this.anchor}, mode=${this.positionMode}`);
  }
  
  _initForCanvas(canvas) {
    if (!canvas.app) {
      throw new Error('Canvas должен быть запущен перед добавлением камеры');
    }
    
    this.canvas = canvas;
    
    this.container = new PIXI.Container();
    this.container.sortableChildren = true;
    
    if (this.positionMode === 'absolute') {
      this.container.x = this.x;
      this.container.y = this.y;
    } else {
      this.container.x = (this.x / 100) * canvas.width;
      this.container.y = (this.y / 100) * canvas.height;
    }
    
    // ✂️ Маска ограничивает область рендера камеры (viewport)
    this.mask = new PIXI.Graphics();
    this.mask.rect(0, 0, this.width, this.height);
    this.mask.fill({ color: 0xFFFFFF });
    this.container.addChild(this.mask);
    this.container.mask = this.mask;
    
    // 🌍 Слой мира (именнно он двигается/масштабируется при focus/zoom)
    this.worldLayer = new PIXI.Container();
    this.worldLayer.sortableChildren = true;
    this.worldLayer.zIndex = 1;
    this.container.addChild(this.worldLayer);
    
    // 🌍 Фон мира и сущности живут внутри worldLayer, чтобы корректно масштабироваться
    this.worldBackgroundLayer = new PIXI.Container();
    this.worldBackgroundLayer.zIndex = 1;
    this.worldLayer.addChild(this.worldBackgroundLayer);
    
    this.entitiesContainer = new PIXI.Container();
    this.entitiesContainer.zIndex = 2;
    this.worldLayer.addChild(this.entitiesContainer);

    // 🌍 Границы мира — поверх сущностей (масштабируются вместе с миром)
    this.worldBoundsLayer = new PIXI.Container();
    this.worldBoundsLayer.zIndex = 3;
    this.worldLayer.addChild(this.worldBoundsLayer);

    // 🎨 Фон/оверлей камеры — поверх мира (не должен масштабироваться вместе с миром)
    this.cameraBackgroundLayer = new PIXI.Container();
    this.cameraBackgroundLayer.zIndex = 3;
    this.container.addChild(this.cameraBackgroundLayer);
    
    canvas.app.stage.addChild(this.container);
    
    this._isInitialized = true;
  }
  
  setWorld(world) {
    this.world = world;
    console.log(`📷 Камера ${this.id} привязана к world: ${world?.id}`);
  }
  
  setCanvas(canvas) {
    this.canvas = canvas;
    canvas.addCamera(this);
    console.log(`📷 Камера ${this.id} привязана к canvas: ${canvas?.id}`);
  }
  
  setFocus(x, y) {
    this.focusX = x;
    this.focusY = y;
  }
  
  setZoom(newZoom) {
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, Number(newZoom) || 1.0));
  }
  
  setPosition(x, y) {
    this.positionMode = 'absolute';
    this.x = x;
    this.y = y;
    if (this.container) {
      this.container.x = x;
      this.container.y = y;
    }
  }
  
  setWorldBackgroundColor(color) {
    this.worldBackgroundColor = color;
  }
  
  setCameraBackgroundColor(color) {
    this.cameraBackgroundColor = color;
  }
  
  _getViewportBounds() {
    let canvasX, canvasY;
    
    if (this.positionMode === 'absolute') {
      canvasX = this.x;
      canvasY = this.y;
    } else {
      canvasX = (this.x / 100) * this.canvas.width;
      canvasY = (this.y / 100) * this.canvas.height;
    }
    
    return { x: canvasX, y: canvasY, width: this.width, height: this.height };
  }
  
  _getWorldBoundsInView() {
    const halfWidth = this.width / 2;
    const halfHeight = this.height / 2;
    
    const worldMinX = (this.focusX - halfWidth / this.zoom);
    const worldMaxX = (this.focusX + halfWidth / this.zoom);
    const worldMinY = (this.focusY - halfHeight / this.zoom);
    const worldMaxY = (this.focusY + halfHeight / this.zoom);
    
    return {
      minX: worldMinX,
      minY: worldMinY,
      maxX: worldMaxX,
      maxY: worldMaxY
    };
  }
  
  worldToScreen(worldX, worldY) {
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
    
    // (world - focus) * zoom + anchor -> координаты внутри viewport
    let canvasX = anchorX + (worldX - this.focusX) * this.zoom;
    let canvasY = anchorY + (worldY - this.focusY) * this.zoom;
    
    if (this.positionMode === 'absolute') {
      canvasX += this.x;
      canvasY += this.y;
    } else {
      canvasX += (this.x / 100) * this.canvas.width;
      canvasY += (this.y / 100) * this.canvas.height;
    }
    
    return { x: canvasX, y: canvasY };
  }
  
  screenToWorld(screenX, screenY) {
    let canvasX = screenX;
    let canvasY = screenY;
    
    if (this.positionMode === 'absolute') {
      canvasX -= this.x;
      canvasY -= this.y;
    } else {
      canvasX -= (this.x / 100) * this.canvas.width;
      canvasY -= (this.y / 100) * this.canvas.height;
    }
    
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
    
    // focus + (screen - anchor)/zoom
    const worldX = this.focusX + (canvasX - anchorX) / this.zoom;
    const worldY = this.focusY + (canvasY - anchorY) / this.zoom;
    
    return { x: worldX, y: worldY };
  }
  
  _cleanupFromCanvas() {
    if (this.container) {
      this.container.destroy({ children: true });
      this.container = null;
    }
    if (this.mask) {
      this.mask.destroy();
      this.mask = null;
    }
    if (this.worldLayer) {
      this.worldLayer.destroy({ children: true });
      this.worldLayer = null;
    }
    if (this.worldBackgroundLayer) {
      this.worldBackgroundLayer.destroy({ children: true });
      this.worldBackgroundLayer = null;
    }
    if (this.entitiesContainer) {
      this.entitiesContainer.destroy({ children: true });
      this.entitiesContainer = null;
    }
    if (this.worldBoundsLayer) {
      this.worldBoundsLayer.destroy({ children: true });
      this.worldBoundsLayer = null;
    }
    if (this.cameraBackgroundLayer) {
      this.cameraBackgroundLayer.destroy({ children: true });
      this.cameraBackgroundLayer = null;
    }
    
    this._isInitialized = false;
    console.log(`📷 Камера ${this.id} очищена`);
  }
  
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
