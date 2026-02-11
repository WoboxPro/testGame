<template>
  <div class="form">
    <label class="field">
      <span class="field__label">ID</span>
      <input class="field__input" v-model.trim="model.id" placeholder="vision_1" />
    </label>

    <div class="form__section form__section--shape">
      <div class="form__section-title">👁️ Shape (форма обзора)</div>

      <label class="field">
        <span class="field__label">Shape</span>
        <select class="field__input" v-model="model.shape">
          <option value="arc">Arc (сектор)</option>
          <option value="circle">Circle (круг 360°)</option>
        </select>
        <span class="field__hint">
          • Circle - круговой обзор во все стороны<br>
          • Arc - сектор обзора с направлением
        </span>
      </label>

      <label class="field">
        <span class="field__label">Range (радиус обзора)</span>
        <input class="field__input" type="number" step="10" min="1" max="2000" v-model.number="model.range" />
        <span class="field__hint">Пиксели (1-2000, по умолчанию: 500)</span>
      </label>
    </div>

    <div class="form__section form__section--arc" v-if="model.shape === 'arc'">
      <div class="form__section-title">Direction (направление взгляда)</div>
      <div class="field__hint">Вектор, указывающий направление взгляда (только для Arc)</div>
      <div class="grid2">
        <label class="field">
          <span class="field__label">X</span>
          <input class="field__input" type="number" step="0.1" v-model.number="model.direction.x" />
        </label>
        <label class="field">
          <span class="field__label">Y</span>
          <input class="field__input" type="number" step="0.1" v-model.number="model.direction.y" />
        </label>
      </div>
      <div class="field__hint">
        Примеры: (1, 0) = вправо • (-1, 0) = влево • (0, 1) = вниз • (0, -1) = вверх
      </div>

      <label class="field">
        <span class="field__label">FOV Angle (угол обзора)</span>
        <input class="field__input" type="number" step="5" min="1" max="360" v-model.number="model.fovAngle" />
        <span class="field__hint">Градусы (1-360, по умолчанию: 90)</span>
      </label>

      <div class="form__section form__section--mode">
        <div class="form__section-title">Direction Mode (режим направления)</div>
        <label class="field">
          <span class="field__label">Mode</span>
          <select class="field__input" v-model="model.directionMode">
            <option value="relative">Relative (вместе с родителем)</option>
            <option value="static">Static (фиксированный)</option>
          </select>
          <span class="field__hint">
            • Relative - направление вращается вместе с родительской сущностью<br>
            • Static - направление фиксировано в мировых координатах
          </span>
        </label>
      </div>
    </div>

    <div class="form__section">
      <div class="form__section-title">Debug Visualization</div>
      <label class="field field--row">
        <input type="checkbox" v-model="model.showDebug" />
        <span class="field__label">Show Debug (визуализация обзора)</span>
      </label>
      <label class="field">
        <span class="field__label">Debug Color</span>
        <div class="color-input-wrapper">
          <input type="color" v-model="model.debugColor" class="color-input" />
          <input type="text" v-model.trim="model.debugColor" class="field__input color-text" placeholder="#00FF00" maxlength="7" />
        </div>
        <span class="field__hint">Цвет зоны обзора (hex)</span>
      </label>
    </div>

    <div class="form__section form__section--info">
      <div class="form__section-title">Примечание</div>
      <div class="field__hint">
        Vision крепится ТОЛЬКО через слоты к другим сущностям.<br>
        Слот определяет позицию и поворот vision.<br>
        👁️ DirectionMode: Relative - следует за поворотом родителя (для юнитов)<br>
        👁️ DirectionMode: Static - фиксирован в мире (для турелей/камер)
      </div>
    </div>
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
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.field { display: grid; gap: 6px; }
.field--row { grid-auto-flow: column; align-items: center; justify-content: start; gap: 10px; }
.field__label { font-weight: 700; font-size: 13px; color: rgba(255, 255, 255, 0.75); }
.field__hint { font-size: 11px; color: rgba(255, 255, 255, 0.5); }
.field__input {
  height: 36px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(0, 0, 0, 0.22);
  color: rgba(255, 255, 255, 0.92);
}
.field__input:focus { outline: 2px solid rgba(0, 255, 0, 0.25); border-color: rgba(0, 255, 0, 0.30); }
.color-input-wrapper {
  display: grid;
  grid-template-columns: 50px 1fr;
  gap: 8px;
}
.color-input {
  height: 36px;
  width: 100%;
  padding: 2px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(0, 0, 0, 0.22);
  cursor: pointer;
}
.color-text {
  font-family: monospace;
  text-transform: uppercase;
}
.form__section {
  padding: 10px;
  border-radius: 8px;
  background: rgba(0, 255, 0, 0.05);
  border: 1px solid rgba(0, 255, 0, 0.15);
}
.form__section--shape {
  background: rgba(0, 255, 0, 0.08);
  border: 1px solid rgba(0, 255, 0, 0.25);
}
.form__section--arc {
  background: rgba(100, 200, 255, 0.05);
  border: 1px solid rgba(100, 200, 255, 0.15);
}
.form__section--mode {
  background: rgba(150, 100, 255, 0.05);
  border: 1px solid rgba(150, 100, 255, 0.15);
  margin-top: 8px;
}
.form__section--info {
  background: rgba(123, 211, 255, 0.05);
  border: 1px solid rgba(123, 211, 255, 0.15);
}
.form__section-title { font-weight: 700; font-size: 13px; color: #00ff88; margin-bottom: 8px; }
.form__section--arc .form__section-title { color: #64c8ff; }
.form__section--mode .form__section-title { color: #9664ff; }
</style>
