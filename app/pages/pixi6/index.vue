<template>
  <div class="game-container">
    <div ref="pixiContainer" class="game-canvas"></div>
    <div class="settings-panel">
      <h3>Настройки оружия</h3>
      
      <div class="setting-group">
        <label>Скорость снаряда:</label>
        <input 
          type="range" 
          min="5" 
          max="20" 
          step="1" 
          v-model="weaponSettings.bulletSpeed"
          @input="updateWeaponConfig"
        />
        <span>{{ weaponSettings.bulletSpeed }}</span>
      </div>

      <div class="setting-group">
        <label>Пробитие:</label>
        <input 
          type="range" 
          min="1" 
          max="10" 
          step="1" 
          v-model="weaponSettings.penetration"
          @input="updateWeaponConfig"
        />
        <span>{{ weaponSettings.penetration }}</span>
      </div>

      <div class="setting-group">
        <label>Количество снарядов:</label>
        <input 
          type="range" 
          min="1" 
          max="8" 
          step="1" 
          v-model="weaponSettings.bulletsPerShot"
          @input="updateWeaponConfig"
        />
        <span>{{ weaponSettings.bulletsPerShot }}</span>
      </div>

      <div class="setting-group">
        <label>Дальность:</label>
        <input 
          type="range" 
          min="100" 
          max="800" 
          step="50" 
          v-model="weaponSettings.maxRange"
          @input="updateWeaponConfig"
        />
        <span>{{ weaponSettings.maxRange }}</span>
      </div>

      <div class="setting-group">
        <label>Время жизни снаряда (сек):</label>
        <input 
          type="range" 
          min="0.5" 
          max="5" 
          step="0.1" 
          v-model="weaponSettings.bulletLifetime"
          @input="updateWeaponConfig"
        />
        <span>{{ Number(weaponSettings.bulletLifetime).toFixed(1) }}с</span>
      </div>

      <div class="setting-group">
        <label>Скорострельность (мс):</label>
        <input 
          type="range" 
          min="50" 
          max="1000" 
          step="50" 
          v-model="weaponSettings.fireRate"
          @input="updateWeaponConfig"
        />
        <span>{{ weaponSettings.fireRate }}</span>
      </div>

      <div class="setting-group">
        <label>Разброс (0-1):</label>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.05" 
          v-model="weaponSettings.spread"
          @input="updateWeaponConfig"
        />
        <span>{{ Number(weaponSettings.spread).toFixed(2) }}</span>
      </div>

      <div class="setting-group">
        <label>Макс. угол разброса (градусы):</label>
        <input 
          type="range" 
          min="0" 
          max="45" 
          step="1" 
          v-model="weaponSettings.maxSpreadAngle"
          @input="updateWeaponConfig"
        />
        <span>{{ weaponSettings.maxSpreadAngle }}°</span>
      </div>

      <div class="setting-group">
        <label>
          <input 
            type="checkbox" 
            v-model="weaponSettings.autoFire"
            @change="updateWeaponConfig"
          />
          Автоматическая стрельба
        </label>
      </div>

      <div class="setting-group">
        <label>
          <input 
            type="checkbox" 
            v-model="weaponSettings.fanSpread"
            @change="updateWeaponConfig"
          />
          Веерная стрельба
        </label>
      </div>

      <div class="setting-group">
        <label>Угол веера (градусы):</label>
        <input 
          type="range" 
          min="0" 
          max="90" 
          step="5" 
          v-model="weaponSettings.fanAngle"
          @input="updateWeaponConfig"
        />
        <span>{{ weaponSettings.fanAngle }}°</span>
      </div>

      <div class="setting-group">
        <label>
          <input 
            type="checkbox" 
            v-model="weaponSettings.explosiveRounds"
            @change="updateWeaponConfig"
          />
          Взрывчатые снаряды
        </label>
      </div>

      <div class="setting-group">
        <label>Радиус взрыва:</label>
        <input 
          type="range" 
          min="20" 
          max="100" 
          step="10" 
          v-model="weaponSettings.explosionRadius"
          @input="updateWeaponConfig"
        />
        <span>{{ weaponSettings.explosionRadius }}px</span>
      </div>

      <div class="setting-group">
        <label>
          <input 
            type="checkbox" 
            v-model="weaponSettings.ricochetWalls"
            @change="updateWeaponConfig"
          />
          Рикошет от стен
        </label>
      </div>

      <div class="setting-group">
        <label>
          <input 
            type="checkbox" 
            v-model="weaponSettings.ricochetEnemies"
            @change="updateWeaponConfig"
          />
          Рикошет от врагов
        </label>
      </div>

      <div class="setting-group">
        <label>Количество рикошетов:</label>
        <input 
          type="range" 
          min="1" 
          max="10" 
          step="1" 
          v-model="weaponSettings.maxRicochets"
          @input="updateWeaponConfig"
        />
        <span>{{ weaponSettings.maxRicochets }}</span>
      </div>

      <div class="setting-group">
        <label>Отдача оружия:</label>
        <input 
          type="range" 
          min="0" 
          max="10" 
          step="0.5" 
          v-model="weaponSettings.recoil"
          @input="updateWeaponConfig"
        />
        <span>{{ Number(weaponSettings.recoil).toFixed(1) }}</span>
      </div>

      <div class="setting-group">
        <label>Урон пули:</label>
        <input 
          type="range" 
          min="1" 
          max="10" 
          step="1" 
          v-model="weaponSettings.bulletDamage"
          @input="updateWeaponConfig"
        />
        <span>{{ weaponSettings.bulletDamage }}</span>
      </div>

      <div class="setting-group">
        <label>Урон взрыва:</label>
        <input 
          type="range" 
          min="1" 
          max="20" 
          step="1" 
          v-model="weaponSettings.explosionDamage"
          @input="updateWeaponConfig"
        />
        <span>{{ weaponSettings.explosionDamage }}</span>
      </div>

      <div class="presets">
        <h4>Пресеты:</h4>
        <button @click="loadPreset('assault')">Автомат</button>
        <button @click="loadPreset('sniper')">Снайперка</button>
        <button @click="loadPreset('shotgun')">Дробовик</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-container {
  display: flex;
  gap: 20px;
  padding: 20px;
  font-family: Arial, sans-serif;
  height: 90vh;
  overflow: hidden;
}

