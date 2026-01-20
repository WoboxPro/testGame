<template>
  <main class="viewport">
    <div class="viewport__header">
      <div class="viewport__title">Viewport</div>
      <div class="viewport__hint">Wheel = Zoom (selected camera) • WASD = Pan (selected camera)</div>
    </div>

    <div v-if="canvases.length === 0" class="viewport__empty">
      Add a Canvas to start rendering.
    </div>

    <div class="canvas-grid">
      <div v-for="c in canvases" :key="c.id" class="canvas-card">
        <div class="canvas-card__header">
          <div class="canvas-card__title">{{ c.id }}</div>
          <div class="canvas-card__meta">{{ c.width }}×{{ c.height }}</div>
        </div>
        <div class="canvas-card__body">
          <div :ref="(el) => emitCanvasHost(c.id, el)" class="canvas-host" />
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
const props = defineProps({
  canvases: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['canvasHost']);

function emitCanvasHost(id, el) {
  emit('canvasHost', id, el);
}
</script>

<style scoped>
.viewport {
  background: #242424;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  overflow: hidden;
  min-height: calc(100vh - 52px - 24px);
  display: flex;
  flex-direction: column;
}
.viewport__header {
  padding: 10px 12px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.viewport__title { font-weight: 800; color: #d9f4ff; }
.viewport__hint { font-size: 12px; color: rgba(255, 255, 255, 0.55); }
.viewport__empty {
  padding: 20px;
  color: rgba(255, 255, 255, 0.65);
}

.canvas-grid {
  padding: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 12px;
}
.canvas-card {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.12);
  overflow: hidden;
}
.canvas-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.canvas-card__title { font-weight: 700; }
.canvas-card__meta { font-size: 12px; color: rgba(255, 255, 255, 0.55); }
.canvas-card__body { padding: 10px; }
.canvas-host {
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 8px;
  overflow: hidden;
  display: inline-block;
}
</style>
