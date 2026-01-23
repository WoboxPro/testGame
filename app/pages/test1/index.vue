<template>
  <div class="editor">
    <Toolbar
      v-model="leftPanelMode"
      :has-selection="!!selected"
      @delete-selected="removeSelected"
      @reset="resetAll"
    />

    <div class="layout">
      <!-- Left Panel: Hierarchy or General Settings -->
      <aside class="panel hierarchy">
        <!-- Game Settings Mode (Hierarchy) -->
        <template v-if="leftPanelMode === 'hierarchy'">
          <div class="panel__header">
            <span class="panel__title">Hierarchy</span>
            <button class="panel__json-btn" @click="openJsonModal('all')" title="Export All JSON">{ } All</button>
          </div>

          <HierarchyTree
            :worlds="worlds"
            :canvases="canvases"
            :cameras="cameras"
            :ui-entities="uiEntities"
            :game-entities="gameEntities"
            :regions="regions"
            :controllers="controllers"
            :collision-types="getCollisionTypes()"
            :collision-relations="getCollisionRelations()"
            :selected="selected"
            @select="select"
            @add="openCreate"
            @delete="handleTreeDelete"
            @json="openJsonModal"
            @delete-collision-type="removeCollisionType"
          />
        </template>

        <!-- General Mode (Time Settings) -->
        <template v-else>
          <div class="panel__header">
            <span class="panel__title">General</span>
          </div>
          <div class="inspector__content">
            <div class="inspector__title">Game Settings</div>

            <!-- Time Scale -->
            <div class="inspector__group">
              <div class="inspector__label">Time Scale: {{ gameSettingsUi.timeScale.toFixed(2) }}x</div>
              <input
                type="range"
                v-model.number="gameSettingsUi.timeScale"
                min="0.1"
                max="3.0"
                step="0.1"
              />
              <div class="inspector__value">
                {{ gameSettingsUi.timeScale < 0.5 ? '🐢 Slow' : gameSettingsUi.timeScale > 1.5 ? '🐇 Fast' : '⏱️ Normal' }}
              </div>
            </div>

            <!-- Pause -->
            <div class="inspector__group">
              <div class="inspector__label">Game State</div>
              <button
                class="btn"
                :class="{ 'btn--danger': gameSettingsUi.paused, 'btn--success': !gameSettingsUi.paused }"
                @click="gameSettingsUi.paused = !gameSettingsUi.paused"
              >
                {{ gameSettingsUi.paused ? '▶️ Resume' : '⏸️ Pause' }}
              </button>
              <div class="inspector__value" style="margin-top: 8px;">
                {{ gameSettingsUi.paused ? 'Game Paused' : 'Game Running' }}
              </div>
            </div>

            <!-- Reset -->
            <div class="inspector__group">
              <button class="btn btn--secondary" @click="gameSettingsUi.timeScale = 1.0; gameSettingsUi.paused = false;">
                ↺ Reset to Defaults
              </button>
            </div>
          </div>
          <!-- Триггер реактивности для обновления UI при изменениях из TimeSystem -->
          <span style="display: none">{{ gameSettingsTrigger }}</span>
        </template>
      </aside>

      <!-- Viewport Area -->
      <Viewport
        :canvases="canvases"
        @canvas-host="setCanvasHost"
      />

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
            <div class="kv__row"><div class="kv__k">Following Entity</div><div class="kv__v">{{ selectedCamera.followEntityId ? getEntityLabelById(selectedCamera.followEntityId) : 'None' }}</div></div>
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

          <div class="inspector__section">
            <div class="inspector__section-title">Visibility</div>
            <label class="field">
              <span class="field__label">Mode</span>
              <select class="field__input" v-model="cameraUi.showMode" @change="applySelectedCameraUi">
                <option value="all">Show All</option>
                <option value="selected">Show Only Selected</option>
              </select>
            </label>

            <template v-if="cameraUi.showMode === 'selected'">
              <label class="field field--row">
                <input type="checkbox" v-model="cameraUi.showRegions" @change="applySelectedCameraUi" />
                <span class="field__label">Show Regions</span>
              </label>
              <label class="field field--row">
                <input type="checkbox" v-model="cameraUi.showRegionBorders" @change="applySelectedCameraUi" />
                <span class="field__label">Show Region Borders</span>
              </label>
              <label class="field field--row">
                <input type="checkbox" v-model="cameraUi.showGameEntities" @change="applySelectedCameraUi" />
                <span class="field__label">Show Game Entities</span>
              </label>
              <label class="field field--row">
                <input type="checkbox" v-model="cameraUi.showUIEntities" @change="applySelectedCameraUi" />
                <span class="field__label">Show UI Entities</span>
              </label>
            </template>
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

        <!-- GameEntity Inspector -->
        <div v-else-if="selected.type === 'game_entity' && selectedGameEntity" class="inspector__content">
          <div class="inspector__title">Entity: {{ selectedGameEntity.id }}</div>
          <div class="kv">
            <div class="kv__row"><div class="kv__k">Type</div><div class="kv__v">{{ selectedGameEntity.subtype }}</div></div>
            <div class="kv__row"><div class="kv__k">World</div><div class="kv__v">{{ selectedGameEntity.worldId }}</div></div>
            <div class="kv__row"><div class="kv__k">Shape</div><div class="kv__v">{{ selectedGameEntity.appearance.shape }}</div></div>
            <div class="kv__row"><div class="kv__k">Color</div><div class="kv__v" :style="{color: '#' + selectedGameEntity.instance.appearance.color.toString(16).padStart(6, '0')}">{{ '#' + selectedGameEntity.instance.appearance.color.toString(16).padStart(6, '0') }}</div></div>
            <div class="kv__row" v-if="selectedGameEntity.appearance.shape === 'circle'"><div class="kv__k">Size</div><div class="kv__v">{{ selectedGameEntity.appearance.size }}</div></div>
            <div class="kv__row" v-else><div class="kv__k">Size</div><div class="kv__v">{{ selectedGameEntity.appearance.width }}×{{ selectedGameEntity.appearance.height }}</div></div>
            <div class="kv__row"><div class="kv__k">Position</div><div class="kv__v">{{ selectedGameEntity.instance.position.x }}, {{ selectedGameEntity.instance.position.y }}</div></div>
            <div class="kv__row"><div class="kv__k">Collision</div><div class="kv__v">{{ selectedGameEntity.instance.hasCollision ? 'enabled' : 'disabled' }}</div></div>
            <div class="kv__row"><div class="kv__k">Max Speed</div><div class="kv__v">{{ selectedGameEntity.instance.movement.maxSpeed }}</div></div>
            <div class="kv__row"><div class="kv__k">Acceleration</div><div class="kv__v">{{ selectedGameEntity.instance.movement.acceleration }}</div></div>
            <div class="kv__row"><div class="kv__k">Friction</div><div class="kv__v">{{ selectedGameEntity.instance.movement.friction }}</div></div>
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

        <!-- Controller Inspector -->
        <div v-else-if="selected.type === 'controller' && selectedController" class="inspector__content">
          <div class="inspector__title">Controller: {{ selectedController.id }}</div>
          <div class="kv">
            <div class="kv__row"><div class="kv__k">Type</div><div class="kv__v">{{ selectedController.type }}</div></div>
            <div class="kv__row"><div class="kv__k">Target</div><div class="kv__v">{{ selectedController.targetId || 'none' }}</div></div>
            <template v-if="selectedController.type === 'entity'">
              <div class="kv__row"><div class="kv__k">Max Speed</div><div class="kv__v">{{ selectedController.instance.target?.movement?.maxSpeed || 'N/A' }}</div></div>
              <div class="kv__row"><div class="kv__k">Acceleration</div><div class="kv__v">{{ selectedController.instance.target?.movement?.acceleration || 'N/A' }}</div></div>
              <div class="kv__row"><div class="kv__k">Friction</div><div class="kv__v">{{ selectedController.instance.target?.movement?.friction || 'N/A' }}</div></div>
            </template>
            <template v-if="selectedController.type === 'camera'">
              <div class="kv__row"><div class="kv__k">Move Speed</div><div class="kv__v">{{ selectedController.instance.moveSpeed }}</div></div>
              <div class="kv__row"><div class="kv__k">Zoom Speed</div><div class="kv__v">{{ selectedController.instance.zoomSpeed }}</div></div>
              <div class="kv__row"><div class="kv__k">Min Zoom</div><div class="kv__v">{{ selectedController.instance.minZoom }}</div></div>
              <div class="kv__row"><div class="kv__k">Max Zoom</div><div class="kv__v">{{ selectedController.instance.maxZoom }}</div></div>
            </template>
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
              <span class="field__label">Follow Entity (optional)</span>
              <select class="field__input" v-model="cameraForm.followEntityId">
                <option value="">None</option>
                <option v-for="e in gameEntities" :key="e.id" :value="e.entityId">{{ e.id }} ({{ e.subtype }})</option>
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

            <div class="form__section">
              <div class="form__section-title">Visibility (what to show)</div>
              <label class="field">
                <span class="field__label">Mode</span>
                <select class="field__input" v-model="cameraForm.showMode">
                  <option value="all">Show All</option>
                  <option value="selected">Show Only Selected</option>
                </select>
              </label>

              <template v-if="cameraForm.showMode === 'selected'">
                <label class="field field--row">
                  <input type="checkbox" v-model="cameraForm.showRegions" />
                  <span class="field__label">Show Regions</span>
                </label>
                <label class="field field--row">
                  <input type="checkbox" v-model="cameraForm.showRegionBorders" />
                  <span class="field__label">Show Region Borders</span>
                </label>
                <label class="field field--row">
                  <input type="checkbox" v-model="cameraForm.showGameEntities" />
                  <span class="field__label">Show Game Entities</span>
                </label>
                <label class="field field--row">
                  <input type="checkbox" v-model="cameraForm.showUIEntities" />
                  <span class="field__label">Show UI Entities</span>
                </label>
              </template>
            </div>

            <label class="field field--row">
              <input type="checkbox" v-model="cameraForm.createDefaultController" />
              <span class="field__label">Create default controller (5213 movement, Numpad +/- zoom, Tab to switch)</span>
            </label>
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

          <!-- Game Entity Form -->
          <div v-else-if="createModal.type === 'game_entity'" class="form">
            <label class="field">
              <span class="field__label">ID</span>
              <input class="field__input" v-model.trim="gameEntityForm.id" placeholder="unit_1" />
            </label>
            <label class="field">
              <span class="field__label">World</span>
              <select class="field__input" v-model="gameEntityForm.worldId">
                <option v-for="w in worlds" :key="w.id" :value="w.id">{{ w.id }}</option>
              </select>
            </label>
            <label class="field">
              <span class="field__label">Type</span>
              <select class="field__input" v-model="gameEntityForm.subtype">
                <option value="unit">Unit (юнит)</option>
                <option value="build">Build (здание)</option>
              </select>
            </label>
            <label class="field">
              <span class="field__label">Shape</span>
              <select class="field__input" v-model="gameEntityForm.shape">
                <option value="circle">Circle (круг)</option>
                <option value="rect">Rectangle (квадрат)</option>
              </select>
            </label>
            <label class="field">
              <span class="field__label">Color</span>
              <input class="field__input" v-model.trim="gameEntityForm.color" placeholder="#4fc3f7" />
            </label>
            <div class="grid2">
              <label class="field">
                <span class="field__label">X</span>
                <input class="field__input" type="number" v-model.number="gameEntityForm.x" />
              </label>
              <label class="field">
                <span class="field__label">Y</span>
                <input class="field__input" type="number" v-model.number="gameEntityForm.y" />
              </label>
            </div>
            <div v-if="gameEntityForm.shape === 'circle'">
              <label class="field">
                <span class="field__label">Size (radius × 2)</span>
                <input class="field__input" type="number" v-model.number="gameEntityForm.size" />
              </label>
            </div>
            <div v-else>
              <div class="grid2">
                <label class="field">
                  <span class="field__label">Width</span>
                  <input class="field__input" type="number" v-model.number="gameEntityForm.width" />
                </label>
                <label class="field">
                  <span class="field__label">Height</span>
                  <input class="field__input" type="number" v-model.number="gameEntityForm.height" />
                </label>
              </div>
            </div>
            <label class="field field--row">
              <input type="checkbox" v-model="gameEntityForm.hasCollision" />
              <span class="field__label">Has Collision</span>
            </label>
            <label class="field" v-if="gameEntityForm.hasCollision">
              <span class="field__label">Collision Scale (1.0 = 100%)</span>
              <input class="field__input" type="number" step="0.1" min="0.1" max="3.0" v-model.number="gameEntityForm.collisionScale" />
            </label>

            <div class="form__section">
              <div class="form__section-title">Movement</div>
              <div class="grid2">
                <label class="field">
                  <span class="field__label">Max Speed</span>
                  <input class="field__input" type="number" v-model.number="gameEntityForm.maxSpeed" />
                </label>
                <label class="field">
                  <span class="field__label">Acceleration</span>
                  <input class="field__input" type="number" v-model.number="gameEntityForm.acceleration" />
                </label>
              </div>
              <label class="field">
                <span class="field__label">Friction</span>
                <input class="field__input" type="number" v-model.number="gameEntityForm.friction" />
              </label>
            </div>
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

          <!-- Controller Form -->
          <div v-else-if="createModal.type === 'controller'" class="form">
            <label class="field">
              <span class="field__label">ID</span>
              <input class="field__input" v-model.trim="controllerForm.id" placeholder="controller_1" />
            </label>
            <label class="field">
              <span class="field__label">Type</span>
              <select class="field__input" v-model="controllerForm.type">
                <option value="camera">Camera</option>
                <option value="entity">Entity</option>
              </select>
            </label>

            <!-- Camera-specific fields -->
            <template v-if="controllerForm.type === 'camera'">
              <label class="field">
                <span class="field__label">Camera</span>
                <select class="field__input" v-model="controllerForm.cameraId">
                  <option v-for="c in cameras" :key="c.id" :value="c.id">{{ c.id }}</option>
                </select>
              </label>
              <div class="grid2">
                <label class="field">
                  <span class="field__label">Move Speed</span>
                  <input class="field__input" type="number" v-model.number="controllerForm.moveSpeed" />
                </label>
                <label class="field">
                  <span class="field__label">Zoom Speed</span>
                  <input class="field__input" type="number" v-model.number="controllerForm.zoomSpeed" />
                </label>
              </div>
              <div class="grid2">
                <label class="field">
                  <span class="field__label">Min Zoom</span>
                  <input class="field__input" type="number" step="0.1" v-model.number="controllerForm.minZoom" />
                </label>
                <label class="field">
                  <span class="field__label">Max Zoom</span>
                  <input class="field__input" type="number" step="0.1" v-model.number="controllerForm.maxZoom" />
                </label>
              </div>
            </template>

            <!-- Entity-specific fields -->
            <template v-else-if="controllerForm.type === 'entity'">
              <label class="field">
                <span class="field__label">Entity</span>
                <select class="field__input" v-model="controllerForm.entityId">
                  <option v-for="e in gameEntities" :key="e.id" :value="e.id">{{ e.id }} ({{ e.subtype }})</option>
                </select>
              </label>
              <div class="info-box">
                <strong>📝 Movement settings (maxSpeed, acceleration, friction) are now set in the Entity itself.</strong>
              </div>
            </template>

            <!-- Input Type Selection -->
            <label class="field">
              <span class="field__label">Input Type</span>
              <select class="field__input" v-model="controllerForm.inputType">
                <option value="keyboard">⌨️ Keyboard + Mouse</option>
                <option value="touch">📱 Touch (Virtual Joystick)</option>
              </select>
            </label>

            <!-- Touch Settings (only for entity controllers with touch input) -->
            <template v-if="controllerForm.type === 'entity' && controllerForm.inputType === 'touch'">
              <div class="info-box">
                <strong>🕹️ Touch Joystick Settings</strong>
              </div>

              <!-- Left Stick -->
              <label class="field field--row">
                <input type="checkbox" v-model="controllerForm.touchLeftStickEnabled" />
                <span class="field__label">Left Joystick (Movement)</span>
              </label>

              <template v-if="controllerForm.touchLeftStickEnabled">
                <label class="field">
                  <span class="field__label">Type</span>
                  <select class="field__input" v-model="controllerForm.touchLeftStickType">
                    <option value="static">Static (фиксированный)</option>
                    <option value="dynamic">Dynamic (в месте тача)</option>
                  </select>
                </label>

                <div class="grid2">
                  <label class="field">
                    <span class="field__label">Outer Radius (px)</span>
                    <input class="field__input" type="number" v-model.number="controllerForm.touchLeftStickOuterRadius" min="30" max="150" />
                  </label>
                  <label class="field">
                    <span class="field__label">Inner Radius (px)</span>
                    <input class="field__input" type="number" v-model.number="controllerForm.touchLeftStickInnerRadius" min="10" max="100" />
                  </label>
                </div>

                <div class="grid2">
                  <label class="field">
                    <span class="field__label">Deadzone (%)</span>
                    <input class="field__input" type="number" v-model.number="controllerForm.touchLeftStickDeadzone" min="0" max="50" />
                  </label>
                  <label class="field">
                    <span class="field__label">Position X (px)</span>
                    <input class="field__input" type="number" v-model.number="controllerForm.touchLeftStickX" />
                  </label>
                </div>
              </template>

              <!-- Right Stick (optional) -->
              <label class="field field--row">
                <input type="checkbox" v-model="controllerForm.touchRightStickEnabled" />
                <span class="field__label">Right Joystick (Aim/Action - Optional)</span>
              </label>

              <template v-if="controllerForm.touchRightStickEnabled">
                <label class="field">
                  <span class="field__label">Type</span>
                  <select class="field__input" v-model="controllerForm.touchRightStickType">
                    <option value="joystick">Joystick</option>
                    <option value="buttons">Buttons (задел)</option>
                  </select>
                </label>

                <template v-if="controllerForm.touchRightStickType === 'joystick'">
                  <label class="field">
                    <span class="field__label">Position Type</span>
                    <select class="field__input" v-model="controllerForm.touchRightStickPositionType">
                      <option value="static">Static (фиксированный)</option>
                      <option value="dynamic">Dynamic (в месте тача)</option>
                    </select>
                  </label>

                  <div class="grid2">
                    <label class="field">
                      <span class="field__label">Outer Radius (px)</span>
                      <input class="field__input" type="number" v-model.number="controllerForm.touchRightStickOuterRadius" min="30" max="150" />
                    </label>
                    <label class="field">
                      <span class="field__label">Inner Radius (px)</span>
                      <input class="field__input" type="number" v-model.number="controllerForm.touchRightStickInnerRadius" min="10" max="100" />
                    </label>
                  </div>

                  <div class="grid2">
                    <label class="field">
                      <span class="field__label">Deadzone (%)</span>
                      <input class="field__input" type="number" v-model.number="controllerForm.touchRightStickDeadzone" min="0" max="50" />
                    </label>
                    <label class="field" v-if="controllerForm.touchRightStickPositionType === 'static'">
                      <span class="field__label">Position X</span>
                      <select class="field__input" v-model="controllerForm.touchRightStickX">
                        <option value="right-80">Right (80px from edge)</option>
                        <option value="right-100">Right (100px from edge)</option>
                        <option value="right-120">Right (120px from edge)</option>
                      </select>
                    </label>
                    <div v-else class="field__label" style="color: #888;">
                      Appears on right side of screen
                    </div>
                  </div>
                </template>
              </template>
            </template>

            <label class="field field--row" v-if="controllerForm.inputType === 'keyboard'">
              <input type="checkbox" v-model="controllerForm.customBindings" />
              <span class="field__label">Custom key bindings</span>
            </label>

            <div v-if="controllerForm.customBindings && controllerForm.inputType === 'keyboard'" class="bindings-editor">
              <div class="info-box" style="margin-bottom: 12px;">
                <strong>⌨️ Click field and press key to record</strong>
              </div>

              <div class="binding-row" v-for="actionKey in getControllerActions(controllerForm.type)" :key="actionKey">
                <span class="binding-action">{{ formatActionName(actionKey) }}</span>
                <div class="binding-input-wrapper">
                  <input
                    class="binding-input"
                    :class="{ 'is-recording': keyRecording.action === actionKey && keyRecording.field === 'primary' }"
                    :value="controllerForm.bindings[actionKey]?.primary || ''"
                    :placeholder="keyRecording.action === actionKey && keyRecording.field === 'primary' ? 'Press any key...' : 'Primary key'"
                    readonly
                    @focus="startKeyRecording(actionKey, 'primary')"
                    @blur="stopKeyRecording"
                    @keydown="handleKeyRecording"
                  />
                  <button
                    v-if="controllerForm.bindings[actionKey]?.primary"
                    class="binding-clear"
                    @click="controllerForm.bindings[actionKey].primary = ''"
                    title="Clear"
                  >×</button>
                </div>
                <div class="binding-input-wrapper">
                  <input
                    class="binding-input"
                    :class="{ 'is-recording': keyRecording.action === actionKey && keyRecording.field === 'secondary' }"
                    :value="controllerForm.bindings[actionKey]?.secondary || ''"
                    :placeholder="keyRecording.action === actionKey && keyRecording.field === 'secondary' ? 'Press any key...' : 'Secondary (optional)'"
                    readonly
                    @focus="startKeyRecording(actionKey, 'secondary')"
                    @blur="stopKeyRecording"
                    @keydown="handleKeyRecording"
                  />
                  <button
                    v-if="controllerForm.bindings[actionKey]?.secondary"
                    class="binding-clear"
                    @click="controllerForm.bindings[actionKey].secondary = ''"
                    title="Clear"
                  >×</button>
                </div>
              </div>
            </div>

            <div v-else-if="controllerForm.inputType === 'keyboard'" class="info-box">
              <strong>🎮 Default controls:</strong><br>
              Movement: WASD (entity) or Numpad 5213 (camera)<br>
              Zoom: Numpad +/–<br>
              Switch: Tab or Numpad 0
            </div>

            <div v-else class="info-box">
              <strong>🕹️ Touch controls:</strong><br>
              Virtual joysticks will appear on canvas when touched
            </div>
          </div>

          <!-- Collision Type Form -->
          <div v-else-if="createModal.type === 'collision_type'" class="form">
            <label class="field">
              <span class="field__label">World</span>
              <select class="field__input" v-model="collisionTypeForm.worldId">
                <option v-for="w in worlds" :key="w.id" :value="w.id">{{ w.id }}</option>
              </select>
            </label>
            <label class="field">
              <span class="field__label">Type ID</span>
              <input class="field__input" v-model.trim="collisionTypeForm.id" placeholder="projectile" />
            </label>
            <label class="field">
              <span class="field__label">Display Name</span>
              <input class="field__input" v-model.trim="collisionTypeForm.name" placeholder="Projectile" />
            </label>
            <label class="field">
              <span class="field__label">Default Shape</span>
              <select class="field__input" v-model="collisionTypeForm.defaultShape">
                <option value="circle">Circle (круг)</option>
                <option value="rect">Rectangle (прямоугольник)</option>
              </select>
            </label>
          </div>

          <!-- Collision Relation Form -->
          <div v-else-if="createModal.type === 'collision_relation'" class="form">
            <label class="field">
              <span class="field__label">World</span>
              <select class="field__input" v-model="collisionRelationForm.worldId">
                <option v-for="w in worlds" :key="w.id" :value="w.id">{{ w.id }}</option>
              </select>
            </label>
            <label class="field">
              <span class="field__label">Type A</span>
              <select class="field__input" v-model="collisionRelationForm.typeA">
                <option v-for="type in getCollisionTypesForWorld(collisionRelationForm.worldId)" :key="type.id" :value="type.id">{{ type.id }} ({{ type.name }})</option>
              </select>
            </label>
            <label class="field">
              <span class="field__label">Type B</span>
              <select class="field__input" v-model="collisionRelationForm.typeB">
                <option v-for="type in getCollisionTypesForWorld(collisionRelationForm.worldId)" :key="type.id" :value="type.id">{{ type.id }} ({{ type.name }})</option>
              </select>
            </label>
            <label class="field field--row">
              <input type="checkbox" v-model="collisionRelationForm.block" />
              <span class="field__label">Block (блокировать движение)</span>
            </label>
            <label class="field field--row">
              <input type="checkbox" v-model="collisionRelationForm.trigger" />
              <span class="field__label">Trigger (вызывать событие)</span>
            </label>
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
 import { GameEntity } from '../../../pixi_game2/pixigame/src/entities/GameEntity.js';
 import { UITextEntity, UIButtonEntity } from '../../../pixi_game2/pixigame/src/entities/UIEntities.js';
 import { CameraController } from '../../../pixi_game2/pixigame/src/CameraController.js';
 import { EntityController } from '../../../pixi_game2/pixigame/src/EntityController.js';
 import { timeSystem } from '../../../pixi_game2/pixigame/src/TimeSystem.js';
 import { inputSystem } from '../../../pixi_game2/pixigame/src/input/InputSystem.js';

  import Toolbar from './components/Toolbar.vue';
  import Viewport from './components/Viewport.vue';
  import HierarchyTree from './components/HierarchyTree.vue';
  import { useJsonExport } from './composables/useJsonExport.js';
  import { useRenderLoop } from './composables/useRenderLoop.js';
  import { useRemovalActions } from './composables/useRemovalActions.js';
  import { useCreateFlow } from './composables/useCreateFlow.js';
  import { cleanupCacheByPrefix, destroyDisplayObject, getBindingLabel, suggestId } from './utils/editorUtils.js';

