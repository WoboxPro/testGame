/**
 * 🎯 CollisionSystem - Система коллизий с оптимизацией
 * 
 * Автоматически переключается между O(n²) и O(n) алгоритмами
 */

import { GAME_EVENTS } from '~/utils/EventEmitter.js';

/**
 * 🗂️ SpatialGrid - Пространственная сетка для оптимизации коллизий
 */
class SpatialGrid {
  constructor(cellSize = 100, worldWidth = 2000, worldHeight = 2000) {
    this.cellSize = cellSize;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    
    // Количество ячеек по осям
    this.cols = Math.ceil(worldWidth / cellSize);
    this.rows = Math.ceil(worldHeight / cellSize);
    
    // Сетка ячеек: Map<cellKey, Set<entityId>>
    this.grid = new Map();
    
    // Кеш для быстрого поиска: Map<entityId, Set<cellKey>>
    this.entityCells = new Map();
    
    console.log(`🗂️ SpatialGrid создана: ${this.cols}x${this.rows} ячеек по ${cellSize}px`);
  }
  
  /**
   * 📍 Получить ключ ячейки по координатам
   */
  _getCellKey(x, y) {
    const col = Math.floor(x / this.cellSize);
    const row = Math.floor(y / this.cellSize);
    return `${col}:${row}`;
  }
  
  /**
   * 📍 Получить все ячейки, которые занимает сущность
   */
  _getEntityCells(entity) {
    const cells = new Set();
    
    // Получаем границы сущности
    let minX, maxX, minY, maxY;
    
    if (entity.collision?.form === 'circle') {
      const radius = this._getEntityRadius(entity);
      minX = entity.x - radius;
      maxX = entity.x + radius;
      minY = entity.y - radius;
      maxY = entity.y + radius;
    } else {
      const rect = this._getEntityRect(entity);
      minX = entity.x - rect.width / 2;
      maxX = entity.x + rect.width / 2;
      minY = entity.y - rect.height / 2;
      maxY = entity.y + rect.height / 2;
    }
    
    // Находим все ячейки в этом диапазоне
    const startCol = Math.floor(minX / this.cellSize);
    const endCol = Math.floor(maxX / this.cellSize);
    const startRow = Math.floor(minY / this.cellSize);
    const endRow = Math.floor(maxY / this.cellSize);
    
    for (let col = startCol; col <= endCol; col++) {
      for (let row = startRow; row <= endRow; row++) {
        cells.add(`${col}:${row}`);
      }
    }
    
    return cells;
  }
  
  /**
   * ➕ Добавить сущность в сетку
   */
  addEntity(entity) {
    if (!entity || !entity.id) return;
    
    const cells = this._getEntityCells(entity);
    this.entityCells.set(entity.id, cells);
    
    // Добавляем в каждую ячейку
    for (const cellKey of cells) {
      if (!this.grid.has(cellKey)) {
        this.grid.set(cellKey, new Set());
      }
      this.grid.get(cellKey).add(entity.id);
    }
  }
  
  /**
   * ➖ Удалить сущность из сетки
   */
  removeEntity(entityId) {
    const cells = this.entityCells.get(entityId);
    if (!cells) return;
    
    // Удаляем из всех ячеек
    for (const cellKey of cells) {
      const cell = this.grid.get(cellKey);
      if (cell) {
        cell.delete(entityId);
        // Удаляем пустые ячейки для экономии памяти
        if (cell.size === 0) {
          this.grid.delete(cellKey);
        }
      }
    }
    
    this.entityCells.delete(entityId);
  }
  
  /**
   * 🔄 Обновить позицию сущности
   */
  updateEntity(entity) {
    this.removeEntity(entity.id);
    this.addEntity(entity);
  }
  
