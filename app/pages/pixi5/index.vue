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
    // --- Конец системы коллизий ---

    // --- Управление и состояние игры ---
    const keys = {};
    const speed = 5;
    const mousePosition = { x: 400, y: 300 };
    const bullets = [];
    
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
        bullet.startX = graphics.x; // Начальная позиция для расчета дальности
        bullet.startY = graphics.y;
        
        bullet.circle(0, 0, 4).fill(0xffff00);
        bullet.position.set(graphics.x, graphics.y);
        bullets.push(bullet);
        app.stage.addChild(bullet);
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
        
        // Проверяем выход за границы экрана
        if (b.x < -10 || b.x > app.screen.width + 10 || b.y < -10 || b.y > app.screen.height + 10) {
          shouldRemove = true;
        }
        
        // Проверяем попадания в цели
        for (const obstacle of obstacles) {
          if (obstacle.isAlive && b.penetrationLeft > 0 && checkBulletObstacleCollision(b, obstacle)) {
            respawn(obstacle);
            b.penetrationLeft--; // Уменьшаем пробитие
            
            // Если пробитие закончилось, снаряд исчезает
            if (b.penetrationLeft <= 0) {
              shouldRemove = true;
            }
            break; // Обрабатываем только одно попадание за кадр
          }
        }

        // Удаляем снаряд если нужно
        if (shouldRemove) {
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
