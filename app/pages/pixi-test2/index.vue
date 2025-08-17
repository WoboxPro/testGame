<template>
  <div class="container">
    <div class="info">
      <h1>🎮 PixiGame 2.0 - Гибридная система + Биомы + Зоны + Фракции</h1>
      <p>🎮 <strong>Управление камерой (Numpad):</strong> 📍 1(⬅️),2(⬇️),3(➡️),5(⬆️) • 🔍 +/- (зум) • 📷 */÷ (переключение камер) • 📹 Основная камера автоследит героя!</p>
      <p>🏃 <strong>Управление героями (WASD):</strong> 📍 W(⬆️),A(⬅️),S(⬇️),D(➡️) • ⚡ Shift (ускорение) • 🐌 Ctrl (замедление) • 🔄 Tab (переключение) • Синий герой + синий алмаз!</p>
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
      
      // 🌍 НОВИНКА: Создаем биомы для демонстрации
      
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
      
      // 🏛️ НОВИНКА: Создаем зоны для демонстрации
      
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
      
      
     
      // События биомов (только enter - без спама)
      myWorld.on('biome_enter', ({entity, biome, previousBiome}) => {
        console.log(`🌿 СОБЫТИЕ: ${entity.name} вошел в биом ${biome.displayName}!`);
        if (biome.name === 'desert') {
          console.log('  🔥 Эффект пустыни: жара снижает скорость!');
        } else if (biome.name === 'swamp') {
          console.log('  🐸 Эффект болота: трясина замедляет движение!');
        }
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
        respectWorldBounds: false,  // 🌍 Тоже ограничиваем границами
        // 🎛️ ФИЛЬТРАЦИЯ: мини-карта показывает только важные объекты
        visibleTypes: ['building', 'unit', 'world_border', 'biome_border', 'zone_border'],  // + границы мира, биомов и зон!
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
      
      // 🚀 Запускаем оба канваса (каждый найдет свой контейнер по ID)
      await game.startCanvas(myCanvas);
      

      
      // 🧪 Добавляем тестовые сущности с НОВОЙ ГИБРИДНОЙ СИСТЕМОЙ РЕНДЕРИНГА!
      
      // 🔵 GRAPHICS СИСТЕМА (геометрические фигуры - как раньше)
      
      // 🏗️ СТРУКТУРЫ (будут видны в мини-карте)
      myWorld.addStructure(-100, -80, { name: 'База 1 (Graphics)', form: 'building', size: 50 });
      myWorld.addStructure(100, 80, { name: 'База 2 (Graphics)', form: 'building', size: 40 });
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
      
      // 🎮 НОВИНКА: Управляемая сущность
      const controlledHero = myWorld.addUnit(-200, 0, { 
        name: 'Управляемый Герой',
        type: 'unit',
        form: 'soldier', 
        size: 12, 
        color: 0x00FF80  // Ярко-зеленый для выделения
      });
      
      // 🔫 ПУЛИ (НЕ будут видны в мини-карте)
      const controlledHero2 = myWorld.addEntity({ 
        x: -20, y: 10, 
        type: 'unit',        // 🎯 Меняем тип чтобы была видна в мини-карте
        form: 'diamond',     // 🎯 Уникальная форма для отличия
        size: 8,             // 🎯 Увеличиваем размер
        name: 'Управляемый Алмаз', 
        color: 0xFF00FF      // 🎯 Ярко-розовый цвет для выделения
      });
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
      
      // 📹 НОВИНКА: Камера автоматически следит за управляемым героем!
      myCamera1.followEntity(controlledHero);
      myCamera3.followEntity(controlledHero2);

      console.log('📹 Основная камера теперь следит за героем! Двигайте героя WASD - камера будет следовать!');
      console.log('🌍 НОВИНКА: Камера ограничена границами мира! Подойдите к краю - камера остановится, но герой может идти дальше!');
      
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
      
      // 🏛️ НОВИНКА: Система фракций!
      
      // Создаем фракции
      const playerFaction = new CreateFaction('player', {
        name: 'Игроки',
        displayName: 'Синие Игроки',
        color: 0x0080FF,           // Синий цвет
        unitColor: 0x00AAFF,      // Светло-синий для юнитов
        description: 'Фракция игроков',
        isPlayerControlled: true,
        modifiers: {
          moveSpeed: 1.2,         // +20% к скорости
          attackDamage: 1.0
        }
      });
      
      const orcFaction = new CreateFaction('orcs', {
        name: 'Орки',
        displayName: 'Красные Орки',
        color: 0xFF0000,          // Красный цвет
        unitColor: 0xFF4444,      // Светло-красный для юнитов
        description: 'Агрессивные орки',
        behavior: {
          aggressive: true,
          expansionist: true
        },
        modifiers: {
          moveSpeed: 0.9,         // -10% к скорости
          attackDamage: 1.3       // +30% к урону
        }
      });
      
      const elfFaction = new CreateFaction('elves', {
        name: 'Эльфы',
        displayName: 'Зеленые Эльфы',
        color: 0x00FF00,          // Зеленый цвет
        unitColor: 0x44FF44,      // Светло-зеленый для юнитов
        description: 'Мудрые эльфы',
        behavior: {
          diplomatic: true,
          aggressive: false
        },
        modifiers: {
          moveSpeed: 1.1,         // +10% к скорости
          attackDamage: 0.9       // -10% к урону
        }
      });
      
      // 💰 НОВИНКА: Фракция торговцев (пацифисты)
      const traderFaction = new CreateFaction('traders', {
        name: 'Торговцы',
        displayName: 'Желтые Торговцы',
        color: 0xFFD700,          // Золотой цвет
        unitColor: 0xFFFF44,      // Светло-желтый для юнитов
        description: 'Мирные торговцы',
        canFight: false,          // 🛡️ НЕ МОГУТ ВОЕВАТЬ!
        behavior: {
          diplomatic: true,
          aggressive: false,
          tradeFriendly: true
        },
        modifiers: {
          moveSpeed: 0.8,         // Медленные
          resourceGain: 2.0       // +100% к ресурсам
        }
      });
      
      // Добавляем фракции в мир
      myWorld.addFaction(playerFaction);
      myWorld.addFaction(orcFaction);
      myWorld.addFaction(elfFaction);
      myWorld.addFaction(traderFaction);
      
      // 🔗 УПРОЩЕННАЯ СИСТЕМА: только мир и война!
      
      // Игроки воюют с орками, в мире с эльфами, нейтральны к торговцам
      myWorld.setFactionRelation(playerFaction, orcFaction, 'war');
      myWorld.setFactionRelation(playerFaction, elfFaction, 'peace');
      // С торговцами автоматически нейтральны
      
      // Орки тоже воюют с игроками, нейтральны к остальным
      myWorld.setFactionRelation(orcFaction, playerFaction, 'war');
      // С эльфами и торговцами автоматически нейтральны
      
      // Эльфы в мире с игроками, нейтральны к остальным  
      myWorld.setFactionRelation(elfFaction, playerFaction, 'peace');
      // С орками и торговцами автоматически нейтральны
      
      // Торговцы ни с кем не воюют (canFight: false)
      
      // 🎯 Привязываем существующих сущностей к фракциям
      myWorld.assignEntityToFaction(controlledHero, playerFaction);        // Герой = игрок
      myWorld.assignEntityToFaction(controlledHero2, playerFaction);       // Алмаз = игрок
      
      // Добавляем врагов разных фракций
      const orcWarrior1 = myWorld.addUnit(200, -100, { name: 'Орк-воин 1', form: 'soldier', faction: orcFaction });
      const orcWarrior2 = myWorld.addUnit(-250, 150, { name: 'Орк-воин 2', form: 'tank', size: 12, faction: orcFaction });
      
      const elfArcher1 = myWorld.addUnit(150, 200, { name: 'Эльф-лучник 1', form: 'soldier', faction: elfFaction });
      const elfArcher2 = myWorld.addUnit(-180, -50, { name: 'Эльф-лучник 2', form: 'soldier', faction: elfFaction });
      
      // 💰 Торговцы (их нельзя атаковать!)
      const trader1 = myWorld.addUnit(300, -200, { name: 'Торговец 1', form: 'diamond', size: 10, faction: traderFaction });
      const trader2 = myWorld.addUnit(-300, 250, { name: 'Торговец 2', form: 'diamond', size: 10, faction: traderFaction });
      
      // console.log('  myWorld.factionSystem.canEntityAttack(controlledHero, trader1) // false');
      // console.log('  myWorld.factionSystem.canEntityAttack(controlledHero, orcWarrior1) // true');

      
      // 🎭 Демонстрация переключения режимов
      // setTimeout(() => {
      //   entityController.updateSettings({ controlMode: 'single' });
      // }, 5000);
      
      // 📹 Демонстрация переключения слежения камеры
      // setTimeout(() => {
      //   console.log('📹 Переключаю камеру на слежение за розовым алмазом!');
      //   myCamera1.followEntity(controlledHero2, 20, -15); // С небольшим смещением
      //   console.log('🎯 Основная камера теперь следит за алмазом с смещением!');
      // }, 8000);
      
      // setTimeout(() => {
      //   console.log('📹 Возвращаю камеру обратно на героя!');
      //   myCamera1.followEntity(controlledHero);
      //   console.log('🔙 Камера снова следит за зеленым героем!');
      // }, 12000);
      

      
      game.selectCamera(myCamera1);

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