  /**
   * 🔍 Получить потенциальные коллизии для сущности
   */
  getNearbyEntities(entity, allEntities) {
    const cells = this._getEntityCells(entity);
    const nearbyIds = new Set();
    
    // Собираем ID всех сущностей в соседних ячейках
    for (const cellKey of cells) {
      const cell = this.grid.get(cellKey);
      if (cell) {
        for (const entityId of cell) {
          if (entityId !== entity.id) {
            nearbyIds.add(entityId);
          }
        }
      }
    }
    
    // Преобразуем ID в объекты сущностей
    const nearby = [];
    const entityMap = new Map(allEntities.map(e => [e.id, e]));
    
    for (const entityId of nearbyIds) {
      const nearbyEntity = entityMap.get(entityId);
      if (nearbyEntity) {
        nearby.push(nearbyEntity);
      }
    }
    
    return nearby;
  }
  
  /**
   * 🧹 Очистить всю сетку
   */
  clear() {
    this.grid.clear();
    this.entityCells.clear();
  }
  
  /**
   * 📊 Получить статистику сетки
   */
  getStats() {
    const occupiedCells = this.grid.size;
    const totalEntities = this.entityCells.size;
    
    let maxEntitiesPerCell = 0;
    let totalEntitiesInCells = 0;
    
    for (const cell of this.grid.values()) {
      const cellSize = cell.size;
      maxEntitiesPerCell = Math.max(maxEntitiesPerCell, cellSize);
      totalEntitiesInCells += cellSize;
    }
    
    return {
      cellSize: this.cellSize,
      totalCells: this.cols * this.rows,
      occupiedCells,
      totalEntities,
      maxEntitiesPerCell,
      avgEntitiesPerCell: occupiedCells > 0 ? totalEntitiesInCells / occupiedCells : 0
    };
  }
  
  // Вспомогательные методы (копии из CollisionSystem для независимости)
  _getEntityRadius(entity) {
    const collision = entity.collision;
    if (!collision) return entity.size || 10;
    
    if (collision.autoSize) {
      const baseSize = entity.size || entity.visual?.size || 10;
      const multiplier = collision.sizeMultiplier || 1.0;
      return baseSize * multiplier;
    }
    
    return collision.radius || entity.size || 10;
  }
  
  _getEntityRect(entity) {
    const collision = entity.collision;
    if (!collision) {
      return {
        width: entity.width || entity.size || 20,
        height: entity.height || entity.size || 20
      };
    }
    
    return {
      width: collision.width || entity.width || entity.size || 20,
      height: collision.height || entity.height || entity.size || 20
    };
  }
}

export class CollisionSystem {
  constructor(world, options = {}) {
    this.world = world;
    this.enabled = true;
    
    // 📋 Правила коллизий: какие типы с какими проверяются
    this.collisionRules = new Map(); // 'typeA:typeB' -> eventName
    
    // 🎯 Активные коллизии (для отслеживания enter/exit)
    this.activeCollisions = new Set(); // 'entityA.id:entityB.id'
    
    // 🗂️ Пространственная сетка для оптимизации
    this.spatialGrid = new SpatialGrid(
      options.cellSize || 100,
      options.worldWidth || 2000,
      options.worldHeight || 2000
    );
    
    // ⚙️ Настройки оптимизации
    this.useOptimization = options.useOptimization !== false; // по умолчанию включено
    this.optimizationThreshold = options.optimizationThreshold || 50; // при каком количестве объектов включать
    
    // 📊 Статистика производительности
    this.performanceStats = {
      totalChecks: 0,
      optimizedChecks: 0,
      lastCheckTime: 0,
      avgCheckTime: 0
    };
    
    // ⚔️ Защита от дублирования урона
    this.lastDamageFrame = new Map();
    this._calledFromEntityController = false;
    
    // ⏱️ Кулдаун урона для block↔block пар (мс)
    this.blockDamageCooldownMs = options.blockDamageCooldownMs ?? 300;
    this.lastDamageAt = new Map();
    
    // ⏱️ Игровое время (мс), тикает с dt — зависит от timeScale
    this.gameTimeMs = 0;
    
    // 🔗 Минимальная чистка активных коллизий при смерти сущности
    if (this.world?.on) {
      this.world.on('entity_death', ({ entity }) => {
        if (entity?.id) {
          this._clearPairsForEntity(entity.id);
        }
      });
    }
    
    console.log('🎯 CollisionSystem создана с оптимизацией:', this.useOptimization);
  }

