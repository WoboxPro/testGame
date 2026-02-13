<template>
  <div class="form">
    <label class="field">
      <span class="field__label">ID</span>
      <input class="field__input" v-model.trim="model.id" placeholder="muzzle_1" />
    </label>

    <div class="form__section form__section--firetype">
      <div class="form__section-title">🔫 Fire Type (тип огня)</div>
      <label class="field">
        <span class="field__label">Тип</span>
        <select class="field__input" v-model="model.fireType">
          <option value="projectile">🎯 Projectile (снаряды)</option>
          <option value="ray">⚡ Ray (мгновенные лучи)</option>
        </select>
        <span class="field__hint">
          • Projectile - летящие пули с физикой<br>
          • Ray - мгновенные лучи (raycast)
        </span>
      </label>
    </div>

    <div class="form__section">
      <div class="form__section-title">Direction (направление выстрела)</div>
      <div class="field__hint">Вектор, указывающий направление откуда будут вылетать пули/лучи</div>
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

      <!-- Projectile-only fields -->
      <template v-if="model.fireType !== 'ray'">
        <label class="field">
          <span class="field__label">Bullet Speed (скорость пули)</span>
          <input class="field__input" type="number" step="10" min="1" v-model.number="model.bulletSpeed" />
          <span class="field__hint">Пикселей в секунду (по умолчанию: 500)</span>
        </label>
      </template>

      <label class="field">
        <span class="field__label">{{ model.fireType === 'ray' ? 'Ray Range' : 'Bullet Range' }} (дальность)</span>
        <input class="field__input" type="number" step="10" min="1" v-model.number="model.bulletRange" />
        <span class="field__hint">Пикселей (по умолчанию: 1000)</span>
      </label>

      <!-- Projectile-only: size and color -->
      <template v-if="model.fireType !== 'ray'">
        <label class="field">
          <span class="field__label">Bullet Size (размер пули)</span>
          <input class="field__input" type="number" step="1" min="1" max="100" v-model.number="model.bulletSize" />
          <span class="field__hint">Пикселей (по умолчанию: 8)</span>
        </label>

        <label class="field">
          <span class="field__label">Bullet Color (цвет пули)</span>
          <div class="color-input-wrapper">
            <input type="color" v-model="model.bulletColor" class="color-input" />
            <input type="text" v-model.trim="model.bulletColor" class="field__input color-text" placeholder="#FFFFFF" maxlength="7" />
          </div>
          <span class="field__hint">Hex цвет (по умолчанию: #FFFFFF)</span>
        </label>

        <label class="field">
          <span class="field__label">Время жизни пули (секунды)</span>
          <input class="field__input" type="number" step="0.5" min="0" max="60" v-model.number="model.bulletLifetime" />
          <span class="field__hint">
            0 = бесконечно (пуля исчезает только по дальности), по умолчанию: 0
          </span>
        </label>
      </template>

      <!-- Ray-only fields -->
      <template v-if="model.fireType === 'ray'">
        <label class="field field--row">
          <input type="checkbox" v-model="model.showRay" />
          <span class="field__label">Show Ray (показывать луч)</span>
        </label>

        <label class="field">
          <span class="field__label">Ray Color (цвет луча)</span>
          <div class="color-input-wrapper">
            <input type="color" v-model="model.rayColor" class="color-input" />
            <input type="text" v-model.trim="model.rayColor" class="field__input color-text" placeholder="#FF0000" maxlength="7" />
          </div>
          <span class="field__hint">Hex цвет (по умолчанию: #FF0000)</span>
        </label>

        <label class="field">
          <span class="field__label">Ray Thickness (толщина визуальная)</span>
          <input class="field__input" type="number" step="1" min="1" max="50" v-model.number="model.rayThickness" />
          <span class="field__hint">Пикселей (по умолчанию: 3)</span>
        </label>

        <label class="field">
          <span class="field__label">Ray Collision Thickness (толщина коллизии)</span>
          <input class="field__input" type="number" step="1" min="1" max="100" v-model.number="model.rayCollisionThickness" />
          <span class="field__hint">Пикселей (по умолчанию: 10) - может отличаться от визуальной</span>
        </label>

        <label class="field">
          <span class="field__label">Ray Duration (длительность отображения)</span>
          <input class="field__input" type="number" step="10" min="10" max="1000" v-model.number="model.rayDuration" />
          <span class="field__hint">Миллисекунды (по умолчанию: 100)</span>
        </label>
      </template>

      <label class="field field--row">
        <input type="checkbox" v-model="model.autoFire" />
        <span class="field__label">Auto Fire (автоогонь)</span>
      </label>
      <span class="field__hint">
        • Включено - стрельба при зажатой кнопке мыши<br>
        • Выключено - одиночный выстрел при клике
      </span>

      <label class="field">
        <span class="field__label">{{ model.fireType === 'ray' ? 'Ray Count' : 'Bullet Count' }} (количество)</span>
        <input class="field__input" type="number" step="1" min="1" max="20" v-model.number="model.bulletCount" />
        <span class="field__hint">{{ model.fireType === 'ray' ? 'Лучей' : 'Пуль' }} за выстрел (1-20, по умолчанию: 1)</span>
      </label>

      <label class="field field--row">
        <input type="checkbox" v-model="model.isSpread" />
        <span class="field__label">🌟 Равномерный веер (для нескольких {{ model.fireType === 'ray' ? 'лучей' : 'пуль' }})</span>
      </label>
      <span class="field__hint" v-if="!model.isSpread">
        Случайный разброс для каждого {{ model.fireType === 'ray' ? 'луча' : 'выстрела' }} (работает и для 1!)
      </span>

      <label class="field">
        <span class="field__label">Макс. разброс (угол)</span>
        <input class="field__input" type="number" step="5" min="5" max="359" v-model.number="model.spreadAngle" />
        <span class="field__hint">
          {{ model.isSpread && (model.bulletCount ?? 1) > 1 ? 'Градусов для равномерного веера' : 'Градусов для случайного разброса' }} (5-359, по умолчанию: 45)
        </span>
      </label>

      <label class="field" v-if="!model.isSpread">
        <span class="field__label">Шанс разброса по углу (0-1)</span>
        <input class="field__input" type="number" step="0.05" min="0" max="1" v-model.number="model.scatterChance" />
        <span class="field__hint">
          Вероятность разброса по углу (0 = никогда, 1 = всегда, по умолчанию: 0)
        </span>
      </label>

      <!-- Range scatter (projectile and ray) -->
      <label class="field">
        <span class="field__label">Шанс разброса по дальности (0-1)</span>
        <input class="field__input" type="number" step="0.05" min="0" max="1" v-model.number="model.rangeScatterChance" />
        <span class="field__hint">
          Вероятность разброса по дальности (0 = никогда, 1 = всегда, по умолчанию: 0)
        </span>
      </label>

      <label class="field">
        <span class="field__label">Процент разброса дальности (0-100)</span>
        <input class="field__input" type="number" step="5" min="0" max="100" v-model.number="model.rangeSpreadPercent" />
        <span class="field__hint">
          Пример: при 400px дальности и 10% = {{ model.fireType === 'ray' ? 'лучи' : 'пули' }} летят от 360px до 400px (по умолчанию: 10)
        </span>
      </label>

      <label class="field">
        <span class="field__label">🎯 Пробитие (0-100)</span>
        <input class="field__input" type="number" step="1" min="0" max="100" v-model.number="model.bulletPiercing" />
        <span class="field__hint">
          1 = только первая цель (по умолчанию) • 2+ = пробивает N целей • 0 = бесконечное пробитие
        </span>
      </label>

      <label class="field">
        <span class="field__label">⚔️ Урон (damage)</span>
        <input class="field__input" type="number" step="1" min="0" v-model.number="model.damage" />
        <span class="field__hint">
          Урон при попадании (по умолчанию: 10). Работает только если у цели включён statsSystem.
        </span>
      </label>
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
        🎮 Стрельба управляется через KeyActions:<br>
        1. Создайте KeyAction в Controller (например, "fire")<br>
        2. Привяжите клавишу к KeyAction (например, KeyF или Mouse1)<br>
        3. Выберите KeyAction в слоте (keyActionId: "fire")<br>
        Все muzzle в этом слоте будут реагировать на привязанную клавишу.
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
  background: rgba(255, 0, 255, 0.05);
  border: 1px solid rgba(255, 0, 255, 0.15);
}
.form__section--fire {
  background: rgba(255, 165, 0, 0.08);
  border: 1px solid rgba(255, 165, 0, 0.25);
}
.form__section--firetype {
  background: rgba(0, 255, 136, 0.08);
  border: 1px solid rgba(0, 255, 136, 0.25);
}
.form__section--info {
  background: rgba(123, 211, 255, 0.05);
  border: 1px solid rgba(123, 211, 255, 0.15);
}
.form__section-title { font-weight: 700; font-size: 13px; color: #ff88ff; margin-bottom: 8px; }
</style>
