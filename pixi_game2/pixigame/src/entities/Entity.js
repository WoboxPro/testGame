/**
 * Base Entity (game + ui + effect + grid + trigger)
 *
 * NOTE: This repo is mostly JS. We keep this class runtime-friendly and describe
 * shapes via JSDoc.
 */

export class Entity {
   /**
    * @param {Partial<Entity> & {
    *  id?: string,
    *  type?: 'effect'|'ui'|'grid'|'game'|'trigger',
    *  subtype?: string,
    *  position?: {x:number,y:number},
    *  rotation?: number,
     *  rotationBehavior?: 'none'|'move'|'mouse',
     *  reflectionBehavior?: 'none'|'mirrorX'|'mirrorY',
     *  rotationSpeed?: number,
     *  scale?: {x:number,y:number},
     *  baseScale?: {x:number,y:number},
     *  mirrorDirection?: {x?:number,y?:number},
     *  visible?: boolean,
    *  z_index?: number,
    *  opacity?: number,
    *  blendMode?: string,
    *  canvasId?: string,
    *  cameraId?: string,
    *  worldId?: string,
    *  collision?: Array<any>,
    *  components?: Map<string, any>
    * }} options
    */
  constructor(options = {}) {
    // Identification
    this.id = options.id || `entity_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    this.type = options.type || 'game';
    this.subtype = options.subtype;

    // 🌳 Hierarchy - по умолчанию root = сам себе
    this._rootEntityId = this.id;
    this._parentEntityId = null;
    this._parentSlotId = null;

    // Transform
     this.position = options.position ? { x: Number(options.position.x) || 0, y: Number(options.position.y) || 0 } : { x: 0, y: 0 };
     this.rotation = Number(options.rotation) || 0;
     this.baseScale = options.baseScale ? { x: Number(options.baseScale.x) || 1, y: Number(options.baseScale.y) || 1 } : { x: 1, y: 1 };
     this.scale = options.scale ? { x: Number(options.scale.x) || 1, y: Number(options.scale.y) || 1 } : { ...this.baseScale };
     this.mirrorDirection = options.mirrorDirection || { x: 1, y: 1 }; // Store last mirror direction

    // Rotation behavior (optional, used by controllers)
     this.rotationBehavior = options.rotationBehavior || 'none'; // 'none' | 'move' | 'mouse'
     this.reflectionBehavior = options.reflectionBehavior || 'none'; // 'none' | 'mirrorX' | 'mirrorY'
     this.rotationSpeed = Number.isFinite(options.rotationSpeed) ? Number(options.rotationSpeed) : 8.0; // rad/s (used for smooth turning)

    // Visibility
    this.visible = options.visible !== false;
    this.z_index = Number.isFinite(options.z_index) ? options.z_index : 0;
    this.opacity = Number.isFinite(options.opacity) ? options.opacity : 1;
    this.blendMode = options.blendMode;

    // Binding (ONLY ONE of three)
    this.canvasId = options.canvasId;
    this.cameraId = options.cameraId;
    this.worldId = options.worldId;
    this._enforceSingleBinding();

    // Collision (array)
    this.collision = Array.isArray(options.collision) ? options.collision : [];

    // Components (ECS)
    this.components = options.components instanceof Map ? options.components : new Map();

    // Slots (attachment points for entities/barrels)
    this.slots = options.slots || [];
  }

  _enforceSingleBinding() {
    const has = [!!this.canvasId, !!this.cameraId, !!this.worldId].filter(Boolean).length;
    if (has <= 1) return;
    throw new Error(`Entity "${this.id}": only one binding allowed (canvasId|cameraId|worldId)`);
  }

  /**
   * @returns {'canvas'|'camera'|'world'|null}
   */
  getBindingType() {
    if (this.canvasId) return 'canvas';
    if (this.cameraId) return 'camera';
    if (this.worldId) return 'world';
    return null;
  }

  clearBinding() {
    this.canvasId = undefined;
    this.cameraId = undefined;
    this.worldId = undefined;
  }

  setBinding({ canvasId, cameraId, worldId } = {}) {
    this.canvasId = canvasId;
    this.cameraId = cameraId;
    this.worldId = worldId;
    this._enforceSingleBinding();
  }

  setComponent(key, value) {
    this.components.set(key, value);
  }

  getComponent(key) {
    return this.components.get(key);
  }

  removeComponent(key) {
    this.components.delete(key);
  }

  // ==================== Slots System ====================

  /**
   * Add a slot to this entity
   * @param {Object} slotData - Slot configuration
   * @param {string} slotData.id - Unique slot ID
   * @param {number} slotData.offset.x - X offset from entity center
   * @param {number} slotData.offset.y - Y offset from entity center
   * @param {'follow_entity'|'static'} slotData.transformBehavior - How slot transforms with entity
   * @param {boolean} slotData.visualEnabled - Whether to visualize slot
   * @param {string} slotData.color - Visual color (hex)
   * @param {number|null} slotData.maxAttachments - Max attachments (null = unlimited)
   * @param {'instant'|'lerp'|'spring'} slotData.physicsMode - How attached entities move
   * @param {number} slotData.lerpFactor - Lerp speed (0.01-1.0)
   * @param {number} slotData.springStiffness - Spring stiffness (0.1-10)
   * @param {number} slotData.springDamping - Spring damping (0.7-0.99)
   * @param {number} slotData.springMaxLength - Max spring length (10-500px)
   * @param {string|null} slotData.keyActionId - KeyAction to bind to this slot (e.g., "fire", "left_hand")
   * @returns {Object} The created slot
   */
   addSlot(slotData = {}) {
     const slot = {
       id: slotData.id || `slot_${this.id}_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
       offset: {
         x: Number(slotData.offset?.x) || 0,
         y: Number(slotData.offset?.y) || 0
       },
       transformBehavior: slotData.transformBehavior || 'follow_entity', // 'follow_entity' | 'static'
       visualEnabled: slotData.visualEnabled !== false, // default: true
       color: slotData.color || '#00FFFF', // cyan by default
       maxAttachments: slotData.maxAttachments !== undefined ? slotData.maxAttachments : null, // null = unlimited
       attachedEntities: [], // Array of entity IDs attached to this slot

       // 🎯 PHYSICS MODE
       physicsMode: slotData.physicsMode || 'instant', // 'instant' | 'lerp' | 'spring'

       // ⚡ LERP PARAMETERS
       lerpFactor: slotData.lerpFactor !== undefined ? slotData.lerpFactor : 0.1,

       // 🌊 SPRING PARAMETERS
       springStiffness: slotData.springStiffness !== undefined ? slotData.springStiffness : 3.0,
       springDamping: slotData.springDamping !== undefined ? slotData.springDamping : 0.9,
       springMaxLength: slotData.springMaxLength !== undefined ? slotData.springMaxLength : 100,

       // 🎮 KEY ACTION BINDING
       keyActionId: slotData.keyActionId || null // KeyAction name (e.g., "fire", "left_hand")
     };

