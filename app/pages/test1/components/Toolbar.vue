<template>
  <header class="toolbar">
    <div class="toolbar__left">
      <div class="brand">GoVue • Test1</div>
      <div class="toolbar__divider" />
      <div class="toolbar__group">
        <button
          class="btn"
          :class="{ 'btn--primary': modelValue === 'hierarchy' }"
          @click="$emit('update:modelValue', 'hierarchy')"
        >
          🎮 Game
        </button>
        <button
          class="btn"
          :class="{ 'btn--primary': modelValue === 'general' }"
          @click="$emit('update:modelValue', 'general')"
        >
          ⚙️ General
        </button>
      </div>
    </div>
    <div class="toolbar__right">
      <button class="btn" :disabled="!hasSelection" @click="$emit('deleteSelected')">🗑️ Delete Selected</button>
      <button class="btn" @click="$emit('reset')">♻️ Reset</button>
    </div>
  </header>
</template>

<script setup>
defineProps({
  modelValue: {
    type: String,
    default: 'hierarchy'
  },
  hasSelection: {
    type: Boolean,
    default: false
  }
});

defineEmits(['update:modelValue', 'deleteSelected', 'reset']);
</script>

<style scoped>
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
.toolbar__group {
  display: flex;
  gap: 6px;
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
</style>
