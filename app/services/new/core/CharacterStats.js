/**
 * 📊 CharacterStats - Система характеристик персонажей
 * 
 * Модульная система для управления характеристиками сущностей.
 * Можно привязывать к разным Entity как готовую базу.
 */

export class CharacterStats {
  constructor(config = {}) {
    // 🏃 Скорость передвижения
    this.speed = config.speed || 1;
    
    // 🔧 Служебные поля
    this._baseSpeed = this.speed; // Сохраняем базовую скорость для эффектов
  }
  
  /**
   * 🏃 Получить текущую скорость передвижения
   */
  getSpeed() {
    return this.speed;
  }
  
  /**
   * ⚡ Установить скорость передвижения
   */
  setSpeed(newSpeed) {
    this.speed = Math.max(0, newSpeed); // Не может быть отрицательной
    return this;
  }
  
  /**
   * 🔄 Сбросить скорость к базовому значению
   */
  resetSpeed() {
    this.speed = this._baseSpeed;
    return this;
  }
  
  /**
   * 📈 Модифицировать скорость (для временных эффектов)
   */
  modifySpeed(multiplier) {
    this.speed = this._baseSpeed * multiplier;
    return this;
  }
  
  /**
   * 🔄 Создать независимую копию характеристик
   */
  clone() {
    return new CharacterStats({
      speed: this._baseSpeed
    });
  }
  
  /**
   * 📊 Получить все характеристики как объект
   */
  toObject() {
    return {
      speed: this.speed,
      baseSpeed: this._baseSpeed
    };
  }
  
  /**
   * 🔧 Обновить характеристики из объекта
   */
  fromObject(data) {
    if (data.speed !== undefined) this.speed = data.speed;
    if (data.baseSpeed !== undefined) this._baseSpeed = data.baseSpeed;
    return this;
  }
  
  /**
   * 🎯 Создать из JSON конфига (для будущих оберток)
   */
  static fromJSON(json) {
    return new CharacterStats(json);
  }
}

/**
 * 📋 Готовые шаблоны характеристик (для будущего)
 */
export const STAT_TEMPLATES = {
  'slow': { speed: 2 },
  'normal': { speed: 5 },
  'fast': { speed: 8 },
  'very_fast': { speed: 12 }
};

/**
 * 🏭 Фабрика для создания характеристик из шаблонов
 */
export function createStatsFromTemplate(templateId) {
  const template = STAT_TEMPLATES[templateId];
  if (!template) {
    console.warn(`Шаблон характеристик '${templateId}' не найден, используем 'normal'`);
    return new CharacterStats(STAT_TEMPLATES.normal);
  }
  return new CharacterStats(template);
}
