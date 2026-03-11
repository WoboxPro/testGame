<template>
  <div class="game1-page">
    <!-- Main Menu -->
    <div v-if="showMainMenu" class="main-menu">
      <div class="menu-content">
        <h1 class="game-title">ШУТЕР ДАУН</h1>
        <p class="game-subtitle">Top-Down Survival Shooter</p>
        <button class="start-btn" @click="startGame">НАЧАТЬ ИГРУ</button>
        <div class="controls-hint">
          <p>WASD - движение | Мышь - прицеливание | ЛКМ - стрельба</p>
        </div>
      </div>
    </div>

    <!-- Game UI (always in DOM, hidden until game starts) -->
    <header v-show="gameStarted" class="header">
      <h1>Шутер Даун</h1>
      <p class="hint">
        WASD to move | Mouse to aim | Left Click to shoot | 
        <span class="wave">Wave: <span id="wave-display">1</span></span> | 
        <span class="level">Lv: <span id="level-display">1</span></span> | 
        <span class="exp">EXP: <span id="exp-display">0</span>/<span id="exp-max-display">5</span></span> | 
        <span class="hp">HP: <span id="hp-display">3</span>/3</span>
      </p>
    </header>
    <div class="game-wrapper" :class="{ 'game-hidden': !gameStarted }">
      <div id="game-canvas-container" ref="canvasHost" class="canvas-container"/>
      <button v-if="gameStarted" :class="['pause-btn']" @click="togglePause">{{ isPaused && !showUpgradeModal ? '▶ Resume' : '⏸ Pause' }}</button>
    </div>
    
    <!-- Upgrade Modal -->
    <div v-if="showUpgradeModal" class="modal-overlay">
      <div class="modal">
        <h2>Level Up!</h2>
        <p>Choose an upgrade:</p>
        <div class="upgrade-options">
          <button class="upgrade-btn" @click="applyUpgrade('fireRate')">
            <span class="upgrade-icon">⚡</span>
            <span class="upgrade-name">Fire Rate</span>
            <span class="upgrade-desc">+0.5 shots/sec</span>
          </button>
          <button class="upgrade-btn" @click="applyUpgrade('bulletSpeed')">
            <span class="upgrade-icon">💨</span>
            <span class="upgrade-name">Bullet Speed</span>
            <span class="upgrade-desc">+30 speed</span>
          </button>
          <button class="upgrade-btn" @click="applyUpgrade('bulletRange')">
            <span class="upgrade-icon">🎯</span>
            <span class="upgrade-name">Bullet Range</span>
            <span class="upgrade-desc">+30 range</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { markRaw, nextTick, onUnmounted, ref } from 'vue';
import { World } from '../../pixi_game2/pixigame/src/World.js';
import { Canvas, Camera } from '../../pixi_game2/pixigame-renderer/src/index.js';
import { GameEntity } from '../../pixi_game2/pixigame/src/entities/GameEntity.js';
import { MuzzleEntity } from '../../pixi_game2/pixigame/src/entities/MuzzleEntity.js';
import { EntityController } from '../../pixi_game2/pixigame/src/EntityController.js';

const canvasHost = ref(null);
const showUpgradeModal = ref(false);
const isPaused = ref(false);
const showMainMenu = ref(true);
const gameStarted = ref(false);

let world = null;
let canvas = null;
let camera = null;
let player = null;
let muzzle = null;
let controller = null;
let rafId = null;
let lastTime = performance.now();
let enemyCounter = 0;
let spawnTimer = 0;
let currentWave = 1;
let waveTimer = 0;
let playerLevel = 1;
let playerExp = 0;
const SPAWN_INTERVAL = 5;
const MAX_ENEMIES = 15;
const WAVE_DURATION = 30;
const ENEMY_DAMAGE_COOLDOWN = 1000;

let lastDamageTime = 0;

function getExpForLevel(level) {
  if (level <= 50) {
    return level * 5;
  }
  return 250 + (level - 50) * 1;
}

function addExp(amount) {
  playerExp += amount;
  const expNeeded = getExpForLevel(playerLevel);
  
  while (playerExp >= expNeeded) {
    playerExp -= expNeeded;
    playerLevel++;
    pauseGame();
    console.log(`⬆️ Level Up! Now level ${playerLevel}`);
  }
  
  updateExpDisplay();
}

function pauseGame() {
  isPaused.value = true;
  showUpgradeModal.value = true;
  window.timeSystem = { getTimeScale: () => 1.0, isPaused: () => true };
}

function resumeGame() {
  isPaused.value = false;
  showUpgradeModal.value = false;
  window.timeSystem = { getTimeScale: () => 1.0, isPaused: () => false };
}

