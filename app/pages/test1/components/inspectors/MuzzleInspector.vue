<template>
  <div class="inspector__content">
    <div class="inspector__title">🔫 Muzzle: {{ muzzle.id }}</div>

    <div class="kv">
      <div class="kv__row"><div class="kv__k">World</div><div class="kv__v">{{ muzzle.worldId || 'None' }}</div></div>
      <div class="kv__row"><div class="kv__k">Position</div><div class="kv__v">{{ muzzle.instance.position.x.toFixed(1) }}, {{ muzzle.instance.position.y.toFixed(1) }}</div></div>
      <div class="kv__row"><div class="kv__k">Direction</div><div class="kv__v">({{ muzzle.direction.x.toFixed(2) }}, {{ muzzle.direction.y.toFixed(2) }})</div></div>
      <div class="kv__row"><div class="kv__k">Direction Mode</div><div class="kv__v">{{ muzzle.directionMode }}</div></div>
      <div class="kv__row"><div class="kv__k">Debug</div><div class="kv__v">{{ muzzle.showDebug ? 'enabled' : 'disabled' }}</div></div>
    </div>

    <div class="inspector__section inspector__section--fire">
      <div class="inspector__section-title">🔫 Fire Parameters</div>

      <!-- Fire Rate -->
      <div class="inspector__group">
        <div class="inspector__label">Fire Rate: {{ muzzleUi.fireRate.toFixed(1) }}/sec</div>
        <input type="range" v-model.number="muzzleUi.fireRate" min="0.1" max="30" step="0.1" @input="apply" />
        <div class="inspector__value">
          {{ muzzleUi.fireRate < 1 ? '🐌 Slow' : muzzleUi.fireRate > 10 ? '⚡ Fast' : '🔫 Normal' }}
        </div>
      </div>

      <!-- Bullet Speed -->
      <div class="inspector__group">
        <div class="inspector__label">Bullet Speed: {{ muzzleUi.bulletSpeed.toFixed(0) }} px/s</div>
        <input type="range" v-model.number="muzzleUi.bulletSpeed" min="10" max="2000" step="10" @input="apply" />
        <div class="inspector__value">
          {{ muzzleUi.bulletSpeed < 200 ? '🐌 Slow' : muzzleUi.bulletSpeed > 1000 ? '💨 Fast' : '🚀 Normal' }}
        </div>
      </div>

      <!-- Bullet Range -->
      <div class="inspector__group">
        <div class="inspector__label">Bullet Range: {{ muzzleUi.bulletRange.toFixed(0) }} px</div>
        <input type="range" v-model.number="muzzleUi.bulletRange" min="100" max="3000" step="50" @input="apply" />
        <div class="inspector__value">
          {{ muzzleUi.bulletRange < 500 ? '📍 Short' : muzzleUi.bulletRange > 1500 ? '🎯 Long' : '📏 Medium' }}
        </div>
      </div>

      <!-- Bullet Size -->
      <div class="inspector__group">
        <div class="inspector__label">Bullet Size: {{ muzzleUi.bulletSize.toFixed(0) }} px</div>
        <input type="range" v-model.number="muzzleUi.bulletSize" min="1" max="50" step="1" @input="apply" />
        <div class="inspector__value">
          {{ muzzleUi.bulletSize < 5 ? '🔹 Tiny' : muzzleUi.bulletSize > 20 ? '⬛ Huge' : '⚪ Normal' }}
        </div>
      </div>

      <!-- Bullet Color -->
      <div class="inspector__group">
        <div class="inspector__label">Bullet Color</div>
        <div class="color-input-wrapper">
          <input type="color" v-model="muzzleUi.bulletColor" @input="apply" class="color-input" />
          <div class="inspector__value">{{ muzzleUi.bulletColor }}</div>
        </div>
      </div>

      <!-- Auto Fire -->
      <label class="field field--row">
        <input type="checkbox" v-model="muzzleUi.autoFire" @change="apply" />
        <span class="field__label">Auto Fire (зажатая кнопка)</span>
      </label>
      <div class="inspector__hint">
        {{ muzzleUi.autoFire ? '🔥 Стрельба при зажатой ЛКМ' : '🎯 Одиночный выстрел при клике' }}
      </div>

      <!-- Bullet Count -->
      <div class="inspector__group">
        <div class="inspector__label">Bullet Count: {{ muzzleUi.bulletCount ?? 1 }}</div>
        <input type="range" v-model.number="muzzleUi.bulletCount" min="1" max="20" step="1" @input="apply" />
        <div class="inspector__value">
          {{ (muzzleUi.bulletCount ?? 1) === 1 ? '🔫 Single' : (muzzleUi.bulletCount ?? 1) > 10 ? '💥 Many' : '🔫🔫 Multi' }}
        </div>
      </div>

      <!-- Is Spread -->
      <label class="field field--row">
        <input type="checkbox" v-model="muzzleUi.isSpread" @change="apply" />
        <span class="field__label">🌟 Равномерный веер (для нескольких пуль)</span>
      </label>
      <div class="inspector__hint" v-if="!muzzleUi.isSpread">
        Случайный разброс для каждой пули (работает и для 1 пули!)
      </div>

      <!-- Spread Angle -->
      <div class="inspector__group">
        <div class="inspector__label">Макс. разброс: {{ (muzzleUi.spreadAngle ?? 45).toFixed(0) }}°</div>
        <input type="range" v-model.number="muzzleUi.spreadAngle" min="5" max="359" step="5" @input="apply" />
        <div class="inspector__value">
          {{ muzzleUi.isSpread && (muzzleUi.bulletCount ?? 1) > 1 ? '📐 Равномерный веер' : '🎲 Случайный разброс' }}
        </div>
      </div>

      <!-- Scatter Chance -->
      <div class="inspector__group" v-if="!muzzleUi.isSpread">
        <div class="inspector__label">Шанс разброса (угол): {{ ((muzzleUi.scatterChance ?? 1) * 100).toFixed(0) }}%</div>
        <input type="range" v-model.number="muzzleUi.scatterChance" min="0" max="1" step="0.05" @input="apply" />
        <div class="inspector__value">
          {{ (muzzleUi.scatterChance ?? 1) === 0 ? '❌ Никогда' : (muzzleUi.scatterChance ?? 1) === 1 ? '🎲 Всегда' : '🎲 Частично' }}
        </div>
      </div>

      <!-- Range Scatter Chance -->
      <div class="inspector__group">
        <div class="inspector__label">Шанс разброса (дальность): {{ ((muzzleUi.rangeScatterChance ?? 0) * 100).toFixed(0) }}%</div>
        <input type="range" v-model.number="muzzleUi.rangeScatterChance" min="0" max="1" step="0.05" @input="apply" />
        <div class="inspector__value">
          {{ (muzzleUi.rangeScatterChance ?? 0) === 0 ? '❌ Никогда' : (muzzleUi.rangeScatterChance ?? 0) === 1 ? '📏 Всегда' : '📏 Частично' }}
        </div>
      </div>

      <!-- Range Spread Percent -->
      <div class="inspector__group">
        <div class="inspector__label">Разброс дальности: {{ (muzzleUi.rangeSpreadPercent ?? 10).toFixed(0) }}%</div>
        <input type="range" v-model.number="muzzleUi.rangeSpreadPercent" min="0" max="100" step="5" @input="apply" />
        <div class="inspector__value">
          Пример: при 400px → {{ (400 * (1 - (muzzleUi.rangeSpreadPercent ?? 10) / 100)).toFixed(0) }}-400px
        </div>
      </div>

      <!-- Bullet Lifetime -->
      <div class="inspector__group">
        <div class="inspector__label">Время жизни пули: {{ (muzzleUi.bulletLifetime ?? 0).toFixed(1) }} сек</div>
        <input type="range" v-model.number="muzzleUi.bulletLifetime" min="0" max="60" step="0.1" @input="apply" />
        <div class="inspector__value">
          {{ (muzzleUi.bulletLifetime ?? 0) === 0 ? '♾️ Бесконечно (по дальности)' : `⏱️ ${muzzleUi.bulletLifetime.toFixed(1)}сек` }}
        </div>
      </div>

      <!-- Bullet Piercing -->
      <div class="inspector__group">
        <div class="inspector__label">🎯 Пробитие: {{ muzzleUi.bulletPiercing ?? 1 }}</div>
        <input type="range" v-model.number="muzzleUi.bulletPiercing" min="0" max="100" step="1" @input="apply" />
        <div class="inspector__value">
          {{ (muzzleUi.bulletPiercing ?? 1) === 0 ? '♾️ Бесконечное' : (muzzleUi.bulletPiercing ?? 1) === 1 ? '🎯 1 цель' : `🎯 ${muzzleUi.bulletPiercing} целей` }}
        </div>
      </div>
    </div>

    <!-- Debug Section -->
    <div class="inspector__section">
      <div class="inspector__section-title">Debug Visualization</div>

      <label class="field field--row">
        <input type="checkbox" v-model="muzzleUi.showDebug" @change="apply" />
        <span class="field__label">Show Debug</span>
      </label>

      <div class="inspector__group">
        <div class="inspector__label">Debug Color</div>
        <input type="color" v-model="muzzleUi.debugColor" @input="apply" class="color-input" />
        <div class="inspector__value">{{ muzzleUi.debugColor }}</div>
      </div>
    </div>

    <!-- Direction Section -->
    <div class="inspector__section">
      <div class="inspector__section-title">Direction</div>

      <div class="inspector__group">
        <div class="inspector__label">Direction X</div>
        <input type="range" v-model.number="muzzleUi.direction.x" min="-2" max="2" step="0.1" @input="apply" />
        <div class="inspector__value">{{ muzzleUi.direction.x.toFixed(2) }}</div>
      </div>

      <div class="inspector__group">
        <div class="inspector__label">Direction Y</div>
        <input type="range" v-model.number="muzzleUi.direction.y" min="-2" max="2" step="0.1" @input="apply" />
        <div class="inspector__value">{{ muzzleUi.direction.y.toFixed(2) }}</div>
      </div>

      <label class="field">
        <span class="field__label">Direction Mode</span>
        <select class="field__input" v-model="muzzleUi.directionMode" @change="apply">
          <option value="static">Static (фиксированный)</option>
          <option value="relative">Relative (вместе с родителем)</option>
        </select>
      </label>

      <!-- Quick Direction Buttons -->
      <div class="direction-buttons">
        <button class="dir-btn" @click="setDirection(0, -1)" title="Up">⬆️</button>
        <button class="dir-btn" @click="setDirection(-1, 0)" title="Left">⬅️</button>
        <button class="dir-btn" @click="setDirection(1, 0)" title="Right">➡️</button>
        <button class="dir-btn" @click="setDirection(0, 1)" title="Down">⬇️</button>
      </div>
    </div>

    <!-- Stats -->
    <div class="inspector__section inspector__section--info">
      <div class="inspector__section-title">Stats</div>
      <div class="kv">
        <div class="kv__row"><div class="kv__k">Firing</div><div class="kv__v">{{ muzzle.instance._isFiring ? '🔥 Yes' : '❌ No' }}</div></div>
        <div class="kv__row"><div class="kv__k">Last Fire</div><div class="kv__v">{{ lastFireTime }} ms ago</div></div>
        <div class="kv__row"><div class="kv__k">Fire Interval</div><div class="kv__v">{{ fireInterval }} ms</div></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  muzzle: Object,
  muzzleUi: Object
});

