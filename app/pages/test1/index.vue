<template>
  <div class="editor">
    <!-- Top Toolbar -->
    <header class="toolbar">
      <div class="toolbar__left">
        <div class="brand">GoVue • Test1</div>
        <div class="toolbar__buttons">
          <button class="btn btn--primary" @click="openCreate('world')">➕ World</button>
          <button class="btn btn--primary" @click="openCreate('canvas')">➕ Canvas</button>
          <button class="btn btn--primary" :disabled="worlds.length === 0 || canvases.length === 0" @click="openCreate('camera')">➕ Camera</button>
        </div>
      </div>
      <div class="toolbar__right">
        <button class="btn" :disabled="!selected" @click="removeSelected">🗑️ Delete Selected</button>
        <button class="btn" @click="resetAll">♻️ Reset</button>
      </div>
    </header>

    <div class="layout">
      <!-- Hierarchy -->
      <aside class="panel hierarchy">
        <div class="panel__header">Hierarchy</div>

        <div class="tree">
          <div class="tree__section">
            <div class="tree__title">Worlds</div>
            <button class="tree__add" @click="openCreate('world')">+ Add</button>
          </div>
          <div v-if="worlds.length === 0" class="tree__empty">No worlds</div>
          <div
            v-for="w in worlds"
            :key="w.id"
            class="tree__item"
            :class="{ 'is-selected': selected?.type === 'world' && selected?.id === w.id }"
            @click="select({ type: 'world', id: w.id })"
          >
            <span class="tree__name">{{ w.id }}</span>
            <button class="tree__delete" title="Delete" @click.stop="removeWorld(w.id)">×</button>
          </div>

          <div class="tree__section">
            <div class="tree__title">Canvases</div>
            <button class="tree__add" @click="openCreate('canvas')">+ Add</button>
          </div>
          <div v-if="canvases.length === 0" class="tree__empty">No canvases</div>
          <div
            v-for="c in canvases"
            :key="c.id"
            class="tree__item"
            :class="{ 'is-selected': selected?.type === 'canvas' && selected?.id === c.id }"
            @click="select({ type: 'canvas', id: c.id })"
          >
            <span class="tree__name">{{ c.id }}</span>
            <span class="tree__meta">{{ c.width }}×{{ c.height }}</span>
            <button class="tree__delete" title="Delete" @click.stop="removeCanvas(c.id)">×</button>
          </div>

          <div class="tree__section">
            <div class="tree__title">Cameras</div>
            <button class="tree__add" :disabled="worlds.length === 0 || canvases.length === 0" @click="openCreate('camera')">+ Add</button>
          </div>
          <div v-if="cameras.length === 0" class="tree__empty">No cameras</div>
          <div
            v-for="cam in cameras"
            :key="cam.id"
            class="tree__item"
            :class="{ 'is-selected': selected?.type === 'camera' && selected?.id === cam.id }"
            @click="select({ type: 'camera', id: cam.id })"
          >
            <span class="tree__name">{{ cam.id }}</span>
            <span class="tree__meta">{{ cam.canvasId }}</span>
            <button class="tree__delete" title="Delete" @click.stop="removeCamera(cam.id)">×</button>
          </div>
        </div>
      </aside>

      <!-- Viewport Area -->
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
              <div :ref="(el) => setCanvasHost(c.id, el)" class="canvas-host" />
            </div>
          </div>
        </div>
      </main>

      <!-- Inspector -->
      <aside class="panel inspector">
        <div class="panel__header">Inspector</div>

        <div v-if="!selected" class="inspector__empty">Select an item in the Hierarchy.</div>

        <!-- World Inspector -->
        <div v-else-if="selected.type === 'world' && selectedWorld" class="inspector__content">
          <div class="inspector__title">World: {{ selectedWorld.id }}</div>
          <div class="kv">
            <div class="kv__row"><div class="kv__k">Type</div><div class="kv__v">{{ selectedWorld.type }}</div></div>
            <div class="kv__row"><div class="kv__k">Size</div><div class="kv__v">{{ selectedWorld.width }}×{{ selectedWorld.height }}</div></div>
            <div class="kv__row"><div class="kv__k">Background</div><div class="kv__v">{{ selectedWorld.backgroundColor }}</div></div>
            <div class="kv__row"><div class="kv__k">Entities</div><div class="kv__v">{{ selectedWorld.instance.entities.size }}</div></div>
          </div>

          <div class="actions">
            <button class="btn" @click="spawnDemoEntities(selectedWorld.id, 10)">➕ Spawn 10 demo entities</button>
            <button class="btn" @click="clearWorldEntities(selectedWorld.id)" :disabled="selectedWorld.instance.entities.size === 0">🧹 Clear entities</button>
          </div>
        </div>

        <!-- Canvas Inspector -->
        <div v-else-if="selected.type === 'canvas' && selectedCanvas" class="inspector__content">
          <div class="inspector__title">Canvas: {{ selectedCanvas.id }}</div>
          <div class="kv">
            <div class="kv__row"><div class="kv__k">Mode</div><div class="kv__v">{{ selectedCanvas.sizeMode }}</div></div>
            <div class="kv__row"><div class="kv__k">Size</div><div class="kv__v">{{ selectedCanvas.width }}×{{ selectedCanvas.height }}</div></div>
            <div class="kv__row"><div class="kv__k">Background</div><div class="kv__v">{{ selectedCanvas.backgroundColor }}</div></div>
            <div class="kv__row"><div class="kv__k">Cameras</div><div class="kv__v">{{ cameras.filter(x => x.canvasId === selectedCanvas.id).length }}</div></div>
          </div>
        </div>

        <!-- Camera Inspector -->
        <div v-else-if="selected.type === 'camera' && selectedCamera" class="inspector__content">
          <div class="inspector__title">Camera: {{ selectedCamera.id }}</div>
          <div class="kv">
            <div class="kv__row"><div class="kv__k">Canvas</div><div class="kv__v">{{ selectedCamera.canvasId }}</div></div>
            <div class="kv__row"><div class="kv__k">World</div><div class="kv__v">{{ selectedCamera.worldId }}</div></div>
            <div class="kv__row"><div class="kv__k">Viewport</div><div class="kv__v">{{ selectedCamera.width }}×{{ selectedCamera.height }} @ ({{ selectedCamera.x }}, {{ selectedCamera.y }})</div></div>
          </div>

          <div class="inspector__group">
            <div class="inspector__label">Zoom</div>
            <input type="range" v-model.number="cameraUi.zoom" min="0.1" max="5" step="0.1" @input="applySelectedCameraUi" />
            <div class="inspector__value">{{ cameraUi.zoom.toFixed(1) }}x</div>
          </div>

          <div class="inspector__group">
            <div class="inspector__label">Focus X</div>
            <input type="range" v-model.number="cameraUi.focusX" min="-1000" max="1000" step="10" @input="applySelectedCameraUi" />
            <div class="inspector__value">{{ cameraUi.focusX }}</div>
          </div>

          <div class="inspector__group">
            <div class="inspector__label">Focus Y</div>
            <input type="range" v-model.number="cameraUi.focusY" min="-1000" max="1000" step="10" @input="applySelectedCameraUi" />
            <div class="inspector__value">{{ cameraUi.focusY }}</div>
          </div>

          <div class="actions">
            <button class="btn" @click="focusCameraOnWorldCenter(selectedCamera.id)">🎯 Focus center</button>
          </div>
        </div>
      </aside>
    </div>

    <!-- Create Modal -->
    <div v-if="createModal.open" class="modal-backdrop" @click.self="closeCreate">
      <div class="modal">
        <div class="modal__header">
          <div class="modal__title">Add {{ createModal.type }}</div>
          <button class="modal__close" @click="closeCreate">×</button>
        </div>

        <div class="modal__body">
          <!-- World Form -->
          <div v-if="createModal.type === 'world'" class="form">
            <label class="field">
              <span class="field__label">ID</span>
              <input class="field__input" v-model.trim="worldForm.id" placeholder="world_1" />
            </label>
            <label class="field">
              <span class="field__label">Type</span>
              <select class="field__input" v-model="worldForm.type">
                <option value="bounded">bounded</option>
                <option value="infinite">infinite</option>
              </select>
            </label>
            <div class="grid2">
              <label class="field">
                <span class="field__label">Width</span>
                <input class="field__input" type="number" v-model.number="worldForm.width" />
              </label>
              <label class="field">
                <span class="field__label">Height</span>
                <input class="field__input" type="number" v-model.number="worldForm.height" />
              </label>
            </div>
            <label class="field">
              <span class="field__label">Background</span>
              <input class="field__input" v-model.trim="worldForm.backgroundColor" placeholder="#000000" />
            </label>
            <label class="field field--row">
              <input type="checkbox" v-model="worldForm.spawnDemo" />
              <span class="field__label">Spawn demo entities (10)</span>
            </label>
          </div>

          <!-- Canvas Form -->
          <div v-else-if="createModal.type === 'canvas'" class="form">
            <label class="field">
              <span class="field__label">ID</span>
              <input class="field__input" v-model.trim="canvasForm.id" placeholder="canvas_1" />
            </label>
            <label class="field">
              <span class="field__label">Size Mode</span>
              <select class="field__input" v-model="canvasForm.sizeMode">
                <option value="fixed">fixed</option>
                <option value="responsive">responsive</option>
              </select>
            </label>
            <div v-if="canvasForm.sizeMode === 'fixed'" class="grid2">
              <label class="field">
                <span class="field__label">Width</span>
                <input class="field__input" type="number" v-model.number="canvasForm.width" />
              </label>
              <label class="field">
                <span class="field__label">Height</span>
                <input class="field__input" type="number" v-model.number="canvasForm.height" />
              </label>
            </div>
            <div v-else class="grid2">
              <label class="field">
                <span class="field__label">Width %</span>
                <input class="field__input" type="number" v-model.number="canvasForm.widthPercent" />
              </label>
              <label class="field">
                <span class="field__label">Height %</span>
                <input class="field__input" type="number" v-model.number="canvasForm.heightPercent" />
              </label>
            </div>
            <label class="field">
              <span class="field__label">Background</span>
              <input class="field__input" v-model.trim="canvasForm.backgroundColor" placeholder="#1a1a1a" />
            </label>
            <div class="grid2">
              <label class="field field--row">
                <input type="checkbox" v-model="canvasForm.antialias" />
                <span class="field__label">Antialias</span>
              </label>
              <label class="field">
                <span class="field__label">Resolution</span>
                <input class="field__input" type="number" step="1" min="1" max="4" v-model.number="canvasForm.resolution" />
              </label>
            </div>
          </div>

          <!-- Camera Form -->
          <div v-else-if="createModal.type === 'camera'" class="form">
            <label class="field">
              <span class="field__label">ID</span>
              <input class="field__input" v-model.trim="cameraForm.id" placeholder="camera_1" />
            </label>

            <label class="field">
              <span class="field__label">Attach to Canvas</span>
              <select class="field__input" v-model="cameraForm.canvasId">
                <option v-for="c in canvases" :key="c.id" :value="c.id">{{ c.id }}</option>
              </select>
            </label>

            <label class="field">
              <span class="field__label">Attach to World</span>
              <select class="field__input" v-model="cameraForm.worldId">
                <option v-for="w in worlds" :key="w.id" :value="w.id">{{ w.id }}</option>
              </select>
            </label>

            <label class="field">
              <span class="field__label">Anchor</span>
              <select class="field__input" v-model="cameraForm.anchor">
                <option value="center">center</option>
                <option value="topleft">topleft</option>
                <option value="topright">topright</option>
                <option value="bottomleft">bottomleft</option>
                <option value="bottomright">bottomright</option>
              </select>
            </label>

            <div class="grid2">
              <label class="field">
                <span class="field__label">Viewport Width</span>
                <input class="field__input" type="number" v-model.number="cameraForm.width" />
              </label>
              <label class="field">
                <span class="field__label">Viewport Height</span>
                <input class="field__input" type="number" v-model.number="cameraForm.height" />
              </label>
            </div>

            <div class="grid2">
              <label class="field">
                <span class="field__label">X (in canvas)</span>
                <input class="field__input" type="number" v-model.number="cameraForm.x" />
              </label>
              <label class="field">
                <span class="field__label">Y (in canvas)</span>
                <input class="field__input" type="number" v-model.number="cameraForm.y" />
              </label>
            </div>

            <div class="grid2">
              <label class="field">
                <span class="field__label">Focus X</span>
                <input class="field__input" type="number" v-model.number="cameraForm.focusX" />
              </label>
              <label class="field">
                <span class="field__label">Focus Y</span>
                <input class="field__input" type="number" v-model.number="cameraForm.focusY" />
              </label>
            </div>

            <div class="grid2">
              <label class="field">
                <span class="field__label">Zoom</span>
                <input class="field__input" type="number" step="0.1" v-model.number="cameraForm.zoom" />
              </label>
              <label class="field">
                <span class="field__label">Priority</span>
                <input class="field__input" type="number" step="1" v-model.number="cameraForm.priority" />
              </label>
            </div>

            <div class="grid2">
              <label class="field">
                <span class="field__label">Min Zoom</span>
                <input class="field__input" type="number" step="0.1" v-model.number="cameraForm.minZoom" />
              </label>
              <label class="field">
                <span class="field__label">Max Zoom</span>
                <input class="field__input" type="number" step="0.1" v-model.number="cameraForm.maxZoom" />
              </label>
            </div>
          </div>
        </div>

        <div class="modal__footer">
          <button class="btn" @click="closeCreate">Cancel</button>
          <button class="btn btn--primary" @click="confirmCreate">Create</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, markRaw, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { World } from '../../../pixi_game2/pixigame/src/World.js';
