<template>
  <div class="form">
    <label class="field">
      <span class="field__label">ID</span>
      <input class="field__input" v-model.trim="model.id" placeholder="camera_1" />
    </label>

    <label class="field">
      <span class="field__label">Attach to Canvas</span>
      <select class="field__input" v-model="model.canvasId">
        <option v-for="c in canvases" :key="c.id" :value="c.id">{{ c.id }}</option>
      </select>
    </label>

    <label class="field">
      <span class="field__label">Attach to World</span>
      <select class="field__input" v-model="model.worldId">
        <option v-for="w in worlds" :key="w.id" :value="w.id">{{ w.id }}</option>
      </select>
    </label>

    <label class="field">
      <span class="field__label">Follow Entity (optional)</span>
      <select class="field__input" v-model="model.followEntityId">
        <option value="">None</option>
        <option v-for="e in gameEntities" :key="e.id" :value="e.entityId">{{ e.id }} ({{ e.subtype }})</option>
      </select>
    </label>

    <label class="field">
      <span class="field__label">Anchor</span>
      <select class="field__input" v-model="model.anchor">
        <option value="center">center</option>
        <option value="topleft">topleft</option>
        <option value="topright">topright</option>
        <option value="bottomleft">bottomleft</option>
        <option value="bottomright">bottomright</option>
      </select>
    </label>

    <label class="field">
      <span class="field__label">World Background Color</span>
      <input class="field__input" v-model.trim="model.worldBackgroundColor" placeholder="#2a2a2a" />
    </label>

    <div class="grid2">
      <label class="field">
        <span class="field__label">Viewport Width</span>
        <input class="field__input" type="number" v-model.number="model.width" />
      </label>
      <label class="field">
        <span class="field__label">Viewport Height</span>
        <input class="field__input" type="number" v-model.number="model.height" />
      </label>
    </div>

    <div class="grid2">
      <label class="field">
        <span class="field__label">X (in canvas)</span>
        <input class="field__input" type="number" v-model.number="model.x" />
      </label>
      <label class="field">
        <span class="field__label">Y (in canvas)</span>
        <input class="field__input" type="number" v-model.number="model.y" />
      </label>
    </div>

    <div class="grid2">
      <label class="field">
        <span class="field__label">Focus X</span>
        <input class="field__input" type="number" v-model.number="model.focusX" />
      </label>
      <label class="field">
        <span class="field__label">Focus Y</span>
        <input class="field__input" type="number" v-model.number="model.focusY" />
      </label>
    </div>

    <div class="grid2">
      <label class="field">
        <span class="field__label">Zoom</span>
        <input class="field__input" type="number" step="0.1" v-model.number="model.zoom" />
      </label>
      <label class="field">
        <span class="field__label">Priority</span>
        <input class="field__input" type="number" step="1" v-model.number="model.priority" />
      </label>
    </div>

    <div class="grid2">
      <label class="field">
        <span class="field__label">Min Zoom</span>
        <input class="field__input" type="number" step="0.1" v-model.number="model.minZoom" />
      </label>
      <label class="field">
        <span class="field__label">Max Zoom</span>
        <input class="field__input" type="number" step="0.1" v-model.number="model.maxZoom" />
      </label>
    </div>

    <div class="form__section">
      <div class="form__section-title">Visibility (what to show)</div>
      <label class="field">
        <span class="field__label">Mode</span>
        <select class="field__input" v-model="model.showMode">
          <option value="all">Show All</option>
          <option value="selected">Show Only Selected</option>
        </select>
      </label>

      <template v-if="model.showMode === 'selected'">
        <label class="field field--row">
          <input type="checkbox" v-model="model.showRegions" />
          <span class="field__label">Show Regions</span>
        </label>
        <label class="field field--row">
          <input type="checkbox" v-model="model.showRegionBorders" />
          <span class="field__label">Show Region Borders</span>
        </label>
        <label class="field field--row">
          <input type="checkbox" v-model="model.showGameEntities" />
          <span class="field__label">Show Game Entities</span>
        </label>
        <label class="field field--row">
          <input type="checkbox" v-model="model.showUIEntities" />
          <span class="field__label">Show UI Entities</span>
        </label>
      </template>
    </div>

    <div class="form__section">
      <div class="form__section-title">Viewport Border</div>
      <label class="field field--row">
        <input type="checkbox" v-model="model.showBorder" />
        <span class="field__label">Show camera border</span>
      </label>

      <template v-if="model.showBorder">
        <label class="field">
          <span class="field__label">Border Color</span>
          <input class="field__input" type="color" v-model="model.borderColor" />
        </label>

        <div class="grid2">
          <label class="field">
            <span class="field__label">Border Width</span>
            <input class="field__input" type="number" step="1" min="0" v-model.number="model.borderWidth" />
          </label>
          <label class="field">
            <span class="field__label">Border Alpha</span>
            <input class="field__input" type="number" step="0.05" min="0" max="1" v-model.number="model.borderAlpha" />
          </label>
        </div>
      </template>
    </div>

    <label class="field field--row">
      <input type="checkbox" v-model="model.createDefaultController" />
      <span class="field__label">Create default controller (5213 movement, Numpad +/- zoom, Tab to switch)</span>
    </label>
  </div>
</template>

<script setup>
defineProps({
  canvases: Array,
  worlds: Array,
  gameEntities: Array
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
.form__section { padding: 10px; border-radius: 8px; background: rgba(79, 195, 247, 0.05); border: 1px solid rgba(79, 195, 247, 0.15); }
.form__section-title { font-weight: 700; font-size: 13px; color: #bfe7ff; margin-bottom: 8px; }
</style>
