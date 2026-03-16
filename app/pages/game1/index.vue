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


    <div class="game-wrapper" :class="{ 'game-hidden': !gameStarted }">
      <div id="game-canvas-container" ref="canvasHost" class="canvas-container"/>
      <button v-if="gameStarted" :class="['pause-btn']" @click="togglePause">{{ isPaused && !showUpgradeModal && !showBuildModal ? '▶ Resume' : '⏸ Pause' }}</button>
      <button v-if="gameStarted" class="build-btn" @click="openBuildModal">+</button>
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

    <!-- Build Modal -->
    <div v-if="showBuildModal" class="modal-overlay" @click.self="closeBuildModal">
      <div class="modal build-modal">
        <div class="modal-header">
          <h2>Build</h2>
          <button class="close-btn" @click="closeBuildModal">✕</button>
        </div>
        <div class="build-options">
          <div class="build-card" @click="selectTower">
            <div class="build-icon tower-icon"></div>
            <span class="build-name">Tower</span>
            <div class="build-stats">
              <div class="stat">Range: 150</div>
              <div class="stat">Atk Speed: 1.0/sec</div>
              <div class="stat">Damage: 10</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import * as PIXI from 'pixi.js';
import { markRaw, nextTick, onUnmounted, ref } from 'vue';
import { World } from '../../pixi_game2/pixigame/src/World.js';
import { Canvas, Camera } from '../../pixi_game2/pixigame-renderer/src/index.js';
import { GameEntity } from '../../pixi_game2/pixigame/src/entities/GameEntity.js';
import { MuzzleEntity } from '../../pixi_game2/pixigame/src/entities/MuzzleEntity.js';
import { EntityController } from '../../pixi_game2/pixigame/src/EntityController.js';

// Enemy sprite (balloon)
const RED_BLOON_URL = new URL('./src/img/red_bloon.png', import.meta.url).href;
const RED_BLOON_SOURCE_SIZE = 1024;
const ENEMY_SPRITE_SIZE = 50;
const ENEMY_COLLISION_SIZE = 20;

// Player sprite (dog)
const DOG_URL = new URL('./src/img/dog.png', import.meta.url).href;
const DOG_SOURCE_SIZE = 600;
const PLAYER_SPRITE_SIZE = 50;
const PLAYER_COLLISION_SIZE = 25;

// Tower sprite
const TOWER_URL = new URL('./src/img/tower1.png', import.meta.url).href;
const TOWER_SOURCE_SIZE = 860;
const TOWER_SPRITE_SIZE = 50;

// World terrain texture
const TERRAIN_URL = new URL('./src/img/terrain.png', import.meta.url).href;

const canvasHost = ref(null);
const showUpgradeModal = ref(false);
const showBuildModal = ref(false);
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

let isBuildMode = false;
let buildPreview = null;
let towerCount = 0;

let uiWaveText = null;
let uiLevelText = null;
let uiExpText = null;
let uiHpText = null;

function createUITexts() {
  const styleWave = new PIXI.TextStyle({
    fontFamily: 'Arial',
    fontSize: 24,
    fill: '#4fc3f7',
    fontWeight: 'bold'
  });
  const styleLevel = new PIXI.TextStyle({
    fontFamily: 'Arial',
    fontSize: 16,
    fill: '#ffffff'
  });
  const styleExp = new PIXI.TextStyle({
    fontFamily: 'Arial',
    fontSize: 16,
    fill: '#4fc3f7'
  });
  const styleHp = new PIXI.TextStyle({
    fontFamily: 'Arial',
    fontSize: 16,
    fill: '#ff4d4d'
  });

  uiWaveText = new PIXI.Text({ text: 'Wave: 1', style: styleWave });
  uiWaveText.anchor.set(0.5, 0);
  uiWaveText.x = 400;
  uiWaveText.y = 10;
  canvas._uiOverlay.addChild(uiWaveText);

  uiLevelText = new PIXI.Text({ text: 'Lv: 1', style: styleLevel });
  uiLevelText.anchor.set(0, 0);
  uiLevelText.x = 10;
  uiLevelText.y = 10;
  canvas._uiOverlay.addChild(uiLevelText);

  uiExpText = new PIXI.Text({ text: 'EXP: 0/5', style: styleExp });
  uiExpText.anchor.set(0, 0);
  uiExpText.x = 10;
  uiExpText.y = 32;
  canvas._uiOverlay.addChild(uiExpText);

  uiHpText = new PIXI.Text({ text: 'HP: 3/3', style: styleHp });
  uiHpText.anchor.set(0, 0);
  uiHpText.x = 10;
  uiHpText.y = 54;
  canvas._uiOverlay.addChild(uiHpText);
}