.game-canvas {
  flex-shrink: 0;
}

.settings-panel {
  width: 300px;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  overflow-y: auto;
}

.settings-panel h3 {
  margin-top: 0;
  color: #333;
}

.setting-group {
  margin-bottom: 20px;
}

.setting-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: #555;
}

.setting-group input[type="range"] {
  width: 200px;
  margin-right: 10px;
}

.setting-group input[type="checkbox"] {
  margin-right: 8px;
}

.setting-group span {
  font-weight: bold;
  color: #007acc;
}

.presets {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #ddd;
}

.presets h4 {
  margin-bottom: 10px;
  color: #333;
}

.presets button {
  display: block;
  width: 100%;
  margin-bottom: 8px;
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  background: #007acc;
  color: white;
  cursor: pointer;
  font-size: 14px;
}

.presets button:hover {
  background: #005a99;
}
</style>

<script setup>
import { onMounted, onUnmounted, ref, reactive } from 'vue';
import * as PIXI from 'pixi.js';

const pixiContainer = ref(null);

// Реактивные настройки оружия для UI
const weaponSettings = reactive({
  bulletSpeed: 10,
  penetration: 2,
  bulletsPerShot: 1,        // Количество снарядов за выстрел
  maxRange: 400,
  bulletLifetime: 2.0,      // Время жизни снаряда в секундах
  fireRate: 200,
  spread: 0.1,              // Интенсивность разброса (0 = нет разброса, 1 = максимальный)
  maxSpreadAngle: 5,        // Максимальный угол разброса в градусах
  fanSpread: false,         // Веерная стрельба вместо случайного разброса
  fanAngle: 30,             // Угол веера в градусах
  explosiveRounds: false,   // Взрывчатые снаряды
  explosionRadius: 50,      // Радиус взрыва в пикселях
  ricochetWalls: false,     // Рикошет от стен (границ экрана)
  ricochetEnemies: false,   // Рикошет от врагов (когда пробитие кончилось)
  maxRicochets: 3,          // Максимальное количество рикошетов
  recoil: 2.0,              // Сила отдачи оружия (0 = нет отдачи, 10 = максимальная)
  bulletDamage: 1,          // Урон от прямого попадания пули
  explosionDamage: 3,       // Урон от взрыва
  autoFire: true
});

