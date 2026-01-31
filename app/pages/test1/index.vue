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
            :unattached-entities="unattachedEntities"
            :muzzles="muzzles"
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
            @detach-entity="handleHierarchyDetachEntity"
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
        <WorldInspector v-else-if="selected.type === 'world' && selectedWorld" :world="selectedWorld" />

        <!-- Canvas Inspector -->
        <CanvasInspector v-else-if="selected.type === 'canvas' && selectedCanvas" :canvas="selectedCanvas" :cameras="cameras" />

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

          <!-- Slots Section -->
          <div class="inspector__section">
            <div class="inspector__section-title">Slots ({{ selectedGameEntity.instance.getSlots().length }})</div>
            <button class="btn btn--small" @click="openSlotModal">+ Add Slot</button>

            <div v-if="selectedGameEntity.instance.getSlots().length === 0" class="inspector__empty">No slots</div>
            <div v-else class="slots-list">
              <div v-for="slot in selectedGameEntity.instance.getSlots()" :key="slot.id" class="slot-item">
                 <div class="slot-item__info">
                   <div class="slot-item__name">{{ slot.id }}</div>
                   <div class="slot-item__meta">
                     Offset: ({{ slot.offset.x }}, {{ slot.offset.y }})
                     <span class="slot-item__behavior">
                       {{ slot.transformBehavior === 'follow_entity' ? '🔄 Follow' : '📌 Static' }}
                     </span>
                     <span class="slot-item__mode">
                       Physics: {{ getPhysicsModeLabel(slot.physicsMode) }}
                     </span>
                     <span class="slot-item__attachments" v-if="slot.attachedEntities && slot.attachedEntities.length > 0">
                       ({{ slot.attachedEntities.length }} attached)
                     </span>
                   </div>
                 </div>
                <button class="slot-item__delete" @click="removeSlot(slot.id)" title="Delete slot">×</button>

                <!-- Attached Entities -->
                <div v-if="slot.attachedEntities && slot.attachedEntities.length > 0" class="slot-attachments">
                  <div class="slot-attachments__header">Attached Entities ({{ slot.attachedEntities.length }}{{ slot.maxAttachments ? `/${slot.maxAttachments}` : '' }}):</div>
                  <div v-for="entityId in slot.attachedEntities" :key="entityId" class="slot-attachment-item">
                    <span class="slot-attachment-item__id">{{ getEntityLabel(entityId) }}</span>
                    <button class="slot-attachment-item__detach" @click="detachEntity(slot.id, entityId)" title="Detach entity">×</button>
                  </div>
                </div>

                <!-- Attach Entity Control - всегда показываем (если не достигнут лимит) -->
                <div class="slot-attach-control">
                  <div v-if="slot.maxAttachments !== null && slot.attachedEntities.length >= slot.maxAttachments" class="slot-attach-full">
                    ⚠️ Slot is full ({{ slot.attachedEntities.length }}/{{ slot.maxAttachments }})
                  </div>
                  <template v-else>
                    <label class="field">
                      <span class="field__label field__label--small">Attach Entity:</span>
                      <select class="field__input field__input--small" v-model="slotAttachmentForm[slot.id]">
                        <option value="">Select entity...</option>
                        <option v-for="entity in getAttachableEntities()" :key="entity.id" :value="entity.id">
                          {{ entity.subtype ? `${entity.id} (${entity.subtype})` : `🔫 ${entity.id}` }}
                        </option>
                      </select>
                    </label>
                    <button
                      class="btn btn--small btn--primary"
                      :disabled="!slotAttachmentForm[slot.id]"
                      @click="attachEntity(slot.id, slotAttachmentForm[slot.id])"
                    >
                      + Attach
                    </button>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Unattached Entity Inspector -->
        <div v-else-if="isUnattachedEntitySelected && selectedUnattachedEntity" class="inspector__content">
          <div class="inspector__title">Entity: {{ selectedUnattachedEntity.id }} (Unattached)</div>
          <div class="kv">
            <div class="kv__row"><div class="kv__k">Type</div><div class="kv__v">{{ selectedUnattachedEntity.subtype }}</div></div>
            <div class="kv__row"><div class="kv__k">Shape</div><div class="kv__v">{{ selectedUnattachedEntity.appearance.shape }}</div></div>
            <div class="kv__row"><div class="kv__k">Color</div><div class="kv__v" :style="{color: '#' + selectedUnattachedEntity.instance.appearance.color.toString(16).padStart(6, '0')}">{{ '#' + selectedUnattachedEntity.instance.appearance.color.toString(16).padStart(6, '0') }}</div></div>
            <div class="kv__row" v-if="selectedUnattachedEntity.appearance.shape === 'circle'"><div class="kv__k">Size</div><div class="kv__v">{{ selectedUnattachedEntity.appearance.size }}</div></div>
            <div class="kv__row" v-else><div class="kv__k">Size</div><div class="kv__v">{{ selectedUnattachedEntity.appearance.width }}×{{ selectedUnattachedEntity.appearance.height }}</div></div>
            <div class="kv__row"><div class="kv__k">Position</div><div class="kv__v">{{ selectedUnattachedEntity.instance.position.x }}, {{ selectedUnattachedEntity.instance.position.y }}</div></div>
          </div>

          <!-- Attach to World Section -->
          <div class="inspector__section">
            <div class="inspector__section-title">Attach to World</div>

            <!-- Error message -->
            <div v-if="attachmentForm.error" class="inspector__error">{{ attachmentForm.error }}</div>

            <label class="field">
              <span class="field__label">World</span>
              <select class="field__input" v-model="attachmentForm.worldId">
                <option value="">Select world</option>
                <option v-for="w in worlds" :key="w.id" :value="w.id">{{ w.id }}</option>
              </select>
            </label>

            <div class="grid2">
              <label class="field">
                <span class="field__label">X</span>
                <input class="field__input" type="number" v-model.number="attachmentForm.x" />
              </label>
              <label class="field">
                <span class="field__label">Y</span>
                <input class="field__input" type="number" v-model.number="attachmentForm.y" />
              </label>
            </div>

            <div class="actions">
              <button class="btn" @click="attachEntityToWorld()">📌 Attach</button>
            </div>
          </div>
        </div>

        <!-- Muzzle Inspector -->
        <MuzzleInspector
          v-else-if="selected.type === 'muzzle' && selectedMuzzle"
          :muzzle="selectedMuzzle"
          :muzzle-ui="muzzleUi"
          @apply="applySelectedMuzzleUi"
        />

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
          <WorldForm v-if="createModal.type === 'world'" v-model="worldForm" />

          <!-- Canvas Form -->
          <CanvasForm v-else-if="createModal.type === 'canvas'" v-model="canvasForm" />

          <!-- Camera Form -->
          <CameraForm
            v-else-if="createModal.type === 'camera'"
            v-model="cameraForm"
            :canvases="canvases"
            :worlds="worlds"
            :gameEntities="gameEntities"
          />

          <!-- UI Text Form -->
          <UITextForm
            v-else-if="createModal.type === 'ui_text'"
            v-model="uiTextForm"
            :canvases="canvases"
            :cameras="cameras"
            :worlds="worlds"
          />

          <!-- UI Button Form -->
          <UIButtonForm
            v-else-if="createModal.type === 'ui_button'"
            v-model="uiButtonForm"
            :canvases="canvases"
            :cameras="cameras"
            :worlds="worlds"
          />

          <!-- Game Entity Form -->
          <GameEntityForm
            v-else-if="createModal.type === 'game_entity'"
            v-model="gameEntityForm"
            :worlds="worlds"
          />

          <!-- Muzzle Form -->
          <MuzzleForm
            v-else-if="createModal.type === 'muzzle'"
            v-model="muzzleForm"
          />

          <!-- Region Form -->
          <RegionForm
            v-else-if="createModal.type === 'region'"
            v-model="regionForm"
            :worlds="worlds"
          />

          <!-- Controller Form -->
          <ControllerForm
            v-else-if="createModal.type === 'controller'"
            v-model="controllerForm"
            :cameras="cameras"
            :gameEntities="gameEntities"
          />

          <!-- Collision Type Form -->
          <CollisionTypeForm
            v-else-if="createModal.type === 'collision_type'"
            v-model="collisionTypeForm"
            :worlds="worlds"
          />

          <!-- Collision Relation Form -->
          <CollisionRelationForm
            v-else-if="createModal.type === 'collision_relation'"
            v-model="collisionRelationForm"
            :worlds="worlds"
            :get-collision-types-for-world="getCollisionTypesForWorld"
          />
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

    <!-- Slot Create Modal -->
    <div v-if="slotModal.open" class="modal-backdrop" @click.self="closeSlotModal">
      <div class="modal">
        <div class="modal__header">
          <div class="modal__title">Add Slot</div>
          <button class="modal__close" @click="closeSlotModal">×</button>
        </div>

         <div class="modal__body">
           <label class="field">
             <span class="field__label">Slot ID</span>
             <input class="field__input" v-model.trim="slotForm.id" placeholder="slot_1" />
           </label>

           <div class="grid2">
             <label class="field">
               <span class="field__label">Offset X</span>
               <input class="field__input" type="number" v-model.number="slotForm.offsetX" />
             </label>
             <label class="field">
               <span class="field__label">Offset Y</span>
               <input class="field__input" type="number" v-model.number="slotForm.offsetY" />
             </label>
           </div>

           <label class="field">
             <span class="field__label">Transform Behavior</span>
             <select class="field__input" v-model="slotForm.transformBehavior">
               <option value="follow_entity">Follow Entity (🔄 moves with entity)</option>
               <option value="static">Static (📌 stays in world)</option>
             </select>
           </label>

           <label class="field field--row">
             <input type="checkbox" v-model="slotForm.visualEnabled" />
             <span class="field__label">Show Visual Dot</span>
           </label>

           <label class="field" v-if="slotForm.visualEnabled">
             <span class="field__label">Visual Color</span>
             <input class="field__input" type="color" v-model="slotForm.color" />
           </label>

           <label class="field">
             <span class="field__label">Max Attachments (optional)</span>
             <input class="field__input" type="number" v-model.number="slotForm.maxAttachments" placeholder="Empty = unlimited" min="1" />
             <span class="field__hint">Leave empty for unlimited attachments</span>
           </label>

           <!-- 🎯 PHYSICS MODE -->
           <div class="inspector__section">
             <div class="inspector__section-title">Physics Mode</div>
             <label class="field">
               <span class="field__label">Physics Mode</span>
               <select class="field__input" v-model="slotForm.physicsMode">
                 <option value="instant">🔒 Instant (immediate)</option>
                 <option value="lerp">⚡ Lerp (smooth)</option>
                 <option value="spring">🌊 Spring (elastic)</option>
               </select>
             </label>

             <!-- ⚡ Lerp Settings -->
             <template v-if="slotForm.physicsMode === 'lerp'">
               <label class="field">
                 <span class="field__label">Lerp Factor ({{ slotForm.lerpFactor.toFixed(2) }})</span>
                 <input
                   type="range"
                   min="0.01"
                   max="1.0"
                   step="0.01"
                   v-model.number="slotForm.lerpFactor"
                 />
                 <span class="field__hint">
                   {{ slotForm.lerpFactor < 0.1 ? '🐢 Slow' : slotForm.lerpFactor > 0.5 ? '🐇 Fast' : '⏱️ Normal' }}
                 </span>
               </label>
             </template>

             <!-- 🌊 Spring Settings -->
             <template v-if="slotForm.physicsMode === 'spring'">
               <label class="field">
                 <span class="field__label">Stiffness ({{ slotForm.springStiffness.toFixed(1) }})</span>
                 <input
                   type="range"
                   min="0.1"
                   max="10"
                   step="0.1"
                   v-model.number="slotForm.springStiffness"
                 />
                 <span class="field__hint">
                   {{ slotForm.springStiffness < 2 ? '🍃 Soft' : slotForm.springStiffness > 6 ? '🔧 Stiff' : '⚖️ Medium' }}
                 </span>
               </label>

               <label class="field">
                 <span class="field__label">Damping ({{ slotForm.springDamping.toFixed(2) }})</span>
                 <input
                   type="range"
                   min="0.7"
                   max="0.99"
                   step="0.01"
                   v-model.number="slotForm.springDamping"
                 />
                 <span class="field__hint">
                   {{ slotForm.springDamping < 0.85 ? '🌊 Bouncy' : '🎯 Stable' }}
                 </span>
               </label>

               <label class="field">
                 <span class="field__label">Max Stretch (px)</span>
                 <input
                   class="field__input"
                   type="number"
                   min="10"
                   max="500"
                   v-model.number="slotForm.springMaxLength"
                 />
                 <span class="field__hint">Maximum spring length (10-500px)</span>
               </label>
             </template>
           </div>
         </div>

        <div class="modal__footer">
          <button class="btn" @click="closeSlotModal">Cancel</button>
          <button class="btn btn--primary" @click="confirmAddSlot">Add Slot</button>
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
 import { MuzzleEntity } from '../../../pixi_game2/pixigame/src/entities/MuzzleEntity.js';
 import { UITextEntity, UIButtonEntity } from '../../../pixi_game2/pixigame/src/entities/UIEntities.js';
 import { CameraController } from '../../../pixi_game2/pixigame/src/CameraController.js';
 import { EntityController } from '../../../pixi_game2/pixigame/src/EntityController.js';
 import { timeSystem } from '../../../pixi_game2/pixigame/src/TimeSystem.js';
 import { inputSystem } from '../../../pixi_game2/pixigame/src/input/InputSystem.js';

  import Toolbar from './components/Toolbar.vue';
  import Viewport from './components/Viewport.vue';
  import HierarchyTree from './components/HierarchyTree.vue';
  import WorldForm from './components/forms/WorldForm.vue';
  import CanvasForm from './components/forms/CanvasForm.vue';
  import CameraForm from './components/forms/CameraForm.vue';
  import UITextForm from './components/forms/UITextForm.vue';
  import UIButtonForm from './components/forms/UIButtonForm.vue';
  import RegionForm from './components/forms/RegionForm.vue';
  import ControllerForm from './components/forms/ControllerForm.vue';
  import GameEntityForm from './components/forms/GameEntityForm.vue';
  import MuzzleForm from './components/forms/MuzzleForm.vue';
  import CollisionTypeForm from './components/forms/CollisionTypeForm.vue';
  import CollisionRelationForm from './components/forms/CollisionRelationForm.vue';
  import WorldInspector from './components/inspectors/WorldInspector.vue';
  import CanvasInspector from './components/inspectors/CanvasInspector.vue';
  import MuzzleInspector from './components/inspectors/MuzzleInspector.vue';
  import { useJsonExport } from './composables/useJsonExport.js';
  import { useRenderLoop } from './composables/useRenderLoop.js';
  import { useRemovalActions } from './composables/useRemovalActions.js';
  import { useCreateFlow } from './composables/useCreateFlow.js';
  import { useUIEntityBinding } from './composables/useUIEntityBinding.js';
  import { getBindingLabel, suggestId } from './utils/editorUtils.js';

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
  // Делаем timeSystem доступным глобально для AnimationSystem
  window.timeSystem = timeSystem;

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
const unattachedEntities = reactive([]); // { id, subtype, instance }
const muzzles = reactive([]); // { id, direction, showDebug, debugColor, instance }
const regions = reactive([]);  // { id, worldId, displayName, bounds, regionType, regionInstanceId }
const controllers = reactive([]); // { id, type, targetId, instance }

