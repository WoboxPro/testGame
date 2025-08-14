/**
 * 🌍 World - Игровой мир с центрированной системой координат
 * 
 * Особенности:
 * - Центр мира в точке (0, 0)
 * - Координаты могут быть отрицательными
 * - Мир независим от канваса (может быть больше экрана)
 */

export class World {
  constructor(width = 2000, height = 1500) {
    this.width = width;
    this.height = height;
    
    // 🎯 ЦЕНТРИРОВАННАЯ СИСТЕМА: границы мира
    this.bounds = {
      left: -width / 2,    // -1000
      right: width / 2,    // +1000  
      top: -height / 2,    // -750
      bottom: height / 2   // +750
    };
    
    // 📊 Метаданные мира
    this.entities = new Map(); // id -> entity
    this.entityIdCounter = 1;
    
    console.log(`🌍 World создан: ${width}x${height}, центр (0,0)`);
    console.log(`📐 Границы: X[${this.bounds.left}, ${this.bounds.right}], Y[${this.bounds.top}, ${this.bounds.bottom}]`);
  }
  
  /**
   * Проверить находится ли точка в границах мира
   */
  isInBounds(x, y) {
    return x >= this.bounds.left && 
           x <= this.bounds.right && 
           y >= this.bounds.top && 
           y <= this.bounds.bottom;
  }
  
  /**
   * Ограничить координаты границами мира
   */
  clampToBounds(x, y) {
    return {
      x: Math.max(this.bounds.left, Math.min(this.bounds.right, x)),
      y: Math.max(this.bounds.top, Math.min(this.bounds.bottom, y))
    };
  }
  
  /**
   * Добавить сущность в мир
   */
  addEntity(entity) {
    const id = this.entityIdCounter++;
    entity.id = id;
    entity.worldId = this.id;
    
    this.entities.set(id, entity);
    
    console.log(`➕ Entity добавлен в мир: ID=${id}, pos=(${entity.x}, ${entity.y})`);
    return id;
  }
  
  /**
   * Удалить сущность из мира
   */
  removeEntity(id) {
    if (this.entities.has(id)) {
      this.entities.delete(id);
      console.log(`➖ Entity удален из мира: ID=${id}`);
      return true;
    }
    return false;
  }
  
  /**
   * Получить сущность по ID
   */
  getEntity(id) {
    return this.entities.get(id);
  }
  
  /**
   * Получить все сущности
   */
  getAllEntities() {
    return Array.from(this.entities.values());
  }
  
  /**
   * Получить сущности в области
   */
  getEntitiesInArea(centerX, centerY, radius) {
    return this.getAllEntities().filter(entity => {
      const dx = entity.x - centerX;
      const dy = entity.y - centerY;
      return Math.sqrt(dx * dx + dy * dy) <= radius;
    });
  }
  
  /**
   * Получить информацию о мире
   */
  getInfo() {
    return {
      width: this.width,
      height: this.height,
      bounds: { ...this.bounds },
      entityCount: this.entities.size,
      center: { x: 0, y: 0 }
    };
  }
}
