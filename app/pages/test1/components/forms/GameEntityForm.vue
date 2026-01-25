<template>
  <div class="form">
    <label class="field">
      <span class="field__label">ID</span>
      <input class="field__input" v-model.trim="model.id" placeholder="unit_1" />
    </label>
    <label class="field">
      <span class="field__label">World</span>
      <select class="field__input" v-model="model.worldId">
        <option v-for="w in worlds" :key="w.id" :value="w.id">{{ w.id }}</option>
      </select>
    </label>
    <label class="field">
      <span class="field__label">Type</span>
      <select class="field__input" v-model="model.subtype">
        <option value="unit">Unit (юнит)</option>
        <option value="build">Build (здание)</option>
      </select>
    </label>
    <label class="field">
      <span class="field__label">Shape</span>
      <select class="field__input" v-model="model.shape">
        <option value="circle">Circle (круг)</option>
        <option value="rect">Rectangle (квадрат)</option>
        <option value="sprite">Sprite (спрайт)</option>
      </select>
    </label>
    <label class="field">
      <span class="field__label">Color</span>
      <input class="field__input" v-model.trim="model.color" placeholder="#4fc3f7" />
    </label>
    <div class="grid2">
      <label class="field">
        <span class="field__label">X</span>
        <input class="field__input" type="number" v-model.number="model.x" />
      </label>
      <label class="field">
        <span class="field__label">Y</span>
        <input class="field__input" type="number" v-model.number="model.y" />
      </label>
    </div>
    <div v-if="model.shape === 'circle'">
      <label class="field">
        <span class="field__label">Size (radius × 2)</span>
        <input class="field__input" type="number" v-model.number="model.size" />
      </label>
    </div>
    <div v-else-if="model.shape === 'sprite'">
      <label class="field">
        <span class="field__label">Texture URL</span>
        <input class="field__input" v-model.trim="model.textureUrl" placeholder="/assets/hero.png" />
        <span class="field__hint">Относительно папки public</span>
      </label>
      <div class="grid2">
        <label class="field">
          <span class="field__label">Width (для коллизии)</span>
          <input class="field__input" type="number" v-model.number="model.width" />
        </label>
        <label class="field">
          <span class="field__label">Height (для коллизии)</span>
          <input class="field__input" type="number" v-model.number="model.height" />
        </label>
      </div>
    </div>
    <div v-else>
      <div class="grid2">
        <label class="field">
          <span class="field__label">Width</span>
          <input class="field__input" type="number" v-model.number="model.width" />
        </label>
        <label class="field">
          <span class="field__label">Height</span>
          <input class="field__input" type="number" v-model.number="model.height" />
        </label>
      </div>
    </div>
    <label class="field field--row">
      <input type="checkbox" v-model="model.hasCollision" />
      <span class="field__label">Has Collision</span>
    </label>
    <div v-if="model.hasCollision">
      <label class="field">
        <span class="field__label">Collision Shape</span>
        <select class="field__input" v-model="model.collisionShape" :class="{ 'field__input--error': needsCollisionShape && !model.collisionShape }">
          <option v-if="['circle', 'rect'].includes(model.shape)" value="">Same as appearance</option>
          <option value="circle">Circle (круг)</option>
          <option value="rect">Rectangle (квадрат)</option>
        </select>
      </label>
      <div v-if="needsCollisionShape && !model.collisionShape" class="field__error">
        ⚠️ Shape {{ model.shape }} requires explicit collision shape
      </div>
      <label class="field">
        <span class="field__label">Collision Scale (1.0 = 100%)</span>
        <input class="field__input" type="number" step="0.1" min="0.1" max="3.0" v-model.number="model.collisionScale" />
      </label>
    </div>

    <div class="form__section">
      <div class="form__section-title">Movement</div>
      <div class="grid2">
        <label class="field">
          <span class="field__label">Max Speed</span>
          <input class="field__input" type="number" v-model.number="model.maxSpeed" />
        </label>
        <label class="field">
          <span class="field__label">Acceleration</span>
          <input class="field__input" type="number" v-model.number="model.acceleration" />
        </label>
      </div>
      <label class="field">
        <span class="field__label">Friction</span>
        <input class="field__input" type="number" v-model.number="model.friction" />
      </label>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

defineProps({
  worlds: Array
});

const model = defineModel();

const needsCollisionShape = computed(() => {
  return model.hasCollision && !['circle', 'rect'].includes(model.shape);
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
.field__input:focus { outline: 2px solid rgba(79, 195, 247, 0.25); border-color: rgba(79, 195, 247, 0.30); }
.field__input--error { border-color: #ff6b6b !important; }
.field__error { font-size: 12px; color: #ff6b6b; margin-top: -4px; }
.form__section { padding: 10px; border-radius: 8px; background: rgba(79, 195, 247, 0.05); border: 1px solid rgba(79, 195, 247, 0.15); }
.form__section-title { font-weight: 700; font-size: 13px; color: #bfe7ff; margin-bottom: 8px; }
</style>
