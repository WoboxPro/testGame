<template>
  <div class="test2-page">
    <header class="header">
      <h1>🌍 World Loader - Test2</h1>
      <p class="subtitle">Paste JSON from test1 to load world</p>
    </header>

    <main class="main">
      <div class="load-section">
        <div class="load-header">
          <h2>📋 Load World from JSON</h2>
          <button class="btn btn--secondary" @click="loadSample">Load Sample</button>
        </div>

        <textarea
          class="json-input"
          v-model="jsonInput"
          placeholder='Paste JSON here: { "version": "1.0", "worlds": [...], "canvases": [...], ... }'
          spellcheck="false"
        ></textarea>

        <div class="load-actions">
          <div class="load-status">
            <span v-if="loadStatus" :class="`load-status--${loadStatus.type}`">
              {{ loadStatus.message }}
            </span>
          </div>
          <button class="btn btn--primary btn--large" @click="loadFromJson" :disabled="!jsonInput.trim()">
            🚀 Load World
          </button>
        </div>
      </div>

      <div class="viewport-section" v-if="worlds.length > 0 || canvases.length > 0">
        <div class="viewport-header">
          <h2>🎮 Viewport</h2>
          <div class="viewport-controls">
            <span class="viewport-info">
              Worlds: {{ worlds.length }} |
              Canvases: {{ canvases.length }} |
              Cameras: {{ cameras.length }} |
              Controllers: {{ controllers.length }}
            </span>
            <button class="btn btn--secondary" @click="resetAll">♻️ Reset</button>
          </div>
        </div>

        <div class="canvases-grid">
          <div
            v-for="canvas in canvases"
            :key="canvas.id"
            class="canvas-container"
            :ref="el => setCanvasHost(canvas.id, el)"
          ></div>
        </div>
      </div>

      <div class="empty-state" v-else>
        <div class="empty-icon">📁</div>
        <h3>No world loaded</h3>
        <p>Paste JSON from test1 and click "Load World"</p>
      </div>
    </main>
  </div>
</template>

<script setup>
import { markRaw, onMounted, onUnmounted, reactive, ref } from 'vue';
import { World } from '../../pixi_game2/pixigame/src/World.js';
import { Region } from '../../pixi_game2/pixigame/src/Region.js';
import { Canvas, Camera } from '../../pixi_game2/pixigame-renderer/src/index.js';
import { UITextEntity, UIButtonEntity } from '../../pixi_game2/pixigame/src/entities/UIEntities.js';
import { createPixiDisplayObjectForUI } from '../../pixi_game2/pixigame-renderer/src/UIRenderer.js';
import { CameraController } from '../../pixi_game2/pixigame/src/CameraController.js';
import * as PIXI from 'pixi.js';

// State
const jsonInput = ref('');
const loadStatus = ref(null);

const worlds = reactive([]);
const canvases = reactive([]);
const cameras = reactive([]);
const uiEntities = reactive([]);
const regions = reactive([]);
const controllers = reactive([]);

// canvasId -> DOM element
const canvasHosts = new Map();
function setCanvasHost(canvasId, el) {
  if (el) canvasHosts.set(canvasId, el);
  else canvasHosts.delete(canvasId);
}

// ---------------------------
// Load from JSON
// ---------------------------

