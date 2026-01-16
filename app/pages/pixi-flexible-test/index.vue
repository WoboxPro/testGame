<template>
  <div class="flexible-test">
    <div class="canvases-panel">
      <h3>🖼️ Canvases</h3>
      
      <div class="form-section">
        <h4>Create Canvas</h4>
        
        <div class="form-row">
          <label>Size Mode:</label>
          <select v-model="canvasForm.sizeMode">
            <option value="fixed">Fixed</option>
            <option value="responsive">Responsive</option>
          </select>
        </div>
        
        <div class="form-row" v-if="canvasForm.sizeMode === 'fixed'">
          <label>Width:</label>
          <input type="number" v-model.number="canvasForm.width" min="200" max="2000"/>
        </div>
        
        <div class="form-row" v-if="canvasForm.sizeMode === 'fixed'">
          <label>Height:</label>
          <input type="number" v-model.number="canvasForm.height" min="200" max="2000"/>
        </div>
        
        <div class="form-row" v-if="canvasForm.sizeMode === 'responsive'">
          <label>Width %:</label>
          <input type="number" v-model.number="canvasForm.widthPercent" min="10" max="100"/>
        </div>
        
        <div class="form-row" v-if="canvasForm.sizeMode === 'responsive'">
          <label>Height %:</label>
          <input type="number" v-model.number="canvasForm.heightPercent" min="10" max="100"/>
        </div>
        
        <div class="form-row">
          <label>Background:</label>
          <input type="color" v-model="canvasForm.backgroundColor"/>
        </div>
        
        <button @click="createCanvas" class="create-btn">➕ Create Canvas</button>
      </div>
      
      <div class="list-section">
        <h4>Created Canvases ({{ canvases.size }})</h4>
        <div v-for="canvas in canvases.values()" :key="canvas.id" class="item-card">
          <div class="item-header">
            <span class="item-id">{{ canvas.id }}</span>
            <button @click="removeCanvas(canvas.id)" class="remove-btn">✕</button>
          </div>
          <div class="item-details">
            <p>{{ canvas.sizeMode === 'fixed' ? `${canvas.width}x${canvas.height}` : `${canvas.widthPercent}%x${canvas.heightPercent}%` }}</p>
            <p>Cameras: {{ canvas.cameras.size }}</p>
          </div>
          <div :ref="el => canvasRefs[canvas.id] = el" :id="canvas.id" class="canvas-container"></div>
        </div>
      </div>
    </div>
    
    <div class="worlds-panel">
      <h3>🌍 Worlds</h3>
      
      <div class="form-section">
        <h4>Create World</h4>
        
        <div class="form-row">
          <label>Type:</label>
          <select v-model="worldForm.type">
            <option value="bounded">Bounded</option>
            <option value="infinite">Infinite</option>
            <option value="circular">Circular</option>
          </select>
        </div>
        
        <div class="form-row" v-if="worldForm.type !== 'infinite'">
          <label>Width:</label>
          <input type="number" v-model.number="worldForm.width" min="500" max="10000"/>
        </div>
        
        <div class="form-row" v-if="worldForm.type !== 'infinite'">
          <label>Height:</label>
          <input type="number" v-model.number="worldForm.height" min="500" max="10000"/>
        </div>
        
        <div class="form-row">
          <label>Background:</label>
          <input type="color" v-model="worldForm.backgroundColor"/>
        </div>
        
        <div class="form-row">
          <label>Show Borders:</label>
          <input type="checkbox" v-model="worldForm.showBorders"/>
        </div>
        
        <button @click="createWorld" class="create-btn">➕ Create World</button>
      </div>
      
      <div class="list-section">
        <h4>Created Worlds ({{ worlds.size }})</h4>
        <div v-for="world in worlds.values()" :key="world.id" class="item-card">
          <div class="item-header">
            <span class="item-id">{{ world.id }}</span>
            <button @click="removeWorld(world.id)" class="remove-btn">✕</button>
          </div>
          <div class="item-details">
            <p>Type: {{ world.type }}</p>
            <p v-if="world.type !== 'infinite'">Size: {{ world.width }}x{{ world.height }}</p>
            <p>Entities: {{ world.entities.size }}</p>
          </div>
          <div class="item-actions">
            <button @click="toggleWorldBorders(world.id)">
              {{ world.showBorders ? '🚫 Hide Borders' : '📐 Show Borders' }}
            </button>
            <button @click="addEntitiesToWorld(world.id, 1)">+1 Entity</button>
            <button @click="addEntitiesToWorld(world.id, 10)">+10 Entities</button>
            <button @click="clearWorldEntities(world.id)">Clear</button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="cameras-panel">
      <h3>📷 Cameras</h3>
      
      <div class="form-section">
        <h4>Create Camera</h4>
        
        <div class="form-row">
          <label>Canvas:</label>
          <select v-model="cameraForm.canvasId">
            <option :value="null">Select Canvas</option>
            <option v-for="canvas in canvases.values()" :key="canvas.id" :value="canvas.id">{{ canvas.id }}</option>
          </select>
        </div>
        
        <div class="form-row">
          <label>World:</label>
          <select v-model="cameraForm.worldId">
            <option :value="null">Select World</option>
            <option v-for="world in worlds.values()" :key="world.id" :value="world.id">{{ world.id }}</option>
          </select>
        </div>
        
        <div class="form-row">
          <label>Position Mode:</label>
          <select v-model="cameraForm.positionMode">
            <option value="absolute">Absolute</option>
            <option value="relative">Relative</option>
          </select>
        </div>
        
        <div class="form-row" v-if="cameraForm.positionMode === 'absolute'">
          <label>X:</label>
          <input type="number" v-model.number="cameraForm.x"/>
        </div>
        
        <div class="form-row" v-if="cameraForm.positionMode === 'absolute'">
          <label>Y:</label>
          <input type="number" v-model.number="cameraForm.y"/>
        </div>
        
        <div class="form-row" v-if="cameraForm.positionMode === 'relative'">
          <label>X %:</label>
          <input type="number" v-model.number="cameraForm.xPercent" min="0" max="100"/>
        </div>
        
        <div class="form-row" v-if="cameraForm.positionMode === 'relative'">
          <label>Y %:</label>
          <input type="number" v-model.number="cameraForm.yPercent" min="0" max="100"/>
        </div>
        
        <div class="form-row">
          <label>Width:</label>
          <input type="number" v-model.number="cameraForm.width" min="100" max="2000"/>
        </div>
        
        <div class="form-row">
          <label>Height:</label>
          <input type="number" v-model.number="cameraForm.height" min="100" max="2000"/>
        </div>
        
        <div class="form-row">
          <label>Anchor:</label>
          <select v-model="cameraForm.anchor">
            <option value="center">Center</option>
            <option value="topleft">Top Left</option>
            <option value="topright">Top Right</option>
            <option value="bottomleft">Bottom Left</option>
            <option value="bottomright">Bottom Right</option>
          </select>
        </div>
        
        <div class="form-row">
          <label>Zoom:</label>
          <input type="number" v-model.number="cameraForm.zoom" min="0.1" max="5" step="0.1"/>
        </div>
        
        <button @click="createCamera" class="create-btn" :disabled="!cameraForm.canvasId || !cameraForm.worldId">➕ Create Camera</button>
      </div>
      
      <div class="list-section">
        <h4>Created Cameras ({{ cameras.size }})</h4>
        <div v-for="camera in cameras.values()" :key="camera.id" class="item-card">
          <div class="item-header">
            <span class="item-id">{{ camera.id }}</span>
            <button @click="removeCamera(camera.id)" class="remove-btn">✕</button>
          </div>
          <div class="item-details">
            <p>Canvas: {{ camera.canvasId }}</p>
            <p>World: {{ camera.worldId }}</p>
            <p>{{ camera.width }}x{{ camera.height }} @ ({{ camera.positionMode === 'absolute' ? `${camera.x},${camera.y}` : `${camera.xPercent}%,${camera.yPercent}%` }})</p>
            <p>Anchor: {{ camera.anchor }}, Zoom: {{ camera.zoom.toFixed(1) }}x</p>
          </div>
          <div class="camera-controls">
            <div class="control-row">
              <label>Zoom:</label>
              <input type="range" :value="camera.zoom" @input="updateCameraZoom(camera.id, $event.target.value)" min="0.1" max="5" step="0.1"/>
              <span>{{ camera.zoom.toFixed(1) }}x</span>
            </div>
            <div class="control-row">
              <label>Focus X:</label>
              <input type="range" :value="camera.focusX" @input="updateCameraFocus(camera.id, 'x', $event.target.value)" min="-5000" max="5000" step="10"/>
              <span>{{ Math.round(camera.focusX) }}</span>
            </div>
            <div class="control-row">
              <label>Focus Y:</label>
              <input type="range" :value="camera.focusY" @input="updateCameraFocus(camera.id, 'y', $event.target.value)" min="-5000" max="5000" step="10"/>
              <span>{{ Math.round(camera.focusY) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue';
import * as PIXI from 'pixi.js';
import { World } from '../../../pixi_game/pixigame/src/core/World.js';
import { Canvas } from '../../../pixi_game/pixigame-renderer/src/Canvas.js';
import { Camera } from '../../../pixi_game/pixigame-renderer/src/Camera.js';

const canvases = ref(new Map());
const worlds = ref(new Map());
const cameras = ref(new Map());
const canvasRefs = reactive({});

const canvasForm = reactive({
  sizeMode: 'fixed',
  width: 800,
  height: 600,
  widthPercent: 100,
  heightPercent: 100,
  backgroundColor: '#222222'
});

const worldForm = reactive({
  type: 'bounded',
  width: 5000,
  height: 5000,
  backgroundColor: '#000000',
  showBorders: true
});

const cameraForm = reactive({
  canvasId: null,
  worldId: null,
  positionMode: 'absolute',
  x: 0,
  y: 0,
  xPercent: 0,
  yPercent: 0,
  width: 800,
  height: 600,
  anchor: 'center',
  zoom: 1.0
});

let animationFrameId = null;

onMounted(() => {
  startRenderLoop();
});

onUnmounted(() => {
  stopRenderLoop();
  cleanup();
});

function createCanvas() {
  const id = `canvas_${Date.now()}`;
  const canvas = new Canvas({
    id,
    sizeMode: canvasForm.sizeMode,
    width: canvasForm.width,
    height: canvasForm.height,
    widthPercent: canvasForm.widthPercent,
    heightPercent: canvasForm.heightPercent,
    backgroundColor: canvasForm.backgroundColor
  });
  
  canvases.value.set(id, canvas);
  
  nextTick(async () => {
    const container = canvasRefs[id];
    if (container) {
      await canvas.start(container);
    }
  });
}

function createWorld() {
  const id = `world_${Date.now()}`;
  const world = new World({
    id,
    type: worldForm.type,
    width: worldForm.width,
    height: worldForm.height,
    backgroundColor: worldForm.backgroundColor
  });
  
  world.showBorders = worldForm.showBorders;
  world.borderGraphicsList = [];
  
  worlds.value.set(id, world);
}

function createCamera() {
  const id = `camera_${Date.now()}`;
  const canvas = canvases.value.get(cameraForm.canvasId);
  const world = worlds.value.get(cameraForm.worldId);
  
  if (!canvas || !world) {
    alert('Please select both a canvas and a world');
    return;
  }
  
  if (!canvas.app || !canvas.isStarted) {
    alert('Canvas is not started yet. Please wait a moment or recreate the canvas.');
    return;
  }
  
  const camera = new Camera({
    id,
    width: cameraForm.width,
    height: cameraForm.height,
    positionMode: cameraForm.positionMode,
    x: cameraForm.positionMode === 'absolute' ? cameraForm.x : cameraForm.xPercent,
    y: cameraForm.positionMode === 'absolute' ? cameraForm.y : cameraForm.yPercent,
    anchor: cameraForm.anchor,
    focusX: 0,
    focusY: 0,
    zoom: cameraForm.zoom,
    world: world,
    canvas: canvas
  });
  
  canvas.addCamera(camera);
  camera._initForCanvas(canvas);
  
  camera.canvasId = cameraForm.canvasId;
  camera.worldId = cameraForm.worldId;
  
  cameras.value.set(id, camera);
  
  // Добавляем существующие сущности из мира в камеру
  updateWorldDisplays(cameraForm.worldId);
}

function removeCanvas(id) {
  const canvas = canvases.value.get(id);
  if (!canvas) return;
  
  canvas.destroy();
  canvases.value.delete(id);
  
  cameras.value.forEach((camera, cameraId) => {
    if (camera.canvasId === id) {
      removeCamera(cameraId);
    }
  });
}

function removeWorld(id) {
  const world = worlds.value.get(id);
  if (!world) return;
  
  // Удаляем связанные камеры
  cameras.value.forEach((camera, cameraId) => {
    if (camera.worldId === id) {
      removeCamera(cameraId);
    }
  });
  
  // Очищаем границы
  if (world.borderGraphicsList) {
    world.borderGraphicsList.forEach(g => g.destroy());
  }
  
  // Удаляем displayObjects сущностей
  for (const [entityId, components] of world.entities) {
    const displayObject = components.get('displayObject');
    if (displayObject) {
      if (displayObject.parent) {
        displayObject.parent.removeChild(displayObject);
      }
      displayObject.destroy();
    }
  }
  
  world.entities.clear();
  world._entityCounter = 1;
  
  worlds.value.delete(id);
}

function removeCamera(id) {
  const camera = cameras.value.get(id);
  if (!camera) return;
  
  const canvas = canvases.value.get(camera.canvasId);
  if (canvas) {
    canvas.removeCamera(id);
  }
  
  camera._cleanupFromCanvas();
  cameras.value.delete(id);
}

function addEntitiesToWorld(worldId, count) {
  const world = worlds.value.get(worldId);
  if (!world) return;
  
  for (let i = 0; i < count; i++) {
    const entityId = world.createEntity({
      position: {
        x: (Math.random() - 0.5) * (world.width || 2000) * 0.8,
        y: (Math.random() - 0.5) * (world.height || 2000) * 0.8
      },
      appearance: {
        color: Math.random() * 0xFFFFFF,
        size: 20 + Math.random() * 40,
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
    world.addComponent(entityId, 'displayObject', graphics);
  }
  
  updateWorldDisplays(worldId);
}

function clearWorldEntities(worldId) {
  const world = worlds.value.get(worldId);
  if (!world) return;
  
  // Очищаем границы из слоев камер
  if (world.borderGraphicsList) {
    world.borderGraphicsList.forEach(g => {
      if (g.parent) {
        g.parent.removeChild(g);
      }
      g.destroy();
    });
    world.borderGraphicsList = [];
  }
  
  // Удаляем displayObjects сущностей из слоев камер
  for (const [entityId, components] of world.entities) {
    const displayObject = components.get('displayObject');
    if (displayObject) {
      if (displayObject.parent) {
        displayObject.parent.removeChild(displayObject);
      }
      displayObject.destroy();
    }
  }
  
  world.entities.clear();
  world._entityCounter = 1;
  
  updateWorldDisplays(worldId);
}

function updateWorldDisplays(worldId) {
  const world = worlds.value.get(worldId);
  if (!world) return;
  
  cameras.value.forEach(camera => {
    if (camera.worldId === worldId) {
      if (!camera.worldLayer) {
        console.warn('updateWorldDisplays: camera.worldLayer is null for camera', camera.id);
        return;
      }
      
      camera.worldLayer.removeChildren();
      
      for (const [entityId, components] of world.entities) {
        const displayObject = components.get('displayObject');
        const position = components.get('position');
        
        if (displayObject && position) {
          displayObject.position.set(position.x, position.y);
          camera.worldLayer.addChild(displayObject);
        }
      }
      
      if (world.showBorders) {
        drawWorldBorders(world, camera.worldLayer);
      }
    }
  });
}

function drawWorldBorders(world, targetLayer) {
  const graphics = new PIXI.Graphics();
  graphics.setStrokeStyle({ 
    width: world.borders.width,
    color: world.borders.color
  });
  
  if (world.type === 'circular') {
    graphics.rect(-world.width / 2, -world.height / 2, world.width, world.height);
  } else if (world.type === 'bounded') {
    graphics.rect(-world.width / 2, -world.height / 2, world.width, world.height);
  }
  
  graphics.stroke();
  
  if (targetLayer) {
    targetLayer.addChild(graphics);
  }
  
  if (!world.borderGraphicsList) {
    world.borderGraphicsList = [];
  }
  world.borderGraphicsList.push(graphics);
}

function updateCameraZoom(cameraId, value) {
  const camera = cameras.value.get(cameraId);
  if (!camera) {
    console.warn('updateCameraZoom: camera not found', cameraId);
    return;
  }
  
  camera.setZoom(Number(value));
  
  // Принудительный ререндер канваса
  const canvas = canvases.value.get(camera.canvasId);
  if (canvas && canvas.app) {
    canvas.app.render();
  }
}

function updateCameraFocus(cameraId, axis, value) {
  const camera = cameras.value.get(cameraId);
  if (!camera) return;
  
  const currentFocusX = camera.focusX;
  const currentFocusY = camera.focusY;
  const newValue = Number(value);
  
  if (axis === 'x') {
    camera.setFocus(newValue, currentFocusY);
  } else {
    camera.setFocus(currentFocusX, newValue);
  }
  
  // Принудительный ререндер канваса
  const canvas = canvases.value.get(camera.canvasId);
  if (canvas && canvas.app) {
    canvas.app.render();
  }
}

function toggleWorldBorders(worldId) {
  const world = worlds.value.get(worldId);
  if (!world) return;
  
  world.showBorders = !world.showBorders;
  updateWorldDisplays(worldId);
}

function startRenderLoop() {
  function render() {
    canvases.value.forEach(canvas => {
      canvas.render();
    });
    animationFrameId = requestAnimationFrame(render);
  }
  render();
}

function stopRenderLoop() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

function cleanup() {
  cameras.value.forEach(camera => {
    camera._cleanupFromCanvas();
  });
  
  canvases.value.forEach(canvas => {
    canvas.destroy();
  });
  
  canvases.value.clear();
  worlds.value.clear();
  cameras.value.clear();
}
</script>

<style scoped>
.flexible-test {
  display: flex;
  gap: 20px;
  padding: 20px;
  font-family: Arial, sans-serif;
  min-height: 100vh;
  background: #1e1e1e;
  color: #fff;
}

.canvases-panel,
.worlds-panel,
.cameras-panel {
  flex: 1;
  padding: 20px;
  background: #2d2d2d;
  border-radius: 8px;
  overflow-y: auto;
  max-height: calc(100vh - 40px);
}

h3 {
  margin-top: 0;
  color: #4fc3f7;
  border-bottom: 2px solid #4fc3f7;
  padding-bottom: 8px;
}

h4 {
  margin: 0 0 15px 0;
  color: #81c784;
}

.form-section {
  background: #363636;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 20px;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.form-row label {
  min-width: 80px;
  font-weight: bold;
  color: #e0e0e0;
}

.form-row input[type="number"],
.form-row input[type="color"],
.form-row select {
  padding: 6px;
  border: 1px solid #555;
  border-radius: 4px;
  background: #4a4a4a;
  color: #fff;
  flex: 1;
}

.form-row input[type="number"] {
  width: 80px;
}

.form-row input[type="checkbox"] {
  width: auto;
  flex: none;
}

.create-btn {
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 4px;
  background: #4fc3f7;
  color: #1a1a1a;
  cursor: pointer;
  font-weight: bold;
  font-size: 14px;
  transition: background 0.2s;
}

.create-btn:hover:not(:disabled) {
  background: #29b6f6;
}

.create-btn:disabled {
  background: #666;
  cursor: not-allowed;
}

.list-section {
  background: #363636;
  padding: 15px;
  border-radius: 6px;
}

.item-card {
  background: #424242;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 12px;
  border-left: 4px solid #4fc3f7;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.item-id {
  font-weight: bold;
  color: #4fc3f7;
}

.remove-btn {
  background: #f44336;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  font-size: 12px;
  line-height: 24px;
  text-align: center;
}

.remove-btn:hover {
  background: #d32f2f;
}

.item-details p {
  margin: 4px 0;
  color: #ccc;
  font-size: 13px;
}

.item-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.item-actions button {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  background: #81c784;
  color: #1a1a1a;
  cursor: pointer;
  font-size: 12px;
  font-weight: bold;
}

.item-actions button:hover {
  background: #66bb6a;
}

.canvas-container {
  width: 100%;
  min-height: 200px;
  background: #1a1a1a;
  border: 1px solid #555;
  border-radius: 4px;
  margin-top: 10px;
  overflow: hidden;
}

.camera-controls {
  background: #333;
  padding: 10px;
  border-radius: 4px;
  margin-top: 10px;
}

.control-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.control-row label {
  min-width: 60px;
  font-size: 12px;
  color: #ccc;
}

.control-row input[type="range"] {
  flex: 1;
}

.control-row span {
  min-width: 40px;
  font-size: 12px;
  color: #4fc3f7;
  text-align: right;
}
</style>
