<template>
  <div class="inspector__content">
    <div class="inspector__title">💡 Light: {{ light.id }}</div>

    <div class="kv">
      <div class="kv__row"><div class="kv__k">Shape</div><div class="kv__v">{{ light.instance?.shape }}</div></div>
      <div class="kv__row"><div class="kv__k">Radius</div><div class="kv__v">{{ light.instance?.radius }}px</div></div>
      <div class="kv__row"><div class="kv__k">Falloff</div><div class="kv__v">{{ light.instance?.falloffRadius }}px</div></div>
      <div class="kv__row"><div class="kv__k">Intensity</div><div class="kv__v">{{ (light.instance?.intensity ?? 0).toFixed(2) }}</div></div>
      <div class="kv__row"><div class="kv__k">Tint</div><div class="kv__v">{{ light.instance?.tint || 'none' }}</div></div>
      <template v-if="light.instance?.shape === 'arc'">
        <div class="kv__row"><div class="kv__k">FOV</div><div class="kv__v">{{ light.instance?.fovAngle }}°</div></div>
        <div class="kv__row"><div class="kv__k">Dir</div><div class="kv__v">({{ light.instance?.direction?.x }}, {{ light.instance?.direction?.y }})</div></div>
        <div class="kv__row"><div class="kv__k">Mode</div><div class="kv__v">{{ light.instance?.directionMode }}</div></div>
      </template>
    </div>

    <div class="inspector__section">
      <div class="inspector__section-title">Light Settings</div>

      <label class="field">
        <span class="field__label">Shape</span>
        <select class="field__input" v-model="ui.shape" @change="apply">
          <option value="circle">Circle</option>
          <option value="arc">Arc</option>
        </select>
      </label>

      <div class="grid2">
        <label class="field">
          <span class="field__label">Radius</span>
          <input class="field__input" type="number" step="10" min="0" v-model.number="ui.radius" @input="apply" />
        </label>
        <label class="field">
          <span class="field__label">Falloff</span>
          <input class="field__input" type="number" step="10" min="0" v-model.number="ui.falloffRadius" @input="apply" />
        </label>
      </div>

      <label class="field">
        <span class="field__label">Intensity ({{ ui.intensity.toFixed(2) }})</span>
        <input type="range" min="0" max="1" step="0.01" v-model.number="ui.intensity" @input="apply" />
      </label>
    </div>

    <div class="inspector__section inspector__section--tint">
      <div class="inspector__section-title">Tint</div>
      <label class="field field--row">
        <input type="checkbox" v-model="ui.tintEnabled" @change="apply" />
        <span class="field__label">Enable tint</span>
      </label>
      <div class="color-input-wrapper" v-if="ui.tintEnabled">
        <input type="color" v-model="ui.tint" @input="apply" class="color-input" />
        <input type="text" v-model.trim="ui.tint" @input="apply" class="field__input color-text" />
      </div>
    </div>

    <div class="inspector__section" v-if="ui.shape === 'arc'">
      <div class="inspector__section-title">Arc</div>

      <label class="field">
        <span class="field__label">FOV Angle ({{ ui.fovAngle }}°)</span>
        <input type="range" min="1" max="360" step="5" v-model.number="ui.fovAngle" @input="apply" />
      </label>

      <div class="grid2">
        <label class="field">
          <span class="field__label">Dir X</span>
          <input class="field__input" type="number" step="0.1" v-model.number="ui.directionX" @input="apply" />
        </label>
        <label class="field">
          <span class="field__label">Dir Y</span>
          <input class="field__input" type="number" step="0.1" v-model.number="ui.directionY" @input="apply" />
        </label>
      </div>

      <label class="field">
        <span class="field__label">Direction Mode</span>
        <select class="field__input" v-model="ui.directionMode" @change="apply">
          <option value="relative">Relative</option>
          <option value="static">Static</option>
        </select>
      </label>
    </div>

    <div class="inspector__section">
      <div class="inspector__section-title">Debug</div>
      <label class="field field--row">
        <input type="checkbox" v-model="ui.showDebug" @change="apply" />
        <span class="field__label">Show debug</span>
      </label>
      <div class="color-input-wrapper">
        <input type="color" v-model="ui.debugColor" @input="apply" class="color-input" />
        <input type="text" v-model.trim="ui.debugColor" @input="apply" class="field__input color-text" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue';

const props = defineProps({
  light: { type: Object, required: true }
});

const emit = defineEmits(['apply']);