function updateUIWave() {
  if (uiWaveText) uiWaveText.text = `Wave: ${currentWave}`;
}

function updateUIExp() {
  if (uiLevelText) uiLevelText.text = `Lv: ${playerLevel}`;
  if (uiExpText) uiExpText.text = `EXP: ${playerExp}/${getExpForLevel(playerLevel)}`;
}

function updateUIHp() {
  if (uiHpText && player) {
    uiHpText.text = `HP: ${player.stats.hp.current}/${player.stats.hp.max}`;
  }
}

function openBuildModal() {
  isPaused.value = true;
  showBuildModal.value = true;
  window.timeSystem = { getTimeScale: () => 1.0, isPaused: () => true };
}

function closeBuildModal() {
  showBuildModal.value = false;
  if (!showUpgradeModal.value) {
    isPaused.value = false;
    window.timeSystem = { getTimeScale: () => 1.0, isPaused: () => false };
  }
}

function selectTower() {
  closeBuildModal();
  isBuildMode = true;
  createBuildPreview();
}

function createBuildPreview() {
  const container = new PIXI.Container();
  
  const bg = new PIXI.Graphics();
  bg.rect(-20, -20, 40, 40);
  bg.fill({ color: 0x4fc3f7, alpha: 0.5 });
  bg.stroke({ color: 0x4fc3f7, width: 2 });
  container.addChild(bg);
  
  const rangeCircle = new PIXI.Graphics();
  rangeCircle.circle(0, 0, 150);
  rangeCircle.stroke({ color: 0x4fc3f7, alpha: 0.3, width: 1 });
  container.addChild(rangeCircle);
  
  buildPreview = container;
  buildPreview.visible = false;
  canvas._uiOverlay.addChild(buildPreview);
}

function updateBuildPreview(screenX, screenY) {
  if (!buildPreview || !camera) return;
  
  const worldPos = camera.screenToWorld(screenX, screenY);
  buildPreview.x = screenX;
  buildPreview.y = screenY;
  buildPreview.visible = true;
}

function placeTower(screenX, screenY) {
  if (!camera || !world) return;
  
  const worldPos = camera.screenToWorld(screenX, screenY);
  
  const tower = markRaw(new GameEntity({
    id: `tower_${++towerCount}`,
    subtype: 'tower',
    worldId: 'game_world',
    position: { x: worldPos.x, y: worldPos.y },
    velocity: { x: 0, y: 0 },
    movement: { maxSpeed: 0, acceleration: 0, friction: 0 },
    appearance: {
      shape: 'sprite',
      textureUrl: TOWER_URL,
      size: TOWER_SPRITE_SIZE,
      scale: TOWER_SPRITE_SIZE / TOWER_SOURCE_SIZE
    },
    hasCollision: true,
    collisionType: 'build',
    collisionShape: 'rect',
    collisionSize: 40,
    deathBehavior: 'stay'
  }));
  
  tower.range = 150;
  tower.attackSpeed = 1.0;
  tower.damage = 10;
  tower.attackCooldown = 0;
  
  const towerMuzzle = markRaw(new MuzzleEntity({
    id: `tower_muzzle_${towerCount}`,
    worldId: 'game_world',
    position: { x: worldPos.x, y: worldPos.y },
    direction: { x: 1, y: 0 },
    directionMode: 'absolute',
    fireType: 'projectile',
    fireRate: 1.0,
    bulletSpeed: 300,
    bulletRange: 150,
    bulletSize: 5,
    bulletColor: '#00FF00',
    bulletPiercing: 1,
    autoFire: true,
    showDebug: false,
    stats: { damage: 10 }
  }));
  
  towerMuzzle._rootEntityId = tower.id;
  world.addEntity(tower);
  world.addEntity(towerMuzzle);
  world.projectileSystem.registerMuzzle(towerMuzzle);
  
  tower.muzzle = towerMuzzle;
  
  cancelBuildMode();
  console.log(`🏗️ Tower placed at (${Math.round(worldPos.x)}, ${Math.round(worldPos.y)})`);
}

