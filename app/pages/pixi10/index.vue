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
          max="20" 
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
          min="10" 
          max="1000" 
          step="5" 
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
          max="359" 
          step="1" 
          v-model="weaponSettings.fanAngle"
          @input="updateWeaponConfig"
        />
        <span>{{ weaponSettings.fanAngle }}°</span>
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

      <div class="setting-group">
        <label>
          <input 
            type="checkbox" 
            v-model="weaponSettings.allowOffScreen"
            @change="updateWeaponConfig"
          />
          🌌 Улетают за экран
        </label>
      </div>

      <div class="setting-group" v-if="weaponSettings.allowOffScreen">
        <label>
          <input 
            type="checkbox" 
            v-model="weaponSettings.infiniteOffScreen"
            @change="updateWeaponConfig"
          />
          ∞ Бесконечно за экраном
        </label>
      </div>

      <div class="setting-group" v-if="weaponSettings.allowOffScreen && !weaponSettings.infiniteOffScreen">
        <label>Лимит за экраном (px):</label>
        <input 
          type="range" 
          min="100" 
          max="2000" 
          step="100" 
          v-model="weaponSettings.offScreenLimit"
          @input="updateWeaponConfig"
        />
        <span>{{ weaponSettings.offScreenLimit }}px</span>
      </div>

      <div class="setting-group" v-if="weaponSettings.largeBullets && weaponSettings.weaponType === 'projectile'">
        <label>Размер снаряда:</label>
        <input 
          type="range" 
          min="1" 
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



      <!-- <div class="presets">
        <h4>Пресеты:</h4>
        <button @click="loadPreset('assault')">Автомат</button>
        <button @click="loadPreset('sniper')">Снайперка</button>
        <button @click="loadPreset('shotgun')">Дробовик</button>
        <button @click="loadPreset('laser')">🔴 Лазер</button>
        <button @click="loadPreset('sniper_ray')">💥 Снайпер</button>
        <button @click="loadPreset('homing_magic')">🎯 Магия</button>
        <button @click="loadPreset('gravity_cannon')">🌪️ Гравипушка</button>
      </div> -->
    </div>
    
    <!-- Панель событий и эффектов -->
    <div class="events-panel">
      <h3>🎪 События и эффекты</h3>
      
      <!-- События снарядов -->
      <div class="events-section">
        <div class="event-category" v-for="(eventEffects, eventName) in weaponSettings.events" :key="eventName" v-show="!(eventName === 'onFlight' && weaponSettings.weaponType === 'raycast')">
          <h4>{{ getEventDisplayName(eventName) }}</h4>
          
          <!-- Список эффектов для события -->
          <div class="effects-list">
            <div class="effect-item" v-for="(effect, index) in eventEffects" :key="index">
              <div class="effect-info">
                <span class="effect-name">{{ getEffectDisplayName(effect.name) }}</span>
                <div class="effect-params">
                  <!-- Параметры для события полета -->
                  <div v-if="eventName === 'onFlight'">
                    <!-- Выбор типа срабатывания -->
                    <div class="param-editor">
                      <label>🎛️ Тип:</label>
                      <select 
                        :value="effect.triggerType || 'time'"
                        @change="updateEffectParam(eventName, index, 'triggerType', $event.target.value)"
                        class="param-select"
                      >
                        <option value="time">⏱️ Время</option>
                        <option value="distance">📏 Расстояние</option>
                      </select>
                    </div>
                    
                    <!-- Параметр времени -->
                    <div v-if="(effect.triggerType || 'time') === 'time'" class="param-editor">
                      <label>⏱️ Частота:</label>
                      <input 
                        type="number" 
                        :value="effect.frequency || 500"
                        @input="updateEffectParam(eventName, index, 'frequency', $event.target.value)"
                        min="50" 
                        max="2000" 
                        step="50"
                        class="param-input"
                      />
                      <span class="param-unit">мс</span>
                    </div>
                    
                    <!-- Параметр расстояния -->
                    <div v-if="(effect.triggerType || 'time') === 'distance'" class="param-editor">
                      <label>📏 Дистанция:</label>
                      <input 
                        type="number" 
                        :value="effect.distance || 50"
                        @input="updateEffectParam(eventName, index, 'distance', $event.target.value)"
                        min="10" 
                        max="200" 
                        step="10"
                        class="param-input"
                      />
                      <span class="param-unit">px</span>
                    </div>
                  </div>
                  
                  <!-- Шанс (для всех событий) -->
                  <div class="param-editor">
                    <label>🎲 Шанс:</label>
                    <input 
                      type="number" 
                      :value="effect.chance || 100"
                      @input="updateEffectParam(eventName, index, 'chance', $event.target.value)"
                      min="1" 
                      max="100" 
                      step="1"
                      class="param-input"
                    />
                    <span class="param-unit">%</span>
                  </div>
                </div>
              </div>
              <button class="remove-effect-btn" @click="removeEffect(eventName, index)">✖</button>
            </div>
            
            <!-- Кнопка добавления эффекта -->
            <button class="add-effect-btn" @click="openEffectModal(eventName)">
              ➕ Добавить эффект
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Модальное окно выбора эффекта -->
    <div class="modal-overlay" v-if="showEffectModal" @click="closeEffectModal">
      <div class="modal-content" @click.stop>
        <h3>Выберите эффект</h3>
        
        <div class="available-effects">
          <div class="effect-option" v-for="effect in availableEffects" :key="effect.id" @click="selectEffect(effect)">
            <div class="effect-icon">{{ effect.icon }}</div>
            <div class="effect-details">
              <h4>{{ effect.name }}</h4>
              <p>{{ effect.description }}</p>
            </div>
          </div>
        </div>
        
        <div class="modal-actions">
          <button @click="closeEffectModal">Отмена</button>
        </div>
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