// Collision types (managed per world for now)
const collisionTypes = reactive([]); // { id, name, defaultShape, worldId }

const selected = ref(null); // { type: 'world'|'canvas'|'camera'|'ui'|'region', id }

// Режим левой панели: 'hierarchy' (Game Settings) или 'general' (General Settings)
const leftPanelMode = ref('hierarchy');

const cameraUi = reactive({ zoom: 1, focusX: 0, focusY: 0, showMode: 'all', showRegions: true, showRegionBorders: true, showGameEntities: true, showUIEntities: true });

// 🔫 Muzzle UI state for inspector
const muzzleUi = reactive({
  fireRate: 5,
  bulletSpeed: 500,
  bulletRange: 1000,
  bulletSize: 8,
  bulletColor: '#FFFFFF',
  autoFire: false,
  direction: { x: 1, y: 0 },
  directionMode: 'relative',
  showDebug: true,
  debugColor: '#FF00FF'
});

// Attachment form for unattached entities
const attachmentForm = reactive({
  worldId: '',
  x: 0,
  y: 0,
  error: ''
});

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
  gameEntities,
  unattachedEntities,
  muzzles,
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
  shape: 'circle', // circle | rect | sprite
  color: '#4fc3f7',
  size: 30, // для circle
  width: 40, // для rect
  height: 40, // для rect
  scale: 1.0, // масштаб для sprite
  textureUrl: '', // для sprite
  hasCollision: false,
  showCollisionBounds: false, // показывать границы коллизии (debug)
  collisionShape: '', // '' | 'circle' | 'rect' - форма коллизии отдельно от визуала
  collisionScale: 1.0, // масштаб коллизии (1.0 = 100%)
  collisionSize: null, // переопределение размера коллизии для circle
  collisionWidth: null, // переопределение ширины коллизии для rect
  collisionHeight: null, // переопределение высоты коллизии для rect
   maxSpeed: 200,
   acceleration: 1000,
   friction: 5,
   reflectionBehavior: 'none', // none | mirrorX | mirrorY
   animationsEnabled: false, // включить анимации
   spritesheetUrl: '', // URL к JSON файлу спрайтшита
   defaultAnimationState: 'idle', // дефолтное состояние
  animationSpeedMultiplier: 1.0 // множитель скорости анимации
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
  rotationMode: 'none', // none | move | mouse (entity only)
  customBindings: false, // Show custom key bindings
  // Custom key bindings for each action
  bindings: {
    move_up: { primary: '', secondary: '' },
    move_down: { primary: '', secondary: '' },
    move_left: { primary: '', secondary: '' },
    move_right: { primary: '', secondary: '' },
    rotate_left: { primary: '', secondary: '' },
    rotate_right: { primary: '', secondary: '' },
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

const muzzleForm = reactive({
  id: '',
  direction: { x: 1, y: 0 },
  directionMode: 'relative',
  showDebug: true,
  debugColor: '#FF00FF'
});

 // Slot form
 const slotForm = reactive({
   id: '',
   offsetX: 0,
   offsetY: 0,
   transformBehavior: 'follow_entity',
   visualEnabled: true,
   color: '#00FFFF',
   maxAttachments: null,

   // 🎯 PHYSICS MODE
   physicsMode: 'instant', // 'instant' | 'lerp' | 'spring'

   // ⚡ LERP PARAMETERS
   lerpFactor: 0.1,

   // 🌊 SPRING PARAMETERS
   springStiffness: 3.0,
   springDamping: 0.9,
   springMaxLength: 100
 });

const slotModal = reactive({ open: false });

// Хранилище для выбора сущности в форме прикрепления к слоту
// key: slotId, value: entityId для прикрепления
const slotAttachmentForm = reactive({});

const { openCreate, closeCreate, confirmCreate } = useCreateFlow({
  createModal,
  worlds,
  canvases,
  cameras,
  uiEntities,
  gameEntities,
  unattachedEntities,
  muzzles,
  regions,
  controllers,
  worldForm,
  canvasForm,
  cameraForm,
  uiTextForm,
  uiButtonForm,
  gameEntityForm,
  muzzleForm,
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
    muzzle: () => createMuzzleFromForm(),
    region: () => createRegionFromForm(),
    controller: () => createControllerFromForm(),
    collision_type: () => createCollisionTypeFromForm(),
    collision_relation: () => createCollisionRelationFromForm()
  }
});

