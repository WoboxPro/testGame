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
      }
    };

    // 🎯 Матрица отношений между типами
    this.collisionMatrix = {
      unit: {
        build: { block: true, trigger: true },
        unit: { block: false, trigger: true }
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
      // TODO: реализовать блокировку движения
      // console.log(`   🚫 BLOCK: движение заблокировано`);
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

    if (shapeA === 'circle' && shapeB === 'circle') {
      return this._circleCircle(collisionA, posA, collisionB, posB);
    } else if (shapeA === 'rect' && shapeB === 'rect') {
      return this._rectRect(collisionA, posA, collisionB, posB);
    } else {
      // circle + rect
      const circle = shapeA === 'circle' ? { collision: collisionA, pos: posA } : { collision: collisionB, pos: posB };
      const rect = shapeA === 'rect' ? { collision: collisionA, pos: posA } : { collision: collisionB, pos: posB };
      return this._circleRect(circle.collision, circle.pos, rect.collision, rect.pos);
    }
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