/* События и эффекты */
.events-panel {
  width: 350px;
  padding: 20px;
  background: #f0f8ff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  overflow-y: auto;
}

.events-panel h3 {
  margin-top: 0;
  color: #333;
  text-align: center;
}

.event-category {
  margin-bottom: 25px;
  padding: 15px;
  background: white;
  border-radius: 6px;
  border-left: 4px solid #007acc;
}

.event-category h4 {
  margin: 0 0 10px 0;
  color: #007acc;
  font-size: 16px;
}

.effects-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.effect-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #e9ecef;
  min-height: 80px;
}

.effect-info {
  flex: 1;
}

.effect-name {
  font-weight: bold;
  color: #495057;
}

.effect-params {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.param-editor {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f8f9fa;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.param-editor label {
  font-size: 12px;
  color: #495057;
  font-weight: bold;
  min-width: 50px;
}

.param-input {
  width: 60px;
  padding: 2px 4px;
  border: 1px solid #ced4da;
  border-radius: 3px;
  font-size: 12px;
  text-align: center;
}

.param-input:focus {
  outline: none;
  border-color: #007acc;
  box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.2);
}

.param-select {
  width: 90px;
  padding: 2px 4px;
  border: 1px solid #ced4da;
  border-radius: 3px;
  font-size: 12px;
  background: white;
}

.param-select:focus {
  outline: none;
  border-color: #007acc;
  box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.2);
}

.param-unit {
  font-size: 12px;
  color: #6c757d;
  font-weight: bold;
}

.remove-effect-btn {
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  font-size: 12px;
}

.remove-effect-btn:hover {
  background: #c82333;
}