function getEntityLabelById(entityId) {
  if (!entityId) return '';
  const entity = gameEntities.find(e => e.entityId === entityId);
  if (!entity) return entityId;
  return `${entity.id} (${entity.subtype})`;
}

const { createBindingFromForm, createUIEntity } = useUIEntityBinding({
  canvases,
  cameras,
  uiEntities,
  select
});

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
  muzzles,
  regions,
  selected,
  canvasHosts,
  removeUI,
  removeGameEntity,
  removeMuzzle,
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
const selectedUnattachedEntity = computed(() => {
  const entity = unattachedEntities.find((e) => e.id === selected.value.id);
  return entity ? entity : null;
});
const isUnattachedEntitySelected = computed(() => selectedUnattachedEntity.value !== null);
const selectedMuzzle = computed(() => (selected.value?.type === 'muzzle' ? muzzles.find((m) => m.id === selected.value.id) : null));
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

// 🔫 Синхронизировать muzzleUi из выбранного muzzle
function syncMuzzleUiFromSelected() {
  if (!selectedMuzzle.value) return;
  const m = selectedMuzzle.value;

  // Синхронизируем параметры стрельбы
  muzzleUi.fireRate = m.fireRate !== undefined ? m.fireRate : 5;
  muzzleUi.bulletSpeed = m.bulletSpeed !== undefined ? m.bulletSpeed : 500;
  muzzleUi.bulletRange = m.bulletRange !== undefined ? m.bulletRange : 1000;
  muzzleUi.bulletSize = m.bulletSize !== undefined ? m.bulletSize : 8;
  muzzleUi.bulletColor = m.bulletColor || '#FFFFFF';
  muzzleUi.autoFire = m.autoFire !== undefined ? m.autoFire : false;

  // Синхронизируем направление
  muzzleUi.direction = m.direction ? { ...m.direction } : { x: 1, y: 0 };
  muzzleUi.directionMode = m.directionMode || 'relative';

  // Синхронизируем debug настройки
  muzzleUi.showDebug = m.showDebug !== undefined ? m.showDebug : true;
  muzzleUi.debugColor = m.debugColor || '#FF00FF';

  console.log('🔫 Muzzle UI synced:', m.id);
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

// 🔫 Применить настройки muzzle из UI
function applySelectedMuzzleUi() {
  const selectedMuzzle = muzzles.find(m => m.id === selected.value?.id);
  if (!selectedMuzzle || !selectedMuzzle.instance) return;

  const instance = selectedMuzzle.instance;

  // Применяем параметры стрельбы
  instance.setFireRate(muzzleUi.fireRate);
  instance.setBulletSpeed(muzzleUi.bulletSpeed);
  instance.setBulletRange(muzzleUi.bulletRange);
  instance.setBulletSize(muzzleUi.bulletSize);
  instance.setBulletColor(muzzleUi.bulletColor);
  instance.setAutoFire(muzzleUi.autoFire);

  // Применяем направление
  instance.setDirection(muzzleUi.direction.x, muzzleUi.direction.y);
  instance.setDirectionMode(muzzleUi.directionMode);

  // Применяем debug настройки
  instance.setShowDebug(muzzleUi.showDebug);
  instance.setDebugColor(muzzleUi.debugColor);

  // Обновляем модель
  selectedMuzzle.fireRate = muzzleUi.fireRate;
  selectedMuzzle.bulletSpeed = muzzleUi.bulletSpeed;
  selectedMuzzle.bulletRange = muzzleUi.bulletRange;
  selectedMuzzle.bulletSize = muzzleUi.bulletSize;
  selectedMuzzle.bulletColor = muzzleUi.bulletColor;
  selectedMuzzle.autoFire = muzzleUi.autoFire;
  selectedMuzzle.direction = { ...muzzleUi.direction };
  selectedMuzzle.directionMode = muzzleUi.directionMode;
  selectedMuzzle.showDebug = muzzleUi.showDebug;
  selectedMuzzle.debugColor = muzzleUi.debugColor;

  console.log('🔫 Muzzle settings applied:', selectedMuzzle.id);
}

// ---------------------------
// UI Entities (Entity + UI)
// ---------------------------

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

function attachEntityToWorld() {
  if (!selectedUnattachedEntity.value) return;

  const worldId = attachmentForm.worldId;
  const x = Number(attachmentForm.x) || 0;
  const y = Number(attachmentForm.y) || 0;

  // Validate world exists
  const worldModel = worlds.find((w) => w.id === worldId);
  if (!worldId || !worldModel) {
    attachmentForm.error = 'World not found';
    return;
  }

  // Clear error
  attachmentForm.error = '';

  // Store entity reference before removing from unattachedEntities
  const entityInstance = selectedUnattachedEntity.value.instance;
  const entityId = selectedUnattachedEntity.value.id;
  const subtype = selectedUnattachedEntity.value.subtype;
  const appearance = selectedUnattachedEntity.value.appearance;

  // Update entity position from form
  entityInstance.position.x = x;
  entityInstance.position.y = y;

  // Attach entity to world using new addEntity() method
  worldModel.instance.addEntity(entityInstance);

  // Create attached entity model
  const attachedModel = {
    id: entityId,
    entityId: entityId, // Using entity ID as entity reference
    subtype: subtype,
    worldId: worldModel.id,
    appearance: appearance,
    instance: entityInstance
  };

  // Move from unattached to gameEntities
  const unattachedIdx = unattachedEntities.findIndex((e) => e.id === entityId);
  if (unattachedIdx >= 0) {
    unattachedEntities.splice(unattachedIdx, 1);
  }
  gameEntities.push(attachedModel);

  // Update controllers
  updateAllControllersEntityList();

  // Select the newly attached entity
  select({ type: 'game_entity', id: entityId });
}

function removeGameEntity(entityId) {
  // Try to find in gameEntities (attached)
  let idx = gameEntities.findIndex((e) => e.id === entityId);
  let entityModel = null;
  let isArray = 'gameEntities';

  // If not found in gameEntities, check unattachedEntities
  if (idx < 0) {
    idx = unattachedEntities.findIndex((e) => e.id === entityId);
    isArray = 'unattachedEntities';
  }

  if (idx < 0) return;

  entityModel = isArray === 'gameEntities' ? gameEntities[idx] : unattachedEntities[idx];

  // Detach entity from any slots it's attached to
  detachEntityFromAllSlots(entityModel.id);

  // Remove from world (используем entityId из world, а не UI id)
  if (entityModel.worldId && entityModel.entityId) {
    const worldModel = worlds.find((w) => w.id === entityModel.worldId);
    if (worldModel?.instance) {
      worldModel.instance.removeEntity(entityModel.entityId);
    }
  }

  // Remove from appropriate array
  if (isArray === 'gameEntities') {
    gameEntities.splice(idx, 1);
  } else {
    unattachedEntities.splice(idx, 1);
  }

  if (selected.value?.type === 'game_entity' && selected.value.id === entityId) selected.value = null;

  // Update all entity controllers with the updated entity list
  updateAllControllersEntityList();
}

function removeMuzzle(muzzleId) {
  const idx = muzzles.findIndex((m) => m.id === muzzleId);
  if (idx < 0) return;

  const muzzleModel = muzzles[idx];

  // Detach muzzle from any slots it's attached to
  detachEntityFromAllSlots(muzzleModel.id);

  // Remove from world's ECS
  if (muzzleModel.worldId) {
    const worldModel = worlds.find((w) => w.id === muzzleModel.worldId);
    if (worldModel?.instance) {
      worldModel.instance.entities.delete(muzzleId);
      console.log(`🔫 Muzzle "${muzzleId}" removed from world "${muzzleModel.worldId}"`);
    }
  }

  // Remove from muzzles array
  muzzles.splice(idx, 1);

  if (selected.value?.type === 'muzzle' && selected.value.id === muzzleId) selected.value = null;
}

// ---------------------------
// Slots System
// ---------------------------

 function openSlotModal() {
   slotForm.id = '';
   slotForm.offsetX = 0;
   slotForm.offsetY = 0;
   slotForm.transformBehavior = 'follow_entity';
   slotForm.visualEnabled = true;
   slotForm.color = '#00FFFF';
   slotForm.maxAttachments = null;

   // 🎯 Reset physics mode
   slotForm.physicsMode = 'instant';
   slotForm.lerpFactor = 0.1;
   slotForm.springStiffness = 3.0;
   slotForm.springDamping = 0.9;
   slotForm.springMaxLength = 100;

   slotModal.open = true;
 }

function closeSlotModal() {
  slotModal.open = false;
}

 function confirmAddSlot() {
   if (!selectedGameEntity.value) return;

   const slotId = slotForm.id?.trim() || `slot_${Date.now()}`;

   selectedGameEntity.value.instance.addSlot({
     id: slotId,
     offset: { x: Number(slotForm.offsetX) || 0, y: Number(slotForm.offsetY) || 0 },
     transformBehavior: slotForm.transformBehavior,
     visualEnabled: slotForm.visualEnabled,
     color: slotForm.color || '#00FFFF',
     maxAttachments: slotForm.maxAttachments,

     // 🎯 Physics mode parameters
     physicsMode: slotForm.physicsMode,
     lerpFactor: slotForm.lerpFactor,
     springStiffness: slotForm.springStiffness,
     springDamping: slotForm.springDamping,
     springMaxLength: slotForm.springMaxLength
   });

   closeSlotModal();
 }

function removeSlot(slotId) {
  if (!selectedGameEntity.value) return;

  // Detach all entities from this slot before removing it
  const slot = selectedGameEntity.value.instance.getSlot(slotId);
  if (slot && slot.attachedEntities) {
    for (const entityId of slot.attachedEntities) {
      selectedGameEntity.value.instance.detachEntityFromSlot(entityId, slotId);
    }
  }

  selectedGameEntity.value.instance.removeSlot(slotId);
}

// ---------------------------
// Entity Attachment to Slots
// ---------------------------

/**
 * Get a readable label for an entity by ID
 */
function getEntityLabel(entityId) {
  if (!entityId) return 'Unknown';

  // Search in gameEntities
  const gameEntity = gameEntities.find(e => e.id === entityId || e.entityId === entityId);
  if (gameEntity) {
    return `${gameEntity.id} (${gameEntity.subtype})`;
  }

  // Search in unattachedEntities
  const unattachedEntity = unattachedEntities.find(e => e.id === entityId);
  if (unattachedEntity) {
    return `${unattachedEntity.id} (${unattachedEntity.subtype})`;
  }

  // Search in muzzles
  const muzzle = muzzles.find(m => m.id === entityId);
  if (muzzle) {
    return `🔫 ${muzzle.id}`;
  }

   // Return ID as fallback
   return entityId;
 }

/**
 * Get human-readable label for physics mode
 */
function getPhysicsModeLabel(mode) {
  if (!mode || mode === 'instant') return '🔒 Instant';
  if (mode === 'lerp') return '⚡ Lerp';
  if (mode === 'spring') return '🌊 Spring';
  return mode;
}

/**
 * Get list of entities that can be attached to slots on the selected entity
 * Excludes entities that are already attached to this entity's slots
 */
function getAttachableEntities() {
  if (!selectedGameEntity.value) return [];

  const alreadyAttachedIds = new Set();

  // Collect all entity IDs that are already attached to this entity's slots
  for (const slot of selectedGameEntity.value.instance.getSlots()) {
    if (slot.attachedEntities) {
      for (const entityId of slot.attachedEntities) {
        alreadyAttachedIds.add(entityId);
      }
    }
  }

  // Filter entities that are not already attached and are not the parent entity itself
  const attachable = [
    ...gameEntities.filter(e => !alreadyAttachedIds.has(e.id) && e.id !== selectedGameEntity.value.id),
    ...unattachedEntities.filter(e => !alreadyAttachedIds.has(e.id) && e.id !== selectedGameEntity.value.id),
    ...muzzles.filter(m => !alreadyAttachedIds.has(m.id))
  ];

  return attachable;
}

/**
 * Attach an entity to a slot on the selected game entity
 */
function attachEntity(slotId, entityId) {
  if (!selectedGameEntity.value) return;
  if (!slotId || !entityId) return;

  // Find the entity to attach
  let entityToAttach = null;
  let isMuzzle = false;

  // Search in gameEntities
  entityToAttach = gameEntities.find(e => e.id === entityId);
  if (!entityToAttach) {
    // Search in unattachedEntities
    entityToAttach = unattachedEntities.find(e => e.id === entityId);
  }
  if (!entityToAttach) {
    // Search in muzzles
    entityToAttach = muzzles.find(m => m.id === entityId);
    if (entityToAttach) isMuzzle = true;
  }

  if (!entityToAttach) {
    console.error(`Entity "${entityId}" not found for attachment`);
    return;
  }

  // Muzzles attach directly without adding to world
  if (isMuzzle) {
    const result = selectedGameEntity.value.instance.attachEntityToSlot(entityToAttach.instance, slotId);
    if (result.success) {
      console.log(`🔫 Muzzle "${entityId}" attached to slot "${slotId}"`);
    }
    return;
  }

  // Track if entity was unattached (needs to be moved to world)
  const wasUnattached = !entityToAttach.worldId;

  // If entity is unattached, add it to world first
  if (wasUnattached) {
    const worldModel = worlds.find(w => w.id === selectedGameEntity.value.worldId);
    if (worldModel && worldModel.instance) {
      // Add entity instance to world
      worldModel.instance.addEntity(entityToAttach.instance);

      // Update entity's worldId
      entityToAttach.worldId = selectedGameEntity.value.worldId;

      // Move from unattachedEntities to gameEntities
      const unattachedIdx = unattachedEntities.findIndex(e => e.id === entityId);
      if (unattachedIdx >= 0) {
        unattachedEntities.splice(unattachedIdx, 1);
      }

      // Create game entity model with entityId reference
      const attachedModel = {
        id: entityToAttach.id,
        entityId: entityToAttach.id,
        subtype: entityToAttach.subtype,
        worldId: selectedGameEntity.value.worldId,
        appearance: entityToAttach.appearance,
        instance: entityToAttach.instance
      };
      gameEntities.push(attachedModel);

      // Update entityToAttach to reference the new model
      entityToAttach = attachedModel;

      // Update controllers with new entity list
      updateAllControllersEntityList();

      console.log(`🔗 Entity "${entityId}" moved from unattached to world "${selectedGameEntity.value.worldId}"`);
    }
  }

  // Attach entity to slot (pass the instance, not the model)
  const result = selectedGameEntity.value.instance.attachEntityToSlot(entityToAttach.instance, slotId);

  if (result.success) {
    console.log(`✅ ${result.message}`);

    // Clear the attach form field for this slot
    if (slotAttachmentForm[slotId] !== undefined) {
      slotAttachmentForm[slotId] = '';
    }
  } else {
    console.error(`❌ ${result.message}`);
    alert(result.message);
  }
}

/**
 * Detach an entity from a slot on the selected game entity
 */
function detachEntity(slotId, entityId) {
  if (!selectedGameEntity.value) return;

  const result = selectedGameEntity.value.instance.detachEntityFromSlot(entityId, slotId);

  if (result.success) {
    console.log(`✅ ${result.message}`);
  } else {
    console.error(`❌ ${result.message}`);
  }
}

/**
 * Detach an entity from all slots it's attached to
 * This is called when an entity is being deleted
 */
function detachEntityFromAllSlots(entityId) {
  if (!entityId) return;

  // Iterate through all game entities and their slots
  for (const gameEntity of gameEntities) {
    if (!gameEntity.instance || !gameEntity.instance.slots) continue;

    // Check if this entity is attached to any slot on this parent
    for (const slot of gameEntity.instance.slots) {
      if (slot.attachedEntities && slot.attachedEntities.includes(entityId)) {
        const result = gameEntity.instance.detachEntityFromSlot(entityId, slot.id);
        if (result.success) {
          console.log(`🔓 Auto-detached entity "${entityId}" from slot "${slot.id}" on entity "${gameEntity.id}"`);
        }
      }
    }
  }
}

/**
 * Handle detach-entity event from HierarchyTree
 * @param {string} parentEntityId - ID of the parent entity with the slot
 * @param {string} slotId - ID of the slot
 * @param {string} entityId - ID of the entity to detach
 */
function handleHierarchyDetachEntity(parentEntityId, slotId, entityId) {
  // Find the parent entity
  const parentEntity = gameEntities.find(e => e.id === parentEntityId);
  if (!parentEntity || !parentEntity.instance) {
    console.error(`Parent entity "${parentEntityId}" not found`);
    return;
  }

  // Detach the entity from the slot
  const result = parentEntity.instance.detachEntityFromSlot(entityId, slotId);

  if (result.success) {
    console.log(`✅ ${result.message}`);
  } else {
    console.error(`❌ ${result.message}`);
  }
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

function createUITextFromForm() {
  const id = uiTextForm.id?.trim() || suggestId('ui_text', uiEntities);
  const binding = createBindingFromForm(uiTextForm.bindTo, uiTextForm.canvasId, uiTextForm.cameraId, uiTextForm.worldId);

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

  return createUIEntity({ id, subtype: 'text', instance, binding });
}

function createUIButtonFromForm() {
  const id = uiButtonForm.id?.trim() || suggestId('ui_button', uiEntities);
  const binding = createBindingFromForm(uiButtonForm.bindTo, uiButtonForm.canvasId, uiButtonForm.cameraId, uiButtonForm.worldId);

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

  return createUIEntity({ id, subtype: 'button', instance, binding });
}

function createGameEntityFromForm() {
  // IMPORTANT: Ensure ID uniqueness across BOTH arrays
  // Auto-fix duplicate IDs by generating new ones
  let id = gameEntityForm.id?.trim() || suggestId('unit', [...gameEntities, ...unattachedEntities]);
  
  // Keep generating new IDs until we find a unique one
  let attempts = 0;
  const maxAttempts = 100;
  
  while (attempts < maxAttempts) {
    const isDuplicate = gameEntities.some((e) => e.id === id) || unattachedEntities.some((e) => e.id === id);
    if (!isDuplicate) {
      // ID is unique, use it
      break;
    }
    // ID is duplicate, generate next one
    const prefix = id.match(/^[a-z_]+/i)?.[0] || 'unit';
    const currentNum = parseInt(id.match(/\d+$/)?.[0] || '0');
    id = `${prefix}_${currentNum + 1}`;
    attempts++;
  }
  
  if (attempts >= maxAttempts) {
    alert(`Could not generate unique ID after ${maxAttempts} attempts.`);
    return;
  }

  const worldModel = worlds.find((w) => w.id === gameEntityForm.worldId);

  // If worldId provided but world doesn't exist - return
  if (gameEntityForm.worldId && !worldModel) return;

  // Validation: если shape не circle/rect и есть коллизия - обязательно выбрать collisionShape
  if (gameEntityForm.hasCollision && !['circle', 'rect'].includes(gameEntityForm.shape) && !gameEntityForm.collisionShape) {
    alert(`Shape "${gameEntityForm.shape}" requires explicit collision shape selection for collision.`);
    return;
  }

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
    baseScale: { x: Number(gameEntityForm.scale) || 1, y: Number(gameEntityForm.scale) || 1 },
    scale: { x: Number(gameEntityForm.scale) || 1, y: Number(gameEntityForm.scale) || 1 },
    reflectionBehavior: gameEntityForm.reflectionBehavior || 'none',
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
      height: Number(gameEntityForm.height) || 40,
      scale: Number(gameEntityForm.scale) || 1.0,
      textureUrl: gameEntityForm.textureUrl?.trim() || null
    },
    hasCollision: !!gameEntityForm.hasCollision,
    showCollisionBounds: !!gameEntityForm.showCollisionBounds,
    collisionShape: gameEntityForm.collisionShape || null,
    collisionScale: Number(gameEntityForm.collisionScale) || 1.0,
    collisionSize: Number(gameEntityForm.collisionSize) || null,
    collisionWidth: Number(gameEntityForm.collisionWidth) || null,
    collisionHeight: Number(gameEntityForm.collisionHeight) || null,
    animations: gameEntityForm.animationsEnabled ? {
      enabled: true,
      spritesheetUrl: gameEntityForm.spritesheetUrl?.trim() || null,
      defaultState: gameEntityForm.defaultAnimationState || 'idle',
      speedMultiplier: Number(gameEntityForm.animationSpeedMultiplier) || 1.0
    } : undefined
  }));

  // Check if we're creating an attached or unattached entity
  if (!gameEntityForm.worldId) {
    // Create unattached entity (no world binding)
    const model = {
      id,
      subtype: instance.subtype,
      appearance: instance.appearance,
      instance
    };
    unattachedEntities.push(model);
    select({ type: 'game_entity', id });
  } else {
    // Create attached entity (existing logic)
    // Add entity to world using addEntity() method to ensure ID consistency
    // addEntity() uses GameEntity's own ID as the key, avoiding ID mismatch
    worldModel.instance.addEntity(instance);

    const model = {
      id,
      entityId: id, // Same as GameEntity's ID for consistency
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
}

function createMuzzleFromForm() {
  // Generate unique ID
  let id = muzzleForm.id?.trim() || suggestId('muzzle', muzzles);

  // Ensure ID uniqueness
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    const isDuplicate = muzzles.some((m) => m.id === id);
    if (!isDuplicate) {
      break;
    }
    const prefix = id.match(/^[a-z_]+/i)?.[0] || 'muzzle';
    const currentNum = parseInt(id.match(/\d+$/)?.[0] || '0');
    id = `${prefix}_${currentNum + 1}`;
    attempts++;
  }

  if (attempts >= maxAttempts) {
    alert(`Could not generate unique ID after ${maxAttempts} attempts.`);
    return;
  }

  // Create MuzzleEntity instance
  const instance = markRaw(new MuzzleEntity({
    id,
    direction: {
      x: muzzleForm.direction.x != null ? Number(muzzleForm.direction.x) : 1,
      y: muzzleForm.direction.y != null ? Number(muzzleForm.direction.y) : 0
    },
    directionMode: muzzleForm.directionMode || 'relative',
    showDebug: muzzleForm.showDebug !== false,
    debugColor: muzzleForm.debugColor?.trim() || '#FF00FF',
    // 🔫 Fire parameters
    fireRate: Number(muzzleForm.fireRate) || 5,
    bulletSpeed: Number(muzzleForm.bulletSpeed) || 500,
    bulletRange: Number(muzzleForm.bulletRange) || 1000,
    bulletSize: Number(muzzleForm.bulletSize) || 8,
    bulletColor: muzzleForm.bulletColor?.trim() || '#FFFFFF',
    autoFire: Boolean(muzzleForm.autoFire) || false,
    position: { x: 0, y: 0 }, // Muzzle position will be controlled by slot
    rotation: 0,
    scale: { x: 1, y: 1 }
  }));

  // Find first world to add muzzle to ECS system
  const worldModel = worlds[0];
  if (worldModel && worldModel.instance) {
    // Add muzzle to world with minimal components for ECS
    const components = new Map();
    components.set('_entityRef', instance);
    components.set('position', instance.position);
    components.set('rotation', instance.rotation);
    components.set('scale', instance.scale);
    worldModel.instance.entities.set(id, components);

    // 🔫 Register muzzle in ProjectileSystem
    if (worldModel.instance.projectileSystem) {
      worldModel.instance.projectileSystem.registerMuzzle(instance);
    }

    console.log(`🔫 Muzzle "${id}" added to world "${worldModel.id}"`);
  }

  // Muzzle model
  const model = {
    id,
    direction: instance.direction,
    directionMode: instance.directionMode,
    showDebug: instance.showDebug,
    debugColor: instance.debugColor,
    fireRate: instance.fireRate,
    bulletSpeed: instance.bulletSpeed,
    bulletRange: instance.bulletRange,
    bulletSize: instance.bulletSize,
    bulletColor: instance.bulletColor,
    autoFire: instance.autoFire,
    instance,
    worldId: worldModel?.id // Store world reference
  };
  muzzles.push(model);
  select({ type: 'muzzle', id });
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
    inputType: 'keyboard',
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
      rotationMode: controllerForm.rotationMode,
      aimCamera: () => {
        // Prefer selected camera if it watches the same world as the entity.
        const sc = selectedCamera.value?.instance;
        if (sc && sc.worldId && sc.worldId === entityModel.worldId) return sc;
        // Fallback: first camera that watches this entity's world
        const camModel = cameras.find((c) => c.worldId === entityModel.worldId);
        return camModel?.instance || null;
      },
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

// 🔫 Keep muzzle inspector in sync when muzzle selection changes
watch(selectedMuzzle, () => syncMuzzleUiFromSelected());
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
  padding: 24px;
  text-align: center;
  color: rgba(255,255, 255, 0.40);
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
.inspector__section { padding: 10px; border-radius: 8px; background: rgba(79, 195, 247, 0.05); border: 1px solid rgba(79, 195, 247, 0.15); }
.inspector__section-title { font-weight: 700; font-size: 13px; color: #bfe7ff; margin-bottom: 8px; }
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
  max-height: 90vh;
  background: #2a2a2a;
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.45);
  display: flex;
  flex-direction: column;
}
.modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
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
.modal__body {
  padding: 12px 14px;
  overflow-y: auto;
  flex: 1;
}
.modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

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

