<template>
  <div class="form">
    <label class="field">
      <span class="field__label">ID</span>
      <input class="field__input" v-model.trim="model.id" placeholder="canvas_1" />
    </label>
    <label class="field">
      <span class="field__label">Size Mode</span>
      <select class="field__input" v-model="model.sizeMode">
        <option value="fixed">fixed</option>
        <option value="responsive">responsive</option>
      </select>
    </label>
    <div v-if="model.sizeMode === 'fixed'" class="grid2">
      <label class="field">
        <span class="field__label">Width</span>
        <input class="field__input" type="number" v-model.number="model.width" />
      </label>
      <label class="field">
        <span class="field__label">Height</span>
        <input class="field__input" type="number" v-model.number="model.height" />
      </label>
    </div>
    <div v-else class="grid2">
      <label class="field">
        <span class="field__label">Width %</span>
        <input class="field__input" type="number" v-model.number="model.widthPercent" />
      </label>
      <label class="field">
        <span class="field__label">Height %</span>
        <input class="field__input" type="number" v-model.number="model.heightPercent" />
      </label>
    </div>
    <label class="field">
      <span class="field__label">Background</span>
      <input class="field__input" v-model.trim="model.backgroundColor" placeholder="#1a1a1a" />
    </label>
    <div class="grid2">
      <label class="field field--row">
        <input type="checkbox" v-model="model.antialias" />
        <span class="field__label">Antialias</span>
      </label>
      <label class="field">
        <span class="field__label">Resolution</span>
        <input class="field__input" type="number" step="1" min="1" max="4" v-model.number="model.resolution" />
      </label>
    </div>
  </div>
</template>

<script setup>
const model = defineModel();
</script>

<style scoped>
.form { display: grid; gap: 10px; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.field { display: grid; gap: 6px; }
.field--row { grid-auto-flow: column; align-items: center; justify-content: start; gap: 10px; }
.field__label { font-weight: 700; font-size: 13px; color: rgba(255, 255, 255, 0.75); }
.field__input {
  height: 36px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(0, 0, 0, 0.22);
  color: rgba(255, 255, 255, 0.92);
}
.field__input:focus { outline: 2px solid rgba(79, 195, 247, 0.25); border-color: rgba(79, 195, 247, 0.30); }
</style>
