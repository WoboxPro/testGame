<template>
  <div class="world-camera-test">
    <div class="canvas-container">
      <div ref="pixiContainer" class="pixi-canvas"></div>
    </div>
    
    <div class="control-panel">
      <h3>🌍 World Settings</h3>
      
      <div class="setting-group">
        <label>World Type:</label>
        <select v-model="worldSettings.type" @change="reinitWorld">
          <option value="bounded">Bounded</option>
          <option value="infinite">Infinite</option>
          <option value="circular">Circular</option>
        </select>
      </div>
      
      <div class="setting-group">
        <label>Width:</label>
        <input type="range" v-model.number="worldSettings.width" @change="reinitWorld" min="1000" max="10000" step="500"/>
        <span>{{ worldSettings.width }}</span>
      </div>
      
      <div class="setting-group">
        <label>Height:</label>
        <input type="range" v-model.number="worldSettings.height" @change="reinitWorld" min="1000" max="10000" step="500"/>
        <span>{{ worldSettings.height }}</span>
      </div>
      
      <div class="setting-group">
        <label>Show Borders:</label>
        <input type="checkbox" v-model="worldSettings.showBorders" @change="toggleBorders"/>
      </div>
      
      <hr/>
      
      <h3>📷 Camera Settings</h3>
      
      <div class="setting-group">
        <label>Zoom:</label>
        <input type="range" v-model.number="cameraSettings.zoom" @input="updateCamera" min="0.1" max="5" step="0.1"/>
        <span>{{ cameraSettings.zoom.toFixed(1) }}x</span>
      </div>
      
      <div class="setting-group">
        <label>Focus X:</label>
        <input type="range" v-model.number="cameraSettings.focusX" @input="updateCamera" min="-5000" max="5000" step="50"/>
        <span>{{ cameraSettings.focusX }}</span>
      </div>
      
      <div class="setting-group">
        <label>Focus Y:</label>
        <input type="range" v-model.number="cameraSettings.focusY" @input="updateCamera" min="-5000" max="5000" step="50"/>
        <span>{{ cameraSettings.focusY }}</span>
      </div>
      
      <div class="setting-group">
        <label>Anchor:</label>
        <select v-model="cameraSettings.anchor" @change="updateCamera">
          <option value="center">Center</option>
          <option value="topleft">Top Left</option>
          <option value="topright">Top Right</option>
          <option value="bottomleft">Bottom Left</option>
          <option value="bottomright">Bottom Right</option>
        </select>
      </div>
      
      <div class="setting-group">
        <label>Position Mode:</label>
        <select v-model="cameraSettings.positionMode" @change="updateCamera">
          <option value="absolute">Absolute</option>
          <option value="relative">Relative</option>
        </select>
      </div>
      
      <hr/>
      
      <h3>🎮 Controls</h3>
      <p class="info">WASD - Move camera | Mouse wheel - Zoom</p>
      
      <div class="buttons">
        <button @click="addRandomEntity">➕ Add Entity</button>
        <button @click="addMultipleEntities(10)">➕ Add 10 Entities</button>
        <button @click="clearEntities">🗑️ Clear All</button>
      </div>
      
      <hr/>
      
      <div class="info-panel">
        <h4>Info:</h4>
        <p>Entities: {{ entityCount }}</p>
        <p>Camera: {{ cameraSettings.anchor }} @ ({{ cameraSettings.focusX }}, {{ cameraSettings.focusY }})</p>
        <p>Zoom: {{ cameraSettings.zoom.toFixed(1) }}x</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, reactive } from 'vue';
import * as PIXI from 'pixi.js';
import { World } from '../../../pixi_game/pixigame/src/core/World.js';
import { Canvas } from '../../../pixi_game/pixigame-renderer/src/Canvas.js';
import { Camera } from '../../../pixi_game/pixigame-renderer/src/Camera.js';

const pixiContainer = ref(null);

const worldSettings = reactive({
  type: 'bounded',
  width: 5000,
  height: 5000,
  showBorders: true
});

const cameraSettings = reactive({
  zoom: 1.0,
  focusX: 0,
  focusY: 0,
  anchor: 'center',
  positionMode: 'absolute'
});

