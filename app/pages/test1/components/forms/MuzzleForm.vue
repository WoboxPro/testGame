<template>
  <div class="form">
    <label class="field">
      <span class="field__label">ID</span>
      <input class="field__input" v-model.trim="model.id" placeholder="muzzle_1" />
    </label>

    <div class="form__section">
      <div class="form__section-title">Direction (направление выстрела)</div>
      <div class="field__hint">Вектор, указывающий направление откуда будут вылетать пули</div>
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
    </div>

    <div class="form__section">
      <div class="form__section-title">Direction Mode (режим направления)</div>
      <label class="field">
        <span class="field__label">Mode</span>
        <select class="field__input" v-model="model.directionMode">
          <option value="static">Static (фиксированный)</option>
          <option value="relative">Relative (вместе с родителем)</option>
        </select>
        <span class="field__hint">
          • Static - направление фиксировано в мировых координатах<br>
          • Relative - направление вращается вместе с родительской сущностью
        </span>
      </label>
    </div>

    <div class="form__section form__section--fire">
      <div class="form__section-title">🔫 Fire Parameters (параметры стрельбы)</div>

      <label class="field">
        <span class="field__label">Fire Rate (скорострельность)</span>
        <input class="field__input" type="number" step="0.1" min="0.1" max="100" v-model.number="model.fireRate" />
        <span class="field__hint">Выстрелов в секунду (по умолчанию: 5)</span>
      </label>

      <label class="field">
        <span class="field__label">Bullet Speed (скорость пули)</span>
        <input class="field__input" type="number" step="10" min="1" v-model.number="model.bulletSpeed" />
        <span class="field__hint">Пикселей в секунду (по умолчанию: 500)</span>
      </label>

      <label class="field">
        <span class="field__label">Bullet Range (дальность пули)</span>
        <input class="field__input" type="number" step="10" min="1" v-model.number="model.bulletRange" />
        <span class="field__hint">Пикселей (по умолчанию: 1000)</span>
      </label>

      <label class="field field--row">
        <input type="checkbox" v-model="model.autoFire" />
        <span class="field__label">Auto Fire (автоогонь)</span>
      </label>
      <span class="field__hint">
        • Включено - стрельба при зажатой кнопке мыши<br>
        • Выключено - одиночный выстрел при клике
      </span>
    </div>

    <div class="form__section">
      <div class="form__section-title">Debug Visualization</div>
      <label class="field field--row">
        <input type="checkbox" v-model="model.showDebug" />
        <span class="field__label">Show Debug (визуализация ствола)</span>
      </label>
      <label class="field">
        <span class="field__label">Debug Color</span>
        <input class="field__input" v-model.trim="model.debugColor" placeholder="#FF00FF" />
        <span class="field__hint">Цвет точки и вектора направления (hex)</span>
      </label>
    </div>

    <div class="form__section form__section--info">
      <div class="form__section-title">Примечание</div>
      <div class="field__hint">
        Muzzle крепится ТОЛЬКО через слоты к другим сущностям.<br>
        В слоте должен быть physicsMode: 'instant' (без lerp/spring).<br>
        Стрельба пока привязана к левой кнопке мыши (хардкод).
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
.field__input:focus { outline: 2px solid rgba(255, 0, 255, 0.25); border-color: rgba(255, 0, 255, 0.30); }
.form__section {
  padding: 10px;
  border-radius: 8px;
  background: rgba(255, 0, 255, 0.05);
  border: 1px solid rgba(255, 0, 255, 0.15);
}
.form__section--fire {
  background: rgba(255, 165, 0, 0.08);
  border: 1px solid rgba(255, 165, 0, 0.25);
}
.form__section--info {
  background: rgba(123, 211, 255, 0.05);
  border: 1px solid rgba(123, 211, 255, 0.15);
}
.form__section-title { font-weight: 700; font-size: 13px; color: #ff88ff; margin-bottom: 8px; }
</style>
