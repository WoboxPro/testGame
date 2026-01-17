<template>
  <div class="camera-test">
    <div class="canvas-container">
      <div ref="pixiContainer" class="pixi-canvas"></div>
    </div>
    
    <div class="info-panel">
      <h3>📷 3 Cameras, Same World, Different Zooms</h3>
      <p>Camera 1: 1.0x zoom (top-left)</p>
      <p>Camera 2: 2.0x zoom (center)</p>
      <p>Camera 3: 0.5x zoom (bottom-right)</p>
      <hr/>
      <button @click="addEntities(1)">Add 1 Entity</button>
      <button @click="addEntities(10)">Add 10 Entities</button>
      <button @click="clearEntities">Clear All</button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import * as PIXI from 'pixi.js';
import { World } from '../../../pixi_game/pixigame/src/core/World.js';
import { Canvas } from '../../../pixi_game/pixigame-renderer/src/Canvas.js';
import { Camera } from '../../../pixi_game/pixigame-renderer/src/Camera.js';

const pixiContainer = ref(null);

let world = null;
let canvas = null;
let camera1 = null;
let camera2 = null;
let camera3 = null;
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
    type: 'bounded',
    width: 1000,
    height: 1000,
    backgroundColor: '#000000'
  });
  
  canvas = new Canvas({
    sizeMode: 'fixed',
    width: 1200,
    height: 800,
    backgroundColor: '#1a1a1a',
    containerId: 'pixi-container'
  });
  
  camera1 = new Camera({
    id: 'camera_1',
    width: 380,
    height: 380,
    x: 10,
    y: 10,
    positionMode: 'absolute',
    anchor: 'center',
    focusX: 0,
    focusY: 0,
    zoom: 1.0,
    world: world,
    canvas: canvas
  });
  
  camera2 = new Camera({
    id: 'camera_2',
    width: 380,
    height: 380,
    x: 410,
    y: 10,
    positionMode: 'absolute',
    anchor: 'center',
    focusX: 0,
    focusY: 0,
    zoom: 2.0,
    world: world,
    canvas: canvas
  });
  
  camera3 = new Camera({
    id: 'camera_3',
    width: 380,
    height: 380,
    x: 810,
    y: 10,
    positionMode: 'absolute',
    anchor: 'center',
    focusX: 0,
    focusY: 0,
    zoom: 0.5,
    world: world,
    canvas: canvas
  });
  
  canvas.addCamera(camera1);
  canvas.addCamera(camera2);
  canvas.addCamera(camera3);
  
  await canvas.start(pixiContainer.value);
  
  camera1._initForCanvas(canvas);
  camera2._initForCanvas(canvas);
  camera3._initForCanvas(canvas);
  
  drawWorldBorders();
  addEntities(50);
  
  animationFrameId = requestAnimationFrame(gameLoop);
}

function drawWorldBorders() {
  if (!world || !world.width || !world.height) return;
  
  const halfWidth = world.width / 2;
  const halfHeight = world.height / 2;
  
  [camera1, camera2, camera3].forEach(camera => {
    if (!camera || !camera.worldLayer) return;
    
    // Проверяем есть ли уже граница
    let border = camera._entityDisplayObjects.get('world_border');
    if (!border) {
      border = new PIXI.Graphics();
      camera._entityDisplayObjects.set('world_border', border);
      camera.worldLayer.addChild(border);
    }
    
    border.clear();
    border.setStrokeStyle({ 
      width: 2,
      color: 0x00FF00
    });
    border.rect(-halfWidth, -halfHeight, world.width, world.height);
    border.stroke();
  });
}

function addEntities(count = 10) {
  for (let i = 0; i < count; i++) {
    world.createEntity({
      position: {
        x: (Math.random() - 0.5) * world.width * 0.6,
        y: (Math.random() - 0.5) * world.height * 0.6
      },
      appearance: {
        color: Math.random() * 0xFFFFFF,
        size: 30 + Math.random() * 40,
        shape: Math.random() > 0.5 ? 'circle' : 'rect'
      }
    });
  }
  
  drawWorldBorders();
}

function clearEntities() {
  if (world && world.entities) {
    world.entities.clear();
    world._entityCounter = 1;
  }
  
  drawWorldBorders();
}

function gameLoop() {
  canvas.render();
  animationFrameId = requestAnimationFrame(gameLoop);
}

function cleanup() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  
  clearEntities();
  
  [camera1, camera2, camera3].forEach(camera => {
    if (camera) {
      camera._cleanupFromCanvas();
    }
  });
  
  camera1 = null;
  camera2 = null;
  camera3 = null;
  
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
.camera-test {
  display: flex;
  gap: 20px;
  padding: 20px;
  font-family: Arial, sans-serif;
  min-height: 100vh;
  background: #2d2d2d;
}

.canvas-container {
  flex-shrink: 0;
}

.pixi-canvas {
  border: 2px solid #444;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.info-panel {
  width: 300px;
  padding: 20px;
  background: #3a3a3a;
  border-radius: 8px;
  color: #fff;
}

.info-panel h3 {
  margin-top: 0;
  color: #4fc3f7;
  border-bottom: 2px solid #4fc3f7;
  padding-bottom: 8px;
}

.info-panel p {
  margin: 8px 0;
  color: #ccc;
}

hr {
  border: none;
  border-top: 1px solid #555;
  margin: 20px 0;
}

button {
  width: 100%;
  padding: 10px 16px;
  border: none;
  border-radius: 4px;
  background: #4fc3f7;
  color: #1a1a1a;
  cursor: pointer;
  font-weight: bold;
  font-size: 14px;
  transition: background 0.2s;
  margin-bottom: 8px;
}

button:hover {
  background: #29b6f6;
}
</style>
