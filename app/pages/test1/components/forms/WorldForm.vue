<template>
  <div class="form">
    <label class="field">
      <span class="field__label">ID</span>
      <input class="field__input" v-model.trim="model.id" placeholder="world_1" />
    </label>
    <label class="field">
      <span class="field__label">Type</span>
      <select class="field__input" v-model="model.type">
        <option value="bounded">bounded</option>
        <option value="infinite">infinite</option>
      </select>
    </label>
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
    <label class="field">
      <span class="field__label">Background</span>
      <input class="field__input" v-model.trim="model.backgroundColor" placeholder="#000000" />
    </label>
    <label class="field">
      <span class="field__label">Texture URL (optional)</span>
      <input class="field__input" v-model.trim="model.textureUrl" placeholder="/assets/spritesheet.png" />
    </label>
    <div class="grid2" v-if="model.textureUrl">
      <label class="field">
        <span class="field__label">Texture Scale Mode</span>
        <select class="field__input" v-model="model.textureScaleMode">
          <option value="tile">tile (замостить)</option>
          <option value="stretch">stretch (растянуть)</option>
          <option value="center">center (центрировать)</option>
        </select>
      </label>
      <label class="field">
        <span class="field__label">Tint (optional)</span>
        <input class="field__input" v-model.trim="model.tint" placeholder="#ffffff" />
      </label>
    </div>
    <label class="field field--row">
      <input type="checkbox" v-model="model.showBounds" />
      <span class="field__label">Show world bounds</span>
    </label>
    <label class="field" v-if="model.showBounds">
      <span class="field__label">Bounds Color</span>
      <input class="field__input" v-model.trim="model.boundsColor" placeholder="#FF4444" />
    </label>
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