// ---------------------------
// State
// ---------------------------

// Game Settings (через глобальную TimeSystem) - computed с двусторонней привязкой
const gameSettingsUi = {
  get timeScale() {
    return timeSystem.getTimeScale();
  },
  set timeScale(value) {
    timeSystem.setTimeScale(value);
  },
  get paused() {
    return timeSystem.isPaused();
  },
  set paused(value) {
    timeSystem.setPaused(value);
  }
};

// Форсируем реактивность Vue через trigger
const gameSettingsTrigger = ref(0);

// Подписываемся на изменения в глобальной TimeSystem для обновления UI
onMounted(() => {
  const unsubscribe = timeSystem.onChange(() => {
    gameSettingsTrigger.value++;
  });
  onUnmounted(unsubscribe);
});
const worlds = reactive([]);   // { id, type, width, height, backgroundColor, instance }
const canvases = reactive([]); // { id, sizeMode, width, height, backgroundColor, antialias, resolution, instance }
const cameras = reactive([]);  // { id, canvasId, worldId, width, height, x, y, focusX, focusY, zoom, priority, minZoom, maxZoom, anchor, instance }
const uiEntities = reactive([]); // { id, subtype, bindingLabel, instance }
const gameEntities = reactive([]); // { id, subtype, worldId, instance }
const regions = reactive([]);  // { id, worldId, displayName, bounds, regionType, regionInstanceId }
const controllers = reactive([]); // { id, type, targetId, instance }