import { Canvas, Camera } from '../../../pixi_game2/pixigame-renderer/src/index.js';

// ---------------------------
// State
// ---------------------------
const worlds = reactive([]);   // { id, type, width, height, backgroundColor, instance }
const canvases = reactive([]); // { id, sizeMode, width, height, backgroundColor, antialias, resolution, instance }
const cameras = reactive([]);  // { id, canvasId, worldId, width, height, x, y, focusX, focusY, zoom, priority, minZoom, maxZoom, anchor, instance }

const selected = ref(null); // { type: 'world'|'canvas'|'camera', id }

const cameraUi = reactive({ zoom: 1, focusX: 0, focusY: 0 });

// canvasId -> DOM element
const canvasHosts = new Map();
function setCanvasHost(canvasId, el) {
  if (el) canvasHosts.set(canvasId, el);
  else canvasHosts.delete(canvasId);
}

// ---------------------------
// Modal/forms
// ---------------------------
const createModal = reactive({ open: false, type: null });

const worldForm = reactive({
  id: '',
  type: 'bounded',
  width: 1000,
  height: 1000,
  backgroundColor: '#000000',
  spawnDemo: true
});

const canvasForm = reactive({
  id: '',
  sizeMode: 'fixed',
  width: 1200,
  height: 800,
  widthPercent: 100,
  heightPercent: 100,
  backgroundColor: '#1a1a1a',
  antialias: false,
  resolution: 1
});

