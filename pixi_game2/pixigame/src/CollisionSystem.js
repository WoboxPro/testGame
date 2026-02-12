/**
 * 🎯 CollisionSystem - Система коллизий для ECS
 *
 * Поддерживает:
 * - Типы коллизий (unit, build, ...)
 * - Матрицу отношений между типами
 * - Режимы: block, trigger
 * - Формы: circle, rect
 */

export class CollisionSystem {
  constructor(world, options = {}) {
    this.world = world;
    this.enabled = options.enabled !== false;
    // Small slop to reduce jitter when resolving overlap
    this.separationSlop = Number.isFinite(options.separationSlop) ? options.separationSlop : 0.001;

    // 📋 Типы коллизий
    this.collisionTypes = {
      unit: {
        name: 'Unit',
        description: 'Юниты - персонажи, мобы',
        defaultShape: 'circle'
      },
      build: {
        name: 'Build',
        description: 'Здания, стены, препятствия',
        defaultShape: 'rect'
      },
      projectile: {
        name: 'Projectile',
        description: 'Снаряды, пули',
        defaultShape: 'point'
      }
    };

    // 🎯 Матрица отношений между типами
    this.collisionMatrix = {
      unit: {
        build: { block: true, trigger: true },
        unit: { block: false, trigger: true }
      },
      projectile: {
        unit: { block: false, trigger: true },
        build: { block: true, trigger: false }
      }
      // build: {} - не указано = нет проверки
    };

    // 🔑 Активные коллизии (для enter/exit событий)
    this.activeCollisions = new Set(); // 'entityA_id:entityB_id'

    console.log('🎯 CollisionSystem создана');
  }

  /**
   * 📝 Добавить новый тип коллизии
   */
  addCollisionType(typeId, config) {
    this.collisionTypes[typeId] = {
      name: config.name || typeId,
      description: config.description || '',
      defaultShape: config.defaultShape || 'circle'
    };
    console.log(`📝 Добавлен тип коллизии: ${typeId}`);
  }

  /**
   * 📝 Удалить тип коллизии
   */
  removeCollisionType(typeId) {
    delete this.collisionTypes[typeId];
    // Очистить матрицу от этого типа
    if (this.collisionMatrix[typeId]) {
      delete this.collisionMatrix[typeId];
    }
    for (const type of Object.keys(this.collisionMatrix)) {
      if (this.collisionMatrix[type][typeId]) {
        delete this.collisionMatrix[type][typeId];
      }
    }
    console.log(`🗑️ Удален тип коллизии: ${typeId}`);
  }

  /**
   * 🔗 Установить отношение между типами
   */
  setCollisionRelation(typeA, typeB, modes) {
    if (!this.collisionMatrix[typeA]) {
      this.collisionMatrix[typeA] = {};
    }
    this.collisionMatrix[typeA][typeB] = modes;

    // Сортированный ключ для двунаправленного поиска
    const sortedKey = [typeA, typeB].sort().join(':');
    console.log(`🔗 Отношение: ${typeA} ↔ ${typeB} = ${JSON.stringify(modes)}`);
  }

  /**
   * 🔍 Получить отношение между двумя типами
   */
  getRelation(typeA, typeB) {
    // Проверяем в обе стороны
    if (this.collisionMatrix[typeA]?.[typeB]) {
      return this.collisionMatrix[typeA][typeB];
    }
    if (this.collisionMatrix[typeB]?.[typeA]) {
      return this.collisionMatrix[typeB][typeA];
    }
    return null; // Не указано = нет проверки
  }