     this.slots.push(slot);
     return slot;
   }

  /**
   * Remove a slot by ID
   * @param {string} slotId - ID of slot to remove
   * @returns {boolean} True if slot was removed, false if not found
   */
  removeSlot(slotId) {
    const index = this.slots.findIndex(s => s.id === slotId);
    if (index >= 0) {
      this.slots.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get all slots on this entity
   * @returns {Array} Array of slot objects
   */
  getSlots() {
    return this.slots || [];
  }

  /**
   * Get a specific slot by ID
   * @param {string} slotId - ID of slot to retrieve
   * @returns {Object|null} Slot object or null if not found
   */
  getSlot(slotId) {
    return this.slots.find(s => s.id === slotId) || null;
  }

  /**
   * Update a slot by ID
   * @param {string} slotId - ID of slot to update
   * @param {Object} updates - Properties to update
   * @returns {boolean} True if slot was updated, false if not found
   */
  updateSlot(slotId, updates = {}) {
    const slot = this.getSlot(slotId);
    if (!slot) return false;

    // Merge updates into slot
    if (updates.offset !== undefined) {
      slot.offset = {
        x: Number(updates.offset.x) !== undefined ? updates.offset.x : slot.offset.x,
        y: Number(updates.offset.y) !== undefined ? updates.offset.y : slot.offset.y
      };
    }
    if (updates.transformBehavior !== undefined) slot.transformBehavior = updates.transformBehavior;
    if (updates.visualEnabled !== undefined) slot.visualEnabled = updates.visualEnabled;
    if (updates.color !== undefined) slot.color = updates.color;
    if (updates.maxAttachments !== undefined) slot.maxAttachments = updates.maxAttachments;

    return true;
  }

  // ==================== Entity Attachment System ====================

  /**
   * Attach an entity to a slot on this entity
   * @param {Object} entity - The entity to attach (must have .id)
   * @param {string} slotId - ID of the slot to attach to
   * @returns {Object|null} Result { success: boolean, message: string, slot: Object|null }
   */
  attachEntityToSlot(entity, slotId) {
    if (!entity || !entity.id) {
      return { success: false, message: 'Invalid entity: must have id property', slot: null };
    }

    const slot = this.getSlot(slotId);
    if (!slot) {
      return { success: false, message: `Slot "${slotId}" not found on entity "${this.id}"`, slot: null };
    }

    // Check if entity is already attached to this slot
    if (slot.attachedEntities.includes(entity.id)) {
      return { success: false, message: `Entity "${entity.id}" is already attached to slot "${slotId}"`, slot };
    }

    // Check maxAttachments limit
    if (slot.maxAttachments !== null && slot.attachedEntities.length >= slot.maxAttachments) {
      return {
        success: false,
        message: `Slot "${slotId}" is full (max ${slot.maxAttachments} attachments)`,
        slot
      };
    }

    // Attach entity to slot
    slot.attachedEntities.push(entity.id);

    // Store static position for 'static' transform behavior
    if (slot.transformBehavior === 'static' && !slot._staticPosition) {
      slot._staticPosition = {
        x: this.position.x + slot.offset.x,
        y: this.position.y + slot.offset.y
      };
    }

    // Set entity's parent reference to this entity and slot
    entity._parentEntityId = this.id;
    entity._parentSlotId = slotId;

    // 🌳 Set root entity ID - наследуем от родителя
    entity._rootEntityId = this._rootEntityId;

    // 🎯 Initialize spring physics state if needed
    if (slot.physicsMode === 'spring') {
      entity._springPhysics = {
        velocity: { x: 0, y: 0 },
        isInitialized: false
      };
    }

    // Update entity's position immediately to slot position
    entity.position.x = this.position.x + slot.offset.x;
    entity.position.y = this.position.y + slot.offset.y;

    console.log(`🔗 Entity "${entity.id}" attached to slot "${slotId}" (mode: ${slot.physicsMode}) on entity "${this.id}"`);
    return { success: true, message: `Entity "${entity.id}" attached to slot "${slotId}"`, slot };
  }

  /**
   * Detach an entity from a slot on this entity
   * @param {string} entityId - ID of the entity to detach
   * @param {string} slotId - ID of the slot to detach from (optional, auto-detected if not provided)
   * @returns {Object|null} Result { success: boolean, message: string, slot: Object|null }
   */
  detachEntityFromSlot(entityId, slotId = null) {
    let targetSlotId = slotId;

    // If slotId not provided, find which slot the entity is attached to
    if (!targetSlotId) {
      for (const slot of this.slots) {
        if (slot.attachedEntities.includes(entityId)) {
          targetSlotId = slot.id;
          break;
        }
      }
    }

    if (!targetSlotId) {
      return { success: false, message: `Entity "${entityId}" is not attached to any slot on entity "${this.id}"`, slot: null };
    }

    const slot = this.getSlot(targetSlotId);
    if (!slot) {
      return { success: false, message: `Slot "${targetSlotId}" not found on entity "${this.id}"`, slot: null };
    }

    // Check if entity is attached to this slot
    const index = slot.attachedEntities.indexOf(entityId);
    if (index < 0) {
      return { success: false, message: `Entity "${entityId}" is not attached to slot "${targetSlotId}"`, slot };
    }

    // Detach entity from slot
    slot.attachedEntities.splice(index, 1);

    console.log(`🔓 Entity "${entityId}" detached from slot "${targetSlotId}" on entity "${this.id}"`);
    return { success: true, message: `Entity "${entityId}" detached from slot "${targetSlotId}"`, slot };
  }

  /**
   * Get all entities attached to a specific slot
   * @param {string} slotId - ID of the slot
   * @returns {Array} Array of entity IDs attached to the slot
   */
  getAttachedEntities(slotId) {
    const slot = this.getSlot(slotId);
    if (!slot) return [];
    return [...slot.attachedEntities]; // Return copy
  }

  /**
   * Check if an entity is attached to any slot on this entity
   * @param {string} entityId - ID of the entity to check
   * @returns {boolean} True if entity is attached, false otherwise
   */
  isEntityAttached(entityId) {
    for (const slot of this.slots) {
      if (slot.attachedEntities.includes(entityId)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Find which slot an entity is attached to
   * @param {string} entityId - ID of the entity to find
   * @returns {Object|null} Slot object or null if not attached
   */
  getSlotForEntity(entityId) {
    for (const slot of this.slots) {
      if (slot.attachedEntities.includes(entityId)) {
        return slot;
      }
    }
    return null;
  }

  /**
   * Detach an entity from all slots on this entity
   * @param {string} entityId - ID of the entity to detach
   * @returns {Object} Result { success: boolean, message: string, slots: Array }
   */
  detachEntityFromAllSlots(entityId) {
    const results = [];
    for (const slot of this.slots) {
      const index = slot.attachedEntities.indexOf(entityId);
      if (index >= 0) {
        slot.attachedEntities.splice(index, 1);
        results.push(slot.id);
      }
    }

    if (results.length === 0) {
      return { success: false, message: `Entity "${entityId}" was not attached to any slot`, slots: [] };
    }

    console.log(`🔓 Entity "${entityId}" detached from all slots: ${results.join(', ')}`);
    return { success: true, message: `Entity "${entityId}" detached from ${results.length} slot(s)`, slots: results };
  }

  // ==================== Hierarchy System ====================

  /**
   * Get root entity ID
   * @returns {string} Root entity ID
   */
  getRootEntityId() {
    return this._rootEntityId;
  }

  /**
   * Get parent entity ID
   * @returns {string|null} Parent entity ID or null if no parent
   */
  getParentEntityId() {
    return this._parentEntityId;
  }

  /**
   * Check if this entity is a root entity (not attached to any other entity)
   * @returns {boolean}
   */
  isRootEntity() {
    return this._rootEntityId === this.id;
  }

  /**
   * Get all directly attached entity IDs from all slots
   * @returns {string[]} Array of attached entity IDs
   */
  getAllAttachedEntityIds() {
    const ids = [];
    for (const slot of this.slots) {
      if (slot.attachedEntities) {
        ids.push(...slot.attachedEntities);
      }
    }
    return ids;
  }

  /**
   * Get info about hierarchy
   */
  getHierarchyInfo() {
    return {
      rootEntityId: this._rootEntityId || null,
      parentEntityId: this._parentEntityId || null,
      parentSlotId: this._parentSlotId || null,
      isRoot: this.isRootEntity(),
      attachedEntityIds: this.getAllAttachedEntityIds()
    };
  }
}

