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
          <div class="toolbar__divider" />
          <button class="btn btn--primary" :disabled="canvases.length === 0 && cameras.length === 0 && worlds.length === 0" @click="openCreate('ui_text')">➕ UI Text</button>
          <button class="btn btn--primary" :disabled="canvases.length === 0 && cameras.length === 0 && worlds.length === 0" @click="openCreate('ui_button')">➕ UI Button</button>
          <div class="toolbar__divider" />
          <button class="btn btn--primary" :disabled="worlds.length === 0" @click="openCreate('region')">➕ Region</button>
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
        <div class="panel__header">
          <span class="panel__title">Hierarchy</span>
          <button class="panel__json-btn" @click="openJsonModal('all')" title="Export All JSON">{ } All</button>
        </div>

        <div class="tree">
          <div class="tree__section">
            <div class="tree__title">Worlds</div>
            <div class="tree__actions">
              <button class="tree__add" @click="openCreate('world')">+ Add</button>
              <button class="tree__json" @click="openJsonModal('world')" title="Export JSON">{ }</button>
            </div>
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
            <div class="tree__actions">
              <button class="tree__add" @click="openCreate('canvas')">+ Add</button>
              <button class="tree__json" @click="openJsonModal('canvas')" title="Export JSON">{ }</button>
            </div>
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
            <div class="tree__actions">
              <button class="tree__add" :disabled="worlds.length === 0 || canvases.length === 0" @click="openCreate('camera')">+ Add</button>
              <button class="tree__json" @click="openJsonModal('camera')" title="Export JSON">{ }</button>
            </div>
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

          <div class="tree__section">
            <div class="tree__title">UI</div>
            <div class="tree__actions">
              <div class="tree__add-group">
                <button class="tree__add" :disabled="canvases.length === 0 && cameras.length === 0 && worlds.length === 0" @click="openCreate('ui_text')">+ Text</button>
                <button class="tree__add" :disabled="canvases.length === 0 && cameras.length === 0 && worlds.length === 0" @click="openCreate('ui_button')">+ Button</button>
              </div>
              <button class="tree__json" @click="openJsonModal('ui')" title="Export JSON">{ }</button>
            </div>
          </div>
          <div v-if="uiEntities.length === 0" class="tree__empty">No UI</div>
          <div
            v-for="u in uiEntities"
            :key="u.id"
            class="tree__item"
            :class="{ 'is-selected': selected?.type === 'ui' && selected?.id === u.id }"
            @click="select({ type: 'ui', id: u.id })"
          >
            <span class="tree__name">{{ u.id }}</span>
            <span class="tree__meta">{{ u.subtype }} • {{ u.bindingLabel }}</span>
            <button class="tree__delete" title="Delete" @click.stop="removeUI(u.id)">×</button>
          </div>

          <div class="tree__section">
            <div class="tree__title">Regions</div>
            <div class="tree__actions">
              <button class="tree__add" :disabled="worlds.length === 0" @click="openCreate('region')">+ Add</button>
              <button class="tree__json" @click="openJsonModal('region')" title="Export JSON">{ }</button>
            </div>
          </div>
          <div v-if="regions.length === 0" class="tree__empty">No regions</div>
          <div
            v-for="r in regions"
            :key="r.id"
            class="tree__item"
            :class="{ 'is-selected': selected?.type === 'region' && selected?.id === r.id }"
            @click="select({ type: 'region', id: r.id })"
          >
            <span class="tree__name">{{ r.displayName }}</span>
            <span class="tree__meta">{{ r.bounds.width }}×{{ r.bounds.height }}</span>
            <button class="tree__delete" title="Delete" @click.stop="removeRegion(r.id)">×</button>
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
        <div class="panel__header">
          <span class="panel__title">Inspector</span>
        </div>

        <div v-if="!selected" class="inspector__empty">Select an item in the Hierarchy.</div>

        <!-- World Inspector -->
        <div v-else-if="selected.type === 'world' && selectedWorld" class="inspector__content">
          <div class="inspector__title">World: {{ selectedWorld.id }}</div>
          <div class="kv">
            <div class="kv__row"><div class="kv__k">Type</div><div class="kv__v">{{ selectedWorld.type }}</div></div>
            <div class="kv__row"><div class="kv__k">Size</div><div class="kv__v">{{ selectedWorld.width }}×{{ selectedWorld.height }}</div></div>
            <div class="kv__row"><div class="kv__k">Show Bounds</div><div class="kv__v">{{ selectedWorld.instance.showBounds ? 'enabled' : 'disabled' }}</div></div>
            <div class="kv__row" v-if="selectedWorld.instance.showBounds"><div class="kv__k">Bounds Color</div><div class="kv__v">{{ selectedWorld.instance.boundsColor }}</div></div>
            <div class="kv__row"><div class="kv__k">Background</div><div class="kv__v">{{ selectedWorld.backgroundColor }}</div></div>
            <div class="kv__row" v-if="selectedWorld.instance.backgroundTexture?.textureUrl"><div class="kv__k">Texture</div><div class="kv__v">{{ selectedWorld.instance.backgroundTexture.textureUrl }}</div></div>
            <div class="kv__row" v-if="selectedWorld.instance.backgroundTexture?.textureUrl"><div class="kv__k">Scale Mode</div><div class="kv__v">{{ selectedWorld.instance.backgroundTexture.scaleMode }}</div></div>
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

        <!-- UI Inspector -->
        <div v-else-if="selected.type === 'ui' && selectedUI" class="inspector__content">
          <div class="inspector__title">UI: {{ selectedUI.id }}</div>
          <div class="kv">
            <div class="kv__row"><div class="kv__k">Subtype</div><div class="kv__v">{{ selectedUI.subtype }}</div></div>
            <div class="kv__row"><div class="kv__k">Bind</div><div class="kv__v">{{ selectedUI.bindingLabel }}</div></div>
            <div class="kv__row"><div class="kv__k">ScreenSpace</div><div class="kv__v">{{ selectedUI.instance.screenSpace ? 'true' : 'false' }}</div></div>
            <div class="kv__row"><div class="kv__k">Pos</div><div class="kv__v">{{ selectedUI.instance.position.x }}, {{ selectedUI.instance.position.y }}</div></div>
          </div>
          <div v-if="selectedUI.subtype === 'text'" class="kv">
            <div class="kv__row"><div class="kv__k">Content</div><div class="kv__v">{{ selectedUI.instance.text.content }}</div></div>
          </div>
          <div v-else-if="selectedUI.subtype === 'button'" class="kv">
            <div class="kv__row"><div class="kv__k">Label</div><div class="kv__v">{{ selectedUI.instance.text.content }}</div></div>
            <div class="kv__row"><div class="kv__k">Size</div><div class="kv__v">{{ selectedUI.instance.button.width }}×{{ selectedUI.instance.button.height }}</div></div>
          </div>
        </div>

        <!-- Region Inspector -->
        <div v-else-if="selected.type === 'region' && selectedRegion" class="inspector__content">
          <div class="inspector__title">Region: {{ selectedRegion.displayName }}</div>
          <div class="kv">
            <div class="kv__row"><div class="kv__k">ID</div><div class="kv__v">{{ selectedRegion.id }}</div></div>
            <div class="kv__row"><div class="kv__k">World</div><div class="kv__v">{{ selectedRegion.worldId }}</div></div>
            <div class="kv__row"><div class="kv__k">Position</div><div class="kv__v">{{ selectedRegion.bounds.x }}, {{ selectedRegion.bounds.y }}</div></div>
            <div class="kv__row"><div class="kv__k">Size</div><div class="kv__v">{{ selectedRegion.bounds.width }}×{{ selectedRegion.bounds.height }}</div></div>
            <div class="kv__row"><div class="kv__k">Priority</div><div class="kv__v">{{ selectedRegion.bounds.priority }}</div></div>
            <div class="kv__row" v-if="selectedRegion.regionType.groundTexture.textureUrl"><div class="kv__k">Texture</div><div class="kv__v">{{ selectedRegion.regionType.groundTexture.textureUrl }}</div></div>
            <div class="kv__row" v-if="selectedRegion.regionType.groundTexture.textureUrl"><div class="kv__k">Scale Mode</div><div class="kv__v">{{ selectedRegion.regionType.groundTexture.scaleMode }}</div></div>
            <div class="kv__row"><div class="kv__k">Show Borders</div><div class="kv__v">{{ selectedRegion.regionType.borders.enabled ? 'enabled' : 'disabled' }}</div></div>
            <div class="kv__row" v-if="selectedRegion.regionType.borders.enabled"><div class="kv__k">Border Color</div><div class="kv__v">{{ selectedRegion.regionType.borders.color }}</div></div>
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
            <label class="field">
              <span class="field__label">Texture URL (optional)</span>
              <input class="field__input" v-model.trim="worldForm.textureUrl" placeholder="/assets/spritesheet.png" />
            </label>
            <div class="grid2" v-if="worldForm.textureUrl">
              <label class="field">
                <span class="field__label">Texture Scale Mode</span>
                <select class="field__input" v-model="worldForm.textureScaleMode">
                  <option value="tile">tile (замостить)</option>
                  <option value="stretch">stretch (растянуть)</option>
                  <option value="center">center (центрировать)</option>
                </select>
              </label>
              <label class="field">
                <span class="field__label">Tint (optional)</span>
                <input class="field__input" v-model.trim="worldForm.tint" placeholder="#ffffff" />
              </label>
            </div>
            <label class="field field--row">
              <input type="checkbox" v-model="worldForm.showBounds" />
              <span class="field__label">Show world bounds</span>
            </label>
            <label class="field" v-if="worldForm.showBounds">
              <span class="field__label">Bounds Color</span>
              <input class="field__input" v-model.trim="worldForm.boundsColor" placeholder="#FF4444" />
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

            <label class="field">
              <span class="field__label">World Background Color</span>
              <input class="field__input" v-model.trim="cameraForm.worldBackgroundColor" placeholder="#2a2a2a" />
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

          <!-- UI Text Form -->
          <div v-else-if="createModal.type === 'ui_text'" class="form">
            <label class="field">
              <span class="field__label">ID</span>
              <input class="field__input" v-model.trim="uiTextForm.id" placeholder="ui_text_1" />
            </label>
            <label class="field">
              <span class="field__label">Bind to</span>
              <select class="field__input" v-model="uiTextForm.bindTo">
                <option value="canvas">canvas</option>
                <option value="camera">camera</option>
                <option value="world">world</option>
              </select>
            </label>
            <label v-if="uiTextForm.bindTo === 'canvas'" class="field">
              <span class="field__label">Canvas</span>
              <select class="field__input" v-model="uiTextForm.canvasId">
                <option v-for="c in canvases" :key="c.id" :value="c.id">{{ c.id }}</option>
              </select>
            </label>
            <label v-else-if="uiTextForm.bindTo === 'camera'" class="field">
              <span class="field__label">Camera</span>
              <select class="field__input" v-model="uiTextForm.cameraId">
                <option v-for="cam in cameras" :key="cam.id" :value="cam.id">{{ cam.id }}</option>
              </select>
            </label>
            <label v-else class="field">
              <span class="field__label">World</span>
              <select class="field__input" v-model="uiTextForm.worldId">
                <option v-for="w in worlds" :key="w.id" :value="w.id">{{ w.id }}</option>
              </select>
            </label>
            <div class="grid2">
              <label class="field">
                <span class="field__label">X</span>
                <input class="field__input" type="number" v-model.number="uiTextForm.x" />
              </label>
              <label class="field">
                <span class="field__label">Y</span>
                <input class="field__input" type="number" v-model.number="uiTextForm.y" />
              </label>
            </div>
            <label class="field field--row">
              <input type="checkbox" v-model="uiTextForm.screenSpace" />
              <span class="field__label">ScreenSpace</span>
            </label>
            <label class="field">
              <span class="field__label">Content</span>
              <input class="field__input" v-model.trim="uiTextForm.content" placeholder="Hello UI" />
            </label>
            <div class="grid2">
              <label class="field">
                <span class="field__label">Font Size</span>
                <input class="field__input" type="number" v-model.number="uiTextForm.fontSize" />
              </label>
              <label class="field">
                <span class="field__label">Color</span>
                <input class="field__input" v-model.trim="uiTextForm.color" placeholder="#ffffff" />
              </label>
            </div>
          </div>

          <!-- UI Button Form -->
          <div v-else-if="createModal.type === 'ui_button'" class="form">
            <label class="field">
              <span class="field__label">ID</span>
              <input class="field__input" v-model.trim="uiButtonForm.id" placeholder="ui_button_1" />
            </label>
            <label class="field">
              <span class="field__label">Bind to</span>
              <select class="field__input" v-model="uiButtonForm.bindTo">
                <option value="canvas">canvas</option>
                <option value="camera">camera</option>
                <option value="world">world</option>
              </select>
            </label>
            <label v-if="uiButtonForm.bindTo === 'canvas'" class="field">
              <span class="field__label">Canvas</span>
              <select class="field__input" v-model="uiButtonForm.canvasId">
                <option v-for="c in canvases" :key="c.id" :value="c.id">{{ c.id }}</option>
              </select>
            </label>
            <label v-else-if="uiButtonForm.bindTo === 'camera'" class="field">
              <span class="field__label">Camera</span>
              <select class="field__input" v-model="uiButtonForm.cameraId">
                <option v-for="cam in cameras" :key="cam.id" :value="cam.id">{{ cam.id }}</option>
              </select>
            </label>
            <label v-else class="field">
              <span class="field__label">World</span>
              <select class="field__input" v-model="uiButtonForm.worldId">
                <option v-for="w in worlds" :key="w.id" :value="w.id">{{ w.id }}</option>
              </select>
            </label>
            <div class="grid2">
              <label class="field">
                <span class="field__label">X</span>
                <input class="field__input" type="number" v-model.number="uiButtonForm.x" />
              </label>
              <label class="field">
                <span class="field__label">Y</span>
                <input class="field__input" type="number" v-model.number="uiButtonForm.y" />
              </label>
            </div>
            <label class="field field--row">
              <input type="checkbox" v-model="uiButtonForm.screenSpace" />
              <span class="field__label">ScreenSpace</span>
            </label>
            <label class="field">
              <span class="field__label">Label</span>
              <input class="field__input" v-model.trim="uiButtonForm.label" placeholder="Click me" />
            </label>
            <div class="grid2">
              <label class="field">
                <span class="field__label">Width</span>
                <input class="field__input" type="number" v-model.number="uiButtonForm.width" />
              </label>
              <label class="field">
                <span class="field__label">Height</span>
                <input class="field__input" type="number" v-model.number="uiButtonForm.height" />
              </label>
            </div>
            <div class="grid2">
              <label class="field">
                <span class="field__label">BG</span>
                <input class="field__input" v-model.trim="uiButtonForm.bg" placeholder="#4fc3f7" />
              </label>
              <label class="field">
                <span class="field__label">BG Hover</span>
                <input class="field__input" v-model.trim="uiButtonForm.bgHover" placeholder="#29b6f6" />
              </label>
            </div>

            <div class="grid2">
              <label class="field">
                <span class="field__label">Texture URL (optional)</span>
                <input class="field__input" v-model.trim="uiButtonForm.textureUrl" placeholder="/person.png" />
              </label>
              <label class="field">
                <span class="field__label">Texture Hover URL (optional)</span>
                <input class="field__input" v-model.trim="uiButtonForm.textureUrlHover" placeholder="/spritesheet.png" />
              </label>
            </div>
            <label class="field">
              <span class="field__label">Scale Mode</span>
              <select class="field__input" v-model="uiButtonForm.scaleMode">
                <option value="stretch">stretch (растянуть)</option>
                <option value="contain">contain (вписать)</option>
                <option value="cover">cover (покрыть)</option>
                <option value="center">center (центр)</option>
              </select>
            </label>
          </div>

          <!-- Region Form -->
          <div v-else-if="createModal.type === 'region'" class="form">
            <label class="field">
              <span class="field__label">ID</span>
              <input class="field__input" v-model.trim="regionForm.id" placeholder="region_1" />
            </label>
            <div class="grid2">
              <label class="field">
                <span class="field__label">Name</span>
                <input class="field__input" v-model.trim="regionForm.name" placeholder="region_1" />
              </label>
              <label class="field">
                <span class="field__label">Display Name</span>
                <input class="field__input" v-model.trim="regionForm.displayName" placeholder="Region 1" />
              </label>
            </div>
            <label class="field">
              <span class="field__label">World</span>
              <select class="field__input" v-model="regionForm.worldId">
                <option v-for="w in worlds" :key="w.id" :value="w.id">{{ w.id }}</option>
              </select>
            </label>
            <div class="grid2">
              <label class="field">
                <span class="field__label">X</span>
                <input class="field__input" type="number" v-model.number="regionForm.x" />
              </label>
              <label class="field">
                <span class="field__label">Y</span>
                <input class="field__input" type="number" v-model.number="regionForm.y" />
              </label>
            </div>
            <div class="grid2">
              <label class="field">
                <span class="field__label">Width</span>
                <input class="field__input" type="number" v-model.number="regionForm.width" />
              </label>
              <label class="field">
                <span class="field__label">Height</span>
                <input class="field__input" type="number" v-model.number="regionForm.height" />
              </label>
            </div>
            <label class="field">
              <span class="field__label">Priority (higher = on top)</span>
              <input class="field__input" type="number" v-model.number="regionForm.priority" />
            </label>
            <label class="field">
              <span class="field__label">Texture URL (optional)</span>
              <input class="field__input" v-model.trim="regionForm.textureUrl" placeholder="/assets/grass.png" />
            </label>
            <div class="grid2" v-if="regionForm.textureUrl">
              <label class="field">
                <span class="field__label">Scale Mode</span>
                <select class="field__input" v-model="regionForm.textureScaleMode">
                  <option value="tile">tile (замостить)</option>
                  <option value="stretch">stretch (растянуть)</option>
                  <option value="center">center (центрировать)</option>
                </select>
              </label>
              <label class="field">
                <span class="field__label">Tint (optional)</span>
                <input class="field__input" v-model.trim="regionForm.tint" placeholder="#ffffff" />
              </label>
            </div>
            <label class="field field--row">
              <input type="checkbox" v-model="regionForm.showBorders" />
              <span class="field__label">Show region borders</span>
            </label>
            <div class="grid2" v-if="regionForm.showBorders">
              <label class="field">
                <span class="field__label">Border Color</span>
                <input class="field__input" v-model.trim="regionForm.borderColor" placeholder="#00FFFF" />
              </label>
              <label class="field">
                <span class="field__label">Border Width</span>
                <input class="field__input" type="number" v-model.number="regionForm.borderWidth" />
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

    <!-- JSON Export Modal -->
    <div v-if="jsonModal.open" class="modal-backdrop" @click.self="closeJsonModal">
      <div class="modal modal--json">
        <div class="modal__header">
          <div class="modal__title">{{ jsonModal.title }} - JSON Configuration</div>
          <button class="modal__close" @click="closeJsonModal">×</button>
        </div>

        <div class="modal__body">
          <div class="json__info">
            <span class="json__count">{{ jsonModal.items.length }} items</span>
            <button class="btn btn--small" @click="copyJsonToClipboard">📋 Copy</button>
          </div>
          <div class="json__tabs" v-if="jsonModal.items.length > 0">
            <button
              class="json__tab"
              :class="{ 'is-active': jsonModal.selectedIndex === -1 }"
              @click="jsonModal.selectedIndex = -1"
            >
              All ({{ jsonModal.items.length }})
            </button>
            <button
              v-for="(item, idx) in jsonModal.items"
              :key="idx"
              class="json__tab"
              :class="{ 'is-active': jsonModal.selectedIndex === idx }"
              @click="jsonModal.selectedIndex = idx"
            >
              {{ item.name || item.id }}
            </button>
          </div>
          <textarea class="json__output" readonly v-model="jsonModal.selectedJson" spellcheck="false"></textarea>
        </div>

        <div class="modal__footer">
          <button class="btn" @click="closeJsonModal">Close</button>
          <button class="btn btn--primary" @click="copyJsonToClipboard">📋 Copy to Clipboard</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, markRaw, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { World } from '../../../pixi_game2/pixigame/src/World.js';