const emit = defineEmits(['apply']);

function apply() {
  emit('apply');
}

function setDirection(x, y) {
  props.muzzleUi.direction.x = x;
  props.muzzleUi.direction.y = y;
  apply();
}

const lastFireTime = computed(() => {
  if (!props.muzzle?.instance?._lastFireTime) return 'N/A';
  const elapsed = performance.now() - props.muzzle.instance._lastFireTime;
  return elapsed.toFixed(0);
});

const fireInterval = computed(() => {
  if (!props.muzzleUi?.fireRate) return 'N/A';
  return (1000 / props.muzzleUi.fireRate).toFixed(0);
});
</script>

<style scoped>
.inspector__content { padding: 12px; display: grid; gap: 12px; }
.inspector__title { font-weight: 800; }

.kv { display: grid; gap: 6px; }
.kv__row { display: grid; grid-template-columns: 110px 1fr; gap: 10px; font-size: 13px; }
.kv__k { color: rgba(255,255,255, 0.55); }
.kv__v { color: rgba(255,255,255, 0.90); word-break: break-word; }

.inspector__section {
  padding: 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: grid;
  gap: 10px;
}

.inspector__section--fire {
  background: rgba(255, 165, 0, 0.08);
  border: 1px solid rgba(255, 165, 0, 0.25);
}

