<template>
  <div class="game1-page">
    <header class="header">
      <h1>Game1 - Top-Down Shooter</h1>
      <p class="hint">WASD to move | Mouse to aim | Left Click to shoot</p>
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
    hasCollision: false,
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
    fireRate: 8,
    bulletSpeed: 600,
    bulletRange: 800,
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
  world.collisionSystem.setCollisionRelation('projectile', 'enemy', { block: false, trigger: true });

  const enemyPositions = [
    { x: 150, y: 150 },
    { x: 650, y: 150 },
    { x: 400, y: 500 }
  ];

  enemyPositions.forEach((pos, i) => {
    const enemy = markRaw(new GameEntity({
      id: `enemy_${i + 1}`,
      subtype: 'enemy',
      worldId: 'game_world',
      position: { ...pos },
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
  });

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
      world.update(dt * 1000);
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

.canvas-container {
  width: 800px;
  height: 600px;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid #333;
}
</style>