function loadSample() {
  const sampleConfig = {
    version: "1.0",
    timestamp: new Date().toISOString(),
    worlds: [
      {
        id: "world_1",
        type: "bounded",
        width: 1000,
        height: 1000,
        backgroundColor: "#1a1a2e",
        showBounds: true,
        boundsColor: "#FF4444",
        backgroundTexture: {
          textureUrl: "/assets/ui-test.png",
          scaleMode: "tile",
          tint: null
        },
        regions: []
      }
    ],
    canvases: [
      {
        id: "canvas_1",
        sizeMode: "fixed",
        width: 800,
        height: 600,
        backgroundColor: "#000000",
        antialias: true,
        resolution: 1,
        cameraCount: 1
      }
    ],
    cameras: [
      {
        id: "camera_1",
        canvasId: "canvas_1",
        worldId: "world_1",
        anchor: "center",
        width: 800,
        height: 600,
        x: 0,
        y: 0,
        focusX: 500,
        focusY: 500,
        zoom: 1,
        minZoom: 0.1,
        maxZoom: 5,
        priority: 0
      }
    ],
    uiEntities: [
      {
        id: "ui_text_1",
        subtype: "text",
        canvasId: "canvas_1",
        cameraId: null,
        worldId: null,
        bindingLabel: "canvas:canvas_1",
        screenSpace: true,
        position: { x: 20, y: 20 },
        rotation: 0,
        scale: { x: 1, y: 1 },
        visible: true,
        opacity: 1,
        z_index: 9999,
        text: {
          content: "Hello from test2!",
          fontSize: 24,
          fontFamily: "Arial",
          color: "#ffffff",
          align: "left",
          wordWrap: false,
          wordWrapWidth: 0
        }
      },
      {
        id: "ui_button_1",
        subtype: "button",
        canvasId: "canvas_1",
        cameraId: null,
        worldId: null,
        bindingLabel: "canvas:canvas_1",
        screenSpace: true,
        position: { x: 20, y: 60 },
        rotation: 0,
        scale: { x: 1, y: 1 },
        visible: true,
        opacity: 1,
        z_index: 9999,
        text: {
          content: "Click Me",
          fontSize: 16,
          fontFamily: "Arial",
          textColor: "#111111"
        },
        button: {
          width: 160,
          height: 44,
          background: {
            color: "#4fc3f7",
            colorHover: "#29b6f6",
            textureUrl: null,
            textureUrlHover: null,
            scaleMode: "stretch",
            tint: null,
            tintHover: null
          },
          actionId: "console_log",
          actionPayload: { message: "Button clicked!" }
        }
      }
    ],
    regions: [
      {
        id: "region_1",
        worldId: "world_1",
        name: "grass_region",
        displayName: "Grass Region",
        bounds: {
          x: 100,
          y: 100,
          width: 400,
          height: 400,
          priority: 1
        },
        groundTexture: {
          textureUrl: "/assets/ui-test.png",
          scaleMode: "tile",
          tint: "#4ade80"
        },
        borders: {
          enabled: true,
          color: "#00FFFF",
          width: 3,
          alpha: 1.0
        }
      }
    ],
    controllers: [
      {
        id: "controller_1",
        type: "camera",
        targetId: "camera_1",
        moveSpeed: 500,
        zoomSpeed: 2,
        minZoom: 0.1,
        maxZoom: 5.0
      }
    ],
    summary: {
      worldCount: 1,
      canvasCount: 1,
      cameraCount: 1,
      uiEntityCount: 2,
      regionCount: 1,
      controllerCount: 1
    }
  };

  jsonInput.value = JSON.stringify(sampleConfig, null, 2);
  showStatus('success', 'Sample JSON loaded! Click "Load World" to create.');
}

/**
 * 🎨 Предзагрузка всех текстур из конфига
 * Использует PIXI.Assets для асинхронной загрузки текстур
 */
