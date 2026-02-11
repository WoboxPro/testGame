<template>
  <div class="inspector__content">
    <div class="inspector__title">👁️ Vision: {{ vision.id }}</div>
    <div class="kv">
      <div class="kv__row"><div class="kv__k">Shape</div><div class="kv__v">{{ vision.shape }}</div></div>
      <div class="kv__row"><div class="kv__k">Range</div><div class="kv__v">{{ vision.range }}px</div></div>
      <div class="kv__row" v-if="vision.shape === 'arc'"><div class="kv__k">FOV Angle</div><div class="kv__v">{{ vision.fovAngle }}°</div></div>
      <div class="kv__row" v-if="vision.shape === 'arc'"><div class="kv__k">Direction</div><div class="kv__v">({{ vision.direction?.x }}, {{ vision.direction?.y }})</div></div>
      <div class="kv__row" v-if="vision.shape === 'arc'"><div class="kv__k">Direction Mode</div><div class="kv__v">{{ vision.directionMode }}</div></div>
    </div>

    <div class="inspector__section">
      <div class="inspector__section-title">Edit Shape</div>
      <label class="field">
        <span class="field__label">Shape</span>
        <select class="field__input" v-model="visionUi.shape" @change="applyVisionUi">
          <option value="arc">Arc (сектор)</option>
          <option value="circle">Circle (круг 360°)</option>
        </select>
      </label>

      <label class="field">
        <span class="field__label">Range ({{ visionUi.range }}px)</span>
        <input
          type="range"
          min="1"
          max="2000"
          step="10"
          v-model.number="visionUi.range"
          @input="applyVisionUi"
        />
      </label>
    </div>

    <div class="inspector__section" v-if="visionUi.shape === 'arc'">
      <div class="inspector__section-title">Direction Settings</div>

      <label class="field">
        <span class="field__label">FOV Angle ({{ visionUi.fovAngle }}°)</span>
        <input
          type="range"
          min="1"
          max="360"
          step="5"
          v-model.number="visionUi.fovAngle"
          @input="applyVisionUi"
        />
      </label>

      <div class="grid2">
        <label class="field">
          <span class="field__label">Dir X</span>
          <input class="field__input" type="number" step="0.1" v-model.number="visionUi.directionX" @input="applyVisionUi" />
        </label>
        <label class="field">
          <span class="field__label">Dir Y</span>
          <input class="field__input" type="number" step="0.1" v-model.number="visionUi.directionY" @input="applyVisionUi" />
        </label>
      </div>

      <label class="field">
        <span class="field__label">Direction Mode</span>
        <select class="field__input" v-model="visionUi.directionMode" @change="applyVisionUi">
          <option value="relative">Relative (вместе с родителем)</option>
          <option value="static">Static (фиксированный)</option>
        </select>
      </label>
    </div>

    <div class="inspector__section">
      <div class="inspector__section-title">Debug Visualization</div>
      <label class="field field--row">
        <input type="checkbox" v-model="visionUi.showDebug" @change="applyVisionUi" />
        <span class="field__label">Show Debug</span>
      </label>
      <label class="field">
        <span class="field__label">Debug Color</span>
        <div class="color-input-wrapper">
          <input type="color" v-model="visionUi.debugColor" class="color-input" @input="applyVisionUi" />
          <input type="text" v-model.trim="visionUi.debugColor" class="field__input color-text" @input="applyVisionUi" />
        </div>
      </label>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue';

const props = defineProps({
  vision: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['apply']);

const visionUi = reactive({
  shape: props.vision.shape || 'arc',
  range: props.vision.range || 500,
  fovAngle: props.vision.fovAngle || 90,
  directionX: props.vision.direction?.x || 1,
  directionY: props.vision.direction?.y || 0,
  directionMode: props.vision.directionMode || 'relative',
  showDebug: props.vision.showDebug !== false,
  debugColor: props.vision.debugColor || '#00FF00'
});

watch(() => props.vision, (newVision) => {
  visionUi.shape = newVision.shape || 'arc';
  visionUi.range = newVision.range || 500;
  visionUi.fovAngle = newVision.fovAngle || 90;
  visionUi.directionX = newVision.direction?.x || 1;
  visionUi.directionY = newVision.direction?.y || 0;
  visionUi.directionMode = newVision.directionMode || 'relative';
  visionUi.showDebug = newVision.showDebug !== false;
  visionUi.debugColor = newVision.debugColor || '#00FF00';
}, { deep: true });

function applyVisionUi() {
  const instance = props.vision.instance;
  if (!instance) return;

  instance.shape = visionUi.shape;
  instance.range = visionUi.range;
  instance.fovAngle = visionUi.fovAngle;
  instance.direction = { x: visionUi.directionX, y: visionUi.directionY };
  instance.directionMode = visionUi.directionMode;
  instance.showDebug = visionUi.showDebug;
  instance.debugColor = visionUi.debugColor;

  emit('apply', {
    shape: visionUi.shape,
    range: visionUi.range,
    fovAngle: visionUi.fovAngle,
    direction: { x: visionUi.directionX, y: visionUi.directionY },
    directionMode: visionUi.directionMode,
    showDebug: visionUi.showDebug,
    debugColor: visionUi.debugColor
  });
}
</script>

<style scoped>
.inspector__content {
  padding: 10px;
}

.inspector__title {
  font-weight: 700;
  font-size: 14px;
  margin-bottom: 12px;
  color: #00ff88;
}

.kv {
  margin-bottom: 12px;
}

.kv__row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 12px;
}

.kv__k {
  color: rgba(255, 255, 255, 0.6);
}

.kv__v {
  color: rgba(255, 255, 255, 0.9);
  font-family: monospace;
}

.inspector__section {
  margin-top: 12px;
  padding: 10px;
  border-radius: 8px;
  background: rgba(0, 255, 0, 0.05);
  border: 1px solid rgba(0, 255, 0, 0.15);
}

.inspector__section-title {
  font-weight: 700;
  font-size: 12px;
  color: #00ff88;
  margin-bottom: 8px;
}

.field {
  display: grid;
  gap: 4px;
  margin-bottom: 8px;
}

.field--row {
  grid-auto-flow: column;
  align-items: center;
  justify-content: start;
  gap: 8px;
}

.field__label {
  font-weight: 600;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
}

.field__input {
  height: 32px;
  padding: 0 8px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(0, 0, 0, 0.22);
  color: rgba(255, 255, 255, 0.92);
  font-size: 12px;
}

.field__input:focus {
  outline: 2px solid rgba(0, 255, 0, 0.25);
  border-color: rgba(0, 255, 0, 0.30);
}

.grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.color-input-wrapper {
  display: grid;
  grid-template-columns: 40px 1fr;
  gap: 6px;
}

.color-input {
  height: 32px;
  width: 100%;
  padding: 2px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(0, 0, 0, 0.22);
  cursor: pointer;
}

.color-text {
  font-family: monospace;
  text-transform: uppercase;
}
</style>
