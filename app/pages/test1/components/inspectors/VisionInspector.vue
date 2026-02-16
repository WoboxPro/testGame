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

    <div class="inspector__section inspector__section--detection">
      <div class="inspector__section-title">🎯 Entity Detection</div>
      <label class="field field--row">
        <input type="checkbox" v-model="visionUi.detectEntities" @change="applyVisionUi" />
        <span class="field__label">Detect Entities</span>
      </label>
      
      <template v-if="visionUi.detectEntities">
        <div class="inspector__subsection-title">Типы для детекции:</div>
        <label class="field field--row">
          <input type="checkbox" v-model="visionUi.detectUnit" @change="applyVisionUi" />
          <span class="field__label">Unit (юниты)</span>
        </label>
        <label class="field field--row">
          <input type="checkbox" v-model="visionUi.detectBuild" @change="applyVisionUi" />
          <span class="field__label">Build (здания)</span>
        </label>
        <label class="field field--row">
          <input type="checkbox" v-model="visionUi.detectProp" @change="applyVisionUi" />
          <span class="field__label">Prop (пропсы)</span>
        </label>
        <label class="field field--row">
          <input type="checkbox" v-model="visionUi.detectProjectile" @change="applyVisionUi" />
          <span class="field__label">Projectile (пули)</span>
        </label>
      </template>
    </div>

    <div class="inspector__section inspector__section--detected" v-if="visionUi.detectEntities && detectedEntities.length > 0">
      <div class="inspector__section-title">👁️ Detected ({{ detectedEntities.length }})</div>
      <div v-for="entity in detectedEntities" :key="entity.id" class="detected-item">
        <span class="detected-item__id">{{ entity.id }}</span>
        <span class="detected-item__type">{{ entity.type }}</span>
        <span class="detected-item__dist">{{ entity.distance }}px</span>
      </div>
    </div>

    <div class="inspector__section inspector__section--hiding">
      <div class="inspector__section-title">🙈 Fog of War</div>
      <label class="field field--row">
        <input type="checkbox" v-model="visionUi.hideOutOfVision" @change="applyVisionUi" />
        <span class="field__label">Hide Out of Vision</span>
      </label>
      
      <template v-if="visionUi.hideOutOfVision">
        <div class="inspector__subsection-title">Скрывать типы:</div>
        <label class="field field--row">
          <input type="checkbox" v-model="visionUi.hideUnit" @change="applyVisionUi" />
          <span class="field__label">Unit (юниты)</span>
        </label>
        <label class="field field--row">
          <input type="checkbox" v-model="visionUi.hideBuild" @change="applyVisionUi" />
          <span class="field__label">Build (здания)</span>
        </label>
        <label class="field field--row">
          <input type="checkbox" v-model="visionUi.hideProp" @change="applyVisionUi" />
          <span class="field__label">Prop (пропсы)</span>
        </label>
        <label class="field field--row">
          <input type="checkbox" v-model="visionUi.hideProjectile" @change="applyVisionUi" />
          <span class="field__label">Projectile (пули)</span>
        </label>
      </template>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch, computed } from 'vue';

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
  debugColor: props.vision.debugColor || '#00FF00',
  detectEntities: props.vision.detectEntities || false,
  detectUnit: props.vision.detectTypes?.includes('unit') ?? true,
  detectBuild: props.vision.detectTypes?.includes('build') ?? false,
  detectProp: props.vision.detectTypes?.includes('prop') ?? false,
  detectProjectile: props.vision.detectTypes?.includes('projectile') ?? false,
  hideOutOfVision: props.vision.hideOutOfVision || false,
  hideUnit: props.vision.hideTypes?.includes('unit') ?? true,
  hideBuild: props.vision.hideTypes?.includes('build') ?? false,
  hideProp: props.vision.hideTypes?.includes('prop') ?? false,
  hideProjectile: props.vision.hideTypes?.includes('projectile') ?? false
});

const detectedEntities = computed(() => {
  return props.vision.instance?.visibleEntities || [];
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
  visionUi.detectEntities = newVision.detectEntities || false;
  visionUi.detectUnit = newVision.detectTypes?.includes('unit') ?? true;
  visionUi.detectBuild = newVision.detectTypes?.includes('build') ?? false;
  visionUi.detectProp = newVision.detectTypes?.includes('prop') ?? false;
  visionUi.detectProjectile = newVision.detectTypes?.includes('projectile') ?? false;
  visionUi.hideOutOfVision = newVision.hideOutOfVision || false;
  visionUi.hideUnit = newVision.hideTypes?.includes('unit') ?? true;
  visionUi.hideBuild = newVision.hideTypes?.includes('build') ?? false;
  visionUi.hideProp = newVision.hideTypes?.includes('prop') ?? false;
  visionUi.hideProjectile = newVision.hideTypes?.includes('projectile') ?? false;
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
  instance.detectEntities = visionUi.detectEntities;
  
  const detectTypes = [];
  if (visionUi.detectUnit) detectTypes.push('unit');
  if (visionUi.detectBuild) detectTypes.push('build');
  if (visionUi.detectProp) detectTypes.push('prop');
  if (visionUi.detectProjectile) detectTypes.push('projectile');
  if (detectTypes.length === 0) detectTypes.push('unit');
  instance.detectTypes = detectTypes;

  instance.hideOutOfVision = visionUi.hideOutOfVision;
  
  const hideTypes = [];
  if (visionUi.hideUnit) hideTypes.push('unit');
  if (visionUi.hideBuild) hideTypes.push('build');
  if (visionUi.hideProp) hideTypes.push('prop');
  if (visionUi.hideProjectile) hideTypes.push('projectile');
  if (hideTypes.length === 0) hideTypes.push('unit');
  instance.hideTypes = hideTypes;

  emit('apply', {
    shape: visionUi.shape,
    range: visionUi.range,
    fovAngle: visionUi.fovAngle,
    direction: { x: visionUi.directionX, y: visionUi.directionY },
    directionMode: visionUi.directionMode,
    showDebug: visionUi.showDebug,
    debugColor: visionUi.debugColor,
    detectEntities: visionUi.detectEntities,
    detectTypes: detectTypes,
    hideOutOfVision: visionUi.hideOutOfVision,
    hideTypes: hideTypes
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

.inspector__section--detection {
  background: rgba(255, 100, 100, 0.05);
  border: 1px solid rgba(255, 100, 100, 0.15);
}

.inspector__section--detection .inspector__section-title {
  color: #ff6464;
}

.inspector__section--detected {
  background: rgba(255, 200, 0, 0.05);
  border: 1px solid rgba(255, 200, 0, 0.15);
}

.inspector__section--detected .inspector__section-title {
  color: #ffc800;
}

.inspector__subsection-title {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 4px;
  margin-top: 4px;
}

.detected-item {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 11px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.detected-item:last-child {
  border-bottom: none;
}

.detected-item__id {
  color: rgba(255, 255, 255, 0.9);
  font-family: monospace;
}

.detected-item__type {
  color: rgba(255, 200, 0, 0.8);
}

.detected-item__dist {
  color: rgba(255, 255, 255, 0.6);
}

.inspector__section--hiding {
  background: rgba(128, 100, 255, 0.05);
  border: 1px solid rgba(128, 100, 255, 0.15);
}

.inspector__section--hiding .inspector__section-title {
  color: #8064ff;
}
</style>