import { Region } from '../../../pixi_game2/pixigame/src/Region.js';
import { Canvas, Camera } from '../../../pixi_game2/pixigame-renderer/src/index.js';
import { createPixiDisplayObjectForUI } from '../../../pixi_game2/pixigame-renderer/src/UIRenderer.js';
import * as PIXI from 'pixi.js';
import { UITextEntity, UIButtonEntity } from '../../../pixi_game2/pixigame/src/entities/UIEntities.js';

// ---------------------------
// State
// ---------------------------
const worlds = reactive([]);   // { id, type, width, height, backgroundColor, instance }
const canvases = reactive([]); // { id, sizeMode, width, height, backgroundColor, antialias, resolution, instance }
const cameras = reactive([]);  // { id, canvasId, worldId, width, height, x, y, focusX, focusY, zoom, priority, minZoom, maxZoom, anchor, instance }
const uiEntities = reactive([]); // { id, subtype, bindingLabel, instance }
const regions = reactive([]);  // { id, worldId, displayName, bounds, regionType, regionInstanceId }

const selected = ref(null); // { type: 'world'|'canvas'|'camera'|'ui'|'region', id }

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

// JSON Export Modal
const jsonModal = reactive({
  open: false,
  title: '',
  items: [], // { id, name, json }
  selectedIndex: 0,
  get selectedJson() {
    if (this.items.length === 0) return '';
    if (this.selectedIndex === -1) {
      // All items as array
      const allItems = this.items.map(item => JSON.parse(item.json));
      return JSON.stringify(allItems, null, 2);
    }
    return this.items[this.selectedIndex]?.json || '';
  }
});