async function preloadAllTextures(config) {
  const textureUrls = new Set();

  // Собираем все URL текстур из миров
  if (config.worlds) {
    for (const world of config.worlds) {
      if (world.backgroundTexture?.textureUrl) {
        textureUrls.add(world.backgroundTexture.textureUrl);
      }
    }
  }

  // Собираем все URL текстур из регионов
  if (config.regions) {
    for (const region of config.regions) {
      if (region.groundTexture?.textureUrl) {
        textureUrls.add(region.groundTexture.textureUrl);
      }
    }
  }

  // Собираем все URL текстур из UI элементов (кнопки и прочее)
  if (config.uiEntities) {
    for (const ui of config.uiEntities) {
      if (ui.button?.background?.textureUrl) {
        textureUrls.add(ui.button.background.textureUrl);
      }
      if (ui.button?.background?.textureUrlHover) {
        textureUrls.add(ui.button.background.textureUrlHover);
      }
    }
  }

  if (textureUrls.size === 0) {
    console.log('🎨 No textures to preload');
    return;
  }

  console.log(`🎨 Preloading ${textureUrls.size} textures...`, Array.from(textureUrls));

  try {
    // Используем PIXI.Assets для предзагрузки
    const urls = Array.from(textureUrls);
    await Promise.all(urls.map(url => {
      // Для каждой текстуры используем Assets.load
      // Это добавит текстуру в кэш PIXI
      return PIXI.Assets.load(url).catch(err => {
        console.warn(`⚠️ Failed to load texture: ${url}`, err);
        // Не прерываем загрузку при ошибке одной текстуры
      });
    }));

    console.log('✅ All textures preloaded successfully');
  } catch (error) {
    console.warn('⚠️ Some textures failed to preload, but continuing...', error);
  }
}

async function loadFromJson() {
  try {
    // Reset existing
    resetAll();

    // Parse JSON
    const config = JSON.parse(jsonInput.value);

    if (!config.worlds || !Array.isArray(config.worlds)) {
      throw new Error('Invalid JSON: missing or invalid "worlds" array');
    }

    // Load worlds first (everything depends on them)
    for (const worldConfig of config.worlds) {
      await loadWorld(worldConfig);
    }

    // Load canvases
    if (config.canvases) {
      for (const canvasConfig of config.canvases) {
        await loadCanvas(canvasConfig);
      }
    }

    // Load cameras
    if (config.cameras) {
      for (const cameraConfig of config.cameras) {
        loadCamera(cameraConfig);
      }
    }

    // Load UI entities
    if (config.uiEntities) {
      for (const uiConfig of config.uiEntities) {
        loadUIEntity(uiConfig);
      }
    }

    // Load regions
    if (config.regions) {
      for (const regionConfig of config.regions) {
        loadRegion(regionConfig);
      }
    }

    // Load controllers
    if (config.controllers) {
      for (const controllerConfig of config.controllers) {
        loadController(controllerConfig);
      }
    }

    // 🎨 Предзагружаем все текстуры перед стартом
    showStatus('success', 'Loading textures...');
    await preloadAllTextures(config);

    // Start canvases
    await startAllCanvases();

    // Log camera info for debugging
    for (const cameraModel of cameras) {
      const cam = cameraModel.instance;
      console.log(`📷 Camera: ${cameraModel.id}, focus=${cam.focusX},${cam.focusY}, zoom=${cam.zoom}`);
      console.log(`📷 Camera world: ${cam.world?.id}, bgColor: ${cam.worldBackgroundColor}`);
      console.log(`📷 Camera showBounds: ${cam.world?.showBounds}, boundsColor: ${cam.world?.boundsColor}`);
      console.log(`📷 Camera _isInitialized: ${cam._isInitialized}`);
      console.log(`📷 Camera worldLayer exists: ${!!cam.worldLayer}, worldBackgroundLayer exists: ${!!cam.worldBackgroundLayer}, worldBoundsLayer exists: ${!!cam.worldBoundsLayer}`);
    }

    // Log regions info
    for (const worldModel of worlds) {
      const regions = worldModel.instance.regionSystem.getAllRegions();
      console.log(`🗺️ World ${worldModel.id} has ${regions.length} regions:`, regions);
    }

    // Start render loop
    startRenderLoop();

    showStatus('success', `Loaded: ${worlds.length} worlds, ${canvases.length} canvases, ${cameras.length} cameras`);

  } catch (error) {
    console.error('Load error:', error);
    showStatus('error', `Error: ${error.message}`);
  }
}

async function loadWorld(config) {
  const instance = markRaw(new World({
    id: config.id,
    type: config.type,
    width: config.width,
    height: config.height,
    backgroundColor: config.backgroundColor,
    showBounds: config.showBounds,
    boundsColor: config.boundsColor,
    backgroundTexture: config.backgroundTexture
  }));

  worlds.push({
    id: config.id,
    type: config.type,
    width: config.width,
    height: config.height,
    backgroundColor: config.backgroundColor,
    instance
  });

  console.log(`✅ World loaded: ${config.id}`);
}

