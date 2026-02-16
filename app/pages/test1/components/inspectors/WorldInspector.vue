<template>
  <div class="inspector">
    <div class="inspector__title">World: {{ world.id }}</div>
    <div class="kv">
      <div class="kv__row"><div class="kv__k">Type</div><div class="kv__v">{{ world.type }}</div></div>
      <div class="kv__row"><div class="kv__k">Size</div><div class="kv__v">{{ world.width }}×{{ world.height }}</div></div>
      <div class="kv__row"><div class="kv__k">Show Bounds</div><div class="kv__v">{{ world.instance.showBounds ? 'enabled' : 'disabled' }}</div></div>
      <div class="kv__row" v-if="world.instance.showBounds"><div class="kv__k">Bounds Color</div><div class="kv__v">{{ world.instance.boundsColor }}</div></div>
      <div class="kv__row"><div class="kv__k">Background</div><div class="kv__v">{{ world.backgroundColor }}</div></div>
      <div class="kv__row" v-if="world.instance.backgroundTexture?.textureUrl"><div class="kv__k">Texture</div><div class="kv__v">{{ world.instance.backgroundTexture.textureUrl }}</div></div>
      <div class="kv__row" v-if="world.instance.backgroundTexture?.textureUrl"><div class="kv__k">Scale Mode</div><div class="kv__v">{{ world.instance.backgroundTexture.scaleMode }}</div></div>
      <div class="kv__row"><div class="kv__k">Entities</div><div class="kv__v">{{ world.instance.entities.size }}</div></div>
    </div>

    <!-- 💡 Lighting System -->
    <div class="kv" style="margin-top: 12px;">
      <div class="kv__title kv__title--lighting">💡 Lighting System</div>
      
      <label class="kv__row kv__row--checkbox">
        <input type="checkbox" :checked="lightingEnabled" @change="toggleLighting" />
        <span class="kv__v">{{ lightingEnabled ? 'enabled' : 'disabled' }}</span>
      </label>

      <template v-if="lightingEnabled && world.instance.lightingSystem">
        <div class="kv__subsection">
          <div class="kv__subsection-title">Ambient (базовый)</div>
          <div class="kv__slider-row">
            <span class="kv__k">Яркость</span>
            <input type="range" min="0" max="1" step="0.05" :value="ambientIntensity" @input="updateAmbient" />
            <span class="kv__v">{{ ambientIntensity.toFixed(2) }}</span>
          </div>
        </div>

        <div class="kv__subsection">
          <div class="kv__subsection-title">Global (направленный)</div>
          <label class="kv__row kv__row--checkbox">
            <input type="checkbox" :checked="globalEnabled" @change="toggleGlobal" />
            <span class="kv__v">{{ globalEnabled ? 'enabled' : 'disabled' }}</span>
          </label>
          
          <template v-if="globalEnabled">
            <div class="kv__slider-row">
              <span class="kv__k">Яркость</span>
              <input type="range" min="0" max="1" step="0.05" :value="globalIntensity" @input="updateGlobal" />
              <span class="kv__v">{{ globalIntensity.toFixed(2) }}</span>
            </div>
            <div class="kv__slider-row">
              <span class="kv__k">Угол</span>
              <input type="range" min="0" max="360" step="15" :value="globalAngle" @input="updateAngle" />
              <span class="kv__v">{{ globalAngle }}° ({{ angleDescription }})</span>
            </div>
          </template>
        </div>
      </template>
    </div>

    <!-- ⬡ Hex Tile System -->
    <div v-if="world.instance.hexTileSystem" class="kv" style="margin-top: 12px;">
      <div class="kv__title">⬡ Hex Tile System</div>
      <div class="kv__row"><div class="kv__k">Orientation</div><div class="kv__v">{{ world.instance.hexTileSystem.orientation }}</div></div>
      <div class="kv__row"><div class="kv__k">Hex Size</div><div class="kv__v">{{ world.instance.hexTileSystem.hexSize }}px</div></div>
      <div class="kv__row"><div class="kv__k">Show Grid</div><div class="kv__v">{{ world.instance.hexTileSystem.showGrid ? 'enabled' : 'disabled' }}</div></div>
      <div class="kv__row" v-if="world.instance.hexTileSystem.showGrid"><div class="kv__k">Grid Color</div><div class="kv__v">{{ world.instance.hexTileSystem.gridColor }}</div></div>
      <div class="kv__row"><div class="kv__k">Tiles Count</div><div class="kv__v">{{ world.instance.hexTileSystem.tiles.size }}</div></div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';

