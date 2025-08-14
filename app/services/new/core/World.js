/**
 * 🌍 World - Мир с сущностями
 * 
 * Хранит все игровые объекты в центрированной системе координат
 */

import { Entity, EntityForms, EntityFactory } from './Entity.js';

export class World {
  constructor(options = {}) {
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
    
    console.log(`🌍 World создан: ${this.width}×${this.height}, центр в (0,0), границы [${this.bounds.left},${this.bounds.right}] × [${this.bounds.top},${this.bounds.bottom}]`);
    
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
    
    // 📦 Добавляем в мир
    this.entities.set(entity.id, entity);
    console.log(`➕ Entity добавлен: ${entity.name} (${entity.type}) в (${entity.x}, ${entity.y})`);
    return entity;
  }
  
  /**
   * 🏗️ Быстро добавить структуру
   */
  addStructure(x, y, options = {}) {
    const entity = EntityFactory.createStructure(x, y, options);
    return this.addEntity(entity);
  }
  
  /**
   * 👥 Быстро добавить юнита
   */
  addUnit(x, y, options = {}) {
    const entity = EntityFactory.createUnit(x, y, options);
    return this.addEntity(entity);
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
      console.log(`🗑️ Entity удален: ID=${id}`);
    }
    return removed;
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
      },
      name: 'Обводка мира'
    });
    
    console.log(`🔲 Обводка мира создана: толщина=${borderWidth}px, цвет=0x${borderColor.toString(16)}`);
    console.log(`📐 Размеры мира: ${this.width}×${this.height}, границы: [${this.bounds.left}, ${this.bounds.right}] × [${this.bounds.top}, ${this.bounds.bottom}]`);
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
}