.inspector__section--info {
  background: rgba(123, 211, 255, 0.05);
  border: 1px solid rgba(123, 211, 255, 0.15);
}

.inspector__section-title {
  font-weight: 700;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 4px;
}

.inspector__group {
  display: grid;
  gap: 6px;
}

.inspector__label {
  font-weight: 600;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.inspector__value {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

.inspector__hint {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  margin-top: -4px;
}

.field { display: grid; gap: 6px; }
.field--row {
  grid-auto-flow: column;
  align-items: center;
  justify-content: start;
  gap: 10px;
}
.field__label {
  font-weight: 600;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.75);
}

.field__input {
  height: 36px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(0, 0, 0, 0.22);
  color: rgba(255, 255, 255, 0.92);
}

.color-input {
  height: 40px;
  padding: 2px;
  cursor: pointer;
}

.color-input-wrapper {
  display: grid;
  grid-template-columns: 50px 1fr;
  gap: 8px;
  align-items: center;
}

input[type="range"] {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
  outline: none;
  -webkit-appearance: none;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ff9800;
  cursor: pointer;
  border: 2px solid rgba(255, 255, 255, 0.8);
}

input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ff9800;
  cursor: pointer;
  border: 2px solid rgba(255, 255, 255, 0.8);
}

.direction-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-top: 4px;
}

.dir-btn {
  height: 36px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.dir-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
}

.dir-btn:active {
  background: rgba(255, 255, 255, 0.15);
  transform: scale(0.95);
}

.dir-btn:nth-child(2) { grid-column: 1; }
.dir-btn:nth-child(3) { grid-column: 2; }
.dir-btn:nth-child(4) { grid-column: 3; }
.dir-btn:nth-child(1) { grid-column: 2; }
</style>