async function loadCanvas(config) {
  const instance = markRaw(new Canvas({
    id: config.id,
    sizeMode: config.sizeMode,
    width: config.width,
    height: config.height,
    backgroundColor: config.backgroundColor,
    antialias: config.antialias,
    resolution: config.resolution
  }));

  canvases.push({
    id: config.id,
    sizeMode: config.sizeMode,
    width: config.width,
    height: config.height,
    backgroundColor: config.backgroundColor,
    antialias: config.antialias,
    resolution: config.resolution,
    instance
  });

  console.log(`✅ Canvas loaded: ${config.id}`);
}

function loadCamera(config) {
  const canvasModel = canvases.find(c => c.id === config.canvasId);
  const worldModel = worlds.find(w => w.id === config.worldId);

  if (!canvasModel) {
    console.warn(`⚠️ Canvas ${config.canvasId} not found for camera ${config.id}`);
    return;
  }
  if (!worldModel) {
    console.warn(`⚠️ World ${config.worldId} not found for camera ${config.id}`);
    return;
  }

  const instance = markRaw(new Camera({
    id: config.id,
    canvas: canvasModel.instance,
    world: worldModel.instance,
    anchor: config.anchor,
    width: config.width,
    height: config.height,
    x: config.x,
    y: config.y,
    focusX: config.focusX,
    focusY: config.focusY,
    zoom: config.zoom,
    minZoom: config.minZoom,
    maxZoom: config.maxZoom,
    priority: config.priority,
    worldBackgroundColor: worldModel.backgroundColor  // Устанавливаем цвет фона мира
  }));

  cameras.push({
    id: config.id,
    canvasId: config.canvasId,
    worldId: config.worldId,
    anchor: config.anchor,
    width: config.width,
    height: config.height,
    x: config.x,
    y: config.y,
    focusX: config.focusX,
    focusY: config.focusY,
    zoom: config.zoom,
    minZoom: config.minZoom,
    maxZoom: config.maxZoom,
    priority: config.priority,
    instance
  });

  console.log(`✅ Camera loaded: ${config.id}`);
}

function loadUIEntity(config) {
  const canvasModel = canvases.find(c => c.id === config.canvasId);
  const cameraModel = cameras.find(c => c.id === config.cameraId);
  const worldModel = worlds.find(w => w.id === config.worldId);

  let binding = null;
  if (canvasModel) binding = { canvasId: config.canvasId, canvas: canvasModel.instance };
  else if (cameraModel) binding = { cameraId: config.cameraId, camera: cameraModel.instance };
  else if (worldModel) binding = { worldId: config.worldId, world: worldModel.instance };

  if (!binding) {
    console.warn(`⚠️ No binding found for UI entity ${config.id}`);
    return;
  }

  let instance;
  if (config.subtype === 'text') {
    instance = markRaw(new UITextEntity({
      id: config.id,
      ...binding,
      position: config.position,
      rotation: config.rotation,
      scale: config.scale,
      visible: config.visible,
      opacity: config.opacity,
      z_index: config.z_index,
      screenSpace: config.screenSpace,
      text: config.text
    }));
  } else if (config.subtype === 'button') {
    instance = markRaw(new UIButtonEntity({
      id: config.id,
      ...binding,
      position: config.position,
      rotation: config.rotation,
      scale: config.scale,
      visible: config.visible,
      opacity: config.opacity,
      z_index: config.z_index,
      screenSpace: config.screenSpace,
      text: config.text,
      button: config.button
    }));
  }

  if (!instance) return;

  const bindingLabel = binding.canvasId ? `canvas:${binding.canvasId}` :
                       binding.cameraId ? `camera:${binding.cameraId}` :
                       `world:${binding.worldId}`;

  uiEntities.push({
    id: config.id,
    subtype: config.subtype,
    bindingLabel,
    instance
  });

  console.log(`✅ UI entity loaded: ${config.id} (${config.subtype})`);
}