function togglePause() {
  if (showUpgradeModal.value) return;
  
  if (isPaused.value) {
    resumeGame();
  } else {
    isPaused.value = true;
    window.timeSystem = { getTimeScale: () => 1.0, isPaused: () => true };
  }
}

function updateExpDisplay() {
  const levelDisplay = document.getElementById('level-display');
  const expDisplay = document.getElementById('exp-display');
  const expMaxDisplay = document.getElementById('exp-max-display');
  
  if (levelDisplay) levelDisplay.textContent = playerLevel;
  if (expDisplay) expDisplay.textContent = playerExp;
  if (expMaxDisplay) expMaxDisplay.textContent = getExpForLevel(playerLevel);
}

function applyUpgrade(type) {
  switch (type) {
    case 'fireRate':
      muzzle.fireRate += 0.5;
      console.log(`🔼 Fire Rate: ${muzzle.fireRate}`);
      break;
    case 'bulletSpeed':
      muzzle.bulletSpeed += 30;
      console.log(`🔼 Bullet Speed: ${muzzle.bulletSpeed}`);
      break;
    case 'bulletRange':
      muzzle.bulletRange += 30;
      console.log(`🔼 Bullet Range: ${muzzle.bulletRange}`);
      break;
  }
  resumeGame();
}

async function startGame() {
  showMainMenu.value = false;
  
  await nextTick();
  await new Promise(resolve => setTimeout(resolve, 100));
  
  if (!canvasHost.value) {
    console.error('canvasHost not found');
    return;
  }
  
  world = markRaw(new World({
    id: 'game_world',
    type: 'bounded',
    width: 800,
    height: 600,
    backgroundColor: '#1a1a2e',
    showBounds: true,
    boundsColor: '#444466'
  }));

  canvas = markRaw(new Canvas({
    id: 'game_canvas',
    sizeMode: 'fixed',
    width: 800,
    height: 600,
    backgroundColor: '#0a0a14',
    antialias: false,
    resolution: 1
  }));

  if (!canvasHost.value) {
    console.error('canvasHost not ready');
    return;
  }

  await canvas.start(canvasHost.value);

  camera = markRaw(new Camera({
    id: 'main_camera',
    canvas,
    world,
    anchor: 'center',
    width: 800,
    height: 600,
    x: 0,
    y: 0,
    focusX: 400,
    focusY: 300,
    zoom: 1,
    minZoom: 0.5,
    maxZoom: 2
  }));

  player = markRaw(new GameEntity({
    id: 'player',
    subtype: 'unit',
    worldId: 'game_world',
    position: { x: 400, y: 300 },
    velocity: { x: 0, y: 0 },
    movement: {
      maxSpeed: 250,
      acceleration: 800,
      friction: 6
    },
    appearance: {
      shape: 'circle',
      color: 0x4fc3f7,
      size: 25
    },
    hasCollision: true,
    collisionType: 'unit',
    collisionShape: 'circle',
    collisionSize: 25,
    statsSystem: true,
    stats: {
      hp: { current: 3, max: 3 }
    },
    deathBehavior: 'stay',
    rotationBehavior: 'mouse',
    rotationSpeed: 20
  }));

  player.addSlot({
    id: 'weapon_slot',
    offset: { x: 30, y: 0 },
    transformBehavior: 'follow_entity',
    physicsMode: 'instant',
    keyActionId: 'fire'
  });

  muzzle = markRaw(new MuzzleEntity({
    id: 'weapon_muzzle',
    direction: { x: 1, y: 0 },
    directionMode: 'relative',
    fireType: 'projectile',
    fireRate: 2,
    bulletSpeed: 300,
    bulletRange: 300,
    bulletSize: 6,
    bulletColor: '#FFD700',
    bulletPiercing: 1,
    autoFire: true,
    showDebug: false,
    stats: { damage: 10 }
  }));

  muzzle._rootEntityId = player.id;

  player.attachEntityToSlot(muzzle, 'weapon_slot');

  world.addEntity(player);
  world.addEntity(muzzle);

  world.projectileSystem.registerMuzzle(muzzle);

  world.collisionSystem.addCollisionType('unit', { name: 'Unit', defaultShape: 'circle' });
  world.collisionSystem.setCollisionRelation('projectile', 'unit', { block: false, trigger: true });
  world.collisionSystem.setCollisionRelation('unit', 'unit', { block: true, trigger: false });

  for (let i = 0; i < 3; i++) {
    spawnEnemy();
  }

  controller = markRaw(new EntityController({
    id: 'player_controller',
    target: player,
    targetId: 'player',
    inputType: 'keyboard',
    rotationMode: 'mouse',
    aimCamera: () => camera,
    bindings: {
      move_up: { primary: 'KeyW', secondary: 'ArrowUp' },
      move_down: { primary: 'KeyS', secondary: 'ArrowDown' },
      move_left: { primary: 'KeyA', secondary: 'ArrowLeft' },
      move_right: { primary: 'KeyD', secondary: 'ArrowRight' }
    },
    keyActions: {
      fire: 'Mouse0'
    }
  }));

  window.timeSystem = { getTimeScale: () => 1.0, isPaused: () => false };

  gameStarted.value = true;
  startRenderLoop();
}

