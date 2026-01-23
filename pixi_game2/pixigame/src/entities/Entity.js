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
    *  scale?: {x:number,y:number},
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
    this.scale = options.scale ? { x: Number(options.scale.x) || 1, y: Number(options.scale.y) || 1 } : { x: 1, y: 1 };

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
}

