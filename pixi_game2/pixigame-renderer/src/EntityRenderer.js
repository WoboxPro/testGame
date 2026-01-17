/**
 * 🎨 EntityRenderer - Управляет рендерингом сущностей для всех камер
 */

import * as PIXI from 'pixi.js';

export class EntityRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this._cache = new Map();
  }
  
  renderEntities(camera, world, container) {
    if (!container || !world) return;
    
    const cachePrefix = `${camera.id}::`;
    const visibleBounds = camera._getWorldBoundsInView();
    
    const activeEntityIds = new Set();
    
    for (const [entityId, components] of world.entities) {
      const position = components.get('position');
      const appearance = components.get('appearance');
      
      if (!position || !appearance) continue;
      
      const isVisible = this._isEntityVisible(
        { x: position.x, y: position.y },
        appearance.size || 0,
        visibleBounds
      );
      
      if (!isVisible) {
        const cacheKey = `${cachePrefix}${entityId}`;
        const displayObj = this._cache.get(cacheKey);
        if (displayObj && displayObj.parent === container) {
          container.removeChild(displayObj);
        }
        continue;
      }
      
      activeEntityIds.add(entityId);
      
      const cacheKey = `${cachePrefix}${entityId}`;
      let displayObj = this._cache.get(cacheKey);
      
      if (!displayObj) {
        displayObj = this._createDisplayObject(appearance);
        this._cache.set(cacheKey, displayObj);
      }
      
      this._updateDisplayObject(displayObj, position, appearance);
      
      if (displayObj.parent !== container) {
        container.addChild(displayObj);
      }
    }
    
    for (const [cacheKey, displayObj] of this._cache) {
      if (cacheKey.startsWith(cachePrefix)) {
        const entityId = cacheKey.substring(cachePrefix.length);
        if (!activeEntityIds.has(entityId)) {
          if (displayObj.parent === container) {
            container.removeChild(displayObj);
          }
          this._cache.delete(cacheKey);
        }
      }
    }
  }
  
  _isEntityVisible(entityPosition, entitySize, visibleBounds) {
    if (!entitySize) {
      return entityPosition.x >= visibleBounds.minX &&
             entityPosition.x <= visibleBounds.maxX &&
             entityPosition.y >= visibleBounds.minY &&
             entityPosition.y <= visibleBounds.maxY;
    }
    
    const radius = entitySize / 2;
    return entityPosition.x + radius >= visibleBounds.minX &&
           entityPosition.x - radius <= visibleBounds.maxX &&
           entityPosition.y + radius >= visibleBounds.minY &&
           entityPosition.y - radius <= visibleBounds.maxY;
  }
  
  _createDisplayObject(appearance) {
    const graphics = new PIXI.Graphics();
    this._updateGraphics(graphics, appearance);
    return graphics;
  }
  
  _updateDisplayObject(displayObj, position, appearance) {
    displayObj.position.set(position.x, position.y);
    
    this._updateGraphics(displayObj, appearance);
  }
  
  _updateGraphics(graphics, appearance) {
    graphics.clear();
    
    const shape = appearance.shape || 'circle';
    const color = appearance.color || '#FF0000';
    const size = appearance.size || 50;
    
    if (shape === 'circle') {
      graphics.circle(0, 0, size / 2).fill(color);
    } else if (shape === 'rect') {
      graphics.rect(-size / 2, -size / 2, size, size).fill(color);
    }
  }
  
  clearCameraCache(cameraId) {
    const cachePrefix = `${cameraId}::`;
    
    for (const [cacheKey, displayObj] of this._cache) {
      if (cacheKey.startsWith(cachePrefix)) {
        displayObj.destroy({ children: true });
        this._cache.delete(cacheKey);
      }
    }
  }
  
  _clearAllCache() {
    for (const displayObj of this._cache.values()) {
      displayObj.destroy({ children: true });
    }
    this._cache.clear();
  }
  
  getCacheSize() {
    return this._cache.size;
  }
}
