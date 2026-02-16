<template>
  <div class="form">
    <label class="field">
      <span class="field__label">ID</span>
      <input class="field__input" v-model.trim="model.id" placeholder="world_1" />
    </label>
    <label class="field">
      <span class="field__label">Type</span>
      <select class="field__input" v-model="model.type">
        <option value="bounded">bounded</option>
        <option value="infinite">infinite</option>
      </select>
    </label>
    <div class="grid2">
      <label class="field">
        <span class="field__label">Width</span>
        <input class="field__input" type="number" v-model.number="model.width" />
      </label>
      <label class="field">
        <span class="field__label">Height</span>
        <input class="field__input" type="number" v-model.number="model.height" />
      </label>
    </div>
    <label class="field">
      <span class="field__label">Background</span>
      <input class="field__input" v-model.trim="model.backgroundColor" placeholder="#000000" />
    </label>
    <label class="field">
      <span class="field__label">Texture URL (optional)</span>
      <input class="field__input" v-model.trim="model.textureUrl" placeholder="/assets/spritesheet.png" />
    </label>
    <div class="grid2" v-if="model.textureUrl">
      <label class="field">
        <span class="field__label">Texture Scale Mode</span>
        <select class="field__input" v-model="model.textureScaleMode">
          <option value="tile">tile (замостить)</option>
          <option value="stretch">stretch (растянуть)</option>
          <option value="center">center (центрировать)</option>
        </select>
      </label>
      <label class="field">
        <span class="field__label">Tint (optional)</span>
        <input class="field__input" v-model.trim="model.tint" placeholder="#ffffff" />
      </label>
    </div>
    <label class="field field--row">
      <input type="checkbox" v-model="model.showBounds" />
      <span class="field__label">Show world bounds</span>
    </label>
    <label class="field" v-if="model.showBounds">
      <span class="field__label">Bounds Color</span>
      <input class="field__input" v-model.trim="model.boundsColor" placeholder="#FF4444" />
    </label>

    <!-- 📐 Tile System -->
    <div class="form__divider"></div>
    <div class="form__section">
      <div class="form__section-title">📐 Tile System</div>
      <label class="field field--row">
        <input type="checkbox" v-model="model.tileEnabled" />
        <span class="field__label">Включить тайлы</span>
      </label>
      <span class="field__hint">Сетка для позиционирования объектов</span>

      <template v-if="model.tileEnabled">
        <label class="field">
          <span class="field__label">Режим сетки</span>
          <select class="field__input" v-model="model.tileMode">
            <option value="infinite">Бесконечная</option>
            <option value="fixed">Фиксированный размер</option>
          </select>
        </label>

        <div class="grid2">
          <label class="field">
            <span class="field__label">Ширина тайла (px)</span>
            <input class="field__input" type="number" min="8" v-model.number="model.tileWidth" />
          </label>
          <label class="field">
            <span class="field__label">Высота тайла (px)</span>
            <input class="field__input" type="number" min="8" v-model.number="model.tileHeight" />
          </label>
        </div>

        <div class="grid2">
          <label class="field">
            <span class="field__label">Origin X</span>
            <input class="field__input" type="number" v-model.number="model.tileOriginX" />
          </label>
          <label class="field">
            <span class="field__label">Origin Y</span>
            <input class="field__input" type="number" v-model.number="model.tileOriginY" />
          </label>
        </div>

        <template v-if="model.tileMode === 'fixed'">
          <div class="grid2">
            <label class="field">
              <span class="field__label">Колонки</span>
              <input class="field__input" type="number" min="1" v-model.number="model.tileCols" />
            </label>
            <label class="field">
              <span class="field__label">Строки</span>
              <input class="field__input" type="number" min="1" v-model.number="model.tileRows" />
            </label>
          </div>
        </template>

        <label class="field field--row">
          <input type="checkbox" v-model="model.tileShowGrid" />
          <span class="field__label">Показать сетку</span>
        </label>

        <template v-if="model.tileShowGrid">
          <label class="field">
            <span class="field__label">Цвет сетки</span>
            <input class="field__input" type="color" v-model.trim="model.tileGridColor" />
          </label>
          <div class="grid2">
            <label class="field">
              <span class="field__label">Прозрачность</span>
              <input class="field__input" type="number" min="0" max="1" step="0.1" v-model.number="model.tileGridAlpha" />
            </label>
            <label class="field">
              <span class="field__label">Толщина линии</span>
              <input class="field__input" type="number" min="1" max="5" v-model.number="model.tileGridLineWidth" />
            </label>
          </div>
        </template>
      </template>
    </div>

    <!-- ⬡ Hex Tile System -->
    <div class="form__divider"></div>
    <div class="form__section">
      <div class="form__section-title">⬡ Hex Tile System</div>
      <label class="field field--row">
        <input type="checkbox" v-model="model.hexEnabled" />
        <span class="field__label">Включить гексагональные тайлы</span>
      </label>
      <span class="field__hint">Бесконечная сетка гексагонов (axial координаты)</span>

      <template v-if="model.hexEnabled">
        <label class="field">
          <span class="field__label">Ориентация</span>
          <select class="field__input" v-model="model.hexOrientation">
            <option value="pointy-top">Pointy-top (угол вверх)</option>
            <option value="flat-top">Flat-top (плоскость сверху)</option>
          </select>
        </label>

        <div class="grid2">
          <label class="field">
            <span class="field__label">Размер гекса (радиус, px)</span>
            <input class="field__input" type="number" min="8" v-model.number="model.hexSize" />
          </label>
        </div>

        <div class="grid2">
          <label class="field">
            <span class="field__label">Origin X</span>
            <input class="field__input" type="number" v-model.number="model.hexOriginX" />
          </label>
          <label class="field">
            <span class="field__label">Origin Y</span>
            <input class="field__input" type="number" v-model.number="model.hexOriginY" />
          </label>
        </div>

        <label class="field field--row">
          <input type="checkbox" v-model="model.hexShowGrid" />
          <span class="field__label">Показать сетку</span>
        </label>

        <template v-if="model.hexShowGrid">
          <label class="field">
            <span class="field__label">Цвет сетки</span>
            <input class="field__input" type="color" v-model.trim="model.hexGridColor" />
          </label>
          <div class="grid2">
            <label class="field">
              <span class="field__label">Прозрачность</span>
              <input class="field__input" type="number" min="0" max="1" step="0.1" v-model.number="model.hexGridAlpha" />
            </label>
            <label class="field">
              <span class="field__label">Толщина линии</span>
              <input class="field__input" type="number" min="1" max="5" v-model.number="model.hexGridLineWidth" />
            </label>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup>
const model = defineModel();
</script>

<style scoped>
.form { display: grid; gap: 10px; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.field { display: grid; gap: 6px; }
.field--row { grid-auto-flow: column; align-items: center; justify-content: start; gap: 10px; }
.field__label { font-weight: 700; font-size: 13px; color: rgba(255, 255, 255, 0.75); }
.field__hint { font-size: 11px; color: rgba(255, 255, 255, 0.50); }
.field__input {
  height: 36px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(0, 0, 0, 0.22);
  color: rgba(255, 255, 255, 0.92);
}
.field__input:focus { outline: 2px solid rgba(79, 195, 247, 0.25); border-color: rgba(79, 195, 247, 0.30); }
.form__divider { height: 1px; background: rgba(255, 255, 255, 0.10); margin: 4px 0; }
.form__section { display: grid; gap: 10px; padding: 10px; border-radius: 8px; background: rgba(79, 195, 247, 0.06); border: 1px solid rgba(79, 195, 247, 0.12); }
.form__section-title { font-weight: 700; font-size: 14px; color: #bfe7ff; }
input[type="color"].field__input { padding: 2px; height: 36px; cursor: pointer; }
</style>
