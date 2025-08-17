/**
 * 🎯 CreateCollision - Создание типов коллизий
 * 
 * Определяет форму, размер и параметры коллизий для сущностей
 */

export class CreateCollision {
  constructor(name, options = {}) {
    this.name = name;
    this.form = options.form || 'circle'; // circle, rect, polygon
    this.enabled = options.enabled !== false;
    
    // Параметры для разных форм
    if (this.form === 'circle') {
      this.radius = options.radius || options.size || 10;
    } else if (this.form === 'rect') {
      this.width = options.width || options.size || 20;
      this.height = options.height || options.size || 20;
    }
    
    // 🎯 НОВИНКА: Тип коллизии для поведения
    this.collisionType = options.collisionType || 'block'; // 'block' | 'trigger'
    
    // Дополнительные параметры
    this.isSolid = options.isSolid !== false; // УСТАРЕЛО: используем collisionType
    this.layer = options.layer || 'default';
    
    console.log(`🎯 Создан тип коллизии: ${name} (${this.form}, ${this.collisionType})`);
  }
  
  /**
   * 📋 Создать параметры коллизии для сущности
   */
  createEntityCollision(overrides = {}) {
    return {
      enabled: this.enabled,
      name: this.name,
      form: this.form,
      radius: this.radius,
      width: this.width,
      height: this.height,
      collisionType: this.collisionType, // 🎯 НОВИНКА: 'block' | 'trigger'
      isSolid: this.isSolid, // Сохраняем для совместимости
      layer: this.layer,
      autoSize: false, // 🎯 НОВИНКА: автоматический размер от entity
      sizeMultiplier: 1.0, // 🎯 Множитель для автоматического размера
      ...overrides
    };
  }
  
  /**
   * 📊 Получить информацию о типе коллизии
   */
  getInfo() {
    return {
      name: this.name,
      form: this.form,
      enabled: this.enabled,
      isSolid: this.isSolid,
      layer: this.layer,
      dimensions: this._getDimensions()
    };
  }
  
  /**
   * 📐 Получить размеры в зависимости от формы
   */
  _getDimensions() {
    if (this.form === 'circle') {
      return { radius: this.radius };
    } else if (this.form === 'rect') {
      return { width: this.width, height: this.height };
    }
    return {};
  }
}

/**
 * 🏭 Фабричные методы для популярных типов коллизий
 */

// 👥 Коллизия для юнитов (блокирующая)
export const createUnitCollision = (options = {}) => {
  return new CreateCollision('unit', {
    form: 'circle',
    radius: options.radius || options.size || 8,
    collisionType: 'block', // 🚫 Блокирует движение
    isSolid: true,
    layer: 'units',
    ...options
  });
};

// 🎯 НОВИНКА: Автоматическая коллизия для юнитов (размер от entity.size)
export const createAutoUnitCollision = (options = {}) => {
  const collision = new CreateCollision('unit', {
    form: 'circle',
    radius: 8, // Значение по умолчанию если autoSize не сработает
    collisionType: options.collisionType || 'block', // 🚫 По умолчанию блокирующая
    isSolid: true,
    layer: 'units',
    ...options
  });
  
  // Переопределяем метод для автоматического размера
  const originalCreate = collision.createEntityCollision.bind(collision);
  collision.createEntityCollision = function(overrides = {}) {
    return originalCreate({
      autoSize: true,
      sizeMultiplier: options.sizeMultiplier || 1.0,
      ...overrides
    });
  };
  
  return collision;
};

// 🎯 НОВИНКА: Триггерная коллизия (только события, не блокирует)
export const createTriggerCollision = (options = {}) => {
  return new CreateCollision(options.name || 'trigger', {
    form: 'circle',
    radius: options.radius || options.size || 10,
    collisionType: 'trigger', // 📡 Только события, не блокирует движение
    isSolid: false,
    layer: options.layer || 'triggers',
    ...options
  });
};

// 🏗️ Коллизия для зданий
export const createBuildingCollision = (options = {}) => {
  return new CreateCollision('building', {
    form: 'rect',
    width: options.width || options.size || 30,
    height: options.height || options.size || 30,
    isSolid: true,
    layer: 'buildings',
    ...options
  });
};

// 💎 Коллизия для подбираемых предметов
export const createPickupCollision = (options = {}) => {
  return new CreateCollision('pickup', {
    form: 'circle',
    radius: options.radius || options.size || 6,
    isSolid: false, // не блокируют движение
    layer: 'pickups',
    ...options
  });
};
