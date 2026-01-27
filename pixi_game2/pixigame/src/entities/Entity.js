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
      maxAttachments: slotData.maxAttachments !== undefined ? slotData.maxAttachments : null // null = unlimited
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
}