function getEnemySpeed() {
  const baseSpeed = 40;
  const speedIncrease = 10;
  return baseSpeed + (currentWave - 1) * speedIncrease;
}

function spawnEnemy() {
  const margin = 50;
  const minDistanceFromPlayer = 400;
  let x, y;
  let attempts = 0;
  const maxAttempts = 100;

  do {
    x = margin + Math.random() * (800 - margin * 2);
    y = margin + Math.random() * (600 - margin * 2);
    attempts++;

    if (player) {
      const dx = player.position.x - x;
      const dy = player.position.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist >= minDistanceFromPlayer) break;
    } else {
      break;
    }
  } while (attempts < maxAttempts);

  const enemy = markRaw(new GameEntity({
    id: `enemy_${++enemyCounter}`,
    subtype: 'enemy',
    worldId: 'game_world',
    position: { x, y },
    velocity: { x: 0, y: 0 },
    movement: { maxSpeed: 0, acceleration: 0, friction: 0 },
    appearance: {
      shape: 'circle',
      color: 0xff4444,
      size: 20
    },
    hasCollision: true,
    collisionType: 'unit',
    collisionShape: 'circle',
    collisionSize: 20,
    statsSystem: true,
    stats: {
      hp: { current: 1, max: 1 }
    },
    deathBehavior: 'stay'
  }));

  world.addEntity(enemy);
  world.statsSystem.on(enemy.id, 'onDeath', () => addExp(1));
}

function getAliveEnemyCount() {
  if (!world) return 0;
  let count = 0;
  for (const [, components] of world.entities) {
    const entityRef = components.get('_entityRef');
    if (entityRef?.subtype === 'enemy' && !entityRef._isDead) {
      count++;
    }
  }
  return count;
}

function updateEnemyMovement(dt) {
  if (!player || !world) return;

  const playerPos = player.position;
  const enemySpeed = getEnemySpeed();

  for (const [, components] of world.entities) {
    const entityRef = components.get('_entityRef');
    if (entityRef?.subtype !== 'enemy' || entityRef._isDead) continue;

    const enemyPos = entityRef.position;
    const dx = playerPos.x - enemyPos.x;
    const dy = playerPos.y - enemyPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      const speed = enemySpeed * dt;
      entityRef.position.x += (dx / dist) * speed;
      entityRef.position.y += (dy / dist) * speed;
    }
  }
}

function checkEnemyPlayerCollision() {
  if (!player || !world || player._isDead) return;

  const playerPos = player.position;
  const playerRadius = 25;
  const enemyRadius = 20;
  const collisionDist = playerRadius + enemyRadius;

  for (const [, components] of world.entities) {
    const entityRef = components.get('_entityRef');
    if (entityRef?.subtype !== 'enemy' || entityRef._isDead) continue;

    const enemyPos = entityRef.position;
    const dx = playerPos.x - enemyPos.x;
    const dy = playerPos.y - enemyPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < collisionDist) {
      const now = performance.now();
      if (now - lastDamageTime >= ENEMY_DAMAGE_COOLDOWN) {
        lastDamageTime = now;
        player.takeDamage(1);
        
        const hpDisplay = document.getElementById('hp-display');
        if (hpDisplay) {
          hpDisplay.textContent = player.stats.hp.current;
        }
        console.log(`💔 Player HP: ${player.stats.hp.current}/${player.stats.hp.max}`);

        if (player.stats.hp.current <= 0) {
          console.log('💀 Player died!');
        }
      }
      break;
    }
  }
}

function startRenderLoop() {
  const loop = () => {
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    if (world && !isPaused.value) {
      if (controller && muzzle) {
        const isFiring = controller.isKeyActionActive('fire');
        muzzle.setFiring(isFiring);
      }

      if (controller) {
        controller.update(dt);
      }

      updateEnemyMovement(dt);
      checkEnemyPlayerCollision();
      world.update(dt * 1000);

      waveTimer += dt;
      if (waveTimer >= WAVE_DURATION) {
        waveTimer = 0;
        currentWave++;
        const waveDisplay = document.getElementById('wave-display');
        if (waveDisplay) {
          waveDisplay.textContent = currentWave;
        }
        console.log(`🌊 Wave ${currentWave} started! Enemy speed: ${getEnemySpeed()}`);
      }

      spawnTimer += dt;
      if (spawnTimer >= SPAWN_INTERVAL) {
        spawnTimer = 0;
        if (getAliveEnemyCount() < MAX_ENEMIES) {
          spawnEnemy();
        }
      }
    }

    if (canvas) {
      canvas.render();
    }

    rafId = requestAnimationFrame(loop);
  };

  rafId = requestAnimationFrame(loop);
}

