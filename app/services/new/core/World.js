/**
 * 🌍 World - Мир с сущностями
 * 
 * Хранит все игровые объекты в центрированной системе координат
 */

import { Entity, EntityForms, EntityFactory } from './Entity.js';
import { BiomeSystem } from './BiomeSystem.js';
import { ZoneSystem } from './ZoneSystem.js';
import { FactionSystem } from './FactionSystem.js';
import { CollisionSystem } from './CollisionSystem.js';
import { SimpleEventEmitter, GAME_EVENTS } from '~/utils/EventEmitter.js';

export class World extends SimpleEventEmitter {
  constructor(options = {}) {
    super(); // Инициализируем EventEmitter
    this.id = options.id || `world_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    this.width = options.width || 2000;
    this.height = options.height || 1500;
    this.backgroundColor = options.backgroundColor || '#0a0a0a';
    
    // 🔲 Настройки границ мира
    this.borders = {
      enabled: options.borders?.enabled !== false, // По умолчанию включены
      width: options.borders?.width || 4,          // Толщина линии
      color: options.borders?.color || 0xFF0000,   // Красный цвет
      style: options.borders?.style || 'solid',    // solid, dashed
      ...options.borders
    };
    
    // 🎯 Центрированная система координат
    this.halfWidth = this.width / 2;
    this.halfHeight = this.height / 2;
    
    this.bounds = {
      left: -this.halfWidth,
      right: this.halfWidth,
      top: -this.halfHeight,
      bottom: this.halfHeight,
    };
    
    // 📦 Хранилище сущностей
    this.entities = new Map();
    this._entityIdCounter = 1;
    
    // 🌍 Система биомов
    this.biomeSystem = new BiomeSystem(this);
    
    // 🏛️ Система зон
    this.zoneSystem = new ZoneSystem(this);
    
    // 🏛️ Система фракций
    this.factionSystem = new FactionSystem(this);
    
    // 🎯 Система коллизий с настройками оптимизации
    const collisionOptions = {
      cellSize: options.collision?.cellSize || 100,
      optimizationThreshold: options.collision?.optimizationThreshold || 50,
      useOptimization: options.collision?.useOptimization !== false,
      worldWidth: this.width,
      worldHeight: this.height,
      ...options.collision
    };
    this.collisionSystem = new CollisionSystem(this, collisionOptions);
    
    // ⏱️ Простые игровые таймеры (подчиняются dt)
    this._timers = new Set(); // {remainingMs, callback, repeat}
    
    console.log(`🌍 World создан: ${this.width}×${this.height}, центр в (0,0), границы [${this.bounds.left},${this.bounds.right}] × [${this.bounds.top},${this.bounds.bottom}]`);
    
    // 📡 Уведомляем о создании мира
    this.emit(GAME_EVENTS.WORLD_CREATED, {
      world: this,
      width: this.width,
      height: this.height,
      bounds: this.bounds
    });
    
    // 🔲 Создаем визуальные границы мира если включены
    if (this.borders.enabled) {
      this._createWorldBorders();
    }
  }
  
  /**
   * ➕ Добавить сущность в мир
   */
  addEntity(options) {
    // 🎯 Создаем Entity объект (если еще не создан)
    let entity;
    if (options instanceof Entity) {
      entity = options; // Уже Entity объект
    } else {
      entity = new Entity(options); // Создаем из опций
    }
    
    // 🌍 Устанавливаем ссылку на мир в сущности
    entity.world = this;
    
    // 📦 Добавляем в мир
    this.entities.set(entity.id, entity);
    
    // 🔗 Устанавливаем parent-child связи
    if (entity.parent) {
      const parentEntity = this.entities.get(entity.parent);
      if (parentEntity) {
        parentEntity.addChild(entity.id);
        // Обновляем позицию дочерней сущности
        const worldPos = entity.getWorldPosition();
        entity.x = worldPos.x;
        entity.y = worldPos.y;
      }
    }
    
    return entity;
  }
  
  /**
   * 🏗️ Быстро добавить структуру
   */
  addStructure(x, y, options = {}) {
    const entity = EntityFactory.createStructure(x, y, options);
    const addedEntity = this.addEntity(entity);
    
    // Если указана фракция - привязываем к ней
    if (options.faction) {
      this.factionSystem.assignEntityToFaction(addedEntity, options.faction);
    }
    
    return addedEntity;
  }
  
  /**
   * 👥 Быстро добавить юнита
   */
  addUnit(x, y, options = {}) {
    const entity = EntityFactory.createUnit(x, y, options);
    const addedEntity = this.addEntity(entity);
    
    // Копируем простые поведенческие конфиги на сущность (например, ai)
    if (options.ai) {
      addedEntity.ai = { ...options.ai };
    }

    // Если указана фракция - привязываем к ней
    if (options.faction) {
      this.factionSystem.assignEntityToFaction(addedEntity, options.faction);
    }
    
    // 👁️ Автосоздание визуального круга видимости как дочерней сущности
    if (options.vision && options.vision.showBorder && options.vision.type === 'circle') {
      const v = options.vision;
      // Сохраняем параметры на сущности (для логики)
      addedEntity.vision = { ...v };
      this.addEntity({
        name: `${addedEntity.name} Vision`,
        type: 'vision',
        form: 'circle',
        size: v.range,
        parent: addedEntity.id,
        offsetX: 0,
        offsetY: 0,
        rotateChildren: false,
        visual: {
          form: 'circle',
          size: v.range,
          color: 0x000000, // заливка не используется
          onlyStroke: true,
          strokeColor: v.color ?? 0x00FFFF,
          strokeWidth: v.width ?? 2,
          strokeAlpha: v.alpha ?? 0.8
        },
        collision: { enabled: false }
      });
    }
    
    return addedEntity;
  }
  
  /**
   * 🌿 Быстро добавить декорацию
   */
  addDecoration(x, y, options = {}) {
    const entity = EntityFactory.createDecoration(x, y, options);
    return this.addEntity(entity);
  }
  
  /**
   * 🔍 Получить сущность по ID
   */
  getEntity(id) {
    return this.entities.get(id);
  }
  
  /**
   * 📊 Получить все сущности
   */
  getAllEntities() {
    return Array.from(this.entities.values());
  }
  
  /**
   * 🗑️ Удалить сущность
   */
  removeEntity(id) {
    const removed = this.entities.delete(id);
    if (removed) {
      //console.log(`🗑️ Entity удален: ID=${id}`);
    }
    return removed;
  }
  
  /**
   * 🌍 Установить дефолтный биом (покрывает весь мир)
   */
  addDefaultBiome(biomeType) {
    this.biomeSystem.setDefaultBiome(biomeType);
    //console.log(`🌍 Дефолтный биом мира установлен: ${biomeType.displayName}`);
  }
  
  /**
   * ➕ Добавить биом в конкретное место
   */
  addBiome(biomeType, bounds) {
    return this.biomeSystem.addBiome(biomeType, bounds);
  }
  
  /**
   * 🔍 Получить биом в указанных координатах
   */
  getBiomeAt(x, y) {
    return this.biomeSystem.getBiomeAt(x, y);
  }
  
  /**
   * 🔄 Обновить мир (вызывается каждый кадр)
   */
  update(dt = 16) {
    // ⏱️ Продвигаем игровое время систем, зависящих от dt
    if (this.collisionSystem?.advanceTime) {
      this.collisionSystem.advanceTime(dt);
    }
    
    // ⏱️ Обновляем игровые таймеры
    if (dt > 0 && this._timers.size > 0) {
      const fired = [];
      for (const t of this._timers) {
        t.remainingMs -= dt;
        if (t.remainingMs <= 0) {
          fired.push(t);
        }
      }
      for (const t of fired) {
        try { t.callback?.(); } catch (e) { console.error('Timer callback error:', e); }
        this._timers.delete(t);
        if (t.repeat) {
          t.remainingMs += t.repeat; // перезапуск
          this._timers.add(t);
        }
      }
    }
    
    // 🎯 Проверяем коллизии каждый кадр
    this.collisionSystem.checkCollisions();
  }

  /**
   * ⏱️ Поставить игровой таймер (подчиняется timeScale через dt)
   */
  setGameTimeout(callback, delayMs) {
    if (typeof delayMs !== 'number' || delayMs < 0) delayMs = 0;
    const t = { remainingMs: delayMs, callback, repeat: 0 };
    this._timers.add(t);
    return t;
  }

  /**
   * ⏱️ Повторяющийся игровой таймер
   */
  setGameInterval(callback, intervalMs) {
    if (typeof intervalMs !== 'number' || intervalMs <= 0) intervalMs = 16;
    const t = { remainingMs: intervalMs, callback, repeat: intervalMs };
    this._timers.add(t);
    return t;
  }

  /**
   * ⏱️ Отменить игровой таймер
   */
  clearGameTimer(timerHandle) {
    if (timerHandle && this._timers) {
      this._timers.delete(timerHandle);
    }
  }
  
  /**
   * 📍 Обновить позицию сущности с проверкой биома
   */
  updateEntityPosition(entity, newX, newY) {
    // Устанавливаем новую позицию
    entity.setPosition(newX, newY);
    
    // 🔗 Обновляем позиции дочерних сущностей
    entity.updateChildrenPositions();
    
    // Обновляем позицию в системе биомов
    this.biomeSystem.updateEntityPosition(entity, newX, newY);
    
    // Обновляем позицию в системе зон
    this.zoneSystem.updateEntityPosition(entity, newX, newY);
  }
  
  /**
   * 🏛️ Добавить зону в конкретное место
   */
  addZone(zoneType, bounds) {
    return this.zoneSystem.addZone(zoneType, bounds);
  }
  
  /**
   * 🔍 Получить зоны в указанных координатах
   */
  getZonesAt(x, y) {
    return this.zoneSystem.getZonesAt(x, y);
  }
  
  /**
   * 🗑️ Удалить зону по ID
   */
  removeZone(zoneId) {
    return this.zoneSystem.removeZone(zoneId);
  }
  
  /**
   * 📊 Получить все зоны
   */
  getAllZones() {
    return this.zoneSystem.getAllZones();
  }
  
  /**
   * 🔍 Получить активные зоны для сущности
   */
  getEntityZones(entityId) {
    return this.zoneSystem.getEntityZones(entityId);
  }
  
  /**
   * 🔲 Создать визуальные границы мира (одна обводка)
   */
  _createWorldBorders() {
    // 📏 Параметры обводки
    const borderWidth = this.borders.width;
    const borderColor = this.borders.color;
    
    // 🔲 Создаем ОДНУ Entity с обводкой всего мира
    this.addEntity({
      id: 'world_border_outline',
      x: 0, // Центр мира
      y: 0, // Центр мира  
      type: 'world_border',
      form: 'world_outline',
      size: borderWidth,
      color: borderColor,
      visual: {
        worldWidth: this.width,   // ← Правильно через visual!
        worldHeight: this.height, // ← Правильно через visual!
        color: borderColor,       // ← Цвет тоже передаем через visual
        size: borderWidth         // ← Размер тоже передаем через visual
      },
      name: 'Обводка мира'
    });
    
    //console.log(`🔲 Обводка мира создана: толщина=${borderWidth}px, цвет=0x${borderColor.toString(16)}`);
    //console.log(`📐 Размеры мира: ${this.width}×${this.height}, границы: [${this.bounds.left}, ${this.bounds.right}] × [${this.bounds.top}, ${this.bounds.bottom}]`);
  }
  
  /**
   * 📊 Информация о мире
   */
  getInfo() {
    return {
      width: this.width,
      height: this.height,
      backgroundColor: this.backgroundColor,
      bounds: { ...this.bounds },
      entityCount: this.entities.size
    };
  }
  
  /**
   * 🏛️ Добавить фракцию в систему
   */
  addFaction(faction) {
    return this.factionSystem.addFaction(faction);
  }
  
  /**
   * 🔗 Установить отношение одной фракции к другой (асимметричное)
   */
  setFactionRelation(fromFaction, toFaction, relationType) {
    return this.factionSystem.setRelation(fromFaction, toFaction, relationType);
  }
  
  /**
   * 🔗 Установить взаимные отношения между фракциями
   */
  setMutualFactionRelation(faction1, faction2, relationType) {
    return this.factionSystem.setMutualRelation(faction1, faction2, relationType);
  }
  
  /**
   * 🎯 Привязать сущность к фракции
   */
  assignEntityToFaction(entity, faction) {
    return this.factionSystem.assignEntityToFaction(entity, faction);
  }
  
  /**
   * ⚔️ Проверить могут ли сущности атаковать друг друга
   */
  canEntitiesAttack(entity1, entity2) {
    return this.factionSystem.canEntitiesAttack(entity1, entity2);
  }
  
  /**
   * 📊 Получить информацию о фракциях
   */
  getFactionInfo() {
    return this.factionSystem.getInfo();
  }
  
  /**
   * 🧹 Уничтожить мир и все системы
   */
  destroy() {
    console.log('🧹 Уничтожение World...');
    
    // Очищаем все системы
    if (this.biomeSystem) {
      this.biomeSystem.destroy?.();
    }
    if (this.zoneSystem) {
      this.zoneSystem.destroy?.();
    }
    if (this.factionSystem) {
      this.factionSystem.destroy?.();
    }
    if (this.collisionSystem) {
      this.collisionSystem.destroy();
    }
    
    // Очищаем сущности
    this.entities.clear();
    
    // Очищаем события
    this.removeAllListeners();
    
    console.log('✅ World уничтожен');
  }
}
