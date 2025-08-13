<template>
  <div class="game-container">
    <div class="canvas-section">
      <div ref="pixiContainer" class="game-canvas"></div>
      <button class="add-shooter-btn">
        🎯 Add Entity
      </button>
      <div class="instructions" style="display: none;">
        Нажмите кнопку, затем кликните на канвас где должна появиться сущность
      </div>
    </div>
    <div class="settings-panel">
      <h3>Настройки оружия</h3>

      <div class="setting-group">
        <label>Источник стрельбы:</label>
        <select v-model="weaponConfig.fireSource">
          <option value="player">Игрок (курсор)</option>
          <option value="object">Объект (автонаведение)</option>
        </select>
      </div>

      <div class="setting-group" v-if="weaponConfig.fireSource === 'object'">
        <label>Режим наведения объекта:</label>
        <select v-model="weaponConfig.objectFire.mode">
          <option value="nearest">Ближайшая цель</option>
          <option value="angle">Фиксированный угол</option>
        </select>
      </div>

      <div class="setting-group" v-if="weaponConfig.fireSource === 'object' && weaponConfig.objectFire.mode === 'angle'">
        <label>Угол (градусы):</label>
        <input type="range" min="0" max="359" step="1" v-model="weaponConfig.objectFire.angleDeg" />
        <span>{{ weaponConfig.objectFire.angleDeg }}°</span>
      </div>
      
      <div class="setting-group">
        <label>Тип стрельбы:</label>
        <select v-model="weaponConfig.weaponType">
          <option value="projectile">Пули (снаряды)</option>
          <option value="raycast">Векторная (лучевая)</option>
        </select>
      </div>

      <div class="setting-group">
        <label>
          <input 
            type="checkbox" 
            v-model="weaponConfig.autoReload"
          />
          Автоперезарядка при окончании патронов
        </label>
      </div>

      <div class="setting-group" v-if="weaponConfig.weaponType === 'raycast'">
        <label>Анимация векторной стрельбы:</label>
        <select v-model="weaponConfig.raycastAnimation">
          <option value="laser">🔴 Лазер (видимый луч)</option>
          <option value="impact">💥 Попадания (только точки)</option>
          <option value="invisible">👻 Невидимый (только эффекты попадания)</option>
        </select>
      </div>
      
      <div class="setting-group">
        <label>Скорость снаряда:</label>
        <input 
          type="range" 
          min="0.5" 
          max="20" 
          step="0.5" 
          v-model="weaponConfig.bulletSpeed"
          
          :disabled="weaponConfig.weaponType === 'raycast'"
        />
        <span :class="{ disabled: weaponConfig.weaponType === 'raycast' }">
          {{ weaponConfig.bulletSpeed }}
          <small v-if="weaponConfig.weaponType === 'raycast'">(не используется)</small>
        </span>
      </div>

      <div class="setting-group">
        <label>Пробитие:</label>
        <input 
          type="range" 
          min="1" 
          max="10" 
          step="1" 
          v-model="weaponConfig.penetration"
          
        />
        <span>{{ weaponConfig.penetration }}</span>
      </div>

      <div class="setting-group">
        <label>Количество снарядов:</label>
        <input 
          type="range" 
          min="1" 
          max="50" 
          step="1" 
          v-model="weaponConfig.bulletsPerShot"
          
        />
        <span>{{ weaponConfig.bulletsPerShot }}</span>
      </div>

      <div class="setting-group">
        <label>Дальность:</label>
        <input 
          type="range" 
          min="100" 
          max="5000" 
          step="50" 
          v-model="weaponConfig.maxRange"
          
        />
        <span>{{ weaponConfig.maxRange }}</span>
      </div>

      <div class="setting-group">
        <label>Время жизни снаряда (сек):</label>
        <input 
          type="range" 
          min="0.5" 
          max="20" 
          step="0.1" 
          v-model="weaponConfig.bulletLifetime"
          
          :disabled="weaponConfig.weaponType === 'raycast'"
        />
        <span :class="{ disabled: weaponConfig.weaponType === 'raycast' }">
          {{ Number(weaponConfig.bulletLifetime).toFixed(1) }}с
          <small v-if="weaponConfig.weaponType === 'raycast'">(не используется)</small>
        </span>
      </div>

      <div class="setting-group">
        <label>Скорострельность (мс):</label>
        <input 
          type="range" 
          min="10" 
          max="1000" 
          step="5" 
          v-model="weaponConfig.fireRate"
          
        />
        <span>{{ weaponConfig.fireRate }}</span>
      </div>

      <div class="setting-group">
        <label>Разброс (0-1):</label>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.05" 
          v-model="weaponConfig.spread"
          
        />
        <span>{{ Number(weaponConfig.spread).toFixed(2) }}</span>
      </div>

      <div class="setting-group">
        <label>Макс. угол разброса (градусы):</label>
        <input 
          type="range" 
          min="0" 
          max="45" 
          step="1" 
          v-model="weaponConfig.maxSpreadAngle"
          
        />
        <span>{{ weaponConfig.maxSpreadAngle }}°</span>
      </div>

      <div class="setting-group">
        <label>Разброс дальности (0-1):</label>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.05" 
          v-model="weaponConfig.rangeSpread"
          
        />
        <span>{{ Number(weaponConfig.rangeSpread).toFixed(2) }}</span>
      </div>

      <div class="setting-group">
        <label>Макс. потеря дальности (%):</label>
        <input 
          type="range" 
          min="0" 
          max="50" 
          step="5" 
          v-model="weaponConfig.maxRangeLoss"
          
        />
        <span>{{ weaponConfig.maxRangeLoss }}%</span>
      </div>

      <div class="setting-group">
        <label>
          <input 
            type="checkbox" 
            v-model="weaponConfig.autoFire"
            
          />
          Автоматическая стрельба
        </label>
      </div>

      <div class="setting-group">
        <label>
          <input 
            type="checkbox" 
            v-model="weaponConfig.fanSpread"
            
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
          v-model="weaponConfig.fanAngle"
          
        />
        <span>{{ weaponConfig.fanAngle }}°</span>
      </div>



      <div class="setting-group">
        <label>
          <input 
            type="checkbox" 
            v-model="weaponConfig.ricochetWalls"
            
          />
          Рикошет от стен
        </label>
      </div>

      <div class="setting-group">
        <label>
          <input 
            type="checkbox" 
            v-model="weaponConfig.ricochetEnemies"
            
          />
          Рикошет от врагов
        </label>
      </div>

      <div class="setting-group" v-if="weaponConfig.weaponType === 'projectile'">
        <label>
          <input 
            type="checkbox" 
            v-model="weaponConfig.homingEnabled"
            
          />
          🎯 Самонаводящиеся пули
        </label>
      </div>

      <div class="setting-group" v-if="weaponConfig.weaponType === 'projectile'">
        <label>
          <input 
            type="checkbox" 
            v-model="weaponConfig.spawnAtCursor"
            
          />
          ✨ Появление у курсора
        </label>
      </div>

      <div class="setting-group" v-if="weaponConfig.weaponType === 'projectile'">
        <label>
          <input 
            type="checkbox" 
            v-model="weaponConfig.largeBullets"
            
          />
          🟠 Большие снаряды
        </label>
      </div>

      <div class="setting-group">
        <label>
          <input 
            type="checkbox" 
            v-model="weaponConfig.allowOffScreen"
            
          />
          🌌 Улетают за экран
        </label>
      </div>

      <div class="setting-group" v-if="weaponConfig.allowOffScreen">
        <label>
          <input 
            type="checkbox" 
            v-model="weaponConfig.infiniteOffScreen"
            
          />
          ∞ Бесконечно за экраном
        </label>
      </div>

      <div class="setting-group" v-if="weaponConfig.allowOffScreen && !weaponConfig.infiniteOffScreen">
        <label>Лимит за экраном (px):</label>
        <input 
          type="range" 
          min="100" 
          max="2000" 
          step="100" 
          v-model="weaponConfig.offScreenLimit"
          
        />
        <span>{{ weaponConfig.offScreenLimit }}px</span>
      </div>

      <div class="setting-group" v-if="weaponConfig.largeBullets && weaponConfig.weaponType === 'projectile'">
        <label>Размер снаряда:</label>
        <input 
          type="range" 
          min="1" 
          max="50" 
          step="2" 
          v-model="weaponConfig.bulletSize"
          
        />
        <span>{{ weaponConfig.bulletSize }}px</span>
      </div>

      <div class="setting-group">
        <label>
          <input 
            type="checkbox" 
            v-model="weaponConfig.useAmmoSystem"
            
          />
          🔫 Система обоймы
        </label>
      </div>

      <div class="setting-group" v-if="weaponConfig.useAmmoSystem">
        <label>Размер обоймы:</label>
        <input 
          type="range" 
          min="5" 
          max="100" 
          step="5" 
          v-model="weaponConfig.maxAmmo"
          
        />
        <span>{{ weaponConfig.maxAmmo }}</span>
      </div>

      <div class="setting-group" v-if="weaponConfig.useAmmoSystem">
        <label>Время перезарядки (сек):</label>
        <input 
          type="range" 
          min="0.5" 
          max="5" 
          step="0.1" 
          v-model="weaponConfig.reloadTime"
          
        />
        <span>{{ Number(weaponConfig.reloadTime).toFixed(1) }}с</span>
      </div>

      <div class="setting-group" v-if="weaponConfig.useAmmoSystem">
        <label>
          <input 
            type="checkbox" 
            v-model="weaponConfig.ammoPerShot"
            
          />
          📊 Расход за выстрел (иначе за снаряд)
        </label>
      </div>

      <div class="setting-group" v-if="weaponConfig.weaponType === 'projectile'">
        <label>
          <input 
            type="checkbox" 
            v-model="weaponConfig.gravityEnabled"
            
          />
          🌍 Гравитация
        </label>
      </div>

      <div class="setting-group" v-if="weaponConfig.gravityEnabled && weaponConfig.weaponType === 'projectile'">
        <label>Сила гравитации:</label>
        <input 
          type="range" 
          min="0.01" 
          max="0.3" 
          step="0.01" 
          v-model="weaponConfig.gravityStrength"
          
        />
        <span>{{ Number(weaponConfig.gravityStrength).toFixed(2) }}</span>
      </div>

      <div class="setting-group" v-if="weaponConfig.gravityEnabled && weaponConfig.weaponType === 'projectile'">
        <label>Задержка гравитации (мс):</label>
        <input 
          type="range" 
          min="0" 
          max="1000" 
          step="50" 
          v-model="weaponConfig.gravityDelay"
          
        />
        <span>{{ weaponConfig.gravityDelay }}мс</span>
      </div>

      <div class="setting-group" v-if="weaponConfig.gravityEnabled && weaponConfig.weaponType === 'projectile'">
        <label>Макс. скорость падения:</label>
        <input 
          type="range" 
          min="5" 
          max="50" 
          step="1" 
          v-model="weaponConfig.maxFallSpeed"
          
        />
        <span>{{ weaponConfig.maxFallSpeed }}</span>
      </div>

      <div class="setting-group" v-if="weaponConfig.gravityEnabled && weaponConfig.weaponType === 'projectile'">
        <label>Направление гравитации (градусы):</label>
        <input 
          type="range" 
          min="0" 
          max="359" 
          step="1" 
          v-model="weaponConfig.gravityDirection"
          
        />
        <span>{{ weaponConfig.gravityDirection }}°</span>
      </div>

      <div class="setting-group" v-if="weaponConfig.homingEnabled && weaponConfig.weaponType === 'projectile'">
        <label>Скорость наведения (0-1):</label>
        <input 
          type="range" 
          min="0.01" 
          max="0.5" 
          step="0.01" 
          v-model="weaponConfig.homingStrength"
          
        />
        <span>{{ Number(weaponConfig.homingStrength).toFixed(2) }}</span>
      </div>

      <div class="setting-group" v-if="weaponConfig.homingEnabled && weaponConfig.weaponType === 'projectile'">
        <label>Макс. угол поворота (град/кадр):</label>
        <input 
          type="range" 
          min="0.5" 
          max="10" 
          step="0.5" 
          v-model="weaponConfig.maxTurnRate"
          
        />
        <span>{{ Number(weaponConfig.maxTurnRate).toFixed(1) }}°</span>
      </div>

      <div class="setting-group" v-if="weaponConfig.homingEnabled && weaponConfig.weaponType === 'projectile'">
        <label>Задержка наведения (мс):</label>
        <input 
          type="range" 
          min="0" 
          max="2000" 
          step="100" 
          v-model="weaponConfig.homingDelay"
          
        />
        <span>{{ weaponConfig.homingDelay }}мс</span>
      </div>

      <div class="setting-group">
        <label>Количество рикошетов:</label>
        <input 
          type="range" 
          min="1" 
          max="10" 
          step="1" 
          v-model="weaponConfig.maxRicochets"
          
        />
        <span>{{ weaponConfig.maxRicochets }}</span>
      </div>

      <div class="setting-group">
        <label>Отдача оружия:</label>
        <input 
          type="range" 
          min="0" 
          max="10" 
          step="0.5" 
          v-model="weaponConfig.recoil"
          
        />
        <span>{{ Number(weaponConfig.recoil).toFixed(1) }}</span>
      </div>

      <div class="setting-group">
        <label>Урон пули:</label>
        <input 
          type="range" 
          min="1" 
          max="10" 
          step="1" 
          v-model="weaponConfig.bulletDamage"
          
        />
        <span>{{ weaponConfig.bulletDamage }}</span>
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
        <div class="event-category" v-for="(eventEffects, eventName) in weaponConfig.events" :key="eventName" v-show="!(eventName === 'onFlight' && weaponConfig.weaponType === 'raycast')">
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
    
    <!-- Панель настроек Canvas и Движка -->
    <div class="canvas-panel">
      <!-- Верхняя часть: Canvas настройки -->
      <div class="canvas-section">
        <h3>🎨 Canvas настройки</h3>
        
        <div class="canvas-settings">
        <div class="setting-group">
          <label>Ширина:</label>
          <input 
            type="number" 
            v-model="canvasSettings.width"
            min="400" 
            max="1920" 
            step="50"
            class="canvas-input"
          />
          <span>px</span>
        </div>

        <div class="setting-group">
          <label>Высота:</label>
          <input 
            type="number" 
            v-model="canvasSettings.height"
            min="300" 
            max="1080" 
            step="50"
            class="canvas-input"
          />
          <span>px</span>
        </div>

        <div class="setting-group">
          <label>Фон:</label>
          <input 
            type="color" 
            v-model="canvasSettings.background"
            class="canvas-color-input"
          />
          <input 
            type="text" 
            v-model="canvasSettings.background"
            placeholder="#111111"
            class="canvas-text-input"
          />
        </div>

        <div class="setting-group">
          <label>
            <input 
              type="checkbox" 
              v-model="canvasSettings.showFPS"
            />
            📊 Показать FPS
          </label>
        </div>

        <div class="canvas-actions">
          <button class="save-canvas-btn" @click="applyCanvasSettings">
            💾 Применить настройки
          </button>
          <div class="canvas-info">
            <small>Текущий размер: {{ currentCanvasSize.width }}×{{ currentCanvasSize.height }}</small>
          </div>
        </div>
      </div>
      </div> <!-- Закрываем canvas-section -->
      
      <!-- Нижняя часть: Engine настройки -->
      <div class="engine-section">
        <h3>⚙️ Настройки движка</h3>
        
        <div class="engine-settings">
          <div class="setting-group">
            <label>
              <input 
                type="checkbox" 
                v-model="engineSettings.spatialGrid.enabled"
              />
              🚀 Spatial Grid оптимизация
            </label>
            <div class="setting-description">
              <small>Ускоряет коллизии при большом количестве объектов</small>
            </div>
          </div>

          <div class="setting-group" v-if="engineSettings.spatialGrid.enabled">
            <label>Размер сектора:</label>
            <select v-model="engineSettings.spatialGrid.sectorSize" class="engine-select">
              <option :value="25">25px (очень точно)</option>
              <option :value="50">50px (балансировано)</option>
              <option :value="100">100px (быстро)</option>
              <option :value="200">200px (очень быстро)</option>
            </select>
            <div class="setting-description">
              <small>Меньше = точнее, больше = быстрее</small>
            </div>
          </div>
        </div>
      </div>
    </div> <!-- Закрываем canvas-panel -->
    
    <!-- Панель настроек World (мира) -->
    <div class="world-panel">
      <h3>🌍 World настройки</h3>
      
      <div class="world-settings">
        <div class="setting-group">
          <label>Тип мира:</label>
          <select v-model="worldSettings.type" class="world-select">
            <option value="default">🏠 Default (размер canvas)</option>
            <option value="solid">🧱 Solid (фиксированный размер)</option>
            <option value="infinite">♾️ Infinite (бесконечный)</option>
          </select>
        </div>

        <div class="setting-group" v-if="worldSettings.type === 'solid'">
          <label>Ширина мира:</label>
          <input 
            type="number" 
            v-model="worldSettings.width"
            min="800" 
            max="3000" 
            step="100"
            class="world-input"
          />
          <span>px</span>
        </div>

        <div class="setting-group" v-if="worldSettings.type === 'solid'">
          <label>Высота мира:</label>
          <input 
            type="number" 
            v-model="worldSettings.height"
            min="600" 
            max="2000" 
            step="100"
            class="world-input"
          />
          <span>px</span>
        </div>

        <div class="setting-group">
          <label>
            <input 
              type="checkbox" 
              v-model="worldSettings.gravity.enabled"
            />
            🌍 Гравитация мира
          </label>
        </div>

        <div class="setting-group" v-if="worldSettings.gravity.enabled">
          <label>Сила гравитации:</label>
          <input 
            type="range" 
            min="0.01" 
            max="0.3" 
            step="0.01" 
            v-model="worldSettings.gravity.strength"
            class="world-range"
          />
          <span>{{ Number(worldSettings.gravity.strength).toFixed(2) }}</span>
        </div>

        <div class="world-actions">
          <button class="save-world-btn" @click="applyWorldSettings">
            🌍 Применить настройки
          </button>
          <div class="world-info">
            <small v-if="worldSettings.type === 'default'">
              Мир = размер canvas ({{ canvasSettings.width }}×{{ canvasSettings.height }})
            </small>
            <small v-else-if="worldSettings.type === 'solid'">
              Мир: {{ worldSettings.width }}×{{ worldSettings.height }}
            </small>
            <small v-else-if="worldSettings.type === 'infinite'">
              Бесконечный мир ♾️
            </small>
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

    <!-- 🏗️ ENTITY MODAL: Модальное окно создания сущности -->
    <div v-if="showEntityModal" class="modal-overlay">
      <div class="modal-content entity-modal">
        <h3>🏗️ Создать Entity</h3>
        
        <div class="entity-form">
          <!-- Тип сущности -->
          <div class="form-group">
            <label>Тип сущности:</label>
            <select v-model="entityForm.type">
              <option value="unit">🧙 Unit (юнит)</option>
              <option value="structure">🏗️ Structure (строение)</option>
            </select>
          </div>

          <!-- Фракция -->
          <div class="form-group">
            <label>Фракция:</label>
            <select v-model="entityForm.faction">
              <option value="player">🟢 Player (игрок)</option>
              <option value="enemy">🔴 Enemy (враг)</option>
              <option value="neutral">🟡 Neutral (нейтрал)</option>
            </select>
          </div>

          <!-- Визуал -->
          <div class="form-group">
            <label>Визуал:</label>
            <select v-model="entityForm.visual">
              <option value="triangle">🔺 Triangle (треугольник)</option>
              <option value="square">🟩 Square (квадрат)</option>
              <option value="circle">🟡 Circle (круг)</option>
            </select>
          </div>

          <!-- Характеристики -->
          <div class="characteristics-group">
            <h4>⚔️ Характеристики</h4>
            
            <div class="form-row">
              <div class="form-group">
                <label>HP:</label>
                <input type="number" v-model="entityForm.characteristics.hp" min="1" max="10000" />
              </div>
              <div class="form-group">
                <label>Max HP:</label>
                <input type="number" v-model="entityForm.characteristics.maxHp" min="1" max="10000" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Скорость:</label>
                <input type="number" v-model="entityForm.characteristics.speed" min="0" max="20" step="0.5" />
              </div>
              <div class="form-group">
                <label>Броня:</label>
                <input type="number" v-model="entityForm.characteristics.armor" min="0" max="100" />
              </div>
            </div>

            <div class="form-checkboxes">
              <label>
                <input type="checkbox" v-model="entityForm.characteristics.canMove" />
                Может двигаться
              </label>
              <label>
                <input type="checkbox" v-model="entityForm.characteristics.canTakeDamage" />
                Может получать урон
              </label>
            </div>
          </div>

          <!-- Контроллер движения -->
          <div class="form-group">
            <label>Управление:</label>
            <select v-model="entityForm.movementController">
              <option value="">Нет управления</option>
              <option value="wasd">WASD клавиши</option>
              <option value="arrows">Стрелки</option>
              <option value="ai">AI (автоматическое)</option>
            </select>
          </div>
        </div>

        <!-- Кнопки -->
        <div class="modal-buttons">
          <button class="btn-primary">✅ Создать</button>
          <button>❌ Отмена</button>
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