function loadRegion(config) {
  const worldModel = worlds.find(w => w.id === config.worldId);
  if (!worldModel) {
    console.warn(`⚠️ World ${config.worldId} not found for region ${config.id}`);
    return;
  }

  const regionType = markRaw(new Region({
    id: `region_type_${config.id}`,
    name: config.name,
    displayName: config.displayName,
    groundTexture: config.groundTexture,
    borders: config.borders
  }));

  const regionInstanceId = worldModel.instance.regionSystem.addRegion(regionType, config.bounds);

  regions.push({
    id: config.id,
    name: config.name,
    displayName: config.displayName,
    worldId: config.worldId,
    bounds: config.bounds,
    regionType,
    regionInstanceId
  });

  console.log(`✅ Region loaded: ${config.displayName}`);
}

function loadController(config) {
  if (config.type !== 'camera') {
    console.warn(`⚠️ Only camera controllers are supported currently`);
    return;
  }

  const cameraModel = cameras.find(c => c.id === config.targetId);
  if (!cameraModel) {
    console.warn(`⚠️ Camera ${config.targetId} not found for controller ${config.id}`);
    return;
  }

  const instance = markRaw(new CameraController({
    id: config.id,
    target: cameraModel.instance,
    targetId: config.targetId,
    moveSpeed: config.moveSpeed || 500,
    zoomSpeed: config.zoomSpeed || 2,
    minZoom: config.minZoom || 0.1,
    maxZoom: config.maxZoom || 5.0,
    bindings: config.bindings // Custom bindings or undefined (uses defaults)
  }));

  // Передаём все камеры для переключения
  instance.setAllCameras(cameras.map(c => c.instance));

  controllers.push({
    id: config.id,
    type: config.type,
    targetId: config.targetId,
    instance
  });

  console.log(`✅ Controller loaded: ${config.id}`);
}

async function startAllCanvases() {
  // Start all canvases
  for (const canvasModel of canvases) {
    const host = canvasHosts.get(canvasModel.id);
    if (host) {
      await canvasModel.instance.start(host);
      console.log(`🚀 Canvas started: ${canvasModel.id}`);
    }
  }

  // Create UI overlays for canvases that need them
  for (const canvasModel of canvases) {
    if (!canvasModel.uiOverlay && canvasModel.instance.app) {
      const layer = markRaw(new PIXI.Container());
      try { layer.sortableChildren = true; } catch (_) {}
      layer.zIndex = 50000;
      canvasModel.instance.app.stage.addChild(layer);
      canvasModel.uiOverlay = layer;
      console.log(`✅ UI overlay created for canvas: ${canvasModel.id}`);
    }
  }

  // Add UI entities to canvases
  for (const uiModel of uiEntities) {
    const u = uiModel.instance;

    if (u.canvasId) {
      const canvasModel = canvases.find(c => c.id === u.canvasId);
      if (canvasModel && canvasModel.uiOverlay) {
        const displayObj = markRaw(createPixiDisplayObjectForUI(u, {
          onAction: (actionId, payload) => handleUIAction(actionId, payload, u)
        }));

        if (displayObj) {
          uiModel.displayObject = displayObj;
          canvasModel.uiOverlay.addChild(displayObj);

          // Set initial transform
          displayObj.x = u.position?.x || 0;
          displayObj.y = u.position?.y || 0;
          displayObj.rotation = u.rotation || 0;
          if (displayObj.scale?.set) {
            displayObj.scale.set(u.scale?.x || 1, u.scale?.y || 1);
          }
          displayObj.alpha = u.opacity ?? 1;
          displayObj.visible = u.visible !== false;
          displayObj.zIndex = u.z_index ?? 9999;

          console.log(`✅ UI entity added to canvas: ${uiModel.id}`);
        }
      }
    }
  }
}

