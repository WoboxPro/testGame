<template>
  <div class="tree">
    <!-- Worlds Section -->
    <div class="tree__section">
      <div class="tree__title">Worlds</div>
      <div class="tree__actions">
        <button class="tree__add" @click="$emit('add', 'world')">+ Add</button>
        <button class="tree__json" @click="$emit('json', 'world')" title="Export JSON">{ }</button>
      </div>
    </div>
    <div v-if="worlds.length === 0" class="tree__empty">No worlds</div>
    <div
      v-for="w in worlds"
      :key="w.id"
      class="tree__item"
      :class="{ 'is-selected': selected?.type === 'world' && selected?.id === w.id }"
      @click="$emit('select', { type: 'world', id: w.id })"
    >
      <span class="tree__name">{{ w.id }}</span>
      <button class="tree__delete" title="Delete" @click.stop="$emit('delete', 'world', w.id)">×</button>
    </div>

    <!-- Canvases Section -->
    <div class="tree__section">
      <div class="tree__title">Canvases</div>
      <div class="tree__actions">
        <button class="tree__add" @click="$emit('add', 'canvas')">+ Add</button>
        <button class="tree__json" @click="$emit('json', 'canvas')" title="Export JSON">{ }</button>
      </div>
    </div>
    <div v-if="canvases.length === 0" class="tree__empty">No canvases</div>
    <div
      v-for="c in canvases"
      :key="c.id"
      class="tree__item"
      :class="{ 'is-selected': selected?.type === 'canvas' && selected?.id === c.id }"
      @click="$emit('select', { type: 'canvas', id: c.id })"
    >
      <span class="tree__name">{{ c.id }}</span>
      <span class="tree__meta">{{ c.width }}×{{ c.height }}</span>
      <button class="tree__delete" title="Delete" @click.stop="$emit('delete', 'canvas', c.id)">×</button>
    </div>

    <!-- Cameras Section -->
    <div class="tree__section">
      <div class="tree__title">Cameras</div>
      <div class="tree__actions">
        <button class="tree__add" :disabled="worlds.length === 0 || canvases.length === 0" @click="$emit('add', 'camera')">+ Add</button>
        <button class="tree__json" @click="$emit('json', 'camera')" title="Export JSON">{ }</button>
      </div>
    </div>
    <div v-if="cameras.length === 0" class="tree__empty">No cameras</div>
    <div
      v-for="cam in cameras"
      :key="cam.id"
      class="tree__item"
      :class="{ 'is-selected': selected?.type === 'camera' && selected?.id === cam.id }"
      @click="$emit('select', { type: 'camera', id: cam.id })"
    >
      <span class="tree__name">{{ cam.id }}</span>
      <span class="tree__meta">{{ cam.canvasId }}</span>
      <button class="tree__delete" title="Delete" @click.stop="$emit('delete', 'camera', cam.id)">×</button>
    </div>

    <!-- UI Section -->
    <div class="tree__section">
      <div class="tree__title">UI</div>
      <div class="tree__actions">
        <div class="tree__add-group">
          <button class="tree__add" :disabled="canvases.length === 0 && cameras.length === 0 && worlds.length === 0" @click="$emit('add', 'ui_text')">+ Text</button>
          <button class="tree__add" :disabled="canvases.length === 0 && cameras.length === 0 && worlds.length === 0" @click="$emit('add', 'ui_button')">+ Button</button>
        </div>
        <button class="tree__json" @click="$emit('json', 'ui')" title="Export JSON">{ }</button>
      </div>
    </div>
    <div v-if="uiEntities.length === 0" class="tree__empty">No UI</div>
    <div
      v-for="u in uiEntities"
      :key="u.id"
      class="tree__item"
      :class="{ 'is-selected': selected?.type === 'ui' && selected?.id === u.id }"
      @click="$emit('select', { type: 'ui', id: u.id })"
    >
      <span class="tree__name">{{ u.id }}</span>
      <span class="tree__meta">{{ u.subtype }} • {{ u.bindingLabel }}</span>
      <button class="tree__delete" title="Delete" @click.stop="$emit('delete', 'ui', u.id)">×</button>
    </div>

    <!-- Unattached Entities Section -->
    <div class="tree__section">
      <div class="tree__title">Unattached Entities</div>
    </div>
    <div v-if="unattachedEntities.length === 0" class="tree__empty">No unattached entities</div>
    <div
      v-for="e in unattachedEntities"
      :key="e.id"
      class="tree__item"
      :class="{ 'is-selected': selected?.type === 'game_entity' && selected?.id === e.id }"
      @click="$emit('select', { type: 'game_entity', id: e.id })"
    >
      <span class="tree__name">{{ e.id }}</span>
      <span class="tree__meta">{{ e.subtype }} • Unattached</span>
      <button class="tree__delete" title="Delete" @click.stop="$emit('delete', 'game_entity', e.id)">×</button>
    </div>

    <!-- Entities Section -->
    <div class="tree__section">
      <div class="tree__title">Entities</div>
      <div class="tree__actions">
        <div class="tree__add-group">
          <button class="tree__add" :disabled="worlds.length === 0" @click="$emit('add', 'game_entity')">+ Unit</button>
          <button class="tree__add" :disabled="worlds.length === 0" @click="$emit('add', 'game_entity')">+ Build</button>
        </div>
        <button class="tree__json" @click="$emit('json', 'game_entity')" title="Export JSON">{ }</button>
      </div>
    </div>
    <div v-if="gameEntities.length === 0" class="tree__empty">No entities</div>
    <div
      v-for="e in gameEntities"
      :key="e.id"
      class="tree__item"
      :class="{ 'is-selected': selected?.type === 'game_entity' && selected?.id === e.id }"
      @click="$emit('select', { type: 'game_entity', id: e.id })"
    >
      <span class="tree__name">{{ e.id }}</span>
      <span class="tree__meta">{{ e.subtype }} • {{ e.appearance.shape }} • {{ e.worldId }}</span>
      <button class="tree__delete" title="Delete" @click.stop="$emit('delete', 'game_entity', e.id)">×</button>
    </div>

    <!-- Regions Section -->
    <div class="tree__section">
      <div class="tree__title">Regions</div>
      <div class="tree__actions">
        <button class="tree__add" :disabled="worlds.length === 0" @click="$emit('add', 'region')">+ Add</button>
        <button class="tree__json" @click="$emit('json', 'region')" title="Export JSON">{ }</button>
      </div>
    </div>
    <div v-if="regions.length === 0" class="tree__empty">No regions</div>
    <div
      v-for="r in regions"
      :key="r.id"
      class="tree__item"
      :class="{ 'is-selected': selected?.type === 'region' && selected?.id === r.id }"
      @click="$emit('select', { type: 'region', id: r.id })"
    >
      <span class="tree__name">{{ r.displayName }}</span>
      <span class="tree__meta">{{ r.bounds.width }}×{{ r.bounds.height }}</span>
      <button class="tree__delete" title="Delete" @click.stop="$emit('delete', 'region', r.id)">×</button>
    </div>

    <!-- Controllers Section -->
    <div class="tree__section">
      <div class="tree__title">Controllers</div>
      <div class="tree__actions">
        <button class="tree__add" :disabled="cameras.length === 0" @click="$emit('add', 'controller')">+ Add</button>
        <button class="tree__json" @click="$emit('json', 'controller')" title="Export JSON">{ }</button>
      </div>
    </div>
    <div v-if="controllers.length === 0" class="tree__empty">No controllers</div>
    <div
      v-for="c in controllers"
      :key="c.id"
      class="tree__item"
      :class="{ 'is-selected': selected?.type === 'controller' && selected?.id === c.id }"
      @click="$emit('select', { type: 'controller', id: c.id })"
    >
      <span class="tree__name">{{ c.id }}</span>
      <span class="tree__meta">{{ c.type }} → {{ c.targetId || 'none' }}</span>
      <button class="tree__delete" title="Delete" @click.stop="$emit('delete', 'controller', c.id)">×</button>
    </div>

    <!-- Collisions Section -->
    <div class="tree__section">
      <div class="tree__title">Collisions</div>
      <div class="tree__actions">
        <button class="tree__add" @click="$emit('add', 'collision_type')">+ Type</button>
        <button class="tree__add" @click="$emit('add', 'collision_relation')">+ Relation</button>
      </div>
    </div>
    <div class="tree__subsection">
      <div class="tree__subtitle">Types</div>
      <div v-if="collisionTypes.length === 0" class="tree__empty">No types</div>
      <div
        v-for="type in collisionTypes"
        :key="type.id"
        class="tree__item tree__item--small"
      >
        <span class="tree__name">{{ type.id }}</span>
        <span class="tree__meta">{{ type.defaultShape }}</span>
        <button class="tree__delete" @click.stop="$emit('delete-collision-type', type.id)">×</button>
      </div>
    </div>
    <div class="tree__subsection">
      <div class="tree__subtitle">Relations</div>
      <div v-if="collisionRelations.length === 0" class="tree__empty">No relations</div>
      <div
        v-for="rel in collisionRelations"
        :key="rel.key"
        class="tree__item tree__item--small"
      >
        <span class="tree__name">{{ rel.typeA }} ↔ {{ rel.typeB }}</span>
        <span class="tree__meta">{{ rel.modes }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  worlds: { type: Array, default: () => [] },
  canvases: { type: Array, default: () => [] },
  cameras: { type: Array, default: () => [] },
  uiEntities: { type: Array, default: () => [] },
  gameEntities: { type: Array, default: () => [] },
  unattachedEntities: { type: Array, default: () => [] },
  regions: { type: Array, default: () => [] },
  controllers: { type: Array, default: () => [] },
  collisionTypes: { type: Array, default: () => [] },
  collisionRelations: { type: Array, default: () => [] },
  selected: { type: Object, default: () => null }
});