.canvas-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.game-canvas {
  flex-shrink: 0;
  border: 2px solid #ddd;
  border-radius: 4px;
}

.add-shooter-btn {
  padding: 12px 24px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.add-shooter-btn:hover {
  background: #218838;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.add-shooter-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.add-shooter-btn.waiting {
  background: #ffc107;
  color: #212529;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.instructions {
  padding: 8px 16px;
  background: #e7f3ff;
  border: 1px solid #bee5eb;
  border-radius: 4px;
  color: #0c5460;
  font-size: 14px;
  text-align: center;
  max-width: 300px;
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

/* Canvas настройки панель */
.canvas-panel {
  width: 280px;
  padding: 20px;
  background: #f0f8ff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  overflow-y: auto;
}

.canvas-panel h3 {
  margin-top: 0;
  color: #333;
  text-align: center;
}

.canvas-settings {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.canvas-input {
  width: 80px;
  padding: 6px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
  text-align: center;
}

.canvas-input:focus {
  outline: none;
  border-color: #007acc;
  box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.2);
}

.canvas-color-input {
  width: 50px;
  height: 35px;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 8px;
}

.canvas-text-input {
  width: 100px;
  padding: 6px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
  font-family: monospace;
}

.canvas-text-input:focus {
  outline: none;
  border-color: #007acc;
  box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.2);
}

.canvas-actions {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #e0e0e0;
}

.save-canvas-btn {
  width: 100%;
  padding: 12px 16px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.save-canvas-btn:hover {
  background: #218838;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.save-canvas-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.canvas-info {
  margin-top: 10px;
  text-align: center;
}

.canvas-info small {
  color: #666;
  font-size: 12px;
}

/* Canvas и Engine секции */
.canvas-section {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #e0e0e0;
}

.engine-section {
  margin-top: 20px;
}

.engine-section h3 {
  color: #333;
  text-align: center;
  margin-bottom: 15px;
}

.engine-settings {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.engine-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  cursor: pointer;
}

.engine-select:focus {
  outline: none;
  border-color: #007acc;
  box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.2);
}

.setting-description {
  margin-top: 5px;
}

.setting-description small {
  color: #666;
  font-size: 12px;
  font-style: italic;
}

/* World настройки панель */
.world-panel {
  width: 280px;
  padding: 20px;
  background: #f0f8ff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  overflow-y: auto;
}

.world-panel h3 {
  margin-top: 0;
  color: #333;
  text-align: center;
}

.world-settings {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.world-select {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
  background: white;
}

.world-select:focus {
  outline: none;
  border-color: #007acc;
  box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.2);
}

.world-input {
  width: 80px;
  padding: 6px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
  text-align: center;
}

.world-input:focus {
  outline: none;
  border-color: #007acc;
  box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.2);
}