/* Slots styles */
.slots-list {
  display: grid;
  gap: 8px;
  margin-top: 10px;
}

.slot-item {
  display: grid;
  grid-template-columns: 1fr 28px;
  gap: 8px;
  padding: 8px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.20);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.slot-item__info {
  display: grid;
  gap: 4px;
}

.slot-item__name {
  font-weight: 600;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.90);
}

.slot-item__meta {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
}

.slot-item__behavior {
  margin-left: 8px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(79, 195, 247, 0.10);
  font-size: 11px;
}

.slot-item__delete {
  height: 28px;
  width: 28px;
  border-radius: 6px;
  border: 1px solid rgba(255, 90, 90, 0.20);
  background: rgba(255, 90, 90, 0.10);
  color: rgba(255, 90, 90, 0.80);
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  display: grid;
  place-items: center;
}

.slot-item__delete:hover {
  background: rgba(255, 90, 90, 0.20);
  border-color: rgba(255, 90, 90, 0.30);
}

.slot-attach-full {
  padding: 8px;
  border-radius: 6px;
  background: rgba(255, 150, 50, 0.10);
  border: 1px solid rgba(255, 150, 50, 0.20);
  color: rgba(255, 150, 50, 0.80);
  font-size: 11px;
  text-align: center;
}

.slot-attach-control {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  margin-top: 8px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.15);
}

.slot-attach-control .field {
  margin: 0;
}

.slot-attach-control .field__input {
  width: 100%;
}
</style>

