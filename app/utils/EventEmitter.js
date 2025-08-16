/**
 * 📡 SimpleEventEmitter - Простая событийная система
 * 
 * Основана на паттерне Observer для асинхронного взаимодействия
 */

export class SimpleEventEmitter {
  constructor() {
    this.listeners = new Map();
    this.maxListeners = 100; // Защита от утечек памяти
  }
  
  /**
   * 📋 Подписаться на событие
   */
  on(event, callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    const callbacks = this.listeners.get(event);
    
    // Защита от дублирования
    if (callbacks.includes(callback)) {
      console.warn(`⚠️ Callback already registered for event: ${event}`);
      return this;
    }
    
    // Защита от утечек памяти
    if (callbacks.length >= this.maxListeners) {
      console.warn(`⚠️ Too many listeners for event: ${event} (${callbacks.length})`);
    }
    
    callbacks.push(callback);
    return this; // Для цепочки вызовов
  }
  
  /**
   * 📡 Вызвать событие
   */
  emit(event, data = {}) {
    const callbacks = this.listeners.get(event);
    if (!callbacks || callbacks.length === 0) {
      return this;
    }
    
    // Добавляем метаданные к событию
    const eventData = {
      ...data,
      eventName: event,
      timestamp: Date.now()
    };
    
    callbacks.forEach(callback => {
      try {
        callback(eventData);
      } catch (error) {
        console.error(`💥 Error in event "${event}":`, error);
        console.error('Event data:', eventData);
      }
    });
    
    return this;
  }
  
  /**
   * 🚫 Отписаться от события
   */
  off(event, callback) {
    const callbacks = this.listeners.get(event);
    if (!callbacks) {
      return this;
    }
    
    if (!callback) {
      // Удаляем все обработчики для события
      this.listeners.delete(event);
    } else {
      // Удаляем конкретный обработчик
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
        
        // Удаляем событие если нет обработчиков
        if (callbacks.length === 0) {
          this.listeners.delete(event);
        }
      }
    }
    
    return this;
  }
  
  /**
   * 🔂 Подписаться на событие один раз
   */
  once(event, callback) {
    const onceCallback = (data) => {
      callback(data);
      this.off(event, onceCallback);
    };
    this.on(event, onceCallback);
    return this;
  }
  
  /**
   * 📊 Получить список событий
   */
  eventNames() {
    return Array.from(this.listeners.keys());
  }
  
  /**
   * 📈 Получить количество обработчиков для события
   */
  listenerCount(event) {
    const callbacks = this.listeners.get(event);
    return callbacks ? callbacks.length : 0;
  }
  
  /**
   * 🔍 Получить все обработчики для события
   */
  listeners(event) {
    const callbacks = this.listeners.get(event);
    return callbacks ? [...callbacks] : [];
  }
  
  /**
   * 🗑️ Очистить все события
   */
  removeAllListeners(event) {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
    return this;
  }
  
  /**
   * ⚙️ Настроить максимальное количество обработчиков
   */
  setMaxListeners(max) {
    this.maxListeners = max;
    return this;
  }
  
  /**
   * 📄 Получить информацию об EventEmitter
   */
  getInfo() {
    const events = {};
    for (const [event, callbacks] of this.listeners) {
      events[event] = callbacks.length;
    }
    
    return {
      totalEvents: this.listeners.size,
      totalListeners: Array.from(this.listeners.values()).reduce((total, callbacks) => total + callbacks.length, 0),
      maxListeners: this.maxListeners,
      events
    };
  }
}

/**
 * 🏭 Фабрика для создания EventEmitter с предустановленными событиями
 */
export const createGameEventEmitter = () => {
  const emitter = new SimpleEventEmitter();
  
  // Увеличиваем лимит для игровых событий
  emitter.setMaxListeners(200);
  
  return emitter;
};

/**
 * 📋 Константы игровых событий
 */
export const GAME_EVENTS = {
  // Биомы
  BIOME_ENTER: 'biome_enter',
  BIOME_EXIT: 'biome_exit',
  
  // Зоны
  ZONE_ENTER: 'zone_enter',
  ZONE_EXIT: 'zone_exit',
  
  // Сущности
  ENTITY_CREATED: 'entity_created',
  ENTITY_DESTROYED: 'entity_destroyed',
  ENTITY_MOVED: 'entity_moved',
  
  // Коллизии
  COLLISION_ENTER: 'collision_enter',
  COLLISION_EXIT: 'collision_exit',
  UNIT_COLLISION: 'unit_collision',
  
  // Боевая система
  DAMAGE_DEALT: 'damage_dealt',
  ENTITY_DIED: 'entity_died',
  ENTITY_RESPAWNED: 'entity_respawned',
  
  // Фракции
  FACTION_RELATION_CHANGED: 'faction_relation_changed',
  
  // Мир
  WORLD_CREATED: 'world_created',
  WORLD_DESTROYED: 'world_destroyed'
};
