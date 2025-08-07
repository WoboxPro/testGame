<template>
  <div class="game-container">
    <div ref="pixiContainer" class="game-canvas"></div>
    <div class="settings-panel">
      <h3>Настройки оружия</h3>
      
      <div class="setting-group">
        <label>Тип стрельбы:</label>
        <select v-model="weaponSettings.weaponType" @change="updateWeaponConfig">
          <option value="projectile">Пули (снаряды)</option>
          <option value="raycast">Векторная (лучевая)</option>
        </select>
      </div>

      <div class="setting-group" v-if="weaponSettings.weaponType === 'raycast'">
        <label>Анимация векторной стрельбы:</label>
        <select v-model="weaponSettings.raycastAnimation" @change="updateWeaponConfig">
          <option value="laser">🔴 Лазер (видимый луч)</option>
          <option value="impact">💥 Попадания (только точки)</option>
        </select>
      </div>
      
      <div class="setting-group">
        <label>Скорость снаряда:</label>
        <input 
          type="range" 
          min="5" 
          max="20" 
          step="1" 
          v-model="weaponSettings.bulletSpeed"
          @input="updateWeaponConfig"
          :disabled="weaponSettings.weaponType === 'raycast'"
        />
        <span :class="{ disabled: weaponSettings.weaponType === 'raycast' }">
          {{ weaponSettings.bulletSpeed }}
          <small v-if="weaponSettings.weaponType === 'raycast'">(не используется)</small>
        </span>
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
          :disabled="weaponSettings.weaponType === 'raycast'"
        />
        <span :class="{ disabled: weaponSettings.weaponType === 'raycast' }">
          {{ Number(weaponSettings.bulletLifetime).toFixed(1) }}с
          <small v-if="weaponSettings.weaponType === 'raycast'">(не используется)</small>
        </span>
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
        <label>Разброс дальности (0-1):</label>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.05" 
          v-model="weaponSettings.rangeSpread"
          @input="updateWeaponConfig"
        />
        <span>{{ Number(weaponSettings.rangeSpread).toFixed(2) }}</span>
      </div>

      <div class="setting-group">
        <label>Макс. потеря дальности (%):</label>
        <input 
          type="range" 
          min="0" 
          max="50" 
          step="5" 
          v-model="weaponSettings.maxRangeLoss"
          @input="updateWeaponConfig"
        />
        <span>{{ weaponSettings.maxRangeLoss }}%</span>
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

      <div class="setting-group" v-if="weaponSettings.weaponType === 'projectile'">
        <label>
          <input 
            type="checkbox" 
            v-model="weaponSettings.homingEnabled"
            @change="updateWeaponConfig"
          />
          🎯 Самонаводящиеся пули
        </label>
      </div>

      <div class="setting-group" v-if="weaponSettings.weaponType === 'projectile'">
        <label>
          <input 
            type="checkbox" 
            v-model="weaponSettings.spawnAtCursor"
            @change="updateWeaponConfig"
          />
          ✨ Появление у курсора
        </label>
      </div>

      <div class="setting-group" v-if="weaponSettings.weaponType === 'projectile'">
        <label>
          <input 
            type="checkbox" 
            v-model="weaponSettings.largeBullets"
            @change="updateWeaponConfig"
          />
          🟠 Большие снаряды
        </label>
      </div>

      <div class="setting-group" v-if="weaponSettings.largeBullets && weaponSettings.weaponType === 'projectile'">
        <label>Размер снаряда:</label>
        <input 
          type="range" 
          min="8" 
          max="50" 
          step="2" 
          v-model="weaponSettings.bulletSize"
          @input="updateWeaponConfig"
        />
        <span>{{ weaponSettings.bulletSize }}px</span>
      </div>

      <div class="setting-group">
        <label>
          <input 
            type="checkbox" 
            v-model="weaponSettings.useAmmoSystem"
            @change="updateWeaponConfig"
          />
          🔫 Система обоймы
        </label>
      </div>

      <div class="setting-group" v-if="weaponSettings.useAmmoSystem">
        <label>Размер обоймы:</label>
        <input 
          type="range" 
          min="5" 
          max="100" 
          step="5" 
          v-model="weaponSettings.maxAmmo"
          @input="updateWeaponConfig"
        />
        <span>{{ weaponSettings.maxAmmo }}</span>
      </div>

      <div class="setting-group" v-if="weaponSettings.useAmmoSystem">
        <label>Время перезарядки (сек):</label>
        <input 
          type="range" 
          min="0.5" 
          max="5" 
          step="0.1" 
          v-model="weaponSettings.reloadTime"
          @input="updateWeaponConfig"
        />
        <span>{{ Number(weaponSettings.reloadTime).toFixed(1) }}с</span>
      </div>

      <div class="setting-group" v-if="weaponSettings.useAmmoSystem">
        <label>
          <input 
            type="checkbox" 
            v-model="weaponSettings.ammoPerShot"
            @change="updateWeaponConfig"
          />
          📊 Расход за выстрел (иначе за снаряд)
        </label>
      </div>

      <div class="setting-group" v-if="weaponSettings.weaponType === 'projectile'">
        <label>
          <input 
            type="checkbox" 
            v-model="weaponSettings.gravityEnabled"
            @change="updateWeaponConfig"
          />
          🌍 Гравитация
        </label>
      </div>

      <div class="setting-group" v-if="weaponSettings.gravityEnabled && weaponSettings.weaponType === 'projectile'">
        <label>Сила гравитации:</label>
        <input 
          type="range" 
          min="0.01" 
          max="0.3" 
          step="0.01" 
          v-model="weaponSettings.gravityStrength"
          @input="updateWeaponConfig"
        />
        <span>{{ Number(weaponSettings.gravityStrength).toFixed(2) }}</span>
      </div>

      <div class="setting-group" v-if="weaponSettings.gravityEnabled && weaponSettings.weaponType === 'projectile'">
        <label>Задержка гравитации (мс):</label>
        <input 
          type="range" 
          min="0" 
          max="1000" 
          step="50" 
          v-model="weaponSettings.gravityDelay"
          @input="updateWeaponConfig"
        />
        <span>{{ weaponSettings.gravityDelay }}мс</span>
      </div>

      <div class="setting-group" v-if="weaponSettings.gravityEnabled && weaponSettings.weaponType === 'projectile'">
        <label>Макс. скорость падения:</label>
        <input 
          type="range" 
          min="5" 
          max="50" 
          step="1" 
          v-model="weaponSettings.maxFallSpeed"
          @input="updateWeaponConfig"
        />
        <span>{{ weaponSettings.maxFallSpeed }}</span>
      </div>

      <div class="setting-group" v-if="weaponSettings.gravityEnabled && weaponSettings.weaponType === 'projectile'">
        <label>Направление гравитации (градусы):</label>
        <input 
          type="range" 
          min="0" 
          max="359" 
          step="1" 
          v-model="weaponSettings.gravityDirection"
          @input="updateWeaponConfig"
        />
        <span>{{ weaponSettings.gravityDirection }}°</span>
      </div>

      <div class="setting-group" v-if="weaponSettings.homingEnabled && weaponSettings.weaponType === 'projectile'">
        <label>Скорость наведения (0-1):</label>
        <input 
          type="range" 
          min="0.01" 
          max="0.5" 
          step="0.01" 
          v-model="weaponSettings.homingStrength"
          @input="updateWeaponConfig"
        />
        <span>{{ Number(weaponSettings.homingStrength).toFixed(2) }}</span>
      </div>

      <div class="setting-group" v-if="weaponSettings.homingEnabled && weaponSettings.weaponType === 'projectile'">
        <label>Макс. угол поворота (град/кадр):</label>
        <input 
          type="range" 
          min="0.5" 
          max="10" 
          step="0.5" 
          v-model="weaponSettings.maxTurnRate"
          @input="updateWeaponConfig"
        />
        <span>{{ Number(weaponSettings.maxTurnRate).toFixed(1) }}°</span>
      </div>

      <div class="setting-group" v-if="weaponSettings.homingEnabled && weaponSettings.weaponType === 'projectile'">
        <label>Задержка наведения (мс):</label>
        <input 
          type="range" 
          min="0" 
          max="2000" 
          step="100" 
          v-model="weaponSettings.homingDelay"
          @input="updateWeaponConfig"
        />
        <span>{{ weaponSettings.homingDelay }}мс</span>
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
        <button @click="loadPreset('laser')">🔴 Лазер</button>
        <button @click="loadPreset('sniper_ray')">💥 Снайпер</button>
        <button @click="loadPreset('homing_magic')">🎯 Магия</button>
        <button @click="loadPreset('gravity_cannon')">🌪️ Гравипушка</button>
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