// Переменная для хранения ссылки на weaponConfig из игрового цикла
let gameWeaponConfig = null;

// Функция для обновления конфигурации оружия в игре
const updateWeaponConfig = () => {
  if (gameWeaponConfig) {
    gameWeaponConfig.bulletSpeed = Number(weaponSettings.bulletSpeed);
    gameWeaponConfig.penetration = Number(weaponSettings.penetration);
    gameWeaponConfig.bulletsPerShot = Number(weaponSettings.bulletsPerShot);
    gameWeaponConfig.maxRange = Number(weaponSettings.maxRange);
    gameWeaponConfig.bulletLifetime = Number(weaponSettings.bulletLifetime);
    gameWeaponConfig.fireRate = Number(weaponSettings.fireRate);
    gameWeaponConfig.spread = Number(weaponSettings.spread);
    gameWeaponConfig.maxSpreadAngle = Number(weaponSettings.maxSpreadAngle);
    gameWeaponConfig.fanSpread = weaponSettings.fanSpread;
    gameWeaponConfig.fanAngle = Number(weaponSettings.fanAngle);
    gameWeaponConfig.explosiveRounds = weaponSettings.explosiveRounds;
    gameWeaponConfig.explosionRadius = Number(weaponSettings.explosionRadius);
    gameWeaponConfig.ricochetWalls = weaponSettings.ricochetWalls;
    gameWeaponConfig.ricochetEnemies = weaponSettings.ricochetEnemies;
    gameWeaponConfig.maxRicochets = Number(weaponSettings.maxRicochets);
    gameWeaponConfig.recoil = Number(weaponSettings.recoil);
    gameWeaponConfig.bulletDamage = Number(weaponSettings.bulletDamage);
    gameWeaponConfig.explosionDamage = Number(weaponSettings.explosionDamage);
    gameWeaponConfig.autoFire = weaponSettings.autoFire;
  }
};

