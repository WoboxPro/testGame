<template>
  <div class="pixi-game2-test">
    <div class="canvas-container">
      <div ref="pixiContainer" class="pixi-canvas"></div>
    </div>
    
    <div class="control-panel">
      <h3>🎮 Test Page</h3>
      
      <div class="setting-group">
        <button @click="createWorld" :disabled="world !== null">🌍 Создать World</button>
        <button @click="createCanvas" :disabled="canvas !== null">🖼️ Создать Canvas</button>
        <button @click="createCamera" :disabled="canvas === null">📷 Создать Camera</button>
        <button @click="addEntity" :disabled="world === null || cameras.length === 0">➕ Добавить Entity</button>
        <button @click="addMultipleEntities(10)" :disabled="world === null || cameras.length === 0">➕ Добавить 10</button>
        <button @click="clearAll">🗑️ Очистить всё</button>
      </div>
      
      <hr/>
      
      <div class="info-panel">
        <h4>📊 Инфо:</h4>
        <p>World: {{ world?.id || 'нет' }}</p>
        <p v-if="world">Type: {{ world.type }}</p>
        <p v-if="world">Size: {{ world.width }}x{{ world.height }}</p>
        <p>Canvas: {{ canvas?.id || 'нет' }}</p>
        <p>Cameras: {{ cameras.length }}</p>
        <p>Entities: {{ entityCount }}</p>
      </div>
      
      <hr/>
      
      <div v-if="activeCamera" class="camera-panel">
        <h4>📷 Активная камера: {{ activeCamera.id }}</h4>
        
        <div class="setting-group">
          <label>Zoom:</label>
          <input type="range" v-model.number="cameraZoom" @input="updateCameraZoom" min="0.1" max="5" step="0.1"/>
          <span>{{ cameraZoom.toFixed(1) }}x</span>
        </div>
        
        <div class="setting-group">
          <label>Focus X:</label>
          <input type="range" v-model.number="cameraFocusX" @input="updateCameraFocus" min="-500" max="500" step="10"/>
          <span>{{ cameraFocusX }}</span>
        </div>
        
        <div class="setting-group">
          <label>Focus Y:</label>
          <input type="range" v-model.number="cameraFocusY" @input="updateCameraFocus" min="-500" max="500" step="10"/>
          <span>{{ cameraFocusY }}</span>
        </div>
        
        <p class="info">WASD - Движение | Колесо - Зум</p>
      </div>
      
      <hr/>
      
      <div v-if="cameras.length > 1" class="multi-cam-info">
        <h4>📷 Камеры:</h4>
        <p v-for="cam in cameras" :key="cam.id">
          {{ cam.id }}: ({{ cam.focusX }}, {{ cam.focusY }}) {{ cam.zoom.toFixed(1) }}x
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, computed } from 'vue';
import { World } from '../../../pixi_game2/pixigame/src/World.js';
import { Canvas, Camera } from '../../../pixi_game2/pixigame-renderer/src/index.js';

const pixiContainer = ref(null);

const world = ref(null);
const canvas = ref(null);
const cameras = ref([]);
const entityCount = ref(0);

const activeCameraIndex = ref(0);
const cameraZoom = ref(1.0);
const cameraFocusX = ref(0);
const cameraFocusY = ref(0);

const activeCamera = computed(() => {
  return cameras.value[activeCameraIndex.value] || null;
});

const keys = {};
let animationFrameId = null;

onMounted(async () => {
  if (process.client && pixiContainer.value) {
    setupControls();
  }
});

onUnmounted(() => {
  cleanup();
});

function setupControls() {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('wheel', onWheel);
}

function onKeyDown(e) { keys[e.code] = true; }
function onKeyUp(e) { keys[e.code] = false; }

function onWheel(e) {
  if (!activeCamera.value) return;
  
  const zoomSpeed = 0.1;
  const direction = e.deltaY > 0 ? -1 : 1;
  
  cameraZoom.value = Math.max(0.1, Math.min(5.0, cameraZoom.value + direction * zoomSpeed));
  updateCameraZoom();
}

async function createWorld() {
  world.value = new World({
    type: 'bounded',
    width: 1000,
    height: 1000,
    backgroundColor: '#000000'
  });
  
  console.log('🌍 World создан:', world.value.getInfo());
}

