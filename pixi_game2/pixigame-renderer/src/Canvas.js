/**
 * 🖼️ Canvas - PIXI.js rendering surface
 */

import * as PIXI from 'pixi.js';
import { Camera } from './Camera.js';
import { EntityRenderer } from './EntityRenderer.js';
import { inputSystem } from '../../pixigame/src/input/InputSystem.js';

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
    this._virtualInputLayer = null; // Слой для виртуальных элементов управления

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

    // Настраиваем InputSystem с PIXI контейнером для виртуальных элементов
    inputSystem.setPixiContainer(this._virtualInputLayer);

    // Добавляем touch event listeners на canvas
    this._setupTouchEvents();

    // Initialize any cameras that were added before the canvas started
    for (const camera of this.cameras.values()) {
      if (!camera._isInitialized) {
        camera._initForCanvas(this);
        console.log(`📷 Камера ${camera.id} инициализирована при запуске canvas`);
      }
    }

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

    // Слой для виртуальных элементов управления (поверх всего)
    this._virtualInputLayer = new PIXI.Container();
    this._virtualInputLayer.zIndex = 1000;
    this._virtualInputLayer.eventMode = 'none'; // Пропускаем события через этот слой
    this.app.stage.addChild(this._virtualInputLayer);
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

      // Update camera position if following an entity
      camera._updateFollowEntity();

      this._updateCameraViewport(camera);

      // Рендерим фон мира если есть цвет фона ИЛИ текстура
      const hasWorldBgColor = camera.worldBackgroundColor && camera.worldBackgroundColor !== 'transparent';
      const hasWorldTexture = camera.world?.backgroundTexture?.textureUrl;
      if (hasWorldBgColor || hasWorldTexture) {
        this._renderWorldBackground(camera);
      }

      // 🗺️ Рендерим регионы (поверх фона мира, перед сущностями)
      this._renderRegions(camera);

      if (camera.cameraBackgroundColor) {
        this._renderCameraBackground(camera);
      }

      this.entityRenderer.renderEntities(
        camera,
        camera.world,
        camera.entitiesContainer
      );

      // Рендерим границы мира после сущностей (поверх всего)
      this._renderWorldBounds(camera);
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

    // console.log(`🎨 _renderWorldBackground: worldBackgroundColor=${camera.worldBackgroundColor}, textureUrl=${bgTexture?.textureUrl || 'none'}`);

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

  _renderWorldBounds(camera) {
    if (!camera.worldBoundsLayer || !camera.world) return;
    if (!camera.world.showBounds || camera.world.type !== 'bounded') {
      // console.log(`🔲 _renderWorldBounds: skipped (showBounds=${camera.world.showBounds}, type=${camera.world.type})`);
      return;
    }

    camera.worldBoundsLayer.removeChildren();

    const boundsGraphics = new PIXI.Graphics();
    boundsGraphics.rect(0, 0, camera.world.width, camera.world.height).stroke({
      color: camera.world.boundsColor || '#FF4444',
      width: 3
    });

    camera.worldBoundsLayer.addChild(boundsGraphics);
    // console.log(`🔲 _renderWorldBounds: rendered ${camera.world.width}x${camera.world.height} in ${camera.world.boundsColor}`);
  }

  _renderRegions(camera) {
    if (!camera.worldBackgroundLayer || !camera.world) return;

    const regionSystem = camera.world.regionSystem;
    if (!regionSystem || regionSystem.regions.size === 0) return;

    console.log(`🗺️ _renderRegions: ${regionSystem.regions.size} regions`);

    // Рендерим регионы по приоритету
    const sortedRegions = Array.from(regionSystem.regions.values())
      .sort((a, b) => b.bounds.priority - a.bounds.priority);

    for (const region of sortedRegions) {
      const regionType = region.regionType;
      const bounds = region.bounds;

      console.log(`🗺️ Region: ${regionType.displayName}, texture=${regionType.groundTexture?.textureUrl || 'none'}, borders=${regionType.borders?.enabled}`);

      // 🎨 Рендерим текстуру региона если есть
      if (regionType.groundTexture?.textureUrl) {
        this._renderRegionTexture(camera, regionType, bounds);
      }

      // 🔲 Рендерим границы региона если включены
      if (regionType.borders?.enabled) {
        this._renderRegionBorders(camera, regionType, bounds);
      }
    }
  }

  _renderRegionTexture(camera, regionType, bounds) {
    const textureUrl = regionType.groundTexture.textureUrl;
    const scaleMode = regionType.groundTexture.scaleMode || 'tile';
    const tint = regionType.groundTexture.tint;

    if (scaleMode === 'tile') {
      const texture = PIXI.Texture.from(textureUrl);
      const tilingSprite = new PIXI.TilingSprite({
        texture,
        width: bounds.width,
        height: bounds.height
      });

      if (tint) {
        try { tilingSprite.tint = tint; } catch (_) {}
      }

      tilingSprite.x = bounds.x;
      tilingSprite.y = bounds.y;

      camera.worldBackgroundLayer.addChild(tilingSprite);
    } else if (scaleMode === 'stretch') {
      const sprite = PIXI.Sprite.from(textureUrl);

      if (tint) {
        try { sprite.tint = tint; } catch (_) {}
      }

      sprite.x = bounds.x;
      sprite.y = bounds.y;
      sprite.width = bounds.width;
      sprite.height = bounds.height;

      camera.worldBackgroundLayer.addChild(sprite);
    } else if (scaleMode === 'center') {
      const sprite = PIXI.Sprite.from(textureUrl);

      if (tint) {
        try { sprite.tint = tint; } catch (_) {}
      }

      const texWidth = sprite.texture.width;
      const texHeight = sprite.texture.height;

      sprite.x = bounds.x + (bounds.width - texWidth) / 2;
      sprite.y = bounds.y + (bounds.height - texHeight) / 2;

      camera.worldBackgroundLayer.addChild(sprite);
    }
  }

  _renderRegionBorders(camera, regionType, bounds) {
    const borders = regionType.borders;
    const borderGraphics = new PIXI.Graphics();
    borderGraphics.rect(bounds.x, bounds.y, bounds.width, bounds.height).stroke({
      color: borders.color || '#00FFFF',
      width: borders.width || 3,
      alpha: borders.alpha || 1.0
    });

    camera.worldBackgroundLayer.addChild(borderGraphics);
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

  /**
   * Настроить touch event listeners для виртуальных джостиков
   */
  _setupTouchEvents() {
    const canvasElement = this.app.canvas;
    console.log(`🔧 Настраиваю события для canvas ${this.id}, element:`, canvasElement);

    // Touch start
    canvasElement.addEventListener('touchstart', (e) => {
      console.log(`👆 touchstart на canvas!`);
      e.preventDefault();
      inputSystem.handleTouchStart(e, this.width, this.height);
    }, { passive: false });

    // Touch move
    canvasElement.addEventListener('touchmove', (e) => {
      e.preventDefault();
      inputSystem.handleTouchMove(e);
    }, { passive: false });

    // Touch end
    canvasElement.addEventListener('touchend', (e) => {
      e.preventDefault();
      inputSystem.handleTouchEnd(e);
    }, { passive: false });

    // Touch cancel
    canvasElement.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      inputSystem.handleTouchEnd(e);
    }, { passive: false });

    // Mouse support для тестирования на десктопе
    let mouseDown = false;
    let mouseTouchId = 'mouse-0';

    canvasElement.addEventListener('mousedown', (e) => {
      const rect = canvasElement.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      console.log(`🖱️ mousedown на canvas! (${x}, ${y})`);

      // Эмулируем touch event
      const mockEvent = {
        changedTouches: [{
          identifier: mouseTouchId,
          clientX: x,
          clientY: y
        }]
      };
      inputSystem.handleTouchStart(mockEvent, this.width, this.height);
      mouseDown = true;
    });

    canvasElement.addEventListener('mousemove', (e) => {
      if (!mouseDown) return;
      const rect = canvasElement.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const mockEvent = {
        changedTouches: [{
          identifier: mouseTouchId,
          clientX: x,
          clientY: y
        }]
      };
      inputSystem.handleTouchMove(mockEvent);
    });

    canvasElement.addEventListener('mouseup', (e) => {
      if (!mouseDown) return;
      const mockEvent = {
        changedTouches: [{
          identifier: mouseTouchId
        }]
      };
      inputSystem.handleTouchEnd(mockEvent);
      mouseDown = false;
    });

    canvasElement.addEventListener('mouseleave', () => {
      if (mouseDown) {
        const mockEvent = {
          changedTouches: [{
            identifier: mouseTouchId
          }]
        };
        inputSystem.handleTouchEnd(mockEvent);
        mouseDown = false;
      }
    });

    console.log(`📱 Touch/Mouse события настроены для canvas ${this.id}`);
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