const cameraForm = reactive({
  id: '',
  canvasId: '',
  worldId: '',
  anchor: 'center',
  width: 380,
  height: 380,
  x: 10,
  y: 10,
  focusX: 0,
  focusY: 0,
  zoom: 1,
  priority: 0,
  minZoom: 0.1,
  maxZoom: 5.0
});

function openCreate(type) {
  createModal.open = true;
  createModal.type = type;

  if (type === 'world') {
    worldForm.id = suggestId('world', worlds);
  } else if (type === 'canvas') {
    canvasForm.id = suggestId('canvas', canvases);
  } else if (type === 'camera') {
    cameraForm.id = suggestId('camera', cameras);
    cameraForm.canvasId = canvases[0]?.id || '';
    cameraForm.worldId = worlds[0]?.id || '';
    cameraForm.x = 10 + (cameras.length % 3) * 400;
    cameraForm.y = 10;
  }
}

function closeCreate() {
  createModal.open = false;
  createModal.type = null;
}

async function confirmCreate() {
  if (createModal.type === 'world') {
    createWorldFromForm();
    closeCreate();
  } else if (createModal.type === 'canvas') {
    await createCanvasFromForm();
    closeCreate();
  } else if (createModal.type === 'camera') {
    createCameraFromForm();
    closeCreate();
  }
}

