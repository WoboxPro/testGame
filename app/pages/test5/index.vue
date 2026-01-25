<template>
  <div class="test5">
    <div class="viewport-container">
      <div id="test5-canvas"></div>
    </div>

    <div class="controls">
      <h3>🎬 Animation Demo</h3>

      <div class="control-group">
        <h4>Animation States</h4>
        <button @click="setAnimationState('idle')" :class="{ 'btn--active': currentState === 'idle' }">Idle</button>
        <button @click="setAnimationState('walk')" :class="{ 'btn--active': currentState === 'walk' }">Walk</button>
        <button @click="setAnimationState('run')" :class="{ 'btn--active': currentState === 'run' }">Run</button>
        <button @click="setAnimationState('attack')" :class="{ 'btn--active': currentState === 'attack' }">Attack</button>
        <button @click="setAnimationState('attack2')" :class="{ 'btn--active': currentState === 'attack2' }">Attack 2</button>
      </div>

      <div class="control-group">
        <h4>Animation Speed</h4>
        <button @click="changeSpeed(0.5)">0.5x</button>
        <button @click="changeSpeed(1.0)" :class="{ 'btn--active': currentSpeed === 1.0 }">1.0x</button>
        <button @click="changeSpeed(2.0)">2.0x</button>
      </div>

      <div class="control-group">
        <h4>Controls</h4>
        <button @click="pauseAnimation" :class="{ 'btn--active': isPaused }">⏸️ Pause</button>
        <button @click="playAnimation">▶️ Play</button>
      </div>

      <div class="info">
        <div><strong>Current State:</strong> {{ currentState }}</div>
        <div><strong>Frame Index:</strong> {{ currentFrame }}</div>
        <div><strong>Speed:</strong> {{ currentSpeed }}x</div>
        <div><strong>Paused:</strong> {{ isPaused }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { World } from '../../../pixi_game2/pixigame/src/World.js';
import { Canvas, Camera } from '../../../pixi_game2/pixigame-renderer/src/index.js';
import { GameEntity } from '../../../pixi_game2/pixigame/src/entities/GameEntity.js';
import * as PIXI from 'pixi.js';

let world, canvas, camera, warriorEntity;
let rafId = null;
let lastTime = 0;

const currentState = ref('idle');
const currentFrame = ref(0);
const currentSpeed = ref(1.0);
const isPaused = ref(false);

async function init() {
  // Preload textures to cache first
  try {
    await PIXI.Assets.load(['/assets/warrior.png']);
    console.log('🎨 Assets preloaded to cache');
  } catch (err) {
    console.warn('⚠️ Failed to preload assets:', err);
  }

  // Create world
  world = new World({
    id: 'test5_world',
    type: 'infinite',
    width: 2000,
    height: 2000,
    backgroundColor: '#1a1a2e'
  });

  // Create canvas
  canvas = new Canvas({
    id: 'test5_canvas',
    sizeMode: 'fixed',
    width: 800,
    height: 600,
    backgroundColor: '#0f0f1a'
  });

  // Start canvas
  const hostEl = document.getElementById('test5-canvas');
  if (hostEl) {
    hostEl.innerHTML = '';
    await canvas.start(hostEl, {
      antialias: true,
      resolution: 1,
      autoDensity: true
    });
  }

  // Create camera
  camera = new Camera({
    id: 'test5_camera',
    width: 800,
    height: 600,
    x: 0,
    y: 0,
    focusX: 0,
    focusY: 0,
    zoom: 1,
    priority: 0,
    worldBackgroundColor: '#1a1a2e',
    world: world,
    canvas: canvas
  });

  // Add camera to canvas
  canvas.addCamera(camera);

  // Create warrior entity with animations
  warriorEntity = new GameEntity({
    id: 'warrior_hero',
    worldId: 'test5_world',
    subtype: 'unit',
    position: { x: 0, y: 0 },
    rotation: 0,
    scale: { x: 1, y: 1 },
    velocity: { x: 0, y: 0 },
    movement: {
      maxSpeed: 200,
      acceleration: 1000,
      friction: 5
    },
    appearance: {
      shape: 'sprite',
      color: 0xffffff,
      width: 200,
      height: 280,
      scale: 1.0,
      textureUrl: '/assets/warrior.png'
    },
    animations: {
      enabled: true,
      spritesheetUrl: '/assets/warrior_animations.json',
      defaultState: 'idle',
      speedMultiplier: 1.0
    }
  });

  // Add entity to world
  const entityId = world.createEntity({
    _entityRef: warriorEntity,
    position: warriorEntity.position,
    velocity: warriorEntity.velocity,
    movement: warriorEntity.movement,
    appearance: warriorEntity.appearance,
    subtype: warriorEntity.subtype,
    animations: warriorEntity.animations
  });

  console.log('🎬 Animation demo initialized!');
  console.log('Entity created:', warriorEntity.id, 'Entity ID:', entityId);

  // Start animation
  startLoop();
}

function startLoop() {
  if (rafId) return;

  lastTime = performance.now();
  loop();
}

function loop() {
  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.1); // Limit dt to avoid huge jumps
  lastTime = now;

  // Update world (animations, collisions, etc)
  world.update(dt * 1000); // Convert to milliseconds

  // Update UI info
  const animState = warriorEntity.getAnimationState();
  if (animState) {
    currentState.value = animState.state;
    currentFrame.value = animState.frameIndex;
    currentSpeed.value = animState.speedMultiplier;
    isPaused.value = animState.paused;
  }

  // Render
  canvas.render();

  rafId = requestAnimationFrame(loop);
}