  /**
   * ⏱️ Продвинуть игровое время (мс)
   */
  advanceTime(dtMs) {
    const dt = typeof dtMs === 'number' && isFinite(dtMs) ? dtMs : 0;
    if (dt > 0) this.gameTimeMs += dt;
  }
  
  /**
   * 📝 Добавить правило коллизии между типами
   */
  addRule(typeA, typeB, eventName) {
    const ruleKey = this._getRuleKey(typeA, typeB);
    this.collisionRules.set(ruleKey, eventName);
    
    console.log(`📝 Добавлено правило коллизии: ${typeA} ↔ ${typeB} → ${eventName}`);
  }
  
  /**
   * 🔍 Проверить все коллизии в мире
   */
  checkCollisions() {
    if (!this.enabled) return;
    
    const startTime = performance.now();
    
    const entities = this.world.getAllEntities();
    const entitiesWithCollision = entities.filter(entity => 
      entity.collision?.enabled && !entity.isDead // 💀 Мертвые сущности не участвуют в коллизиях
    );
    
    // Определяем нужна ли оптимизация
    const shouldOptimize = this.useOptimization && 
                          entitiesWithCollision.length >= this.optimizationThreshold;
    
    if (shouldOptimize) {
      this._checkCollisionsOptimized(entitiesWithCollision);
      this.performanceStats.optimizedChecks++;
    } else {
      this._checkCollisionsBruteForce(entitiesWithCollision);
    }
    
    // Обновляем статистику
    const endTime = performance.now();
    this.performanceStats.lastCheckTime = endTime - startTime;
    this.performanceStats.totalChecks++;
    
    // Скользящее среднее времени проверки
    const alpha = 0.1; // фактор сглаживания
    this.performanceStats.avgCheckTime = 
      this.performanceStats.avgCheckTime * (1 - alpha) + 
      this.performanceStats.lastCheckTime * alpha;
  }
  
  /**
   * 🚀 Оптимизированная проверка коллизий через пространственную сетку
   */
  _checkCollisionsOptimized(entitiesWithCollision) {
    // Очищаем и заполняем сетку
    this.spatialGrid.clear();
    for (const entity of entitiesWithCollision) {
      this.spatialGrid.addEntity(entity);
    }
    
    // Проверяем коллизии только для близких объектов
    const checkedPairs = new Set();
    
    for (const entity of entitiesWithCollision) {
      const nearbyEntities = this.spatialGrid.getNearbyEntities(entity, entitiesWithCollision);
      
      for (const nearbyEntity of nearbyEntities) {
        // Избегаем дублирования проверок
        const pairKey = entity.id <= nearbyEntity.id ? 
          `${entity.id}:${nearbyEntity.id}` : 
          `${nearbyEntity.id}:${entity.id}`;
          
        if (!checkedPairs.has(pairKey)) {
          checkedPairs.add(pairKey);
          this._checkEntityPair(entity, nearbyEntity);
        }
      }
    }
  }
  
  /**
   * 🐌 Проверка коллизий перебором (для малого количества объектов)
   */
  _checkCollisionsBruteForce(entitiesWithCollision) {
    // Проверяем каждую пару сущностей
    for (let i = 0; i < entitiesWithCollision.length; i++) {
      for (let j = i + 1; j < entitiesWithCollision.length; j++) {
        const entityA = entitiesWithCollision[i];
        const entityB = entitiesWithCollision[j];
        
        this._checkEntityPair(entityA, entityB);
      }
    }
  }
  
