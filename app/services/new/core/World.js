/**
 * 🌍 World - Мир с сущностями
 * 
 * Хранит все игровые объекты в центрированной системе координат
 */

export class World {
  constructor(options = {}) {
    this.id = options.id || `world_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    this.width = options.width || 2000;
    this.height = options.height || 1500;
    this.backgroundColor = options.backgroundColor || '#0a0a0a';
    
    // 🎯 Центрированная система координат
    this.halfWidth = this.width / 2;
    this.halfHeight = this.height / 2;
    
    this.bounds = {
      left: -this.halfWidth,
      right: this.halfWidth,
      top: -this.halfHeight,
      bottom: this.halfHeight,
    };
    
    // 📦 Хранилище сущностей
    this.entities = new Map();
    this._entityIdCounter = 1;
    
    console.log(`🌍 World создан: ${this.width}×${this.height}, центр в (0,0), границы [${this.bounds.left},${this.bounds.right}] × [${this.bounds.top},${this.bounds.bottom}]`);
  }
  
  /**
   * ➕ Добавить сущность в мир
   */
  addEntity(entityData) {
    const id = this._entityIdCounter++;
    const entity = {
      id,
      x: entityData.x || 0,
      y: entityData.y || 0,
      type: entityData.type || 'unknown',
      name: entityData.name || `Entity_${id}`,
      ...entityData
    };
    
    this.entities.set(id, entity);
    console.log(`➕ Entity добавлен: ID=${id}, позиция=(${entity.x}, ${entity.y}), тип=${entity.type}`);
    return id;
  }
  
  /**
   * 🔍 Получить сущность по ID
   */
  getEntity(id) {
    return this.entities.get(id);
  }
  
  /**
   * 📊 Получить все сущности
   */
  getAllEntities() {
    return Array.from(this.entities.values());
  }
  
  /**
   * 🗑️ Удалить сущность
   */
  removeEntity(id) {
    const removed = this.entities.delete(id);
    if (removed) {
      console.log(`🗑️ Entity удален: ID=${id}`);
    }
    return removed;
  }
  
  /**
   * 📊 Информация о мире
   */
  getInfo() {
    return {
      width: this.width,
      height: this.height,
      backgroundColor: this.backgroundColor,
      bounds: { ...this.bounds },
      entityCount: this.entities.size
    };
  }
}
