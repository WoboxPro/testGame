<template>
  <div class="form">
    <label class="field">
      <span class="field__label">World</span>
      <select class="field__input" v-model="model.worldId">
        <option v-for="w in worlds" :key="w.id" :value="w.id">{{ w.id }}</option>
      </select>
    </label>
    <label class="field">
      <span class="field__label">Type ID</span>
      <input class="field__input" v-model.trim="model.id" placeholder="projectile" />
    </label>
    <label class="field">
      <span class="field__label">Display Name</span>
      <input class="field__input" v-model.trim="model.name" placeholder="Projectile" />
    </label>
    <label class="field">
      <span class="field__label">Default Shape</span>
      <select class="field__input" v-model="model.defaultShape">
        <option value="circle">Circle (круг)</option>
        <option value="rect">Rectangle (прямоугольник)</option>
      </select>
    </label>
  </div>
</template>

<script setup>
defineProps({
  worlds: Array
});

const model = defineModel();
</script>

<style scoped>
.form { display: grid; gap: 10px; }
.field { display: grid; gap: 6px; }
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