  /**
   * 🔍 Проверить коллизию между двумя сущностями
   */
  _checkEntityPair(entityA, entityB) {
    const ruleKey = this._getRuleKey(entityA.collision.name, entityB.collision.name);
    const eventName = this.collisionRules.get(ruleKey);
    
    if (!eventName) return;
    
    const result = this._detectCollision(entityA, entityB);
    const collisionKey = this._getCollisionKey(entityA, entityB);
    const wasColliding = this.activeCollisions.has(collisionKey);
    
    if (result.colliding && !wasColliding) {
      // Фиксируем активную коллизию при первом входе,
      // чтобы enter/урон не срабатывали каждый кадр при удержании контакта
      this.activeCollisions.add(collisionKey);
      this._emitCollisionEvent(`${eventName}_enter`, entityA, entityB, result);
      
    } else if (!result.colliding && wasColliding) {
      // 📤 ВЫХОД из коллизии - всегда обрабатываем
      this.activeCollisions.delete(collisionKey);
      this._emitCollisionEvent(`${eventName}_exit`, entityA, entityB, result);
      console.log(`📤 ВЫХОД ИЗ КОЛЛИЗИИ: ${entityA.name} ↔ ${entityB.name}`);
    }
  }
  
  /**
   * ⚡ Мгновенная проверка коллизий для одной сущности (вызывается после движения)
   */
  _checkEntityPairImmediate(movedEntity) {
    if (!movedEntity.collision?.enabled || movedEntity.isDead) return;
    
    console.log(`⚡ МГНОВЕННАЯ ПРОВЕРКА для ${movedEntity.name}`);
    
    const entities = this.world.getAllEntities();
    const entitiesWithCollision = entities.filter(entity => 
      entity.collision?.enabled && 
      !entity.isDead &&
      entity.id !== movedEntity.id // Исключаем саму движущуюся сущность
    );
    
    console.log(`🔍 Найдено ${entitiesWithCollision.length} сущностей для проверки`);
    
    // Проверяем коллизии только с движущейся сущностью
    for (const otherEntity of entitiesWithCollision) {
      console.log(`🔍 Проверяем ${movedEntity.name} ↔ ${otherEntity.name}`);
      this._checkEntityPair(movedEntity, otherEntity);
    }
  }
  
  /**
   * 🎯 Детекция геометрического пересечения с точками контакта
   */
  _detectCollision(entityA, entityB) {
    const collA = entityA.collision;
    const collB = entityB.collision;
    
    if (collA.form === 'circle' && collB.form === 'circle') {
      return this._circleCircleCollision(entityA, entityB);
    } else if (collA.form === 'rect' && collB.form === 'rect') {
      return this._rectRectCollision(entityA, entityB);
    } else if ((collA.form === 'circle' && collB.form === 'rect') || 
               (collA.form === 'rect' && collB.form === 'circle')) {
      return this._circleRectCollision(entityA, entityB);
    }
    
    return { colliding: false };
  }
  
  /**
   * ⭕ Коллизия круг-круг с точкой контакта
   */
  _circleCircleCollision(entityA, entityB) {
    const dx = entityB.x - entityA.x;
    const dy = entityB.y - entityA.y;
    const distSq = dx * dx + dy * dy;

    const rA = this._getEntityRadius(entityA);
    const rB = this._getEntityRadius(entityB);
    const radii = rA + rB;

    if (distSq >= radii * radii) {
      return { colliding: false };
    }

    const dist = Math.sqrt(distSq) || 0.0001;
    const nx = dx / dist;
    const ny = dy / dist;

    const px = entityA.x + nx * rA;
    const py = entityA.y + ny * rA;

    return {
      colliding: true,
      point: { x: px, y: py },
      normal: { x: -nx, y: -ny }
    };
  }
  