function cancelBuildMode() {
  isBuildMode = false;
  if (buildPreview) {
    buildPreview.destroy();
    buildPreview = null;
  }
}

function setupBuildEvents() {
  const canvasEl = canvas.app.canvas;
  
  canvasEl.addEventListener('mousemove', (e) => {
    if (!isBuildMode) return;
    const rect = canvasEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    updateBuildPreview(x, y);
  });
  
  canvasEl.addEventListener('click', (e) => {
    if (!isBuildMode) return;
    const rect = canvasEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    placeTower(x, y);
  });
  
  canvasEl.addEventListener('contextmenu', (e) => {
    if (isBuildMode) {
      e.preventDefault();
      cancelBuildMode();
    }
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isBuildMode) {
      cancelBuildMode();
    }
  });
}

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
  if (showUpgradeModal.value || showBuildModal.value) return;
  
  if (isPaused.value) {
    resumeGame();
  } else {
    isPaused.value = true;
    window.timeSystem = { getTimeScale: () => 1.0, isPaused: () => true };
  }
}

function updateExpDisplay() {
  updateUIExp();
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
    backgroundColor: '#000000',
    backgroundTexture: {
      textureUrl: TERRAIN_URL,
      scaleMode: 'tile',
      sizeMode: 'dimensions',
      width: 150,
      height: 150
    },
    showBounds: true,
    boundsColor: '#000000'
  }));

  canvas = markRaw(new Canvas({
    id: 'game_canvas',
    sizeMode: 'fixed',
    width: 800,
    height: 600,
    backgroundColor: '#000000',
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
    maxZoom: 2,
    showBorder: false
  }));

  player = markRaw(new GameEntity({
    id: 'player',
    subtype: 'unit',
    worldId: 'game_world',
    position: { x: 400, y: 300 },
    velocity: { x: 0, y: 0 },
    movement: {
      maxSpeed: 100,
      acceleration: 800,
      friction: 6
    },
    appearance: {
      shape: 'sprite',
      textureUrl: DOG_URL,
      size: PLAYER_SPRITE_SIZE,
      scale: PLAYER_SPRITE_SIZE / DOG_SOURCE_SIZE
    },
    hasCollision: true,
    collisionType: 'unit',
    collisionShape: 'circle',
    collisionSize: PLAYER_COLLISION_SIZE,
    statsSystem: true,
    stats: {
      hp: { current: 3, max: 3 }
    },
    deathBehavior: 'stay',
    rotationBehavior: 'mouse',
    rotationSpeed: 20,
    rotationOffset: Math.PI
  }));

  player.addSlot({
    id: 'weapon_slot',
    offset: { x: 15, y: 0 },
    transformBehavior: 'follow_entity',
    physicsMode: 'instant',
    keyActionId: 'fire',
    visualEnabled: false
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
  world.collisionSystem.addCollisionType('build', { name: 'Build', defaultShape: 'rect' });
  world.collisionSystem.setCollisionRelation('projectile', 'unit', { block: false, trigger: true });
  world.collisionSystem.setCollisionRelation('projectile', 'build', { block: false, trigger: false });
  world.collisionSystem.setCollisionRelation('unit', 'unit', { block: true, trigger: false });
  world.collisionSystem.setCollisionRelation('unit', 'build', { block: true, trigger: false });

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

  createUITexts();
  setupBuildEvents();

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
      shape: 'sprite',
      textureUrl: RED_BLOON_URL,
      // Use size for culling / collision defaults
      size: ENEMY_SPRITE_SIZE,
      // Scale sprite down from source resolution
      scale: ENEMY_SPRITE_SIZE / RED_BLOON_SOURCE_SIZE
    },
    hasCollision: true,
    showCollisionBounds: false,
    collisionType: 'unit',
    collisionShape: 'circle',
    collisionSize: ENEMY_COLLISION_SIZE,
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
        updateUIHp();
        console.log(`💔 Player HP: ${player.stats.hp.current}/${player.stats.hp.max}`);

        if (player.stats.hp.current <= 0) {
          console.log('💀 Player died!');
        }
      }
      break;
    }
  }
}