.world-range {
  width: 150px;
  margin-right: 10px;
}

.world-actions {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #e0e0e0;
}

.save-world-btn {
  width: 100%;
  padding: 12px 16px;
  background: #007acc;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.save-world-btn:hover {
  background: #005a99;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.save-world-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.world-info {
  margin-top: 10px;
  text-align: center;
}

.world-info small {
  color: #666;
  font-size: 12px;
}

/* 🏗️ ENTITY MODAL STYLES */
.entity-modal {
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
}

.entity-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-group label {
  font-weight: bold;
  color: #333;
  font-size: 14px;
}

.form-group select,
.form-group input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-row {
  display: flex;
  gap: 15px;
}

.form-row .form-group {
  flex: 1;
}

.characteristics-group {
  border: 1px solid #e0e0e0;
  padding: 15px;
  border-radius: 8px;
  background: #f9f9f9;
}

.characteristics-group h4 {
  margin: 0 0 10px 0;
  color: #666;
  font-size: 16px;
}

.form-checkboxes {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.form-checkboxes label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: normal;
  cursor: pointer;
}

.form-checkboxes input[type="checkbox"] {
  width: auto;
  margin: 0;
}

.modal-buttons {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

.btn-primary {
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.btn-primary:hover {
  background: #0056b3;
}

.modal-buttons button:not(.btn-primary) {
  background: #6c757d;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}

.modal-buttons button:not(.btn-primary):hover {
  background: #545b62;
}
</style>

<script setup>
import { onMounted, onUnmounted, ref, reactive } from 'vue';
import PixiShooterEngine from '~/services/PixiShooterEngine.js';

const pixiContainer = ref(null);
const engineRef = ref(null);

// 🏗️ ENTITY MODAL: Переменные для модального окна
const showEntityModal = ref(false);
const pendingClickPosition = ref(null); // Позиция клика для создания entity

// 🏗️ ENTITY FORM: Данные формы создания entity (дефолт для игроков)
const entityForm = reactive({
  type: 'unit',
  faction: 'player',      // 🎮 По умолчанию ИГРОК
  visual: 'triangle',     // 🔺 По умолчанию ТРЕУГОЛЬНИК  
  characteristics: {
    hp: 100,              // 💪 Больше жизней для игрока
    maxHp: 100,
    speed: 5,             // 🏃 Быстрее
    armor: 0,
    canMove: true,        // ✅ Может двигаться
    canTakeDamage: true
  },
  movementController: 'wasd' // 🎮 По умолчанию WASD управление
});

// Единая реактивная конфигурация оружия для UI и игры
const weaponConfig = reactive({
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
  autoReload: false,
  // Источник стрельбы и параметры автонаведения объекта
  fireSource: 'player',
  objectFire: {
    mode: 'nearest',
    angleDeg: 0
  },
  // Система событий и эффектов
  events: {
    onFlight: [],           // Эффекты во время полета
    onHitEnemy: [],         // Эффекты при попадании во врага
    onRicochet: [],         // Эффекты при рикошете
    onExpire: [],           // Эффекты при исчезновении
    onScreenEdge: []        // Эффекты при касании края экрана
  }
});

// Canvas настройки
const canvasSettings = reactive({
  width: 800,
  height: 600,
  background: '#222222',
  showFPS: false
});

// Engine настройки
const engineSettings = reactive({
  spatialGrid: {
    enabled: false,
    sectorSize: 50
  }
});

// World настройки
const worldSettings = reactive({
  type: 'default',
  width: 1200,
  height: 900,
  gravity: {
    enabled: false,
    strength: 0.1
  }
});

// Текущий размер canvas для отображения
const currentCanvasSize = reactive({
  width: 800,
  height: 600
});

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
  },
  {
    id: 'fire_puddle',
    name: 'Огненная лужа',
    icon: '🔥',
    description: 'Оставляет лужу огня на земле, наносящую периодический урон в радиусе заданное время'
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

// 🏗️ ENTITY MODAL FUNCTIONS
// Инициализация событий модалки (теперь события привязываются в момент открытия)
const initializeEntityModalEvents = (engine) => {
  console.log('🏗️ Entity modal events initialized (события привязываются при открытии модалки)');
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
  weaponConfig.events[selectedEventName.value].push(newEffect);
  
  closeEffectModal();
};

const removeEffect = (eventName, effectIndex) => {
  weaponConfig.events[eventName].splice(effectIndex, 1);
  
};

const updateEffectParam = (eventName, effectIndex, paramName, value) => {
  // Для строковых параметров (triggerType)
  if (paramName === 'triggerType') {
    weaponConfig.events[eventName][effectIndex][paramName] = value;
    
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
  weaponConfig.events[eventName][effectIndex][paramName] = numValue;
  
};



// Функция для загрузки пресетов
const loadPreset = (presetName) => {
  const presets = {

  };
  
  if (presets[presetName]) {
    Object.assign(weaponConfig, presets[presetName]);
  }
};

// Функция инициализации Add Enemy кнопки
const initializeAddShooterButton = (engine) => {
  // Переменная состояния для каждой инициализации
  let isWaitingForClick = false;
  
  const addShooterBtn = document.querySelector('.add-shooter-btn');
  const instructions = document.querySelector('.instructions');
  
  if (!addShooterBtn || !instructions) return;
  
  // Очищаем старые обработчики
  const newAddShooterBtn = addShooterBtn.cloneNode(true);
  addShooterBtn.parentNode.replaceChild(newAddShooterBtn, addShooterBtn);
  
  // Устанавливаем исходное состояние
  newAddShooterBtn.classList.remove('waiting');
  newAddShooterBtn.textContent = '🎯 Add Entity';
  instructions.style.display = 'none';
  
  // 🏗️ НОВЫЙ обработчик кнопки - теперь через модалку
  newAddShooterBtn.addEventListener('click', () => {
    if (isWaitingForClick) {
      // Отменяем режим добавления
      isWaitingForClick = false;
      newAddShooterBtn.classList.remove('waiting');
      newAddShooterBtn.textContent = '🎯 Add Entity';
      instructions.style.display = 'none';
      console.log('🎯 Add Entity: режим отменен');
    } else {
      // Включаем режим добавления
      isWaitingForClick = true;
      newAddShooterBtn.classList.add('waiting');
      newAddShooterBtn.textContent = '❌ Cancel';
      instructions.style.display = 'block';
      console.log('🎯 Add Entity: ожидание клика на канвас...');
    }
  });

  // Обработчик клика на канвас (привязываем к НОВОМУ движку!)
  engine.app.stage.on('pointerdown', (event) => {
    if (isWaitingForClick) {
      const canvasPos = event.global; // Позиция относительно canvas
      
      // 🌍 ПРЕОБРАЗОВАНИЕ: canvas координаты → world координаты
      const worldPos = {
        x: canvasPos.x + engine.camera.x,
        y: canvasPos.y + engine.camera.y
      };
      
      console.log('🎯 Add Entity: клик обработан', {
        canvasPos: `${canvasPos.x.toFixed(0)}, ${canvasPos.y.toFixed(0)}`,
        worldPos: `${worldPos.x.toFixed(0)}, ${worldPos.y.toFixed(0)}`,
        cameraOffset: `${engine.camera.x.toFixed(0)}, ${engine.camera.y.toFixed(0)}`
      });
      
      // 🏗️ ОТКРЫВАЕМ МОДАЛКУ: Локально, без Vue реактивности
      pendingClickPosition.value = worldPos;
      showEntityModal.value = true;
      
      // Привязываем события модалки после открытия
      setTimeout(() => {
        const createBtn = document.querySelector('.btn-primary');
        const cancelBtn = document.querySelector('.modal-buttons button:not(.btn-primary)');
        const overlay = document.querySelector('.modal-overlay');
        
        if (createBtn && !createBtn.hasAttribute('data-entity-listener')) {
          createBtn.setAttribute('data-entity-listener', 'true');
          createBtn.addEventListener('click', () => {
            if (!pendingClickPosition.value) return;
            
            const worldPos = pendingClickPosition.value;
            
            // 🔫 ОРУЖИЕ: Добавляем оружие игрокам
            const weapons = [];
            if (entityForm.faction === 'player') {
              weapons.push({
                weaponId: 'mainGun',
                weaponConfig: weaponConfig,
                controller: 'player'
              });
            }
            
            // Создаем entity с данными из формы
            const entityId = engine.addEntity({
              x: worldPos.x,
              y: worldPos.y,
              type: entityForm.type,
              faction: entityForm.faction,
              visual: entityForm.visual,
              characteristics: { ...entityForm.characteristics },
              movementController: entityForm.movementController || null,
              weapons: weapons
            });
            
            console.log(`✅ Entity создан из модалки! ID: ${entityId}`, {
              type: entityForm.type,
              faction: entityForm.faction,
              visual: entityForm.visual,
              position: `${worldPos.x.toFixed(0)}, ${worldPos.y.toFixed(0)}`
            });
            
            // Закрываем модалку
            showEntityModal.value = false;
            pendingClickPosition.value = null;
          });
        }
        if (cancelBtn && !cancelBtn.hasAttribute('data-entity-listener')) {
          cancelBtn.setAttribute('data-entity-listener', 'true');
          cancelBtn.addEventListener('click', () => {
            showEntityModal.value = false;
            pendingClickPosition.value = null;
          });
        }
        if (overlay && !overlay.hasAttribute('data-entity-listener')) {
          overlay.setAttribute('data-entity-listener', 'true');
          overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
              showEntityModal.value = false;
              pendingClickPosition.value = null;
            }
          });
        }
      }, 100);
      
      // Выходим из режима добавления
      isWaitingForClick = false;
      newAddShooterBtn.classList.remove('waiting');
      newAddShooterBtn.textContent = '🎯 Add Entity';
      instructions.style.display = 'none';
    }
  });
  
  console.log('🎯 Add Entity: кнопка переинициализирована для нового движка');
};

// Функция применения canvas настроек
const applyCanvasSettings = async () => {
  await applyAllSettings();
};

// Функция применения world настроек
const applyWorldSettings = async () => {
  await applyAllSettings();
};

// Общая функция применения всех настроек (canvas + world)
const applyAllSettings = async () => {
  if (!engineRef.value) {
    console.warn('Engine не инициализирован');
    return;
  }
  
  try {
    // Сохраняем старый движок для правильной очистки
    const oldEngine = engineRef.value;
    
    // Формируем настройки мира
    const worldConfig = {};
    if (worldSettings.type !== 'default') {
      worldConfig.type = worldSettings.type;
      if (worldSettings.type === 'solid') {
        worldConfig.width = worldSettings.width;
        worldConfig.height = worldSettings.height;
      }
    }
    worldConfig.gravity = {
      enabled: worldSettings.gravity.enabled,
      strength: worldSettings.gravity.strength
    };
    
    // Добавляем настройки Spatial Grid
    worldConfig.spatialGrid = {
      enabled: engineSettings.spatialGrid.enabled,
      sectorSize: engineSettings.spatialGrid.sectorSize
    };
    
    // Создаем новый движок с новыми настройками
    const newEngine = new PixiShooterEngine(pixiContainer.value, weaponConfig, {
      canvas: {
        width: canvasSettings.width,
        height: canvasSettings.height,
        background: canvasSettings.background,
        showFPS: canvasSettings.showFPS
      },
      world: worldConfig
    });
    
    // Останавливаем старый движок
    oldEngine.destroy();
    
    // Запускаем новый
    await newEngine.start();
    engineRef.value = newEngine;
    
    // 🎮 СОЗДАЕМ ИГРОКА: В центре канваса с оружием (при пересоздании движка)
    const playerId = newEngine.addEntity({
      x: canvasSettings.width / 2, 
      y: canvasSettings.height / 2,
      type: 'unit',
      faction: 'player',
      visual: 'triangle',
      characteristics: {
        hp: 100,
        maxHp: 100,
        speed: 5,
        canMove: true,
        canTakeDamage: true
      },
      weapons: [{
        weaponId: 'mainGun',
        weaponConfig: weaponConfig,
        controller: 'player'
      }],
      movementController: 'arrows'
    });
    
    console.log(`🎮 Игрок пересоздан! ID: ${playerId} в центре канваса`);
    
    // Переинициализируем Add Enemy кнопку для нового движка
    initializeAddShooterButton(newEngine);
    
    // 🏗️ Переинициализируем события модалки для нового движка
    initializeEntityModalEvents(newEngine);
    
    // Обновляем отображаемый размер
    currentCanvasSize.width = canvasSettings.width;
    currentCanvasSize.height = canvasSettings.height;
    
    console.log('✅ Настройки применены:', {
      canvas: {
        width: canvasSettings.width,
        height: canvasSettings.height,
        background: canvasSettings.background,
        showFPS: canvasSettings.showFPS
      },
      world: worldConfig
    });
    
  } catch (error) {
    console.error('❌ Ошибка применения настроек:', error);
  }
};

onMounted(async () => {
  if (process.client && pixiContainer.value) {
    // Создаем движок с начальными canvas и engine настройками
    const engine = new PixiShooterEngine(pixiContainer.value, weaponConfig, {
      canvas: {
        width: canvasSettings.width,
        height: canvasSettings.height,
        background: canvasSettings.background,
        showFPS: canvasSettings.showFPS
      },
      world: {
        spatialGrid: {
          enabled: engineSettings.spatialGrid.enabled,
          sectorSize: engineSettings.spatialGrid.sectorSize
        }
      }
    });
    await engine.start();
    engineRef.value = engine;
    
    // 🎮 СОЗДАЕМ ИГРОКА: В центре канваса с оружием
    const playerId = engine.addEntity({
      x: canvasSettings.width / 2, 
      y: canvasSettings.height / 2,
      type: 'unit',
      faction: 'player',
      visual: 'triangle',
      characteristics: {
        hp: 100,
        maxHp: 100,
        speed: 5,
        canMove: true,
        canTakeDamage: true
      },
      weapons: [{
        weaponId: 'mainGun',
        weaponConfig: weaponConfig,
        controller: 'player'
      }],
      movementController: 'arrows'
    });
    
    console.log(`🎮 Игрок создан! ID: ${playerId} в центре канваса`);
    
    // Инициализируем текущий размер
    currentCanvasSize.width = canvasSettings.width;
    currentCanvasSize.height = canvasSettings.height;

    // 🎯 ADD ENEMY BUTTON: Инициализируем через общую функцию
    initializeAddShooterButton(engine);

    // 🏗️ ENTITY MODAL: Инициализируем события модалки
    initializeEntityModalEvents(engine);
  }
});

// Правильная очистка ресурсов
onUnmounted(() => {
  if (engineRef.value) {
    engineRef.value.destroy();
    engineRef.value = null;
  }
});
</script>
