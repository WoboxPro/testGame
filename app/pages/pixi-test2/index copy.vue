<template>
  <div class="container">
    <div class="info">
      <h1>🎮 PixiGame 2.0 - Гибридная система + Биомы + Зоны + Фракции + Коллизии</h1>
      <p>🎮 <strong>Управление камерой (Numpad):</strong> 📍 1(⬅️),2(⬇️),3(➡️),5(⬆️) • 🔍 +/- (зум) • 📷 */÷ (переключение камер) • 📹 Основная камера автоследит героя!</p>
      <p>🏃 <strong>Управление героями (WASD):</strong> 📍 W(⬆️),A(⬅️),S(⬇️),D(➡️) • ⚡ Shift (ускорение) • 🐌 Ctrl (замедление) • 🔄 Tab (переключение) • 🎯 <strong>НОВИНКА:</strong> Прямоугольные коллизии!</p>
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
import { CreateBiome } from '~/services/new/core/CreateBiome.js';
import { CreateZone } from '~/services/new/core/CreateZone.js';
import { CreateFaction } from '~/services/new/core/CreateFaction.js';
import { createUnitCollision, createAutoUnitCollision, createTriggerCollision } from '~/services/new/core/CreateCollision.js';

let game = null;

onMounted(async () => {
  if (process.client) {
    try {
// GAME -----------------------------------------------------------------------------------------------------------------
      game = new PixiGame();
      
// WORLD -----------------------------------------------------------------------------------------------------------------
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

// CANVAS -----------------------------------------------------------------------------------------------------------------
      const myCanvas = game.createCanvas({
        width: 800,
        height: 600,
        backgroundColor: '#333333', // Серый фон незанятых областей
        containerId: 'game-container'  //  ID DOM элемента куда помещать канвас
      });

      await game.startCanvas(myCanvas);

// CAMERA -----------------------------------------------------------------------------------------------------------------
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
        respectWorldBounds: true,  // 🌍 НОВИНКА: Учитывать границы мира при слежении!
        style: {
          border: {
            enabled: true,
            width: 2,
            color: 0x00FF00  // Зеленый для основной камеры
          }
        }
      });
      
      // 📷 Создаем вторую камеру (мини-карта, правый верх) 
      // const myCamera2 = game.createCamera({
      //   id: 'mini_camera',
      //   width: 200,           // Маленькая камера
      //   height: 200,
      //   x: 600,              // Правая часть канваса
      //   y: 0,                // Верх
      //   focusX: 0,           // Тоже смотрит на центр
      //   focusY: 0,
      //   world: myWorld,      // ТОТ ЖЕ МИР!
      //   canvas: myCanvas,    // ТОТ ЖЕ КАНВАС!
      //   zoom: 0.2,           // Меньший зум для обзора
      //   priority: 2,         // Рисуется поверх
      //   respectWorldBounds: false,  // 🌍 Тоже ограничиваем границами
      //   // 🎛️ ФИЛЬТРАЦИЯ: мини-карта показывает только важные объекты
      //   visibleTypes: ['building', 'unit', 'world_border', 'biome_border', 'zone_border'],  // + границы мира, биомов и зон!
      //   hiddenTypes: ['bullet', 'effect', 'particle'],    // Скрываем пули, эффекты, частицы
      //   style: {
      //     border: {
      //       enabled: true,
      //       width: 1,
      //       color: 0x0080FF  // Синий для мини-карты
      //     }
      //   }
      // });
      
      // // // 📷 Создаем третью камеру (детали, правый низ)
      const myCamera3 = game.createCamera({
        id: 'detail_camera',
        width: 400,
        height: 600,
        x: 400,              // Правая часть
        y: 0,              // Низ
        focusX: 0,           // 🎯 Тоже смотрит на центр мира
        focusY: 0,           // 🎯 Тоже смотрит на центр мира  
        world: myWorld,      // ТОТ ЖЕ МИР!
        canvas: myCanvas,    // ТОТ ЖЕ КАНВАС!
        zoom: 2,           // Слегка увеличенный зум (было 2.0)
        priority: 3,
        respectWorldBounds: false,  // 🌍 И детальная камера тоже ограничена
        hiddenTypes: ['resource', 'zone_boundary', 'biome_border', 'zone_border'],    // Скрываем пули, эффекты, частицы
        style: {
          border: {
            enabled: true,
            width: 2,
            color: 0xFF8000  // Оранжевый для детальной камеры
          }
        }
      });

      // Создаем контроллер управления камерой
      const controller = game.createCameraController({
        moveSpeed: 2,            // 🎯  пикселей за шаг (плавно!)
       // smoothMove: true,        // 🎯 плавное движение включено :: НЕ РЕАЛИЗОВАНО
        zoomStep: 0.02,          // Более плавный зум
        minZoom: 0.2,            // Минимальный зум
        maxZoom: 3.0             // Максимальный зум
      });
      
      // Принудительное включение контроллера
      controller.enable();

      // Выбираем основную камеру для демонстрации
      game.selectCamera(myCamera1);

// END: CAMERA -----------------------------------------------------------------------------------------------------------------

// BIOME -----------------------------------------------------------------------------------------------------------------
      
      // Создаем типы биомов (без координат)
      const grasslandBiome = new CreateBiome('grassland', {
        displayName: 'Луга',
        temperature: 'moderate',
        humidity: 'normal',
        tint: 0x90EE90,           // Светло-зеленый оттенок
        speedMultiplier: 1.0
      });
      
      const desertBiome = new CreateBiome('desert', {
        displayName: 'Пустыня',
        temperature: 'hot',
        humidity: 'low',
        tint: 0xF4A460,           // Песочный оттенок  
        speedMultiplier: 0.8,     // Медленнее в песке
        borders: {                // 🔲 Визуальные границы для тестирования
          enabled: true,
          width: 3,
          color: 0xFF8C00,        // Оранжевый цвет для пустыни
          style: 'solid',
          alpha: 0.8
        }
      });
      
      const swampBiome = new CreateBiome('swamp', {
        displayName: 'Болото',
        temperature: 'moderate',
        humidity: 'high',
        tint: 0x556B2F,           // Темно-оливковый оттенок
        speedMultiplier: 0.6,     // Очень медленно в болоте
        borders: {                // 🔲 Визуальные границы для тестирования
          enabled: true,
          width: 2,
          color: 0x8FBC8F,        // Темно-серо-зеленый
          style: 'solid',
          alpha: 0.7
        }
      });
      
      // Устанавливаем дефолтный биом (покрывает весь мир)
      myWorld.addDefaultBiome(grasslandBiome);
      
      // Добавляем специальные биомы в разных частях мира
      myWorld.addBiome(desertBiome, {
        x: 400, y: 200,           // Позиция пустыни
        width: 300, height: 200   // Размер пустыни
      });
      
      myWorld.addBiome(swampBiome, {
        x: -350, y: -100,         // Позиция болота (левая часть)
        width: 200, height: 150   // Размер болота
      });


      // События биомов (только enter - без спама)
      myWorld.on('biome_enter', ({entity, biome, previousBiome}) => {
        console.log(`🌿 СОБЫТИЕ: ${entity.name} вошел в биом ${biome.displayName}!`);
        if (biome.name === 'desert') {
          console.log('  🔥 Эффект пустыни: жара снижает скорость!');
        } else if (biome.name === 'swamp') {
          console.log('  🐸 Эффект болота: трясина замедляет движение!');
        }
      });
      myWorld.on('biome_exit', ({entity, biome, previousBiome}) => {
        console.log(`🌿 СОБЫТИЕ: ${entity.name} покинул биом ${biome.displayName}!`);
        if (biome.name === 'desert') {
          console.log('  🔥Конец эффекта пустыни: жара снижает скорость!');
        } else if (biome.name === 'swamp') {
          console.log('  🐸 Конец эффекта болота: трясина замедляет движение!');
        }
      });
// END: BIOME -----------------------------------------------------------------------------------------------------------------
// ZONE -----------------------------------------------------------------------------------------------------------------
      
      // Создаем типы зон (без координат)
      const pvpZone = new CreateZone('pvp_arena', {
        displayName: 'PvP Арена',
        rules: {
          pvpEnabled: true,
          buildingAllowed: false,
          movementRestricted: false
        },
        borders: {                // 🔲 Пунктирные границы для отличия от биомов
          enabled: true,
          width: 2,
          color: 0xFF0000,        // Красный цвет для PvP зоны
          style: 'dashed',
          alpha: 0.9
        }
      });
      
      const safeZone = new CreateZone('safe_haven', {
        displayName: 'Безопасная Зона',
        rules: {
          pvpEnabled: false,
          buildingAllowed: true,
          movementRestricted: false
        },
        borders: {                // 🔲 Пунктирные границы
          enabled: true,
          width: 3,
          color: 0x00FF00,        // Зеленый цвет для безопасной зоны
          style: 'dashed',
          alpha: 0.8
        }
      });
      
      const restrictedZone = new CreateZone('no_entry', {
        displayName: 'Запретная Зона',
        rules: {
          pvpEnabled: false,
          buildingAllowed: false,
          movementRestricted: true
        },
        restrictions: {
          blockedTypes: ['unit', 'player'],
          allowedTypes: ['admin']
        },
        borders: {                // 🔲 Пунктирные границы
          enabled: true,
          width: 2,
          color: 0xFFFF00,        // Желтый цвет для запретной зоны
          style: 'dashed',
          alpha: 0.7
        }
      });
      // Добавляем зоны в разных частях мира
      myWorld.addZone(pvpZone, {
        x: 150, y: -200,          // Позиция PvP арены
        width: 200, height: 120   // Размер PvP арены
      });
      
      myWorld.addZone(safeZone, {
        x: -200, y: 150,          // Позиция безопасной зоны
        width: 180, height: 100   // Размер безопасной зоны
      });
      myWorld.addZone(restrictedZone, {
        x: 250, y: 100,           // Позиция запретной зоны
        width: 120, height: 80    // Размер запретной зоны
      });

      // События зон (только enter/exit - без спама)
      myWorld.on('zone_enter', ({entity, zone}) => {
        console.log(`🏛️ СОБЫТИЕ: ${entity.name} вошел в зону ${zone.displayName}!`);
        if (zone.name === 'pvp_arena') {
          console.log('  ⚔️ Включен PvP режим!');
        } else if (zone.name === 'safe_haven') {
          console.log('  🛡️ Безопасная зона - исцеление активно!');
        }
      });
      
      myWorld.on('zone_exit', ({entity, zone}) => {
        console.log(`🚪 СОБЫТИЕ: ${entity.name} покинул зону ${zone.displayName}!`);
      });
//END: ZONE -----------------------------------------------------------------------------------------------------------------
// FRACTION -----------------------------------------------------------------------------------------------------------------
    //  Система фракций!
      
      // Создаем фракции
      const playerFaction = new CreateFaction('player', {
        name: 'Команда1',
        displayName: 'Синие Игроки',
        color: 0x0080FF,           // Синий цвет
        unitColor: 0x00AAFF,      // Светло-синий для юнитов
        description: 'Фракция игроков',
        isPlayerControlled: true,
      });
      
      const orcFaction = new CreateFaction('orcs', {
        name: 'Команда2',
        displayName: 'Красные Игроки',
        color: 0xFF0000,          // Красный цвет
        unitColor: 0xFF4444,      // Светло-красный для юнитов
        description: 'Агрессивные орки',
        behavior: {
          aggressive: true,
          expansionist: true
        },
      });
      
      // Добавляем фракции в мир
      myWorld.addFaction(playerFaction);
      myWorld.addFaction(orcFaction);
     
     // Отношения между фракциями
      myWorld.setFactionRelation(playerFaction, orcFaction, 'war');
      myWorld.setFactionRelation(orcFaction, playerFaction, 'war');

// END: FRACTION -----------------------------------------------------------------------------------------------------------------
// COLLISION -----------------------------------------------------------------------------------------------------------------

      // 🎯 НОВИНКА: Настройка системы коллизий!
      
      // Создаем тип коллизии для юнитов (фиксированный радиус)
      const unitCollisionType = createUnitCollision({ radius: 12 });
      
      // 🎯 НОВИНКА: Автоматические коллизии (размер от entity.size)
      const autoCollisionType = createAutoUnitCollision({ 
        sizeMultiplier: 1.2 // На 20% больше чем размер сущности
      });
      
      // 📡 НОВИНКА: Триггерные коллизии (только события, не блокируют)
      const triggerCollisionType = createTriggerCollision({ 
        name: 'pickup',
        radius: 15 
      });
      
      // Добавляем правила коллизий
      myWorld.collisionSystem.addRule('unit', 'unit', 'unit_collision');     // 🚫 Блокирующие
      myWorld.collisionSystem.addRule('unit', 'pickup', 'pickup_collision'); // 📡 Триггерные
      myWorld.collisionSystem.addRule('unit', 'building', 'unit_building');  // 🏗️ Юнит ↔ Здание
      
      // 🚫 Событие блокировки движения между юнитами (block + block)
      myWorld.on('unit_collision_enter', ({entityA, entityB, distance}) => {
        console.log(`🚫 БЛОК: ${entityA.name} столкнулся с ${entityB.name} (расстояние: ${distance.toFixed(1)}) - движение заблокировано!`);
        
        // Останавливаем движение обеих сущностей
        entityA.stopMovement();
        entityB.stopMovement();
      });
      
      myWorld.on('unit_collision_exit', ({entityA, entityB}) => {
        console.log(`✅ БЛОК: ${entityA.name} отошел от ${entityB.name}`);
      });
      
      // 📡 Событие триггерных коллизий (trigger - только события, не блокирует)
      myWorld.on('pickup_collision_enter', ({entityA, entityB, distance}) => {
        console.log(`📡 ТРИГГЕР: ${entityA.name} активировал ${entityB.name} (расстояние: ${distance.toFixed(1)}) - движение НЕ блокировано!`);
        
        // Можем делать что угодно, но движение НЕ блокируется
        if (entityB.name.includes('Подарок')) {
          console.log('  🎁 Получен подарок!');
        }
      });
      
      myWorld.on('pickup_collision_exit', ({entityA, entityB}) => {
        console.log(`📤 ТРИГГЕР: ${entityA.name} покинул зону ${entityB.name}`);
      });
      
      // 🏗️ НОВИНКА: Событие коллизии с прямоугольной сущностью
      myWorld.on('unit_building_enter', ({entityA, entityB, distance}) => {
        console.log(`🏗️ ЗДАНИЕ: ${entityA.name} столкнулся с ${entityB.name} (расстояние: ${distance.toFixed(1)})`);
        if (entityB.collision.form === 'rect') {
          console.log(`  📐 Прямоугольная коллизия: ${entityB.collision.width}×${entityB.collision.height}`);
        } else {
          console.log(`  ⭕ Круглая коллизия: радиус ${entityB.collision.radius}`);
        }
        entityA.stopMovement();
      });
      
      myWorld.on('unit_building_exit', ({entityA, entityB}) => {
        console.log(`🚪 ЗДАНИЕ: ${entityA.name} отошел от ${entityB.name}`);
      });
// END: COLLISION -----------------------------------------------------------------------------------------------------------------
      
      // 🏗️ СТРУКТУРЫ (будут видны в мини-карте)
      myWorld.addStructure(-100, -150, { name: 'База 1 (Graphics)', form: 'building', size: 50, color: 0x0000FF  });
      myWorld.addStructure(-60, 60, { name: 'Башня (Graphics)', form: 'tower', size: 15, color: 0x654321 });
      
      // 👥 ЮНИТЫ (будут видны в мини-карте) + АВТОМАТИЧЕСКИЕ КОЛЛИЗИИ!
      myWorld.addUnit(-50, -30, { 
        name: 'Солдат 1 (Auto)', 
        form: 'soldier', 
        size: 8,
        collision: autoCollisionType.createEntityCollision() // 🎯 Автоколлизия! radius = 8 * 1.2 = 9.6
      });

      myWorld.addUnit(70, -20, { 
        name: 'Танк (Auto)', 
        form: 'tank', 
        size: 20, // 🎯 Очень большой!
        color: 0x228B22,
        collision: autoCollisionType.createEntityCollision() 
      });
      // 🎁 НОВИНКА: Триггерные объекты (НЕ блокируют движение, только события!)
      myWorld.addEntity({
        x: -120, y: 50,
        name: 'Подарок 1 (Trigger)',
        form: 'star',
        size: 12,
        color: 0xFF69B4,
        type: 'decoration',
        collision: triggerCollisionType.createEntityCollision() // 📡 Триггер!
      });
      
      
      // 🎯 НОВИНКА: Прямоугольная сущность с width/height!
      myWorld.addEntity({
        x: 0, y: 100,
        name: 'Прямоугольный Тест',
        form: 'rectangle',
        width: 40,    
        height: 25,   
        color: 0xFF4500, // Оранжево-красный
        type: 'decoration',
        collision: {
          enabled: true,
          name: 'building',
          form: 'rect',          
          width: 40,             
          height: 25,            
          collisionType: 'block', // 🚫 Блокирующая
          isSolid: true,
          layer: 'buildings'
        }
      });
      
      
// PLAYER -----------------------------------------------------------------------------------------------------------------
      const controlledHero = myWorld.addUnit(-200, 0, { 
        name: 'Управляемый Герой',
        type: 'unit',
        form: 'soldier', 
        size: 12, 
        color: 0x00FF80,  // Ярко-зеленый для выделения
        collision: unitCollisionType.createEntityCollision() // 🎯 Добавляем коллизии!
      });
      
      // 🔫 ПУЛИ (НЕ будут видны в мини-карте)
      const controlledHero2 = myWorld.addEntity({ 
        x: -20, y: 10, 
        type: 'unit',        // 🎯 Меняем тип чтобы была видна в мини-карте
        form: 'diamond',     // 🎯 Уникальная форма для отличия
        size: 8,             // 🎯 Увеличиваем размер
        name: 'Управляемый Алмаз', 
        color: 0xFF00FF,     // 🎯 Ярко-розовый цвет для выделения
        collision: unitCollisionType.createEntityCollision({ radius: 10 }) // 🎯 Добавляем коллизии!
      });
      // 📹 НОВИНКА: Камера автоматически следит за управляемым героем!
      myCamera1.followEntity(controlledHero);
      myCamera3.followEntity(controlledHero2);
      // 🎮 НОВИНКА: Создаем контроллер для управления множественными сущностями
      const entityController = game.createEntityController({
        moveSpeed: 3,                    // Скорость движения сущности
        fastSpeedMultiplier: 2.5,        // Ускорение на Shift
        slowSpeedMultiplier: 0.4,        // Замедление на Ctrl
        keyLayout: 'wasd',               // Управление WASD
        controlMode: 'all',              // 🌍 'all' = двигаем все сразу, 'single' = по одной с Tab
        useEntityMovementParams: false,  // Пока не используем параметры сущности
        respectEntityBounds: true        // Учитываем границы мира
      });
      
      // 🔗 Привязываем контроллер к ДВУМ сущностям!
      controlledHero.addController(entityController);   // Первая сущность (герой)
      controlledHero2.addController(entityController);  // Вторая сущность (пуля)
      entityController.updateSettings({ controlMode: 'single' });
            
      myWorld.assignEntityToFaction(controlledHero, playerFaction);      
      myWorld.assignEntityToFaction(controlledHero2, playerFaction);      

// END: PLAYER -----------------------------------------------------------------------------------------------------------------

      myWorld.addEntity({ x: 20, y: -10, type: 'bullet', form: 'bullet', size: 2, name: 'Пуля 2', color: 0xFF6347 });
      
      // Добавляем врагов разных фракций
      const orcWarrior1 = myWorld.addUnit(200, -100, { 
        name: 'Орк-воин 1', 
        form: 'soldier', 
        faction: orcFaction,
        collision: unitCollisionType.createEntityCollision() // 🎯 Коллизии для орков
      });
      

      
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