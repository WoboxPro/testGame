<template>
  <div class="game-container">
    <div ref="pixiContainer" class="game-canvas"></div>
  </div>
</template>

<style scoped>
.game-container {
  padding: 20px;
  display: grid;
  place-items: center;
}

.game-canvas {
    outline: 1px solid gray;
}
</style>

<script setup>
import { onMounted, onUnmounted, ref, reactive } from 'vue';
import PixiShooterEngine, { getDefaultWeaponConfig } from '~/services/PixiShooterEngine.js';

const pixiContainer = ref(null);
const engineRef = ref(null);

// Берём дефолт конфиг из движка и оборачиваем в reactive при необходимости
const weaponConfig = reactive(getDefaultWeaponConfig());
console.log(getDefaultWeaponConfig());
onMounted(async () => {
  if (process.client) {
    // вариант 1
    const engine = new PixiShooterEngine(pixiContainer.value, weaponConfig, {});
    // вариант 2
    // const engine = new PixiShooterEngine(null, weaponConfig, {
    //   mountTarget: '.game-canvas'
    // });
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