.add-effect-btn {
  padding: 8px 12px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.add-effect-btn:hover {
  background: #218838;
}

/* Модальное окно */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-content h3 {
  margin-top: 0;
  color: #333;
  text-align: center;
}

.available-effects {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 20px 0;
}

.effect-option {
  display: flex;
  align-items: center;
  padding: 12px;
  border: 2px solid #e9ecef;
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.effect-option:hover {
  border-color: #007acc;
  background: #f8f9fa;
}

.effect-icon {
  font-size: 24px;
  margin-right: 12px;
  width: 32px;
  text-align: center;
}

.effect-details h4 {
  margin: 0 0 4px 0;
  color: #333;
}

.effect-details p {
  margin: 0;
  color: #6c757d;
  font-size: 14px;
}

.modal-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 20px;
}

.modal-actions button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.modal-actions button:first-child {
  background: #6c757d;
  color: white;
}

.modal-actions button:first-child:hover {
  background: #5a6268;
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
  ricochetWalls: false,     // Рикошет от стен (границ экрана)
  ricochetEnemies: false,   // Рикошет от врагов (когда пробитие кончилось)
  maxRicochets: 3,          // Максимальное количество рикошетов
  recoil: 2.0,              // Сила отдачи оружия (0 = нет отдачи, 10 = максимальная)
  bulletDamage: 1,          // Урон от прямого попадания пули
  homingEnabled: false,     // Включить самонаведение пуль
  homingStrength: 0.1,      // Сила притяжения к курсору (0-1)
  maxTurnRate: 3.0,         // Максимальная скорость поворота в градусах за кадр
  homingDelay: 300,         // Задержка перед началом самонаведения в миллисекундах
  spawnAtCursor: false,     // Появление снарядов у курсора вместо игрока
  largeBullets: false,      // Большие снаряды с увеличенным радиусом
  bulletSize: 8,            // Размер больших снарядов в пикселях
  allowOffScreen: false,    // Снаряды могут улетать за пределы экрана
  infiniteOffScreen: false, // Снаряды летят бесконечно за экраном
  offScreenLimit: 500,      // Лимит расстояния за экраном в пикселях
  useAmmoSystem: false,     // Использовать систему обоймы
  maxAmmo: 30,              // Максимальное количество патронов в обойме
  reloadTime: 2.0,          // Время перезарядки в секундах
  ammoPerShot: true,        // Расход патронов за выстрел (иначе за каждый снаряд)
  gravityEnabled: false,    // Включить гравитацию для пуль
  gravityStrength: 0.05,    // Сила гравитации (ускорение в пикселях за кадр в квадрате)
  gravityDelay: 200,        // Задержка активации гравитации (мс)
  maxFallSpeed: 15,         // Максимальная скорость падения
  gravityDirection: 90,     // Направление гравитации в градусах (90 = вниз)
  autoFire: true,
  // Система событий и эффектов
  events: {
    onFlight: [],           // Эффекты во время полета
    onHitEnemy: [],         // Эффекты при попадании во врага
    onRicochet: [],         // Эффекты при рикошете
    onExpire: [],           // Эффекты при исчезновении
    onScreenEdge: []        // Эффекты при касании края экрана
  }
});

// Переменная для хранения ссылки на weaponConfig из игрового цикла
let gameWeaponConfig = null;

// Состояние модального окна
const showEffectModal = ref(false);
const selectedEventName = ref('');

// Доступные эффекты
const availableEffects = ref([
  {
    id: 'explosion',
    name: 'Взрыв',
    icon: '💥',
    description: 'Создает взрыв с настраиваемым радиусом и уроном'
  }
]);

// Функции для отображения названий
const getEventDisplayName = (eventName) => {
  const names = {
    onFlight: '🚀 При полете',
    onHitEnemy: '💥 При попадании',
    onRicochet: '🔄 При рикошете', 
    onExpire: '⏰ При исчезновении',
    onScreenEdge: '🌌 На краю экрана'
  };
  return names[eventName] || eventName;
};

const getEffectDisplayName = (effectName) => {
  const names = {
    explosion: '💥 Взрыв'
  };
  return names[effectName] || effectName;
};

// Функции управления эффектами
const openEffectModal = (eventName) => {
  selectedEventName.value = eventName;
  showEffectModal.value = true;
};

const closeEffectModal = () => {
  showEffectModal.value = false;
  selectedEventName.value = '';
};

const selectEffect = (effect) => {
  // Создаем новый эффект с параметрами по умолчанию
  const newEffect = {
    name: effect.id,
    chance: 100
  };
  
  // Добавляем специфичные параметры для события полета
  if (selectedEventName.value === 'onFlight') {
    newEffect.triggerType = 'time'; // По умолчанию время
    newEffect.frequency = 500; // Частота по времени
    newEffect.distance = 50; // Дистанция (если переключат на расстояние)
  }
  
  // Добавляем эффект к выбранному событию
  weaponSettings.events[selectedEventName.value].push(newEffect);
  updateWeaponConfig();
  closeEffectModal();
};

const removeEffect = (eventName, effectIndex) => {
  weaponSettings.events[eventName].splice(effectIndex, 1);
  updateWeaponConfig();
};

