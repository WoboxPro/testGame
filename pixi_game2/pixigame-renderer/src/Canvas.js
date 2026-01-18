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

      // Рендерим фон мира если есть цвет фона ИЛИ текстура
      const hasWorldBgColor = camera.worldBackgroundColor && camera.worldBackgroundColor !== 'transparent';
      const hasWorldTexture = camera.world?.backgroundTexture?.textureUrl;
      if (hasWorldBgColor || hasWorldTexture) {
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
    if (!camera.worldBackgroundLayer || !camera.world) return;

    camera.worldBackgroundLayer.removeChildren();

    const bounds = camera._getWorldBoundsInView();
    const world = camera.world;
    const bgTexture = world.backgroundTexture;

    // Сначала рендерим цветовой фон
    if (camera.worldBackgroundColor && camera.worldBackgroundColor !== 'transparent') {
      const graphics = new PIXI.Graphics();

      if (world.type === 'bounded') {
        // Для ограниченного мира - фон на весь мир
        graphics.rect(0, 0, world.width, world.height).fill(camera.worldBackgroundColor);
      } else {
        // Для бесконечного мира - фон на видимую область
        graphics.rect(
          bounds.minX,
          bounds.minY,
          bounds.maxX - bounds.minX,
          bounds.maxY - bounds.minY
        ).fill(camera.worldBackgroundColor);
      }

      camera.worldBackgroundLayer.addChild(graphics);
    }

    // Затем рендерим текстуру если указана
    if (bgTexture?.textureUrl) {
      this._renderWorldTexture(camera, world, bgTexture, bounds);
    }
  }

  _renderWorldTexture(camera, world, bgTexture, bounds) {
    const textureUrl = bgTexture.textureUrl;
    const scaleMode = bgTexture.scaleMode || 'tile';
    const tint = bgTexture.tint;

    if (scaleMode === 'tile' && world.type === 'infinite') {
      // Для бесконечного мира используем шейдер с бесконечным тайлингом
      this._renderInfiniteTextureWithShader(camera, textureUrl, tint);
      return;
    }

    // Для bounded мира или других scaleMode используем старый подход
    if (scaleMode === 'tile') {
      const texture = PIXI.Texture.from(textureUrl);
      const tilingSprite = new PIXI.TilingSprite({
        texture,
        width: world.width,
        height: world.height
      });

      if (tint) {
        try { tilingSprite.tint = tint; } catch (_) {}
      }

      tilingSprite.x = 0;
      tilingSprite.y = 0;

      camera.worldBackgroundLayer.addChild(tilingSprite);
    } else if (scaleMode === 'stretch') {
      const sprite = PIXI.Sprite.from(textureUrl);

      if (tint) {
        try { sprite.tint = tint; } catch (_) {}
      }

      if (world.type === 'bounded') {
        sprite.x = 0;
        sprite.y = 0;
        sprite.width = world.width;
        sprite.height = world.height;
      } else {
        sprite.x = bounds.minX;
        sprite.y = bounds.minY;
        sprite.width = bounds.maxX - bounds.minX;
        sprite.height = bounds.maxY - bounds.minY;
      }

      camera.worldBackgroundLayer.addChild(sprite);
    } else if (scaleMode === 'center') {
      const sprite = PIXI.Sprite.from(textureUrl);

      if (tint) {
        try { sprite.tint = tint; } catch (_) {}
      }

      const texWidth = sprite.texture.width;
      const texHeight = sprite.texture.height;

      if (world.type === 'bounded') {
        sprite.x = (world.width - texWidth) / 2;
        sprite.y = (world.height - texHeight) / 2;
      } else {
        sprite.x = (bounds.minX + bounds.maxX - texWidth) / 2;
        sprite.y = (bounds.minY + bounds.maxY - texHeight) / 2;
      }

      camera.worldBackgroundLayer.addChild(sprite);
    }
  }

  _renderInfiniteTextureWithShader(camera, textureUrl, tint) {
    // Создаём TilingSprite с огромным размером
    const texture = PIXI.Texture.from(textureUrl);
    const size = 100000;

    const tilingSprite = new PIXI.TilingSprite({
      texture,
      width: size,
      height: size
    });

    // Фиксируем в мировых координатах (0, 0)
    // Центрируем на точке (0, 0)
    tilingSprite.x = -size / 2;
    tilingSprite.y = -size / 2;

    // Сбрасываем tilePosition чтобы текстура была зафиксирована
    tilingSprite.tilePosition.x = 0;
    tilingSprite.tilePosition.y = 0;

    // Применяем tint если указан
    if (tint) {
      try { tilingSprite.tint = tint; } catch (_) {}
    }

    camera.worldBackgroundLayer.addChild(tilingSprite);
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
