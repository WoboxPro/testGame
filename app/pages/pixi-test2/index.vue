<template>
  <div class="container">
    <div class="info">
      <h1>🎮 PixiGame 2.0 - Гибридная система рендеринга</h1>
      <p>🎯 <strong>Три системы рендеринга:</strong> 🔵 Graphics (геометрия) • 👤 Sprite (Terraria-стиль) • 🦴 Skeletal (анимация)</p>
      <p>🖱️ <strong>Кликайте по канвасам!</strong> Координаты мира выводятся в консоль. На одном объекте разные камеры должны показать одинаковые мировые координаты!</p>
      <p>🎮 <strong>Управление камерой (Numpad):</strong> 📍 1(⬅️),2(⬇️),3(➡️),5(⬆️) • 🔍 +/- (зум) • 📷 */÷ (переключение камер)</p>
      <p>🔲 <strong>Границы мира:</strong> Голубые линии показывают границы мира (1200×900px). Видны на всех камерах с разным зумом!</p>
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
      // 🎮 Создаем движок
      game = new PixiGame();
      
      // 🌍 Создаем мир с размерами, фоном и границами
      const myWorld = game.createWorld({
        width: 1200,
        height: 900,
        backgroundColor: '#000000', // Красный фон для отладки
        borders: {
          enabled: true,        // Включаем границы
          width: 2,            // Толщина 6px
          color: 0x00FFFF,     // Голубой цвет
          style: 'solid'       // Сплошная линия
        }
      });
      
      // 🖼️ Создаем канвас с размерами и цветом фона для незанятых областей
      const myCanvas = game.createCanvas({
        width: 800,
        height: 600,
        backgroundColor: '#333333', // Серый фон незанятых областей
        containerId: 'game-container'  //  ID DOM элемента куда помещать канвас
      });
      // const myCanvas2 = game.createCanvas({
      //   width: 800,
      //   height: 600,
      //   backgroundColor: '#333333', // Серый фон незанятых областей
      //   containerId: 'game-container2'  // 🎯 ID DOM элемента куда помещать канвас
      // });
      // const myCamera4 = game.createCamera({
      //   id: 'main_camera2',
      //   width: 800,           // Половина канваса
      //   height: 600,          // Вся высота
      //   x: 0,                 // Левая половина канваса
      //   y: 0,
      //   focusX: 0,            // Смотрит на центр мира
      //   focusY: 0,
      //   world: myWorld,
      //   canvas: myCanvas2,
      //   zoom: 0.7,            // Уменьшаем zoom чтобы видеть больше объектов
      //   priority: 1,
      //   hiddenTypes: ['bullet', 'effect', 'particle'],    // Скрываем пули, эффекты, частицы
      //   style: {
      //     border: {
      //       enabled: true,
      //       width: 3,
      //       color: 0xFF0080  // Розовый для четвертой камеры
      //     }
      //   }
      // });
      // await game.startCanvas(myCanvas2);

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
        zoom: 1,            // Уменьшаем zoom чтобы видеть больше объектов
        priority: 1,
        style: {
          border: {
            enabled: true,
            width: 2,
            color: 0x00FF00  // Зеленый для основной камеры
          }
        }
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
        zoom: 0.2,           // Меньший зум для обзора
        priority: 2,         // Рисуется поверх
        // 🎛️ ФИЛЬТРАЦИЯ: мини-карта показывает только важные объекты
        visibleTypes: ['building', 'unit', 'resource', 'world_border'],  // + границы мира!
        hiddenTypes: ['bullet', 'effect', 'particle'],    // Скрываем пули, эффекты, частицы
        style: {
          border: {
            enabled: true,
            width: 1,
            color: 0x0080FF  // Синий для мини-карты
          }
        }
      });
      
      // // // 📷 Создаем третью камеру (детали, правый низ)
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
        hiddenTypes: ['resource'],    // Скрываем пули, эффекты, частицы
        style: {
          border: {
            enabled: true,
            width: 2,
            color: 0xFF8000  // Оранжевый для детальной камеры
          }
        }
      });
      
      // 🚀 Запускаем оба канваса (каждый найдет свой контейнер по ID)
      await game.startCanvas(myCanvas);
      

      
      // 🧪 Добавляем тестовые сущности с НОВОЙ ГИБРИДНОЙ СИСТЕМОЙ РЕНДЕРИНГА!
      
      // 🔵 GRAPHICS СИСТЕМА (геометрические фигуры - как раньше)
      
      // 🏗️ СТРУКТУРЫ (будут видны в мини-карте)
      myWorld.addStructure(-100, -80, { name: 'База 1 (Graphics)', form: 'building', size: 25 });
      myWorld.addStructure(100, 80, { name: 'База 2 (Graphics)', form: 'building', size: 20 });
      myWorld.addStructure(0, 0, { name: 'Центр (Graphics)', form: 'building', size: 30, color: 0xFF6B35 });
      myWorld.addStructure(-60, 60, { name: 'Башня (Graphics)', form: 'tower', size: 15, color: 0x654321 });
      
      // 👥 ЮНИТЫ (будут видны в мини-карте)
      myWorld.addUnit(-50, -30, { name: 'Солдат 1 (Graphics)', form: 'soldier', size: 8 });
      myWorld.addUnit(50, 30, { name: 'Солдат 2 (Graphics)', form: 'soldier', size: 8 });
      myWorld.addUnit(0, -60, { name: 'Командир (Graphics)', form: 'soldier', size: 10, color: 0x0000FF });
      myWorld.addUnit(70, -20, { name: 'Танк (Graphics)', form: 'tank', size: 12, color: 0x228B22 });
      
      // 🌿 ДЕКОРАЦИИ/РЕСУРСЫ (будут видны в мини-карте, но скрыты в detail)
      myWorld.addDecoration(-80, 0, { name: 'Руда', form: 'diamond', size: 8, color: 0xFFD700, type: 'resource' });
      myWorld.addDecoration(80, 0, { name: 'Кристаллы', form: 'diamond', size: 6, color: 0x9370DB, type: 'resource' });
      myWorld.addDecoration(-40, 70, { name: 'Дерево 1', form: 'tree', size: 12, type: 'decoration' });
      myWorld.addDecoration(40, -70, { name: 'Дерево 2', form: 'tree', size: 10, type: 'decoration' });
      
      // 🔫 ПУЛИ (НЕ будут видны в мини-карте)
      myWorld.addEntity({ x: -20, y: 10, type: 'bullet', form: 'bullet', size: 3, name: 'Пуля 1', color: 0xFF4500 });
      myWorld.addEntity({ x: 20, y: -10, type: 'bullet', form: 'bullet', size: 2, name: 'Пуля 2', color: 0xFF6347 });
      myWorld.addEntity({ x: 30, y: 20, type: 'bullet', form: 'circle', size: 2, name: 'Пуля 3', color: 0xDC143C });
      
      // ✨ ЭФФЕКТЫ (НЕ будут видны в мини-карте)
      myWorld.addEntity({ x: -30, y: 40, type: 'effect', form: 'explosion', size: 8, name: 'Взрыв 1', color: 0xFF4500 });
      myWorld.addEntity({ x: 40, y: -30, type: 'effect', form: 'star', size: 6, name: 'Дым', color: 0x696969 });
      
      // 🌟 ЧАСТИЦЫ (НЕ будут видны в мини-карте)
      myWorld.addEntity({ x: -10, y: -20, type: 'particle', form: 'circle', size: 1, name: 'Искра 1', color: 0xFFFFFF });
      myWorld.addEntity({ x: 10, y: 50, type: 'particle', form: 'circle', size: 1, name: 'Искра 2', color: 0xFFFACD });
      
      // 👤 НОВИНКА: SPRITE СИСТЕМА (Terraria-стиль) - ВРЕМЕННО ЗАКОММЕНТИРОВАНО
      /*
      // Импортируем EntityFactory для доступа к новым методам
      const { EntityFactory } = await import('~/services/new/core/Entity.js');
      
      // 🎮 Создаем sprite персонажей с экипировкой
      const spriteHero = EntityFactory.createSpriteCharacter(-150, 0, {
        name: 'Герой (Sprite)',
        sprite: 'hero_base.png', // Базовый спрайт (файл пока не существует, но система готова!)
        equippedItems: {
          'head': 'iron_helmet.png',
          'chest': 'chainmail_armor.png',
          'hand_right': 'steel_sword.png',
          'hand_left': 'wooden_shield.png'
        }
      });
      myWorld.addEntity(spriteHero);
      
      const spriteWizard = EntityFactory.createSpriteCharacter(150, 0, {
        name: 'Маг (Sprite)',
        sprite: 'wizard_base.png',
        equippedItems: {
          'head': 'wizard_hat.png',
          'chest': 'magic_robe.png',
          'hand_right': 'magic_staff.png'
        }
      });
      myWorld.addEntity(spriteWizard);
      
      // 🦴 НОВИНКА: SKELETAL СИСТЕМА (продвинутая анимация)
      
      // 🤺 Skeletal персонажи с анимациями
      const skeletalWarrior = EntityFactory.createSkeletalCharacter(0, 150, {
        name: 'Воин (Skeletal)',
        skeleton: 'warrior_skeleton.json', // Файл пока не существует, но система готова!
        currentAnimation: 'idle'
      });
      myWorld.addEntity(skeletalWarrior);
      
      const skeletalDragon = EntityFactory.createSkeletalCreature(0, -150, {
        name: 'Дракон (Skeletal)',
        skeleton: 'dragon_skeleton.json',
        currentAnimation: 'idle'
      });
      myWorld.addEntity(skeletalDragon);
      
      // 🎭 Демонстрация возможностей
      setTimeout(() => {
        console.log('🎭 Демонстрация гибридной системы рендеринга:');
        
        // Меняем экипировку sprite персонажа
        spriteHero.equipItem('hand_right', 'magic_bow.png');
        spriteHero.equipItem('head', 'dragon_helmet.png');
        console.log('⚔️ Герой сменил меч на лук и надел драконий шлем!');
        
        // Меняем анимацию skeletal персонажа
        skeletalWarrior.playAnimation('attack');
        skeletalDragon.playAnimation('move');
        console.log('🎬 Воин атакует, дракон двигается!');
      }, 3000);
      */
      
      // 🎯 НОВИНКА: Система выбора камеры для управления
      
      // Выбираем основную камеру для демонстрации
      game.selectCamera(myCamera1);
      
      // 🎮 НОВИНКА: Создаем контроллер управления камерой
      const controller = game.createCameraController({
        moveSpeed: 2,            // 🎯 1 пиксель за шаг (плавно!)
       // smoothMove: true,        // 🎯 плавное движение включено
        zoomStep: 0.02,          // Более плавный зум
        minZoom: 0.2,            // Минимальный зум
        maxZoom: 3.0             // Максимальный зум
      });
      
      // Принудительное включение контроллера
      controller.enable();
      
      // 📊 НОВИНКА: Создаем счетчик FPS
      // const fpsCounter = game.createFPSCounter({
      //   updateInterval: 500,     // Обновление каждые 500мс (более отзывчивый)
      //   style: {
      //     top: '10px',
      //     left: '10px',
      //     backgroundColor: 'rgba(0, 20, 0, 0.8)',
      //     color: '#00FF00',
      //     fontSize: '16px',
      //     padding: '10px 15px',
      //     borderRadius: '8px'
      //   }
      // });
      

      
      game.selectCamera(myCamera1);

      
      // PixiGame 2.0 запущен успешно
      
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