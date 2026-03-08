<template>
  <div class="form">
    <label class="field">
      <span class="field__label">ID</span>
      <input class="field__input" v-model.trim="model.id" placeholder="light_1" />
    </label>

    <div class="form__section form__section--shape">
      <div class="form__section-title">💡 Shape</div>

      <label class="field">
        <span class="field__label">Shape</span>
        <select class="field__input" v-model="model.shape">
          <option value="circle">Circle</option>
          <option value="arc">Arc</option>
        </select>
      </label>

      <div class="grid2">
        <label class="field">
          <span class="field__label">Radius</span>
          <input class="field__input" type="number" min="0" step="10" v-model.number="model.radius" />
          <span class="field__hint">Основной радиус (полный свет)</span>
        </label>
        <label class="field">
          <span class="field__label">Falloff Radius</span>
          <input class="field__input" type="number" min="0" step="10" v-model.number="model.falloffRadius" />
          <span class="field__hint">Градиент до 0</span>
        </label>
      </div>

      <label class="field">
        <span class="field__label">Intensity ({{ (model.intensity ?? 1).toFixed(2) }})</span>
        <input type="range" min="0" max="1" step="0.01" v-model.number="model.intensity" />
        <span class="field__hint">0..1 — насколько сильно вырезает темноту</span>
      </label>
    </div>

    <div class="form__section form__section--tint">
      <div class="form__section-title">Tint (optional)</div>
      <label class="field field--row">
        <input type="checkbox" v-model="tintEnabled" />
        <span class="field__label">Enable Tint</span>
      </label>
      <div class="field__hint">
        Сейчас tint хранится в сущности (для будущих цветных светов). “Вырез” темноты остаётся без цвета.
      </div>

      <template v-if="tintEnabled">
        <label class="field">
          <span class="field__label">Tint Color</span>
          <div class="color-input-wrapper">
            <input type="color" v-model="tintValue" class="color-input" />
            <input type="text" v-model.trim="tintValue" class="field__input color-text" placeholder="#FF6600" maxlength="7" />
          </div>
        </label>
      </template>
    </div>

    <div class="form__section form__section--arc" v-if="model.shape === 'arc'">
      <div class="form__section-title">Arc Settings</div>

      <label class="field">
        <span class="field__label">FOV Angle</span>
        <input class="field__input" type="number" step="5" min="1" max="360" v-model.number="model.fovAngle" />
      </label>

      <div class="grid2">
        <label class="field">
          <span class="field__label">Dir X</span>
          <input class="field__input" type="number" step="0.1" v-model.number="model.direction.x" />
        </label>
        <label class="field">
          <span class="field__label">Dir Y</span>
          <input class="field__input" type="number" step="0.1" v-model.number="model.direction.y" />
        </label>
      </div>

      <label class="field">
        <span class="field__label">Direction Mode</span>
        <select class="field__input" v-model="model.directionMode">
          <option value="relative">Relative</option>
          <option value="static">Static</option>
        </select>
      </label>
    </div>

    <div class="form__section">
      <div class="form__section-title">Debug Visualization</div>
      <label class="field field--row">
        <input type="checkbox" v-model="model.showDebug" />
        <span class="field__label">Show Debug</span>
      </label>
      <label class="field">
        <span class="field__label">Debug Color</span>
        <div class="color-input-wrapper">
          <input type="color" v-model="model.debugColor" class="color-input" />
          <input type="text" v-model.trim="model.debugColor" class="field__input color-text" placeholder="#FFD54F" maxlength="7" />
        </div>
      </label>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const model = defineModel();

const tintEnabled = computed({
  get() {
    return model.value?.tint != null && model.value?.tint !== '';
  },
  set(v) {
    if (!v) {
      model.value.tint = null;
    } else if (!model.value.tint) {
      model.value.tint = '#FF6600';
    }
  }
});

const tintValue = computed({
  get() {
    return model.value?.tint || '#FF6600';
  },
  set(v) {
    model.value.tint = v?.trim() || '#FF6600';
  }
});
</script>

<style scoped>
.form { display: grid; gap: 10px; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.field { display: grid; gap: 6px; }
.field--row { grid-auto-flow: column; align-items: center; justify-content: start; gap: 10px; }
.field__label { font-weight: 700; font-size: 13px; color: rgba(255, 255, 255, 0.75); }
.field__hint { font-size: 11px; color: rgba(255, 255, 255, 0.5); }
.field__input {
  height: 36px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(0, 0, 0, 0.22);
  color: rgba(255, 255, 255, 0.92);
}
.field__input:focus { outline: 2px solid rgba(255, 213, 79, 0.25); border-color: rgba(255, 213, 79, 0.35); }
.color-input-wrapper {
  display: grid;
  grid-template-columns: 50px 1fr;
  gap: 8px;
}
.color-input {
  height: 36px;
  width: 100%;
  padding: 2px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(0, 0, 0, 0.22);
  cursor: pointer;
}
.color-text { font-family: monospace; text-transform: uppercase; }
.form__section {
  padding: 10px;
  border-radius: 8px;
  background: rgba(255, 213, 79, 0.06);
  border: 1px solid rgba(255, 213, 79, 0.16);
}
.form__section--shape {
  background: rgba(255, 213, 79, 0.08);
  border: 1px solid rgba(255, 213, 79, 0.22);
}
.form__section--arc {
  background: rgba(100, 200, 255, 0.05);
  border: 1px solid rgba(100, 200, 255, 0.15);
}
.form__section--tint {
  background: rgba(255, 120, 80, 0.05);
  border: 1px solid rgba(255, 120, 80, 0.15);
}
.form__section-title { font-weight: 700; font-size: 13px; color: #ffd54f; margin-bottom: 8px; }
.form__section--arc .form__section-title { color: #64c8ff; }
.form__section--tint .form__section-title { color: #ff7850; }
</style>