  /**
   * 🔲 Коллизия прямоугольник-прямоугольник с точкой контакта
   */
  _rectRectCollision(entityA, entityB) {
    const rectA = this._getEntityRect(entityA);
    const rectB = this._getEntityRect(entityB);

    const leftA = entityA.x - rectA.width / 2;
    const rightA = entityA.x + rectA.width / 2;
    const topA = entityA.y - rectA.height / 2;
    const bottomA = entityA.y + rectA.height / 2;

    const leftB = entityB.x - rectB.width / 2;
    const rightB = entityB.x + rectB.width / 2;
    const topB = entityB.y - rectB.height / 2;
    const bottomB = entityB.y + rectB.height / 2;

    if (rightA < leftB || leftA > rightB || bottomA < topB || topA > bottomB) {
      return { colliding: false };
    }

    const overlapLeft = Math.max(leftA, leftB);
    const overlapRight = Math.min(rightA, rightB);
    const overlapTop = Math.max(topA, topB);
    const overlapBottom = Math.min(bottomA, bottomB);

    const overlapWidth = overlapRight - overlapLeft;
    const overlapHeight = overlapBottom - overlapTop;

    const px = overlapLeft + overlapWidth / 2;
    const py = overlapTop + overlapHeight / 2;

    let nx = 0, ny = 0;
    if (overlapWidth < overlapHeight) {
      nx = entityA.x < entityB.x ? -1 : 1;
    } else {
      ny = entityA.y < entityB.y ? -1 : 1;
    }

    return {
      colliding: true,
      point: { x: px, y: py },
      normal: { x: nx, y: ny }
    };
  }
  
  /**
   * ⭕🔲 Коллизия круг-прямоугольник с точкой контакта
   */
  _circleRectCollision(entityA, entityB) {
    const circle = entityA.collision.form === 'circle' ? entityA : entityB;
    const rect = entityA.collision.form === 'rect' ? entityA : entityB;

    const radius = this._getEntityRadius(circle);
    const rectData = this._getEntityRect(rect);

    const closestX = Math.max(
      rect.x - rectData.width / 2,
      Math.min(circle.x, rect.x + rectData.width / 2)
    );
    const closestY = Math.max(
      rect.y - rectData.height / 2,
      Math.min(circle.y, rect.y + rectData.height / 2)
    );

    const dx = circle.x - closestX;
    const dy = circle.y - closestY;
    const distSq = dx * dx + dy * dy;

    if (distSq >= radius * radius) {
      return { colliding: false };
    }

    const dist = Math.sqrt(distSq) || 0.0001;
    const nx = dx / dist;
    const ny = dy / dist;

    return {
      colliding: true,
      point: { x: closestX, y: closestY },
      normal: { x: nx, y: ny }
    };
  }
  
  /**
   * 📏 Получить радиус сущности (с поддержкой autoSize)
   */
  _getEntityRadius(entity) {
    const collision = entity.collision;
    if (!collision) return entity.size || 10;
    
    // 🎯 НОВИНКА: Автоматический размер от entity.size
    if (collision.autoSize) {
      const baseSize = entity.size || entity.visual?.size || 10;
      const multiplier = collision.sizeMultiplier || 1.0;
      return baseSize * multiplier;
    }
    
    // Обычный режим - используем заданный радиус
    return collision.radius || entity.size || 10;
  }
  
  /**
   * 🔲 Получить размеры прямоугольника сущности
   */
  _getEntityRect(entity) {
    const collision = entity.collision;
    if (!collision) {
      // Если нет коллизии, используем размеры сущности
      return {
        width: entity.width || entity.size || 20,
        height: entity.height || entity.size || 20
      };
    }
    
    return {
      width: collision.width || entity.width || entity.size || 20,
      height: collision.height || entity.height || entity.size || 20
    };
  }
  
  /**
   * 📡 Вызвать событие коллизии с данными контакта
   */
  _emitCollisionEvent(eventName, entityA, entityB, result) {
    const collisionData = {
      entityA,
      entityB,
      point: result?.point || { x: (entityA.x + entityB.x) / 2, y: (entityA.y + entityB.y) / 2 },
      normal: result?.normal || { x: 0, y: 0 },
      distance: Math.sqrt((entityA.x - entityB.x) ** 2 + (entityA.y - entityB.y) ** 2)
    };
    
    this.world.emit(eventName, collisionData);
    
    // ⚔️ АВТОМАТИКА: если одна из сущностей — пуля (projectile trigger), обрабатываем логику попадания
    if (eventName.endsWith('_enter') && !this._calledFromEntityController) {
      const aIsProjectile = entityA.collision?.name === 'projectile';
      const bIsProjectile = entityB.collision?.name === 'projectile';
      if (aIsProjectile || bIsProjectile) {
        const bullet = aIsProjectile ? entityA : entityB;
        const target = aIsProjectile ? entityB : entityA;
        this._handleProjectileHit(bullet, target);
      } else {
        this._checkCombatDamage(entityA, entityB);
      }
    }
  }
  