defineEmits(['select', 'add', 'delete', 'json', 'delete-collision-type']);
</script>

<style scoped>
.tree {
  padding: 10px;
}

.tree__section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 10px 0 6px;
}

.tree__title {
  font-weight: 700;
  color: #bdbdbd;
}

.tree__subsection {
  margin: 10px 0 6px 0;
}

.tree__subtitle {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.55);
  margin-bottom: 6px;
}

.tree__add {
  border: none;
  background: transparent;
  color: #7bd3ff;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 6px;
}

.tree__add-group {
  display: flex;
  gap: 6px;
}

.tree__add:hover:not(:disabled) {
  background: rgba(123, 211, 255, 0.10);
}

.tree__add:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.tree__empty {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.55);
  padding: 6px 8px;
}

.tree__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 8px;
  border-radius: 8px;
  cursor: pointer;
}

.tree__item--small {
  padding: 6px 6px;
}

.tree__item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.tree__item.is-selected {
  background: rgba(79, 195, 247, 0.15);
  outline: 1px solid rgba(79, 195, 247, 0.25);
}

.tree__name {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.tree__meta {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
}

.tree__delete {
  height: 22px;
  width: 22px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.75);
  cursor: pointer;
}

.tree__delete:hover {
  background: rgba(255, 90, 90, 0.18);
  border-color: rgba(255, 90, 90, 0.25);
}

.tree__actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tree__json {
  border: none;
  background: transparent;
  color: #7bd3ff;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 14px;
  font-weight: 600;
}

.tree__json:hover {
  background: rgba(123, 211, 255, 0.10);
}
</style>
