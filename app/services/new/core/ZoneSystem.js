/**
 * 🏛️ ZoneSystem - Система управления зонами в мире
 * 
 * Управляет размещением зон и применением их правил к сущностям
 * В отличие от биомов, зоны не имеют дефолтного покрытия
 */

export class ZoneSystem {
  constructor(world) {
    this.world = world;
    this.zoneInstances = [];            // Массив размещенных зон
    this.entityZones = new Map();       // entityId -> массив активных зон
    this.zonePriorities = new Map();    // zoneId -> приоритет для перекрывающихся зон
    
    //console.log('🏛️ ZoneSystem создана');
  }
  
  /**
   * ➕ Добавить зону в конкретное место
   */
  addZone(zoneType, bounds) {
    const zoneInstance = {
      id: `zone_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type: zoneType,
      bounds: bounds,
      priority: bounds.priority || 1,   // Приоритет для перекрывающихся зон
      activeEntities: new Set()         // Сущности в этой зоне
    };
    
    this.zoneInstances.push(zoneInstance);
    this.zonePriorities.set(zoneInstance.id, zoneInstance.priority);
    
    // Сортируем по приоритету (больший приоритет = выше)
    this.zoneInstances.sort((a, b) => b.priority - a.priority);
    
    // 🔲 Создаем визуальные границы зоны если включены
    if (zoneType.borders && zoneType.borders.enabled) {
      this._createZoneBorders(zoneInstance);
    }
    
    //console.log(`🏛️ Зона размещена: ${zoneType.displayName} в (${bounds.x}, ${bounds.y}) размером ${bounds.width}×${bounds.height}`);
    return zoneInstance.id;
  }
  
  /**
   * 🔍 Получить все зоны в указанных координатах
   */
  getZonesAt(x, y) {
    const activeZones = [];
    
    // Проверяем размещенные зоны (по приоритету)
    for (const instance of this.zoneInstances) {
      if (this._isPointInBounds(x, y, instance.bounds)) {
        activeZones.push(instance.type);
      }
    }
    
    return activeZones; // Возвращаем массив - сущность может быть в нескольких зонах
  }
  
  /**
   * 🎯 Проверить попадает ли точка в границы
   */
  _isPointInBounds(x, y, bounds) {
    if (bounds.type === 'circle') {
      const dx = x - bounds.centerX;
      const dy = y - bounds.centerY;
      return Math.sqrt(dx * dx + dy * dy) <= bounds.radius;
    } else {
      // Прямоугольник по умолчанию
      return x >= bounds.x && 
             x <= bounds.x + bounds.width &&
             y >= bounds.y && 
             y <= bounds.y + bounds.height;
    }
  }
  
  /**
   * 📍 Обновить позицию сущности и проверить изменения зон
   */
  updateEntityPosition(entity, newX, newY) {
    const entityId = entity.id;
    const currentZones = this.entityZones.get(entityId) || [];
    const newZones = this.getZonesAt(newX, newY);
    
    // Проверяем изменения в зонах
    const enteredZones = newZones.filter(zone => !currentZones.includes(zone));
    const exitedZones = currentZones.filter(zone => !newZones.includes(zone));
    
    // Обрабатываем входы в новые зоны
    enteredZones.forEach(zone => {
      this.handleZoneEnter(entity, zone);
    });
    
    // Обрабатываем выходы из зон
    exitedZones.forEach(zone => {
      this.handleZoneExit(entity, zone);
    });
    
    // Обновляем список активных зон для сущности
    if (newZones.length > 0) {
      this.entityZones.set(entityId, newZones);
    } else {
      this.entityZones.delete(entityId);
    }
  }
  
  /**
   * 🎯 Обработать вход сущности в зону
   */
  handleZoneEnter(entity, zone) {
    console.log(`🏛️ ${entity.name} вошел в зону "${zone.displayName}"`);
    
    // Добавляем сущность к активным в зоне
    const zoneInstance = this.zoneInstances.find(zi => zi.type === zone);
    if (zoneInstance) {
      zoneInstance.activeEntities.add(entity.id);
    }
    
    // Применяем правила зоны
    zone.applyRules(entity);
    zone.triggerEnterEvent(entity);
  }
  
  /**
   * 🚪 Обработать выход сущности из зоны
   */
  handleZoneExit(entity, zone) {
    console.log(`🏛️ ${entity.name} вышел из зоны "${zone.displayName}"`);
    
    // Удаляем сущность из активных в зоне
    const zoneInstance = this.zoneInstances.find(zi => zi.type === zone);
    if (zoneInstance) {
      zoneInstance.activeEntities.delete(entity.id);
    }
    
    // Вызываем событие выхода
    zone.triggerExitEvent(entity);
  }
  
  /**
   * 🗑️ Удалить зону по ID
   */
  removeZone(zoneId) {
    const index = this.zoneInstances.findIndex(instance => instance.id === zoneId);
    if (index !== -1) {
      const removed = this.zoneInstances.splice(index, 1)[0];
      this.zonePriorities.delete(zoneId);
      
      // Удаляем из активных зон всех сущностей
      for (const [entityId, zones] of this.entityZones.entries()) {
        const filteredZones = zones.filter(z => z !== removed.type);
        if (filteredZones.length === 0) {
          this.entityZones.delete(entityId);
        } else {
          this.entityZones.set(entityId, filteredZones);
        }
      }
      
      //console.log(`🗑️ Зона удалена: ${removed.type.displayName}`);
      return true;
    }
    return false;
  }
  
  /**
   * 🔲 Создать визуальные границы зоны
   */
  _createZoneBorders(zoneInstance) {
    const zone = zoneInstance.type;
    const bounds = zoneInstance.bounds;
    
    // Проверяем корректность данных зоны
    if (!zone.borders || typeof zone.borders !== 'object') {
      console.warn(`🔲 Некорректные настройки границ для зоны: ${zone.displayName}`);
      return;
    }
    
    // Центр прямоугольника зоны
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    
    // Безопасные значения с fallback
    const borderWidth = zone.borders.width || 2;
    const borderColor = zone.borders.color || 0x00FFFF; // Голубой по умолчанию
    const borderAlpha = zone.borders.alpha || 1.0;
    const borderStyle = zone.borders.style || 'dashed';
    
    // Создаем Entity для границ зоны
    const borderEntity = {
      id: `zone_border_${zoneInstance.id}`,
      x: centerX,
      y: centerY,
      type: 'zone_border',
      form: 'zone_boundary',  // Новая форма для зональных границ
      size: borderWidth,
      color: borderColor,
      visual: {
        zoneBounds: bounds,        // Размеры и позиция зоны
        borderStyle: borderStyle,  // dashed для отличия от биомов
        borderAlpha: borderAlpha
      },
      name: `Границы зоны: ${zone.displayName}`
    };
    
    // Добавляем Entity в мир
    this.world.addEntity(borderEntity);
    
    //console.log(`🔲 Границы зоны созданы: ${zone.displayName}, толщина=${borderWidth}px, цвет=0x${borderColor.toString(16)}, стиль=${borderStyle}`);
  }
  
  /**
   * 📊 Получить все размещенные зоны
   */
  getAllZones() {
    return this.zoneInstances.map(instance => ({
      id: instance.id,
      name: instance.type.name,
      displayName: instance.type.displayName,
      bounds: instance.bounds,
      priority: instance.priority,
      activeEntitiesCount: instance.activeEntities.size
    }));
  }
  
  /**
   * 🔍 Получить активные зоны для сущности
   */
  getEntityZones(entityId) {
    return this.entityZones.get(entityId) || [];
  }
  
  /**
   * 📊 Получить информацию о системе зон
   */
  getInfo() {
    return {
      zoneCount: this.zoneInstances.length,
      trackedEntities: this.entityZones.size,
      zones: this.getAllZones()
    };
  }
  
  /**
   * 🧹 Очистить систему
   */
  destroy() {
    this.zoneInstances.length = 0;
    this.entityZones.clear();
    this.zonePriorities.clear();
    //console.log('🧹 ZoneSystem очищена');
  }
}