// Collision types (managed per world for now)
const collisionTypes = reactive([]); // { id, name, defaultShape, worldId }

const selected = ref(null); // { type: 'world'|'canvas'|'camera'|'ui'|'region', id }

// Режим левой панели: 'hierarchy' (Game Settings) или 'general' (General Settings)
const leftPanelMode = ref('hierarchy');

const cameraUi = reactive({ zoom: 1, focusX: 0, focusY: 0, showMode: 'all', showRegions: true, showRegionBorders: true, showGameEntities: true, showUIEntities: true });

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

const { jsonModal, openJsonModal, closeJsonModal, copyJsonToClipboard } = useJsonExport({
  worlds,
  canvases,
  cameras,
  uiEntities,
  regions,
  controllers
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
  worldBackgroundColor: '#2a2a2a',
  followEntityId: '', // ID сущности за которой следит камера
  createDefaultController: false,
  showMode: 'all',
  showRegions: true,
  showRegionBorders: true,
  showGameEntities: true,
  showUIEntities: true
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

const gameEntityForm = reactive({
  id: '',
  worldId: '',
  subtype: 'unit', // unit | build
  x: 0,
  y: 0,
  shape: 'circle', // circle | rect
  color: '#4fc3f7',
  size: 30, // для circle
  width: 40, // для rect
  height: 40, // для rect
  hasCollision: false,
  collisionScale: 1.0, // масштаб коллизии (1.0 = 100%)
  maxSpeed: 200,
  acceleration: 1000,
  friction: 5
});

const controllerForm = reactive({
  id: '',
  type: 'camera', // camera | entity
  inputType: 'keyboard', // keyboard | touch
  cameraId: '', // For camera controllers
  entityId: '', // For entity controllers
  moveSpeed: 500,
  zoomSpeed: 2,
  minZoom: 0.1,
  maxZoom: 5.0,
  customBindings: false, // Show custom key bindings
  // Custom key bindings for each action
  bindings: {
    move_up: { primary: '', secondary: '' },
    move_down: { primary: '', secondary: '' },
    move_left: { primary: '', secondary: '' },
    move_right: { primary: '', secondary: '' },
    zoom_in: { primary: '', secondary: '' },
    zoom_out: { primary: '', secondary: '' },
    switch_target: { primary: '', secondary: '' }
  },
  // Touch configuration
  touchLeftStickEnabled: true,
  touchLeftStickType: 'static', // static | dynamic
  touchLeftStickOuterRadius: 60,
  touchLeftStickInnerRadius: 25,
  touchLeftStickDeadzone: 10, // percent
  touchLeftStickX: 80,
  touchLeftStickY: null, // null = center
  touchRightStickEnabled: false,
  touchRightStickType: 'joystick', // joystick | buttons | none
  touchRightStickPositionType: 'static', // static | dynamic (для joystick)
  touchRightStickOuterRadius: 50,
  touchRightStickInnerRadius: 20,
  touchRightStickDeadzone: 10,
  touchRightStickX: 'right-80',
  touchRightStickY: null
});

// Key recording state for custom bindings
const keyRecording = reactive({
  action: null,
  field: null // 'primary' or 'secondary'
});

const collisionTypeForm = reactive({
  id: '',      // Type ID (e.g., 'unit', 'build', 'projectile')
  name: '',    // Display name (e.g., 'Unit', 'Building')
  defaultShape: 'circle', // 'circle' | 'rect'
  worldId: ''  // Which world to add to
});

const collisionRelationForm = reactive({
  typeA: '',   // First collision type
  typeB: '',   // Second collision type
  block: false,
  trigger: false,
  worldId: ''  // Which world to add to
});

function startKeyRecording(action, field) {
  keyRecording.action = action;
  keyRecording.field = field;
}

function stopKeyRecording() {
  keyRecording.action = null;
  keyRecording.field = null;
}

function handleKeyRecording(e) {
  if (!keyRecording.action) return;

  e.preventDefault();

  // Record the key code
  const keyCode = e.code;
  controllerForm.bindings[keyRecording.action][keyRecording.field] = keyCode;

  // Stop recording after capturing
  stopKeyRecording();

  // Remove focus from input
  e.target.blur();
}

const { openCreate, closeCreate, confirmCreate } = useCreateFlow({
  createModal,
  worlds,
  canvases,
  cameras,
  uiEntities,
  gameEntities,
  regions,
  controllers,
  worldForm,
  canvasForm,
  cameraForm,
  uiTextForm,
  uiButtonForm,
  gameEntityForm,
  regionForm,
  controllerForm,
  collisionTypeForm,
  collisionRelationForm,
  createHandlers: {
    world: () => createWorldFromForm(),
    canvas: () => createCanvasFromForm(),
    camera: () => createCameraFromForm(),
    ui_text: () => createUITextFromForm(),
    ui_button: () => createUIButtonFromForm(),
    game_entity: () => createGameEntityFromForm(),
    region: () => createRegionFromForm(),
    controller: () => createControllerFromForm(),
    collision_type: () => createCollisionTypeFromForm(),
    collision_relation: () => createCollisionRelationFromForm()
  }
});

function formatActionName(actionKey) {
  const names = {
    move_up: '⬆️ Move Up',
    move_down: '⬇️ Move Down',
    move_left: '⬅️ Move Left',
    move_right: '➡️ Move Right',
    zoom_in: '🔍 Zoom In',
    zoom_out: '🔍 Zoom Out',
    switch_target: '🔄 Switch Target'
  };
  return names[actionKey] || actionKey;
}

function getControllerActions(type) {
  if (type === 'entity') {
    return ['move_up', 'move_down', 'move_left', 'move_right', 'switch_target'];
  } else {
    // Camera has all actions including zoom
    return ['move_up', 'move_down', 'move_left', 'move_right', 'zoom_in', 'zoom_out', 'switch_target'];
  }
}

function getEntityLabelById(entityId) {
  if (!entityId) return '';
  const entity = gameEntities.find(e => e.entityId === entityId);
  if (!entity) return entityId;
  return `${entity.id} (${entity.subtype})`;
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

    // UI overlay layer now created by engine
    // ensureCanvasUILayer(model);
  }

  select({ type: 'canvas', id });
}

function createCameraFromForm() {
  const id = cameraForm.id?.trim() || suggestId('camera', cameras);
  if (cameras.some((c) => c.id === id)) return;

  const canvasModel = canvases.find((c) => c.id === cameraForm.canvasId);
  const worldModel = worlds.find((w) => w.id === cameraForm.worldId);
  if (!canvasModel || !worldModel) return;

  const visibleTypes = cameraForm.showMode === 'all' ? [] : [];
  if (cameraForm.showMode === 'selected') {
    if (cameraForm.showRegions) visibleTypes.push('regions');
    if (cameraForm.showRegionBorders) visibleTypes.push('regionBorders');
    if (cameraForm.showGameEntities) visibleTypes.push('gameEntities');
    if (cameraForm.showUIEntities) visibleTypes.push('uiEntities');
  }

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
    followEntityId: cameraForm.followEntityId || null,
    visibleTypes,
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
    followEntityId: instance.followEntityId,
    instance
  };

  cameras.push(model);
  select({ type: 'camera', id });
  syncCameraUiFromSelected();

  // UI layers now created by engine
  // ensureCameraUILayers(model);

  // Add UI entities that are bound to this camera
  for (const uiEntity of uiEntities) {
    const binding = uiEntity.instance;
    if (binding.cameraId === id) {
      canvasModel.instance.addUIEntity(uiEntity);
    }
  }

  // Create default controller if checkbox is enabled
  if (cameraForm.createDefaultController) {
    createDefaultCameraController(model);
  }

  // Update all controllers with the new camera list
  updateAllControllersCameraList();
}