const props = defineProps({
  world: Object
});

const emit = defineEmits(['update-lighting']);

// Локальные ref для реактивности
const lightingEnabled = ref(false);
const ambientIntensity = ref(0.1);
const globalEnabled = ref(false);
const globalIntensity = ref(0.5);
const globalAngle = ref(45);

// Синхронизируем при изменении world
watch(() => props.world, (world) => {
  if (world?.instance?.lightingSystem) {
    const ls = world.instance.lightingSystem;
    lightingEnabled.value = ls.enabled;
    ambientIntensity.value = ls.ambientIntensity;
    globalEnabled.value = ls.globalEnabled;
    globalIntensity.value = ls.globalIntensity;
    globalAngle.value = ls.globalAngle;
  } else {
    lightingEnabled.value = false;
    globalEnabled.value = false;
  }
}, { immediate: true });

const angleDescription = computed(() => {
  const a = globalAngle.value;
  if (a >= 337.5 || a < 22.5) return 'сверху';
  if (a >= 22.5 && a < 67.5) return 'сверху-справа';
  if (a >= 67.5 && a < 112.5) return 'справа';
  if (a >= 112.5 && a < 157.5) return 'снизу-справа';
  if (a >= 157.5 && a < 202.5) return 'снизу';
  if (a >= 202.5 && a < 247.5) return 'снизу-слева';
  if (a >= 247.5 && a < 292.5) return 'слева';
  if (a >= 292.5 && a < 337.5) return 'сверху-слева';
  return 'сверху';
});

function toggleLighting(e) {
  const enabled = e.target.checked;
  lightingEnabled.value = enabled;
  if (props.world.instance.lightingSystem) {
    props.world.instance.lightingSystem.setEnabled(enabled);
  }
}

function toggleGlobal(e) {
  const enabled = e.target.checked;
  globalEnabled.value = enabled;
  if (props.world.instance.lightingSystem) {
    props.world.instance.lightingSystem.setGlobalEnabled(enabled);
  }
}

function updateAmbient(e) {
  const val = parseFloat(e.target.value);
  ambientIntensity.value = val;
  if (props.world.instance.lightingSystem) {
    props.world.instance.lightingSystem.setAmbientIntensity(val);
  }
}

function updateGlobal(e) {
  const val = parseFloat(e.target.value);
  globalIntensity.value = val;
  if (props.world.instance.lightingSystem) {
    props.world.instance.lightingSystem.setGlobalIntensity(val);
  }
}

function updateAngle(e) {
  const val = parseFloat(e.target.value);
  globalAngle.value = val;
  if (props.world.instance.lightingSystem) {
    props.world.instance.lightingSystem.setGlobalAngle(val);
  }
}
</script>

<style scoped>
.inspector { padding: 12px; }
.inspector__title { font-weight: 800; margin-bottom: 10px; }
.kv { display: grid; gap: 6px; }
.kv__title { font-weight: 700; font-size: 12px; color: #4fc3f7; margin-bottom: 4px; }
.kv__title--lighting { color: #ffd54f; }
.kv__row { display: grid; grid-template-columns: 110px 1fr; gap: 10px; font-size: 13px; }
.kv__row--checkbox { grid-template-columns: 18px 1fr; cursor: pointer; }
.kv__row--checkbox input { width: 14px; height: 14px; cursor: pointer; }
.kv__k { color: rgba(255,255,255, 0.55); }
.kv__v { color: rgba(255,255,255, 0.90); word-break: break-word; }
.kv__subsection { padding: 8px; margin-top: 6px; border-radius: 6px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); }
.kv__subsection-title { font-weight: 600; font-size: 11px; color: rgba(255, 255, 255, 0.6); margin-bottom: 6px; }
.kv__slider-row { display: grid; grid-template-columns: 70px 1fr 60px; gap: 8px; align-items: center; font-size: 12px; }
.kv__slider-row input[type="range"] { height: 6px; cursor: pointer; background: rgba(255, 255, 255, 0.1); border-radius: 3px; }
</style>
