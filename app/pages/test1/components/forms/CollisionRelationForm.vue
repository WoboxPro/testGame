<template>
  <div class="form">
    <label class="field">
      <span class="field__label">World</span>
      <select class="field__input" v-model="model.worldId">
        <option v-for="w in worlds" :key="w.id" :value="w.id">{{ w.id }}</option>
      </select>
    </label>
    <label class="field">
      <span class="field__label">Type A</span>
      <select class="field__input" v-model="model.typeA">
        <option v-for="type in getCollisionTypesForWorld(model.worldId)" :key="type.id" :value="type.id">{{ type.id }} ({{ type.name }})</option>
      </select>
    </label>
    <label class="field">
      <span class="field__label">Type B</span>
      <select class="field__input" v-model="model.typeB">
        <option v-for="type in getCollisionTypesForWorld(model.worldId)" :key="type.id" :value="type.id">{{ type.id }} ({{ type.name }})</option>
      </select>
    </label>
    <label class="field field--row">
      <input type="checkbox" v-model="model.block" />
      <span class="field__label">Block (блокировать движение)</span>
    </label>
    <label class="field field--row">
      <input type="checkbox" v-model="model.trigger" />
      <span class="field__label">Trigger (вызывать событие)</span>
    </label>
  </div>
</template>

<script setup>
defineProps({
  worlds: Array,
  getCollisionTypesForWorld: Function
});

const model = defineModel();
</script>

<style scoped>
.form { display: grid; gap: 10px; }
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