function suggestId(prefix, list) {
  const existing = new Set(list.map((x) => x.id));
  let i = 1;
  while (existing.has(`${prefix}_${i}`)) i++;
  return `${prefix}_${i}`;
}

// ---------------------------
// Create / Remove
// ---------------------------
function createWorldFromForm() {
  const id = worldForm.id?.trim() || suggestId('world', worlds);
  if (worlds.some((w) => w.id === id)) return;

  const instance = markRaw(new World({
    id,
    type: worldForm.type,
    width: Number(worldForm.width) || 1000,
    height: Number(worldForm.height) || 1000,
    backgroundColor: worldForm.backgroundColor || '#000000'
  }));

  const model = {
    id,
    type: worldForm.type,
    width: instance.width,
    height: instance.height,
    backgroundColor: instance.backgroundColor,
    instance
  };

  worlds.push(model);
  select({ type: 'world', id });

  if (worldForm.spawnDemo) {
    spawnDemoEntities(id, 10);
  }
}

async function createCanvasFromForm() {
  const id = canvasForm.id?.trim() || suggestId('canvas', canvases);
  if (canvases.some((c) => c.id === id)) return;

  const instance = markRaw(new Canvas({
    id,
    sizeMode: canvasForm.sizeMode,
    width: Number(canvasForm.width) || 1200,
    height: Number(canvasForm.height) || 800,
    widthPercent: Number(canvasForm.widthPercent) || 100,
    heightPercent: Number(canvasForm.heightPercent) || 100,
    backgroundColor: canvasForm.backgroundColor || '#1a1a1a'
  }));

  const model = {
    id,
    sizeMode: instance.sizeMode,
    width: instance.width,
    height: instance.height,
    backgroundColor: instance.backgroundColor,
    antialias: !!canvasForm.antialias,
    resolution: Number(canvasForm.resolution) || 1,
    instance
  };

  canvases.push(model);
  await nextTick();

  const host = canvasHosts.get(id);
  if (host) {
    host.innerHTML = '';
    await instance.start(host, {
      antialias: model.antialias,
      resolution: model.resolution,
      autoDensity: true
    });
  }

  select({ type: 'canvas', id });
}