const updateEffectParam = (eventName, effectIndex, paramName, value) => {
  // Для строковых параметров (triggerType)
  if (paramName === 'triggerType') {
    weaponSettings.events[eventName][effectIndex][paramName] = value;
    updateWeaponConfig();
    return;
  }
  
  const numValue = Number(value);
  
  // Валидация значений
  if (paramName === 'chance') {
    if (numValue < 1 || numValue > 100) return;
  } else if (paramName === 'frequency') {
    if (numValue < 50 || numValue > 2000) return;
  } else if (paramName === 'distance') {
    if (numValue < 10 || numValue > 200) return;
  }
  
  // Обновляем параметр эффекта
  weaponSettings.events[eventName][effectIndex][paramName] = numValue;
  updateWeaponConfig();
};

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
    gameWeaponConfig.ricochetWalls = weaponSettings.ricochetWalls;
    gameWeaponConfig.ricochetEnemies = weaponSettings.ricochetEnemies;
    gameWeaponConfig.maxRicochets = Number(weaponSettings.maxRicochets);
    gameWeaponConfig.recoil = Number(weaponSettings.recoil);
    gameWeaponConfig.bulletDamage = Number(weaponSettings.bulletDamage);
    gameWeaponConfig.homingEnabled = weaponSettings.homingEnabled;
    gameWeaponConfig.homingStrength = Number(weaponSettings.homingStrength);
    gameWeaponConfig.maxTurnRate = Number(weaponSettings.maxTurnRate);
    gameWeaponConfig.homingDelay = Number(weaponSettings.homingDelay);
    gameWeaponConfig.spawnAtCursor = weaponSettings.spawnAtCursor;
    gameWeaponConfig.largeBullets = weaponSettings.largeBullets;
    gameWeaponConfig.bulletSize = Number(weaponSettings.bulletSize);
    gameWeaponConfig.allowOffScreen = weaponSettings.allowOffScreen;
    gameWeaponConfig.infiniteOffScreen = weaponSettings.infiniteOffScreen;
    gameWeaponConfig.offScreenLimit = Number(weaponSettings.offScreenLimit);
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
    gameWeaponConfig.events = weaponSettings.events;
  }
};

