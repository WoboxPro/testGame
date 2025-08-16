/**
 * 🌍 BiomeSystem - Система управления биомами в мире
 * 
 * Управляет размещением биомов и определением текущего биома сущностей
 */

export class BiomeSystem {
  constructor(world) {
    this.world = world;
    this.defaultBiome = null;           // Дефолтный биом (покрывает весь мир)
    this.biomeInstances = [];           // Массив размещенных биомов
    this.entityBiomes = new Map();      // entityId -> текущий биом
    
  }
  
  /**
   * 🌍 Установить дефолтный биом (покрывает весь мир)
   */
  setDefaultBiome(biomeType) {
    this.defaultBiome = biomeType;
    //console.log(`🌍 Дефолтный биом установлен: ${biomeType.displayName}`);
  }
  
  /**
   * ➕ Добавить биом в конкретное место
   */
  addBiome(biomeType, bounds) {
    const biomeInstance = {
      id: `biome_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type: biomeType,
      bounds: bounds,
      priority: bounds.priority || 1   // Приоритет для перекрывающихся биомов
    };
    
    this.biomeInstances.push(biomeInstance);
    
    // Сортируем по приоритету (больший приоритет = выше)
    this.biomeInstances.sort((a, b) => b.priority - a.priority);
    
    // 🔲 Создаем визуальные границы биома если включены
    if (biomeType.borders && biomeType.borders.enabled) {
      this._createBiomeBorders(biomeInstance);
    }
    
    //console.log(`🌍 Биом размещен: ${biomeType.displayName} в (${bounds.x}, ${bounds.y}) размером ${bounds.width}×${bounds.height}`);
    return biomeInstance.id;
  }
  
  /**
   * 🔍 Получить биом в указанных координатах
   */
  getBiomeAt(x, y) {
    // Проверяем размещенные биомы (по приоритету)
    for (const instance of this.biomeInstances) {
      if (this._isPointInBounds(x, y, instance.bounds)) {
        return instance.type;
      }
    }
    
    // Если нет специального биома - возвращаем дефолтный
    return this.defaultBiome;
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
   * 📍 Обновить позицию сущности и проверить смену биома
   */
  updateEntityPosition(entity, newX, newY) {
    const currentBiome = this.entityBiomes.get(entity.id);
    const newBiome = this.getBiomeAt(newX, newY);
    
    // Проверяем смену биома
    if (currentBiome !== newBiome) {
      this.handleBiomeChange(entity, currentBiome, newBiome);
      this.entityBiomes.set(entity.id, newBiome);
    }
  }
  
  /**
   * 🔄 Обработать смену биома сущностью
   */
  handleBiomeChange(entity, fromBiome, toBiome) {
    if (fromBiome && toBiome) {
      //console.log(`🌍 ${entity.name} перешел из биома "${fromBiome.displayName}" в "${toBiome.displayName}"`);
    } else if (toBiome) {
      //console.log(`🌍 ${entity.name} вошел в биом "${toBiome.displayName}"`);
    }
    
    // TODO: Применить эффекты нового биома
    if (toBiome) {
      toBiome.applyEffects(entity);
    }
  }
  
  /**
   * 🗑️ Удалить биом по ID
   */
  removeBiome(biomeId) {
    const index = this.biomeInstances.findIndex(instance => instance.id === biomeId);
    if (index !== -1) {
      const removed = this.biomeInstances.splice(index, 1)[0];
      //console.log(`🗑️ Биом удален: ${removed.type.displayName}`);
      return true;
    }
    return false;
  }
  
  /**
   * 📊 Получить все размещенные биомы
   */
  getAllBiomes() {
    return this.biomeInstances.map(instance => ({
      id: instance.id,
      name: instance.type.name,
      displayName: instance.type.displayName,
      bounds: instance.bounds,
      priority: instance.priority
    }));
  }
  
  /**
   * 📊 Получить информацию о системе биомов
   */
  getInfo() {
    return {
      defaultBiome: this.defaultBiome?.displayName || null,
      biomeCount: this.biomeInstances.length,
      trackedEntities: this.entityBiomes.size,
      biomes: this.getAllBiomes()
    };
  }
  
  /**
   * 🔲 Создать визуальные границы биома
   */
  _createBiomeBorders(biomeInstance) {
    const biome = biomeInstance.type;
    const bounds = biomeInstance.bounds;
    
    // Проверяем корректность данных биома
    if (!biome.borders || typeof biome.borders !== 'object') {
      console.warn(`🔲 Некорректные настройки границ для биома: ${biome.displayName}`);
      return;
    }
    
    // Центр прямоугольника биома
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    
    // Безопасные значения с fallback
    const borderWidth = biome.borders.width || 2;
    const borderColor = biome.borders.color || 0xFF00FF; // Розовый по умолчанию
    const borderAlpha = biome.borders.alpha || 1.0;
    const borderStyle = biome.borders.style || 'solid';
    
    // Создаем Entity для границ биома
    const borderEntity = {
      id: `biome_border_${biomeInstance.id}`,
      x: centerX,
      y: centerY,
      type: 'biome_border',
      form: 'biome_outline',
      size: borderWidth,
      color: borderColor,
      visual: {
        biomeBounds: bounds,        // Размеры и позиция биома
        borderStyle: borderStyle,
        borderAlpha: borderAlpha
      },
      name: `Границы биома: ${biome.displayName}`
    };
    
    // Добавляем Entity в мир
    this.world.addEntity(borderEntity);
    
    //console.log(`🔲 Границы биома созданы: ${biome.displayName}, толщина=${borderWidth}px, цвет=0x${borderColor.toString(16)}`);
  }
  
  /**
   * 🧹 Очистить систему
   */
  destroy() {
    this.biomeInstances.clear();
    this.entityBiomes.clear();
    this.defaultBiome = null;
    //console.log('🧹 BiomeSystem очищена');
  }
}
