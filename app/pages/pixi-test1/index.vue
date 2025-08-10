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
    //const engine = new PixiShooterEngine(pixiContainer.value, weaponConfig, {});
    // вариант 2
    // const engine = new PixiShooterEngine(null, weaponConfig, {
    //   mountTarget: '.game-canvas'
    // });
    // вариант 3 - тестируем новый World класс с типом 'solid'
    const engine = new PixiShooterEngine(null, weaponConfig, {
      canvas: { width: 800, height: 600, background: '#111111', showFPS: true },
      world: { 
        type: 'solid',     // solid мир с фиксированными размерами больше canvas
        width: 1600,       // в 2 раза больше canvas (800 * 2)
        height: 1200,      // в 2 раза больше canvas (600 * 2)
        gravity: {
          enabled: false,
          strength: 0.1
        },
        spatialGrid: {
          enabled: false,    // 🚀 включить/выключить Spatial Grid оптимизацию
          sectorSize: 50     // размер сектора в пикселях (50x50, 100x100, и т.д.)
        }
      }
    });

    
    await engine.start();
    engineRef.value = engine;

    // 🎮 СОЗДАЕМ ИГРОВЫЕ СУЩНОСТИ ЧЕРЕЗ НОВУЮ ENTITY СИСТЕМУ

    // 1️⃣ Создаем игрока (треугольник, зеленый, с оружием)
    const playerId = engine.addEntity({
      x: 400, 
      y: 300,
      type: 'unit',
      faction: 'player',
      visual: 'triangle',
      characteristics: {
        hp: 100,
        maxHp: 100,
        speed: 5,
        canMove: true,
        canTakeDamage: true
      },
      weapons: [{
        weaponId: 'mainGun',
        weaponConfig: weaponConfig,  // Используем реактивные настройки из UI
        controller: 'player'
      }],
      movementController: 'wasd'  // Управление на WASD
    });

    // 2️⃣ Создаем врага (квадрат, красный, без оружия)  
    const enemyId = engine.addEntity({
      x: 200,
      y: 250, 
      type: 'unit',
      faction: 'enemy',
      visual: 'square',
      characteristics: {
        hp: 1,           // Слабый враг
        maxHp: 1,
        canMove: false,  // Статичный
        canTakeDamage: true
      }
      // weapons: [] - без оружия пока что
    });

    console.log(`🎯 Создано сущностей: Игрок ID=${playerId}, Враг ID=${enemyId}`);
    console.log(`🎮 Визуально: 1 зеленый треугольник (игрок) + 1 красный квадрат (враг)`);
  }
});

onUnmounted(() => {
  if (engineRef.value) {
    engineRef.value.destroy();
    engineRef.value = null;
  }
});
</script>


