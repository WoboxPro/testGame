<template>
  <div class="inspector">
    <div class="inspector__title">Canvas: {{ canvas.id }}</div>
    <div class="kv">
      <div class="kv__row"><div class="kv__k">Mode</div><div class="kv__v">{{ canvas.sizeMode }}</div></div>
      <div class="kv__row"><div class="kv__k">Size</div><div class="kv__v">{{ canvas.width }}×{{ canvas.height }}</div></div>
      <div class="kv__row"><div class="kv__k">Background</div><div class="kv__v">{{ canvas.backgroundColor }}</div></div>
      <div class="kv__row"><div class="kv__k">Cameras</div><div class="kv__v">{{ cameraCount }}</div></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  canvas: Object,
  cameras: Array
});

const cameraCount = computed(() => props.cameras.filter(x => x.canvasId === props.canvas.id).length);
</script>

<style scoped>
.inspector { padding: 12px; }
.inspector__title { font-weight: 800; margin-bottom: 10px; }
.kv { display: grid; gap: 6px; }
.kv__row { display: grid; grid-template-columns: 110px 1fr; gap: 10px; font-size: 13px; }
.kv__k { color: rgba(255,255,255, 0.55); }
.kv__v { color: rgba(255,255,255, 0.90); word-break: break-word; }
</style>
