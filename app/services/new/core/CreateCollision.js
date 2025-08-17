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
    
    // Дополнительные параметры
    this.isSolid = options.isSolid !== false; // блокирует движение
    this.layer = options.layer || 'default';
    
    console.log(`🎯 Создан тип коллизии: ${name} (${this.form})`);
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
      isSolid: this.isSolid,
      layer: this.layer,
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

// 👥 Коллизия для юнитов
export const createUnitCollision = (options = {}) => {
  return new CreateCollision('unit', {
    form: 'circle',
    radius: options.radius || options.size || 8,
    isSolid: true,
    layer: 'units',
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
