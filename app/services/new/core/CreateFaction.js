/**
 * 🏛️ CreateFaction - Определение фракции
 * 
 * Фракция объединяет юнитов и определяет их отношения с другими фракциями
 */

export class CreateFaction {
  constructor(id, options = {}) {
    this.id = id;                          // Уникальный ID фракции
    this.name = options.name || id;        // Отображаемое имя
    this.displayName = options.displayName || this.name;
    
    // 🎨 Визуальные настройки
    this.color = options.color || 0x888888;              // Основной цвет фракции
    this.unitColor = options.unitColor || this.color;    // Цвет юнитов по умолчанию
    this.emblem = options.emblem || null;                // Эмблема фракции
    
    // 📊 Характеристики фракции
    this.description = options.description || '';
    this.culture = options.culture || 'generic';         // Культура/стиль
    this.technology = options.technology || 'standard';  // Уровень технологий
    
    // 📈 Модификаторы фракции (влияют на юнитов)
    this.modifiers = {
      moveSpeed: options.moveSpeedModifier || 1.0,       // Скорость движения
      attackDamage: options.attackModifier || 1.0,       // Урон атаки
      defense: options.defenseModifier || 1.0,           // Защита
      buildSpeed: options.buildSpeedModifier || 1.0,     // Скорость строительства
      resourceGain: options.resourceModifier || 1.0,     // Добыча ресурсов
      ...options.modifiers
    };
    
    // 🎯 Поведенческие настройки
    this.behavior = {
      aggressive: options.aggressive || false,           // Агрессивная ли фракция
      expansionist: options.expansionist || false,       // Склонность к экспансии
      diplomatic: options.diplomatic || true,            // Дипломатичность
      tradeFriendly: options.tradeFriendly || true,      // Торговля
      ...options.behavior
    };
    
    // 🏗️ Доступные технологии/строения
    this.availableUnits = options.availableUnits || ['soldier', 'worker'];
    this.availableBuildings = options.availableBuildings || ['base', 'barracks'];
    this.availableTech = options.availableTech || [];
    
    // 🎮 Игровые данные
    this.isPlayerControlled = options.isPlayerControlled || false;
    this.aiDifficulty = options.aiDifficulty || 'normal';
    this.startingResources = options.startingResources || {};
    
    // 🔗 УПРОЩЕННАЯ СИСТЕМА: только мир и война
    // Каждая фракция имеет свой взгляд на другие фракции
    this.enemies = new Set(options.enemies || []);     // Кого считаем врагами
    this.peace = new Set(options.peace || []);         // С кем в мире
    // По умолчанию все остальные нейтральны (не в enemies и не в peace)
    
    // ⚔️ Может ли фракция воевать
    this.canFight = options.canFight !== false;        // По умолчанию может воевать
    
    console.log(`🏛️ Фракция создана: ${this.displayName} (${this.id})`);
  }
  
  /**
   * 🎨 Применить стиль фракции к юниту
   */
  applyFactionStyle(entity) {
    // Сохраняем оригинальный цвет если еще не сохранен
    if (!entity.visual.originalColor) {
      entity.visual.originalColor = entity.color;
    }
    
    // 🔲 НОВОЕ: Добавляем обводку цветом фракции вместо смены цвета
    entity.visual.factionOutline = {
      enabled: true,
      color: this.unitColor,        // Цвет обводки = цвет фракции
      width: 2,                     // Толщина обводки
      alpha: 0.8                    // Прозрачность обводки
    };
    
    // Оставляем оригинальный цвет юнита нетронутым!
    // entity.color остается как был
    
    // Применяем модификаторы фракции
    this._applyModifiers(entity);
    
    console.log(`🎨 Обводка фракции применена к ${entity.name}: цвет ${this.getColorHex()}`);
    return entity;
  }
  
  /**
   * ⚡ Применить модификаторы фракции к сущности
   */
  _applyModifiers(entity) {
    // Сохраняем базовые значения если их еще нет
    if (!entity.baseStats) {
      entity.baseStats = {
        moveSpeed: entity.moveSpeed || 1.0,
        health: entity.health || 100,
        damage: entity.damage || 10
      };
    }
    
    // Применяем модификаторы
    if (this.modifiers.moveSpeed !== 1.0) {
      entity.moveSpeed = entity.baseStats.moveSpeed * this.modifiers.moveSpeed;
    }
    
    if (this.modifiers.attackDamage !== 1.0) {
      entity.damage = entity.baseStats.damage * this.modifiers.attackDamage;
    }
    
    // Помечаем что модификаторы применены
    entity.factionModifiersApplied = true;
  }
  
