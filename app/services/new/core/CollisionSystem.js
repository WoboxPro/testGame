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
    
    console.log('🎯 CollisionSystem создана с оптимизацией:', this.useOptimization);
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
    const entitiesWithCollision = entities.filter(entity => entity.collision?.enabled);
    
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
      this.activeCollisions.add(collisionKey);
      this._emitCollisionEvent(`${eventName}_enter`, entityA, entityB, result);
      
    } else if (!result.colliding && wasColliding) {
      this.activeCollisions.delete(collisionKey);
      this._emitCollisionEvent(`${eventName}_exit`, entityA, entityB, result);
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
