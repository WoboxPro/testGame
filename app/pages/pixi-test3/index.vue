<template>
  <div class="container">
    <div class="canvas-row">
      <div id="game-container" class="game-area">
        <button
          class="fullscreen-btn"
          @click="toggleFullscreen"
          :aria-pressed="isFullscreen"
          :title="isFullscreen ? 'Выйти из полноэкранного режима' : 'Во весь экран'"
        >{{ isFullscreen ? '✕' : '⛶' }}</button>
      </div>
      <div id="game-container2" class="game-area"></div>
    </div>
    
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import * as PIXI from 'pixi.js';
import { PixiGame } from '~/services/new/pixiGame.js';
import { CreateBiome } from '~/services/new/core/CreateBiome.js';
import { CreateZone } from '~/services/new/core/CreateZone.js';
import { CreateFaction } from '~/services/new/core/CreateFaction.js';
import { createUnitCollision, createAutoUnitCollision, createTriggerCollision } from '~/services/new/core/CreateCollision.js';
import { UIEntity } from '~/services/new/core/UIEntity.js';
// Автопроводка оружия вшита в World; прямые импорты контроллеров/роутера больше не нужны

let game = null;
let uiOverlay = null;
let uiNameTag = null;
// Ручные контроллеры и роутер больше не нужны с авто-проводкой

// Полноэкранный режим
const isFullscreen = ref(false);
function toggleFullscreen() {
  const el = document.getElementById('game-container');
  if (!el) return;
  const doc = document;
  const docEl = doc.documentElement;

  const requestFull = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen || el.mozRequestFullScreen;
  const exitFull = doc.exitFullscreen || doc.webkitExitFullscreen || doc.msExitFullscreen || doc.mozCancelFullScreen;

  if (!doc.fullscreenElement && !doc.webkitFullscreenElement && !doc.mozFullScreenElement && !doc.msFullscreenElement) {
    requestFull && requestFull.call(el);
  } else {
    exitFull && exitFull.call(doc);
  }
}

function handleFsChange() {
  const doc = document;
  isFullscreen.value = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);
}

