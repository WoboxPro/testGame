/**
 * 🎨 EntityRenderer - Управляет рендерингом сущностей для всех камер
 */

import * as PIXI from 'pixi.js';

export class EntityRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this._cache = new Map();
    this._collisionBoundsCache = new Map(); // Кеш для границ коллизии
    this._slotsCache = new Map(); // Кеш для визуализации слотов
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
      const animations = components.get('animations');

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

      const entityScale = entityRef?.scale || { x: 1, y: 1 };

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

        // Remove slots graphics
        const slotsKey = `${cachePrefix}slots::${entityId}`;
        const slotsGraphics = this._slotsCache.get(slotsKey);
        if (slotsGraphics && slotsGraphics.parent === container) {
          container.removeChild(slotsGraphics);
        }

        continue;
      }

      activeEntityIds.add(entityId);

      // Рендеринг основной сущности
      const cacheKey = `${cachePrefix}${entityId}`;
      let displayObj = this._cache.get(cacheKey);

      if (!displayObj) {
        displayObj = this._createDisplayObject(appearance, world, animations);
        this._cache.set(cacheKey, displayObj);
      }

      this._updateDisplayObject(displayObj, position, appearance, rotation, entityScale, world, animations);

      if (displayObj.parent !== container) {
        container.addChild(displayObj);
      }

      // Рендеринг границ коллизии (если включено)
      this._renderCollisionBounds(camera, entityId, components, container);

      // Рендеринг слотов (если включено)
      this._renderSlots(camera, entityId, components, container);
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

    // Очистка неактивных слотов
    for (const [slotsKey, slotsGraphics] of this._slotsCache) {
      if (slotsKey.startsWith(cachePrefix + 'slots::')) {
        const entityId = slotsKey.substring((cachePrefix + 'slots::').length);
        if (!activeEntityIds.has(entityId)) {
          if (slotsGraphics.parent === container) {
            container.removeChild(slotsGraphics);
          }
          slotsGraphics.destroy({ children: true });
          this._slotsCache.delete(slotsKey);
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
  
  _createDisplayObject(appearance, world, animations) {
    const shape = appearance.shape || 'circle';

    if (shape === 'sprite' && appearance.textureUrl) {
      // Если есть анимации - создаем обычный sprite, текстура будет меняться в update
      const sprite = new PIXI.Sprite(PIXI.Texture.from(appearance.textureUrl));
      sprite.anchor.set(0.5);
      return sprite;
    }

    const graphics = new PIXI.Graphics();
    this._updateGraphics(graphics, appearance);
    return graphics;
  }

  _updateDisplayObject(displayObj, position, appearance, rotation = 0, entityScale = { x: 1, y: 1 }, world, animations) {
    displayObj.position.set(position.x, position.y);
    displayObj.rotation = Number(rotation) || 0;
    displayObj.scale.set(Number(entityScale.x) || 1, Number(entityScale.y) || 1);

    if (displayObj instanceof PIXI.Sprite) {
      this._updateSprite(displayObj, appearance, entityScale, world, animations);
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

  _updateSprite(sprite, appearance, entityScale, world, animations) {
    // Обновляем текстуру если она изменилась
    if (appearance.textureUrl && sprite.texture.url !== appearance.textureUrl) {
      sprite.texture = PIXI.Texture.from(appearance.textureUrl);
    }

    // Применяем appearance.scale как базовый масштаб, затем entity.scale
    const baseScale = Number(appearance.scale) || 1;
    const scaleX = baseScale * (Number(entityScale.x) || 1);
    const scaleY = baseScale * (Number(entityScale.y) || 1);

    // Обновляем размеры
    if (appearance.width) {
      sprite.width = appearance.width;
    }
    if (appearance.height) {
      sprite.height = appearance.height;
    }

    sprite.scale.set(scaleX, scaleY);
    if (appearance.tint) {
      sprite.tint = appearance.tint;
    }

    // 🎬 Обновляем анимацию (только если включены и загружен spritesheet)
    if (animations && animations.enabled && animations.spritesheetUrl && world?.animationSystem) {
      // Если spritesheet еще не загружен, пропускаем
      if (world.animationSystem.isLoaded(animations.spritesheetUrl)) {
        this._updateAnimatedSprite(sprite, animations, world.animationSystem);
      }
    } else {
      // Если анимации выключены, обновляем обычный спрайт
      if (appearance.textureUrl && sprite.texture.url !== appearance.textureUrl) {
        sprite.texture = PIXI.Texture.from(appearance.textureUrl);
      }
    }

    sprite.anchor.set(0.5);
  }

  /**
   * 🎬 Обновить текстуру анимированного спрайта
   */
  _updateAnimatedSprite(sprite, animations, animationSystem) {
    // Проверяем, загружен ли spritesheet
    if (!animationSystem.isLoaded(animations.spritesheetUrl)) {
      return;
    }

    // Получаем текущий кадр из AnimationSystem
    const currentFrameIndex = animations.currentFrameIndex;
    const currentState = animations.currentState;

    // Получаем конфигурацию анимации
    const animConfig = animationSystem.getAnimationConfig(animations.spritesheetUrl, currentState);

    if (!animConfig || !animConfig.frames) {
      return;
    }

    // Получаем имя текущего кадра
    const currentFrameName = animConfig.frames[currentFrameIndex];

    // Получаем текстуру кадра
    const frameTexture = animationSystem.getFrameTexture(animations.spritesheetUrl, currentFrameName);

    // Обновляем текстуру если она изменилась
    if (frameTexture && sprite.texture !== frameTexture) {
      sprite.texture = frameTexture;
    }
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

  _renderSlots(camera, entityId, components, container) {
    const entityRef = components.get('_entityRef');
    const position = components.get('position');
    const rotationComp = components.get('rotation');

    // Проверяем наличие слотов на entityRef
    const slots = entityRef?.slots;
    if (!slots || slots.length === 0) {
      // Если нет слотов - удаляем графику если есть
      const slotsKey = `${camera.id}::slots::${entityId}`;
      const slotsGraphics = this._slotsCache.get(slotsKey);
      if (slotsGraphics && slotsGraphics.parent === container) {
        container.removeChild(slotsGraphics);
      }
      return;
    }

    // Rotation can be stored as:
    // - number (radians)
    // - { value: number }
    // - or on a linked _entityRef
    const rotation =
      rotationComp != null
        ? (typeof rotationComp === 'number'
            ? rotationComp
            : (Number(rotationComp?.value) || 0))
        : (Number(entityRef?.rotation) || 0);

    const slotsKey = `${camera.id}::slots::${entityId}`;
    let slotsGraphics = this._slotsCache.get(slotsKey);

    if (!slotsGraphics) {
      slotsGraphics = new PIXI.Graphics();
      this._slotsCache.set(slotsKey, slotsGraphics);
    }

    // Очистка и перерисовка
    slotsGraphics.clear();

    // Отрисовываем только слоты с visualEnabled=true
    for (const slot of slots) {
      if (!slot.visualEnabled) continue;

      const offset = slot.offset || { x: 0, y: 0 };
      const slotColor = slot.color || '#00FFFF';

      // Вычисляем позицию слота
      let slotX, slotY;

      if (slot.transformBehavior === 'follow_entity') {
        // Слот двигается вместе с сущностью (применяем поворот)
        slotX = offset.x * Math.cos(rotation) - offset.y * Math.sin(rotation);
        slotY = offset.x * Math.sin(rotation) + offset.y * Math.cos(rotation);
      } else {
        // Статичный слот (не поворачивается)
        slotX = offset.x;
        slotY = offset.y;
      }

      // Рисуем точку слота (маленький круг)
      const dotSize = 4;
      const dotColor = parseInt(slotColor.replace('#', ''), 16);

      slotsGraphics
        .circle(slotX, slotY, dotSize)
        .stroke({
          width: 2,
          color: dotColor,
          alpha: 0.9
        });
    }

    // Позиционируем slots graphics на позицию сущности
    slotsGraphics.position.set(position.x, position.y);

    // Добавляем в контейнер если еще не добавлен
    if (slotsGraphics.parent !== container) {
      container.addChild(slotsGraphics);
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

    // Очистка кеша коллизий
    for (const [boundsKey, boundsGraphics] of this._collisionBoundsCache) {
      if (boundsKey.startsWith(cachePrefix + 'bounds::')) {
        boundsGraphics.destroy({ children: true });
        this._collisionBoundsCache.delete(boundsKey);
      }
    }

    // Очистка кеша слотов
    for (const [slotsKey, slotsGraphics] of this._slotsCache) {
      if (slotsKey.startsWith(cachePrefix + 'slots::')) {
        slotsGraphics.destroy({ children: true });
        this._slotsCache.delete(slotsKey);
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

    for (const slotsGraphics of this._slotsCache.values()) {
      slotsGraphics.destroy({ children: true });
    }
    this._slotsCache.clear();
  }
  
  getCacheSize() {
    return this._cache.size;
  }
}