.setting-group input[type="range"]:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.setting-group input[type="checkbox"] {
  margin-right: 8px;
}

.setting-group select {
  width: 200px;
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
  font-size: 14px;
}

.setting-group span {
  font-weight: bold;
  color: #007acc;
}

.setting-group span.disabled {
  color: #999;
}

.setting-group small {
  font-weight: normal;
  font-style: italic;
  color: #666;
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
  weaponType: 'projectile', // Тип оружия: 'projectile' - пули, 'raycast' - векторная стрельба
  raycastAnimation: 'laser', // Анимация векторной стрельбы: 'laser' - видимый луч, 'impact' - только точки попаданий
  bulletSpeed: 10,
  penetration: 2,
  bulletsPerShot: 1,        // Количество снарядов за выстрел
  maxRange: 400,
  bulletLifetime: 2.0,      // Время жизни снаряда в секундах
  fireRate: 200,
  spread: 0.1,              // Интенсивность разброса (0 = нет разброса, 1 = максимальный)
  maxSpreadAngle: 5,        // Максимальный угол разброса в градусах
  rangeSpread: 0.1,         // Интенсивность разброса дальности (0 = нет, 1 = максимальный)
  maxRangeLoss: 20,         // Максимальная потеря дальности в процентах
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
  homingEnabled: false,     // Включить самонаведение пуль
  homingStrength: 0.1,      // Сила притяжения к курсору (0-1)
  maxTurnRate: 3.0,         // Максимальная скорость поворота в градусах за кадр
  homingDelay: 300,         // Задержка перед началом самонаведения в миллисекундах
  spawnAtCursor: false,     // Появление снарядов у курсора вместо игрока
  largeBullets: false,      // Большие снаряды с увеличенным радиусом
  bulletSize: 8,            // Размер больших снарядов в пикселях
  useAmmoSystem: false,     // Использовать систему обоймы
  maxAmmo: 30,              // Максимальное количество патронов в обойме
  reloadTime: 2.0,          // Время перезарядки в секундах
  ammoPerShot: true,        // Расход патронов за выстрел (иначе за каждый снаряд)
  gravityEnabled: false,    // Включить гравитацию для пуль
  gravityStrength: 0.05,    // Сила гравитации (ускорение в пикселях за кадр в квадрате)
  gravityDelay: 200,        // Задержка активации гравитации (мс)
  maxFallSpeed: 15,         // Максимальная скорость падения
  gravityDirection: 90,     // Направление гравитации в градусах (90 = вниз)
  autoFire: true
});

// Переменная для хранения ссылки на weaponConfig из игрового цикла
let gameWeaponConfig = null;