function updateAllControllersCameraList() {
  const allCameraInstances = cameras.map(c => c.instance);
  for (const controller of controllers) {
    if (controller.instance.setAllCameras) {
      controller.instance.setAllCameras(allCameraInstances);
    }
  }
}

function updateAllControllersEntityList() {
  const allEntityInstances = gameEntities.map(e => e.instance);
  for (const controller of controllers) {
    if (controller.instance.setAllEntities) {
      controller.instance.setAllEntities(allEntityInstances);
    }
  }
}

const { removeWorld, removeCanvas, removeCamera, removeSelected, handleTreeDelete, resetAll } = useRemovalActions({
  worlds,
  canvases,
  cameras,
  uiEntities,
  regions,
  selected,
  canvasHosts,
  removeUI,
  removeGameEntity,
  removeRegion,
  removeController
});

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
const selectedGameEntity = computed(() => (selected.value?.type === 'game_entity' ? gameEntities.find((e) => e.id === selected.value.id) : null));
const selectedRegion = computed(() => (selected.value?.type === 'region' ? regions.find((r) => r.id === selected.value.id) : null));
const selectedController = computed(() => (selected.value?.type === 'controller' ? controllers.find((c) => c.id === selected.value.id) : null));

function syncCameraUiFromSelected() {
  if (!selectedCamera.value) return;
  const cam = selectedCamera.value.instance;
  cameraUi.zoom = Number(cam.zoom) || 1;
  cameraUi.focusX = Number(cam.focusX) || 0;
  cameraUi.focusY = Number(cam.focusY) || 0;

  // Determine show mode based on visibleTypes
  const visibleTypes = cam.visibleTypes || [];
  cameraUi.showMode = (!visibleTypes || visibleTypes.length === 0) ? 'all' : 'selected';

  // Sync checkboxes only if in selected mode
  if (cameraUi.showMode === 'selected') {
    cameraUi.showRegions = visibleTypes.includes('regions');
    cameraUi.showRegionBorders = visibleTypes.includes('regionBorders');
    cameraUi.showGameEntities = visibleTypes.includes('gameEntities');
    cameraUi.showUIEntities = visibleTypes.includes('uiEntities');
  }
}

