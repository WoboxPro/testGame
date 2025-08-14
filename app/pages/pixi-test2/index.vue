<template>
  <div class="container">
    <div class="main-view">
      <div ref="gameContainer" class="game-area"></div>
    </div>
    <div class="mini-view">
      <div ref="miniContainer" class="mini-area"></div>
      <p class="mini-label">Mini Camera (Zoom 0.3)</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { PixiGame } from '~/services/new/pixiGame.js';

const gameContainer = ref(null);
const miniContainer = ref(null);
let game = null;

onMounted(async () => {
  if (process.client && gameContainer.value) {
    try {
      // 🎮 Создаем движок только с миром (НОВЫЙ гибкий API)
      game = new PixiGame({
        worldWidth: 1200,
        worldHeight: 900
      });
      
      // 🖼️ Создаем канвас вручную
      const { id: canvasId, canvas } = game.createCanvas(800, 600, {
        backgroundColor: '#0a0a0a'
      });
      
      // 📷 Создаем камеру привязанную к канвасу
      const { id: cameraId, camera } = game.createCamera(canvasId);
      
      // 🚀 Запускаем канвас в DOM контейнер
      await game.startCanvas(canvasId, gameContainer.value);
      
      // ▶️ Запускаем игровой цикл
      game.isRunning = true;
      game.lastTime = performance.now();
      game._gameLoop();
      
      // 🧪 Добавляем несколько тестовых объектов в центрированной системе координат
      game.addEntity({ x: 0, y: 0, type: 'center', name: 'Center' });
      game.addEntity({ x: -400, y: -300, type: 'corner', name: 'TopLeft' });
      game.addEntity({ x: 400, y: 300, type: 'corner', name: 'BottomRight' });
      game.addEntity({ x: -200, y: 150, type: 'random', name: 'Random1' });
      game.addEntity({ x: 300, y: -200, type: 'random', name: 'Random2' });
      
      // 🖼️📷 ДЕМОНСТРАЦИЯ ГИБКОСТИ: Создаем вторую камеру!
      if (miniContainer.value) {
        // Создаем второй канвас для мини-карты
        const { id: miniCanvasId, canvas: miniCanvas } = game.createCanvas(200, 200, {
          backgroundColor: '#1a1a3e'
        });
        
        // Создаем вторую камеру для того же мира
        const { id: miniCameraId, camera: miniCamera } = game.createCamera(miniCanvasId);
        
        // Запускаем второй канвас в другой DOM элемент
        await game.startCanvas(miniCanvasId, miniContainer.value);
        
        // Настраиваем мини-камеру: меньший zoom, показываем весь мир
        miniCamera.setZoom(0.3);
        miniCamera.setPosition(0, 0); // Центр мира
        
        console.log(`🗺️ Mini Camera ID: ${miniCameraId}, Canvas ID: ${miniCanvasId}`);
      }
      
      console.log('✅ PixiGame 2.0 запущен с гибкой системой камер!');
      console.log('🌍 Мир создан с центрированными координатами');
      console.log(`🖼️ Main Canvas ID: ${canvasId}`);
      console.log(`📷 Main Camera ID: ${cameraId}`);
      console.log('📊 Отладочная информация:', game.getDebugInfo());
      
    } catch (error) {
      console.error('❌ Ошибка запуска:', error);
    }
  }
});

onUnmounted(() => {
  if (game) {
    game.stop();
    game = null;
  }
});
</script>

<style scoped>

*{
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  height: 100vh;
  background: #838383;
  padding: 20px;
}

.main-view {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.mini-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.game-area {
  border: 3px solid #333;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

.mini-area {
  border: 2px solid #666;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

.mini-label {
  color: #333;
  font-family: 'Segoe UI', sans-serif;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  background: rgba(255,255,255,0.9);
  padding: 4px 8px;
  border-radius: 4px;
}
</style>