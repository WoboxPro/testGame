<template>
  <div class="game-container">
    <div ref="pixiContainer" class="game-canvas"></div>
  </div>
</template>

<style scoped>
.game-container {
  padding: 20px;
}

.game-canvas {
  /* Размер задаёт сам PIXI.Application (800x600 по умолчанию в движке) */
}
</style>

<script setup>
import { onMounted, onUnmounted, ref, reactive } from 'vue';
import PixiShooterEngine from '~/services/PixiShooterEngine.js';

const pixiContainer = ref(null);
const engineRef = ref(null);

// Базовая конфигурация оружия (без UI)
const weaponConfig = reactive({
  weaponType: 'projectile',
  raycastAnimation: 'laser',
  bulletSpeed: 10,
  penetration: 2,
  bulletsPerShot: 1,
  maxRange: 400,
  bulletLifetime: 2.0,
  fireRate: 10,
  spread: 0.1,
  maxSpreadAngle: 5,
  rangeSpread: 0.1,
  maxRangeLoss: 20,
  fanSpread: false,
  fanAngle: 30,
  ricochetWalls: false,
  ricochetEnemies: false,
  maxRicochets: 3,
  recoil: 2.0,
  bulletDamage: 1,
  homingEnabled: false,
  homingStrength: 0.1,
  maxTurnRate: 3.0,
  homingDelay: 300,
  spawnAtCursor: false,
  largeBullets: false,
  bulletSize: 8,
  allowOffScreen: false,
  infiniteOffScreen: false,
  offScreenLimit: 500,
  useAmmoSystem: false,
  maxAmmo: 30,
  reloadTime: 2.0,
  ammoPerShot: true,
  gravityEnabled: false,
  gravityStrength: 0.05,
  gravityDelay: 200,
  maxFallSpeed: 15,
  gravityDirection: 90,
  autoFire: true,
  events: {
    onFlight: [],
    onHitEnemy: [],
    onRicochet: [],
    onExpire: [],
    onScreenEdge: []
  }
});

onMounted(async () => {
  if (process.client && pixiContainer.value) {
    const engine = new PixiShooterEngine(pixiContainer.value, weaponConfig);
    await engine.start();
    engineRef.value = engine;
  }
});

onUnmounted(() => {
  if (engineRef.value) {
    engineRef.value.destroy();
    engineRef.value = null;
  }
});
</script>