async function createCanvas() {
  canvas.value = new Canvas({
    sizeMode: 'fixed',
    width: 1200,
    height: 800,
    backgroundColor: '#1a1a1a',
    containerId: 'pixi-container'
  });
  
  await canvas.value.start(pixiContainer.value, {});
  
  if (!animationFrameId) {
    gameLoop();
  }
  
  console.log('🖼️ Canvas создан:', canvas.value.getInfo());
}

function createCamera() {
  const cameraId = `camera_${cameras.value.length + 1}`;
  
  const camera = new Camera({
    id: cameraId,
    width: 380,
    height: 380,
    x: 10 + (cameras.value.length * 400),
    y: 10,
    positionMode: 'absolute',
    anchor: 'center',
    focusX: 0,
    focusY: 0,
    zoom: 1.0,
    world: world.value,
    canvas: canvas.value
  });
  
  cameras.value.push(camera);
  
  if (cameras.value.length === 1) {
    activeCameraIndex.value = 0;
    cameraZoom.value = camera.zoom;
    cameraFocusX.value = camera.focusX;
    cameraFocusY.value = camera.focusY;
  }
  
  console.log('📷 Камера создана:', camera.getInfo());
}

function addEntity() {
  if (!world.value) return;
  
  const x = (Math.random() - 0.5) * world.value.width * 0.8;
  const y = (Math.random() - 0.5) * world.value.height * 0.8;
  const color = Math.floor(Math.random() * 0xFFFFFF);
  const size = 20 + Math.random() * 30;
  
  world.value.createEntity({
    position: { x, y },
    appearance: {
      shape: 'circle',
      color: color,
      size: size
    }
  });
  
  entityCount.value = world.value.entities.size;
}

function addMultipleEntities(count) {
  for (let i = 0; i < count; i++) {
    addEntity();
  }
}

function updateCameraZoom() {
  if (!activeCamera.value) return;
  activeCamera.value.setZoom(cameraZoom.value);
}

function updateCameraFocus() {
  if (!activeCamera.value) return;
  activeCamera.value.setFocus(cameraFocusX.value, cameraFocusY.value);
}

function clearAll() {
  cleanup();
  
  world.value = null;
  canvas.value = null;
  cameras.value = [];
  entityCount.value = 0;
  
  activeCameraIndex.value = 0;
  cameraZoom.value = 1.0;
  cameraFocusX.value = 0;
  cameraFocusY.value = 0;
  
  console.log('🗑️ Всё очищено');
}

function gameLoop() {
  if (canvas.value) {
    if (activeCamera.value) {
      const moveSpeed = 10 / activeCamera.value.zoom;
      
      if (keys['KeyW']) cameraFocusY.value -= moveSpeed;
      if (keys['KeyS']) cameraFocusY.value += moveSpeed;
      if (keys['KeyA']) cameraFocusX.value -= moveSpeed;
      if (keys['KeyD']) cameraFocusX.value += moveSpeed;
      
      if (keys['KeyW'] || keys['KeyS'] || keys['KeyA'] || keys['KeyD']) {
        updateCameraFocus();
      }
    }
    
    canvas.value.render();
  }
  
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
  
  if (canvas.value) {
    canvas.value.destroy();
    canvas.value = null;
  }
}
</script>

<style scoped>
.pixi-game2-test {
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
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-group label {
  font-weight: bold;
  color: #e0e0e0;
}

.setting-group input[type="range"] {
  width: 200px;
}

.setting-group span {
  font-weight: bold;
  color: #4fc3f7;
}

.setting-group button {
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

.setting-group button:hover:not(:disabled) {
  background: #29b6f6;
}

.setting-group button:disabled {
  background: #555;
  cursor: not-allowed;
  opacity: 0.6;
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

.info-panel, .camera-panel, .multi-cam-info {
  background: #424242;
  padding: 12px;
  border-radius: 4px;
  border-left: 4px solid #81c784;
}

.multi-cam-info {
  border-left-color: #ff9800;
}

.info-panel p, .camera-panel p, .multi-cam-info p {
  margin: 4px 0;
  font-size: 13px;
  font-family: 'Courier New', monospace;
}
</style>
