/**
 * 🧱 ECS Components - Entity data containers
 * 
 * Components are pure data, no logic
 */

/**
 * 🧱 Position Component - Entity position in 2D world
 */
export function createPositionComponent(x = 0, y = 0) {
  return {
    x,
    y
  };
}

/**
 * 🏃 Velocity Component - Entity movement velocity
 */
export function createVelocityComponent(vx = 0, vy = 0) {
  return {
    x: vx,
    y: vy
  };
}

/**
 * 💊 Health Component - Entity health points
 */
export function createHealthComponent(current = 100, max = 100) {
  return {
    current,
    max,
    isDead: current <= 0
  };
}

/**
 * 👁️ Visual Component - Entity visual data (for renderer)
 */
export function createVisualComponent(options = {}) {
  return {
    type: options.type || 'circle', // 'circle' | 'square' | 'triangle'
    color: options.color || 0xff0000,
    size: options.size || 10,
    width: options.width || null,
    height: options.height || null,
    texture: options.texture || null
  };
}

/**
 * 💥 Collision Component - Entity collision data
 */
export function createCollisionComponent(options = {}) {
  return {
    enabled: options.enabled !== false,
    form: options.form || 'circle', // 'circle' | 'rect'
    radius: options.radius || 10,
    width: options.width || 20,
    height: options.height || 20,
    type: options.type || 'solid' // 'solid' | 'trigger' | 'sensor'
  };
}

/**
 * 🎯 Player Component - Marks entity as player-controlled
 */
export function createPlayerComponent(controllerId = null) {
  return {
    controllerId,
    isLocal: controllerId === 'local'
  };
}

/**
 * 🤖 AI Component - AI behavior data
 */
export function createAIComponent(options = {}) {
  return {
    enabled: options.enabled !== false,
    behavior: options.behavior || 'idle', // 'idle' | 'patrol' | 'chase' | 'flee'
    targetId: options.targetId || null,
    speed: options.speed || 2,
    patrolRadius: options.patrolRadius || 100
  };
}
