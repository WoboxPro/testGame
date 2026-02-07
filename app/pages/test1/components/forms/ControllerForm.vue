<template>
  <div class="form">
    <label class="field">
      <span class="field__label">ID</span>
      <input class="field__input" v-model.trim="model.id" placeholder="controller_1" />
    </label>
    <label class="field">
      <span class="field__label">Type</span>
      <select class="field__input" v-model="model.type">
        <option value="camera">Camera</option>
        <option value="entity">Entity</option>
      </select>
    </label>

    <template v-if="model.type === 'camera'">
      <label class="field">
        <span class="field__label">Camera</span>
        <select class="field__input" v-model="model.cameraId">
          <option v-for="c in cameras" :key="c.id" :value="c.id">{{ c.id }}</option>
        </select>
      </label>
      <div class="grid2">
        <label class="field">
          <span class="field__label">Move Speed</span>
          <input class="field__input" type="number" v-model.number="model.moveSpeed" />
        </label>
        <label class="field">
          <span class="field__label">Zoom Speed</span>
          <input class="field__input" type="number" v-model.number="model.zoomSpeed" />
        </label>
      </div>
      <div class="grid2">
        <label class="field">
          <span class="field__label">Min Zoom</span>
          <input class="field__input" type="number" step="0.1" v-model.number="model.minZoom" />
        </label>
        <label class="field">
          <span class="field__label">Max Zoom</span>
          <input class="field__input" type="number" step="0.1" v-model.number="model.maxZoom" />
        </label>
      </div>
    </template>

    <template v-else-if="model.type === 'entity'">
      <label class="field">
        <span class="field__label">Entity</span>
        <select class="field__input" v-model="model.entityId">
          <option v-for="e in gameEntities" :key="e.id" :value="e.id">{{ e.id }} ({{ e.subtype }})</option>
        </select>
      </label>
      <div class="info-box">
        <strong>📝 Movement settings (maxSpeed, acceleration, friction) are now set in the Entity itself.</strong>
      </div>
    </template>

    <label class="field">
      <span class="field__label">Input Type</span>
      <select class="field__input" v-model="model.inputType">
        <option value="keyboard">⌨️ Keyboard + Mouse</option>
        <option value="touch">📱 Touch (Virtual Joystick)</option>
      </select>
    </label>

    <template v-if="model.type === 'entity'">
      <label class="field">
        <span class="field__label">Auto rotation</span>
        <select class="field__input" v-model="model.rotationMode">
          <option value="none">None (manual Q/E)</option>
          <option value="move">Face movement direction</option>
          <option v-if="model.inputType === 'keyboard'" value="mouse">Face mouse cursor</option>
        </select>
      </label>
      <div class="info-box" v-if="model.inputType === 'touch' && model.rotationMode === 'mouse'">
        <strong>ℹ️ Mouse rotation is disabled for Touch input.</strong>
      </div>
    </template>

    <template v-if="model.type === 'entity' && model.inputType === 'touch'">
      <div class="info-box">
        <strong>🕹️ Touch Joystick Settings</strong>
      </div>

      <label class="field field--row">
        <input type="checkbox" v-model="model.touchLeftStickEnabled" />
        <span class="field__label">Left Joystick (Movement)</span>
      </label>

      <template v-if="model.touchLeftStickEnabled">
        <label class="field">
          <span class="field__label">Type</span>
          <select class="field__input" v-model="model.touchLeftStickType">
            <option value="static">Static (фиксированный)</option>
            <option value="dynamic">Dynamic (в месте тача)</option>
          </select>
        </label>

        <div class="grid2">
          <label class="field">
            <span class="field__label">Outer Radius (px)</span>
            <input class="field__input" type="number" v-model.number="model.touchLeftStickOuterRadius" min="30" max="150" />
          </label>
          <label class="field">
            <span class="field__label">Inner Radius (px)</span>
            <input class="field__input" type="number" v-model.number="model.touchLeftStickInnerRadius" min="10" max="100" />
          </label>
        </div>

        <div class="grid2">
          <label class="field">
            <span class="field__label">Deadzone (%)</span>
            <input class="field__input" type="number" v-model.number="model.touchLeftStickDeadzone" min="0" max="50" />
          </label>
          <label class="field">
            <span class="field__label">Position X (px)</span>
            <input class="field__input" type="number" v-model.number="model.touchLeftStickX" />
          </label>
        </div>
      </template>

      <label class="field field--row">
        <input type="checkbox" v-model="model.touchRightStickEnabled" />
        <span class="field__label">Right Joystick (Aim/Action - Optional)</span>
      </label>

      <template v-if="model.touchRightStickEnabled">
        <label class="field">
          <span class="field__label">Type</span>
          <select class="field__input" v-model="model.touchRightStickType">
            <option value="joystick">Joystick</option>
            <option value="buttons">Buttons (задел)</option>
          </select>
        </label>

        <template v-if="model.touchRightStickType === 'joystick'">
          <label class="field">
            <span class="field__label">Position Type</span>
            <select class="field__input" v-model="model.touchRightStickPositionType">
              <option value="static">Static (фиксированный)</option>
              <option value="dynamic">Dynamic (в месте тача)</option>
            </select>
          </label>

          <div class="grid2">
            <label class="field">
              <span class="field__label">Outer Radius (px)</span>
              <input class="field__input" type="number" v-model.number="model.touchRightStickOuterRadius" min="30" max="150" />
            </label>
            <label class="field">
              <span class="field__label">Inner Radius (px)</span>
              <input class="field__input" type="number" v-model.number="model.touchRightStickInnerRadius" min="10" max="100" />
            </label>
          </div>

          <div class="grid2">
            <label class="field">
              <span class="field__label">Deadzone (%)</span>
              <input class="field__input" type="number" v-model.number="model.touchRightStickDeadzone" min="0" max="50" />
            </label>
            <label class="field" v-if="model.touchRightStickPositionType === 'static'">
              <span class="field__label">Position X</span>
              <select class="field__input" v-model="model.touchRightStickX">
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

    <label class="field field--row" v-if="model.inputType === 'keyboard'">
      <input type="checkbox" v-model="model.customBindings" />
      <span class="field__label">Custom key bindings</span>
    </label>

    <div v-if="model.customBindings && model.inputType === 'keyboard'" class="bindings-editor">
      <div class="info-box" style="margin-bottom: 12px;">
        <strong>⌨️ Click field and press key to record</strong>
      </div>

      <div class="binding-row" v-for="actionKey in getControllerActions(model.type)" :key="actionKey">
        <span class="binding-action">{{ formatActionName(actionKey) }}</span>
        <div class="binding-input-wrapper">
          <input
            class="binding-input"
            :class="{ 'is-recording': keyRecording.action === actionKey && keyRecording.field === 'primary' }"
            :value="model.bindings[actionKey]?.primary || ''"
            :placeholder="keyRecording.action === actionKey && keyRecording.field === 'primary' ? 'Press any key...' : 'Primary key'"
            readonly
            @focus="startKeyRecording(actionKey, 'primary')"
            @blur="stopKeyRecording"
            @keydown="handleKeyRecording"
          />
          <button
            v-if="model.bindings[actionKey]?.primary"
            class="binding-clear"
            @click="model.bindings[actionKey].primary = ''"
            title="Clear"
          >×</button>
        </div>
        <div class="binding-input-wrapper">
          <input
            class="binding-input"
            :class="{ 'is-recording': keyRecording.action === actionKey && keyRecording.field === 'secondary' }"
            :value="model.bindings[actionKey]?.secondary || ''"
            :placeholder="keyRecording.action === actionKey && keyRecording.field === 'secondary' ? 'Press any key...' : 'Secondary (optional)'"
            readonly
            @focus="startKeyRecording(actionKey, 'secondary')"
            @blur="stopKeyRecording"
            @keydown="handleKeyRecording"
          />
          <button
            v-if="model.bindings[actionKey]?.secondary"
            class="binding-clear"
            @click="model.bindings[actionKey].secondary = ''"
            title="Clear"
          >×</button>
        </div>
      </div>
    </div>

    <!-- 🎮 KeyActions Editor -->
    <div v-if="model.inputType === 'keyboard'" class="keyactions-section">
      <label class="field field--row">
        <input type="checkbox" v-model="model.showKeyActions" />
        <span class="field__label">🎮 Configure KeyActions (for Slots/Muzzles)</span>
      </label>

      <div v-if="model.showKeyActions" class="keyactions-editor">
        <div class="info-box" style="margin-bottom: 12px;">
          <strong>🎮 KeyActions bind custom keys to slots (e.g., muzzle fire)</strong><br>
          Create slots with keyActionId, then bind keys here.
        </div>

        <div class="keyaction-row" v-for="action in availableKeyActions" :key="action.name || action.id">
          <span class="keyaction-name">{{ action.displayName || action.name || action.id }}</span>
          <span class="keyaction-hint">{{ action.description || '' }}</span>
          <div class="binding-input-wrapper">
            <input
              class="binding-input"
              :class="{ 'is-recording': keyActionRecording.action === (action.name || action.id) }"
              :value="model.keyActions?.[action.name || action.id] || ''"
              :placeholder="keyActionRecording.action === (action.name || action.id) ? 'Press key or mouse...' : 'Not bound'"
              readonly
              @focus="startKeyActionRecording(action.name || action.id)"
              @blur="stopKeyActionRecording"
              @keydown="handleKeyActionRecording"
              @mousedown="handleKeyActionRecording"
            />
            <button
              v-if="model.keyActions?.[action.name || action.id]"
              class="binding-clear"
              @click="delete model.keyActions[action.name || action.id]"
              title="Clear"
            >×</button>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="model.inputType === 'keyboard'" class="info-box">
      <strong>🎮 Default controls:</strong><br>
      Movement: WASD (entity) or Numpad 5213 (camera)<br>
      Rotate (entity): Q / E (when Auto rotation = None)<br>
      Zoom: Numpad +/–<br>
      Switch: Tab or Numpad 0
    </div>

    <div v-else class="info-box">
      <strong>🕹️ Touch controls:</strong><br>
      Virtual joysticks will appear on canvas when touched
    </div>
  </div>
