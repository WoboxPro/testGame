/**
 * 📊 StatsSystem - Система характеристик (ECS)
 *
 * Базовая логика обработки stats для сущностей.
 * Игнорирует сущности без statsSystem = true.
 *
 * Поддерживает:
 * - hp: базовая логика (смерть при hp = 0)
 * - onDeath callback
 * - onDamage callback
 * - onHeal callback
 *
 * Пользователь может расширять систему для своих статов.
 */

export class StatsSystem {
  constructor(world) {
    this.world = world;

    // Зарегистрированные callbacks
    this._callbacks = {
      onDeath: new Map(),    // entityId -> callback
      onDamage: new Map(),   // entityId -> callback
      onHeal: new Map()      // entityId -> callback
    };

    console.log('📊 StatsSystem создана');
  }

  /**
   * 📊 Зарегистрировать callback для сущности
   * @param {string} entityId - ID сущности
   * @param {string} event - 'onDeath' | 'onDamage' | 'onHeal'
   * @param {Function} callback - Функция обратного вызова
   */
  on(entityId, event, callback) {
    if (this._callbacks[event]) {
      this._callbacks[event].set(entityId, callback);
    }
  }

  /**
   * 📊 Удалить callback
   * @param {string} entityId - ID сущности
   * @param {string} event - Событие
   */
  off(entityId, event) {
    if (this._callbacks[event]) {
      this._callbacks[event].delete(entityId);
    }
  }

  /**
   * 📊 Нанести урон сущности
   * @param {string} entityId - ID сущности
   * @param {number} damage - Величина урона
   * @param {Object} source - Источник урона (опционально)
   * @returns {number} Оставшееся hp или -1 если нет stats
   */
  dealDamage(entityId, damage, source = null) {
    const components = this.world.entities.get(entityId);
    if (!components) return -1;

    const entity = components.get('_entityRef');
    if (!entity?.statsSystem || !entity?.stats?.hp) return -1;

    const oldHp = entity.stats.hp.current;
    const newHp = entity.takeDamage(damage);

    // Вызываем onDamage callback
    const damageCallback = this._callbacks.onDamage.get(entityId);
    if (damageCallback) {
      damageCallback({
        entityId,
        damage,
        oldHp,
        newHp,
        source
      });
    }

    // Проверяем смерть
    if (newHp <= 0 && oldHp > 0) {
      this._handleDeath(entityId, entity, source);
    }

    return newHp;
  }

  /**
   * 📊 Восстановить здоровье сущности
   * @param {string} entityId - ID сущности
   * @param {number} amount - Величина восстановления
   * @param {Object} source - Источник (опционально)
   * @returns {number} Текущее hp или -1 если нет stats
   */
  heal(entityId, amount, source = null) {
    const components = this.world.entities.get(entityId);
    if (!components) return -1;

    const entity = components.get('_entityRef');
    if (!entity?.statsSystem || !entity?.stats?.hp) return -1;

    const oldHp = entity.stats.hp.current;
    const newHp = entity.heal(amount);

    // Вызываем onHeal callback
    const healCallback = this._callbacks.onHeal.get(entityId);
    if (healCallback) {
      healCallback({
        entityId,
        amount,
        oldHp,
        newHp,
        source
      });
    }

    return newHp;
  }

  /**
   * 📊 Установить hp сущности
   * @param {string} entityId - ID сущности
   * @param {number} value - Новое значение
   * @returns {number} Текущее hp или -1 если нет stats
   */
  setHp(entityId, value) {
    const components = this.world.entities.get(entityId);
    if (!components) return -1;

    const entity = components.get('_entityRef');
    if (!entity?.statsSystem || !entity?.stats?.hp) return -1;

    const oldHp = entity.stats.hp.current;
    entity.setStat('hp', value);
    const newHp = entity.stats.hp.current;

    // Проверяем смерть
    if (newHp <= 0 && oldHp > 0) {
      this._handleDeath(entityId, entity, null);
    }

    return newHp;
  }

  /**
   * 📊 Получить hp сущности
   * @param {string} entityId - ID сущности
   * @returns {{current: number, max: number}|null}
   */
  getHp(entityId) {
    const components = this.world.entities.get(entityId);
    if (!components) return null;

    const entity = components.get('_entityRef');
    if (!entity?.statsSystem || !entity?.stats?.hp) return null;

    return entity.stats.hp;
  }

  /**
   * 📊 Проверить, жива ли сущность
   * @param {string} entityId - ID сущности
   * @returns {boolean}
   */
  isAlive(entityId) {
    const components = this.world.entities.get(entityId);
    if (!components) return true;

    const entity = components.get('_entityRef');
    if (!entity?.statsSystem) return true;

    return entity.isAlive();
  }

  /**
   * 💀 Обработка смерти сущности
   * @private
   */
  _handleDeath(entityId, entity, source) {
    console.log(`💀 Entity died: ${entityId}`);

    // Вызываем onDeath callback
    const deathCallback = this._callbacks.onDeath.get(entityId);
    if (deathCallback) {
      deathCallback({
        entityId,
        source
      });
    }

    // Если есть метод die на entity - вызываем
    if (entity.die && typeof entity.die === 'function') {
      entity.die(source);
    }
  }

  /**
   * 🔄 Обновление системы (вызывается каждый кадр)
   * @param {number} dt - delta time в миллисекундах
   */
  update(dt) {
    // Базовая система не требует обновления каждый кадр
    // Но можно добавить регенерацию hp здесь в будущем:
    // this._regenerateHp(dt);
  }

  /**
   * 🧹 Очистить все callbacks для сущности
   * @param {string} entityId - ID сущности
   */
  clearEntity(entityId) {
    for (const callbacks of Object.values(this._callbacks)) {
      callbacks.delete(entityId);
    }
  }

  /**
   * 📊 Получить информацию о системе
   */
  getInfo() {
    return {
      callbacksCount: {
        onDeath: this._callbacks.onDeath.size,
        onDamage: this._callbacks.onDamage.size,
        onHeal: this._callbacks.onHeal.size
      }
    };
  }
}
