<template>
  <div class="form">
    <label class="field">
      <span class="field__label">ID</span>
      <input class="field__input" v-model.trim="model.id" placeholder="ui_text_1" />
    </label>
    <label class="field">
      <span class="field__label">Bind to</span>
      <select class="field__input" v-model="model.bindTo">
        <option value="canvas">canvas</option>
        <option value="camera">camera</option>
        <option value="world">world</option>
      </select>
    </label>
    <label v-if="model.bindTo === 'canvas'" class="field">
      <span class="field__label">Canvas</span>
      <select class="field__input" v-model="model.canvasId">
        <option v-for="c in canvases" :key="c.id" :value="c.id">{{ c.id }}</option>
      </select>
    </label>
    <label v-else-if="model.bindTo === 'camera'" class="field">
      <span class="field__label">Camera</span>
      <select class="field__input" v-model="model.cameraId">
        <option v-for="cam in cameras" :key="cam.id" :value="cam.id">{{ cam.id }}</option>
      </select>
    </label>
    <label v-else class="field">
      <span class="field__label">World</span>
      <select class="field__input" v-model="model.worldId">
        <option v-for="w in worlds" :key="w.id" :value="w.id">{{ w.id }}</option>
      </select>
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
    <label class="field field--row">
      <input type="checkbox" v-model="model.screenSpace" />
      <span class="field__label">ScreenSpace</span>
    </label>
    <label class="field">
      <span class="field__label">Content</span>
      <input class="field__input" v-model.trim="model.content" placeholder="Hello UI" />
    </label>
    <div class="grid2">
      <label class="field">
        <span class="field__label">Font Size</span>
        <input class="field__input" type="number" v-model.number="model.fontSize" />
      </label>
      <label class="field">
        <span class="field__label">Color</span>
        <input class="field__input" v-model.trim="model.color" placeholder="#ffffff" />
      </label>
    </div>
  </div>
</template>

<script setup>
defineProps({
  canvases: Array,
  cameras: Array,
  worlds: Array
});

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