function updateTowers(dt) {
  if (!world) return;
  
  for (const [, components] of world.entities) {
    const entityRef = components.get('_entityRef');
    if (entityRef?.subtype !== 'tower') continue;
    
    const tower = entityRef;
    const towerPos = tower.position;
    const range = tower.range || 150;
    const muzzle = tower.muzzle;
    
    if (!muzzle) continue;
    
    let nearestEnemy = null;
    let nearestDist = Infinity;
    
    for (const [, enemyComponents] of world.entities) {
      const enemyRef = enemyComponents.get('_entityRef');
      if (enemyRef?.subtype !== 'enemy' || enemyRef._isDead) continue;
      
      const enemyPos = enemyRef.position;
      const dx = enemyPos.x - towerPos.x;
      const dy = enemyPos.y - towerPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist <= range && dist < nearestDist) {
        nearestDist = dist;
        nearestEnemy = enemyRef;
      }
    }
    
    if (nearestEnemy) {
      const dx = nearestEnemy.position.x - towerPos.x;
      const dy = nearestEnemy.position.y - towerPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 0) {
        const angle = Math.atan2(dy, dx) + Math.PI / 2;
        tower.rotation = angle;
        muzzle.direction = { x: dx / dist, y: dy / dist };
        muzzle.position = { x: towerPos.x, y: towerPos.y };
        muzzle.setFiring(true);
      }
    } else {
      muzzle.setFiring(false);
    }
  }
}

function startRenderLoop() {
  const loop = () => {
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    if (world && !isPaused.value) {
      if (controller && muzzle && !isBuildMode) {
        const isFiring = controller.isKeyActionActive('fire');
        muzzle.setFiring(isFiring);
      }

      if (controller) {
        controller.update(dt);
      }

      updateEnemyMovement(dt);
      checkEnemyPlayerCollision();
      updateTowers(dt);
      world.update(dt * 1000);

      waveTimer += dt;
      if (waveTimer >= WAVE_DURATION) {
        waveTimer = 0;
        currentWave++;
        updateUIWave();
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

  if (buildPreview) {
    buildPreview.destroy();
    buildPreview = null;
  }

  uiWaveText = null;
  uiLevelText = null;
  uiExpText = null;
  uiHpText = null;

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

.build-btn {
  position: absolute;
  bottom: 10px;
  right: 10px;
  width: 40px;
  height: 40px;
  padding: 0;
  background: rgba(79, 195, 247, 0.2);
  border: 1px solid #4fc3f7;
  border-radius: 4px;
  color: #4fc3f7;
  font-size: 24px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.build-btn:hover {
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

.build-modal {
  min-width: 280px;
}

.build-modal .modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(180deg, #1a1a2e 0%, #0a0a14 100%);
  border-bottom: 3px solid #4fc3f7;
  padding: 12px 16px;
}

.build-modal .modal-header h2 {
  border: none;
  padding: 0;
  margin: 0;
}

.close-btn {
  background: transparent;
  border: none;
  color: #4fc3f7;
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #ffffff;
}

.build-options {
  padding: 16px;
}

.build-card {
  background: #1a1a2e;
  border: 2px solid #3a3a5e;
  padding: 16px;
  cursor: pointer;
  transition: none;
  box-shadow: 2px 2px 0 #0a0a14;
  text-align: left;
}

.build-card:hover {
  background: #2a2a4e;
  border-color: #4fc3f7;
  transform: translate(-2px, -2px);
  box-shadow: 4px 4px 0 #0a0a14;
}

.build-icon {
  width: 40px;
  height: 40px;
  margin-bottom: 8px;
}

.tower-icon {
  background-image: url('./src/img/tower1.png');
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  border: 2px solid #ffffff;
}

.build-name {
  display: block;
  color: #fff;
  font-weight: bold;
  font-size: 14px;
  font-family: 'Courier New', monospace;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.build-stats {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.build-stats .stat {
  color: #888;
  font-size: 11px;
  font-family: 'Courier New', monospace;
}
</style>
