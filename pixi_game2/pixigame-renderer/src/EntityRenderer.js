/**
 * 🎨 EntityRenderer - Управляет рендерингом сущностей для всех камер
 */

import * as PIXI from 'pixi.js';

export class EntityRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this._cache = new Map();
    this._collisionBoundsCache = new Map(); // Кеш для границ коллизии
  }
  
  renderEntities(camera, world, container) {
    if (!container || !world) return;

    const cachePrefix = `${camera.id}::`;
    const visibleBounds = camera._getWorldBoundsInView();

    const activeEntityIds = new Set();

    for (const [entityId, components] of world.entities) {
      const position = components.get('position');
      const appearance = components.get('appearance');
      const rotationComp = components.get('rotation');
      const entityRef = components.get('_entityRef');
      const collision = components.get('collision');

      if (!position || !appearance) continue;

      // Rotation can be stored as:
      // - number (radians)
      // - { value: number }
      // - or on a linked _entityRef (e.g. /test1 editor)
      const rotation =
        rotationComp != null
          ? (typeof rotationComp === 'number'
              ? rotationComp
              : (Number(rotationComp?.value) || 0))
          : (Number(entityRef?.rotation) || 0);

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

        // Remove collision bounds graphics
        const boundsKey = `${cachePrefix}bounds::${entityId}`;
        const boundsGraphics = this._collisionBoundsCache.get(boundsKey);
        if (boundsGraphics && boundsGraphics.parent === container) {
          container.removeChild(boundsGraphics);
        }

        continue;
      }

      activeEntityIds.add(entityId);

      // Рендеринг основной сущности
      const cacheKey = `${cachePrefix}${entityId}`;
      let displayObj = this._cache.get(cacheKey);

      if (!displayObj) {
        displayObj = this._createDisplayObject(appearance);
        this._cache.set(cacheKey, displayObj);
      }

      this._updateDisplayObject(displayObj, position, appearance, rotation);

      if (displayObj.parent !== container) {
        container.addChild(displayObj);
      }

      // Рендеринг границ коллизии (если включено)
      this._renderCollisionBounds(camera, entityId, components, container);
    }

    // Очистка неактивных объектов
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

    for (const [boundsKey, boundsGraphics] of this._collisionBoundsCache) {
      if (boundsKey.startsWith(cachePrefix + 'bounds::')) {
        const entityId = boundsKey.substring((cachePrefix + 'bounds::').length);
        if (!activeEntityIds.has(entityId)) {
          if (boundsGraphics.parent === container) {
            container.removeChild(boundsGraphics);
          }
          boundsGraphics.destroy({ children: true });
          this._collisionBoundsCache.delete(boundsKey);
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
    const shape = appearance.shape || 'circle';

    if (shape === 'sprite' && appearance.textureUrl) {
      return new PIXI.Sprite(PIXI.Texture.from(appearance.textureUrl));
    }

    const graphics = new PIXI.Graphics();
    this._updateGraphics(graphics, appearance);
    return graphics;
  }

  _updateDisplayObject(displayObj, position, appearance, rotation = 0) {
    displayObj.position.set(position.x, position.y);
    displayObj.rotation = Number(rotation) || 0;

    if (displayObj instanceof PIXI.Sprite) {
      this._updateSprite(displayObj, appearance);
    } else {
      this._updateGraphics(displayObj, appearance);
    }
  }

  _updateGraphics(graphics, appearance) {
    graphics.clear();

    const shape = appearance.shape || 'circle';
    const color = appearance.color || '#FF0000';

    if (shape === 'circle') {
      const size = appearance.size || 50;
      graphics.circle(0, 0, size / 2).fill(color);
    } else if (shape === 'rect') {
      const width = appearance.width || appearance.size || 50;
      const height = appearance.height || appearance.size || 50;
      graphics.rect(-width / 2, -height / 2, width, height).fill(color);
    }
  }

  _updateSprite(sprite, appearance) {
    if (appearance.textureUrl && sprite.texture.url !== appearance.textureUrl) {
      sprite.texture = PIXI.Texture.from(appearance.textureUrl);
    }

    if (appearance.width) {
      sprite.width = appearance.width;
    }
    if (appearance.height) {
      sprite.height = appearance.height;
    }
    if (appearance.tint) {
      sprite.tint = appearance.tint;
    }
    sprite.anchor.set(0.5);
  }

  _renderCollisionBounds(camera, entityId, components, container) {
    const collision = components.get('collision');
    const position = components.get('position');

    if (!collision || !position || !collision.showBounds) {
      // Если нет коллизии или выключено отображение - удаляем bounds если есть
      const boundsKey = `${camera.id}::bounds::${entityId}`;
      const boundsGraphics = this._collisionBoundsCache.get(boundsKey);
      if (boundsGraphics && boundsGraphics.parent === container) {
        container.removeChild(boundsGraphics);
      }
      return;
    }

    const boundsKey = `${camera.id}::bounds::${entityId}`;
    let boundsGraphics = this._collisionBoundsCache.get(boundsKey);

    if (!boundsGraphics) {
      boundsGraphics = new PIXI.Graphics();
      this._collisionBoundsCache.set(boundsKey, boundsGraphics);
    }

    // Очистка и перерисовка
    boundsGraphics.clear();

    const shape = collision.shape || 'circle';
    const scale = collision.scale || 1.0;
    const offset = collision.offset || { x: 0, y: 0 };

    // Центр коллизии с учетом offset
    const centerX = offset.x;
    const centerY = offset.y;

    // Цвет обводки (обычно зелёный для коллизий)
    const boundsColor = 0x00FF00;
    const boundsLineWidth = 2;

    if (shape === 'circle') {
      const size = (collision.size || 50) * scale;
      const radius = size / 2;

      boundsGraphics
        .circle(centerX, centerY, radius)
        .stroke({
          width: boundsLineWidth,
          color: boundsColor,
          alpha: 0.8
        });
    } else if (shape === 'rect') {
      const width = (collision.width || 50) * scale;
      const height = (collision.height || 50) * scale;

      boundsGraphics
        .rect(
          centerX - width / 2,
          centerY - height / 2,
          width,
          height
        )
        .stroke({
          width: boundsLineWidth,
          color: boundsColor,
          alpha: 0.8
        });
    }

    // Позиционируем bounds graphics на позицию сущности
    boundsGraphics.position.set(position.x, position.y);

    // Добавляем в контейнер если еще не добавлен
    if (boundsGraphics.parent !== container) {
      container.addChild(boundsGraphics);
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

    for (const boundsGraphics of this._collisionBoundsCache.values()) {
      boundsGraphics.destroy({ children: true });
    }
    this._collisionBoundsCache.clear();
  }
  
  getCacheSize() {
    return this._cache.size;
  }
}
