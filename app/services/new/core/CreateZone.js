/**
 * 🏛️ CreateZone - Создание типов зон
 * 
 * Определяет свойства зоны без привязки к координатам
 * Зоны - это области с особыми правилами, событиями, ограничениями
 */

export class CreateZone {
  constructor(name, properties = {}) {
    this.name = name;
    this.displayName = properties.displayName || name;
    
    // 🎮 Правила и механики зоны
    this.rules = {
      pvpEnabled: properties.pvpEnabled || false,          // PvP разрешен/запрещен
      buildingAllowed: properties.buildingAllowed || true, // Строительство разрешено
      movementRestricted: properties.movementRestricted || false, // Ограничение движения
      ...properties.rules
    };
    
    // 🎯 События и триггеры (заготовки для будущего)
    this.events = {
      onEnter: properties.onEnter || null,    // Событие при входе
      onExit: properties.onExit || null,      // Событие при выходе
      onStay: properties.onStay || null,      // Периодическое событие
      ...properties.events
    };
    
    // 🛡️ Ограничения и эффекты (заготовки для будущего)
    this.restrictions = {
      allowedTypes: properties.allowedTypes || [], // Разрешенные типы сущностей
      blockedTypes: properties.blockedTypes || [], // Заблокированные типы сущностей
      maxEntities: properties.maxEntities || null, // Максимум сущностей в зоне
      ...properties.restrictions
    };
    
    // 🎨 Визуальные эффекты (заготовки для будущего)
    this.visual = {
      tint: properties.tint || 0xFFFFFF,           // Цветовой оттенок
      lighting: properties.lighting || 1.0,        // Уровень освещения
      particles: properties.particles || null,     // Эффекты частиц
      warnings: properties.warnings || null,       // Предупреждающие эффекты
      ...properties.visual
    };
    
    // 🔲 Визуальные границы зоны (для отладки и тестирования)
    this.borders = {
      enabled: properties.borders?.enabled || false,
      width: properties.borders?.width || 2,
      color: properties.borders?.color || 0x00FFFF,  // Голубой по умолчанию
      style: properties.borders?.style || 'dashed',  // dashed для отличия от биомов
      alpha: properties.borders?.alpha || 1.0,
      ...properties.borders
    };
    
    console.log(`🏛️ Тип зоны создан: ${this.displayName}`);
  }
  
  /**
   * 📊 Получить информацию о типе зоны
   */
  getInfo() {
    return {
      name: this.name,
      displayName: this.displayName,
      rules: this.rules,
      events: this.events,
      restrictions: this.restrictions,
      visual: this.visual,
      borders: this.borders
    };
  }
  
  /**
   * 🎮 Применить правила зоны к сущности (заготовка)
   */
  applyRules(entity) {
    // TODO: Реализовать применение правил зоны
    // console.log(`🏛️ Применяем правила зоны ${this.displayName} к ${entity.name}`);
  }
  
  /**
   * 🎯 Обработать событие входа в зону (заготовка)
   */
  triggerEnterEvent(entity) {
    if (this.events.onEnter) {
      // TODO: Вызов пользовательского события
      // console.log(`🎯 Триггер входа в зону ${this.displayName}: ${entity.name}`);
    }
  }
  
  /**
   * 🚪 Обработать событие выхода из зоны (заготовка)
   */
  triggerExitEvent(entity) {
    if (this.events.onExit) {
      // TODO: Вызов пользовательского события
      // console.log(`🚪 Триггер выхода из зоны ${this.displayName}: ${entity.name}`);
    }
  }
  
  /**
   * 🔍 Получить описание зоны для отладки
   */
  getDebugInfo() {
    const rulesStr = Object.entries(this.rules)
      .filter(([_, value]) => value !== false && value !== null)
      .map(([key, value]) => `${key}=${value}`)
      .join(', ');
    
    return `🏛️ ${this.displayName} (${rulesStr || 'базовые правила'})`;
  }
}