</template>

<script setup>
import { reactive, computed } from 'vue';

const props = defineProps({
  cameras: Array,
  gameEntities: Array,
  keyActions: Array
});

const model = defineModel();
const emit = defineEmits(['startKeyRecording', 'stopKeyRecording', 'handleKeyRecording']);

const keyRecording = reactive({
  action: null,
  field: null
});

// 🎮 KeyActions recording state
const keyActionRecording = reactive({
  action: null
});

// 🎮 Доступные KeyActions - берём из пропсов (из меню)
const availableKeyActions = computed(() => {
  return props.keyActions || [];
});

// Инициализируем keyActions если не существует
if (!model.value.keyActions) {
  model.value.keyActions = {};
}

function startKeyRecording(action, field) {
  keyRecording.action = action;
  keyRecording.field = field;
  emit('startKeyRecording', action, field);
}

function stopKeyRecording() {
  keyRecording.action = null;
  keyRecording.field = null;
  emit('stopKeyRecording');
}

function handleKeyRecording(e) {
  if (!keyRecording.action) return;
  e.preventDefault();
  const keyCode = e.code;
  model.bindings[keyRecording.action][keyRecording.field] = keyCode;
  stopKeyRecording();
  emit('handleKeyRecording', e);
  e.target.blur();
}

