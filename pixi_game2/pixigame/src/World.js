/**
 * 🌍 World - ECS-compatible world container
 * 
 * Supports 2 world types:
 * - bounded: Limited size (width x height)
 * - infinite: Unlimited size
 */

export class World {
  constructor(options = {}) {
    this.id = options.id || `world_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    this.type = options.type || 'bounded';
    this.width = options.width || 5000;
    this.height = options.height || 5000;
    this.backgroundColor = options.backgroundColor || '#000000';

    /**
     * Текстура фона мира
     * - Если указан textureUrl, фон мира будет использовать эту текстуру
     * - scaleMode определяет как текстура заполняет пространство:
     *   - 'stretch': растянуть на весь мир (bounded) или вьюпорт (infinite)
     *   - 'tile': замостить повторением
     *   - 'center': центрировать
     */
    this.backgroundTexture = {
      textureUrl: options.backgroundTexture?.textureUrl || null,
      scaleMode: options.backgroundTexture?.scaleMode || 'tile',
      tint: options.backgroundTexture?.tint || null
    };

    // Показывать ли визуальные границы bounded мира
    this.showBounds = options.showBounds !== undefined ? options.showBounds : false;
    // Цвет границ мира
    this.boundsColor = options.boundsColor || '#FF4444';

    this.entities = new Map();
    this._entityCounter = 1;

    console.log(`🌍 World создан: type=${this.type}, size=${this.width}x${this.height}, texture=${this.backgroundTexture.textureUrl || 'none'}`);
  }
  
  createEntity(entityData = {}) {
    const entityId = `entity_${this._entityCounter++}`;
    
    const components = new Map();
    for (const [key, value] of Object.entries(entityData)) {
      components.set(key, value);
    }
    
    this.entities.set(entityId, components);
    console.log(`➕ Entity создан: ${entityId}`);
    return entityId;
  }
  
  updateEntity(entityId, data) {
    const entity = this.entities.get(entityId);
    if (!entity) return false;
    
    for (const [key, value] of Object.entries(data)) {
      entity.set(key, value);
    }
    return true;
  }
  
  removeEntity(entityId) {
    return this.entities.delete(entityId);
  }
  
  getEntity(entityId) {
    const entity = this.entities.get(entityId);
    if (!entity) return null;
    return Object.fromEntries(entity);
  }
  
  getAllEntities() {
    return this.entities;
  }
  
  getInfo() {
    return {
      id: this.id,
      type: this.type,
      width: this.width,
      height: this.height,
      backgroundColor: this.backgroundColor,
      backgroundTexture: this.backgroundTexture,
      entityCount: this.entities.size
    };
  }
}