// Функция для обновления конфигурации оружия в игре
const updateWeaponConfig = () => {
  if (gameWeaponConfig) {
    gameWeaponConfig.weaponType = weaponSettings.weaponType;
    gameWeaponConfig.raycastAnimation = weaponSettings.raycastAnimation;
    gameWeaponConfig.bulletSpeed = Number(weaponSettings.bulletSpeed);
    gameWeaponConfig.penetration = Number(weaponSettings.penetration);
    gameWeaponConfig.bulletsPerShot = Number(weaponSettings.bulletsPerShot);
    gameWeaponConfig.maxRange = Number(weaponSettings.maxRange);
    gameWeaponConfig.bulletLifetime = Number(weaponSettings.bulletLifetime);
    gameWeaponConfig.fireRate = Number(weaponSettings.fireRate);
    gameWeaponConfig.spread = Number(weaponSettings.spread);
    gameWeaponConfig.maxSpreadAngle = Number(weaponSettings.maxSpreadAngle);
    gameWeaponConfig.rangeSpread = Number(weaponSettings.rangeSpread);
    gameWeaponConfig.maxRangeLoss = Number(weaponSettings.maxRangeLoss);
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
    gameWeaponConfig.homingEnabled = weaponSettings.homingEnabled;
    gameWeaponConfig.homingStrength = Number(weaponSettings.homingStrength);
    gameWeaponConfig.maxTurnRate = Number(weaponSettings.maxTurnRate);
    gameWeaponConfig.homingDelay = Number(weaponSettings.homingDelay);
    gameWeaponConfig.spawnAtCursor = weaponSettings.spawnAtCursor;
    gameWeaponConfig.largeBullets = weaponSettings.largeBullets;
    gameWeaponConfig.bulletSize = Number(weaponSettings.bulletSize);
    gameWeaponConfig.useAmmoSystem = weaponSettings.useAmmoSystem;
    gameWeaponConfig.maxAmmo = Number(weaponSettings.maxAmmo);
    gameWeaponConfig.reloadTime = Number(weaponSettings.reloadTime);
    gameWeaponConfig.ammoPerShot = weaponSettings.ammoPerShot;
    gameWeaponConfig.gravityEnabled = weaponSettings.gravityEnabled;
    gameWeaponConfig.gravityStrength = Number(weaponSettings.gravityStrength);
    gameWeaponConfig.gravityDelay = Number(weaponSettings.gravityDelay);
    gameWeaponConfig.maxFallSpeed = Number(weaponSettings.maxFallSpeed);
    gameWeaponConfig.gravityDirection = Number(weaponSettings.gravityDirection);
    gameWeaponConfig.autoFire = weaponSettings.autoFire;
  }
};