// 🎮 KeyActions recording functions
function startKeyActionRecording(actionName) {
  keyActionRecording.action = actionName;
}

function stopKeyActionRecording() {
  keyActionRecording.action = null;
}

function handleKeyActionRecording(e) {
  if (!keyActionRecording.action) return;

  e.preventDefault();

  // Поддерживаем как клавиатуру так и мышь
  let keyCode;
  if (e.type === 'keydown') {
    keyCode = e.code;
  } else if (e.type === 'mousedown') {
    keyCode = `Mouse${e.button}`;
  } else {
    return;
  }

  if (!model.value.keyActions) {
    model.value.keyActions = {};
  }
  model.value.keyActions[keyActionRecording.action] = keyCode;

  stopKeyActionRecording();
  e.target.blur();
}

function formatActionName(actionKey) {
  const names = {
    move_up: '⬆️ Move Up',
    move_down: '⬇️ Move Down',
    move_left: '⬅️ Move Left',
    move_right: '➡️ Move Right',
    rotate_left: '↺ Rotate Left',
    rotate_right: '↻ Rotate Right',
    zoom_in: '🔍 Zoom In',
    zoom_out: '🔍 Zoom Out',
    switch_target: '🔄 Switch Target'
  };
  return names[actionKey] || actionKey;
}

function getControllerActions(type) {
  if (type === 'entity') {
    return ['move_up', 'move_down', 'move_left', 'move_right', 'rotate_left', 'rotate_right', 'switch_target'];
  } else {
    return ['move_up', 'move_down', 'move_left', 'move_right', 'zoom_in', 'zoom_out', 'switch_target'];
  }
}
</script>

<style scoped>
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

.info-box {
  padding: 12px;
  border-radius: 8px;
  background: rgba(79, 195, 247, 0.08);
  border: 1px solid rgba(79, 195, 247, 0.20);
  font-size: 13px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.85);
}
.info-box strong { color: #bfe7ff; }

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
.binding-input::placeholder { color: rgba(255, 255, 255, 0.35); }
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

/* 🎮 KeyActions Styles */
.keyactions-section {
  padding: 12px;
  border-radius: 8px;
  background: rgba(255, 165, 0, 0.05);
  border: 1px solid rgba(255, 165, 0, 0.20);
}
.keyactions-editor {
  display: grid;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.keyaction-row {
  display: grid;
  grid-template-columns: 140px 1fr 180px;
  gap: 8px;
  align-items: center;
}
.keyaction-name {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}
.keyaction-hint {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}
</style>
