<template>
  <div class="container">
    <div class="info">
      <h1>🎮 PixiGame 2.0</h1>
    </div>
    <div ref="gameContainer" class="game-area"></div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { PixiGame } from '~/services/new/pixiGame.js';

const gameContainer = ref(null);
let game = null;

onMounted(async () => {
  if (process.client && gameContainer.value) {
    try {
      console.log('🚀 Создаем PixiGame по вашей архитектуре...');
      
      // 🎮 Создаем движок
      game = new PixiGame();
      
      // 🌍 Создаем мир с размерами и фоном
      const myWorld = game.createWorld({
        width: 1200,
        height: 900,
        backgroundColor: '#ff0000'
      });
      
      // 🖼️ Создаем канвас с размерами и цветом фона для незанятых областей
      const myCanvas = game.createCanvas({
        width: 800,
        height: 600,
        backgroundColor: '#333333' // Серый фон незанятых областей
      });
      
      // 📷 Создаем первую камеру (основная, занимает левую половину)
      const myCamera1 = game.createCamera({
        id: 'main_camera',
        width: 400,           // Половина канваса
        height: 600,          // Вся высота
        x: 0,                 // Левая половина канваса
        y: 0,
        focusX: 0,            // Смотрит на центр мира
        focusY: 0,
        world: myWorld,
        canvas: myCanvas,
        zoom: 0.8,            // Уменьшаем zoom чтобы видеть больше объектов
        priority: 1
      });
      
      // 📷 Создаем вторую камеру (мини-карта, правый верх)
      const myCamera2 = game.createCamera({
        id: 'mini_camera',
        width: 200,           // Маленькая камера
        height: 200,
        x: 600,              // Правая часть канваса
        y: 0,                // Верх
        focusX: 0,           // Тоже смотрит на центр
        focusY: 0,
        world: myWorld,      // ТОТ ЖЕ МИР!
        canvas: myCanvas,    // ТОТ ЖЕ КАНВАС!
        zoom: 0.1,           // Меньший зум для обзора
        priority: 2          // Рисуется поверх
      });
      
      // 📷 Создаем третью камеру (детали, правый низ)
      const myCamera3 = game.createCamera({
        id: 'detail_camera',
        width: 400,
        height: 300,
        x: 400,              // Правая часть
        y: 300,              // Низ
        focusX: 0,           // 🎯 Тоже смотрит на центр мира
        focusY: 0,           // 🎯 Тоже смотрит на центр мира  
        world: myWorld,      // ТОТ ЖЕ МИР!
        canvas: myCanvas,    // ТОТ ЖЕ КАНВАС!
        zoom: 2,           // Слегка увеличенный зум (было 2.0)
        priority: 3
      });
      
      // 🚀 Запускаем канвас
      await game.startCanvas(myCanvas, gameContainer.value);
      
      // 🧪 Добавляем тестовые объекты в мир (ближе к центру, чтобы все камеры их видели)
      myWorld.addEntity({ x: 0, y: 0, type: 'center', name: 'Центр' });
      myWorld.addEntity({ x: -100, y: -80, type: 'corner', name: 'Левый верх' });
      myWorld.addEntity({ x: -120, y: -80, type: 'corner', name: 'Левый верх' });

      myWorld.addEntity({ x: -80, y: -80, type: 'corner', name: 'Левый верх' });
      myWorld.addEntity({ x: 100, y: 80, type: 'corner', name: 'Правый низ' });
         myWorld.addEntity({ x: 120, y: 80, type: 'corner', name: 'Правый низ' });
                  myWorld.addEntity({ x: 80, y: 80, type: 'corner', name: 'Правый низ' });

      myWorld.addEntity({ x: -50, y: 40, type: 'random', name: 'Случайный 1' });
      myWorld.addEntity({ x: 80, y: -60, type: 'random', name: 'Случайный 2' });
      myWorld.addEntity({ x: 30, y: 30, type: 'random', name: 'Случайный 3' });
      myWorld.addEntity({ x: -80, y: 0, type: 'random', name: 'Слева' });
      myWorld.addEntity({ x: 0, y: -50, type: 'random', name: 'Сверху' });
      myWorld.addEntity({ x: 60, y: 0, type: 'random', name: 'Справа' });
      myWorld.addEntity({ x: 0, y: 60, type: 'random', name: 'Снизу' });
      
      console.log('✅ PixiGame 2.0 запущен с гибкой архитектурой!');
      console.log('🌍 1 мир, 1 канвас, 3 камеры в разных областях');
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
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100vh;
  background: #838383;
  padding: 20px;
  gap: 20px;
}

.info {
  text-align: center;
  color: #333;
}

.info h1 {
  font-size: 24px;
  margin-bottom: 8px;
}

.info p {
  font-size: 14px;
  color: #666;
}

.game-area {
  border: 3px solid #333;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
</style>