  /**
   * ⚔️ Проверить и нанести урон между сущностями на основе фракций
   */
  _checkCombatDamage(entityA, entityB) {
    // 🛡️ Защита от дублирования урона (например из EntityController и CollisionSystem)
    const damageKey = entityA.id <= entityB.id ? `${entityA.id}:${entityB.id}` : `${entityB.id}:${entityA.id}`;
    const currentFrame = Date.now();
    
    if (!this.lastDamageFrame) this.lastDamageFrame = new Map();
    
    // Если урон уже был нанесен в этом фрейме - пропускаем
    if (this.lastDamageFrame.get(damageKey) === currentFrame) {
      return;
    }
    
    this.lastDamageFrame.set(damageKey, currentFrame);
    
    // Проверяем урон A → B
    this._applyCombatDamage(entityA, entityB);
    
    // Проверяем урон B → A  
    this._applyCombatDamage(entityB, entityA);
  }
  
  /**
   * ⚔️ Нанести урон от атакующего к цели
   */
  _applyCombatDamage(attacker, target) {
    // Проверяем есть ли у атакующего урон при касании
    const damage = attacker.stats?.getTouchDamage();
    if (!damage || damage <= 0) return;
    
    // Проверяем может ли цель получать урон
    if (!target.stats) return;
    
    // ⏱️ Кулдаун для block↔block: урон не чаще, чем раз в blockDamageCooldownMs
    const typeA = attacker.collision?.collisionType || 'block';
    const typeB = target.collision?.collisionType || 'block';
    if (typeA === 'block' && typeB === 'block' && this.blockDamageCooldownMs > 0) {
      const pairKey = attacker.id <= target.id ? `${attacker.id}:${target.id}` : `${target.id}:${attacker.id}`;
      const now = this.gameTimeMs;
      const lastAt = this.lastDamageAt.get(pairKey) ?? -Infinity;
      if (now - lastAt < this.blockDamageCooldownMs) {
        return;
      }
      this.lastDamageAt.set(pairKey, now);
    }
    
    // 🏛️ ФРАКЦИОННАЯ ЛОГИКА:
    const factionSystem = this.world.factionSystem;
    if (!factionSystem) {
      // Если нет системы фракций - наносим урон всем
      this._dealDamage(attacker, target, damage, 'без системы фракций');
      return;
    }
    
    const attackerFaction = factionSystem.getEntityFaction(attacker);
    const targetFaction = factionSystem.getEntityFaction(target);
    
    // 🪤 Нет фракции у атакующего = наносит урон всем (ловушки)
    if (!attackerFaction) {
      this._dealDamage(attacker, target, damage, 'нейтральный (наносит урон всем)');
      return;
    }
    
    // 🏛️ Проверяем может ли атаковать согласно фракциям
    if (factionSystem.canEntityAttack(attacker, target)) {
      this._dealDamage(attacker, target, damage, `враждебная фракция`);
    } else {
      console.log(`🛡️ ${target.name} защищен от ${attacker.name} (союзная фракция)`);
    }
  }