// Функция для загрузки пресетов
const loadPreset = (presetName) => {
  const presets = {
    assault: {
      bulletSpeed: 12,
      penetration: 2,
      bulletsPerShot: 1,
      maxRange: 400,
      bulletLifetime: 1.5,
      fireRate: 150,
      spread: 0.25,
      maxSpreadAngle: 8,
      fanSpread: false,      // Автомат использует случайный разброс
      fanAngle: 20,
      explosiveRounds: false, // Обычные снаряды
      explosionRadius: 40,
      ricochetWalls: true,   // Автомат с рикошетом от стен
      ricochetEnemies: false,
      maxRicochets: 2,
      recoil: 1.5,           // Небольшая отдача автомата
      bulletDamage: 2,       // Средний урон пули
      explosionDamage: 4,    // Средний урон взрыва
      autoFire: true
    },
    sniper: {
      bulletSpeed: 20,
      penetration: 5,
      bulletsPerShot: 1,
      maxRange: 800,
      bulletLifetime: 3.0,
      fireRate: 800,
      spread: 0.05,
      maxSpreadAngle: 2,
      fanSpread: false,      // Снайперка без веера
      fanAngle: 0,
      explosiveRounds: true, // Взрывчатые снайперские снаряды!
      explosionRadius: 70,   // Большой радиус взрыва
      ricochetWalls: false,  // Снайперка без рикошетов
      ricochetEnemies: false,
      maxRicochets: 1,
      recoil: 8.0,           // Сильная отдача снайперки!
      bulletDamage: 10,      // Максимальный урон пули!
      explosionDamage: 15,   // Огромный урон взрыва!
      autoFire: false
    },
    shotgun: {
      bulletSpeed: 8,
      penetration: 1,
      bulletsPerShot: 5,      // Дробовик стреляет сразу 5 снарядами!
      maxRange: 200,
      bulletLifetime: 1.0,
      fireRate: 600,
      spread: 0.3,
      maxSpreadAngle: 15,
      fanSpread: true,       // Дробовик использует веер!
      fanAngle: 45,          // Широкий веер 45 градусов
      explosiveRounds: false, // Обычная дробь
      explosionRadius: 30,
      ricochetWalls: true,   // Дробь рикошетит от стен
      ricochetEnemies: true, // И от врагов когда пробитие кончается!
      maxRicochets: 4,       // Много рикошетов для дроби
      recoil: 4.5,           // Средняя отдача дробовика
      bulletDamage: 1,       // Малый урон одной дробинки
      explosionDamage: 2,    // Малый урон взрыва
      autoFire: false
    }
  };
  
  if (presets[presetName]) {
    Object.assign(weaponSettings, presets[presetName]);
    updateWeaponConfig();
  }
};

