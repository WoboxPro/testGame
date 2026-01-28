/**
 * 🌍 World - ECS-compatible world container
 *
 * Supports 2 world types:
 * - bounded: Limited size (width x height)
 * - infinite: Unlimited size
 */

import { RegionSystem } from './RegionSystem.js';
import { CollisionSystem } from './CollisionSystem.js';
import { AnimationSystem } from './AnimationSystem.js';

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

    // 🗺️ Система регионов
    this.regionSystem = new RegionSystem(this);

    // 🎯 Система коллизий
    this.collisionSystem = new CollisionSystem(this);

    // 🎬 Система анимаций
    this.animationSystem = new AnimationSystem(this);

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

  /**
   * Attach external GameEntity instance to world
   * @param {GameEntity} gameEntity - The GameEntity instance to attach
   * @returns {boolean} True if attachment succeeded, false if failed
   */
  addEntity(gameEntity) {
    if (!gameEntity) {
      console.warn('World.addEntity(): gameEntity is null or undefined');
      return false;
    }

    // Set entity's binding to this world
    gameEntity.worldId = this.id;

    // Create ECS-compatible components Map (compatible with AnimationSystem)
    const components = new Map();
    components.set('_entityRef', gameEntity);
    components.set('position', gameEntity.position);
    components.set('velocity', gameEntity.velocity);
    components.set('movement', gameEntity.movement);
    components.set('appearance', gameEntity.appearance);
    components.set('subtype', gameEntity.subtype);

    // Add collision component if entity has collision
    if (gameEntity.hasCollision && gameEntity.collision) {
      components.set('collision', gameEntity.collision);
    }

    // Add animations component if enabled
    if (gameEntity.animations && gameEntity.animations.enabled) {
      components.set('animations', gameEntity.animations);
    }

    // Store entity with components in world's entities Map
    this.entities.set(gameEntity.id, components);

    console.log(`🔗 Entity attached to world: ${gameEntity.id} -> ${this.id}`);
    return true;
  }

  getEntity(entityId) {
    const entity = this.entities.get(entityId);
    if (!entity) return null;
    return Object.fromEntries(entity);
  }
  
  getAllEntities() {
    return this.entities;
  }

  /**
   * 🔄 Обновление мира (вызывается каждый кадр)
   */
  update(dt) {
    // Обновляем позиции сущностей, прикрепленных к слотам
    this.updateSlotAttachments();

    // Обновляем анимации
    if (this.animationSystem) {
      this.animationSystem.update(dt);
    }

    // Проверяем коллизии
    if (this.collisionSystem) {
      this.collisionSystem.checkCollisions();
    }
  }

  /**
   * 📌 Обновление позиций сущностей, прикрепленных к слотам
   *
   * This method ensures that entities attached to slots follow their parent entities.
   * Each frame, it calculates the correct position for attached entities based on:
   * - Parent entity's position
   * - Slot's offset (x, y)
   * - Slot's transformBehavior ('follow_entity' vs 'static')
   */
  updateSlotAttachments() {
    // Iterate through all entities in the world
    for (const [entityId, entityComponents] of this.entities) {
      const entityRef = entityComponents.get('_entityRef');

      // Skip if entity has no slots or reference
      if (!entityRef || !entityRef.slots || entityRef.slots.length === 0) {
        continue;
      }

      // Process each slot on this entity
      for (const slot of entityRef.slots) {
        // Skip if no entities attached to this slot
        if (!slot.attachedEntities || slot.attachedEntities.length === 0) {
          continue;
        }

        // Calculate slot's world position based on transformBehavior
        const slotPosition = this.calculateSlotPosition(entityRef, slot);

        // Update each attached entity's position
        for (const attachedEntityId of slot.attachedEntities) {
          // Find the attached entity in the world
          const attachedEntityComponents = this.entities.get(attachedEntityId);
          if (!attachedEntityComponents) {
            // Entity may have been deleted - clean up reference
            console.warn(`⚠️ Attached entity "${attachedEntityId}" not found in world, removing from slot "${slot.id}"`);
            const index = slot.attachedEntities.indexOf(attachedEntityId);
            if (index >= 0) {
              slot.attachedEntities.splice(index, 1);
            }
            continue;
          }

          const attachedEntityRef = attachedEntityComponents.get('_entityRef');
          if (attachedEntityRef) {
            // Принудительно синхронизируем позицию со слотом
            // Используем Object.assign для гарантии обновления всех ссылок
            Object.assign(attachedEntityRef.position, slotPosition);

            // Синхронизируем rotation с родительской сущностью
            // Прикрепленная сущность вращается вместе с родителем
            attachedEntityRef.rotation = entityRef.rotation || 0;

            // Обнуляем velocity - сущность управляется слотом
            if (attachedEntityRef.velocity) {
              attachedEntityRef.velocity.x = 0;
              attachedEntityRef.velocity.y = 0;
            }

            // Store attachment reference on the attached entity
            attachedEntityRef._parentEntityId = entityRef.id;
            attachedEntityRef._parentSlotId = slot.id;
          }
        }
      }
    }
  }

  /**
   * Calculate the world position of a slot
   * @param {Object} parentEntity - The parent entity containing the slot
   * @param {Object} slot - The slot configuration
   * @returns {Object} { x: number, y: number } World position of the slot
   */
  calculateSlotPosition(parentEntity, slot) {
    if (slot.transformBehavior === 'static') {
      // Static: slot stays at its initial world position (stored when attached)
      // _staticPosition already contains full world position (no need to add offset again)
      return slot._staticPosition || {
        x: parentEntity.position.x + slot.offset.x,
        y: parentEntity.position.y + slot.offset.y
      };
    }

    // Follow entity: slot moves and rotates with parent entity
    const mirrorDirection = parentEntity.mirrorDirection || { x: 1, y: 1 };

    // Apply rotation to offset if parent has rotation
    const rotation = parentEntity.rotation || 0;
    if (rotation === 0) {
      // No rotation - simple offset with mirror
      return {
        x: parentEntity.position.x + slot.offset.x * mirrorDirection.x,
        y: parentEntity.position.y + slot.offset.y * mirrorDirection.y
      };
    }

    // Apply rotation to offset
    // x' = x * cos(θ) - y * sin(θ)
    // y' = x * sin(θ) + y * cos(θ)
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const rotatedOffsetX = slot.offset.x * cos - slot.offset.y * sin;
    const rotatedOffsetY = slot.offset.x * sin + slot.offset.y * cos;

     // Apply mirror to rotated offset
     return {
       x: parentEntity.position.x + rotatedOffsetX * mirrorDirection.x,
       y: parentEntity.position.y + rotatedOffsetY * mirrorDirection.y
     };
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
