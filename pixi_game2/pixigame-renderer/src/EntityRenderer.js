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
    this._muzzleCache = new Map(); // Кеш для визуализации muzzle
    this._visionCache = new Map(); // Кеш для визуализации vision
    this._tileGridCache = new Map(); // Кеш для визуализации тайловой сетки
  }
  
  renderEntities(camera, world, container) {
    if (!container || !world) return;

    // 📐 Рендеринг тайловой сетки (если включено)
    if (world.tileSystem && world.tileSystem.enabled && world.tileSystem.showGrid) {
      this._renderTileGrid(camera, world, container);
    }

    const cachePrefix = `${camera.id}::`;
    const visibleBounds = camera._getWorldBoundsInView();

    // 🙈 Собираем VisionEntity с hideOutOfVision для фильтрации
    const hidingVisions = this._collectHidingVisions(world);

    const activeEntityIds = new Set();

    for (const [entityId, components] of world.entities) {
      const position = components.get('position');
      const appearance = components.get('appearance');
      const rotationComp = components.get('rotation');
      const entityRef = components.get('_entityRef');
      const collision = components.get('collision');
      const animations = components.get('animations');

      // 💀 Пропускаем мертвые сущности (включая дочерние в слотах)
      if (entityRef && typeof entityRef.isEffectivelyDead === 'function' && entityRef.isEffectivelyDead(world)) {
        // Удаляем графику если была
        const cacheKey = `${cachePrefix}${entityId}`;
        const displayObj = this._cache.get(cacheKey);
        if (displayObj && displayObj.parent === container) {
          container.removeChild(displayObj);
        }
        
        // Remove all associated graphics
        const boundsKey = `${cachePrefix}bounds::${entityId}`;
        const boundsGraphics = this._collisionBoundsCache.get(boundsKey);
        if (boundsGraphics && boundsGraphics.parent === container) {
          container.removeChild(boundsGraphics);
        }
        
        const slotsKey = `${cachePrefix}slots::${entityId}`;
        const slotsGraphics = this._slotsCache.get(slotsKey);
        if (slotsGraphics && slotsGraphics.parent === container) {
          container.removeChild(slotsGraphics);
        }
        
        const muzzleKey = `${cachePrefix}muzzle::${entityId}`;
        const muzzleGraphics = this._muzzleCache.get(muzzleKey);
        if (muzzleGraphics && muzzleGraphics.parent === container) {
          container.removeChild(muzzleGraphics);
        }
        
        const visionKey = `${cachePrefix}vision::${entityId}`;
        const visionGraphics = this._visionCache.get(visionKey);
        if (visionGraphics && visionGraphics.parent === container) {
          container.removeChild(visionGraphics);
        }
        
        continue;
      }

      // 🔫 Special handling for muzzle - no appearance component required
      const isMuzzle = entityRef?.subtype === 'muzzle';

      // 👁️ Special handling for vision - no appearance component required
      const isVision = entityRef?.subtype === 'vision';

      // 🔫 Projectile handling
      const isProjectile = entityRef?.type === 'projectile';

      if (!position || (!appearance && !isMuzzle && !isVision && !isProjectile)) continue;

      // 🙈 Проверка скрытия сущности вне зоны видимости
      if (hidingVisions.length > 0 && !isMuzzle && !isVision) {
        const isGameEntity = entityRef?.type === 'game';
        // isProjectile уже определён выше
        if (isGameEntity || isProjectile) {
          const entitySubtype = isProjectile ? 'projectile' : (entityRef?.subtype || 'unit');
          if (this._isEntityHiddenByVision(entityId, entitySubtype, position, hidingVisions, world, entityRef)) {
            // Сущность скрыта - удаляем графику и пропускаем
            const cacheKey = `${cachePrefix}${entityId}`;
            const displayObj = this._cache.get(cacheKey);
            if (displayObj && displayObj.parent === container) {
              container.removeChild(displayObj);
            }
            
            const boundsKey = `${cachePrefix}bounds::${entityId}`;
            const boundsGraphics = this._collisionBoundsCache.get(boundsKey);
            if (boundsGraphics && boundsGraphics.parent === container) {
              container.removeChild(boundsGraphics);
            }
            
            const slotsKey = `${cachePrefix}slots::${entityId}`;
            const slotsGraphics = this._slotsCache.get(slotsKey);
            if (slotsGraphics && slotsGraphics.parent === container) {
              container.removeChild(slotsGraphics);
            }
            
            const muzzleKey = `${cachePrefix}muzzle::${entityId}`;
            const muzzleGraphics = this._muzzleCache.get(muzzleKey);
            if (muzzleGraphics && muzzleGraphics.parent === container) {
              container.removeChild(muzzleGraphics);
            }
            
            continue;
          }
        }
      }

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

      // 🔫 For muzzle, always consider visible (no culling based on appearance size)
      // 👁️ For vision, always consider visible (no culling based on appearance size)
      const isVisible = isMuzzle || isVision || this._isEntityVisible(
        { x: position.x, y: position.y },
        appearance?.size || 0,
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

        // Remove muzzle graphics
        const muzzleKey = `${cachePrefix}muzzle::${entityId}`;
        const muzzleGraphics = this._muzzleCache.get(muzzleKey);
        if (muzzleGraphics && muzzleGraphics.parent === container) {
          container.removeChild(muzzleGraphics);
        }

        // Remove vision graphics
        const visionKey = `${cachePrefix}vision::${entityId}`;
        const visionGraphics = this._visionCache.get(visionKey);
        if (visionGraphics && visionGraphics.parent === container) {
          container.removeChild(visionGraphics);
        }

        continue;
      }

      activeEntityIds.add(entityId);

      // 🔫 Muzzle rendering - skip appearance-based rendering
      if (isMuzzle) {
        this._renderMuzzle(camera, entityId, components, container);
        continue;
      }

      // 👁️ Vision rendering - skip appearance-based rendering
      if (isVision) {
        this._renderVision(camera, entityId, components, container, world);
        continue;
      }

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

      // Рендеринг muzzle (если это muzzle)
      this._renderMuzzle(camera, entityId, components, container);
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

    // Очистка неактивных muzzle
    for (const [muzzleKey, muzzleGraphics] of this._muzzleCache) {
      if (muzzleKey.startsWith(cachePrefix + 'muzzle::')) {
        const entityId = muzzleKey.substring((cachePrefix + 'muzzle::').length);
        if (!activeEntityIds.has(entityId)) {
          if (muzzleGraphics.parent === container) {
            container.removeChild(muzzleGraphics);
          }
          muzzleGraphics.destroy({ children: true });
          this._muzzleCache.delete(muzzleKey);
        }
      }
    }

    // Очистка неактивных vision
    for (const [visionKey, visionGraphics] of this._visionCache) {
      if (visionKey.startsWith(cachePrefix + 'vision::')) {
        const entityId = visionKey.substring((cachePrefix + 'vision::').length);
        if (!activeEntityIds.has(entityId)) {
          if (visionGraphics.parent === container) {
            container.removeChild(visionGraphics);
          }
          visionGraphics.destroy({ children: true });
          this._visionCache.delete(visionKey);
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

    // Mirror direction (для отражения слотов)
    const mirrorDirection = entityRef?.mirrorDirection || { x: 1, y: 1 };

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
        // Сначала вращаем offset
        const rotatedX = offset.x * Math.cos(rotation) - offset.y * Math.sin(rotation);
        const rotatedY = offset.x * Math.sin(rotation) + offset.y * Math.cos(rotation);

        // Затем применяем отражение (mirror)
        slotX = rotatedX * mirrorDirection.x;
        slotY = rotatedY * mirrorDirection.y;
      } else {
        // Статичный слот (не поворачивается и не отражается)
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

  /**
   * 🔫 Отрисовка muzzle (ствола) - точки и вектора направления
   */
  _renderMuzzle(camera, entityId, components, container) {
    const entityRef = components.get('_entityRef');
    const position = components.get('position');
    const rotationComp = components.get('rotation');

    // Проверяем, что это muzzle
    if (!entityRef || entityRef.subtype !== 'muzzle') {
      // Если не muzzle - удаляем графику если есть
      const muzzleKey = `${camera.id}::muzzle::${entityId}`;
      const muzzleGraphics = this._muzzleCache.get(muzzleKey);
      if (muzzleGraphics && muzzleGraphics.parent === container) {
        container.removeChild(muzzleGraphics);
      }
      return;
    }

    // Если выключена debug визуализация - не рисуем
    if (!entityRef.showDebug) {
      const muzzleKey = `${camera.id}::muzzle::${entityId}`;
      const muzzleGraphics = this._muzzleCache.get(muzzleKey);
      if (muzzleGraphics && muzzleGraphics.parent === container) {
        container.removeChild(muzzleGraphics);
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

    // Mirror direction - используем родительский mirrorDirection для attached muzzle
    // Если muzzle прикреплен к слоту, используется _parentMirrorDirection от родителя
    // Если muzzle не прикреплен (редкий случай), используется собственный mirrorDirection
    const mirrorDirectionComp = components.get('mirrorDirection');
    const mirrorDirection = mirrorDirectionComp || entityRef?.mirrorDirection || { x: 1, y: 1 };

    // Направление выстрела
    const direction = entityRef.direction || { x: 1, y: 0 };

    const muzzleKey = `${camera.id}::muzzle::${entityId}`;
    let muzzleGraphics = this._muzzleCache.get(muzzleKey);

    if (!muzzleGraphics) {
      muzzleGraphics = new PIXI.Graphics();
      this._muzzleCache.set(muzzleKey, muzzleGraphics);
    }

    // Очистка и перерисовка
    muzzleGraphics.clear();

    const debugColor = entityRef.debugColor || '#FF00FF';
    const colorInt = parseInt(debugColor.replace('#', ''), 16);

    // Режим направления muzzle
    const directionMode = entityRef.directionMode || 'relative';

    // Вычисляем направление с учетом поворота и отражения
    let dirX = direction.x;
    let dirY = direction.y;

    // Применяем rotation к direction ТОЛЬКО для relative режима
    if (directionMode === 'relative') {
      // Применяем rotation к direction
      const rotatedDirX = dirX * Math.cos(rotation) - dirY * Math.sin(rotation);
      const rotatedDirY = dirX * Math.sin(rotation) + dirY * Math.cos(rotation);

      // Применяем mirror
      dirX = rotatedDirX * mirrorDirection.x;
      dirY = rotatedDirY * mirrorDirection.y;
    }
    // Для static режима rotation НЕ применяется - direction остается как есть

    // Нормализуем направление
    const dirLength = Math.sqrt(dirX * dirX + dirY * dirY);
    if (dirLength > 0) {
      dirX /= dirLength;
      dirY /= dirLength;
    }

    // Длина вектора направления
    const vectorLength = 40;

    // Рисуем точку muzzle (круг)
    const dotSize = 6;
    muzzleGraphics
      .circle(0, 0, dotSize)
      .stroke({
        width: 2,
        color: colorInt,
        alpha: 0.9
      });

    // Рисуем стрелку направления
    const arrowEndX = dirX * vectorLength;
    const arrowEndY = dirY * vectorLength;

    // Линия направления
    muzzleGraphics
      .moveTo(0, 0)
      .lineTo(arrowEndX, arrowEndY)
      .stroke({
        width: 2,
        color: colorInt,
        alpha: 0.7
      });

    // Рисуем стрелочку на конце
    const arrowHeadSize = 8;
    const arrowAngle = Math.atan2(dirY, dirX);

    // Левая линия стрелки
    const leftX = arrowEndX - arrowHeadSize * Math.cos(arrowAngle - Math.PI / 6);
    const leftY = arrowEndY - arrowHeadSize * Math.sin(arrowAngle - Math.PI / 6);

    // Правая линия стрелки
    const rightX = arrowEndX - arrowHeadSize * Math.cos(arrowAngle + Math.PI / 6);
    const rightY = arrowEndY - arrowHeadSize * Math.sin(arrowAngle + Math.PI / 6);

    muzzleGraphics
      .moveTo(arrowEndX, arrowEndY)
      .lineTo(leftX, leftY)
      .moveTo(arrowEndX, arrowEndY)
      .lineTo(rightX, rightY)
      .stroke({
        width: 2,
        color: colorInt,
        alpha: 0.7
      });

    // ⚡ Отрисовка активных лучей raycast
    if (entityRef.fireType === 'ray' && entityRef.showRay) {
      const activeRays = entityRef.getActiveRays ? entityRef.getActiveRays() : [];
      
      for (const ray of activeRays) {
        const rayColor = ray.color || '#FF0000';
        const rayColorInt = parseInt(rayColor.replace('#', ''), 16);
        const rayThickness = ray.thickness || 3;
        
        // Преобразуем координаты луча в локальные (относительно позиции muzzle)
        const localStartX = ray.startX - position.x;
        const localStartY = ray.startY - position.y;
        const localEndX = ray.endX - position.x;
        const localEndY = ray.endY - position.y;
        
        muzzleGraphics
          .moveTo(localStartX, localStartY)
          .lineTo(localEndX, localEndY)
          .stroke({
            width: rayThickness,
            color: rayColorInt,
            alpha: 0.8
          });
      }
    }

    // Позиционируем muzzle graphics на позицию сущности
    muzzleGraphics.position.set(position.x, position.y);

    // Добавляем в контейнер если еще не добавлен
    if (muzzleGraphics.parent !== container) {
      container.addChild(muzzleGraphics);
    }
    }

  /**
   * 👁️ Отрисовка vision (обзора) - круг или сектор
   */
  _renderVision(camera, entityId, components, container, world) {
    const entityRef = components.get('_entityRef');
    const position = components.get('position');
    const rotationComp = components.get('rotation');

    if (!entityRef || entityRef.subtype !== 'vision') {
      const visionKey = `${camera.id}::vision::${entityId}`;
      const visionGraphics = this._visionCache.get(visionKey);
      if (visionGraphics && visionGraphics.parent === container) {
        container.removeChild(visionGraphics);
      }
      return;
    }

    if (!entityRef.showDebug && !entityRef.detectEntities) {
      const visionKey = `${camera.id}::vision::${entityId}`;
      const visionGraphics = this._visionCache.get(visionKey);
      if (visionGraphics && visionGraphics.parent === container) {
        container.removeChild(visionGraphics);
      }
      return;
    }

    const rotation =
      rotationComp != null
        ? (typeof rotationComp === 'number'
            ? rotationComp
            : (Number(rotationComp?.value) || 0))
        : (Number(entityRef?.rotation) || 0);

    const mirrorDirectionComp = components.get('mirrorDirection');
    const mirrorDirection = mirrorDirectionComp || entityRef?.mirrorDirection || { x: 1, y: 1 };

    const visionKey = `${camera.id}::vision::${entityId}`;
    let visionGraphics = this._visionCache.get(visionKey);

    if (!visionGraphics) {
      visionGraphics = new PIXI.Graphics();
      this._visionCache.set(visionKey, visionGraphics);
    }

    visionGraphics.clear();

    const debugColor = entityRef.debugColor || '#00FF00';
    const colorInt = parseInt(debugColor.replace('#', ''), 16);
    const range = entityRef.range || 500;
    const shape = entityRef.shape || 'arc';

    if (entityRef.showDebug) {
      if (shape === 'circle') {
        visionGraphics
          .circle(0, 0, range)
          .stroke({
            width: 2,
            color: colorInt,
            alpha: 0.4
          });
      } else {
        const fovAngle = entityRef.fovAngle || 90;
        const direction = entityRef.direction || { x: 1, y: 0 };
        const directionMode = entityRef.directionMode || 'relative';

        let dirX = direction.x;
        let dirY = direction.y;

        if (directionMode === 'relative') {
          const rotatedDirX = dirX * Math.cos(rotation) - dirY * Math.sin(rotation);
          const rotatedDirY = dirX * Math.sin(rotation) + dirY * Math.cos(rotation);
          dirX = rotatedDirX * mirrorDirection.x;
          dirY = rotatedDirY * mirrorDirection.y;
        }

        const baseAngle = Math.atan2(dirY, dirX);
        const fovRad = (fovAngle * Math.PI) / 180;
        const startAngle = baseAngle - fovRad / 2;
        const endAngle = baseAngle + fovRad / 2;

        visionGraphics
          .moveTo(0, 0)
          .arc(0, 0, range, startAngle, endAngle)
          .closePath()
          .stroke({
            width: 2,
            color: colorInt,
            alpha: 0.4
          });

        visionGraphics
          .moveTo(0, 0)
          .lineTo(range * Math.cos(startAngle), range * Math.sin(startAngle))
          .stroke({
            width: 2,
            color: colorInt,
            alpha: 0.4
          });

        visionGraphics
          .moveTo(0, 0)
          .lineTo(range * Math.cos(endAngle), range * Math.sin(endAngle))
          .stroke({
            width: 2,
            color: colorInt,
            alpha: 0.4
          });
      }
    }

    if (entityRef.detectEntities && world && position) {
      const visionX = position.x;
      const visionY = position.y;
      const detectTypes = entityRef.detectTypes || ['unit'];
      const visionRootId = entityRef._rootEntityId;
      const detectedEntities = [];

      for (const [otherEntityId, otherComponents] of world.entities) {
        if (otherEntityId === entityId) continue;

        const otherEntityRef = otherComponents.get('_entityRef');
        if (!otherEntityRef) continue;

        // Проверяем тип: game (unit, build, prop) или projectile
        const isGameEntity = otherEntityRef.type === 'game';
        const isProjectile = otherEntityRef.type === 'projectile';
        if (!isGameEntity && !isProjectile) continue;

        // Пропускаем сущности того же root (себя и свои дочерние сущности)
        if (visionRootId && otherEntityRef._rootEntityId === visionRootId) continue;

        // Определяем тип для фильтрации
        const otherSubtype = isProjectile ? 'projectile' : (otherEntityRef.subtype || 'unit');
        if (!detectTypes.includes(otherSubtype)) continue;

        const otherPosition = otherComponents.get('position');
        if (!otherPosition) continue;

        const targetX = otherPosition.x;
        const targetY = otherPosition.y;

        const inVision = entityRef.isPointInVision(
          targetX, targetY,
          visionX, visionY,
          rotation, mirrorDirection
        );

        if (inVision) {
          const dx = targetX - visionX;
          const dy = targetY - visionY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          detectedEntities.push({
            id: otherEntityId,
            type: otherSubtype,
            distance: Math.round(distance)
          });

          const localX = targetX - visionX;
          const localY = targetY - visionY;

          let markerColor;
          if (otherSubtype === 'projectile') {
            markerColor = 0xFFFF00; // жёлтый для пуль
          } else if (otherSubtype === 'unit') {
            markerColor = 0xFF0000; // красный для юнитов
          } else {
            markerColor = 0xFF8800; // оранжевый для buildings/props
          }
          const markerSize = 8;

          visionGraphics
            .circle(localX, localY, markerSize)
            .stroke({
              width: 2,
              color: markerColor,
              alpha: 0.8
            });

          visionGraphics
            .moveTo(localX - markerSize, localY)
            .lineTo(localX + markerSize, localY)
            .moveTo(localX, localY - markerSize)
            .lineTo(localX, localY + markerSize)
            .stroke({
              width: 2,
              color: markerColor,
              alpha: 0.8
            });
        }
      }

      entityRef.visibleEntities = detectedEntities;
    }

    visionGraphics.position.set(position.x, position.y);

    if (visionGraphics.parent !== container) {
      container.addChild(visionGraphics);
    }
  }

  /**
   * 📐 Отрисовка тайловой сетки
   */
  _renderTileGrid(camera, world, container) {
    const tileSystem = world.tileSystem;
    if (!tileSystem || !tileSystem.enabled || !tileSystem.showGrid) {
      // Если выключено - удаляем графику если есть
      const tileGridKey = `${camera.id}::tilegrid`;
      const tileGridGraphics = this._tileGridCache.get(tileGridKey);
      if (tileGridGraphics && tileGridGraphics.parent === container) {
        container.removeChild(tileGridGraphics);
      }
      return;
    }

    const tileGridKey = `${camera.id}::tilegrid`;
    let tileGridGraphics = this._tileGridCache.get(tileGridKey);

    if (!tileGridGraphics) {
      tileGridGraphics = new PIXI.Graphics();
      this._tileGridCache.set(tileGridKey, tileGridGraphics);
    }

    // Очистка
    tileGridGraphics.clear();

    // Получаем видимые границы
    const bounds = camera._getWorldBoundsInView();
    const tileSize = tileSystem.tileSize;
    const origin = tileSystem.origin;

    // Конвертируем цвет
    const gridColor = parseInt(tileSystem.gridColor.replace('#', ''), 16);
    const gridAlpha = tileSystem.gridAlpha || 0.3;
    const lineWidth = tileSystem.gridLineWidth || 1;

    // Вычисляем границы сетки для видимой области
    const startTileX = Math.floor((bounds.minX - origin.x) / tileSize.width);
    const startTileY = Math.floor((bounds.minY - origin.y) / tileSize.height);
    const endTileX = Math.ceil((bounds.maxX - origin.x) / tileSize.width);
    const endTileY = Math.ceil((bounds.maxY - origin.y) / tileSize.height);

    // Ограничиваем для fixed режима
    let finalStartTileX = startTileX;
    let finalStartTileY = startTileY;
    let finalEndTileX = endTileX;
    let finalEndTileY = endTileY;

    if (tileSystem.mode === 'fixed') {
      finalStartTileX = Math.max(0, startTileX);
      finalStartTileY = Math.max(0, startTileY);
      finalEndTileX = Math.min(tileSystem.size.cols, endTileX);
      finalEndTileY = Math.min(tileSystem.size.rows, endTileY);
    }

    // Рисуем вертикальные линии
    for (let tileX = finalStartTileX; tileX <= finalEndTileX; tileX++) {
      const x = origin.x + tileX * tileSize.width;
      tileGridGraphics
        .moveTo(x, bounds.minY)
        .lineTo(x, bounds.maxY)
        .stroke({
          width: lineWidth,
          color: gridColor,
          alpha: gridAlpha
        });
    }

    // Рисуем горизонтальные линии
    for (let tileY = finalStartTileY; tileY <= finalEndTileY; tileY++) {
      const y = origin.y + tileY * tileSize.height;
      tileGridGraphics
        .moveTo(bounds.minX, y)
        .lineTo(bounds.maxX, y)
        .stroke({
          width: lineWidth,
          color: gridColor,
          alpha: gridAlpha
        });
    }

    // Добавляем в контейнер если еще не добавлен
    if (tileGridGraphics.parent !== container) {
      container.addChild(tileGridGraphics);
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

    // Очистка кеша muzzle
    for (const [muzzleKey, muzzleGraphics] of this._muzzleCache) {
      if (muzzleKey.startsWith(cachePrefix + 'muzzle::')) {
        muzzleGraphics.destroy({ children: true });
        this._muzzleCache.delete(muzzleKey);
      }
    }

    // Очистка кеша vision
    for (const [visionKey, visionGraphics] of this._visionCache) {
      if (visionKey.startsWith(cachePrefix + 'vision::')) {
        visionGraphics.destroy({ children: true });
        this._visionCache.delete(visionKey);
      }
    }

    // Очистка кеша тайловой сетки
    for (const [tileGridKey, tileGridGraphics] of this._tileGridCache) {
      if (tileGridKey.startsWith(cachePrefix + 'tilegrid')) {
        tileGridGraphics.destroy({ children: true });
        this._tileGridCache.delete(tileGridKey);
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

    for (const muzzleGraphics of this._muzzleCache.values()) {
      muzzleGraphics.destroy({ children: true });
    }
    this._muzzleCache.clear();

    for (const visionGraphics of this._visionCache.values()) {
      visionGraphics.destroy({ children: true });
    }
    this._visionCache.clear();

    for (const tileGridGraphics of this._tileGridCache.values()) {
      tileGridGraphics.destroy({ children: true });
    }
    this._tileGridCache.clear();
  }

  /**
   * 🙈 Собрать все VisionEntity с включенным hideOutOfVision
   * @param {World} world
   * @returns {Array<{vision: VisionEntity, position: {x: number, y: number}, rotation: number, mirrorDirection: {x: number, y: number}, rootEntityId: string}>}
   */
  _collectHidingVisions(world) {
    const visions = [];

    for (const [entityId, components] of world.entities) {
      const entityRef = components.get('_entityRef');
      if (!entityRef || entityRef.subtype !== 'vision') continue;
      if (!entityRef.hideOutOfVision) continue;

      const position = components.get('position');
      const rotationComp = components.get('rotation');
      const mirrorDirectionComp = components.get('mirrorDirection');

      const rotation = rotationComp != null
        ? (typeof rotationComp === 'number' ? rotationComp : (Number(rotationComp?.value) || 0))
        : (Number(entityRef?.rotation) || 0);

      const mirrorDirection = mirrorDirectionComp || entityRef?.mirrorDirection || { x: 1, y: 1 };

      visions.push({
        vision: entityRef,
        position: position || { x: 0, y: 0 },
        rotation,
        mirrorDirection,
        rootEntityId: entityRef._rootEntityId
      });
    }

    return visions;
  }

  /**
   * 🙈 Проверить, скрыта ли сущность всеми VisionEntity
   * @param {string} entityId
   * @param {string} entitySubtype
   * @param {{x: number, y: number}} entityPosition
   * @param {Array} hidingVisions
   * @param {World} world
   * @param {Object} entityRef - Reference to entity для проверки _rootEntityId
   * @returns {boolean}
   */
  _isEntityHiddenByVision(entityId, entitySubtype, entityPosition, hidingVisions, world, entityRef) {
    if (hidingVisions.length === 0) return false;

    const entityRootId = entityRef?._rootEntityId;
    const isProjectile = entitySubtype === 'projectile';

    // Фильтруем visions
    const relevantVisions = hidingVisions.filter(({ vision, rootEntityId }) => {
      // Для projectile НЕ проверяем rootEntityId (скрываем даже свои пули)
      if (!isProjectile) {
        // Не скрываем себя и свои дочерние сущности (кроме projectile)
        if (rootEntityId && entityRootId && rootEntityId === entityRootId) return false;
      }
      // Проверяем тип
      return vision.hideTypes && vision.hideTypes.includes(entitySubtype);
    });
    
    if (relevantVisions.length === 0) return false;

    for (const { vision, position, rotation, mirrorDirection } of relevantVisions) {
      const inVision = vision.isPointInVision(
        entityPosition.x, entityPosition.y,
        position.x, position.y,
        rotation, mirrorDirection
      );

      if (inVision) {
        return false;
      }
    }

    return true;
  }
  
  getCacheSize() {
    return this._cache.size;
  }
}