  /**
   * 💥 Обработка попадания пули по цели
   */
  _handleProjectileHit(bullet, target) {
    const c = bullet.combat;
    if (!c) return;
    // Срок/дистанция прошли — игнор
    if (c.ttlMs != null && c.ttlMs <= 0) return;
    if (c.rangeLeft != null && c.rangeLeft <= 0) return;

    // Дружественный огонь
    if (c.friendlyFire === false && this.world?.factionSystem) {
      const shooterEntity = this.world.getEntity(c.ownership?.entityId);
      if (shooterEntity && !this.world.factionSystem.canEntityAttack(shooterEntity, target)) {
        return;
      }
    }

    // Классификация цели: по collision.name и type
    const targetTags = new Set();
    if (target.collision?.name) targetTags.add(target.collision.name);
    if (target.type) targetTags.add(target.type);

    const vt = c.validTargets || {};
    const blocks = new Set(vt.block || []);
    const hits = new Set(vt.hit || []);

    const intersects = (set) => {
      for (const t of targetTags) if (set.has(t)) return true;
      return false;
    };

    if (intersects(blocks)) {
      // Блок: пуля останавливается всегда
      this.world.removeEntity(bullet.id);
      return;
    }

    if (intersects(hits)) {
      const dmg = Number(c.damage) || 0;
      // 🏳️ Если у цели нет фракции и хотим считать её нейтральной, можно пропустить урон,
      // но по текущей логике (без фракций) урон наносится всем hit-целям.
      if (dmg > 0 && target.stats) {
        target.stats.takeDamage(dmg, target);
      }
      // Пробитие: уменьшаем счетчик и либо удаляем пулю, либо даем лететь дальше
      const penLeft = (typeof c.penetration === 'number') ? c.penetration : 0;
      if (penLeft <= 0) {
        this.world.removeEntity(bullet.id);
        return;
      }
      // Сохранить уменьшенное пробитие на пуле
      c.penetration = penLeft - 1;
      return;
    }
    // Иначе: игнор цели
  }
  
  /**
   * 💥 Нанести урон цели
   */
  _dealDamage(attacker, target, damage, reason) {
    const oldHealth = target.stats.getHealth();
    const damaged = target.stats.takeDamage(damage, target);
    
    if (damaged) {
      const newHealth = target.stats.getHealth();
      console.log(`⚔️ ${attacker.name} → ${target.name}: ${damage} урона (${reason}) [${oldHealth} → ${newHealth}]`);
    }
  }
  
  /**
   * 🚫 Проверить нужно ли блокировать движение при коллизии
   */
  _checkMovementBlocking(entityA, entityB) {
    const collisionTypeA = entityA.collision?.collisionType || 'block';
    const collisionTypeB = entityB.collision?.collisionType || 'block';
    
    console.log(`🔍 ПРОВЕРКА БЛОКИРОВКИ: ${entityA.name} (${collisionTypeA}) ↔ ${entityB.name} (${collisionTypeB})`);
    
    // Блокируем движение только если ОБЕ коллизии типа 'block'
    // Триггеры (trigger) НЕ блокируют движение
    if (collisionTypeA === 'block' && collisionTypeB === 'block') {
      console.log(`🚫 АВТОБЛОК: ${entityA.name} ↔ ${entityB.name} (block + block)`);
      entityA.stopMovement();
      entityB.stopMovement();
    } else {
      console.log(`✅ НЕТ БЛОКИРОВКИ: ${entityA.name} ↔ ${entityB.name} (не все block)`);
    }
  }
  
  /**
   * 🔑 Создать ключ для правила коллизии
   */
  _getRuleKey(typeA, typeB) {
    // Сортируем чтобы 'unit:building' === 'building:unit'
    return typeA <= typeB ? `${typeA}:${typeB}` : `${typeB}:${typeA}`;
  }
  
  /**
   * 🔑 Создать ключ для активной коллизии
   */
  _getCollisionKey(entityA, entityB) {
    // Сортируем по ID чтобы избежать дублирования
    return entityA.id <= entityB.id ? 
      `${entityA.id}:${entityB.id}` : 
      `${entityB.id}:${entityA.id}`;
  }
  
  /**
   * ⚙️ Включить/выключить систему
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    console.log(`🎯 CollisionSystem ${enabled ? 'включена' : 'выключена'}`);
  }
  
  /**
   * 🧹 Очистить все активные коллизии
   */
  clearActiveCollisions() {
    this.activeCollisions.clear();
  }
  