function handleUIAction(actionId, payload, entity) {
  if (actionId === 'console_log') {
    console.log(payload?.message ?? '[UI ACTION]', { actionId, payload, entity });
    return;
  }
  console.log('[UI ACTION]', { actionId, payload, entity });
}

// PixiGame state
let pixiGame = null;
let rafId = null;
let lastTime = performance.now();

function startRenderLoop() {
  if (rafId) return;

  const loop = () => {
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    // Update all controllers
    for (const controller of controllers) {
      controller.instance.update(dt);
    }

    for (const canvasModel of canvases) {
      canvasModel.instance.render();
    }
    rafId = requestAnimationFrame(loop);
  };

  rafId = requestAnimationFrame(loop);
}

// ---------------------------
// Reset
// ---------------------------

function resetAll() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  // Destroy UI overlays
  for (const canvasModel of canvases) {
    if (canvasModel.uiOverlay) {
      try {
        canvasModel.uiOverlay.destroy({ children: true });
      } catch (e) {
        console.warn(`Error destroying UI overlay:`, e);
      }
      canvasModel.uiOverlay = null;
    }
  }

  // Stop all canvases
  for (const canvasModel of canvases) {
    try {
      canvasModel.instance.destroy();
    } catch (e) {
      console.warn(`Error destroying canvas ${canvasModel.id}:`, e);
    }
  }

  // Clear all arrays
  worlds.length = 0;
  canvases.length = 0;
  cameras.length = 0;
  uiEntities.length = 0;
  regions.length = 0;
  controllers.length = 0;

  // Clear canvas hosts
  canvasHosts.clear();

  console.log('🧹 All cleared');
}

// ---------------------------
// Status
// ---------------------------

function showStatus(type, message) {
  loadStatus.value = { type, message };
  setTimeout(() => {
    if (loadStatus.value?.message === message) {
      loadStatus.value = null;
    }
  }, 5000);
}

// ---------------------------
// Lifecycle
// ---------------------------

// Input handling for controllers
function onKeyDown(e) {
  // Pass key events to all controllers
  for (const controller of controllers) {
    controller.instance.handleKeyDown?.(e.code);
  }
}

function onKeyUp(e) {
  // Pass key events to all controllers
  for (const controller of controllers) {
    controller.instance.handleKeyUp?.(e.code);
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
  resetAll();
});
</script>

<style scoped>
.test2-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%);
  color: #e0e6ed;
  padding: 20px;
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.header h1 {
  font-size: 32px;
  margin: 0 0 8px 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  margin: 0;
}

.main {
  max-width: 1200px;
  margin: 0 auto;
}

/* Load Section */
.load-section {
  background: rgba(30, 30, 45, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.load-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.load-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.json-input {
  width: 100%;
  min-height: 250px;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(0, 0, 0, 0.3);
  color: #bfe7ff;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
}

.json-input:focus {
  outline: 2px solid rgba(79, 195, 247, 0.25);
  border-color: rgba(79, 195, 247, 0.30);
}

.load-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 15px;
}

.load-status {
  flex: 1;
}

.load-status--success {
  color: #4ade80;
  font-weight: 600;
}

.load-status--error {
  color: #f87171;
  font-weight: 600;
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn--primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn--primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn--primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn--secondary {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.btn--secondary:hover {
  background: rgba(255, 255, 255, 0.15);
}

.btn--large {
  padding: 12px 24px;
  font-size: 16px;
}

/* Viewport Section */
.viewport-section {
  background: rgba(30, 30, 45, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
}

.viewport-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.viewport-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.viewport-controls {
  display: flex;
  align-items: center;
  gap: 15px;
}

.viewport-info {
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
}

.canvases-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 15px;
}

.canvas-container {
  aspect-ratio: 4 / 3;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Empty State */
.empty-state {
  background: rgba(30, 30, 45, 0.5);
  border: 2px dashed rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-state h3 {
  margin: 0 0 10px 0;
  font-size: 24px;
  font-weight: 700;
}

.empty-state p {
  margin: 0;
  color: rgba(255, 255, 255, 0.5);
}
</style>