const ui = reactive({
  shape: props.light.instance?.shape || 'circle',
  radius: Number(props.light.instance?.radius) || 220,
  falloffRadius: Number(props.light.instance?.falloffRadius) || 140,
  intensity: Math.max(0, Math.min(1, Number(props.light.instance?.intensity) || 1)),
  tintEnabled: props.light.instance?.tint != null && props.light.instance?.tint !== '',
  tint: props.light.instance?.tint || '#FF6600',
  fovAngle: Number(props.light.instance?.fovAngle) || 90,
  directionX: props.light.instance?.direction?.x ?? 1,
  directionY: props.light.instance?.direction?.y ?? 0,
  directionMode: props.light.instance?.directionMode || 'relative',
  showDebug: props.light.instance?.showDebug !== false,
  debugColor: props.light.instance?.debugColor || '#FFD54F'
});

watch(
  () => props.light,
  (l) => {
    ui.shape = l.instance?.shape || 'circle';
    ui.radius = Number(l.instance?.radius) || 220;
    ui.falloffRadius = Number(l.instance?.falloffRadius) || 140;
    ui.intensity = Math.max(0, Math.min(1, Number(l.instance?.intensity) || 1));
    ui.tintEnabled = l.instance?.tint != null && l.instance?.tint !== '';
    ui.tint = l.instance?.tint || '#FF6600';
    ui.fovAngle = Number(l.instance?.fovAngle) || 90;
    ui.directionX = l.instance?.direction?.x ?? 1;
    ui.directionY = l.instance?.direction?.y ?? 0;
    ui.directionMode = l.instance?.directionMode || 'relative';
    ui.showDebug = l.instance?.showDebug !== false;
    ui.debugColor = l.instance?.debugColor || '#FFD54F';
  },
  { deep: true }
);

function apply() {
  const instance = props.light.instance;
  if (!instance) return;

  instance.shape = ui.shape;
  instance.radius = Math.max(0, Number(ui.radius) || 0);
  instance.falloffRadius = Math.max(0, Number(ui.falloffRadius) || 0);
  instance.intensity = Math.max(0, Math.min(1, Number(ui.intensity) || 0));
  instance.tint = ui.tintEnabled ? (ui.tint?.trim() || '#FF6600') : null;

  instance.fovAngle = Math.max(1, Math.min(360, Number(ui.fovAngle) || 90));
  instance.direction = { x: Number(ui.directionX) || 0, y: Number(ui.directionY) || 0 };
  instance.directionMode = ui.directionMode || 'relative';

  instance.showDebug = ui.showDebug;
  instance.debugColor = ui.debugColor?.trim() || '#FFD54F';

  emit('apply', {
    shape: instance.shape,
    radius: instance.radius,
    falloffRadius: instance.falloffRadius,
    intensity: instance.intensity,
    tint: instance.tint,
    fovAngle: instance.fovAngle,
    direction: instance.direction,
    directionMode: instance.directionMode,
    showDebug: instance.showDebug,
    debugColor: instance.debugColor
  });
}
</script>

<style scoped>
.inspector__content { padding: 12px; display: grid; gap: 12px; }
.inspector__title { font-weight: 800; color: #ffd54f; }
.kv { display: grid; gap: 6px; }
.kv__row { display: grid; grid-template-columns: 110px 1fr; gap: 10px; font-size: 13px; }
.kv__k { color: rgba(255,255,255, 0.55); }
.kv__v { color: rgba(255,255,255, 0.90); word-break: break-word; font-family: monospace; }
.inspector__section {
  padding: 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: grid;
  gap: 10px;
}
.inspector__section--tint {
  background: rgba(255, 120, 80, 0.05);
  border: 1px solid rgba(255, 120, 80, 0.15);
}
.inspector__section-title { font-weight: 700; font-size: 13px; color: rgba(255, 255, 255, 0.85); }
.field { display: grid; gap: 6px; }
.field--row { grid-auto-flow: column; align-items: center; justify-content: start; gap: 10px; }
.field__label { font-weight: 600; font-size: 13px; color: rgba(255, 255, 255, 0.75); }
.field__input {
  height: 36px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(0, 0, 0, 0.22);
  color: rgba(255, 255, 255, 0.92);
}
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.color-input { height: 40px; padding: 2px; cursor: pointer; border-radius: 8px; border: 1px solid rgba(255,255,255,0.10); background: rgba(0,0,0,0.22); }
.color-input-wrapper { display: grid; grid-template-columns: 50px 1fr; gap: 8px; align-items: center; }
.color-text { font-family: monospace; text-transform: uppercase; }
</style>