const entityCount = ref(0);

let world = null;
let canvas = null;
let camera = null;
let worldBorderGraphics = null;

const keys = {};
let animationFrameId = null;

onMounted(async () => {
  if (process.client && pixiContainer.value) {
    await initGame();
  }
});

onUnmounted(() => {
  cleanup();
});

async function initGame() {
  cleanup();
  
  world = new World({
    type: worldSettings.type,
    width: worldSettings.width,
    height: worldSettings.height,
    backgroundColor: '#000000'
  });
  
  canvas = new Canvas({
    sizeMode: 'fixed',
    width: 800,
    height: 600,
    backgroundColor: '#1a1a1a',
    containerId: 'pixi-container'
  });
  
  camera = new Camera({
    width: 800,
    height: 600,
    x: 0,
    y: 0,
    positionMode: cameraSettings.positionMode,
    anchor: cameraSettings.anchor,
    focusX: cameraSettings.focusX,
    focusY: cameraSettings.focusY,
    zoom: cameraSettings.zoom,
    world: world,
    canvas: canvas
  });
  
  canvas.addCamera(camera);
  await canvas.start(pixiContainer.value, {});
  
  camera._initForCanvas(canvas);
  
  if (worldSettings.showBorders) {
    drawWorldBorders();
  }
  
  updateCamera();
  setupControls();
  
  animationFrameId = requestAnimationFrame(gameLoop);
  
  addMultipleEntities(5);
}

function drawWorldBorders() {
  if (!camera.worldLayer) return;
  
  if (worldBorderGraphics) {
    camera.worldLayer.removeChild(worldBorderGraphics);
    worldBorderGraphics.destroy();
  }
  
  worldBorderGraphics = new PIXI.Graphics();
  
  const halfWidth = world.width / 2;
  const halfHeight = world.height / 2;
  
  worldBorderGraphics.setStrokeStyle({ 
    width: world.borders.width,
    color: world.borders.color
  });
  
  if (worldSettings.type === 'circular') {
    worldBorderGraphics.rect(-halfWidth, -halfHeight, world.width, world.height);
  } else if (worldSettings.type === 'bounded') {
    worldBorderGraphics.rect(-halfWidth, -halfHeight, world.width, world.height);
  }
  
  worldBorderGraphics.stroke();
  
  camera.worldLayer.addChild(worldBorderGraphics);
}

function reinitWorld() {
  cleanup();
  initGame();
}

function toggleBorders() {
  if (worldSettings.showBorders) {
    drawWorldBorders();
  } else if (worldBorderGraphics && camera.worldLayer) {
    camera.worldLayer.removeChild(worldBorderGraphics);
    worldBorderGraphics.destroy();
    worldBorderGraphics = null;
  }
}

function updateCamera() {
  if (!camera) return;
  
  camera.setZoom(cameraSettings.zoom);
  camera.setFocus(cameraSettings.focusX, cameraSettings.focusY);
  camera.anchor = cameraSettings.anchor;
  camera.positionMode = cameraSettings.positionMode;
  
  camera._updateWorldPosition();
  camera._updateBorder();
}

function setupControls() {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('wheel', onWheel);
}

function onKeyDown(e) { keys[e.code] = true; }
function onKeyUp(e) { keys[e.code] = false; }

function onWheel(e) {
  if (!camera) return;
  
  const zoomSpeed = 0.1;
  const direction = e.deltaY > 0 ? -1 : 1;
  
  cameraSettings.zoom = Math.max(0.1, Math.min(5.0, cameraSettings.zoom + direction * zoomSpeed));
  updateCamera();
}

function addRandomEntity() {
  if (!world || !camera.worldLayer) return;
  
  const entityId = world.createEntity({
    position: {
      x: (Math.random() - 0.5) * world.width * 0.8,
      y: (Math.random() - 0.5) * world.height * 0.8
    },
    appearance: {
      color: Math.random() * 0xFFFFFF,
      size: 20 + Math.random() * 30,
      shape: Math.random() > 0.5 ? 'circle' : 'rect'
    }
  });
  
  const position = world.getComponent(entityId, 'position');
  const appearance = world.getComponent(entityId, 'appearance');
  
  const graphics = new PIXI.Graphics();
  
  if (appearance.shape === 'circle') {
    graphics.circle(0, 0, appearance.size / 2).fill(appearance.color);
  } else {
    graphics.rect(-appearance.size / 2, -appearance.size / 2, appearance.size, appearance.size).fill(appearance.color);
  }
  
  graphics.position.set(position.x, position.y);
  camera.worldLayer.addChild(graphics);
  
  world.addComponent(entityId, 'displayObject', graphics);
  
  entityCount.value = world.entities.size;
}