// Функция для загрузки пресетов
const loadPreset = (presetName) => {
  const presets = {
    assault: {
      weaponType: 'projectile',
      raycastAnimation: 'laser', // Не используется для пуль
      bulletSpeed: 12,
      penetration: 2,
      bulletsPerShot: 1,
      maxRange: 400,
      bulletLifetime: 1.5,
      fireRate: 150,
      spread: 0.25,
      maxSpreadAngle: 8,
      rangeSpread: 0.3,      // Средний разброс дальности у автомата
      maxRangeLoss: 25,      // Может терять до 25% дальности
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
      homingEnabled: false,  // Обычный автомат без самонаведения
      homingStrength: 0.1,
      maxTurnRate: 3.0,
      homingDelay: 300,
      spawnAtCursor: false,  // Стреляет от игрока
      largeBullets: false,   // Обычные мелкие пули
      bulletSize: 8,
      useAmmoSystem: true,   // Автомат с обоймой
      maxAmmo: 30,           // 30 патронов
      reloadTime: 2.0,       // 2 секунды перезарядки
      ammoPerShot: true,     // Расход за выстрел
      gravityEnabled: false, // Автомат без гравитации
      gravityStrength: 0.05,
      gravityDelay: 200,
      maxFallSpeed: 15,
      gravityDirection: 90,
      autoFire: true
    },
    sniper: {
      weaponType: 'projectile',
      raycastAnimation: 'laser', // Не используется для пуль
      bulletSpeed: 20,
      penetration: 5,
      bulletsPerShot: 1,
      maxRange: 800,
      bulletLifetime: 3.0,
      fireRate: 800,
      spread: 0.05,
      maxSpreadAngle: 2,
      rangeSpread: 0.05,     // Минимальный разброс дальности у снайперки
      maxRangeLoss: 5,       // Теряет максимум 5% дальности
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
      homingEnabled: false,  // Снайперка без самонаведения (точность важнее)
      homingStrength: 0.1,
      maxTurnRate: 3.0,
      homingDelay: 300,
      spawnAtCursor: false,  // Стреляет от игрока
      largeBullets: true,    // Большие снайперские снаряды!
      bulletSize: 12,        // Крупные снаряды
      useAmmoSystem: true,   // Снайперка с патронами
      maxAmmo: 5,            // Мало патронов
      reloadTime: 3.0,       // Долгая перезарядка
      ammoPerShot: true,     // Расход за выстрел
      gravityEnabled: true,  // Снайперка с гравитацией!
      gravityStrength: 0.02, // Минимальная гравитация для точности
      gravityDelay: 100,     // Быстрая активация
      maxFallSpeed: 8,       // Медленное падение
      gravityDirection: 90,  // Вниз
      autoFire: false
    },
    shotgun: {
      weaponType: 'projectile',
      raycastAnimation: 'laser', // Не используется для пуль
      bulletSpeed: 8,
      penetration: 1,
      bulletsPerShot: 5,      // Дробовик стреляет сразу 5 снарядами!
      maxRange: 200,
      bulletLifetime: 1.0,
      fireRate: 600,
      spread: 0.3,
      maxSpreadAngle: 15,
      rangeSpread: 0.5,      // Большой разброс дальности у дробовика
      maxRangeLoss: 40,      // Может терять до 40% дальности
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
      homingEnabled: false,  // Дробовик без самонаведения
      homingStrength: 0.1,
      maxTurnRate: 3.0,
      homingDelay: 300,
      spawnAtCursor: false,  // Стреляет от игрока
      largeBullets: false,   // Обычная дробь
      bulletSize: 8,
      useAmmoSystem: true,   // Дробовик с патронами
      maxAmmo: 8,            // 8 патронов
      reloadTime: 2.5,       // Средняя перезарядка
      ammoPerShot: true,     // Расход за выстрел (не за дробинку!)
      gravityEnabled: true,  // Дробовик с гравитацией!
      gravityStrength: 0.1,  // Средняя гравитация для дроби
      gravityDelay: 50,      // Быстрая активация
      maxFallSpeed: 20,      // Быстрое падение дроби
      gravityDirection: 90,  // Вниз
      autoFire: false
    },
    laser: {
      weaponType: 'raycast',  // Векторное оружие!
      raycastAnimation: 'laser', // Видимые лучи
      bulletSpeed: 0,        // Не используется для лучей
      penetration: 3,        // Пробивает 3 цели
      bulletsPerShot: 1,     // Один луч
      maxRange: 600,         // Большая дальность
      bulletLifetime: 0,     // Не используется для лучей
      fireRate: 300,         // Средняя скорострельность
      spread: 0.1,           // Небольшой разброс
      maxSpreadAngle: 3,     // Точное оружие
      rangeSpread: 0.15,     // Небольшой разброс дальности лазера
      maxRangeLoss: 15,      // Может терять до 15% дальности
      fanSpread: false,      // Без веера
      fanAngle: 0,
      explosiveRounds: false, // Обычные лучи
      explosionRadius: 40,
      ricochetWalls: true,   // Лучи рикошетят от стен!
      ricochetEnemies: true, // И от врагов!
      maxRicochets: 5,       // Много рикошетов!
      recoil: 0.5,           // Минимальная отдача
      bulletDamage: 4,       // Высокий урон луча
      explosionDamage: 6,    // Высокий урон взрыва
      homingEnabled: false,  // Векторное оружие не поддерживает самонаведение
      homingStrength: 0.1,
      maxTurnRate: 3.0,
      homingDelay: 300,
      spawnAtCursor: false,  // Векторное оружие не поддерживает появление у курсора
      largeBullets: false,   // Векторное оружие не использует пули
      bulletSize: 8,
      useAmmoSystem: false,  // Лазер без патронов
      maxAmmo: 30,
      reloadTime: 2.0,
      ammoPerShot: true,
      gravityEnabled: false, // Лазер не поддерживает гравитацию
      gravityStrength: 0.05,
      gravityDelay: 200,
      maxFallSpeed: 15,
      gravityDirection: 90,
      autoFire: true
    },
    sniper_ray: {
      weaponType: 'raycast',  // Векторное оружие!
      raycastAnimation: 'impact', // Только точки попаданий!
      bulletSpeed: 0,        // Не используется
      penetration: 8,        // Пробивает много целей
      bulletsPerShot: 1,     // Один точный выстрел
      maxRange: 800,         // Максимальная дальность
      bulletLifetime: 0,     // Не используется
      fireRate: 1000,        // Медленная стрельба
      spread: 0.02,          // Минимальный разброс
      maxSpreadAngle: 1,     // Супер точное
      rangeSpread: 0.0,      // Нет разброса дальности у снайпера
      maxRangeLoss: 0,       // Никогда не теряет дальность
      fanSpread: false,      // Без веера
      fanAngle: 0,
      explosiveRounds: true, // Взрывчатые снаряды!
      explosionRadius: 80,   // Большой взрыв
      ricochetWalls: false,  // Без рикошетов от стен
      ricochetEnemies: false, // Без рикошетов от врагов
      maxRicochets: 0,       // Нет рикошетов
      recoil: 6.0,           // Сильная отдача
      bulletDamage: 15,      // Огромный урон!
      explosionDamage: 20,   // Огромный взрыв!
      homingEnabled: false,  // Векторное оружие не поддерживает самонаведение
      homingStrength: 0.1,
      maxTurnRate: 3.0,
      homingDelay: 300,
      spawnAtCursor: false,  // Векторное оружие не поддерживает появление у курсора
      largeBullets: false,   // Векторное оружие не использует пули
      bulletSize: 8,
      useAmmoSystem: false,  // Векторная снайперка без патронов
      maxAmmo: 30,
      reloadTime: 2.0,
      ammoPerShot: true,
      gravityEnabled: false, // Векторная снайперка не поддерживает гравитацию
      gravityStrength: 0.05,
      gravityDelay: 200,
      maxFallSpeed: 15,
      gravityDirection: 90,
      autoFire: false        // Только одиночная стрельба
    },
    homing_magic: {
      weaponType: 'projectile',
      raycastAnimation: 'laser', // Не используется для пуль
      bulletSpeed: 6,        // Медленные магические снаряды
      penetration: 3,
      bulletsPerShot: 3,     // Множественные магические снаряды
      maxRange: 500,
      bulletLifetime: 4.0,   // Долгое время жизни для наведения
      fireRate: 400,         // Средняя скорострельность
      spread: 0.4,           // Большой разброс в начале
      maxSpreadAngle: 25,    // Широкий разброс
      rangeSpread: 0.2,      // Средний разброс дальности
      maxRangeLoss: 15,      // Может терять до 15% дальности
      fanSpread: true,       // Веерная стрельба магических снарядов
      fanAngle: 60,          // Широкий веер
      explosiveRounds: true, // Магические взрывы!
      explosionRadius: 60,   // Средний радиус взрыва
      ricochetWalls: false,  // Магия не рикошетит от стен
      ricochetEnemies: false, // Магия не рикошетит от врагов
      maxRicochets: 0,       // Нет рикошетов
      recoil: 1.0,           // Небольшая отдача магии
      bulletDamage: 3,       // Средний урон магического снаряда
      explosionDamage: 5,    // Хороший магический взрыв
      homingEnabled: true,   // 🎯 САМОНАВОДЯЩИЕСЯ МАГИЧЕСКИЕ СНАРЯДЫ!
      homingStrength: 0.25,  // Сильное притяжение к курсору
      maxTurnRate: 5.0,      // Быстрый поворот магических снарядов
      homingDelay: 500,      // Задержка 0.5 сек перед началом наведения
      spawnAtCursor: true,   // ✨ ПОЯВЛЯЮТСЯ У КУРСОРА!
      largeBullets: true,    // 🟠 БОЛЬШИЕ МАГИЧЕСКИЕ СНАРЯДЫ!
      bulletSize: 14,        // Крупные магические орбы
      useAmmoSystem: false,  // Магия без ограничений
      maxAmmo: 30,
      reloadTime: 2.0,
      ammoPerShot: false,    // Расход за каждый магический снаряд
      gravityEnabled: false, // Магия не подвержена гравитации!
      gravityStrength: 0.05,
      gravityDelay: 200,
      maxFallSpeed: 15,
      gravityDirection: 90,
      autoFire: true
    },
    gravity_cannon: {
      weaponType: 'projectile',
      raycastAnimation: 'laser', // Не используется для пуль
      bulletSpeed: 15,        // Быстрые снаряды
      penetration: 1,         // Простое пробитие
      bulletsPerShot: 3,      // Тройной выстрел
      maxRange: 600,          // Большая дальность
      bulletLifetime: 5.0,    // Долгая жизнь для наблюдения траектории
      fireRate: 400,          // Средняя скорострельность
      spread: 0.2,            // Небольшой разброс
      maxSpreadAngle: 10,     // Веер разброса
      rangeSpread: 0.0,       // Без разброса дальности
      maxRangeLoss: 0,        // Без потери дальности
      fanSpread: true,        // Веерная стрельба!
      fanAngle: 30,           // Широкий веер для демонстрации
      explosiveRounds: false, // Без взрывов
      explosionRadius: 40,
      ricochetWalls: true,    // Рикошеты от стен!
      ricochetEnemies: false, // Без рикошетов от врагов
      maxRicochets: 3,        // Много рикошетов
      recoil: 3.0,            // Средняя отдача
      bulletDamage: 2,        // Средний урон
      explosionDamage: 4,
      homingEnabled: false,   // Без самонаведения
      homingStrength: 0.1,
      maxTurnRate: 3.0,
      homingDelay: 300,
      spawnAtCursor: false,   // От игрока
      largeBullets: true,     // Большие снаряды для видимости!
      bulletSize: 10,         // Средний размер
      useAmmoSystem: false,   // Бесконечные снаряды для экспериментов
      maxAmmo: 30,
      reloadTime: 2.0,
      ammoPerShot: false,
      gravityEnabled: true,   // 🌪️ МОЩНАЯ ГРАВИТАЦИЯ!
      gravityStrength: 0.15,  // Сильная гравитация
      gravityDelay: 300,      // Задержка для наблюдения траектории
      maxFallSpeed: 25,       // Быстрое падение
      gravityDirection: 45,   // Диагональная гравитация! ↘️
      autoFire: true
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
      background: 0x222222,
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
      const bulletRadius = bullet.bulletRadius || 4; // Используем сохраненный радиус пули
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
    const rayEffects = []; // Массив для визуальных эффектов векторной стрельбы
    const impactEffects = []; // Массив для эффектов точек попаданий
    
    // --- Настройки оружия ---
    const weaponConfig = {
      weaponType: weaponSettings.weaponType,
      raycastAnimation: weaponSettings.raycastAnimation,
      bulletSpeed: weaponSettings.bulletSpeed,
      penetration: weaponSettings.penetration,
      bulletsPerShot: weaponSettings.bulletsPerShot,
      maxRange: weaponSettings.maxRange,
      bulletLifetime: weaponSettings.bulletLifetime,
      fireRate: weaponSettings.fireRate,
      spread: weaponSettings.spread,
      maxSpreadAngle: weaponSettings.maxSpreadAngle,
      rangeSpread: weaponSettings.rangeSpread,
      maxRangeLoss: weaponSettings.maxRangeLoss,
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
      homingEnabled: weaponSettings.homingEnabled,
      homingStrength: weaponSettings.homingStrength,
      maxTurnRate: weaponSettings.maxTurnRate,
      homingDelay: weaponSettings.homingDelay,
      spawnAtCursor: weaponSettings.spawnAtCursor,
      largeBullets: weaponSettings.largeBullets,
      bulletSize: weaponSettings.bulletSize,
      useAmmoSystem: weaponSettings.useAmmoSystem,
      maxAmmo: weaponSettings.maxAmmo,
      reloadTime: weaponSettings.reloadTime,
      ammoPerShot: weaponSettings.ammoPerShot,
      gravityEnabled: weaponSettings.gravityEnabled,
      gravityStrength: weaponSettings.gravityStrength,
      gravityDelay: weaponSettings.gravityDelay,
      maxFallSpeed: weaponSettings.maxFallSpeed,
      gravityDirection: weaponSettings.gravityDirection,
      autoFire: weaponSettings.autoFire
    };
    
    // Сохраняем ссылку для обновления из UI
    gameWeaponConfig = weaponConfig;
    
    // --- Состояние стрельбы ---
    let isMouseDown = false;
    let lastFireTime = 0;
    
    // --- Состояние обоймы ---
    let currentAmmo = weaponConfig.maxAmmo; // Текущее количество патронов
    let isReloading = false; // Флаг перезарядки
    let reloadStartTime = 0; // Время начала перезарядки

    // Функция перезарядки
    function startReload() {
      if (!weaponConfig.useAmmoSystem || isReloading || currentAmmo >= weaponConfig.maxAmmo) return;
      
      isReloading = true;
      reloadStartTime = Date.now();
    }
    
    // Функция проверки возможности стрельбы
    function canFire() {
      if (!weaponConfig.useAmmoSystem) return true; // Бесконечные патроны
      if (isReloading) return false; // Во время перезарядки нельзя стрелять
      return currentAmmo > 0; // Есть патроны
    }
    
    // Функция расходования патронов
    function consumeAmmo(bulletsCount) {
      if (!weaponConfig.useAmmoSystem) return; // Бесконечные патроны
      
      if (weaponConfig.ammoPerShot) {
        // Расход за выстрел (один патрон независимо от количества снарядов)
        currentAmmo = Math.max(0, currentAmmo - 1);
      } else {
        // Расход за каждый снаряд
        currentAmmo = Math.max(0, currentAmmo - bulletsCount);
      }
    }

    // Слушатели для клавиатуры
    const onKeyDown = (e) => { 
      keys[e.code] = true;
      
      // Перезарядка на пробел
      if (e.code === 'Space') {
        e.preventDefault(); // Предотвращаем прокрутку страницы
        startReload();
      }
    };
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

    // --- Функция векторной стрельбы (raycast) ---
    function createRaycast() {
      const currentTime = Date.now();
      if (currentTime - lastFireTime < weaponConfig.fireRate) return; // Проверка скорострельности
      if (!canFire()) return; // Проверка возможности стрельбы (обойма)
      
      // Базовый угол в сторону курсора
      const baseAngle = Math.atan2(mousePosition.y - graphics.y, mousePosition.x - graphics.x);
      
      // Создаем столько лучей, сколько указано в bulletsPerShot
      for (let i = 0; i < weaponConfig.bulletsPerShot; i++) {
        // Вычисляем угол для каждого луча (аналогично пулям)
        let finalAngle = baseAngle;
        
        if (weaponConfig.fanSpread && weaponConfig.bulletsPerShot > 1) {
          // ВЕЕРНАЯ СТРЕЛЬБА: равномерное распределение по дуге
          const fanAngleRad = (weaponConfig.fanAngle * Math.PI) / 180;
          const stepAngle = fanAngleRad / (weaponConfig.bulletsPerShot - 1);
          const startAngle = baseAngle - fanAngleRad / 2;
          finalAngle = startAngle + (stepAngle * i);
          
        } else if (!weaponConfig.fanSpread && weaponConfig.spread > 0 && weaponConfig.maxSpreadAngle > 0) {
          // СЛУЧАЙНЫЙ РАЗБРОС
          const randomSpread = (Math.random() - 0.5) * 2;
          const spreadAngleRad = (randomSpread * weaponConfig.spread * weaponConfig.maxSpreadAngle) * (Math.PI / 180);
          finalAngle = baseAngle + spreadAngleRad;
        }
        
        // Вычисляем индивидуальную дальность с разбросом для луча
        let rayMaxRange = weaponConfig.maxRange;
        if (weaponConfig.rangeSpread > 0 && weaponConfig.maxRangeLoss > 0) {
          const randomSpread = Math.random() * weaponConfig.rangeSpread;
          const rangeLoss = randomSpread * (weaponConfig.maxRangeLoss / 100);
          rayMaxRange = weaponConfig.maxRange * (1 - rangeLoss);
        }
        
        // Выполняем raycast по направлению
        performRaycast(graphics.x, graphics.y, finalAngle, rayMaxRange, weaponConfig.penetration, weaponConfig.maxRicochets);
      }
      
      // --- Эффект вспышки у игрока ---
      createMuzzleFlash(graphics.x, graphics.y);
      
      // --- Расходуем патроны ---
      consumeAmmo(weaponConfig.bulletsPerShot);
      
      // --- Применяем отдачу оружия ---
      if (weaponConfig.recoil > 0) {
        const recoilAngle = baseAngle + Math.PI; // + 180 градусов
        const recoilForce = weaponConfig.recoil * weaponConfig.bulletsPerShot;
        
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

    // --- Функция выполнения raycast ---
    function performRaycast(startX, startY, angle, maxRange, penetrationLeft, ricochetsLeft) {
      const stepSize = 5; // Размер шага для проверки коллизий
      let currentX = startX;
      let currentY = startY;
      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle);
      let travelDistance = 0;
      const hitTargets = []; // Массив пораженных целей для этого луча
      
      // Проходим по лучу шаг за шагом
      while (travelDistance < maxRange && penetrationLeft > 0) {
        currentX += dirX * stepSize;
        currentY += dirY * stepSize;
        travelDistance += stepSize;
        
        // Проверяем рикошет от стен
        if (weaponConfig.ricochetWalls && ricochetsLeft > 0) {
          let hasRicocheted = false;
          let newAngle = angle;
          
          // Проверяем левую и правую стены
          if (currentX <= 0 || currentX >= app.screen.width) {
            newAngle = Math.PI - angle; // Отражение по горизонтали
            currentX = Math.max(0, Math.min(currentX, app.screen.width));
            hasRicocheted = true;
          }
          
          // Проверяем верхнюю и нижнюю стены
          if (currentY <= 0 || currentY >= app.screen.height) {
            newAngle = -angle; // Отражение по вертикали
            currentY = Math.max(0, Math.min(currentY, app.screen.height));
            hasRicocheted = true;
          }
          
          if (hasRicocheted) {
            // Создаем визуальный эффект до точки рикошета
            if (weaponConfig.raycastAnimation === 'laser') {
              createRayVisual(startX, startY, currentX, currentY);
            } else if (weaponConfig.raycastAnimation === 'impact') {
              createImpactPoint(currentX, currentY, 'ricochet');
            }
            
            // Продолжаем луч после рикошета
            ricochetsLeft--;
            return performRaycast(currentX, currentY, newAngle, maxRange - travelDistance, penetrationLeft, ricochetsLeft);
          }
        }
        
        // Проверяем выход за границы экрана (если рикошеты кончились)
        if (currentX < 0 || currentX > app.screen.width || currentY < 0 || currentY > app.screen.height) {
          break;
        }
        
        // Проверяем попадания в цели
        for (const obstacle of obstacles) {
          if (obstacle.isAlive && !hitTargets.includes(obstacle)) {
            const dx = currentX - obstacle.x;
            const dy = currentY - obstacle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const obstacleRadius = 20;
            
            if (distance <= obstacleRadius) {
              hitTargets.push(obstacle); // Помечаем цель как пораженную
              dealDamage(obstacle, weaponConfig.bulletDamage);
              
              // Создаем эффект попадания во врага
              if (weaponConfig.raycastAnimation === 'impact') {
                createImpactPoint(currentX, currentY, 'hit');
              }
              
              penetrationLeft--;
              
              // Если пробитие закончилось, проверяем рикошет от врагов
              if (penetrationLeft <= 0 && weaponConfig.ricochetEnemies && ricochetsLeft > 0) {
                // Создаем визуальный эффект до точки рикошета
                if (weaponConfig.raycastAnimation === 'laser') {
                  createRayVisual(startX, startY, currentX, currentY);
                } else if (weaponConfig.raycastAnimation === 'impact') {
                  createImpactPoint(currentX, currentY, 'ricochet');
                }
                
                // Рикошет от врага в случайном направлении
                const randomAngle = Math.random() * Math.PI * 2;
                ricochetsLeft--;
                penetrationLeft = 1; // Восстанавливаем минимальное пробитие
                return performRaycast(currentX, currentY, randomAngle, maxRange - travelDistance, penetrationLeft, ricochetsLeft);
              }
              
              break; // Обрабатываем только одно попадание за шаг
            }
          }
        }
      }
      
      // Создаем визуальный эффект для всего луча или точки окончания
      if (weaponConfig.raycastAnimation === 'laser') {
        createRayVisual(startX, startY, currentX, currentY);
      } else if (weaponConfig.raycastAnimation === 'impact') {
        createImpactPoint(currentX, currentY, 'end');
      }
      
      // Если луч взрывчатый, создаем взрыв в конечной точке
      if (weaponConfig.explosiveRounds) {
        createExplosion(currentX, currentY, weaponConfig.explosionRadius);
      }
    }

    // --- Функция создания визуального эффекта луча ---
    function createRayVisual(startX, startY, endX, endY) {
      const rayLine = new PIXI.Graphics();
      rayLine.moveTo(startX, startY);
      rayLine.lineTo(endX, endY);
      rayLine.stroke({ width: 3, color: 0xff0000, alpha: 0.8 }); // Красная линия
      
      rayEffects.push(rayLine);
      app.stage.addChild(rayLine);
      
      // Эффект исчезновения луча
      const fadeOut = () => {
        rayLine.alpha -= 0.1;
        if (rayLine.alpha <= 0) {
          app.stage.removeChild(rayLine);
          rayLine.destroy();
          const index = rayEffects.indexOf(rayLine);
          if (index > -1) {
            rayEffects.splice(index, 1);
          }
        } else {
          requestAnimationFrame(fadeOut);
        }
      };
      
      // Луч исчезает быстро (через несколько кадров)
      setTimeout(fadeOut, 50);
    }

    // --- Функция создания вспышки у игрока ---
    function createMuzzleFlash(x, y) {
      const flash = new PIXI.Graphics();
      flash.circle(0, 0, 8).fill(0xffffff); // Белая вспышка
      flash.alpha = 0.9;
      flash.position.set(x, y);
      
      impactEffects.push(flash);
      app.stage.addChild(flash);
      
      // Эффект исчезновения вспышки
      const fadeOut = () => {
        flash.alpha -= 0.2;
        flash.scale.x += 0.1;
        flash.scale.y += 0.1;
        
        if (flash.alpha <= 0) {
          app.stage.removeChild(flash);
          flash.destroy();
          const index = impactEffects.indexOf(flash);
          if (index > -1) {
            impactEffects.splice(index, 1);
          }
        } else {
          requestAnimationFrame(fadeOut);
        }
      };
      
      // Вспышка исчезает очень быстро
      setTimeout(fadeOut, 30);
    }

    // --- Функция создания эффекта точки попадания ---
    function createImpactPoint(x, y, type = 'hit') {
      const impact = new PIXI.Graphics();
      
      if (type === 'hit') {
        // Красная точка попадания во врага
        impact.circle(0, 0, 6).fill(0xff0000);
      } else if (type === 'ricochet') {
        // Желтая точка рикошета
        impact.circle(0, 0, 4).fill(0xffff00);
      } else if (type === 'end') {
        // Синяя точка окончания луча
        impact.circle(0, 0, 3).fill(0x0088ff);
      }
      
      impact.alpha = 0.8;
      impact.position.set(x, y);
      
      impactEffects.push(impact);
      app.stage.addChild(impact);
      
      // Эффект исчезновения точки
      const fadeOut = () => {
        impact.alpha -= 0.05;
        impact.scale.x += 0.02;
        impact.scale.y += 0.02;
        
        if (impact.alpha <= 0) {
          app.stage.removeChild(impact);
          impact.destroy();
          const index = impactEffects.indexOf(impact);
          if (index > -1) {
            impactEffects.splice(index, 1);
          }
        } else {
          requestAnimationFrame(fadeOut);
        }
      };
      
      // Точки исчезают медленнее чем вспышка
      setTimeout(fadeOut, 100);
    }

    // Функция создания снаряда
    function createBullet() {
      const currentTime = Date.now();
      if (currentTime - lastFireTime < weaponConfig.fireRate) return; // Проверка скорострельности
      if (!canFire()) return; // Проверка возможности стрельбы (обойма)
      
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
        
        // Вычисляем индивидуальную дальность с разбросом
        let bulletMaxRange = weaponConfig.maxRange;
        if (weaponConfig.rangeSpread > 0 && weaponConfig.maxRangeLoss > 0) {
          const randomSpread = Math.random() * weaponConfig.rangeSpread;
          const rangeLoss = randomSpread * (weaponConfig.maxRangeLoss / 100);
          bulletMaxRange = weaponConfig.maxRange * (1 - rangeLoss);
        }

        // Свойства снаряда
        bullet.penetrationLeft = weaponConfig.penetration; // Сколько целей еще может пробить
        bullet.distanceTraveled = 0; // Пройденное расстояние
        bullet.timeAlive = 0; // Время жизни в секундах
        bullet.maxLifetime = weaponConfig.bulletLifetime; // Максимальное время жизни
        bullet.ricochetsLeft = weaponConfig.maxRicochets; // Количество оставшихся рикошетов
        bullet.damage = weaponConfig.bulletDamage; // Урон пули
        bullet.maxRange = bulletMaxRange; // Индивидуальная дальность пули
        bullet.startX = graphics.x; // Начальная позиция для расчета дальности
        bullet.startY = graphics.y;
        
        // Свойства самонаведения
        bullet.homingActive = false; // Активно ли самонаведение (включается после задержки)
        bullet.homingTimer = 0; // Таймер задержки самонаведения
        
        // Свойства гравитации
        bullet.gravityActive = false; // Активна ли гравитация (включается после задержки)
        bullet.gravityTimer = 0; // Таймер задержки гравитации
        bullet.gravityVelocityX = 0; // Скорость по X под действием гравитации
        bullet.gravityVelocityY = 0; // Скорость по Y под действием гравитации
        
        // Определяем размер пули
        const bulletRadius = weaponConfig.largeBullets ? weaponConfig.bulletSize / 2 : 4;
        bullet.bulletRadius = bulletRadius; // Сохраняем для коллизий
        
        bullet.circle(0, 0, bulletRadius).fill(0xffff00);
        
        // Устанавливаем начальную позицию: у игрока или у курсора
        if (weaponConfig.spawnAtCursor) {
          bullet.position.set(mousePosition.x, mousePosition.y);
          bullet.startX = mousePosition.x; // Обновляем стартовую позицию для расчета дальности
          bullet.startY = mousePosition.y;
        } else {
          bullet.position.set(graphics.x, graphics.y);
        }
        
        bullets.push(bullet);
        app.stage.addChild(bullet);
      }
      
      // --- Расходуем патроны ---
      consumeAmmo(weaponConfig.bulletsPerShot);
      
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
        // Выбираем тип стрельбы
        if (weaponConfig.weaponType === 'raycast') {
          createRaycast();
        } else {
          createBullet();
        }
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
      // --- Логика перезарядки ---
      if (isReloading) {
        const currentTime = Date.now();
        const reloadDuration = weaponConfig.reloadTime * 1000; // Конвертируем в миллисекунды
        
        if (currentTime - reloadStartTime >= reloadDuration) {
          // Перезарядка завершена
          isReloading = false;
          currentAmmo = weaponConfig.maxAmmo;
        }
      }
      
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
        // Выбираем тип стрельбы для автоматического режима
        if (weaponConfig.weaponType === 'raycast') {
          createRaycast();
        } else {
          createBullet();
        }
      }

      // --- Логика снарядов и их коллизий ---
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        const oldX = b.x;
        const oldY = b.y;
        
        // --- Логика самонаведения ---
        if (weaponConfig.homingEnabled) {
          // Обновляем таймер самонаведения
          b.homingTimer += ticker.elapsedMS;
          
          // Активируем самонаведение после задержки
          if (!b.homingActive && b.homingTimer >= weaponConfig.homingDelay) {
            b.homingActive = true;
          }
          
          // Применяем самонаведение если оно активно
          if (b.homingActive) {
            // Вычисляем направление к курсору
            const toTargetX = mousePosition.x - b.x;
            const toTargetY = mousePosition.y - b.y;
            const distanceToTarget = Math.sqrt(toTargetX * toTargetX + toTargetY * toTargetY);
            
            if (distanceToTarget > 10) { // Избегаем дрожания когда пуля очень близко к курсору
              // Нормализуем вектор к цели
              const targetDirectionX = toTargetX / distanceToTarget;
              const targetDirectionY = toTargetY / distanceToTarget;
              
              // Текущая скорость пули
              const currentSpeed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
              
              // Нормализуем текущее направление
              const currentDirectionX = b.vx / currentSpeed;
              const currentDirectionY = b.vy / currentSpeed;
              
              // Вычисляем максимальный поворот за кадр (в радианах)
              const maxTurnRadians = (weaponConfig.maxTurnRate * Math.PI / 180) * ticker.deltaTime;
              
              // Вычисляем угол между текущим направлением и целью
              const cross = currentDirectionX * targetDirectionY - currentDirectionY * targetDirectionX;
              const dot = currentDirectionX * targetDirectionX + currentDirectionY * targetDirectionY;
              const angleToTarget = Math.atan2(cross, dot);
              
              // Ограничиваем поворот максимальным углом
              const turnAngle = Math.max(-maxTurnRadians, Math.min(maxTurnRadians, angleToTarget));
              
              // Применяем поворот с учетом силы самонаведения
              const actualTurnAngle = turnAngle * weaponConfig.homingStrength;
              
              // Поворачиваем направление пули
              const cos = Math.cos(actualTurnAngle);
              const sin = Math.sin(actualTurnAngle);
              
              const newDirectionX = currentDirectionX * cos - currentDirectionY * sin;
              const newDirectionY = currentDirectionX * sin + currentDirectionY * cos;
              
              // Обновляем скорость пули с новым направлением
              b.vx = newDirectionX * currentSpeed;
              b.vy = newDirectionY * currentSpeed;
            }
          }
        }
        
        // --- Логика гравитации ---
        if (weaponConfig.gravityEnabled) {
          // Обновляем таймер гравитации
          b.gravityTimer += ticker.elapsedMS;
          
          // Активируем гравитацию после задержки
          if (!b.gravityActive && b.gravityTimer >= weaponConfig.gravityDelay) {
            b.gravityActive = true;
          }
          
          // Применяем гравитацию если она активна
          if (b.gravityActive) {
            // Вычисляем направление гравитации
            const gravityAngleRad = (weaponConfig.gravityDirection * Math.PI) / 180;
            const gravityDirX = Math.cos(gravityAngleRad);
            const gravityDirY = Math.sin(gravityAngleRad);
            
            // Увеличиваем скорость под действием гравитации
            b.gravityVelocityX += gravityDirX * weaponConfig.gravityStrength * ticker.deltaTime;
            b.gravityVelocityY += gravityDirY * weaponConfig.gravityStrength * ticker.deltaTime;
            
            // Ограничиваем максимальную скорость падения
            const gravitySpeed = Math.sqrt(b.gravityVelocityX * b.gravityVelocityX + b.gravityVelocityY * b.gravityVelocityY);
            if (gravitySpeed > weaponConfig.maxFallSpeed) {
              const factor = weaponConfig.maxFallSpeed / gravitySpeed;
              b.gravityVelocityX *= factor;
              b.gravityVelocityY *= factor;
            }
            
            // Применяем гравитацию к скорости пули
            b.vx += b.gravityVelocityX * ticker.deltaTime;
            b.vy += b.gravityVelocityY * ticker.deltaTime;
          }
        }
        
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
        
        // Проверяем дальность полета (используем индивидуальную дальность пули)
        if (b.distanceTraveled > b.maxRange) {
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