function applySelectedCameraUi() {
  if (!selectedCamera.value) return;
  const cam = selectedCamera.value.instance;
  cam.setZoom?.(cameraUi.zoom);
  cam.setFocus?.(cameraUi.focusX, cameraUi.focusY);

  // Set visibility based on show mode
  if (cameraUi.showMode === 'all') {
    cam.visibleTypes = [];
  } else {
    const visibleTypes = [];
    if (cameraUi.showRegions) visibleTypes.push('regions');
    if (cameraUi.showRegionBorders) visibleTypes.push('regionBorders');
    if (cameraUi.showGameEntities) visibleTypes.push('gameEntities');
    if (cameraUi.showUIEntities) visibleTypes.push('uiEntities');
    cam.visibleTypes = visibleTypes;
  }

  // UI rendering now handled by engine - no need to call updateUITransforms
  // updateUITransforms();
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
// UI Entities (Entity + UI)
// ---------------------------
// UI rendering now handled by engine - no local cache needed
// const uiDisplayCache = new Map(); // key -> PIXI.DisplayObject

// UI rendering now handled by engine
/*
function ensureCanvasUILayer(canvasModel) {
  if (!canvasModel?.instance?.app) return;
  if (canvasModel.uiOverlay) return;
  const layer = markRaw(new PIXI.Container());
  try { layer.sortableChildren = true; } catch (_) {}
  layer.zIndex = 50000;
  canvasModel.instance.app.stage.addChild(layer);
  canvasModel.uiOverlay = layer;
}

*/

// UI rendering now handled by engine
/*
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

*/

// UI rendering now handled by engine
/*
function ensureUIInstanceInContainer(uiModel, container, cacheKey, ctx = null) {
  let obj = uiDisplayCache.get(cacheKey);

  if (!obj) {
    const instance = uiModel.instance;
    obj = createPixiDisplayObjectForUI(instance, { onAction: handleUIAction });
    if (!obj) return;
    uiDisplayCache.set(cacheKey, obj);
  }

  if (obj.parent !== container) {
    container.addChild(obj);
  }

  const e = uiModel.instance;
  const position = e.position || { x: 0, y: 0 };
  obj.position.set(position.x, position.y);

  if (e.rotation) obj.rotation = e.rotation;

  let sx = 1, sy = 1;
  if (e.scale) {
    sx = Number.isFinite(e.scale.x) ? e.scale.x : 1;
    sy = Number.isFinite(e.scale.y) ? e.scale.y : 1;
  }

  // Apply camera scale if needed
  if (ctx?.type === 'camera') {
    const z = ctx.camera?.zoom || 1;
    sx *= z;
    sy *= z;
  }

  if (obj.scale?.set) obj.scale.set(sx, sy);
  else obj.scale = { x: sx, y: sy };

  obj.alpha = Number.isFinite(e.opacity) ? e.opacity : 1;
  obj.visible = e.visible !== false;
  obj.zIndex = Number.isFinite(e.z_index) ? e.z_index : 9999;
}

*/
// UI rendering now handled by engine
/*
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

*/

function removeUI(uiId) {
  const idx = uiEntities.findIndex((u) => u.id === uiId);
  if (idx < 0) return;

  const uiEntity = uiEntities[idx];

  // Remove UI entity from all canvases
  for (const canvasModel of canvases) {
    canvasModel.instance.removeUIEntity(uiId);
  }

  uiEntities.splice(idx, 1);
  if (selected.value?.type === 'ui' && selected.value.id === uiId) selected.value = null;
}

function removeGameEntity(entityId) {
  const idx = gameEntities.findIndex((e) => e.id === entityId);
  if (idx < 0) return;

  const entityModel = gameEntities[idx];
  // Remove from world (используем entityId из world, а не UI id)
  if (entityModel.worldId && entityModel.entityId) {
    const worldModel = worlds.find((w) => w.id === entityModel.worldId);
    if (worldModel?.instance) {
      worldModel.instance.removeEntity(entityModel.entityId);
    }
  }

  gameEntities.splice(idx, 1);
  if (selected.value?.type === 'game_entity' && selected.value.id === entityId) selected.value = null;

  // Update all entity controllers with the updated entity list
  updateAllControllersEntityList();
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

// UI rendering now handled by engine - updateUITransforms no longer needed
/*
function updateUITransforms() {
  // Attach/update UI in correct layers
  for (const u of uiEntities) {
    const ent = u.instance;
    if (ent.canvasId) {
      const canvasModel = canvases.find((c) => c.id === ent.canvasId);
      if (!canvasModel) {
        // cleanup orphaned
        cleanupCacheByPrefix(uiDisplayCache, `ui:${u.id}::canvas:`);
        continue;
      }
      ensureCanvasUILayer(canvasModel);
      const key = `ui:${u.id}::canvas:${ent.canvasId}`;
      ensureUIInstanceInContainer(u, canvasModel.uiOverlay, key);
    } else if (ent.cameraId) {
      const camModel = cameras.find((c) => c.id === ent.cameraId);
      if (!camModel) {
        cleanupCacheByPrefix(uiDisplayCache, `ui:${u.id}::camera:`);
        continue;
      }

      // Skip rendering if UI entities are hidden for this camera
      if (!camModel.instance.isTypeVisible('uiEntities')) {
        if (camModel.uiLayer) {
          const key = `ui:${u.id}::camera:${ent.cameraId}`;
          const obj = uiDisplayCache.get(key);
          if (obj && obj.parent === camModel.uiLayer) {
            camModel.uiLayer.removeChild(obj);
          }
        }
        continue;
      }

      ensureCameraUILayers(camModel);
      const key = `ui:${u.id}::camera:${ent.cameraId}`;
      ensureUIInstanceInContainer(u, camModel.uiLayer, key, { type: 'camera', camera: camModel.instance });
    } else if (ent.worldId) {
      // render world-ui into every camera that watches that world
      const allCams = cameras.filter((c) => c.worldId === ent.worldId);
      const activeCams = allCams.filter((c) => c.instance.isTypeVisible('uiEntities'));
      const activeIds = new Set(activeCams.map((c) => c.id));

      for (const camModel of allCams) {
        const key = `ui:${u.id}::world:${ent.worldId}::camera:${camModel.id}`;

        if (!camModel.instance.isTypeVisible('uiEntities')) {
          if (camModel.worldUiLayer) {
            const obj = uiDisplayCache.get(key);
            if (obj && obj.parent === camModel.worldUiLayer) {
              camModel.worldUiLayer.removeChild(obj);
            }
          }
          continue;
        }

        ensureCameraUILayers(camModel);
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
*/

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

  // Add UI entity to appropriate canvas
  if (binding.canvasId) {
    const canvasModel = canvases.find((c) => c.id === binding.canvasId);
    if (canvasModel) {
      canvasModel.instance.addUIEntity(model);
    }
  } else if (binding.cameraId) {
    const camModel = cameras.find((c) => c.id === binding.cameraId);
    if (camModel && camModel.canvasId) {
      const canvasModel = canvases.find((c) => c.id === camModel.canvasId);
      if (canvasModel) {
        canvasModel.instance.addUIEntity(model);
      }
    }
  } else if (binding.worldId) {
    // Add to all canvases that have cameras watching this world
    for (const canvasModel of canvases) {
      const hasWorldCamera = Array.from(canvasModel.instance.cameras.values())
        .some(cam => cam.worldId === binding.worldId);
      if (hasWorldCamera) {
        canvasModel.instance.addUIEntity(model);
      }
    }
  }

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

  // Add UI entity to appropriate canvas
  if (binding.canvasId) {
    const canvasModel = canvases.find((c) => c.id === binding.canvasId);
    if (canvasModel) {
      canvasModel.instance.addUIEntity(model);
    }
  } else if (binding.cameraId) {
    const camModel = cameras.find((c) => c.id === binding.cameraId);
    if (camModel && camModel.canvasId) {
      const canvasModel = canvases.find((c) => c.id === camModel.canvasId);
      if (canvasModel) {
        canvasModel.instance.addUIEntity(model);
      }
    }
  } else if (binding.worldId) {
    // Add to all canvases that have cameras watching this world
    for (const canvasModel of canvases) {
      const hasWorldCamera = Array.from(canvasModel.instance.cameras.values())
        .some(cam => cam.worldId === binding.worldId);
      if (hasWorldCamera) {
        canvasModel.instance.addUIEntity(model);
      }
    }
  }

  select({ type: 'ui', id });
}

function createGameEntityFromForm() {
  const id = gameEntityForm.id?.trim() || suggestId('unit', gameEntities);
  if (gameEntities.some((e) => e.id === id)) return;

  const worldModel = worlds.find((w) => w.id === gameEntityForm.worldId);
  if (!worldModel) return;

  // Convert hex color to number for PIXI
  const colorHex = gameEntityForm.color?.trim() || '#4fc3f7';
  const colorNum = parseInt(colorHex.replace('#', ''), 16);

  // Create GameEntity instance
  const instance = markRaw(new GameEntity({
    id,
    worldId: gameEntityForm.worldId,
    subtype: gameEntityForm.subtype || 'unit',
    collisionType: gameEntityForm.subtype || 'unit',  // collision type = subtype
    position: { x: Number(gameEntityForm.x) || 0, y: Number(gameEntityForm.y) || 0 },
    velocity: { x: 0, y: 0 },
    rotation: 0,
    scale: { x: 1, y: 1 },
    movement: {
      maxSpeed: Number(gameEntityForm.maxSpeed) || 200,
      acceleration: Number(gameEntityForm.acceleration) || 1000,
      friction: Number(gameEntityForm.friction) || 5
    },
    appearance: {
      shape: gameEntityForm.shape || 'circle',
      color: colorNum,
      size: Number(gameEntityForm.size) || 30,
      width: Number(gameEntityForm.width) || 40,
      height: Number(gameEntityForm.height) || 40
    },
    hasCollision: !!gameEntityForm.hasCollision,
    collisionScale: Number(gameEntityForm.collisionScale) || 1.0
  }));

  // Add entity to world using ECS format (plain object with components)
  const entityId = worldModel.instance.createEntity({
    _entityRef: instance,
    position: instance.position,
    velocity: instance.velocity,
    movement: instance.movement,
    appearance: instance.appearance,
    subtype: instance.subtype,
    collision: instance.hasCollision ? instance.collision : undefined
  });

  const model = {
    id,
    entityId, // ID в world.entities Map
    subtype: instance.subtype,
    worldId: gameEntityForm.worldId,
    appearance: instance.appearance,
    instance
  };
  gameEntities.push(model);
  select({ type: 'game_entity', id });

  // Update all entity controllers with the new entity list
  updateAllControllersEntityList();
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

// ---------------------------
// Controllers
// ---------------------------

function createDefaultCameraController(cameraModel) {
  const controllerId = suggestId('controller', controllers);

  const instance = markRaw(new CameraController({
    id: controllerId,
    target: cameraModel.instance,
    targetId: cameraModel.id,
    moveSpeed: 500,
    zoomSpeed: 2,
    minZoom: cameraModel.instance.minZoom,
    maxZoom: cameraModel.instance.maxZoom
  }));

  // Передаём все камеры для переключения
  instance.setAllCameras(cameras.map(c => c.instance));

  const model = {
    id: controllerId,
    type: 'camera',
    targetId: cameraModel.id,
    instance
  };

  controllers.push(model);

  console.log(`🎮 Создан стандартный контроллер для камеры ${cameraModel.id}`);
}

function createControllerFromForm() {
  const id = controllerForm.id?.trim() || suggestId('controller', controllers);
  if (controllers.some((c) => c.id === id)) return;

  // Build custom bindings if enabled
  let bindings = undefined;
  if (controllerForm.customBindings) {
    bindings = {};
    for (const [action, keys] of Object.entries(controllerForm.bindings)) {
      const primary = keys.primary?.trim() || null;
      const secondary = keys.secondary?.trim() || null;
      // Only include if at least primary is set
      if (primary) {
        bindings[action] = { primary, secondary };
      }
    }
  }

  if (controllerForm.type === 'camera') {
    const cameraModel = cameras.find((c) => c.id === controllerForm.cameraId);
    if (!cameraModel) {
      console.warn('⚠️ Camera not found for controller');
      return;
    }

    const instance = markRaw(new CameraController({
      id,
      target: cameraModel.instance,
      targetId: cameraModel.id,
      moveSpeed: Number(controllerForm.moveSpeed) || 500,
      zoomSpeed: Number(controllerForm.zoomSpeed) || 2,
      minZoom: Number(controllerForm.minZoom) || 0.1,
      maxZoom: Number(controllerForm.maxZoom) || 5.0,
      bindings: bindings // Pass custom bindings or undefined (uses defaults)
    }));

    // Передаём все камеры для переключения
    instance.setAllCameras(cameras.map(c => c.instance));

    const model = {
      id,
      type: 'camera',
      targetId: cameraModel.id,
      instance
    };

    controllers.push(model);
    select({ type: 'controller', id });

  } else if (controllerForm.type === 'entity') {
    const entityModel = gameEntities.find((e) => e.id === controllerForm.entityId);
    if (!entityModel) {
      console.warn('⚠️ Entity not found for controller');
      return;
    }

    // Формируем touchConfig если inputType === 'touch'
    let touchConfig = null;
    if (controllerForm.inputType === 'touch') {
      touchConfig = {
        leftStick: controllerForm.touchLeftStickEnabled ? {
          enabled: true,
          type: controllerForm.touchLeftStickType,
          outerRadius: Number(controllerForm.touchLeftStickOuterRadius) || 60,
          innerRadius: Number(controllerForm.touchLeftStickInnerRadius) || 25,
          deadzone: (Number(controllerForm.touchLeftStickDeadzone) || 10) / 100,
          position: {
            x: Number(controllerForm.touchLeftStickX) || 80,
            y: controllerForm.touchLeftStickY
          },
          zone: controllerForm.touchRightStickEnabled && controllerForm.touchRightStickType === 'joystick' ? 'left-half' : null // Если есть правый джостик - левая половина, иначе весь экран
        } : null,
        rightStick: controllerForm.touchRightStickEnabled && controllerForm.touchRightStickType === 'joystick' ? {
          enabled: true,
          type: controllerForm.touchRightStickPositionType, // static или dynamic
          outerRadius: Number(controllerForm.touchRightStickOuterRadius) || 50,
          innerRadius: Number(controllerForm.touchRightStickInnerRadius) || 20,
          deadzone: (Number(controllerForm.touchRightStickDeadzone) || 10) / 100,
          position: controllerForm.touchRightStickPositionType === 'static' ? {
            x: controllerForm.touchRightStickX,
            y: controllerForm.touchRightStickY
          } : undefined,
          zone: 'right-half' // Для второго джостика
        } : null
      };
    }

    const instance = markRaw(new EntityController({
      id,
      target: entityModel.instance,
      targetId: entityModel.id,
      inputType: controllerForm.inputType,
      touchConfig: touchConfig,
      bindings: bindings // Pass custom bindings or undefined (uses defaults)
    }));

    // Передаём все сущности для переключения
    instance.setAllEntities(gameEntities.map(e => e.instance));

    const model = {
      id,
      type: 'entity',
      targetId: entityModel.id,
      instance
    };

    controllers.push(model);
    select({ type: 'controller', id });
  }
}

function removeController(controllerId) {
  const idx = controllers.findIndex((c) => c.id === controllerId);
  if (idx >= 0) {
    const controller = controllers[idx];
    controller.instance.destroy();
    controllers.splice(idx, 1);
  }

  // Reset selection if this controller was selected
  if (selected.value?.id === controllerId) {
    selected.value = null;
  }
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
// Collision functions
// ---------------------------
function createCollisionTypeFromForm() {
  const id = collisionTypeForm.id?.trim();
  const name = collisionTypeForm.name?.trim() || id;
  const worldId = collisionTypeForm.worldId;
  const defaultShape = collisionTypeForm.defaultShape;

  if (!id) {
    console.warn('⚠️ Collision type ID is required');
    return;
  }

  const worldModel = worlds.find((w) => w.id === worldId);
  if (!worldModel) {
    console.warn('⚠️ World not found');
    return;
  }

  // Add collision type to world's collision system
  worldModel.instance.collisionSystem.addCollisionType(id, {
    name,
    description: `Collision type: ${name}`,
    defaultShape
  });

  console.log(`✅ Collision type added: ${id} (${name}) - ${defaultShape}`);
}

function createCollisionRelationFromForm() {
  const typeA = collisionRelationForm.typeA;
  const typeB = collisionRelationForm.typeB;
  const block = collisionRelationForm.block;
  const trigger = collisionRelationForm.trigger;
  const worldId = collisionRelationForm.worldId;

  if (!typeA || !typeB) {
    console.warn('⚠️ Both Type A and Type B are required');
    return;
  }

  if (typeA === typeB) {
    console.warn('⚠️ Type A and Type B must be different');
    return;
  }

  const worldModel = worlds.find((w) => w.id === worldId);
  if (!worldModel) {
    console.warn('⚠️ World not found');
    return;
  }

  // Set collision relation
  worldModel.instance.collisionSystem.setCollisionRelation(typeA, typeB, {
    block,
    trigger
  });

  console.log(`✅ Collision relation added: ${typeA} ↔ ${typeB} = block:${block}, trigger:${trigger}`);
}

function getCollisionTypes() {
  // Get all collision types from the first world (for now)
  if (worlds.length === 0) return [];
  const world = worlds[0].instance;
  const types = world.collisionSystem.collisionTypes;
  return Object.entries(types).map(([id, config]) => ({
    id,
    name: config.name,
    defaultShape: config.defaultShape
  }));
}

function getCollisionTypesForWorld(worldId) {
  const worldModel = worlds.find((w) => w.id === worldId);
  if (!worldModel) return [];
  const world = worldModel.instance;
  const types = world.collisionSystem.collisionTypes;
  return Object.entries(types).map(([id, config]) => ({
    id,
    name: config.name,
    defaultShape: config.defaultShape
  }));
}

function getCollisionRelations() {
  if (worlds.length === 0) return [];
  const world = worlds[0].instance;
  const matrix = world.collisionSystem.collisionMatrix;
  const relations = [];

  for (const [typeA, targets] of Object.entries(matrix)) {
    for (const [typeB, modes] of Object.entries(targets)) {
      const modeStr = [];
      if (modes.block) modeStr.push('block');
      if (modes.trigger) modeStr.push('trigger');
      relations.push({
        key: `${typeA}:${typeB}`,
        typeA,
        typeB,
        modes: modeStr.join('+') || '-'
      });
    }
  }

  return relations;
}

function removeCollisionType(typeId) {
  if (worlds.length === 0) return;
  const world = worlds[0].instance;
  world.collisionSystem.removeCollisionType(typeId);
  console.log(`🗑️ Collision type removed: ${typeId}`);
}

useRenderLoop({
  controllers,
  worlds,
  canvases,
  selectedCamera,
  cameraUi,
  applySelectedCameraUi,
  // updateUITransforms, // UI rendering now handled by engine
  resetAll,
  PIXI
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


.btn--success {
  background: rgba(52, 211, 153, 0.22);
  border-color: rgba(52, 211, 153, 0.35);
  color: #d1fae5;
}
.btn--success:hover:not(:disabled) {
  background: rgba(52, 211, 153, 0.30);
}
.btn--danger {
  background: rgba(248, 113, 113, 0.22);
  border-color: rgba(248, 113, 113, 0.35);
  color: #fee2e2;
}
.btn--danger:hover:not(:disabled) {
  background: rgba(248, 113, 113, 0.30);
}
.btn--secondary {
  background: rgba(148, 163, 184, 0.15);
  border-color: rgba(148, 163, 184, 0.25);
  color: #e2e8f0;
}
.btn--secondary:hover:not(:disabled) {
  background: rgba(148, 163, 184, 0.25);
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

/* Info Box */
.info-box {
  padding: 12px;
  border-radius: 8px;
  background: rgba(79, 195, 247, 0.08);
  border: 1px solid rgba(79, 195, 247, 0.20);
  font-size: 13px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.85);
}
.info-box strong {
  color: #bfe7ff;
}

/* Bindings Editor */
.bindings-editor {
  display: grid;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.binding-row {
  display: grid;
  grid-template-columns: 140px 1fr 1fr;
  gap: 8px;
  align-items: center;
}
.binding-action {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}
.binding-input-wrapper {
  position: relative;
  display: flex;
  align-items: stretch;
}
.binding-input {
  flex: 1;
  height: 32px;
  padding: 0 8px;
  padding-right: 28px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(0, 0, 0, 0.25);
  color: rgba(255, 255, 255, 0.9);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
}
.binding-input:focus {
  outline: 2px solid rgba(79, 195, 247, 0.25);
  border-color: rgba(79, 195, 247, 0.30);
}
.binding-input::placeholder {
  color: rgba(255, 255, 255, 0.35);
}
.binding-input.is-recording {
  border-color: #4ade80;
  background: rgba(74, 222, 128, 0.1);
  box-shadow: 0 0 0 2px rgba(74, 222, 128, 0.25);
  animation: pulse 1s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.85; }
}
.binding-clear {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
}
.binding-clear:hover {
  background: rgba(255, 100, 100, 0.2);
  color: rgba(255, 100, 100, 0.9);
}

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