onMounted(async () => {
  if (process.client && pixiContainer.value) {
    const app = new PIXI.Application();
    await app.init({
      width: 800,
      height: 600,
      background: 0x1099bb,
    });
    pixiContainer.value.appendChild(app.canvas);

    // --- Создание красного треугольника ---
    const graphics = new PIXI.Graphics();
    graphics.entityType = 'player'; // Уникальный идентификатор для игрока
    // Рисуем треугольник, уменьшенный в 2 раза
    graphics.poly([0, -25, 50, 0, 0, 25]).fill(0xde3249);
    // Ставим опорную точку в центр основания
    graphics.pivot.set(25, 0);
    graphics.position.set(400, 300);
    app.stage.addChild(graphics);
    // --- Конец создания треугольника ---

    // --- Второй квадрат (белый) ---
    const graphics2 = new PIXI.Graphics();
    graphics2.entityType = 'box'; // Идентификатор для объекта
    graphics2.isAlive = true; // Флаг, показывающий, активен ли объект
    graphics2.health = 1; // Здоровье врага (пока 1 хит = смерть)
    graphics2.maxHealth = 1; // Максимальное здоровье для восстановления при респавне
    graphics2.rect(0, 0, 40, 40).fill(0xffffff);
    graphics2.pivot.set(20, 20);
    graphics2.position.set(200, 250);
    app.stage.addChild(graphics2);
    // --- Конец второго квадрата ---

    // --- Система коллизий ---
    const obstacles = [graphics2];
    const respawnDelay = 2000;

    function respawn(obj) {
      obj.isAlive = false;
      obj.visible = false;
      setTimeout(() => {
        const margin = 50;
        obj.x = Math.random() * (app.screen.width - margin * 2) + margin;
        obj.y = Math.random() * (app.screen.height - margin * 2) + margin;
        obj.health = obj.maxHealth; // Восстанавливаем здоровье при респавне
        obj.isAlive = true;
        obj.visible = true;
      }, respawnDelay);
    }

    // Проверка столкновения игрока с препятствием (AABB)
    function checkPlayerObstacleCollision(player, obstacle) {
      const boundsObstacle = obstacle.getBounds();
      const boundsPlayer = player.getBounds();
      const inset = 10;
      const playerHitbox = new PIXI.Rectangle(
        boundsPlayer.x + inset,
        boundsPlayer.y + inset,
        boundsPlayer.width - inset * 2,
        boundsPlayer.height - inset * 2
      );
      if (playerHitbox.width < 0) playerHitbox.width = 0;
      if (playerHitbox.height < 0) playerHitbox.height = 0;
      return playerHitbox.x < boundsObstacle.x + boundsObstacle.width &&
             playerHitbox.x + playerHitbox.width > boundsObstacle.x &&
             playerHitbox.y < boundsObstacle.y + boundsObstacle.height &&
             playerHitbox.y + playerHitbox.height > boundsObstacle.y;
    }

    // Проверка столкновения снаряда с препятствием (круги)
    function checkBulletObstacleCollision(bullet, obstacle) {
      const dx = bullet.x - obstacle.x;
      const dy = bullet.y - obstacle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const bulletRadius = 4;
      const obstacleRadius = 20; // Упрощенный "хитбокс" квадрата
      return distance < bulletRadius + obstacleRadius;
    }
    
    // Функция нанесения урона объекту
    function dealDamage(target, damage) {
      if (!target.isAlive) return false;
      
      target.health -= damage;
      
      // Проверяем, погиб ли объект
      if (target.health <= 0) {
        respawn(target);
        return true; // Объект уничтожен
      }
      
      return false; // Объект выжил
    }
    // --- Конец системы коллизий ---

    // --- Управление и состояние игры ---
    const keys = {};
    const speed = 5;
    const mousePosition = { x: 400, y: 300 };
    const bullets = [];
    const explosions = []; // Массив для эффектов взрывов
    
    // --- Настройки оружия ---
    const weaponConfig = {
      bulletSpeed: weaponSettings.bulletSpeed,
      penetration: weaponSettings.penetration,
      bulletsPerShot: weaponSettings.bulletsPerShot,
      maxRange: weaponSettings.maxRange,
      bulletLifetime: weaponSettings.bulletLifetime,
      fireRate: weaponSettings.fireRate,
      spread: weaponSettings.spread,
      maxSpreadAngle: weaponSettings.maxSpreadAngle,
      fanSpread: weaponSettings.fanSpread,
      fanAngle: weaponSettings.fanAngle,
      explosiveRounds: weaponSettings.explosiveRounds,
      explosionRadius: weaponSettings.explosionRadius,
      ricochetWalls: weaponSettings.ricochetWalls,
      ricochetEnemies: weaponSettings.ricochetEnemies,
      maxRicochets: weaponSettings.maxRicochets,
      recoil: weaponSettings.recoil,
      bulletDamage: weaponSettings.bulletDamage,
      explosionDamage: weaponSettings.explosionDamage,
      autoFire: weaponSettings.autoFire
    };
    
    // Сохраняем ссылку для обновления из UI
    gameWeaponConfig = weaponConfig;
    
    // --- Состояние стрельбы ---
    let isMouseDown = false;
    let lastFireTime = 0;

    // Слушатели для клавиатуры
    const onKeyDown = (e) => { keys[e.code] = true; };
    const onKeyUp = (e) => { keys[e.code] = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // --- Функция создания взрыва ---
    function createExplosion(x, y, radius, damage = weaponConfig.explosionDamage) {
      // Создаем визуальный эффект взрыва
      const explosion = new PIXI.Graphics();
      explosion.circle(0, 0, radius).fill(0xff6600); // Оранжевый цвет взрыва
      explosion.alpha = 0.7;
      explosion.position.set(x, y);
      explosions.push(explosion);
      app.stage.addChild(explosion);
      
      // Проверяем коллизии взрыва с препятствиями
      for (const obstacle of obstacles) {
        if (obstacle.isAlive) {
          const dx = x - obstacle.x;
          const dy = y - obstacle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const obstacleRadius = 20; // Размер препятствия (половина ширины квадрата 40px)
          
          // Взрыв попадает, если расстояние от центра взрыва до центра препятствия 
          // меньше суммы радиуса взрыва и размера препятствия
          if (distance <= radius + obstacleRadius) {
            dealDamage(obstacle, damage); // Наносим урон взрывом
          }
        }
      }
      
      // Эффект исчезновения взрыва
      const fadeOut = () => {
        explosion.alpha -= 0.05;
        explosion.scale.x += 0.02;
        explosion.scale.y += 0.02;
        
        if (explosion.alpha <= 0) {
          app.stage.removeChild(explosion);
          explosion.destroy();
          const index = explosions.indexOf(explosion);
          if (index > -1) {
            explosions.splice(index, 1);
          }
        } else {
          requestAnimationFrame(fadeOut);
        }
      };
      
      fadeOut();
    }

    // Функция создания снаряда
    function createBullet() {
      const currentTime = Date.now();
      if (currentTime - lastFireTime < weaponConfig.fireRate) return; // Проверка скорострельности
      
      // Базовый угол в сторону курсора
      const baseAngle = Math.atan2(mousePosition.y - graphics.y, mousePosition.x - graphics.x);
      
      // Создаем столько пуль, сколько указано в bulletsPerShot
      for (let i = 0; i < weaponConfig.bulletsPerShot; i++) {
        const bullet = new PIXI.Graphics();
        bullet.entityType = 'bullet';
        
        // Вычисляем угол для каждой пули
        let finalAngle = baseAngle;
        
        if (weaponConfig.fanSpread && weaponConfig.bulletsPerShot > 1) {
          // ВЕЕРНАЯ СТРЕЛЬБА: равномерное распределение по дуге
          const fanAngleRad = (weaponConfig.fanAngle * Math.PI) / 180;
          const stepAngle = fanAngleRad / (weaponConfig.bulletsPerShot - 1);
          const startAngle = baseAngle - fanAngleRad / 2;
          finalAngle = startAngle + (stepAngle * i);
          
        } else if (!weaponConfig.fanSpread && weaponConfig.spread > 0 && weaponConfig.maxSpreadAngle > 0) {
          // СЛУЧАЙНЫЙ РАЗБРОС: как было раньше
          const randomSpread = (Math.random() - 0.5) * 2;
          const spreadAngleRad = (randomSpread * weaponConfig.spread * weaponConfig.maxSpreadAngle) * (Math.PI / 180);
          finalAngle = baseAngle + spreadAngleRad;
        }
        
        // Вычисляем скорость с учетом финального угла
        bullet.vx = Math.cos(finalAngle) * weaponConfig.bulletSpeed;
        bullet.vy = Math.sin(finalAngle) * weaponConfig.bulletSpeed;
        
        // Свойства снаряда
        bullet.penetrationLeft = weaponConfig.penetration; // Сколько целей еще может пробить
        bullet.distanceTraveled = 0; // Пройденное расстояние
        bullet.timeAlive = 0; // Время жизни в секундах
        bullet.maxLifetime = weaponConfig.bulletLifetime; // Максимальное время жизни
        bullet.ricochetsLeft = weaponConfig.maxRicochets; // Количество оставшихся рикошетов
        bullet.damage = weaponConfig.bulletDamage; // Урон пули
        bullet.startX = graphics.x; // Начальная позиция для расчета дальности
        bullet.startY = graphics.y;
        
        bullet.circle(0, 0, 4).fill(0xffff00);
        bullet.position.set(graphics.x, graphics.y);
        bullets.push(bullet);
        app.stage.addChild(bullet);
      }
      
      // --- Применяем отдачу оружия ---
      if (weaponConfig.recoil > 0) {
        // Базовый угол выстрела (в сторону курсора)
        const baseAngle = Math.atan2(mousePosition.y - graphics.y, mousePosition.x - graphics.x);
        
        // Отдача в противоположную сторону
        const recoilAngle = baseAngle + Math.PI; // + 180 градусов
        const recoilForce = weaponConfig.recoil * weaponConfig.bulletsPerShot; // Увеличиваем отдачу для множественных снарядов
        
        // Применяем силу отдачи к игроку
        const recoilX = Math.cos(recoilAngle) * recoilForce;
        const recoilY = Math.sin(recoilAngle) * recoilForce;
        
        graphics.x += recoilX;
        graphics.y += recoilY;
        
        // Проверяем границы после отдачи
        const boundLeft = 25, boundRight = 25, boundTop = 25, boundBottom = 25;
        graphics.x = Math.max(boundLeft, Math.min(graphics.x, app.screen.width - boundRight));
        graphics.y = Math.max(boundTop, Math.min(graphics.y, app.screen.height - boundBottom));
      }
      
      lastFireTime = currentTime;
    }

    // Слушатели для мыши
    app.stage.interactive = true;
    app.stage.hitArea = app.screen;
    app.stage.on('pointermove', (event) => {
      mousePosition.x = event.global.x;
      mousePosition.y = event.global.y;
    });
    
    // Обработка нажатия мыши
    app.stage.on('pointerdown', () => {
      isMouseDown = true;
      if (!weaponConfig.autoFire) {
        createBullet(); // Для одиночной стрельбы стреляем сразу
      }
    });
    
    // Обработка отпускания мыши
    app.stage.on('pointerup', () => {
      isMouseDown = false;
    });
    
    // Обработка выхода курсора за пределы canvas
    app.stage.on('pointerupoutside', () => {
      isMouseDown = false;
    });
    // --- Конец блока управления ---

    // --- Логика игры в каждом кадре ---
    const rotationSpeed = 0.1;

    app.ticker.add((ticker) => {
      // --- Логика игрока ---
      const targetRotation = Math.atan2(mousePosition.y - graphics.y, mousePosition.x - graphics.x);
      let delta = targetRotation - graphics.rotation;
      if (delta > Math.PI) delta -= 2 * Math.PI;
      if (delta < -Math.PI) delta += 2 * Math.PI;
      graphics.rotation += delta * rotationSpeed;
      const movement = { x: 0, y: 0 };
      if (keys['ArrowUp'])    movement.y = -1;
      if (keys['ArrowDown'])  movement.y = 1;
      if (keys['ArrowLeft'])  movement.x = -1;
      if (keys['ArrowRight']) movement.x = 1;
      graphics.x += movement.x * speed * ticker.deltaTime;
      graphics.y += movement.y * speed * ticker.deltaTime;

      // --- Автоматическая стрельба ---
      if (weaponConfig.autoFire && isMouseDown) {
        createBullet();
      }

      // --- Логика снарядов и их коллизий ---
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        const oldX = b.x;
        const oldY = b.y;
        
        b.x += b.vx * ticker.deltaTime;
        b.y += b.vy * ticker.deltaTime;
        
        // Обновляем пройденное расстояние
        const dx = b.x - oldX;
        const dy = b.y - oldY;
        b.distanceTraveled += Math.sqrt(dx * dx + dy * dy);
        
        // Обновляем время жизни (ticker.elapsedMS - время в миллисекундах с прошлого кадра)
        b.timeAlive += ticker.elapsedMS / 1000;

        let shouldRemove = false;
        
        // Проверяем время жизни (что первое произойдет)
        if (b.timeAlive >= b.maxLifetime) {
          shouldRemove = true;
        }
        
        // Проверяем дальность полета (что первое произойдет)
        if (b.distanceTraveled > weaponConfig.maxRange) {
          shouldRemove = true;
        }
        
        // Проверяем рикошет от стен (границы экрана)
        if (weaponConfig.ricochetWalls && b.ricochetsLeft > 0) {
          let hasRicocheted = false;
          
          // Проверяем левую и правую стены
          if (b.x <= 4 || b.x >= app.screen.width - 4) {
            b.vx = -b.vx; // Инвертируем горизонтальную скорость
            b.x = Math.max(4, Math.min(b.x, app.screen.width - 4)); // Корректируем позицию
            hasRicocheted = true;
          }
          
          // Проверяем верхнюю и нижнюю стены
          if (b.y <= 4 || b.y >= app.screen.height - 4) {
            b.vy = -b.vy; // Инвертируем вертикальную скорость
            b.y = Math.max(4, Math.min(b.y, app.screen.height - 4)); // Корректируем позицию
            hasRicocheted = true;
          }
          
          if (hasRicocheted) {
            b.ricochetsLeft--; // Уменьшаем количество рикошетов
          }
        }
        
        // Проверяем выход за границы экрана (если рикошеты кончились или отключены)
        if (b.x < -10 || b.x > app.screen.width + 10 || b.y < -10 || b.y > app.screen.height + 10) {
          shouldRemove = true;
        }
        
        // Проверяем попадания в цели
        for (const obstacle of obstacles) {
          if (obstacle.isAlive && checkBulletObstacleCollision(b, obstacle)) {
            
            if (b.penetrationLeft > 0) {
              // Есть пробитие - наносим урон цели
              dealDamage(obstacle, b.damage);
              b.penetrationLeft--; // Уменьшаем пробитие
              
              // Если пробитие закончилось, проверяем рикошет от врагов
              if (b.penetrationLeft <= 0) {
                if (weaponConfig.ricochetEnemies && b.ricochetsLeft > 0) {
                  // Рикошет от врага: отражаем снаряд в случайном направлении
                  const randomAngle = Math.random() * Math.PI * 2;
                  const currentSpeed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
                  b.vx = Math.cos(randomAngle) * currentSpeed;
                  b.vy = Math.sin(randomAngle) * currentSpeed;
                  b.ricochetsLeft--; // Уменьшаем количество рикошетов
                  
                  // Восстанавливаем минимальное пробитие для следующих целей
                  b.penetrationLeft = 1;
                } else {
                  shouldRemove = true;
                }
              }
            } else {
              // Пробития нет, но возможен рикошет от врагов
              if (weaponConfig.ricochetEnemies && b.ricochetsLeft > 0) {
                dealDamage(obstacle, b.damage);
                
                // Рикошет от врага: отражаем снаряд в случайном направлении
                const randomAngle = Math.random() * Math.PI * 2;
                const currentSpeed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
                b.vx = Math.cos(randomAngle) * currentSpeed;
                b.vy = Math.sin(randomAngle) * currentSpeed;
                b.ricochetsLeft--; // Уменьшаем количество рикошетов
                
                // Восстанавливаем минимальное пробитие для следующих целей
                b.penetrationLeft = 1;
              } else {
                // Нет ни пробития, ни рикошетов - снаряд исчезает
                shouldRemove = true;
              }
            }
            break; // Обрабатываем только одно попадание за кадр
          }
        }

        // Удаляем снаряд если нужно
        if (shouldRemove) {
          // Если снаряд взрывчатый, создаем взрыв
          if (weaponConfig.explosiveRounds) {
            createExplosion(b.x, b.y, weaponConfig.explosionRadius);
          }
          
          app.stage.removeChild(b);
          b.destroy();
          bullets.splice(i, 1);
        }
      }

      // --- Проверка коллизий игрока с коробками ---
      for (const obstacle of obstacles) {
        if (obstacle.isAlive && obstacle.entityType === 'box' && checkPlayerObstacleCollision(graphics, obstacle)) {
          respawn(obstacle);
        }
      }
      
      // --- Проверка границ для игрока ---
      const boundLeft = 25, boundRight = 25, boundTop = 25, boundBottom = 25;
      graphics.x = Math.max(boundLeft, Math.min(graphics.x, app.screen.width - boundRight));
      graphics.y = Math.max(boundTop, Math.min(graphics.y, app.screen.height - boundBottom));
      
      // --- Логика других объектов ---
      if (graphics2.isAlive) {
        graphics2.rotation -= 0.015 * ticker.deltaTime;
      }
    });

    onUnmounted(() => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      app.destroy(true, true);
    });
  }
});
</script>