// Helper for computed selected JSON
watch(() => jsonModal.selectedIndex, () => {
  // Trigger reactivity
});

const worldForm = reactive({
  id: '',
  type: 'bounded',
  width: 1000,
  height: 1000,
  backgroundColor: '#000000',
  textureUrl: '',
  textureScaleMode: 'tile',
  tint: '',
  showBounds: false,
  boundsColor: '#FF4444',
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
  maxZoom: 5.0,
  worldBackgroundColor: '#2a2a2a'
});

const uiTextForm = reactive({
  id: '',
  bindTo: 'canvas', // canvas|camera|world
  canvasId: '',
  cameraId: '',
  worldId: '',
  x: 20,
  y: 20,
  screenSpace: true,
  content: 'Hello UI',
  fontSize: 18,
  color: '#ffffff'
});

const uiButtonForm = reactive({
  id: '',
  bindTo: 'canvas', // canvas|camera|world
  canvasId: '',
  cameraId: '',
  worldId: '',
  x: 20,
  y: 60,
  screenSpace: true,
  label: 'Click me',
  width: 160,
  height: 44,
  bg: '#4fc3f7',
  bgHover: '#29b6f6',
  textureUrl: '',
  textureUrlHover: '',
  scaleMode: 'stretch'
});

const regionForm = reactive({
  id: '',
  name: '',
  displayName: '',
  worldId: '',
  x: 100,
  y: 100,
  width: 300,
  height: 300,
  priority: 1,
  textureUrl: '',
  textureScaleMode: 'tile',
  tint: '',
  showBorders: false,
  borderColor: '#00FFFF',
  borderWidth: 3
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
  } else if (type === 'ui_text') {
    uiTextForm.id = suggestId('ui_text', uiEntities);
    uiTextForm.bindTo = canvases.length ? 'canvas' : (cameras.length ? 'camera' : 'world');
    uiTextForm.canvasId = canvases[0]?.id || '';
    uiTextForm.cameraId = cameras[0]?.id || '';
    uiTextForm.worldId = worlds[0]?.id || '';
  } else if (type === 'ui_button') {
    uiButtonForm.id = suggestId('ui_button', uiEntities);
    uiButtonForm.bindTo = canvases.length ? 'canvas' : (cameras.length ? 'camera' : 'world');
    uiButtonForm.canvasId = canvases[0]?.id || '';
    uiButtonForm.cameraId = cameras[0]?.id || '';
    uiButtonForm.worldId = worlds[0]?.id || '';
  } else if (type === 'region') {
    regionForm.id = suggestId('region', regions);
    regionForm.name = `region_${regions.length + 1}`;
    regionForm.displayName = `Region ${regions.length + 1}`;
    regionForm.worldId = worlds[0]?.id || '';
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
  } else if (createModal.type === 'ui_text') {
    createUITextFromForm();
    closeCreate();
  } else if (createModal.type === 'ui_button') {
    createUIButtonFromForm();
    closeCreate();
  } else if (createModal.type === 'region') {
    createRegionFromForm();
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
// JSON Export
// ---------------------------
function openJsonModal(type) {
  jsonModal.open = true;
  jsonModal.items = [];
  jsonModal.selectedIndex = 0;

  switch (type) {
    case 'all':
      jsonModal.title = 'Full Project Setup';
      jsonModal.items = [{
        id: 'all',
        name: 'All Data',
        json: JSON.stringify(getAllProjectJson(), null, 2)
      }];
      break;
    case 'world':
      jsonModal.title = 'Worlds';
      jsonModal.items = worlds.map(w => ({
        id: w.id,
        name: w.id,
        json: JSON.stringify(getWorldJsonConfig(w), null, 2)
      }));
      break;
    case 'canvas':
      jsonModal.title = 'Canvases';
      jsonModal.items = canvases.map(c => ({
        id: c.id,
        name: c.id,
        json: JSON.stringify(getCanvasJsonConfig(c), null, 2)
      }));
      break;
    case 'camera':
      jsonModal.title = 'Cameras';
      jsonModal.items = cameras.map(c => ({
        id: c.id,
        name: c.id,
        json: JSON.stringify(getCameraJsonConfig(c), null, 2)
      }));
      break;
    case 'ui':
      jsonModal.title = 'UI Entities';
      jsonModal.items = uiEntities.map(u => ({
        id: u.id,
        name: `${u.subtype}: ${u.id}`,
        json: JSON.stringify(getUIJsonConfig(u), null, 2)
      }));
      break;
    case 'region':
      jsonModal.title = 'Regions';
      jsonModal.items = regions.map(r => ({
        id: r.id,
        name: r.displayName,
        json: JSON.stringify(getRegionJsonConfig(r), null, 2)
      }));
      break;
  }
}

function closeJsonModal() {
  jsonModal.open = false;
  jsonModal.items = [];
  jsonModal.selectedIndex = 0; // Reset to first item, not -1 (All)
}

async function copyJsonToClipboard() {
  try {
    await navigator.clipboard.writeText(jsonModal.selectedJson);
    console.log('JSON copied to clipboard');
  } catch (err) {
    console.error('Failed to copy:', err);
  }
}

// JSON config extractors
function getWorldJsonConfig(worldModel) {
  const w = worldModel.instance;
  return {
    id: worldModel.id,
    type: worldModel.type,
    width: worldModel.width,
    height: worldModel.height,
    backgroundColor: worldModel.backgroundColor,
    showBounds: w.showBounds,
    boundsColor: w.boundsColor,
    backgroundTexture: w.backgroundTexture.textureUrl ? {
      textureUrl: w.backgroundTexture.textureUrl,
      scaleMode: w.backgroundTexture.scaleMode,
      tint: w.backgroundTexture.tint
    } : undefined,
    regions: w.regionSystem.getAllRegions().map(r => ({
      id: r.id,
      displayName: r.displayName,
      bounds: r.bounds,
      hasTexture: r.hasTexture,
      bordersEnabled: r.bordersEnabled
    }))
  };
}

function getCanvasJsonConfig(canvasModel) {
  return {
    id: canvasModel.id,
    sizeMode: canvasModel.sizeMode,
    width: canvasModel.width,
    height: canvasModel.height,
    backgroundColor: canvasModel.backgroundColor,
    antialias: canvasModel.antialias,
    resolution: canvasModel.resolution,
    cameraCount: cameras.filter(c => c.canvasId === canvasModel.id).length
  };
}

function getCameraJsonConfig(cameraModel) {
  const c = cameraModel.instance;
  return {
    id: cameraModel.id,
    canvasId: cameraModel.canvasId,
    worldId: cameraModel.worldId,
    anchor: cameraModel.anchor,
    width: cameraModel.width,
    height: cameraModel.height,
    x: cameraModel.x,
    y: cameraModel.y,
    focusX: c.focusX,
    focusY: c.focusY,
    zoom: c.zoom,
    minZoom: c.minZoom,
    maxZoom: c.maxZoom,
    priority: cameraModel.priority
  };
}

function getUIJsonConfig(uiModel) {
  const u = uiModel.instance;
  const base = {
    id: uiModel.id,
    subtype: uiModel.subtype,
    bindingLabel: uiModel.bindingLabel,
    screenSpace: u.screenSpace,
    position: u.position,
    rotation: u.rotation,
    scale: u.scale,
    visible: u.visible,
    opacity: u.opacity,
    z_index: u.z_index
  };

  if (uiModel.subtype === 'text') {
    return {
      ...base,
      text: u.text
    };
  } else if (uiModel.subtype === 'button') {
    return {
      ...base,
      text: u.text,
      button: u.button
    };
  }
  return base;
}

function getRegionJsonConfig(regionModel) {
  const r = regionModel.regionType;
  return {
    id: regionModel.id,
    name: r.name,
    displayName: regionModel.displayName,
    worldId: regionModel.worldId,
    bounds: regionModel.bounds,
    groundTexture: r.groundTexture.textureUrl ? {
      textureUrl: r.groundTexture.textureUrl,
      scaleMode: r.groundTexture.scaleMode,
      tint: r.groundTexture.tint
    } : undefined,
    borders: {
      enabled: r.borders.enabled,
      color: r.borders.color,
      width: r.borders.width,
      alpha: r.borders.alpha
    }
  };
}

function getAllProjectJson() {
  return {
    version: '1.0',
    timestamp: new Date().toISOString(),
    worlds: worlds.map(w => getWorldJsonConfig(w)),
    canvases: canvases.map(c => getCanvasJsonConfig(c)),
    cameras: cameras.map(c => getCameraJsonConfig(c)),
    uiEntities: uiEntities.map(u => getUIJsonConfig(u)),
    regions: regions.map(r => getRegionJsonConfig(r)),
    summary: {
      worldCount: worlds.length,
      canvasCount: canvases.length,
      cameraCount: cameras.length,
      uiEntityCount: uiEntities.length,
      regionCount: regions.length
    }
  };
}

// ---------------------------
// Create / Remove
// ---------------------------
function createWorldFromForm() {
  const id = worldForm.id?.trim() || suggestId('world', worlds);
  if (worlds.some((w) => w.id === id)) return;

  const backgroundTexture = {};
  if (worldForm.textureUrl?.trim()) {
    backgroundTexture.textureUrl = worldForm.textureUrl.trim();
    backgroundTexture.scaleMode = worldForm.textureScaleMode || 'tile';
    if (worldForm.tint?.trim()) {
      backgroundTexture.tint = worldForm.tint.trim();
    }
  }

  const instance = markRaw(new World({
    id,
    type: worldForm.type,
    width: Number(worldForm.width) || 1000,
    height: Number(worldForm.height) || 1000,
    backgroundColor: worldForm.backgroundColor || '#000000',
    backgroundTexture: Object.keys(backgroundTexture).length > 0 ? backgroundTexture : undefined,
    showBounds: !!worldForm.showBounds,
    boundsColor: worldForm.boundsColor || '#FF4444'
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
    // enable pointer events (needed for UI buttons)
    try {
      instance.app.stage.eventMode = 'static';
      instance.app.stage.hitArea = instance.app.screen;
    } catch (_) {}

    // ensure overlay layer for canvas-level UI
    ensureCanvasUILayer(model);
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
    worldBackgroundColor: cameraForm.worldBackgroundColor || '#2a2a2a',
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

  // ensure camera UI/world UI layers
  ensureCameraUILayers(model);
}

function removeWorld(worldId) {
  // remove cameras referencing this world
  const camsToRemove = cameras.filter((c) => c.worldId === worldId).map((c) => c.id);
  for (const camId of camsToRemove) removeCamera(camId);

  // remove UI bound directly to this world
  const uiToRemove = uiEntities.filter((u) => u.instance.worldId === worldId).map((u) => u.id);
  for (const id of uiToRemove) removeUI(id);

  const idx = worlds.findIndex((w) => w.id === worldId);
  if (idx >= 0) worlds.splice(idx, 1);

  if (selected.value?.type === 'world' && selected.value.id === worldId) selected.value = null;
}

function removeCanvas(canvasId) {
  // remove cameras attached to this canvas
  const camsToRemove = cameras.filter((c) => c.canvasId === canvasId).map((c) => c.id);
  for (const camId of camsToRemove) removeCamera(camId);

  // remove UI bound directly to this canvas
  const uiToRemove = uiEntities.filter((u) => u.instance.canvasId === canvasId).map((u) => u.id);
  for (const id of uiToRemove) removeUI(id);

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

  // remove UI bound directly to this camera
  const uiToRemove = uiEntities.filter((u) => u.instance.cameraId === cameraId).map((u) => u.id);
  for (const id of uiToRemove) removeUI(id);

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
  else if (type === 'ui') removeUI(id);
  else if (type === 'region') removeRegion(id);
}

function resetAll() {
  // remove everything in safe order: regions -> ui -> cameras -> canvases -> worlds
  for (const r of [...regions]) removeRegion(r.id);
  for (const u of [...uiEntities]) removeUI(u.id);
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
const selectedUI = computed(() => (selected.value?.type === 'ui' ? uiEntities.find((u) => u.id === selected.value.id) : null));
const selectedRegion = computed(() => (selected.value?.type === 'region' ? regions.find((r) => r.id === selected.value.id) : null));

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
// UI Entities (Entity + UI)
// ---------------------------
const uiDisplayCache = new Map(); // key -> PIXI.DisplayObject

function getBindingLabel(entity) {
  if (entity.canvasId) return `canvas:${entity.canvasId}`;
  if (entity.cameraId) return `camera:${entity.cameraId}`;
  if (entity.worldId) return `world:${entity.worldId}`;
  return 'unbound';
}

function ensureCanvasUILayer(canvasModel) {
  if (!canvasModel?.instance?.app) return;
  if (canvasModel.uiOverlay) return;
  const layer = markRaw(new PIXI.Container());
  try { layer.sortableChildren = true; } catch (_) {}
  layer.zIndex = 50000;
  canvasModel.instance.app.stage.addChild(layer);
  canvasModel.uiOverlay = layer;
}

function ensureCameraUILayers(camModel) {
  const cam = camModel?.instance;
  if (!cam?.container) return;

  // UI in camera viewport coords (not affected by world focus)
  if (!camModel.uiLayer) {
    const layer = markRaw(new PIXI.Container());
    try { layer.sortableChildren = true; } catch (_) {}
    layer.zIndex = 50000;
    cam.container.addChild(layer);
    camModel.uiLayer = layer;
  }

  // UI in world coords but drawn above entities (affected by focus/zoom)
  if (cam.worldLayer && !camModel.worldUiLayer) {
    const layer = markRaw(new PIXI.Container());
    try { layer.sortableChildren = true; } catch (_) {}
    layer.zIndex = 9000;
    cam.worldLayer.addChild(layer);
    camModel.worldUiLayer = layer;
  }
}

function destroyDisplayObject(obj) {
  if (!obj) return;
  try {
    if (obj.parent) obj.parent.removeChild(obj);
  } catch (_) {}
  try {
    obj.destroy?.({ children: true });
  } catch (_) {}
}

function removeUI(uiId) {
  const idx = uiEntities.findIndex((u) => u.id === uiId);
  if (idx < 0) return;

  // destroy pixi display objects for this ui entity
  const prefix = `ui:${uiId}::`;
  for (const [key, obj] of uiDisplayCache) {
    if (key.startsWith(prefix)) {
      destroyDisplayObject(obj);
      uiDisplayCache.delete(key);
    }
  }

  uiEntities.splice(idx, 1);
  if (selected.value?.type === 'ui' && selected.value.id === uiId) selected.value = null;
}

function ensureUIInstanceInContainer(uiModel, container, cacheKey, ctx = null) {
  if (!container) return;
  let obj = uiDisplayCache.get(cacheKey);
  if (!obj) {
    obj = markRaw(createPixiDisplayObjectForUI(uiModel.instance, { onAction: handleUIAction }));
    if (!obj) return;
    uiDisplayCache.set(cacheKey, obj);
    container.addChild(obj);
  } else if (obj.parent !== container) {
    container.addChild(obj);
  }

  const e = uiModel.instance;
  obj.x = Number(e.position?.x) || 0;
  obj.y = Number(e.position?.y) || 0;
  obj.rotation = Number(e.rotation) || 0;

  let sx = Number(e.scale?.x ?? 1);
  let sy = Number(e.scale?.y ?? 1);
  // Camera-bound UI can optionally scale with zoom
  if (ctx?.type === 'camera' && e.screenSpace === false) {
    const z = Number(ctx.camera?.zoom) || 1;
    sx *= z;
    sy *= z;
  }
  if (obj.scale?.set) obj.scale.set(sx, sy);
  else obj.scale = { x: sx, y: sy };

  obj.alpha = Number.isFinite(e.opacity) ? e.opacity : 1;
  obj.visible = e.visible !== false;
  obj.zIndex = Number.isFinite(e.z_index) ? e.z_index : 9999;
}

function handleUIAction(actionId, payload, entity) {
  // For now: simple demo action (network-friendly)
  if (actionId === 'console_log') {
    console.log(payload?.message ?? '[UI ACTION]', { actionId, payload, entity });
    return;
  }
  console.log('[UI ACTION]', { actionId, payload, entity });
}

function updateUITransforms() {
  // Attach/update UI in correct layers
  for (const u of uiEntities) {
    const ent = u.instance;
    if (ent.canvasId) {
      const canvasModel = canvases.find((c) => c.id === ent.canvasId);
      if (!canvasModel) {
        // cleanup orphaned
        cleanupCacheByPrefix(`ui:${u.id}::canvas:`);
        continue;
      }
      ensureCanvasUILayer(canvasModel);
      const key = `ui:${u.id}::canvas:${ent.canvasId}`;
      ensureUIInstanceInContainer(u, canvasModel.uiOverlay, key);
    } else if (ent.cameraId) {
      const camModel = cameras.find((c) => c.id === ent.cameraId);
      if (!camModel) {
        cleanupCacheByPrefix(`ui:${u.id}::camera:`);
        continue;
      }
      ensureCameraUILayers(camModel);
      const key = `ui:${u.id}::camera:${ent.cameraId}`;
      ensureUIInstanceInContainer(u, camModel.uiLayer, key, { type: 'camera', camera: camModel.instance });
    } else if (ent.worldId) {
      // render world-ui into every camera that watches that world
      const activeCams = cameras.filter((c) => c.worldId === ent.worldId);
      const activeIds = new Set(activeCams.map((c) => c.id));

      for (const camModel of activeCams) {
        ensureCameraUILayers(camModel);
        const key = `ui:${u.id}::world:${ent.worldId}::camera:${camModel.id}`;
        ensureUIInstanceInContainer(u, camModel.worldUiLayer, key);
      }

      // cleanup cached objects for cameras that no longer exist / no longer match
      const prefix = `ui:${u.id}::world:${ent.worldId}::camera:`;
      for (const [key, obj] of uiDisplayCache) {
        if (!key.startsWith(prefix)) continue;
        const camId = key.substring(prefix.length);
        if (!activeIds.has(camId)) {
          destroyDisplayObject(obj);
          uiDisplayCache.delete(key);
        }
      }
    }
  }
}

function cleanupCacheByPrefix(prefix) {
  for (const [key, obj] of uiDisplayCache) {
    if (key.startsWith(prefix)) {
      destroyDisplayObject(obj);
      uiDisplayCache.delete(key);
    }
  }
}

function createUITextFromForm() {
  const id = uiTextForm.id?.trim() || suggestId('ui_text', uiEntities);
  if (uiEntities.some((u) => u.id === id)) return;

  const bindTo = uiTextForm.bindTo;
  const binding = bindTo === 'canvas'
    ? { canvasId: uiTextForm.canvasId }
    : bindTo === 'camera'
      ? { cameraId: uiTextForm.cameraId }
      : { worldId: uiTextForm.worldId };

  const instance = markRaw(new UITextEntity({
    id,
    position: { x: Number(uiTextForm.x) || 0, y: Number(uiTextForm.y) || 0 },
    rotation: 0,
    scale: { x: 1, y: 1 },
    screenSpace: !!uiTextForm.screenSpace,
    ...binding,
    text: {
      content: uiTextForm.content || 'Hello UI',
      fontSize: Number(uiTextForm.fontSize) || 18,
      fontFamily: 'Arial',
      color: uiTextForm.color || '#ffffff',
      align: 'left'
    }
  }));

  const model = {
    id,
    subtype: 'text',
    bindingLabel: getBindingLabel(instance),
    instance
  };
  uiEntities.push(model);
  select({ type: 'ui', id });
}

function createUIButtonFromForm() {
  const id = uiButtonForm.id?.trim() || suggestId('ui_button', uiEntities);
  if (uiEntities.some((u) => u.id === id)) return;

  const bindTo = uiButtonForm.bindTo;
  const binding = bindTo === 'canvas'
    ? { canvasId: uiButtonForm.canvasId }
    : bindTo === 'camera'
      ? { cameraId: uiButtonForm.cameraId }
      : { worldId: uiButtonForm.worldId };

  const instance = markRaw(new UIButtonEntity({
    id,
    position: { x: Number(uiButtonForm.x) || 0, y: Number(uiButtonForm.y) || 0 },
    rotation: 0,
    scale: { x: 1, y: 1 },
    screenSpace: !!uiButtonForm.screenSpace,
    ...binding,
    text: {
      content: uiButtonForm.label || 'Click',
      fontSize: 16,
      fontFamily: 'Arial',
      textColor: '#111111'
    },
    button: {
      width: Number(uiButtonForm.width) || 160,
      height: Number(uiButtonForm.height) || 44,
      background: {
        color: uiButtonForm.bg || '#4fc3f7',
        colorHover: uiButtonForm.bgHover || '#29b6f6',
        textureUrl: uiButtonForm.textureUrl?.trim() || null,
        textureUrlHover: uiButtonForm.textureUrlHover?.trim() || null,
        scaleMode: uiButtonForm.scaleMode || 'stretch',
      },
      actionId: 'console_log',
      actionPayload: { message: `[UI BUTTON CLICK] ${id}` }
    }
  }));

  const model = {
    id,
    subtype: 'button',
    bindingLabel: getBindingLabel(instance),
    instance
  };
  uiEntities.push(model);
  select({ type: 'ui', id });
}

function createRegionFromForm() {
  const id = regionForm.id?.trim() || suggestId('region', regions);
  if (regions.some((r) => r.id === id)) return;

  const worldModel = worlds.find((w) => w.id === regionForm.worldId);
  if (!worldModel) return;

  // Создаём тип региона
  const regionType = markRaw(new Region({
    id: `region_type_${id}`,
    name: regionForm.name || id,
    displayName: regionForm.displayName || regionForm.name || id,
    groundTexture: {
      textureUrl: regionForm.textureUrl?.trim() || null,
      scaleMode: regionForm.textureScaleMode || 'tile',
      tint: regionForm.tint?.trim() || null
    },
    borders: {
      enabled: !!regionForm.showBorders,
      color: regionForm.borderColor || '#00FFFF',
      width: Number(regionForm.borderWidth) || 3,
      alpha: 1.0
    }
  }));

  // Добавляем регион в мир
  const regionInstanceId = worldModel.instance.regionSystem.addRegion(regionType, {
    x: Number(regionForm.x) || 0,
    y: Number(regionForm.y) || 0,
    width: Number(regionForm.width) || 300,
    height: Number(regionForm.height) || 300,
    priority: Number(regionForm.priority) || 1
  });

  const model = {
    id,
    worldId: worldModel.id,
    displayName: regionType.displayName,
    bounds: {
      x: Number(regionForm.x) || 0,
      y: Number(regionForm.y) || 0,
      width: Number(regionForm.width) || 300,
      height: Number(regionForm.height) || 300,
      priority: Number(regionForm.priority) || 1
    },
    regionType,
    regionInstanceId
  };

  regions.push(model);
  select({ type: 'region', id });
}

function removeRegion(regionId) {
  const regionModel = regions.find((r) => r.id === regionId);
  if (!regionModel) return;

  const worldModel = worlds.find((w) => w.id === regionModel.worldId);
  if (worldModel) {
    worldModel.instance.regionSystem.removeRegion(regionModel.regionInstanceId);
  }

  const idx = regions.findIndex((r) => r.id === regionId);
  if (idx >= 0) regions.splice(idx, 1);

  if (selected.value?.type === 'region' && selected.value.id === regionId) selected.value = null;
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

  // Update UI transforms (camera-bound scaling, etc.)
  updateUITransforms();

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
  // Preload textures from public/assets manifest into PIXI.Assets cache
  preloadPublicAssetsToCache();
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

let _assetsPreloadStarted = false;
async function preloadPublicAssetsToCache() {
  if (_assetsPreloadStarted) return;
  _assetsPreloadStarted = true;
  try {
    const res = await fetch('/assets/manifest.json', { cache: 'no-cache' });
    if (!res.ok) return;
    const json = await res.json();
    const images = Array.isArray(json?.images) ? json.images : [];
    if (images.length === 0) return;
    await PIXI.Assets.load(images);
  } catch (_) {
    // ignore
  }
}
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
.toolbar__divider {
  width: 1px;
  height: 22px;
  background: rgba(255, 255, 255, 0.10);
  margin: 0 6px;
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.panel__title {
  font-weight: 900;
  font-size: 14px;
}
.panel__json-btn {
  border: none;
  background: rgba(79, 195, 247, 0.15);
  color: #7bd3ff;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
.panel__json-btn:hover { background: rgba(79, 195, 247, 0.25); }

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
.tree__add-group { display: flex; gap: 6px; }
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

/* Tree Actions */
.tree__actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.tree__add-group { display: flex; gap: 6px; }
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
.tree__json:hover { background: rgba(123, 211, 255, 0.10); }

/* JSON Modal */
.modal--json {
  width: min(800px, 96vw);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}
.json__info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.json__count {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.65);
}
.btn--small {
  height: 28px;
  padding: 0 10px;
  font-size: 13px;
}
.json__tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.json__tab {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s ease;
}
.json__tab:hover { background: rgba(255, 255, 255, 0.08); }
.json__tab.is-active {
  background: rgba(79, 195, 247, 0.20);
  border-color: rgba(79, 195, 247, 0.30);
  color: #d9f4ff;
}
.json__output {
  width: 100%;
  min-height: 300px;
  max-height: 500px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(0, 0, 0, 0.30);
  color: #bfe7ff;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  line-height: 1.5;
  resize: vertical;
}
.json__output:focus {
  outline: 2px solid rgba(79, 195, 247, 0.25);
  border-color: rgba(79, 195, 247, 0.30);
}
</style>