// Функция для загрузки пресетов
const loadPreset = (presetName) => {
  const presets = {

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
      ricochetWalls: weaponSettings.ricochetWalls,
      ricochetEnemies: weaponSettings.ricochetEnemies,
      maxRicochets: weaponSettings.maxRicochets,
      recoil: weaponSettings.recoil,
      bulletDamage: weaponSettings.bulletDamage,
      homingEnabled: weaponSettings.homingEnabled,
      homingStrength: weaponSettings.homingStrength,
      maxTurnRate: weaponSettings.maxTurnRate,
      homingDelay: weaponSettings.homingDelay,
      spawnAtCursor: weaponSettings.spawnAtCursor,
      largeBullets: weaponSettings.largeBullets,
      bulletSize: weaponSettings.bulletSize,
      allowOffScreen: weaponSettings.allowOffScreen,
      infiniteOffScreen: weaponSettings.infiniteOffScreen,
      offScreenLimit: weaponSettings.offScreenLimit,
      useAmmoSystem: weaponSettings.useAmmoSystem,
      maxAmmo: weaponSettings.maxAmmo,
      reloadTime: weaponSettings.reloadTime,
      ammoPerShot: weaponSettings.ammoPerShot,
      gravityEnabled: weaponSettings.gravityEnabled,
      gravityStrength: weaponSettings.gravityStrength,
      gravityDelay: weaponSettings.gravityDelay,
      maxFallSpeed: weaponSettings.maxFallSpeed,
      gravityDirection: weaponSettings.gravityDirection,
      autoFire: weaponSettings.autoFire,
      events: weaponSettings.events
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

    // --- Система событий для снарядов ---
    function triggerBulletEvent(bullet, eventName, ticker, extraData = {}) {
      const eventEffects = weaponConfig.events[eventName] || [];
      
      eventEffects.forEach(effect => {
        // Проверяем частоту/дистанцию (только для onFlight)
        if (eventName === 'onFlight') {
          const triggerType = effect.triggerType || 'time';
          
          if (triggerType === 'time' && effect.frequency) {
            // Проверка по времени
            if (!bullet.eventTimers) bullet.eventTimers = {};
            if (!bullet.eventTimers[effect.name]) bullet.eventTimers[effect.name] = 0;
            
            bullet.eventTimers[effect.name] += ticker.elapsedMS;
            if (bullet.eventTimers[effect.name] < effect.frequency) return;
            bullet.eventTimers[effect.name] = 0; // Сбрасываем таймер
            
          } else if (triggerType === 'distance' && effect.distance) {
            // Проверка по расстоянию
            if (!bullet.eventDistances) bullet.eventDistances = {};
            if (!bullet.eventDistances[effect.name]) bullet.eventDistances[effect.name] = 0;
            
            const currentDistance = bullet.distanceTraveled;
            const nextTriggerDistance = bullet.eventDistances[effect.name] + effect.distance;
            
            if (currentDistance < nextTriggerDistance) return;
            bullet.eventDistances[effect.name] = nextTriggerDistance; // Обновляем следующую цель
          }
        }
        
        // Проверяем шанс срабатывания
        const chance = effect.chance || 100;
        if (Math.random() * 100 > chance) return;
        
        // Применяем эффект
        applyEffect(bullet, effect.name, extraData);
      });
    }
    
    // --- Функция применения эффектов ---
    function applyEffect(bullet, effectName, extraData = {}) {
      switch (effectName) {
        case 'explosion':
          // Используем стандартные параметры взрыва для событий
          createEventExplosion(bullet.x, bullet.y, 50, 3); // radius: 50px, damage: 3
          break;
        // Здесь будут другие эффекты: freeze, lightning, etc.
      }
    }
    
    // --- Функция создания взрыва от событий ---
    function createEventExplosion(x, y, radius, damage) {
      // Создаем визуальный эффект взрыва
      const explosion = new PIXI.Graphics();
      explosion.circle(0, 0, radius).fill(0xff4444); // Красноватый цвет для эффекта
      explosion.alpha = 0.8;
      explosion.position.set(x, y);
      explosions.push(explosion);
      app.stage.addChild(explosion);
      
      // Проверяем коллизии взрыва с препятствиями
      for (const obstacle of obstacles) {
        if (obstacle.isAlive) {
          const dx = x - obstacle.x;
          const dy = y - obstacle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const obstacleRadius = 20;
          
          if (distance <= radius + obstacleRadius) {
            dealDamage(obstacle, damage);
          }
        }
      }
      
      // Эффект исчезновения взрыва
      const fadeOut = () => {
        explosion.alpha -= 0.08;
        explosion.scale.x += 0.03;
        explosion.scale.y += 0.03;
        
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
    function performRaycast(startX, startY, angle, maxRange, penetrationLeft, ricochetsLeft, hasTriggeredScreenEdge = false) {
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
        
        // Проверяем касание края экрана для событий (ДО рикошета!)
        const isAtScreenEdge = currentX <= 0 || currentX >= app.screen.width || currentY <= 0 || currentY >= app.screen.height;
        if (isAtScreenEdge && !hasTriggeredScreenEdge) {
          // --- Событие: onScreenEdge (для raycast) ---
          const fakeRayBullet = { x: currentX, y: currentY };
          const fakeTicker = { elapsedMS: 0 };
          triggerBulletEvent(fakeRayBullet, 'onScreenEdge', fakeTicker);
          hasTriggeredScreenEdge = true; // Предотвращаем повторные срабатывания
        }
        
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
            // --- Событие: onRicochet (для raycast от стен) ---
            const fakeRayBullet = { x: currentX, y: currentY };
            const fakeTicker = { elapsedMS: 0 };
            triggerBulletEvent(fakeRayBullet, 'onRicochet', fakeTicker);
            
            // Создаем визуальный эффект до точки рикошета
            if (weaponConfig.raycastAnimation === 'laser') {
              createRayVisual(startX, startY, currentX, currentY);
            } else if (weaponConfig.raycastAnimation === 'impact') {
              createImpactPoint(currentX, currentY, 'ricochet');
            }
            
            // Продолжаем луч после рикошета
            ricochetsLeft--;
            return performRaycast(currentX, currentY, newAngle, maxRange - travelDistance, penetrationLeft, ricochetsLeft, hasTriggeredScreenEdge);
          }
        }
        
        // Проверяем выход за границы экрана (если рикошеты кончились)
        if (!weaponConfig.allowOffScreen) {
          // Если НЕ разрешено улетать за экран - останавливаем луч на границе
          if (currentX < 0 || currentX > app.screen.width || currentY < 0 || currentY > app.screen.height) {
            break;
          }
        } else if (!weaponConfig.infiniteOffScreen) {
          // Если разрешено, но НЕ бесконечно - используем лимит
          const limit = weaponConfig.offScreenLimit;
          if (currentX < -limit || currentX > app.screen.width + limit || 
              currentY < -limit || currentY > app.screen.height + limit) {
            break;
          }
        }
        // Если infiniteOffScreen = true, то луч никогда не останавливается по границам
        // Он останавливается только по maxRange или при попадании
        
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
              
              // --- Событие: onHitEnemy (для raycast) ---
              const fakeRayBullet = { x: currentX, y: currentY };
              // Для raycast нет ticker, создаем фейковый
              const fakeTicker = { elapsedMS: 0 };
              triggerBulletEvent(fakeRayBullet, 'onHitEnemy', fakeTicker, { target: obstacle });
              
              // Создаем эффект попадания во врага
              if (weaponConfig.raycastAnimation === 'impact') {
                createImpactPoint(currentX, currentY, 'hit');
              }
              
              penetrationLeft--;
              
              // Если пробитие закончилось, проверяем рикошет от врагов
              if (penetrationLeft <= 0 && weaponConfig.ricochetEnemies && ricochetsLeft > 0) {
                // --- Событие: onRicochet (для raycast от врагов) ---
                const fakeRayBullet = { x: currentX, y: currentY };
                const fakeTicker = { elapsedMS: 0 };
                triggerBulletEvent(fakeRayBullet, 'onRicochet', fakeTicker, { target: obstacle });
                
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
                return performRaycast(currentX, currentY, randomAngle, maxRange - travelDistance, penetrationLeft, ricochetsLeft, hasTriggeredScreenEdge);
              }
              
              break; // Обрабатываем только одно попадание за шаг
            }
          }
        }
      }
      
      // --- Событие: onExpire (для raycast при окончании) ---
      const fakeRayBullet = { x: currentX, y: currentY };
      const fakeTicker = { elapsedMS: 0 };
      triggerBulletEvent(fakeRayBullet, 'onExpire', fakeTicker);
      
      // Создаем визуальный эффект для всего луча или точки окончания
      if (weaponConfig.raycastAnimation === 'laser') {
        createRayVisual(startX, startY, currentX, currentY);
      } else if (weaponConfig.raycastAnimation === 'impact') {
        createImpactPoint(currentX, currentY, 'end');
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
        
        // Флаг для событий
        bullet.hasTriggeredScreenEdge = false; // Для предотвращения повторных событий onScreenEdge
        bullet.eventTimers = {}; // Для частоты событий onFlight
        bullet.eventDistances = {}; // Для отслеживания пройденного расстояния для эффектов
        
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
        
        // --- Событие: onFlight (каждый кадр во время полета) ---
        triggerBulletEvent(b, 'onFlight', ticker);
        
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
        
        // Проверяем касание края экрана для событий (ДО рикошета!)
        const isAtScreenEdge = b.x <= 4 || b.x >= app.screen.width - 4 || b.y <= 4 || b.y >= app.screen.height - 4;
        if (isAtScreenEdge && !b.hasTriggeredScreenEdge) {
          triggerBulletEvent(b, 'onScreenEdge', ticker);
          b.hasTriggeredScreenEdge = true; // Предотвращаем повторные срабатывания
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
            // --- Событие: onRicochet (при рикошете от стен) ---
            triggerBulletEvent(b, 'onRicochet', ticker);
            
            b.ricochetsLeft--; // Уменьшаем количество рикошетов
          }
        }
        
        // Проверяем выход за границы экрана (если рикошеты кончились или отключены)
        if (!weaponConfig.allowOffScreen) {
          // Если снаряды НЕ могут улетать за экран - удаляем при выходе за границы
          if (b.x < -10 || b.x > app.screen.width + 10 || b.y < -10 || b.y > app.screen.height + 10) {
            shouldRemove = true;
          }
        } else if (!weaponConfig.infiniteOffScreen) {
          // Если снаряды могут улетать за экран, но НЕ бесконечно - используем настраиваемый лимит
          const limit = weaponConfig.offScreenLimit;
          if (b.x < -limit || b.x > app.screen.width + limit || 
              b.y < -limit || b.y > app.screen.height + limit) {
            shouldRemove = true;
          }
        }
        // Если infiniteOffScreen = true, то снаряды никогда не удаляются по границам экрана
        // Они удаляются только по времени жизни или дальности
        
        // Проверяем попадания в цели
        for (const obstacle of obstacles) {
          if (obstacle.isAlive && checkBulletObstacleCollision(b, obstacle)) {
            
            if (b.penetrationLeft > 0) {
              // Есть пробитие - наносим урон цели
              dealDamage(obstacle, b.damage);
              
              // --- Событие: onHitEnemy (при попадании во врага) ---
              triggerBulletEvent(b, 'onHitEnemy', ticker, { target: obstacle });
              
              b.penetrationLeft--; // Уменьшаем пробитие
              
              // Если пробитие закончилось, проверяем рикошет от врагов
              if (b.penetrationLeft <= 0) {
                if (weaponConfig.ricochetEnemies && b.ricochetsLeft > 0) {
                  // --- Событие: onRicochet (при рикошете от врагов) ---
                  triggerBulletEvent(b, 'onRicochet', ticker, { target: obstacle });
                  
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
          // --- Событие: onExpire (при исчезновении снаряда) ---
          triggerBulletEvent(b, 'onExpire', ticker);
          
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