  /**
   * 🔍 Проверить доступность юнита для фракции
   */
  canCreateUnit(unitType) {
    return this.availableUnits.includes(unitType);
  }
  
  /**
   * 🏗️ Проверить доступность строения для фракции
   */
  canCreateBuilding(buildingType) {
    return this.availableBuildings.includes(buildingType);
  }
  
  /**
   * 🎯 Получить приоритетные цели для AI
   */
  getAIPriorities() {
    const priorities = {
      expansion: this.behavior.expansionist ? 'high' : 'medium',
      military: this.behavior.aggressive ? 'high' : 'medium',
      economy: 'medium',
      diplomacy: this.behavior.diplomatic ? 'high' : 'low'
    };
    
    return priorities;
  }
  
  /**
   * 📊 Получить информацию о фракции
   */
  getInfo() {
    return {
      id: this.id,
      name: this.name,
      displayName: this.displayName,
      color: this.color,
      isPlayerControlled: this.isPlayerControlled,
      culture: this.culture,
      technology: this.technology,
      modifiers: this.modifiers,
      behavior: this.behavior,
      availableUnits: this.availableUnits,
      availableBuildings: this.availableBuildings,
      relations: this.getRelations()
    };
  }
  
  /**
   * 🎨 Получить цвет фракции в hex формате
   */
  getColorHex() {
    return `#${this.color.toString(16).padStart(6, '0')}`;
  }
  
  /**
   * ⚔️ Добавить врага
   */
  addEnemy(factionId) {
    const id = typeof factionId === 'string' ? factionId : factionId.id;
    this.enemies.add(id);
    // Удаляем из мирных если есть
    this.peace.delete(id);
    console.log(`⚔️ ${this.displayName} теперь считает ${id} врагом`);
  }
  
  /**
   * 🤝 Установить мир
   */
  addPeace(factionId) {
    const id = typeof factionId === 'string' ? factionId : factionId.id;
    this.peace.add(id);
    // Удаляем из врагов если есть
    this.enemies.delete(id);
    console.log(`🤝 ${this.displayName} устанавливает мир с ${id}`);
  }
  
  /**
   * 😐 Сделать нейтральными (удалить из всех списков)
   */
  makeNeutral(factionId) {
    const id = typeof factionId === 'string' ? factionId : factionId.id;
    this.enemies.delete(id);
    this.peace.delete(id);
    console.log(`😐 ${this.displayName} делает ${id} нейтральной`);
  }
  
  /**
   * 🔍 Получить отношение к другой фракции
   */
  getRelationTo(factionId) {
    const id = typeof factionId === 'string' ? factionId : factionId.id;
    
    // Собственная фракция всегда мирная
    if (id === this.id) return 'peace';
    
    if (this.enemies.has(id)) return 'war';
    if (this.peace.has(id)) return 'peace';
    
    // По умолчанию нейтральное отношение
    return 'neutral';
  }
  
  /**
   * ⚔️ Проверить в состоянии ли войны с фракцией
   */
  isWar(factionId) {
    const id = typeof factionId === 'string' ? factionId : factionId.id;
    return this.enemies.has(id);
  }
  
  /**
   * 🤝 Проверить в мире ли с фракцией
   */
  isPeace(factionId) {
    const id = typeof factionId === 'string' ? factionId : factionId.id;
    return this.peace.has(id) || id === this.id; // Сама с собой всегда в мире
  }
  
  /**
   * 😐 Проверить нейтральна ли к фракции
   */
  isNeutral(factionId) {
    const id = typeof factionId === 'string' ? factionId : factionId.id;
    return !this.enemies.has(id) && !this.peace.has(id) && id !== this.id;
  }
  
  /**
   * ⚔️ Проверить может ли фракция воевать
   */
  canWarfare() {
    return this.canFight;
  }
  
  /**
   * 📊 Получить все отношения
   */
  getRelations() {
    return {
      war: Array.from(this.enemies),
      peace: Array.from(this.peace),
      canFight: this.canFight
    };
  }
  
  /**
   * 🔄 Обновить настройки фракции
   */
  updateSettings(newSettings) {
    Object.assign(this, newSettings);
    console.log(`🔄 Фракция ${this.displayName} обновлена`);
  }
}
