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
defineProps({
  world: Object
});
</script>

<style scoped>
.inspector { padding: 12px; }
.inspector__title { font-weight: 800; margin-bottom: 10px; }
.kv { display: grid; gap: 6px; }
.kv__title { font-weight: 700; font-size: 12px; color: #4fc3f7; margin-bottom: 4px; }
.kv__row { display: grid; grid-template-columns: 110px 1fr; gap: 10px; font-size: 13px; }
.kv__k { color: rgba(255,255,255, 0.55); }
.kv__v { color: rgba(255,255,255, 0.90); word-break: break-word; }
</style>
