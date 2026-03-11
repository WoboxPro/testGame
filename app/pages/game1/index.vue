<template>
  <div class="game1-page">
    <header class="header">
      <h1>Game1 - Top-Down Shooter</h1>
      <p class="hint">WASD to move | Mouse to aim | Left Click to shoot | <span class="hp">HP: <span id="hp-display">3</span>/3</span></p>
    </header>
    <div ref="canvasHost" class="canvas-container"></div>
  </div>
</template>

<script setup>
import { markRaw, onMounted, onUnmounted, ref } from 'vue';
import { World } from '../../pixi_game2/pixigame/src/World.js';
import { Canvas, Camera } from '../../pixi_game2/pixigame-renderer/src/index.js';
import { GameEntity } from '../../pixi_game2/pixigame/src/entities/GameEntity.js';
import { MuzzleEntity } from '../../pixi_game2/pixigame/src/entities/MuzzleEntity.js';
import { EntityController } from '../../pixi_game2/pixigame/src/EntityController.js';

const canvasHost = ref(null);

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
const SPAWN_INTERVAL = 5;
const MAX_ENEMIES = 15;
const ENEMY_SPEED = 40;
const ENEMY_DAMAGE_COOLDOWN = 1000;

let lastDamageTime = 0;

function spawnEnemy() {
  const margin = 50;
  const x = margin + Math.random() * (800 - margin * 2);
  const y = margin + Math.random() * (600 - margin * 2);

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
    collisionType: 'enemy',
    collisionShape: 'circle',
    collisionSize: 20,
    statsSystem: true,
    stats: {
      hp: { current: 1, max: 1 }
    },
    deathBehavior: 'stay'
  }));

  world.addEntity(enemy);
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

  for (const [, components] of world.entities) {
    const entityRef = components.get('_entityRef');
    if (entityRef?.subtype !== 'enemy' || entityRef._isDead) continue;

    const enemyPos = entityRef.position;
    const dx = playerPos.x - enemyPos.x;
    const dy = playerPos.y - enemyPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      const speed = ENEMY_SPEED * dt;
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

onMounted(async () => {
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
    antialias: true,
    resolution: 1
  }));

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
    collisionType: 'player',
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

  world.collisionSystem.addCollisionType('enemy', { name: 'Enemy', defaultShape: 'circle' });
  world.collisionSystem.addCollisionType('player', { name: 'Player', defaultShape: 'circle' });
  world.collisionSystem.setCollisionRelation('projectile', 'enemy', { block: false, trigger: true });

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

  startRenderLoop();
});

function startRenderLoop() {
  const loop = () => {
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    if (controller && muzzle) {
      const isFiring = controller.isKeyActionActive('fire');
      muzzle.setFiring(isFiring);
    }

    if (controller) {
      controller.update(dt);
    }

    if (world) {
      updateEnemyMovement(dt);
      checkEnemyPlayerCollision();
      world.update(dt * 1000);

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

.hint .hp {
  color: #ff6b6b;
  font-weight: bold;
}

.canvas-container {
  width: 800px;
  height: 600px;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid #333;
}
</style>