function addMultipleEntities(count) {
  for (let i = 0; i < count; i++) {
    addRandomEntity();
  }
}

function clearEntities() {
  if (!world || !camera.worldLayer) return;
  
  for (const [entityId, components] of world.entities) {
    const displayObject = components.get('displayObject');
    if (displayObject) {
      camera.worldLayer.removeChild(displayObject);
      displayObject.destroy();
    }
  }
  
  world.entities.clear();
  world._entityCounter = 1;
  
  entityCount.value = 0;
}

function gameLoop() {
  const moveSpeed = 10 / cameraSettings.zoom;
  
  if (keys['KeyW']) cameraSettings.focusY -= moveSpeed;
  if (keys['KeyS']) cameraSettings.focusY += moveSpeed;
  if (keys['KeyA']) cameraSettings.focusX -= moveSpeed;
  if (keys['KeyD']) cameraSettings.focusX += moveSpeed;
  
  if (keys['KeyW'] || keys['KeyS'] || keys['KeyA'] || keys['KeyD']) {
    updateCamera();
  }
  
  canvas.render();
  
  animationFrameId = requestAnimationFrame(gameLoop);
}

function cleanup() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
  window.removeEventListener('wheel', onWheel);
  
  clearEntities();
  
  if (camera) {
    camera._cleanupFromCanvas();
    camera = null;
  }
  
  if (canvas) {
    canvas.destroy();
    canvas = null;
  }
  
  if (world) {
    world = null;
  }
}
</script>

<style scoped>
.world-camera-test {
  display: flex;
  gap: 20px;
  padding: 20px;
  font-family: Arial, sans-serif;
  min-height: 100vh;
  background: #2d2d2d;
}

.canvas-container {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pixi-canvas {
  border: 2px solid #444;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.control-panel {
  width: 320px;
  padding: 20px;
  background: #3a3a3a;
  border-radius: 8px;
  color: #fff;
  overflow-y: auto;
  max-height: calc(100vh - 40px);
}

.control-panel h3 {
  margin-top: 0;
  color: #4fc3f7;
  border-bottom: 2px solid #4fc3f7;
  padding-bottom: 8px;
}

.control-panel h4 {
  margin: 10px 0;
  color: #81c784;
}

.control-panel p {
  margin: 8px 0;
  color: #ccc;
}

.setting-group {
  margin-bottom: 16px;
}

.setting-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: bold;
  color: #e0e0e0;
}

.setting-group input[type="range"] {
  width: 180px;
  margin-right: 10px;
}

.setting-group input[type="checkbox"] {
  margin-right: 8px;
}

.setting-group select {
  width: 200px;
  padding: 6px;
  border: 1px solid #555;
  border-radius: 4px;
  background: #4a4a4a;
  color: #fff;
}

.setting-group span {
  font-weight: bold;
  color: #4fc3f7;
}

hr {
  border: none;
  border-top: 1px solid #555;
  margin: 20px 0;
}

.info {
  font-style: italic;
  color: #aaa;
  font-size: 14px;
}

.buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.buttons button {
  padding: 10px 16px;
  border: none;
  border-radius: 4px;
  background: #4fc3f7;
  color: #1a1a1a;
  cursor: pointer;
  font-weight: bold;
  font-size: 14px;
  transition: background 0.2s;
}

.buttons button:hover {
  background: #29b6f6;
}

.info-panel {
  background: #424242;
  padding: 12px;
  border-radius: 4px;
  border-left: 4px solid #81c784;
}

.info-panel p {
  margin: 4px 0;
  font-size: 13px;
  font-family: 'Courier New', monospace;
}
</style>
