/**
 * 🌍 World - ECS-compatible world container
 * 
 * Supports 3 world types:
 * - bounded: Limited size (width x height) with borders
 * - infinite: Unlimited size
 * - circular: Wrapping edges (pac-man style)
 */

export class World {
  constructor(options = {}) {
    this.id = options.id || `world_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // 📐 World type
    this.type = options.type || 'bounded'; // 'bounded' | 'infinite' | 'circular'
    
    // 📏 World size (only for bounded/circular)
    this.width = options.width || 5000;
    this.height = options.height || 5000;
    
    // 🌍 Background color
    this.backgroundColor = options.backgroundColor || '#000000';
    
    // 🔲 World borders (only for bounded/circular)
    this.borders = {
      enabled: options.borders?.enabled !== false,
      width: options.borders?.width || 4,
      color: options.borders?.color || 0xFF0000,
      style: options.borders?.style || 'solid', // 'solid' | 'dashed'
      ...options.borders
    };
    
    // 📦 Entities storage (ECS: ID -> Components map)
    this.entities = new Map(); // entityId -> components
    this._entityCounter = 1;
    
    // 🏷️ Component types storage
    this.componentTypes = new Map(); // componentType -> schema
    
    // 🗂️ Spatial grid for optimization (optional)
    this.spatialGrid = null;
    
    console.log(`🌍 World создан: type=${this.type}, size=${this.width}x${this.height}`);
  }
  
  /**
   * ➕ Create entity with components (ECS style)
   */
  createEntity(componentData = {}) {
    const entityId = `entity_${this._entityCounter++}`;
    
    // Initialize components map
    const components = new Map();
    
    // Add components from data
    for (const [componentName, componentValue] of Object.entries(componentData)) {
      components.set(componentName, componentValue);
    }
    
    // Store entity
    this.entities.set(entityId, components);
    
    console.log(`➕ Entity создан: ${entityId}, components: ${Array.from(components.keys()).join(', ')}`);
    return entityId;
  }
  
  /**
   * 💾 Add component to existing entity
   */
  addComponent(entityId, componentName, componentValue) {
    const entity = this.entities.get(entityId);
    if (!entity) {
      console.warn(`Entity ${entityId} не найден`);
      return false;
    }
    
    entity.set(componentName, componentValue);
    console.log(`💾 Компонент ${componentName} добавлен к ${entityId}`);
    return true;
  }
  
  /**
   * 📥 Get component from entity
   */
  getComponent(entityId, componentName) {
    const entity = this.entities.get(entityId);
    if (!entity) return null;
    
    return entity.get(componentName);
  }
  
  /**
   * ✅ Check if entity has component
   */
  hasComponent(entityId, componentName) {
    const entity = this.entities.get(entityId);
    if (!entity) return false;
    
    return entity.has(componentName);
  }
  
  /**
   * 📋 Get all components from entity
   */
  getEntityComponents(entityId) {
    const entity = this.entities.get(entityId);
    if (!entity) return null;
    
    return Object.fromEntries(entity);
  }
  
  /**
   * 🗑️ Remove entity
   */
  removeEntity(entityId) {
    const removed = this.entities.delete(entityId);
    if (removed) {
      console.log(`🗑️ Entity ${entityId} удален`);
    }
    return removed;
  }
  
  /**
   * 🔄 World bounds check (for bounded type)
   */
  clampToBounds(x, y) {
    if (this.type === 'infinite') {
      return { x, y };
    }
    
    const halfWidth = this.width / 2;
    const halfHeight = this.height / 2;
    
    const clampedX = Math.max(-halfWidth, Math.min(halfWidth, x));
    const clampedY = Math.max(-halfHeight, Math.min(halfHeight, y));
    
    return { x: clampedX, y: clampedY };
  }
  
  /**
   * 🔁 Wrap coordinates (for circular type)
   */
  wrapCoordinates(x, y) {
    if (this.type !== 'circular') {
      return { x, y };
    }
    
    const halfWidth = this.width / 2;
    const halfHeight = this.height / 2;
    
    let wrappedX = x;
    let wrappedY = y;
    
    if (x > halfWidth) wrappedX = -halfWidth;
    if (x < -halfWidth) wrappedX = halfWidth;
    if (y > halfHeight) wrappedY = -halfHeight;
    if (y < -halfHeight) wrappedY = halfHeight;
    
    return { x: wrappedX, y: wrappedY };
  }
  
  /**
   * 📍 Check if position is inside world (for bounded type)
   */
  isInsideWorld(x, y) {
    if (this.type === 'infinite') {
      return true;
    }
    
    const halfWidth = this.width / 2;
    const halfHeight = this.height / 2;
    
    return x >= -halfWidth && x <= halfWidth &&
           y >= -halfHeight && y <= halfHeight;
  }
  
  /**
   * 📊 Get world info
   */
  getInfo() {
    return {
      id: this.id,
      type: this.type,
      width: this.width,
      height: this.height,
      backgroundColor: this.backgroundColor,
      entityCount: this.entities.size,
      borders: this.borders
    };
  }
}
