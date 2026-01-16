/**
 * 🎮 PixiGame - ECS-compatible game engine
 * 
 * Main game class that manages worlds
 */

import { World } from './core/World.js';

export class PixiGame {
  constructor() {
    this.isRunning = false;
    this.worlds = new Map(); // worldId -> World
  }
  
  /**
   * 🌍 Create world with type
   * @param {Object} options - World options
   * @param {string} options.type - World type: 'bounded' | 'infinite' | 'circular'
   * @param {number} options.width - World width (for bounded/circular)
   * @param {number} options.height - World height (for bounded/circular)
   * @param {string} options.backgroundColor - Background color
   * @param {Object} options.borders - Border settings
   */
  createWorld(options = {}) {
    const world = new World(options);
    this.worlds.set(world.id, world);
    console.log(`🎮 World создан: ${world.id}`);
    return world;
  }
  
  /**
   * 🗑️ Remove world
   */
  removeWorld(worldId) {
    return this.worlds.delete(worldId);
  }
  
  /**
   * 🌍 Get world
   */
  getWorld(worldId) {
    return this.worlds.get(worldId);
  }
  
  /**
   * 📊 Get all worlds info
   */
  getWorldsInfo() {
    return Array.from(this.worlds.values()).map(w => w.getInfo());
  }
}

// Export World for direct usage
export { World };