function stopLoop() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

function setAnimationState(stateName) {
  console.log('Setting animation state:', stateName);
  warriorEntity.setAnimationState(stateName);
}

function changeSpeed(speed) {
  console.log('Setting animation speed:', speed);
  warriorEntity.setAnimationSpeed(speed);
  currentSpeed.value = speed;
}

function pauseAnimation() {
  warriorEntity.pauseAnimation();
}

function playAnimation() {
  warriorEntity.playAnimation();
}

onMounted(async () => {
  // Make timeSystem available globally
  if (window.timeSystem) {
    window.timeSystem.setTimeScale(1.0);
  }

  await init();
});

onUnmounted(() => {
  stopLoop();

  if (canvas) {
    canvas.destroy();
  }
});
</script>

<style scoped>
.test5 {
  display: flex;
  gap: 20px;
  padding: 20px;
  min-height: 100vh;
  background: #0f0f1a;
  color: #ffffff;
  font-family: Arial, sans-serif;
}

.viewport-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0a0a12;
  border-radius: 12px;
  padding: 20px;
}

#test5-canvas {
  border-radius: 8px;
  overflow: hidden;
}

.controls {
  width: 300px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.controls h3 {
  margin: 0 0 20px 0;
  font-size: 20px;
  color: #bfe7ff;
  border-bottom: 2px solid rgba(79, 195, 247, 0.3);
  padding-bottom: 10px;
}

.control-group {
  margin-bottom: 24px;
}

.control-group h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.control-group button {
  margin-right: 6px;
  margin-bottom: 6px;
}

.btn {
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  background: rgba(79, 195, 247, 0.2);
  color: #bfe7ff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid rgba(79, 195, 247, 0.3);
}

.btn:hover {
  background: rgba(79, 195, 247, 0.4);
  transform: translateY(-1px);
}

.btn--active {
  background: rgba(79, 195, 247, 0.6);
  border-color: rgba(79, 195, 247, 0.8);
  color: #ffffff;
}

.info {
  margin-top: 24px;
  padding: 16px;
  background: rgba(0, 255, 128, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(0, 255, 128, 0.3);
}

.info div {
  margin: 6px 0;
  font-size: 13px;
  line-height: 1.5;
}

.info strong {
  color: #00ff80;
  margin-right: 8px;
}
</style>