function createCameraFromForm() {
  const id = cameraForm.id?.trim() || suggestId('camera', cameras);
  if (cameras.some((c) => c.id === id)) return;

  const canvasModel = canvases.find((c) => c.id === cameraForm.canvasId);
  const worldModel = worlds.find((w) => w.id === cameraForm.worldId);
  if (!canvasModel || !worldModel) return;

  const instance = markRaw(new Camera({
    id,
    width: Number(cameraForm.width) || 380,
    height: Number(cameraForm.height) || 380,
    x: Number(cameraForm.x) || 0,
    y: Number(cameraForm.y) || 0,
    positionMode: 'absolute',
    anchor: cameraForm.anchor || 'center',
    focusX: Number(cameraForm.focusX) || 0,
    focusY: Number(cameraForm.focusY) || 0,
    zoom: Number(cameraForm.zoom) || 1,
    minZoom: Number(cameraForm.minZoom) || 0.1,
    maxZoom: Number(cameraForm.maxZoom) || 5.0,
    priority: Number(cameraForm.priority) || 0,
    world: worldModel.instance,
    canvas: canvasModel.instance
  }));

  const model = {
    id,
    canvasId: canvasModel.id,
    worldId: worldModel.id,
    width: instance.width,
    height: instance.height,
    x: instance.x,
    y: instance.y,
    focusX: instance.focusX,
    focusY: instance.focusY,
    zoom: instance.zoom,
    priority: instance.priority,
    minZoom: instance.minZoom,
    maxZoom: instance.maxZoom,
    anchor: instance.anchor,
    instance
  };

  cameras.push(model);
  select({ type: 'camera', id });
  syncCameraUiFromSelected();
}

function removeWorld(worldId) {
  // remove cameras referencing this world
  const camsToRemove = cameras.filter((c) => c.worldId === worldId).map((c) => c.id);
  for (const camId of camsToRemove) removeCamera(camId);

  const idx = worlds.findIndex((w) => w.id === worldId);
  if (idx >= 0) worlds.splice(idx, 1);

  if (selected.value?.type === 'world' && selected.value.id === worldId) selected.value = null;
}

function removeCanvas(canvasId) {
  // remove cameras attached to this canvas
  const camsToRemove = cameras.filter((c) => c.canvasId === canvasId).map((c) => c.id);
  for (const camId of camsToRemove) removeCamera(camId);

  const idx = canvases.findIndex((c) => c.id === canvasId);
  if (idx >= 0) {
    try { canvases[idx].instance.destroy(); } catch (_) {}
    canvases.splice(idx, 1);
  }

  const host = canvasHosts.get(canvasId);
  if (host) host.innerHTML = '';

  if (selected.value?.type === 'canvas' && selected.value.id === canvasId) selected.value = null;
}

