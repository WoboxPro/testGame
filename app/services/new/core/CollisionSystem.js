/**
 * 🎯 CollisionSystem - Система коллизий
 * 
 * Детектит коллизии между сущностями и вызывает события
 */

import { GAME_EVENTS } from '~/utils/EventEmitter.js';

export class CollisionSystem {
  constructor(world) {
    this.world = world;
    this.enabled = true;
    
    // 📋 Правила коллизий: какие типы с какими проверяются
    this.collisionRules = new Map(); // 'typeA:typeB' -> eventName
    
    // 🎯 Активные коллизии (для отслеживания enter/exit)
    this.activeCollisions = new Set(); // 'entityA.id:entityB.id'
    
    console.log('🎯 CollisionSystem создана');
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
    
    const entities = this.world.getAllEntities();
    const entitiesWithCollision = entities.filter(entity => entity.collision?.enabled);
    
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
    
    if (!eventName) return; // Нет правила для этих типов
    
    // Проверяем геометрическое пересечение
    const isColliding = this._detectCollision(entityA, entityB);
    const collisionKey = this._getCollisionKey(entityA, entityB);
    const wasColliding = this.activeCollisions.has(collisionKey);
    
    if (isColliding && !wasColliding) {
      // 🔥 Началась новая коллизия
      this.activeCollisions.add(collisionKey);
      this._emitCollisionEvent(`${eventName}_enter`, entityA, entityB);
      
    } else if (!isColliding && wasColliding) {
      // 🚪 Коллизия закончилась
      this.activeCollisions.delete(collisionKey);
      this._emitCollisionEvent(`${eventName}_exit`, entityA, entityB);
    }
  }
  
  /**
   * 🎯 Детекция геометрического пересечения
   */
  _detectCollision(entityA, entityB) {
    const collA = entityA.collision;
    const collB = entityB.collision;
    
    // Пока поддерживаем только circle-circle
    if (collA.form === 'circle' && collB.form === 'circle') {
      return this._circleCircleCollision(entityA, entityB);
    }
    
    return false;
  }
  
  /**
   * ⭕ Коллизия круг-круг
   */
  _circleCircleCollision(entityA, entityB) {
    const dx = entityA.x - entityB.x;
    const dy = entityA.y - entityB.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const radiusA = this._getEntityRadius(entityA);
    const radiusB = this._getEntityRadius(entityB);
    
    return distance < (radiusA + radiusB);
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
   * 📡 Вызвать событие коллизии
   */
  _emitCollisionEvent(eventName, entityA, entityB) {
    const collisionData = {
      entityA,
      entityB,
      point: {
        x: (entityA.x + entityB.x) / 2,
        y: (entityA.y + entityB.y) / 2
      },
      distance: Math.sqrt(
        (entityA.x - entityB.x) ** 2 + 
        (entityA.y - entityB.y) ** 2
      )
    };
    
    // Вызываем событие через мир
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
   * 📊 Получить информацию о системе
   */
  getInfo() {
    return {
      enabled: this.enabled,
      rulesCount: this.collisionRules.size,
      activeCollisionsCount: this.activeCollisions.size,
      rules: Array.from(this.collisionRules.entries()),
      activeCollisions: Array.from(this.activeCollisions)
    };
  }
  
  /**
   * 🧹 Уничтожить систему
   */
  destroy() {
    this.collisionRules.clear();
    this.activeCollisions.clear();
    this.world = null;
    console.log('🧹 CollisionSystem уничтожена');
  }
}