onMounted(async () => {
  if (process.client) {
    try {
// GAME -----------------------------------------------------------------------------------------------------------------
      game = new PixiGame();
      document.addEventListener('fullscreenchange', handleFsChange);
      document.addEventListener('webkitfullscreenchange', handleFsChange);
      document.addEventListener('mozfullscreenchange', handleFsChange);
      document.addEventListener('MSFullscreenChange', handleFsChange);
      // Подставляем размеры экрана устройства (не окна браузера)
      const width = screen.width;
      const height = screen.height;
      
// WORLD -----------------------------------------------------------------------------------------------------------------
      const myWorld = game.createWorld({
        width: 5000,
        height:5000,
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
        width: width,
        height: height,
        backgroundColor: '#333333', // Серый фон незанятых областей
        containerId: 'game-container',  //  ID DOM элемента куда помещать канвас
        antialias: false                // Включаем сглаживание
      });

      await game.startCanvas(myCanvas);
      // ⏱️ Масштаб времени игры (1 = нормальная скорость)
      game.setTimeScale(1);

      // === UI OVERLAY (canvas coordinates) ===
      uiOverlay = new UIEntity({ canvas: myCanvas, mode: 'canvas' });
      uiOverlay.createText({ text: 'MeowGame', x: 20, y: 20, fontSize: 24, fill: 0xFFFFFF, align: 'left', anchor: 0 });

      // Предзагрузка спрайта, чтобы избежать предупреждений Assets Cache
      await PIXI.Assets.load('/person.png');
      // Предзагрузка атласа анимации (JSON + PNG в public/assets)
      const walkSheet = await PIXI.Assets.load('/assets/sprites.json');
      const walkFrameNames = Object.keys(walkSheet.textures)
        .filter(n => n.startsWith('sprite'))
        .sort((a, b) => Number(a.replace(/\D+/g, '')) - Number(b.replace(/\D+/g, '')));
      const walkFrames = walkFrameNames.map(n => walkSheet.textures[n]);

      const WarriorSheet = await PIXI.Assets.load('/assets/warrior.json');
      const warriorFrameNames = Object.keys(WarriorSheet.textures)
        .filter(n => n.startsWith('sprite'))
        .sort((a, b) => Number(a.replace(/\D+/g, '')) - Number(b.replace(/\D+/g, '')));
      const warriorFrames = warriorFrameNames.map(n => WarriorSheet.textures[n]);
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
        x: -750, y: -750,           // Позиция пустыни
        width: 300, height: 200   // Размер пустыни
      });
      
      myWorld.addBiome(swampBiome, {
        x: -440, y: -750,         // Позиция болота (левая часть)
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
        x: -745, y: 625,          // Позиция PvP арены
        width: 200, height: 120   // Размер PvP арены
      });
      
      myWorld.addZone(safeZone, {
        x: -200, y: 625,          // Позиция безопасной зоны
        width: 180, height: 100   // Размер безопасной зоны
      });
      myWorld.addZone(restrictedZone, {
        x: 250, y: 625,           // Позиция запретной зоны
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
      
      const enemyFaction = new CreateFaction('orcs', {
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
      myWorld.addFaction(enemyFaction);
     
     // Отношения между фракциями
      myWorld.setFactionRelation(playerFaction, enemyFaction, 'war');
      myWorld.setFactionRelation(enemyFaction, playerFaction, 'war');

// END: FRACTION -----------------------------------------------------------------------------------------------------------------
// COLLISION -----------------------------------------------------------------------------------------------------------------

      // Настройка системы коллизий!
      
      // Создаем тип коллизии для юнитов (фиксированный радиус)
      const unitCollisionType = createUnitCollision({ radius: 12 });
      
      // Автоматические коллизии (размер от entity.size)
      const autoCollisionType = createAutoUnitCollision({ 
        sizeMultiplier: 1.2 // На 20% больше чем размер сущности
      });
      
      // Триггерные коллизии (только события, не блокируют)
      const triggerCollisionType = createTriggerCollision({ 
        name: 'pickup',
        radius: 15 
      });
      
      // Добавляем правила коллизий
      myWorld.collisionSystem.addRule('unit', 'unit', 'unit_collision');     // 🚫 Блокирующие
      myWorld.collisionSystem.addRule('unit', 'pickup', 'pickup_collision'); // 📡 Триггерные
      myWorld.collisionSystem.addRule('unit', 'building', 'unit_building');  // 🏗️ Юнит ↔ Здание
      myWorld.collisionSystem.addRule('unit', 'trap', 'trap_damage');        // 🪤 Ловушки наносят урон
      // 🎯 Пули (триггеры) ↔ цели
      myWorld.collisionSystem.addRule('projectile', 'unit', 'projectile');   // пуля наносит урон юнитам
      myWorld.collisionSystem.addRule('projectile', 'building', 'projectile'); // пуля блокируется зданием
      
      // 🚫 Событие блокировки движения между юнитами (блокировка происходит автоматически в CollisionSystem)
      myWorld.on('unit_collision_enter', ({entityA, entityB, distance}) => {
        console.log(`🚫 БЛОК: ${entityA.name} столкнулся с ${entityB.name} (расстояние: ${distance.toFixed(1)})`);
        
        // Движение блокируется автоматически в CollisionSystem._checkMovementBlocking()
        // Здесь можно добавить дополнительную логику (звуки, эффекты и т.д.)
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

      // 🔔 Логи новых событий выстрела
      // myWorld.on('weapon_fire', (e) => {
      //   console.log(`🔫 WEAPON_FIRE: shooter=${e.shooterId} slot=${e.slotName} type=${e.weaponType} angle=${(e.angle||0).toFixed(2)}`);
      // });
      // myWorld.on('weapon_fire_blocked', (e) => {
      //   console.log(`⛔ FIRE_BLOCKED: shooter=${e.shooterId} slot=${e.slotName} reason=${e.reason}`);
      // });
      // myWorld.on('projectile_spawn', (e) => {
      //   console.log(`💥 PROJECTILE: id=${e.bulletId} shooter=${e.shooterId} angle=${(e.angle||0).toFixed(2)} speed=${e.speed}`);
      // });
      // myWorld.on('raycast_fire', (e) => {
      //   console.log(`🔦 RAYCAST: shooter=${e.shooterId} angle=${(e.angle||0).toFixed(2)} range=${e.maxRange}`);
      // });

      // 🪤 Событие ловушки (урон обрабатывается автоматически в CollisionSystem)
      myWorld.on('trap_damage_enter', ({entityA, entityB}) => {
        const hero = entityA.collision?.name === 'unit' ? entityA : entityB;
        const trap = entityA.collision?.name === 'trap' ? entityA : entityB;
        console.log(`🪤 ${hero.name} наступил на ловушку ${trap.name}!`);
      });

      // 📡 ГИБРИДНАЯ АРХИТЕКТУРА: Дополнительная логика при смерти
      myWorld.on('entity_death', ({ entity, cause, damageAmount, position, timestamp }) => {
        console.log(`🎭 СОБЫТИЕ СМЕРТИ: ${entity.name} погиб от ${cause} (урон: ${damageAmount})`);
        console.log(`📍 Позиция смерти: (${position.x.toFixed(1)}, ${position.y.toFixed(1)})`);
        console.log(`⏰ Время смерти: ${new Date(timestamp).toLocaleTimeString()}`);
        
        // 🎵 Здесь можно добавить звуки
        // playDeathSound(cause);
        
        // 🎨 Здесь можно добавить эффекты  
        // createDeathEffect(position.x, position.y);
        
        // 📊 Здесь можно добавить статистику
        // gameStats.recordDeath(entity.type, cause);
        
        console.log(`🔔 Дополнительная логика смерти выполнена для ${entity.name}`);
      });

      // ✨ ГИБРИДНАЯ АРХИТЕКТУРА: Дополнительная логика при воскрешении
      myWorld.on('entity_respawn', ({ entity, spawnX, spawnY }) => {
        console.log(`🎉 СОБЫТИЕ ВОСКРЕШЕНИЯ: ${entity.name} воскрес на (${spawnX}, ${spawnY})!`);
        console.log(`⚡ Текущие жизни: ${entity.stats?.getHealth()}/${entity.stats?.getMaxHealth()}`);
        
        // 🎵 Здесь можно добавить звук воскрешения
        // playRespawnSound();
        
        // 🎨 Здесь можно добавить эффект воскрешения
        // createRespawnEffect(spawnX, spawnY);
        
        // 💨 Здесь можно добавить неуязвимость на пару секунд
        // makeInvulnerable(entity, 2000);
        
        console.log(`🔔 Дополнительная логика воскрешения выполнена для ${entity.name}`);
      });

      // Событие коллизии с прямоугольной сущностью
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

// PLAYER -----------------------------------------------------------------------------------------------------------------
      const bulletSuperSpeed = {
            weaponType: 'projectile',
            bulletSpeed: 2,
            penetration: 0,
            bulletsPerShot: 0,
            maxRange: 500,
            fireRate: 400,
            bulletLifetime: 3.0,
            damage: 1,
            sizeBullet: 4, // радиус пули
            bulletConfigs: {
              collideAsPoint: false, // если true, то пуля будет считаться точкой, а не кругом
              collisionRadius: null, // радиус коллизии пули
              useCCD: false, // Логика не реализована - нужно чтоб пули на высоких скоростях не проходили сквозь стены
              validTargets: { block: ['building','structure'], hit: ['unit'] } // блок - стены, hit - юниты
            },
            autoFire: true,
          };
      const raycastBullet = {
            weaponType: 'raycast', // 'projectile' | 'raycast'
            raycastAnimation: 'laser',
            bulletSpeed: 5,
            penetration: 0,
            bulletsPerShot: 1,
            maxRange: 600,
            fireRate: 120,
            bulletLifetime: 2.0,
            damage: 1,
            sizeBullet: 1,
            color: 0xFF0000,
            bulletConfigs: {
              collideAsPoint: false,
              collisionRadius: null,
              useCCD: false,
              validTargets: { block: ['building','structure'], hit: ['unit'] }
            },
            autoFire: false
          };

        const bigBullet = {
            weaponType: 'projectile',
            bulletSpeed: 4,
            bulletsPerShot: 1,
            penetration: 0,

            maxRange: 500,
            fireRate: 500,
            bulletLifetime: 2.0,
            damage: 1,
            sizeBullet: 3,
            color: 0x00ff00,
            bulletConfigs: {
              collideAsPoint: false,
              collisionRadius: null,
              useCCD: false,
              validTargets: { block: ['building','structure'], hit: ['unit'] }
            },
            autoFire: false
          };
      const controlledHero = myWorld.addUnit(-200, 0, { 
        name: 'Герой', 
        // form: {
        //   type: 'sprite',
        //   // points: [{x:-10,y:-8},{x:10,y:9},{x:-9,y:7}],
        //   // fill: 0x66CCFF,                 // опционально; иначе берётся entity.visual.color
        //   // stroke: { color: 0x003355, width: 1, alpha: 1 }, 
        //   // scale: 1
        //   texture: '/person.png',   // или frame из атласа
        //   anchor: [0.5, 0.5],
        //   scale: 2,                      // можно scaleX/scaleY
        //   tint: 0xFFFFFF,
        //   mirror: true,
        //   alpha: 1
          
        // }, 
        form: {
          type: 'animated',
          clips: {
            walk: walkFrames,
            idle: [walkFrames[6]]
          },
          animation: 'walk',
          fps: { walk: 8, idle: 0 },
          loop: { walk: true, idle: true },
          anchor: [0.5, 0.5],
          scale: 0.3
        },
        faction: playerFaction,
        collision: unitCollisionType.createEntityCollision(), 
        // 🎯 Слоты теперь прямо здесь! (удаляем отдельный defineSlots)
        slots: {
          right_gun: { offsetX: 8,  offsetY: -5, angleOffset: 0, maxWeapons: 1 },
          left_gun:  { offsetX: -8, offsetY: -5, angleOffset: 0, maxWeapons: 1 }
        },
        size: 15,
        rotationBehavior: 'movement',  //  Поворот на мышь (зеркало перехватит и отключит вращение тела)
        rotationSpeed: 0.15,           // Скорость поворота
        rotateChildren: true,          //  Дочерние сущности поворачиваются вместе
        childRotationType: 'stick',    //  'stick' = прилипли вместе
        rotationOffset: 2 * Math.PI,     //  Смещение угла: 90° = вниз по умолчанию
        typeRotate: 'mirror',          // 'full' | 'mirror' — включаем зеркало
        mirrorAxis: 'y',               // 'x' | 'y' — ось зеркала (Y = влево/вправо)
        mirrorMouse: true,             //  В mirror+mouse тело не крутится, только отражается
        mirrorMouseDeadzone: 4,        //  Порог переключения по оси (пиксели)
        visionFollowMouseInMirror: false, //  В mirror-режиме конус продолжает следовать курсору
        stats: { 
          speed: 4, 
          health: 2, 
          currentHealth: 1 
        },  
        // Система респауна
        respawn: true,        // Возрождение при смерти
        respawnTime: 3000,     // Воскрешение через 3 секунды
        //  Видимость (визуальное кольцо создастся автоматически)
        vision: {
          type: 'cone',
          angle: 70,
          range: 150,
          directionOffsetDeg: 0,
          showBorder: true,
          color: 0x00FFFF,
          width: 2,
          alpha: 0.8,
            occlusion: {
              vision: true,
              samples: 64,                   // 16–128; больше = плавнее, но дороже
              enabled: true,
              blockedBy: ['building', 'structure'] // по collision.name или по entity.type
            }
        }
      });
      
      // 👣 Демонстрационный юнит с анимацией из спрайтшита
      // const animatedWalker = myWorld.addUnit(-80, -40, {
      //   name: 'Анимированный Персонаж',
      //   form: {
      //     type: 'animated',
      //     frames: walkFrames,
      //     fps: 8,
      //     loop: true,
      //     anchor: [0.5, 0.5],
      //     scale: 0.2
      //   },
      //   type: 'unit',
      //   collision: unitCollisionType.createEntityCollision({ radius: 10 })
      // });
      
      // 🔗 Создаем оружие и привязываем к слотам героя
      const heroWeapon = myWorld.addEntity({
        name: 'Правое оружие',
        type: 'weapon',
        form: 'rectangle',
        width: 3,
        height: 20,
        color: 0x002299,
        autoWire: true,
        slots: {
          muzzle: {
            offsetX: 0, offsetY: -12, angleOffset: -Math.PI / 2,
            bullet: raycastBullet,
            input: { mouse: 'RMB' }
          }
        }
      });
      controlledHero.attachEntityToSlot(heroWeapon, 'right_gun');

      const heroWeapon2 = myWorld.addEntity({
        name: 'Левое оружие',
        type: 'weapon',
        form: 'rectangle',
        width: 3,
        height: 20,
        color: 0x990000,
        autoWire: true,
        slots: {
          muzzle: {
            offsetX: 0, offsetY: -12, angleOffset: -Math.PI/2,
            bullet: bulletSuperSpeed,
            //input: { mouse: 'LMB' },
            //,
            events: {
              //fire: ({ shooterId, weapon, slotName, x, y, angle }) => console.log('slot fire', shooterId, angle),
              // blocked: ({ shooterId, reason }) => console.log('slot blocked', reason),
               projectileSpawn: ({ bullet, weapon }) => {
                 console.log('SHOOT', bullet.id);
                 try {
                   const attachEntity = weapon || heroWeapon2;
                   if (!myCamera1 || !attachEntity) return;
                   const fx = new UIEntity({ canvas: myCanvas, camera: myCamera1, attachTo: 'entity' });
                   const tag = fx.createText({ text: 'Бах!', entity: attachEntity, offsetX: 10, offsetY: -14, units: 'px', fontSize: 14, fill: 0xFFD700, anchor: 0.5 });
                   setTimeout(() => { try { tag.destroy(); fx.destroy(); } catch(_) {} }, 200);
                 } catch(_) {}
               },
               //raycastFire: (e) => console.log('slot raycast', e.angle),
            },
            aim: {
              enabled: true,
              range: 200,
              retargetMs: 250,
              requireLOS: true,
              fireWhen: 'targetAndLOS',
              rotateVisual: false,
              toleranceDeg: 0,
              hitTags: ['unit'],
              blockTags: ['building','structure']
            }
          },
          // Второй ствол (смещен по X для визуального разделения)
          muzzle2: {
            offsetX: 0, offsetY: -12, angleOffset: -Math.PI/2,
            bullet: bigBullet,
            input: { keys: 'KeyF' }
          }
        }
      });

      controlledHero.attachEntityToSlot(heroWeapon2, 'left_gun');
      // Мгновенная синхронизация трансформов (на всякий случай)
      controlledHero.updateAttachedSlots();

      // Стрельба будет подключена автоматически через autoWire и слоты (bullet/input)
      
      const controlledHero2 = myWorld.addEntity({ 
        x: -500, y: -790, 
        type: 'unit',        // 🎯 Меняем тип чтобы была видна в мини-карте
        form: 'diamond',     // 🎯 Уникальная форма для отличия
        size: 8,             // 🎯 Увеличиваем размер
        name: 'Управляемый Алмаз', 
        color: 0xFF00FF,     // 🎯 Ярко-розовый цвет для выделения
        collision: unitCollisionType.createEntityCollision({ radius: 10 }), // 🎯 Добавляем коллизии!
        rotationBehavior: 'movement',  // 🎯 НОВИНКА: Алмаз поворачивается по направлению движения
        rotationSpeed: 0.3,            // Быстрее чем у героя для наглядности
        rotationOffset: 0,             // 🎯 Без смещения = вправо по умолчанию (для сравнения)
        // Характеристики  
        stats: { 
          speed: 2, 
          health: 100, 
          currentHealth: 100,
          touchDamage: 1      // ⚔️ Алмаз наносит урон враждебным фракциям
        },
        //  Система респауна  
        respawn: true,        // Возрождение при смерти
        respawnTime: 1500     // Воскрешение через 1.5 секунды (быстрее чем у героя)
      });

      

      // Создаем контроллер для управления множественными сущностями
      const entityController = game.createEntityController({
        controlType: 'touch', //'keyboard' | 'touch' | 'both'
        touch: { 
          mode: 'dynamic', // static | dynamic
          staticX: 0,
          staticY: 0,
          radius: 70, 
          innerRadius: 30, 
          showJoystick: true 
        },
        moveSpeed: 3,                    // Скорость движения сущности
        fastSpeedMultiplier: 1.5,        // Ускорение на Shift (+50%)
        slowSpeedMultiplier: 0.7,        // Замедление на Ctrl (50%)
        keyLayout: 'wasd',             // wasd/arrows
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

// ENTITY----------------------------------------------------------------------------------------------------------------------
      // 🏗️ СТРУКТУРЫ (будут видны в мини-карте)
      myWorld.addStructure(700, -700, { name: 'База 1 (Graphics)', form: 'building', size: 50, color: 0x0000FF  });
      myWorld.addStructure(650, -700, { name: 'Башня (Graphics)', form: 'tower', size: 15, color: 0x654321 });

      // Здание
      myWorld.addEntity({ 
        x: 0, y: -1000,
        name: 'Постройка 1',
        form: 'rectangle',
        width: 40,    
        height: 25,   
        color: 0x444444, 
        type: 'decoration',
        collision: {
          enabled: true,
          name: 'building',
          form: 'rect',          
          width: 80,             
          height: 40,            
          collisionType: 'block', // 🚫 Блокирующая
          isSolid: true,
          layer: 'buildings'
        }
      });
      // Триггерные объекты (НЕ блокируют движение, только события!)
      myWorld.addEntity({
        x: 620, y: -700,
        name: 'Подарок 1 (Trigger)',
        form: 'star',
        size: 12,
        color: 0xFF69B4,
        type: 'decoration',
        collision: triggerCollisionType.createEntityCollision() // 📡 Триггер!
      });
      
      myWorld.addEntity({ x: 570, y: -700, type: 'bullet', form: 'bullet', size: 2, name: 'Пуля 2', color: 0xFF6347 });

      
      // Создаем ловушку с уроном при касании
      const damageTrap = myWorld.addEntity({
        x: 50, y: -850,
        type: 'trap',
        form: 'rect',
        width: 30,
        height: 30,
        name: 'Шипастая ловушка',
        color: 0xFF0000,  // Красный цвет для опасности
        collision: createTriggerCollision({ name: 'trap', form: 'rect', width: 30, height: 30 }),
        // Урон при касании
        stats: { touchDamage: 1 }  // Наносит 1 урон при касании
      });

      // 👥 ЮНИТЫ 
      myWorld.addUnit(-200, -800, { 
        name: 'Солдат 1 (Auto)', 
        form: 'soldier', 
        size: 8,
        collision: autoCollisionType.createEntityCollision() // 🎯 Автоколлизия! radius = 8 * 1.2 = 9.6
      });


     
     const aiAgent = {
          action: true,
          type: 'seek',
          alwaysMove: false,
          attackNeutral: false,
          pursueLastSeen: true, // постоянно преследовать последнее виденное
          idleScan: true, // сканировать окружающую область
          idleScanIntervalMs: 1500, // интервал сканирования
          idleScanJitterMs: 1000, // случайная задержка сканирования
          avoidObstacles: true, // избегать препятствий
          //faceTarget: true // - не поворачиваться к цели
      };
      const visionAgent = {
        type: 'circle',
        range: 140,
        showBorder: true,
        color: 0xEE0000,
        width: 1,
        alpha: 0.8,
        occlusion: {
         // samples: 10,                   // 16–128; больше = плавнее, но дороже
          enabled: true,
          blockedBy: ['building', 'structure'] // по collision.name или по entity.type
        }
      };
      
      const enemy1 = myWorld.addUnit(150, -100, { 
        name: 'Враг 1', 
        form: {
          type: 'animated',
          clips: {
            walk: warriorFrames,
            idle: [warriorFrames[1]]
          },
          animation: 'walk',
          fps: { walk: 8, idle: 0 },
          loop: { walk: true, idle: true },
          anchor: [0.5, 0.5],
          scale: 0.2
        },
        faction: enemyFaction,
        collision: unitCollisionType.createEntityCollision(), 
        stats: { 
          speed: 0.5, 
          health: 10,          
          currentHealth: 10,
          touchDamage: 2,
           rotationSpeed: 0.01,     
        },
        respawn: false,
        vision: visionAgent,
        ai: aiAgent,
        typeRotate: 'mirror',          // 'full' | 'mirror' — включаем зеркало
        mirrorAxis: 'y',               // 'x' | 'y' — ось зеркала (Y = влево/вправо)
        mirrorMouseDeadzone: 4,        //  Порог переключения по оси (пиксели)
        rotationBehavior: 'movement', 
        slots: {
          right_gun: { offsetX: 8, offsetY: -5, angleOffset: 0, maxWeapons: 1 }
        }

      });
      const configWeapon = {
        name: 'Оружие врага',
        type: 'weapon',
        form: 'rectangle',
        width: 3,
        height: 16,
        color: 0xCC0000,
        autoWire: true,
        slots: {
          muzzle: {
            offsetX: 0, offsetY: -12, angleOffset: -Math.PI/2,
            bullet: {
              weaponType: 'projectile',
              //raycastAnimation: 'laser',
              bulletSpeed: 3,
              penetration: 0,
              bulletsPerShot: 1,
              maxRange: 400,
              fireRate: 300,
              bulletLifetime: 10,
              damage: 1,
              color: 0xFF3333,
              validTargets: { block: ['building','structure'], hit: ['unit'] },
              autoFire: true,
              sizeBullet: 3,
            },
            aim: {
              enabled: true,
              range: 300,
              retargetMs: 250,
              requireLOS: true,
              fireWhen: 'targetAndLOS',
              rotateVisual: false,
              toleranceDeg: 0,
              hitTags: ['unit'],
              blockTags: ['building','structure']
            }
          }
        }
      };
      const enemy1Weapon = myWorld.addEntity(configWeapon);
      enemy1.attachEntityToSlot(enemy1Weapon, 'right_gun');


      const enemy11 = myWorld.addUnit(500, -100, { 
        name: 'Враг 1', 
        form: {
          type: 'animated',
          clips: {
            walk: warriorFrames,
            idle: [warriorFrames[1]]
          },
          animation: 'walk',
          fps: { walk: 8, idle: 0 },
          loop: { walk: true, idle: true },
          anchor: [0.5, 0.5],
          scale: 0.2
        },
        faction: enemyFaction,
        collision: unitCollisionType.createEntityCollision(), 
        stats: { 
          speed: 0.5, 
          health: 10,          
          currentHealth: 10,
          touchDamage: 2,
           rotationSpeed: 0.01,     
        },
        respawn: false,
        vision: visionAgent,
        ai: aiAgent,
        typeRotate: 'mirror',          // 'full' | 'mirror' — включаем зеркало
        mirrorAxis: 'y',               // 'x' | 'y' — ось зеркала (Y = влево/вправо)
        mirrorMouseDeadzone: 4,        //  Порог переключения по оси (пиксели)
        rotationBehavior: 'movement', 
        slots: {
          right_gun: { offsetX: 8, offsetY: -5, angleOffset: 0, maxWeapons: 1 }
        }
      });
      const enemy2Weapon = myWorld.addEntity(configWeapon);
      enemy11.attachEntityToSlot(enemy2Weapon, 'right_gun');
      
      const enemy4 = myWorld.addUnit(150, -700, { 
        name: 'Враг 1', 
        form: {
          type: 'animated',
          clips: {
            walk: warriorFrames,
            idle: [warriorFrames[1]]
          },
          animation: 'walk',
          fps: { walk: 8, idle: 0 },
          loop: { walk: true, idle: true },
          anchor: [0.5, 0.5],
          scale: 0.3
        },
        faction: enemyFaction,
        collision: unitCollisionType.createEntityCollision(), 
        stats: { 
          speed: 0.5, 
          health: 10,          
          currentHealth: 10,
          touchDamage: 2,
           rotationSpeed: 0.01,     
        },
        respawn: false,
        vision: {
          type: 'cone',
          angle: 80,
          range: 180,
          showBorder: true,
          color: 0x00FFFF,
          width: 2,
          alpha: 0.8,
          occlusion: {
            vision: true,
            samples: 32,                   // 16–128; больше = плавнее, но дороже
            enabled: true,
            blockedBy: ['building', 'structure'] // по collision.name или по entity.type
          }
        },
        ai: aiAgent,
        typeRotate: 'mirror',          // 'full' | 'mirror' — включаем зеркало
        mirrorAxis: 'y',               // 'x' | 'y' — ось зеркала (Y = влево/вправо)
        mirrorMouseDeadzone: 4,        //  Порог переключения по оси (пиксели)
        rotationBehavior: 'movement', 

      });
      const enemy2 = myWorld.addUnit(-250, 230, { 
        name: 'Враг 2', 
        form: 'soldier', 
        faction: enemyFaction,
        collision: unitCollisionType.createEntityCollision(), 
        stats: { 
          speed: 0.7, 
          health: 1,          
          currentHealth: 1,
          touchDamage: 2,
        },
        respawn: false,
        vision: visionAgent,
        ai: aiAgent
      });

// CAMERA -----------------------------------------------------------------------------------------------------------------
      // 📷 Создаем первую камеру (основная, занимает левую половину)
      const myCamera1 = game.createCamera({
        id: 'main_camera',
         width: width,           // Половина канваса
        // height: height,          // Вся высота
        //width: 400,           // Половина канваса
        height: height,          // Вся высота

        x: 0,                 // Левая половина канваса
        y: 0,
        focusX: 0,            // Смотрит на центр мира
        focusY: 0,
        world: myWorld,
        canvas: myCanvas,
        zoom: 0.6,            // Уменьшаем zoom чтобы видеть больше объектов
        priority: 1,
        respectWorldBounds: true,  // 🌍 НОВИНКА: Учитывать границы мира при слежении!
        hiddenTypes: ['vision'],
        style: {
          border: {
            enabled: false,
            width: 2,
            color: 0x00FF00  // Зеленый для основной камеры
          }
        }
      });
      
      //  📷 Создаем третью камеру (детали, правый низ)
      // const myCamera3 = game.createCamera({
      //   id: 'detail_camera',
      //   width: 400,
      //   height: 600,
      //   x: 400,              // Правая часть
      //   y: 0,              // Низ
      //   focusX: 0,           // 🎯 Тоже смотрит на центр мира
      //   focusY: 0,           // 🎯 Тоже смотрит на центр мира  
      //   world: myWorld,      // ТОТ ЖЕ МИР!
      //   canvas: myCanvas,    // ТОТ ЖЕ КАНВАС!
      //   zoom: 1.3,           // Слегка увеличенный зум (было 2.0)
      //   priority: 3,
      //   respectWorldBounds: false,  // 🌍 И детальная камера тоже ограничена
      //   hiddenTypes: ['resource', 'zone_boundary', 'biome_border', 'zone_border','vision'],    // Скрываем пули, эффекты, частицы
      //   style: {
      //     border: {
      //       enabled: true,
      //       width: 2,
      //       color: 0xFF8000  // Оранжевый для детальной камеры
      //     }
      //   }
      // });

      // Создаем контроллер управления камерой
      const controller = game.createCameraController({
        moveSpeed: 2,            // 🎯  пикселей за шаг (плавно!)
       // smoothMove: true,        // 🎯 плавное движение включено :: НЕ РЕАЛИЗОВАНО
        zoomStep: 0.02,          // Более плавный зум
        minZoom: 0.2,            // Минимальный зум
        maxZoom: 5.0             // Максимальный зум
      });
      
      // Принудительное включение контроллера
      controller.enable();

      // Выбираем основную камеру для демонстрации
      game.selectCamera(myCamera1);
      //  Камера автоматически следит за управляемым героем!
      myCamera1.followEntity(controlledHero);
      //myCamera3.followEntity(controlledHero2);
      // === UI: подпись над героем ===
      uiNameTag = new UIEntity({ canvas: myCanvas, camera: myCamera1, attachTo: 'entity' });
      uiNameTag.createText({ text: 'Герой', entity: controlledHero, offsetX: 0, offsetY: -30, units: 'px', fontSize: 16, fill: 0xFFFFFF, anchor: 0.5 });
// END: CAMERA -----------------------------------------------------------------------------------------------------------------


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
  // Снимаем роутер ввода
  if (inputRouter) {
    inputRouter.detach();
    inputRouter = null;
  }
  if (uiOverlay) {
    try { uiOverlay.destroy(); } catch(_) {}
    uiOverlay = null;
  }
  if (uiNameTag) {
    try { uiNameTag.destroy(); } catch(_) {}
    uiNameTag = null;
  }
  document.removeEventListener('fullscreenchange', handleFsChange);
  document.removeEventListener('webkitfullscreenchange', handleFsChange);
  document.removeEventListener('mozfullscreenchange', handleFsChange);
  document.removeEventListener('MSFullscreenChange', handleFsChange);
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
  height: 99vh;
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

#game-container{
  position: fixed;
  left: 0;
  top: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1000;
}

.fullscreen-btn{
  position: fixed;
  right: 12px;
  top: 12px;
  z-index: 1001; /* выше слоя канваса (у контейнера 1000) */
  background: rgba(0,0,0,0.6);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.4);
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
}

.fullscreen-btn:hover{ background: rgba(0,0,0,0.75); }
</style>