onUnmounted(() => {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  if (controller) {
    controller.destroy();
    controller = null;
  }

  if (canvas) {
    canvas.destroy();
    canvas = null;
  }

  world = null;
  camera = null;
  player = null;
  muzzle = null;
});
</script>

<style scoped>
.game1-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  background: #0a0a14;
  padding: 20px;
}

.header {
  text-align: center;
  margin-bottom: 20px;
}

.header h1 {
  margin: 0 0 8px 0;
  color: #4fc3f7;
  font-size: 24px;
}

.hint {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.hint .wave {
  color: #4fc3f7;
  font-weight: bold;
}

.hint .level {
  color: #ffd700;
  font-weight: bold;
}

.hint .exp {
  color: #99ff99;
  font-weight: bold;
}

.hint .hp {
  color: #ff6b6b;
  font-weight: bold;
}

.game-wrapper {
  position: relative;
}

.canvas-container {
  width: 800px;
  height: 600px;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid #333;
}

.game-hidden {
  visibility: hidden;
  pointer-events: none;
}

.pause-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 8px 16px;
  background: rgba(79, 195, 247, 0.2);
  border: 1px solid #4fc3f7;
  border-radius: 4px;
  color: #4fc3f7;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.pause-btn:hover {
  background: rgba(79, 195, 247, 0.4);
}

.main-menu {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #0a0a14;
  display: flex;
  align-items: center;
  justify-content: center;
}

.menu-content {
  text-align: center;
}

.game-title {
  font-family: 'Courier New', monospace;
  font-size: 64px;
  color: #4fc3f7;
  margin: 0 0 10px 0;
  text-transform: uppercase;
  letter-spacing: 6px;
  text-shadow: 4px 4px 0 #1a3a4a;
  animation: title-pulse 2s ease-in-out infinite;
}

@keyframes title-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.game-subtitle {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  color: #666;
  margin: 0 0 50px 0;
  text-transform: uppercase;
  letter-spacing: 4px;
}

.start-btn {
  font-family: 'Courier New', monospace;
  font-size: 18px;
  padding: 14px 40px;
  background: #1a1a2e;
  border: 3px solid #4fc3f7;
  color: #4fc3f7;
  text-transform: uppercase;
  letter-spacing: 2px;
  cursor: pointer;
  box-shadow: 4px 4px 0 #1a3a4a;
  transition: none;
}

.start-btn:hover {
  background: #2a2a4e;
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 #1a3a4a;
}

.start-btn:active {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0 #1a3a4a;
}

.controls-hint {
  margin-top: 40px;
}

.controls-hint p {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #444;
  margin: 0;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: #0a0a14;
  padding: 0;
  border: 3px solid #4fc3f7;
  text-align: center;
  box-shadow: 
    4px 4px 0 #1a3a4a,
    -2px -2px 0 #0a1a2a inset;
}

.modal h2 {
  background: linear-gradient(180deg, #1a1a2e 0%, #0a0a14 100%);
  color: #ffd700;
  margin: 0;
  padding: 12px 24px;
  font-size: 18px;
  font-family: 'Courier New', monospace;
  text-transform: uppercase;
  letter-spacing: 2px;
  border-bottom: 3px solid #4fc3f7;
  text-shadow: 1px 1px 0 #8b6914;
}

.modal p {
  color: #aaa;
  margin: 10px 0;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.upgrade-options {
  display: flex;
  gap: 0;
  padding: 0 12px 12px;
}

.upgrade-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 16px;
  background: #1a1a2e;
  border: 2px solid #3a3a5e;
  cursor: pointer;
  min-width: 90px;
  margin: 0 6px;
  transition: none;
  box-shadow: 2px 2px 0 #0a0a14;
}

.upgrade-btn:hover {
  background: #2a2a4e;
  border-color: #4fc3f7;
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 #0a0a14;
}

.upgrade-btn:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 #0a0a14;
}

.upgrade-icon {
  font-size: 24px;
  margin-bottom: 6px;
  filter: drop-shadow(1px 1px 0 #000);
}

.upgrade-name {
  color: #fff;
  font-weight: bold;
  font-size: 11px;
  margin-bottom: 4px;
  font-family: 'Courier New', monospace;
  text-transform: uppercase;
  letter-spacing: 0;
  text-shadow: 1px 1px 0 #000;
}

.upgrade-desc {
  color: #4fc3f7;
  font-size: 10px;
  font-family: 'Courier New', monospace;
  text-shadow: 1px 1px 0 #000;
}
</style>