  /**
   * 🧹 ВНУТРЕННЕЕ: убрать пары из активных коллизий и кешей урона для сущности
   * (используется только при смерти)
   */
  _clearPairsForEntity(entityId) {
    if (!entityId) return;
    const idStr = String(entityId);
    
    // Удаляем пары из activeCollisions
    for (const key of Array.from(this.activeCollisions)) {
      const [a, b] = key.split(':');
      if (a === idStr || b === idStr) {
        this.activeCollisions.delete(key);
      }
    }
    
    // Чистим кеши урона
    if (this.lastDamageAt) {
      for (const key of Array.from(this.lastDamageAt.keys())) {
        const [a, b] = key.split(':');
        if (a === idStr || b === idStr) {
          this.lastDamageAt.delete(key);
        }
      }
    }
    if (this.lastDamageFrame) {
      for (const key of Array.from(this.lastDamageFrame.keys())) {
        const [a, b] = key.split(':');
        if (a === idStr || b === idStr) {
          this.lastDamageFrame.delete(key);
        }
      }
    }
  }
  
  /**
   * ⚙️ Настроить параметры оптимизации
   */
  setOptimizationSettings(settings = {}) {
    if (settings.useOptimization !== undefined) {
      this.useOptimization = settings.useOptimization;
    }
    if (settings.optimizationThreshold !== undefined) {
      this.optimizationThreshold = settings.optimizationThreshold;
    }
    if (settings.cellSize !== undefined) {
      // Пересоздаем сетку с новым размером ячеек
      const { worldWidth, worldHeight } = this.spatialGrid;
      this.spatialGrid = new SpatialGrid(settings.cellSize, worldWidth, worldHeight);
    }
    
    console.log('⚙️ Настройки оптимизации обновлены:', {
      useOptimization: this.useOptimization,
      optimizationThreshold: this.optimizationThreshold,
      cellSize: this.spatialGrid.cellSize
    });
  }
  
  /**
   * 📊 Получить информацию о системе
   */
  getInfo() {
    const spatialStats = this.spatialGrid.getStats();
    
    return {
      enabled: this.enabled,
      rulesCount: this.collisionRules.size,
      activeCollisionsCount: this.activeCollisions.size,
      rules: Array.from(this.collisionRules.entries()),
      activeCollisions: Array.from(this.activeCollisions),
      
      // 🚀 Новая информация об оптимизации
      optimization: {
        enabled: this.useOptimization,
        threshold: this.optimizationThreshold,
        spatialGrid: spatialStats
      },
      
      // 📊 Статистика производительности
      performance: {
        ...this.performanceStats,
        optimizationRatio: this.performanceStats.totalChecks > 0 ? 
          this.performanceStats.optimizedChecks / this.performanceStats.totalChecks : 0
      }
    };
  }
  
  /**
   * 📈 Получить расширенную статистику производительности
   */
  getPerformanceStats() {
    const entities = this.world.getAllEntities();
    const entitiesWithCollision = entities.filter(entity => entity.collision?.enabled);
    
    // Оценка количества проверок для разных алгоритмов
    const n = entitiesWithCollision.length;
    const bruteForceChecks = (n * (n - 1)) / 2;
    
    // Оценка для оптимизированного алгоритма
    const spatialStats = this.spatialGrid.getStats();
    const estimatedOptimizedChecks = spatialStats.totalEntities * spatialStats.avgEntitiesPerCell;
    
    return {
      currentEntities: n,
      currentMethod: n >= this.optimizationThreshold && this.useOptimization ? 'optimized' : 'brute-force',
      
      bruteForceChecks,
      estimatedOptimizedChecks,
      potentialSpeedup: bruteForceChecks > 0 ? bruteForceChecks / Math.max(estimatedOptimizedChecks, 1) : 1,
      
      timing: {
        lastCheckTime: this.performanceStats.lastCheckTime,
        avgCheckTime: this.performanceStats.avgCheckTime,
        totalChecks: this.performanceStats.totalChecks,
        optimizedChecks: this.performanceStats.optimizedChecks
      },
      
      spatialGrid: spatialStats
    };
  }
  
  /**
   * 🧹 Уничтожить систему
   */
  destroy() {
    this.collisionRules.clear();
    this.activeCollisions.clear();
    this.spatialGrid.clear();
    this.spatialGrid = null;
    this.world = null;
    console.log('🧹 CollisionSystem уничтожена');
  }
}
