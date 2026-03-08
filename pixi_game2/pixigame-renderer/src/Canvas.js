/**
 * 🖼️ Canvas - PIXI.js rendering surface
 */

import * as PIXI from 'pixi.js';
import { Camera } from './Camera.js';
import { EntityRenderer } from './EntityRenderer.js';
import { createPixiDisplayObjectForUI } from './UIRenderer.js';
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

    // UI entities management
    this.uiEntities = new Map(); // id -> uiEntity
    this.uiDisplayCache = new Map(); // key -> PIXI.DisplayObject
    this._uiOverlay = null; // Canvas-level UI layer

    // Hex grid caching (per camera)
    // key: camera.id -> { graphics: PIXI.Graphics, lastKey: string }
    this._hexGridCache = new Map();

    // Lighting caches (per camera)
    // key: camera.id -> { darkContainer, ambientGfx, globalGfx, maskRt, maskSprite, maskContainer, maskBg, lightHoles, lastSizeKey, lastGlobalKey }
    this._lightingCache = new Map();

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

    // Слой для canvas-level UI
    this._uiOverlay = new PIXI.Container();
    this._uiOverlay.zIndex = 50000;
    this.app.stage.addChild(this._uiOverlay);

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

    // Clean lighting cache for this camera
    const lightingCache = this._lightingCache.get(cameraId);
    if (lightingCache) {
      try { lightingCache.maskRt?.destroy?.(true); } catch (_) {}
      try { lightingCache.maskSprite?.destroy?.({ children: true }); } catch (_) {}
      try { lightingCache.darkContainer?.destroy?.({ children: true }); } catch (_) {}
      try { lightingCache.maskContainer?.destroy?.({ children: true }); } catch (_) {}
      this._lightingCache.delete(cameraId);
    }

    // Clean up UI cache for this camera
    const cameraPrefix = `::camera:${cameraId}`;
    for (const [key, obj] of this.uiDisplayCache) {
      if (key.includes(cameraPrefix)) {
        obj.destroy({ children: true });
        this.uiDisplayCache.delete(key);
      }
    }

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

      // IMPORTANT: always clear worldBackgroundLayer to avoid accumulation/leaks
      // when world background is disabled (no color/texture).
      // Background/regions/grid are rendered each frame anyway.
      if (camera.worldBackgroundLayer) {
        camera.worldBackgroundLayer.removeChildren();
      }

      // Рендерим фон мира если есть цвет фона ИЛИ текстура
      const hasWorldBgColor = camera.worldBackgroundColor && camera.worldBackgroundColor !== 'transparent';
      const hasWorldTexture = camera.world?.backgroundTexture?.textureUrl;
      if (hasWorldBgColor || hasWorldTexture) {
        this._renderWorldBackground(camera);
      }

      // 🗺️ Рендерим регионы (поверх фона мира, перед сущностями)
      this._renderRegions(camera);

      // ⬡ Рендерим гексагональную сетку (если включена)
      this._renderHexGrid(camera);

      if (camera.cameraBackgroundColor) {
        this._renderCameraBackground(camera);
      }

      // Рендерим игровые сущности
      if (camera.entitiesContainer) {
        camera.entitiesContainer.visible = camera.isTypeVisible('gameEntities');
        if (camera.entitiesContainer.visible) {
          this.entityRenderer.renderEntities(
            camera,
            camera.world,
            camera.entitiesContainer
          );
        }
      }

      // Рендерим границы мира после сущностей (поверх всего)
      this._renderWorldBounds(camera);

      // 💡 Рендерим освещение (затемняет всё поверх границ мира)
      this._renderLighting(camera);
    }

    // Рендерим все UI сущности
    this._renderAllUIEntities();

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

  /**
   * 💡 Рендеринг системы освещения
   */
  _renderLighting(camera) {
    if (!camera.lightingLayer || !camera.world) return;

    const lightingSystem = camera.world.lightingSystem;
    if (!lightingSystem || !lightingSystem.enabled) {
      camera.lightingLayer.visible = false;
      return;
    }
    camera.lightingLayer.visible = true;

    // Lighting is rendered in camera viewport coords (0..width/height) inside camera.container.
    // We build a darkness container and apply an alpha mask which has "holes" for each LightEntity.
    const vpW = camera.width;
    const vpH = camera.height;

    // Lazy init cache
    let cache = this._lightingCache.get(camera.id);
    if (!cache) {
      const darkContainer = new PIXI.Container();
      const ambientGfx = new PIXI.Graphics();
      const globalGfx = new PIXI.Graphics();
      darkContainer.addChild(ambientGfx);
      darkContainer.addChild(globalGfx);

      const maskContainer = new PIXI.Container();
      const maskBg = new PIXI.Graphics();
      maskContainer.addChild(maskBg);

      const lightHoles = new Map(); // lightId -> PIXI.Graphics (blendMode ERASE)

      // Create initial RT (will be resized if needed)
      const maskRt = PIXI.RenderTexture.create({ width: Math.max(1, vpW), height: Math.max(1, vpH) });
      const maskSprite = new PIXI.Sprite(maskRt);
      maskSprite.position.set(0, 0);
      // Mask sprite should not render to screen; it's only used as an alpha mask.
      // Keeping it in the display tree improves transform consistency across Pixi versions.
      maskSprite.renderable = false;

      darkContainer.mask = maskSprite;

      cache = {
        darkContainer,
        ambientGfx,
        globalGfx,
        maskRt,
        maskSprite,
        maskContainer,
        maskBg,
        lightHoles,
        lastSizeKey: null,
        lastGlobalKey: null
      };

      this._lightingCache.set(camera.id, cache);

      camera.lightingLayer.removeChildren();
      camera.lightingLayer.addChild(darkContainer);
      camera.lightingLayer.addChild(maskSprite);
    }

    // Ensure correct placement inside viewport
    camera.lightingLayer.position.set(0, 0);

    // Resize mask RT if viewport size changed
    const sizeKey = `${vpW}x${vpH}`;
    if (cache.lastSizeKey !== sizeKey) {
      cache.lastSizeKey = sizeKey;
      try {
        cache.maskRt.destroy(true);
      } catch (_) {}
      cache.maskRt = PIXI.RenderTexture.create({ width: Math.max(1, vpW), height: Math.max(1, vpH) });
      cache.maskSprite.texture = cache.maskRt;
      cache.maskSprite.position.set(0, 0);
    }

    // 1) Build darkness overlays (ambient + global) in viewport coords
    const ambientAlpha = 1 - lightingSystem.ambientIntensity;
    cache.ambientGfx.clear();
    if (ambientAlpha > 0.01) {
      cache.ambientGfx.rect(0, 0, vpW, vpH).fill({ color: 0x000000, alpha: ambientAlpha });
    }

    cache.globalGfx.clear();
    if (lightingSystem.globalEnabled) {
      const globalAlpha = 1 - lightingSystem.globalIntensity;
      if (globalAlpha > 0.01) {
        const bounds = { minX: 0, minY: 0, maxX: vpW, maxY: vpH };
        this._drawGlobalLightGradient(cache.globalGfx, bounds, lightingSystem.globalAngle, globalAlpha);
      }
    }

    // 2) Build mask: start fully opaque (dark everywhere), then erase holes for lights
    cache.maskBg.clear();
    cache.maskBg.rect(0, 0, vpW, vpH).fill({ color: 0xFFFFFF, alpha: 1 });

    const usedLightIds = new Set();
    const world = camera.world;
    for (const [entityId, components] of world.entities) {
      const entityRef = components.get('_entityRef');
      if (!entityRef || entityRef.subtype !== 'light') continue;

      const position = components.get('position');
      if (!position) continue;

      usedLightIds.add(entityId);

      let holeGfx = cache.lightHoles.get(entityId);
      if (!holeGfx) {
        holeGfx = new PIXI.Graphics();
        holeGfx.blendMode = 'erase';
        cache.lightHoles.set(entityId, holeGfx);
        cache.maskContainer.addChild(holeGfx);
      }

      // Convert world -> camera viewport coords
      const p = camera.worldToScreen(position.x, position.y);
      const cx = p.x - (camera.container?.x || 0);
      const cy = p.y - (camera.container?.y || 0);

      const intensity = Math.max(0, Math.min(1, Number(entityRef.intensity) || 0));
      const baseRadius = Math.max(0, Number(entityRef.radius) || 0) * (Number(camera.zoom) || 1);
      const falloff = Math.max(0, Number(entityRef.falloffRadius) || 0) * (Number(camera.zoom) || 1);

      holeGfx.clear();
      if (intensity <= 0 || baseRadius <= 0) continue;

      const shape = entityRef.shape || 'circle';
      const totalRadius = baseRadius + falloff;
      const steps = Math.max(6, Math.min(28, Math.round(totalRadius / 18)));

      if (shape === 'circle') {
        this._drawLightHoleCircle(holeGfx, cx, cy, baseRadius, falloff, intensity, steps);
      } else {
        // arc
        const rotationComp = components.get('rotation');
        const mirrorDirectionComp = components.get('mirrorDirection');
        const rotation =
          rotationComp != null
            ? (typeof rotationComp === 'number' ? rotationComp : (Number(rotationComp?.value) || 0))
            : (Number(entityRef?.rotation) || 0);
        const mirrorDirection = mirrorDirectionComp || entityRef?.mirrorDirection || { x: 1, y: 1 };

        const direction = entityRef.direction || { x: 1, y: 0 };
        const directionMode = entityRef.directionMode || 'relative';
        const fovAngle = Math.max(1, Math.min(360, Number(entityRef.fovAngle) || 90));

        const { baseAngle, fovRad } = this._computeDirectionalArc(direction, directionMode, rotation, mirrorDirection, fovAngle);
        const startAngle = baseAngle - fovRad / 2;
        const endAngle = baseAngle + fovRad / 2;
        this._drawLightHoleArc(holeGfx, cx, cy, baseRadius, falloff, intensity, steps, startAngle, endAngle);
      }
    }

    // Remove unused cached holes
    for (const [lightId, gfx] of cache.lightHoles) {
      if (usedLightIds.has(lightId)) continue;
      try {
        if (gfx.parent === cache.maskContainer) cache.maskContainer.removeChild(gfx);
        gfx.destroy({ children: true });
      } catch (_) {}
      cache.lightHoles.delete(lightId);
    }

    // Render maskContainer -> maskRt (offscreen)
    if (this.app?.renderer) {
      this.app.renderer.render({
        container: cache.maskContainer,
        target: cache.maskRt,
        clear: true
      });
    }
  }

  _drawGlobalLightGradient(graphics, bounds, angle, alpha) {
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const centerX = bounds.minX + width / 2;
    const centerY = bounds.minY + height / 2;

    const radians = (angle - 90) * (Math.PI / 180);
    const dirX = Math.cos(radians);
    const dirY = Math.sin(radians);

    const steps = 20;
    const stepAlpha = alpha / steps;

    for (let i = 0; i < steps; i++) {
      const progress = i / steps;
      const currentAlpha = stepAlpha * (steps - i);

      const offsetX = -dirX * width * progress * 0.5;
      const offsetY = -dirY * height * progress * 0.5;

      const rectWidth = width * (1 - progress * 0.3);
      const rectHeight = height * (1 - progress * 0.3);
      const rectX = centerX - rectWidth / 2 + offsetX;
      const rectY = centerY - rectHeight / 2 + offsetY;

      graphics.rect(rectX, rectY, rectWidth, rectHeight);
      graphics.fill({ color: 0x000000, alpha: currentAlpha });
    }
  }

  _drawLightHoleCircle(graphics, x, y, radius, falloff, intensity, steps) {
    const total = radius + falloff;
    for (let i = steps; i >= 0; i--) {
      const t = i / steps;
      const r = radius + (total - radius) * t;
      const a = intensity * (1 - t);
      if (a <= 0.001) continue;
      graphics.circle(x, y, r).fill({ color: 0x000000, alpha: a });
    }
    // Inner fully-lit core
    graphics.circle(x, y, radius).fill({ color: 0x000000, alpha: intensity });
  }

  _drawLightHoleArc(graphics, x, y, radius, falloff, intensity, steps, startAngle, endAngle) {
    const total = radius + falloff;
    for (let i = steps; i >= 0; i--) {
      const t = i / steps;
      const r = radius + (total - radius) * t;
      const a = intensity * (1 - t);
      if (a <= 0.001) continue;
      graphics
        .moveTo(x, y)
        .arc(x, y, r, startAngle, endAngle)
        .closePath()
        .fill({ color: 0x000000, alpha: a });
    }
    graphics
      .moveTo(x, y)
      .arc(x, y, radius, startAngle, endAngle)
      .closePath()
      .fill({ color: 0x000000, alpha: intensity });
  }

  _computeDirectionalArc(direction, directionMode, rotation, mirrorDirection, fovAngle) {
    let dirX = Number(direction?.x) || 0;
    let dirY = Number(direction?.y) || 0;

    if (directionMode === 'relative') {
      const rotatedDirX = dirX * Math.cos(rotation) - dirY * Math.sin(rotation);
      const rotatedDirY = dirX * Math.sin(rotation) + dirY * Math.cos(rotation);
      dirX = rotatedDirX * (Number(mirrorDirection?.x) || 1);
      dirY = rotatedDirY * (Number(mirrorDirection?.y) || 1);
    }

    const len = Math.sqrt(dirX * dirX + dirY * dirY);
    if (len > 0) {
      dirX /= len;
      dirY /= len;
    } else {
      dirX = 1;
      dirY = 0;
    }

    const baseAngle = Math.atan2(dirY, dirX);
    const fovRad = (Math.max(1, Math.min(360, Number(fovAngle) || 90)) * Math.PI) / 180;
    return { baseAngle, fovRad };
  }

  /**
   * Создать градиент для направленного света
   */
  _createGlobalLightGradient(bounds, angle, alpha) {
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const centerX = bounds.minX + width / 2;
    const centerY = bounds.minY + height / 2;

    // Направление света (откуда светит)
    const radians = (angle - 90) * (Math.PI / 180);
    const dirX = Math.cos(radians);
    const dirY = Math.sin(radians);

    // Создаём Graphics с градиентом
    const graphics = new PIXI.Graphics();

    // Для простоты используем несколько полос для имитации градиента
    // PixiJS v8 не поддерживает нативный градиент в Graphics
    const steps = 20;
    const stepAlpha = alpha / steps;

    for (let i = 0; i < steps; i++) {
      const progress = i / steps;
      const currentAlpha = stepAlpha * (steps - i);

      // Сдвигаем прямоугольник в направлении, противоположном свету
      const offsetX = -dirX * width * progress * 0.5;
      const offsetY = -dirY * height * progress * 0.5;

      const rectWidth = width * (1 - progress * 0.3);
      const rectHeight = height * (1 - progress * 0.3);
      const rectX = centerX - rectWidth / 2 + offsetX;
      const rectY = centerY - rectHeight / 2 + offsetY;

      graphics.rect(rectX, rectY, rectWidth, rectHeight);
      graphics.fill({ color: 0x000000, alpha: currentAlpha });
    }

    return graphics;
  }

  _renderRegions(camera) {
    if (!camera.worldBackgroundLayer || !camera.world) return;

    const regionSystem = camera.world.regionSystem;
    if (!regionSystem || regionSystem.regions.size === 0) return;

    const showRegions = camera.isTypeVisible('regions');
    const showRegionBorders = camera.isTypeVisible('regionBorders');

    if (!showRegions && !showRegionBorders) return;

    console.log(`🗺️ _renderRegions: ${regionSystem.regions.size} regions (showRegions=${showRegions}, showBorders=${showRegionBorders})`);

    // Рендерим регионы по приоритету
    const sortedRegions = Array.from(regionSystem.regions.values())
      .sort((a, b) => b.bounds.priority - a.bounds.priority);

    for (const region of sortedRegions) {
      const regionType = region.regionType;
      const bounds = region.bounds;

      // 🎨 Рендерим текстуру региона если есть
      if (showRegions && regionType.groundTexture?.textureUrl) {
        this._renderRegionTexture(camera, regionType, bounds);
      }

      // 🔲 Рендерим границы региона если включены
      if (showRegionBorders && regionType.borders?.enabled) {
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

  /**
   * ⬡ Рендеринг гексагональной сетки
   */
  _renderHexGrid(camera) {
    if (!camera.worldBackgroundLayer || !camera.world) return;

    const hexTileSystem = camera.world.hexTileSystem;
    if (!hexTileSystem || !hexTileSystem.showGrid) return;

    const bounds = camera._getWorldBoundsInView();
    const hexSize = hexTileSystem.hexSize;
    const orientation = hexTileSystem.orientation;

    // If hexes are too small on screen, don't draw the grid (too expensive / visually noisy).
    const hexPixelRadius = hexSize * (Number(camera.zoom) || 1);
    if (hexPixelRadius < 6) return;

    // Reuse one Graphics per camera and redraw only when view changes enough.
    let cache = this._hexGridCache.get(camera.id);
    if (!cache) {
      cache = { graphics: new PIXI.Graphics(), lastKey: null };
      this._hexGridCache.set(camera.id, cache);
    }
    const graphics = cache.graphics;

    // Ensure it's attached (worldBackgroundLayer is cleared each frame).
    if (graphics.parent !== camera.worldBackgroundLayer) {
      camera.worldBackgroundLayer.addChild(graphics);
    }

    // Redraw throttling key based on quantized world bounds + settings.
    // Quantization prevents full rebuild every frame during smooth panning.
    const gran = Math.max(1, hexSize); // world units
    const key = [
      Math.floor(bounds.minX / gran),
      Math.floor(bounds.minY / gran),
      Math.floor(bounds.maxX / gran),
      Math.floor(bounds.maxY / gran),
      Math.round((Number(camera.zoom) || 1) * 1000),
      hexSize,
      orientation,
      hexTileSystem.gridColor,
      hexTileSystem.gridAlpha,
      hexTileSystem.gridLineWidth
    ].join('|');

    if (cache.lastKey === key) {
      // No meaningful change -> keep existing geometry
      return;
    }
    cache.lastKey = key;

    graphics.clear();
    graphics.setStrokeStyle({
      color: hexTileSystem.gridColor || '#444444',
      width: hexTileSystem.gridLineWidth || 1,
      alpha: hexTileSystem.gridAlpha || 0.3
    });

    // Находим границы в hex координатах с запасом.
    // ВАЖНО: для axial-координат нельзя корректно получить min/max (q,r),
    // используя только (minX,minY) и (maxX,maxY) — по диагональным углам
    // будут пропуски (особенно заметно при зуме/панорамировании).
    const pad = hexSize * 3;
    const corners = [
      { x: bounds.minX - pad, y: bounds.minY - pad },
      { x: bounds.minX - pad, y: bounds.maxY + pad },
      { x: bounds.maxX + pad, y: bounds.minY - pad },
      { x: bounds.maxX + pad, y: bounds.maxY + pad }
    ];
    const cornerHexes = corners.map(p => hexTileSystem.worldToHex(p.x, p.y));
    let minQ = Math.min(...cornerHexes.map(h => h.q));
    let maxQ = Math.max(...cornerHexes.map(h => h.q));
    let minR = Math.min(...cornerHexes.map(h => h.r));
    let maxR = Math.max(...cornerHexes.map(h => h.r));

    // Доп. запас на округления worldToHex на границах
    const axialPadding = 2;
    minQ -= axialPadding;
    maxQ += axialPadding;
    minR -= axialPadding;
    maxR += axialPadding;

    // Hard safety cap to avoid crashing browser when zoomed out too far.
    const total = (maxQ - minQ + 1) * (maxR - minR + 1);
    const MAX_HEXES = 12000;
    if (total > MAX_HEXES) {
      // Keep empty graphics; user can zoom in for details.
      return;
    }

    // Рендерим все гексы в видимой области
    for (let q = minQ; q <= maxQ; q++) {
      for (let r = minR; r <= maxR; r++) {
        const center = hexTileSystem.hexToWorld(q, r, 'center');
        
        // Пропускаем гексы далеко за пределами видимости
        if (center.x < bounds.minX - pad || center.x > bounds.maxX + pad ||
            center.y < bounds.minY - pad || center.y > bounds.maxY + pad) {
          continue;
        }

        // Рисуем гекс
        const vertices = hexTileSystem.getHexVertices(q, r);
        this._drawHexPath(graphics, vertices);
      }
    }

    graphics.stroke();
  }

  /**
   * Нарисовать путь гекса
   */
  _drawHexPath(graphics, vertices) {
    if (vertices.length < 6) return;

    graphics.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
      graphics.lineTo(vertices[i].x, vertices[i].y);
    }
    graphics.lineTo(vertices[0].x, vertices[0].y);
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

  // ---------------------------
  // UI Entities Management
  // ---------------------------

  /**
   * Add UI entity to canvas
   * @param {Object} uiEntity - { id, subtype, bindingLabel, instance: { canvasId, cameraId, worldId, position, rotation, scale, visible, opacity, z_index, text, button } }
   */
  addUIEntity(uiEntity) {
    this.uiEntities.set(uiEntity.id, uiEntity);
  }

  /**
   * Remove UI entity from canvas
   * @param {string} uiEntityId
   */
  removeUIEntity(uiEntityId) {
    // Destroy all PIXI objects for this UI entity
    const prefix = `ui:${uiEntityId}::`;
    for (const [key, obj] of this.uiDisplayCache) {
      if (key.startsWith(prefix)) {
        obj.destroy({ children: true });
        this.uiDisplayCache.delete(key);
      }
    }

    this.uiEntities.delete(uiEntityId);
  }

  /**
   * Update UI entity
   * @param {Object} uiEntity - updated uiEntity
   */
  updateUIEntity(uiEntity) {
    this.uiEntities.set(uiEntity.id, uiEntity);
  }

  /**
   * Render UI entities for all cameras
   */
  _renderAllUIEntities() {
    for (const uiEntity of this.uiEntities.values()) {
      this._renderUIEntity(uiEntity);
    }
  }

  /**
   * Render a single UI entity to appropriate layers
   * @param {Object} uiEntity
   */
  _renderUIEntity(uiEntity) {
    const ent = uiEntity.instance;

    if (ent.canvasId) {
      this._renderUIToCanvasLayer(uiEntity);
    } else if (ent.cameraId) {
      this._renderUIToCameraLayer(uiEntity);
    } else if (ent.worldId) {
      this._renderUIToWorldLayer(uiEntity);
    }
  }

  /**
   * Render UI to canvas layer (screen-space)
   */
  _renderUIToCanvasLayer(uiEntity) {
    const canvasId = uiEntity.instance.canvasId;
    if (canvasId !== this.id) return;

    const key = `ui:${uiEntity.id}::canvas:${canvasId}`;
    let displayObj = this.uiDisplayCache.get(key);

    if (!displayObj) {
      displayObj = this._createUIDisplayObject(uiEntity);
      this.uiDisplayCache.set(key, displayObj);
    }

    this._updateUIDisplayObject(displayObj, uiEntity);

    if (displayObj.parent !== this._uiOverlay) {
      this._uiOverlay.addChild(displayObj);
    }
  }

  /**
   * Render UI to camera layer (camera viewport coords)
   */
  _renderUIToCameraLayer(uiEntity) {
    const cameraId = uiEntity.instance.cameraId;
    const camera = this.cameras.get(cameraId);
    if (!camera) return;

    // Skip if UI entities hidden for this camera
    if (!camera.isTypeVisible('uiEntities')) {
      const key = `ui:${uiEntity.id}::camera:${cameraId}`;
      const displayObj = this.uiDisplayCache.get(key);
      if (displayObj && displayObj.parent === camera.cameraUILayer) {
        camera.cameraUILayer.removeChild(displayObj);
      }
      return;
    }

    const key = `ui:${uiEntity.id}::camera:${cameraId}`;
    let displayObj = this.uiDisplayCache.get(key);

    if (!displayObj) {
      displayObj = this._createUIDisplayObject(uiEntity, { type: 'camera', camera });
      this.uiDisplayCache.set(key, displayObj);
    }

    this._updateUIDisplayObject(displayObj, uiEntity);

    if (displayObj.parent !== camera.cameraUILayer) {
      camera.cameraUILayer.addChild(displayObj);
    }
  }

  /**
   * Render UI to world layer (world coords, affected by focus/zoom)
   */
  _renderUIToWorldLayer(uiEntity) {
    const worldId = uiEntity.instance.worldId;

    // Render to all cameras that watch this world and have UI enabled
    for (const camera of this.cameras.values()) {
      if (camera.worldId !== worldId) continue;

      const key = `ui:${uiEntity.id}::world:${worldId}::camera:${camera.id}`;

      // Skip if UI entities hidden for this camera
      if (!camera.isTypeVisible('uiEntities')) {
        const displayObj = this.uiDisplayCache.get(key);
        if (displayObj && displayObj.parent === camera.worldUILayer) {
          camera.worldUILayer.removeChild(displayObj);
        }
        continue;
      }

      let displayObj = this.uiDisplayCache.get(key);

      if (!displayObj) {
        displayObj = this._createUIDisplayObject(uiEntity);
        this.uiDisplayCache.set(key, displayObj);
      }

      this._updateUIDisplayObject(displayObj, uiEntity);

      if (displayObj.parent !== camera.worldUILayer) {
        camera.worldUILayer.addChild(displayObj);
      }
    }

    // Cleanup orphaned UI objects for removed cameras
    const prefix = `ui:${uiEntity.id}::world:${worldId}::camera:`;
    const activeCameraIds = new Set(
      Array.from(this.cameras.values())
        .filter(c => c.worldId === worldId && c.isTypeVisible('uiEntities'))
        .map(c => c.id)
    );

    for (const [key, obj] of this.uiDisplayCache) {
      if (!key.startsWith(prefix)) continue;
      const cameraId = key.substring(prefix.length);
      if (!activeCameraIds.has(cameraId)) {
        obj.destroy({ children: true });
        this.uiDisplayCache.delete(key);
      }
    }
  }

  /**
   * Create PIXI display object for UI entity
   */
  _createUIDisplayObject(uiEntity, ctx = {}) {
    return createPixiDisplayObjectForUI(uiEntity.instance, {
      onAction: this._handleUIAction.bind(this)
    });
  }

  /**
   * Update UI display object properties
   */
  _updateUIDisplayObject(displayObj, uiEntity) {
    const ent = uiEntity.instance;
    const position = ent.position || { x: 0, y: 0 };

    displayObj.position.set(position.x, position.y);

    if (ent.rotation) displayObj.rotation = ent.rotation;

    const scale = ent.scale || { x: 1, y: 1 };
    if (displayObj.scale?.set) {
      displayObj.scale.set(scale.x, scale.y);
    } else {
      displayObj.scale = scale;
    }

    displayObj.alpha = Number.isFinite(ent.opacity) ? ent.opacity : 1;
    displayObj.visible = ent.visible !== false;
    displayObj.zIndex = Number.isFinite(ent.z_index) ? ent.z_index : 9999;
  }

  /**
   * Handle UI action
   */
  _handleUIAction(actionId, payload, entity) {
    console.log('[UI ACTION]', { actionId, payload, entity });
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

    // Destroy cached hex grid graphics
    for (const cache of this._hexGridCache.values()) {
      try { cache.graphics?.destroy?.({ children: true }); } catch (_) {}
    }
    this._hexGridCache.clear();

    // Clean up all UI cache
    for (const [key, obj] of this.uiDisplayCache) {
      obj.destroy({ children: true });
    }
    this.uiDisplayCache.clear();
    this.uiEntities.clear();

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
      cameraCount: this.cameras.size,
      uiEntityCount: this.uiEntities.size
    };
  }
}