function removeCamera(cameraId) {
  const idx = cameras.findIndex((c) => c.id === cameraId);
  if (idx < 0) return;
  const cam = cameras[idx];

  const canvasModel = canvases.find((c) => c.id === cam.canvasId);
  try { canvasModel?.instance?.removeCamera?.(cameraId); } catch (_) {}

  cameras.splice(idx, 1);

  if (selected.value?.type === 'camera' && selected.value.id === cameraId) selected.value = null;
}

function removeSelected() {
  if (!selected.value) return;
  const { type, id } = selected.value;
  if (type === 'world') removeWorld(id);
  else if (type === 'canvas') removeCanvas(id);
  else if (type === 'camera') removeCamera(id);
}

function resetAll() {
  // remove everything in safe order: cameras -> canvases -> worlds
  for (const cam of [...cameras]) removeCamera(cam.id);
  for (const c of [...canvases]) removeCanvas(c.id);
  for (const w of [...worlds]) removeWorld(w.id);
  selected.value = null;
}

// ---------------------------
// Selection helpers
// ---------------------------
function select(sel) {
  selected.value = sel;
  syncCameraUiFromSelected();
}

const selectedWorld = computed(() => (selected.value?.type === 'world' ? worlds.find((w) => w.id === selected.value.id) : null));
const selectedCanvas = computed(() => (selected.value?.type === 'canvas' ? canvases.find((c) => c.id === selected.value.id) : null));
const selectedCamera = computed(() => (selected.value?.type === 'camera' ? cameras.find((c) => c.id === selected.value.id) : null));

function syncCameraUiFromSelected() {
  if (!selectedCamera.value) return;
  const cam = selectedCamera.value.instance;
  cameraUi.zoom = Number(cam.zoom) || 1;
  cameraUi.focusX = Number(cam.focusX) || 0;
  cameraUi.focusY = Number(cam.focusY) || 0;
}

function applySelectedCameraUi() {
  if (!selectedCamera.value) return;
  const cam = selectedCamera.value.instance;
  cam.setZoom?.(cameraUi.zoom);
  cam.setFocus?.(cameraUi.focusX, cameraUi.focusY);
}

function focusCameraOnWorldCenter(cameraId) {
  const camModel = cameras.find((c) => c.id === cameraId);
  if (!camModel) return;
  const worldModel = worlds.find((w) => w.id === camModel.worldId);
  if (!worldModel) return;
  camModel.instance.setFocus?.(0, 0);
  syncCameraUiFromSelected();
}

// ---------------------------
// Demo entities (for visibility testing)
// ---------------------------
function spawnDemoEntities(worldId, count = 10) {
  const w = worlds.find((x) => x.id === worldId);
  if (!w) return;
  const world = w.instance;

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * world.width * 0.8;
    const y = (Math.random() - 0.5) * world.height * 0.8;
    const color = Math.floor(Math.random() * 0xffffff);
    const size = 20 + Math.random() * 50;
    world.createEntity({
      position: { x, y },
      appearance: { shape: 'circle', color, size }
    });
  }
}

function clearWorldEntities(worldId) {
  const w = worlds.find((x) => x.id === worldId);
  if (!w) return;
  w.instance.entities.clear();
}

// ---------------------------
// Input handling for selected camera
// ---------------------------
const keys = new Set();

function onKeyDown(e) {
  keys.add(e.code);
}
function onKeyUp(e) {
  keys.delete(e.code);
}
function onWheel(e) {
  if (!selectedCamera.value) return;
  // Only when cursor is over viewport area (avoid scrolling panels)
  const vp = document.querySelector('.viewport');
  if (!vp) return;
  const rect = vp.getBoundingClientRect();
  const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
  if (!inside) return;

  e.preventDefault();
  const direction = e.deltaY > 0 ? -1 : 1;
  cameraUi.zoom = Math.max(0.1, Math.min(5.0, cameraUi.zoom + direction * 0.1));
  applySelectedCameraUi();
}

