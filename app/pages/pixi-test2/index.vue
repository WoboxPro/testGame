<template>
  <div class="container">
    <div class="info">
      <h1>🎮 PixiGame 2.0 - Два канваса</h1>
    </div>
    <div class="canvas-row">
      <div id="game-container" class="game-area"></div>
      <div id="game-container2" class="game-area"></div>
    </div>

  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { PixiGame } from '~/services/new/pixiGame.js';

let game = null;

onMounted(async () => {
  if (process.client) {
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
        backgroundColor: '#333333', // Серый фон незанятых областей
        containerId: 'game-container'  // 🎯 ID DOM элемента куда помещать канвас
      });
      const myCanvas2 = game.createCanvas({
        width: 800,
        height: 600,
        backgroundColor: '#333333', // Серый фон незанятых областей
        containerId: 'game-container2'  // 🎯 ID DOM элемента куда помещать канвас
      });
      const myCamera4 = game.createCamera({
        id: 'main_camera2',
        width: 800,           // Половина канваса
        height: 600,          // Вся высота
        x: 0,                 // Левая половина канваса
        y: 0,
        focusX: 0,            // Смотрит на центр мира
        focusY: 0,
        world: myWorld,
        canvas: myCanvas2,
        zoom: 1,            // Уменьшаем zoom чтобы видеть больше объектов
        priority: 1,
        hiddenTypes: ['bullet', 'effect', 'particle']    // Скрываем пули, эффекты, частицы

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
        priority: 2,         // Рисуется поверх
        // 🎛️ ФИЛЬТРАЦИЯ: мини-карта показывает только важные объекты
        visibleTypes: ['building', 'unit', 'resource'],  // Только здания, юниты, ресурсы
        hiddenTypes: ['bullet', 'effect', 'particle']    // Скрываем пули, эффекты, частицы
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
        priority: 3,
        hiddenTypes: ['resource']    // Скрываем пули, эффекты, частицы

      });
      
      // 🚀 Запускаем оба канваса (каждый найдет свой контейнер по ID)
      await game.startCanvas(myCanvas);
      await game.startCanvas(myCanvas2);
      
      // 🧪 Добавляем тестовые объекты разных типов для демонстрации фильтрации
      
      // 🏠 ЗДАНИЯ (будут видны в мини-карте)
      myWorld.addEntity({ x: -100, y: -80, type: 'building', name: 'База 1' });
      myWorld.addEntity({ x: 100, y: 80, type: 'building', name: 'База 2' });
      myWorld.addEntity({ x: 0, y: 0, type: 'building', name: 'Центральная база' });
      
      // 👥 ЮНИТЫ (будут видны в мини-карте)
      myWorld.addEntity({ x: -50, y: -30, type: 'unit', name: 'Солдат 1' });
      myWorld.addEntity({ x: 50, y: 30, type: 'unit', name: 'Солдат 2' });
      myWorld.addEntity({ x: 0, y: -60, type: 'unit', name: 'Командир' });
      
      // 💎 РЕСУРСЫ (будут видны в мини-карте)
      myWorld.addEntity({ x: -80, y: 0, type: 'resource', name: 'Руда' });
      myWorld.addEntity({ x: 80, y: 0, type: 'resource', name: 'Кристаллы' });
      
      // 🔫 ПУЛИ (НЕ будут видны в мини-карте)
      myWorld.addEntity({ x: -20, y: 10, type: 'bullet', name: 'Пуля 1' });
      myWorld.addEntity({ x: 20, y: -10, type: 'bullet', name: 'Пуля 2' });
      myWorld.addEntity({ x: 30, y: 20, type: 'bullet', name: 'Пуля 3' });
      
      // ✨ ЭФФЕКТЫ (НЕ будут видны в мини-карте)
      myWorld.addEntity({ x: -30, y: 40, type: 'effect', name: 'Взрыв 1' });
      myWorld.addEntity({ x: 40, y: -30, type: 'effect', name: 'Дым' });
      
      // 🌟 ЧАСТИЦЫ (НЕ будут видны в мини-карте)
      myWorld.addEntity({ x: -10, y: -20, type: 'particle', name: 'Искра 1' });
      myWorld.addEntity({ x: 10, y: 50, type: 'particle', name: 'Искра 2' });
      
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

.canvas-row {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  justify-content: center;
}

.game-area {
  border: 3px solid #333;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
</style>