  /**
   * 🎯 Проверить все коллизии в мире
   */
  checkCollisions() {
    if (!this.enabled) return;

    const entities = Array.from(this.world.entities.entries());

    // Проверяем каждую пару
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const [idA, componentsA] = entities[i];
        const [idB, componentsB] = entities[j];

        this._checkEntityPair(idA, componentsA, idB, componentsB);
      }
    }
  }

  /**
   * 🔍 Проверить коллизию между двумя сущностями
   */
  _checkEntityPair(idA, componentsA, idB, componentsB) {
    const collisionA = componentsA.get('collision');
    const collisionB = componentsB.get('collision');

    if (!collisionA || !collisionB) return;

    const relation = this.getRelation(collisionA.type, collisionB.type);
    if (!relation) return; // Нет отношения = нет проверки

    // Проверяем геометрическое пересечение
    const positionA = componentsA.get('position');
    const positionB = componentsB.get('position');

    if (!positionA || !positionB) return;

    const intersect = this._detectIntersection(collisionA, positionA, collisionB, positionB);
    const collisionKey = this._getCollisionKey(idA, idB);
    const wasColliding = this.activeCollisions.has(collisionKey);

    if (intersect) {
      if (!wasColliding) {
        // ENTER в коллизию
        this.activeCollisions.add(collisionKey);
        this._handleCollisionEnter(idA, componentsA, idB, componentsB, relation, intersect);
      } else {
        // STAY в коллизии (каждый кадр)
        this._handleCollisionStay(idA, componentsA, idB, componentsB, relation, intersect);
      }
    } else {
      if (wasColliding) {
        // EXIT из коллизии
        this.activeCollisions.delete(collisionKey);
        this._handleCollisionExit(idA, componentsA, idB, componentsB, relation);
      }
    }
  }

  /**
   * 📥 Обработка входа в коллизию
   */
  _handleCollisionEnter(idA, compA, idB, compB, relation, intersect) {
    const typeA = compA.get('collision')?.type;
    const typeB = compB.get('collision')?.type;

    // 💥 Projectile hit something
    if (typeA === 'projectile' || typeB === 'projectile') {
      const isABullet = typeA === 'projectile';
      const bulletId = isABullet ? idA : idB;
      const bulletComp = isABullet ? compA : compB;
      const targetId = isABullet ? idB : idA;
      const targetComp = isABullet ? compB : compA;
      const targetType = isABullet ? typeB : typeA;

      const bullet = bulletComp.get('_entityRef');

      console.log(`💥 BULLET HIT: ${bulletId} → ${targetId} (${targetType})`);
      console.log(`   Point: (${intersect.point.x.toFixed(1)}, ${intersect.point.y.toFixed(1)})`);

      // Call onHit callback
      if (bullet?.onHit) {
        bullet.onHit(targetComp, intersect.point, targetId);
      }

      // Remove bullet if block mode
      if (relation.block) {
        console.log(`   🚫 BLOCKED - bullet destroyed`);
        bullet?.kill('block');
        this.world.projectileSystem?.removeProjectile(bulletId);
      }
      // Trigger mode - bullet continues flying
      return;
    }

    console.log(`🎯 COLLISION ENTER: ${typeA}(${idA}) ↔ ${typeB}(${idB})`);
    console.log(`   Режим: ${JSON.stringify(relation)}`);
    console.log(`   Точка: (${intersect.point.x.toFixed(1)}, ${intersect.point.y.toFixed(1)})`);

    if (relation.trigger) {
      console.log(`   📡 TRIGGER: вызов события`);
      // TODO: emit event
    }
  }

  /**
   * 🔄 Обработка пребывания в коллизии
   */
  _handleCollisionStay(idA, compA, idB, compB, relation, intersect) {
    // Блокировка движения
    if (relation.block) {
      const posA = compA.get('position');
      const posB = compB.get('position');
      const collA = compA.get('collision');
      const collB = compB.get('collision');

      if (!posA || !posB || !collA || !collB) return;

      const mtv = this._computeMTV(collA, posA, collB, posB);
      if (!mtv) return;

      this._resolveBlock(compA, compB, mtv);
    }
  }

  /**
   * 📤 Обработка выхода из коллизии
   */
  _handleCollisionExit(idA, compA, idB, compB, relation) {
    const typeA = compA.get('collision')?.type;
    const typeB = compB.get('collision')?.type;
    console.log(`📤 COLLISION EXIT: ${typeA}(${idA}) ↔ ${typeB}(${idB})`);
  }

  /**
   * 📐 Детекция пересечения
   */
  _detectIntersection(collisionA, posA, collisionB, posB) {
    const shapeA = collisionA.shape || 'circle';
    const shapeB = collisionB.shape || 'circle';

    // Collider centers (position + optional offset)
    const cPosA = this._getColliderCenter(posA, collisionA);
    const cPosB = this._getColliderCenter(posB, collisionB);

    // Point + Point - не имеет смысла для пуль
    if (shapeA === 'point' && shapeB === 'point') {
      return null;
    }

    // Point + Circle
    if (shapeA === 'point' && shapeB === 'circle') {
      return this._pointCircle(cPosA, collisionB, cPosB);
    }
    if (shapeA === 'circle' && shapeB === 'point') {
      return this._pointCircle(cPosB, collisionA, cPosA);
    }

    // Point + Rect
    if (shapeA === 'point' && shapeB === 'rect') {
      return this._pointRect(cPosA, collisionB, cPosB);
    }
    if (shapeA === 'rect' && shapeB === 'point') {
      return this._pointRect(cPosB, collisionA, cPosA);
    }

    // Circle + Circle
    if (shapeA === 'circle' && shapeB === 'circle') {
      return this._circleCircle(collisionA, cPosA, collisionB, cPosB);
    }

    // Rect + Rect
    if (shapeA === 'rect' && shapeB === 'rect') {
      return this._rectRect(collisionA, cPosA, collisionB, cPosB);
    }

    // Circle + Rect
    const circle = shapeA === 'circle' ? { collision: collisionA, pos: cPosA } : { collision: collisionB, pos: cPosB };
    const rect = shapeA === 'rect' ? { collision: collisionA, pos: cPosA } : { collision: collisionB, pos: cPosB };
    return this._circleRect(circle.collision, circle.pos, rect.collision, rect.pos);
  }

  /**
   * ⭕ Пересечение круг-круг
   */
  _circleCircle(collA, posA, collB, posB) {
    const dx = posB.x - posA.x;
    const dy = posB.y - posA.y;
    const distSq = dx * dx + dy * dy;

    const rA = this._getRadius(collA);
    const rB = this._getRadius(collB);
    const radii = rA + rB;

    if (distSq >= radii * radii) {
      return null;
    }

    const dist = Math.sqrt(distSq) || 0.0001;
    const nx = dx / dist;
    const ny = dy / dist;

    return {
      intersect: true,
      point: {
        x: posA.x + nx * rA,
        y: posA.y + ny * rA
      },
      normal: { x: -nx, y: -ny }
    };
  }

  /**
   * 🔲 Пересечение прямоугольник-прямоугольник
   */
  _rectRect(collA, posA, collB, posB) {
    const sizeA = this._getRectSize(collA);
    const sizeB = this._getRectSize(collB);

    const leftA = posA.x - sizeA.width / 2;
    const rightA = posA.x + sizeA.width / 2;
    const topA = posA.y - sizeA.height / 2;
    const bottomA = posA.y + sizeA.height / 2;

    const leftB = posB.x - sizeB.width / 2;
    const rightB = posB.x + sizeB.width / 2;
    const topB = posB.y - sizeB.height / 2;
    const bottomB = posB.y + sizeB.height / 2;

    if (rightA < leftB || leftA > rightB || bottomA < topB || topA > bottomB) {
      return null;
    }

    // Точка контакта (центр пересечения)
    const overlapLeft = Math.max(leftA, leftB);
    const overlapRight = Math.min(rightA, rightB);
    const overlapTop = Math.max(topA, topB);
    const overlapBottom = Math.min(bottomA, bottomB);

    return {
      intersect: true,
      point: {
        x: overlapLeft + (overlapRight - overlapLeft) / 2,
        y: overlapTop + (overlapBottom - overlapTop) / 2
      }
    };
  }

  /**
   * ⭕🔲 Пересечение круг-прямоугольник
   */
  _circleRect(collCircle, posCircle, collRect, posRect) {
    const radius = this._getRadius(collCircle);
    const sizeRect = this._getRectSize(collRect);

    const closestX = Math.max(
      posRect.x - sizeRect.width / 2,
      Math.min(posCircle.x, posRect.x + sizeRect.width / 2)
    );
    const closestY = Math.max(
      posRect.y - sizeRect.height / 2,
      Math.min(posCircle.y, posRect.y + sizeRect.height / 2)
    );

    const dx = posCircle.x - closestX;
    const dy = posCircle.y - closestY;
    const distSq = dx * dx + dy * dy;

    if (distSq >= radius * radius) {
      return null;
    }

    return {
      intersect: true,
      point: { x: closestX, y: closestY }
    };
  }

  /**
   * 📍⭕ Пересечение точка-круг
   */
  _pointCircle(pointPos, circleColl, circlePos) {
    const cx = circlePos.x + (circleColl.offset?.x || 0);
    const cy = circlePos.y + (circleColl.offset?.y || 0);
    const radius = this._getRadius(circleColl);

    const dx = pointPos.x - cx;
    const dy = pointPos.y - cy;
    const distSq = dx * dx + dy * dy;

    if (distSq <= radius * radius) {
      return {
        intersect: true,
        point: { x: pointPos.x, y: pointPos.y }
      };
    }
    return null;
  }

  /**
   * 📍🔲 Пересечение точка-прямоугольник
   */
  _pointRect(pointPos, rectColl, rectPos) {
    const rx = rectPos.x + (rectColl.offset?.x || 0);
    const ry = rectPos.y + (rectColl.offset?.y || 0);
    const sizeRect = this._getRectSize(rectColl);

    const left = rx - sizeRect.width / 2;
    const right = rx + sizeRect.width / 2;
    const top = ry - sizeRect.height / 2;
    const bottom = ry + sizeRect.height / 2;

    if (pointPos.x >= left && pointPos.x <= right &&
        pointPos.y >= top && pointPos.y <= bottom) {
      return {
        intersect: true,
        point: { x: pointPos.x, y: pointPos.y }
      };
    }
    return null;
  }

  /**
   * 📌 Центр коллайдера (учитывает offset)
   */
  _getColliderCenter(position, collision) {
    const ox = Number(collision?.offset?.x) || 0;
    const oy = Number(collision?.offset?.y) || 0;
    return { x: position.x + ox, y: position.y + oy };
  }

  /**
   * 🧱 MTV (минимальный вектор раздвижения) для режима block.
   * Возвращает normal/penetration для перемещения A из B (как если бы B был статичен).
   */
  _computeMTV(collA, posA, collB, posB) {
    const shapeA = collA.shape || 'circle';
    const shapeB = collB.shape || 'circle';

    const cA = this._getColliderCenter(posA, collA);
    const cB = this._getColliderCenter(posB, collB);

    if (shapeA === 'circle' && shapeB === 'circle') {
      return this._mtvCircleCircle(collA, cA, collB, cB);
    }
    if (shapeA === 'rect' && shapeB === 'rect') {
      return this._mtvRectRect(collA, cA, collB, cB);
    }
    if (shapeA === 'circle' && shapeB === 'rect') {
      return this._mtvCircleRect(collA, cA, collB, cB);
    }
    if (shapeA === 'rect' && shapeB === 'circle') {
      // Compute MTV for moving the circle (B) out of rect (A), then invert for A.
      const mtvCircle = this._mtvCircleRect(collB, cB, collA, cA);
      if (!mtvCircle) return null;
      return {
        normal: { x: -mtvCircle.normal.x, y: -mtvCircle.normal.y },
        penetration: mtvCircle.penetration
      };
    }

    return null;
  }

  _mtvCircleCircle(collA, cA, collB, cB) {
    const rA = this._getRadius(collA);
    const rB = this._getRadius(collB);
    const dx = cB.x - cA.x;
    const dy = cB.y - cA.y;
    const distSq = dx * dx + dy * dy;
    const radii = rA + rB;
    if (distSq >= radii * radii) return null;

    const dist = Math.sqrt(distSq) || 0.0001;
    const nx = dx / dist;
    const ny = dy / dist;
    const penetration = radii - dist;

    // normal points where A should move (away from B)
    return { normal: { x: -nx, y: -ny }, penetration };
  }

  _mtvRectRect(collA, cA, collB, cB) {
    const a = this._getRectSize(collA);
    const b = this._getRectSize(collB);

    const dx = cB.x - cA.x;
    const dy = cB.y - cA.y;

    const overlapX = (a.width / 2 + b.width / 2) - Math.abs(dx);
    const overlapY = (a.height / 2 + b.height / 2) - Math.abs(dy);

    if (overlapX <= 0 || overlapY <= 0) return null;

    if (overlapX < overlapY) {
      return {
        normal: { x: dx > 0 ? -1 : 1, y: 0 },
        penetration: overlapX
      };
    }

    return {
      normal: { x: 0, y: dy > 0 ? -1 : 1 },
      penetration: overlapY
    };
  }

  _mtvCircleRect(collCircle, cCircle, collRect, cRect) {
    const r = this._getRadius(collCircle);
    const rect = this._getRectSize(collRect);
    const hx = rect.width / 2;
    const hy = rect.height / 2;

    const left = cRect.x - hx;
    const right = cRect.x + hx;
    const top = cRect.y - hy;
    const bottom = cRect.y + hy;

    const closestX = Math.max(left, Math.min(cCircle.x, right));
    const closestY = Math.max(top, Math.min(cCircle.y, bottom));
    const dx = cCircle.x - closestX;
    const dy = cCircle.y - closestY;
    const distSq = dx * dx + dy * dy;

    if (distSq >= r * r) return null;

    // Circle center inside rect: choose the nearest side and push out
    if (dx === 0 && dy === 0) {
      const toLeft = cCircle.x - left;
      const toRight = right - cCircle.x;
      const toTop = cCircle.y - top;
      const toBottom = bottom - cCircle.y;

      const min = Math.min(toLeft, toRight, toTop, toBottom);
      if (min === toLeft) return { normal: { x: -1, y: 0 }, penetration: toLeft + r };
      if (min === toRight) return { normal: { x: 1, y: 0 }, penetration: toRight + r };
      if (min === toTop) return { normal: { x: 0, y: -1 }, penetration: toTop + r };
      return { normal: { x: 0, y: 1 }, penetration: toBottom + r };
    }

    const dist = Math.sqrt(distSq) || 0.0001;
    const nx = dx / dist;
    const ny = dy / dist;
    const penetration = r - dist;

    return { normal: { x: nx, y: ny }, penetration };
  }

  _getBodyType(components) {
    const physics = components.get('physics');
    if (physics?.bodyType === 'static') return 'static';
    if (physics?.bodyType === 'dynamic') return 'dynamic';
    const coll = components.get('collision');
    // Sensible defaults for built-in types
    if (coll?.type === 'build') return 'static';
    if (coll?.type === 'unit') return 'dynamic';

    // Heuristic: entities with velocity are considered dynamic
    return components.get('velocity') ? 'dynamic' : 'static';
  }

  _resolveBlock(compA, compB, mtv) {
    const posA = compA.get('position');
    const posB = compB.get('position');
    if (!posA || !posB) return;

    const typeA = this._getBodyType(compA);
    const typeB = this._getBodyType(compB);

    const n = mtv.normal;
    const penetration = Math.max(0, mtv.penetration) + this.separationSlop;
    if (!Number.isFinite(penetration) || penetration <= 0) return;

    // How much to move each entity (A gets +n, B gets -n)
    let moveA = 0;
    let moveB = 0;

    if (typeA === 'dynamic' && typeB === 'dynamic') {
      moveA = penetration / 2;
      moveB = penetration / 2;
    } else if (typeA === 'dynamic' && typeB === 'static') {
      moveA = penetration;
      moveB = 0;
    } else if (typeA === 'static' && typeB === 'dynamic') {
      moveA = 0;
      moveB = penetration;
    } else {
      // both static
      return;
    }

    if (moveA) {
      posA.x += n.x * moveA;
      posA.y += n.y * moveA;
      const velA = compA.get('velocity');
      if (velA) this._clipVelocityAgainstNormal(velA, n);
    }

    if (moveB) {
      posB.x -= n.x * moveB;
      posB.y -= n.y * moveB;
      const velB = compB.get('velocity');
      if (velB) this._clipVelocityAgainstNormal(velB, { x: -n.x, y: -n.y });
    }
  }

  _clipVelocityAgainstNormal(velocity, normal) {
    if (!velocity) return;
    const vn = (velocity.x || 0) * normal.x + (velocity.y || 0) * normal.y;
    // If velocity points into the collision, remove that component
    if (vn < 0) {
      velocity.x -= normal.x * vn;
      velocity.y -= normal.y * vn;
    }
  }

  /**
   * 📏 Получить радиус коллизии
   * size в appearance = диаметр (как в EntityRenderer), делим на 2 для радиуса
   * scale - коэффициент масштаба (1.0 = 100%, 0.8 = 80%, 1.2 = 120%)
   */
  _getRadius(collision) {
    const baseSize = collision.size || 30;
    const scale = collision.scale || 1.0;
    return (baseSize * scale) / 2;
  }

  /**
   * 📐 Получить размеры прямоугольника
   * scale - коэффициент масштаба (1.0 = 100%, 0.8 = 80%, 1.2 = 120%)
   */
  _getRectSize(collision) {
    const scale = collision.scale || 1.0;
    return {
      width: (collision.width || 30) * scale,
      height: (collision.height || 30) * scale
    };
  }

  /**
   * 🔑 Создать ключ для пары сущностей
   */
  _getCollisionKey(idA, idB) {
    return idA <= idB ? `${idA}:${idB}` : `${idB}:${idA}`;
  }

  /**
   * ⚙️ Включить/выключить систему
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    console.log(`🎯 CollisionSystem ${enabled ? 'включена' : 'выключена'}`);
  }

  /**
   * 🧹 Очистить активные коллизии
   */
  clearActiveCollisions() {
    this.activeCollisions.clear();
  }

  /**
   * 📊 Получить информацию о системе
   */
  getInfo() {
    return {
      enabled: this.enabled,
      types: this.collisionTypes,
      matrix: this.collisionMatrix,
      activeCollisionsCount: this.activeCollisions.size
    };
  }
}
