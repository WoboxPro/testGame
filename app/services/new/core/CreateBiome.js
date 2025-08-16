/**
 * 🌍 CreateBiome - Создание типов биомов
 * 
 * Определяет свойства биома без привязки к координатам
 */

export class CreateBiome {
  constructor(name, properties = {}) {
    this.name = name;
    this.displayName = properties.displayName || name;
    
    // 🌡️ Климатические свойства (пока базовые)
    this.climate = {
      temperature: properties.temperature || 'moderate',  // cold, moderate, hot
      humidity: properties.humidity || 'normal',          // low, normal, high
      ...properties.climate
    };
    
    // 🌿 Природные характеристики (заготовки для будущего)
    this.vegetation = properties.vegetation || [];
    this.creatures = properties.creatures || [];
    this.resources = properties.resources || [];
    
    // 🎨 Визуальные эффекты (заготовки для будущего)
    this.visual = {
      tint: properties.tint || 0xFFFFFF,           // Цветовой оттенок
      lighting: properties.lighting || 1.0,        // Уровень освещения
      particles: properties.particles || null,     // Эффекты частиц
      backgroundMusic: properties.backgroundMusic || null,
      ...properties.visual
    };
    
    // 🎮 Игровые эффекты (заготовки для будущего)
    this.effects = {
      speedMultiplier: properties.speedMultiplier || 1.0,
      visibilityMultiplier: properties.visibilityMultiplier || 1.0,
      ...properties.effects
    };
    
    // 🔲 Визуальные границы биома (для отладки и тестирования)
    this.borders = {
      enabled: properties.borders?.enabled || false,
      width: properties.borders?.width || 2,
      color: properties.borders?.color || 0xFF00FF,  // Розовый по умолчанию
      style: properties.borders?.style || 'solid',   // solid, dashed, dotted
      alpha: properties.borders?.alpha || 1.0,
      ...properties.borders
    };
    
    //console.log(`🌍 Тип биома создан: ${this.displayName}`);
  }
  
  /**
   * 📊 Получить информацию о типе биома
   */
  getInfo() {
    return {
      name: this.name,
      displayName: this.displayName,
      climate: this.climate,
      vegetation: this.vegetation,
      creatures: this.creatures,
      visual: this.visual,
      effects: this.effects,
      borders: this.borders
    };
  }
  
  /**
   * 🎨 Применить эффекты биома к сущности (заготовка)
   */
  applyEffects(entity) {
    // TODO: Реализовать применение эффектов
    console.log(`🌍 Применяем эффекты биома ${this.displayName} к ${entity.name}`);
  }
  
  /**
   * 🔍 Получить описание биома для отладки
   */
  getDebugInfo() {
    return `🌍 ${this.displayName} (${this.climate.temperature}, ${this.climate.humidity})`;
  }
}
