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
    
    // ❤️ Система жизней (необязательный параметр)
    this.maxHealth = config.health !== undefined ? config.health : null;
    this.currentHealth = config.currentHealth !== undefined ? config.currentHealth : this.maxHealth;
    
    // ⚔️ Урон при касании (необязательный параметр)
    this.touchDamage = config.touchDamage !== undefined ? config.touchDamage : null;
    
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
   * ❤️ Получить текущие жизни
   */
  getHealth() {
    return this.currentHealth;
  }
  
  /**
   * 💚 Получить максимальные жизни
   */
  getMaxHealth() {
    return this.maxHealth;
  }
  
  /**
   * 💙 Установить текущие жизни
   */
  setHealth(newHealth) {
    if (this.maxHealth === null) {
      this.currentHealth = null; // Бессмертный остается бессмертным
    } else {
      this.currentHealth = Math.max(0, Math.min(newHealth, this.maxHealth));
    }
    return this;
  }
  
  /**
   * 💀 Проверить, жив ли персонаж
   */
  isAlive() {
    return this.currentHealth === null || this.currentHealth > 0;
  }
  
  /**
   * 🔄 Восстановить жизни до максимума
   */
  restoreHealth() {
    this.currentHealth = this.maxHealth;
    return this;
  }
  
  /**
   * ⚔️ Получить урон при касании
   */
  getTouchDamage() {
    return this.touchDamage;
  }
  
  /**
   * 💥 Нанести урон данной сущности
   */
  takeDamage(damageAmount, entity = null) {
    if (this.currentHealth === null) return false; // Бессмертный не получает урон
    
    this.currentHealth = Math.max(0, this.currentHealth - damageAmount);
    
    // 🔄 Автоматический респаун при смерти
    if (this.currentHealth <= 0 && entity) {
      entity.die(); // Убиваем сущность (скрываем)
      
      if (entity.respawn) {
        console.log(`⏱️ ${entity.name} воскреснет через ${entity.respawnTime}мс`);
        entity.scheduleRespawn();
      }
    }
    
    return true; // Урон нанесен
  }
  
  /**
   * 🔄 Создать независимую копию характеристик
   */
  clone() {
    const newStats = new CharacterStats({
      speed: this._baseSpeed,
      health: this.maxHealth,
      touchDamage: this.touchDamage
    });
    newStats.currentHealth = this.currentHealth;
    return newStats;
  }
  
  /**
   * 📊 Получить все характеристики как объект
   */
  toObject() {
    return {
      speed: this.speed,
      baseSpeed: this._baseSpeed,
      currentHealth: this.currentHealth,
      maxHealth: this.maxHealth,
      touchDamage: this.touchDamage
    };
  }
  
  /**
   * 🔧 Обновить характеристики из объекта
   */
  fromObject(data) {
    if (data.speed !== undefined) this.speed = data.speed;
    if (data.baseSpeed !== undefined) this._baseSpeed = data.baseSpeed;
    if (data.currentHealth !== undefined) this.currentHealth = data.currentHealth;
    if (data.maxHealth !== undefined) this.maxHealth = data.maxHealth;
    if (data.touchDamage !== undefined) this.touchDamage = data.touchDamage;
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