// Render loop for multiple canvases
let rafId = null;
function loop() {
  // WASD pan selected camera
  if (selectedCamera.value) {
    const cam = selectedCamera.value.instance;
    const speed = 10 / (Number(cam.zoom) || 1);
    let moved = false;
    if (keys.has('KeyW')) { cameraUi.focusY -= speed; moved = true; }
    if (keys.has('KeyS')) { cameraUi.focusY += speed; moved = true; }
    if (keys.has('KeyA')) { cameraUi.focusX -= speed; moved = true; }
    if (keys.has('KeyD')) { cameraUi.focusX += speed; moved = true; }
    if (moved) applySelectedCameraUi();
  }

  for (const c of canvases) {
    try { c.instance.render(); } catch (_) {}
  }
  rafId = requestAnimationFrame(loop);
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  // Passive false to allow preventDefault for zoom
  window.addEventListener('wheel', onWheel, { passive: false });
  if (!rafId) loop();
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
  window.removeEventListener('wheel', onWheel);
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  resetAll();
});

// Keep inspector sliders in sync when camera selection changes
watch(selectedCamera, () => syncCameraUiFromSelected());
</script>

<style scoped>
.editor {
  min-height: 100vh;
  background: #1f1f1f;
  color: #e6e6e6;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
}

.toolbar {
  position: sticky;
  top: 0;
  z-index: 50;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  background: linear-gradient(180deg, #2b2b2b, #242424);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.toolbar__left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.brand {
  font-weight: 700;
  letter-spacing: 0.4px;
  color: #bfe7ff;
}
.toolbar__buttons {
  display: flex;
  gap: 8px;
}
.toolbar__right {
  display: flex;
  gap: 8px;
}

.btn {
  height: 34px;
  padding: 0 12px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(255, 255, 255, 0.06);
  color: #e8e8e8;
  cursor: pointer;
  transition: transform 0.05s ease, background 0.15s ease, border-color 0.15s ease;
}
.btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.10);
  border-color: rgba(255, 255, 255, 0.16);
}
.btn:active:not(:disabled) { transform: translateY(1px); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
.btn--primary {
  background: rgba(79, 195, 247, 0.22);
  border-color: rgba(79, 195, 247, 0.35);
  color: #d9f4ff;
}
.btn--primary:hover:not(:disabled) {
  background: rgba(79, 195, 247, 0.30);
}

.layout {
  display: grid;
  grid-template-columns: 280px 1fr 340px;
  gap: 12px;
  padding: 12px;
}

.panel {
  background: #2a2a2a;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  overflow: hidden;
  min-height: calc(100vh - 52px - 24px);
}
.panel__header {
  padding: 10px 12px;
  font-weight: 700;
  color: #cfe9ff;
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

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
.tree__add {
  border: none;
  background: transparent;
  color: #7bd3ff;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 6px;
}
.tree__add:hover:not(:disabled) { background: rgba(123, 211, 255, 0.10); }
.tree__add:disabled { opacity: 0.35; cursor: not-allowed; }
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
.tree__item:hover { background: rgba(255, 255, 255, 0.05); }
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
.tree__delete:hover { background: rgba(255, 90, 90, 0.18); border-color: rgba(255, 90, 90, 0.25); }

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

.inspector__empty {
  padding: 12px;
  color: rgba(255, 255, 255, 0.65);
}
.inspector__content { padding: 12px; }
.inspector__title {
  font-weight: 800;
  margin-bottom: 10px;
}
.kv {
  display: grid;
  gap: 6px;
  margin-bottom: 12px;
}
.kv__row {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 10px;
  font-size: 13px;
}
.kv__k { color: rgba(255, 255, 255, 0.55); }
.kv__v { color: rgba(255, 255, 255, 0.90); word-break: break-word; }

.inspector__group { margin: 10px 0; }
.inspector__label { font-weight: 700; font-size: 13px; color: rgba(255, 255, 255, 0.75); margin-bottom: 6px; }
.inspector__value { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; color: #7bd3ff; margin-top: 6px; font-size: 12px; }
.actions { display: grid; gap: 8px; margin-top: 12px; }

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.60);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  z-index: 100;
}
.modal {
  width: min(680px, 96vw);
  background: #2a2a2a;
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.45);
}
.modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.modal__title { font-weight: 900; }
.modal__close {
  height: 30px;
  width: 30px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
}
.modal__body { padding: 12px 14px; }
.modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

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

