/**
 * 🎯 Entity - Игровая сущность
 * 
 * Базовый класс для всех объектов в мире
 */

export class Entity {
  constructor(options = {}) {
    // 🆔 Уникальный ID
    this.id = options.id || `entity_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // 📍 Позиция в мире
    this.x = options.x || 0;
    this.y = options.y || 0;
    
    // 🏷️ Классификация (для будущей логики)
    this.type = options.type || 'decoration'; // structure / decoration / unit
    
    // 🎨 Визуальное представление
    this.visual = {
      form: options.form || 'circle',           // Форма: circle, rect, diamond, star, etc.
      size: options.size || 5,                  // Основной размер
      color: options.color || 0x888888,         // Цвет
      sprite: options.sprite || null,           // Путь к спрайту (в будущем)
      ...options.visual                         // Дополнительные визуальные настройки
    };
    
    // 📋 Дополнительные свойства
    this.name = options.name || `${this.type}_${this.id}`;
    this.data = options.data || {};             // Произвольные данные
    
    console.log(`🎯 Entity создана: ${this.name} (${this.type}) в (${this.x}, ${this.y}), форма=${this.visual.form}`);
  }
  
  /**
   * 🎨 Получить визуальную конфигурацию для рендеринга
   */
  getVisualConfig() {
    return {
      form: this.visual.form,
      size: this.visual.size,
      color: this.visual.color,
      sprite: this.visual.sprite
    };
  }
  
  /**
   * 📍 Установить позицию
   */
  setPosition(x, y) {
    this.x = x;
    this.y = y;
  }
  
  /**
   * 🎨 Обновить визуальные настройки
   */
  updateVisual(visualOptions) {
    this.visual = {
      ...this.visual,
      ...visualOptions
    };
  }
  
  /**
   * 🎨 Рендеринг сущности (Entity отвечает за свой внешний вид)
   */
  render(graphics) {
    // 🎨 Рендерим по форме
    switch (this.visual.form) {
      case 'circle':
        graphics.circle(0, 0, this.visual.size);
        break;
        
      case 'rect':
      case 'building':
        const half = this.visual.size / 2;
        graphics.rect(-half, -half, this.visual.size, this.visual.size);
        break;
        
      case 'diamond':
        graphics.poly([
          -this.visual.size, 0,    // лево
          0, -this.visual.size,    // верх
          this.visual.size, 0,     // право
          0, this.visual.size      // низ
        ]);
        break;
        
      case 'star':
      case 'explosion':
        graphics.star(0, 0, 6, this.visual.size, this.visual.size * 0.5);
        break;
        
      case 'bullet':
        graphics.circle(0, 0, Math.max(1, this.visual.size * 0.3));
        break;
        
      case 'soldier':
        graphics.circle(0, 0, this.visual.size);
        break;
        
      case 'tank':
        const tankSize = this.visual.size * 1.2;
        graphics.rect(-tankSize/2, -tankSize/2, tankSize, tankSize);
        break;
        
      case 'tower':
        // Узкая высокая башня
        const towerWidth = this.visual.size * 0.6;
        const towerHeight = this.visual.size * 1.5;
        graphics.rect(-towerWidth/2, -towerHeight/2, towerWidth, towerHeight);
        break;
        
      case 'tree':
        // Ствол
        graphics.rect(-1, this.visual.size * 0.2, 2, this.visual.size * 0.8);
        graphics.fill({ color: 0x8B4513 });
        // Крона
        graphics.circle(0, -this.visual.size * 0.3, this.visual.size * 0.7);
        graphics.fill({ color: 0x228B22 });
        return; // Уже покрасили
        
      case 'aircraft':
        // Треугольный самолет
        graphics.poly([
          0, -this.visual.size,           // нос
          -this.visual.size * 0.7, this.visual.size * 0.5,  // левое крыло
          this.visual.size * 0.7, this.visual.size * 0.5    // правое крыло
        ]);
        break;
        
      case 'wall':
        // Длинная тонкая стена
        const wallLength = this.visual.size * 2;
        const wallThickness = this.visual.size * 0.3;
        graphics.rect(-wallLength/2, -wallThickness/2, wallLength, wallThickness);
        break;
        
      case 'rock':
        // Неправильный многоугольник
        const rockPoints = [];
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI * 2) / 6;
          const radius = this.visual.size * (0.7 + Math.random() * 0.3);
          rockPoints.push(Math.cos(angle) * radius, Math.sin(angle) * radius);
        }
        graphics.poly(rockPoints);
        break;
        
      case 'world_outline':
        // Обводка всего мира - прямоугольная рамка
        const worldWidth = this.visual.worldWidth || 100;
        const worldHeight = this.visual.worldHeight || 100;
        const strokeWidth = this.visual.size;
        
        // Рисуем ТОЛЬКО обводку (без заливки)
        graphics.rect(
          -worldWidth/2, 
          -worldHeight/2, 
          worldWidth, 
          worldHeight
        );
        graphics.stroke({ 
          color: this.visual.color, 
          width: strokeWidth 
        });
        return; // Не применяем fill - только stroke
        
      case 'border_line':
        // Граница мира - прямая линия (устаревшая, для совместимости)
        const length = this.visual.length || 100;
        const thickness = this.visual.size;
        
        if (this.visual.orientation === 'horizontal') {
          // Горизонтальная линия
          graphics.rect(-length/2, -thickness/2, length, thickness);
        } else {
          // Вертикальная линия
          graphics.rect(-thickness/2, -length/2, thickness, length);
        }
        break;
        
      default:
        // Неизвестная форма - круг по умолчанию
        graphics.circle(0, 0, this.visual.size);
        break;
    }
    
    // 🎨 Применяем цвет (кроме сложных форм типа tree)
    graphics.fill({ color: this.visual.color });
  }
  
  /**
   * 📊 Получить информацию о сущности
   */
  getInfo() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      position: { x: this.x, y: this.y },
      visual: this.visual,
      data: this.data
    };
  }
}

/**
 * 🎨 Готовые формы для быстрого создания
 */
export const EntityForms = {
  // 🔴 Базовые формы
  CIRCLE: 'circle',
  RECT: 'rect', 
  DIAMOND: 'diamond',
  STAR: 'star',
  
  // 🏗️ Архитектурные (для structure)
  BUILDING: 'building',        // Большой прямоугольник
  TOWER: 'tower',             // Узкий высокий прямоугольник
  WALL: 'wall',               // Длинный тонкий прямоугольник
  
  // 👥 Юниты (для unit)
  SOLDIER: 'soldier',         // Средний круг
  TANK: 'tank',              // Большой прямоугольник
  AIRCRAFT: 'aircraft',       // Треугольник
  
  // 🌿 Декорации (для decoration)  
  TREE: 'tree',              // Треугольник на прямоугольнике
  ROCK: 'rock',              // Неправильный многоугольник
  GRASS: 'grass',            // Маленькие точки
  
  // 🔥 Эффекты
  BULLET: 'bullet',          // Очень маленький круг
  EXPLOSION: 'explosion',    // Звезда
  PARTICLE: 'particle',      // Точка
  
  // 🗺️ Системные элементы
  WORLD_OUTLINE: 'world_outline', // Обводка всего мира
  BORDER_LINE: 'border_line'      // Граница мира (устаревшая)
};

/**
 * 🏭 Фабрика для быстрого создания типовых сущностей
 */
export class EntityFactory {
  
  /**
   * 🏗️ Создать структуру
   */
  static createStructure(x, y, options = {}) {
    return new Entity({
      x, y,
      type: 'structure',
      form: options.form || EntityForms.BUILDING,
      size: options.size || 20,
      color: options.color || 0x8B4513, // Коричневый
      name: options.name || 'Строение',
      ...options
    });
  }
  
  /**
   * 👥 Создать юнита
   */
  static createUnit(x, y, options = {}) {
    return new Entity({
      x, y,
      type: 'unit',
      form: options.form || EntityForms.SOLDIER,
      size: options.size || 7,
      color: options.color || 0x00FF00, // Зеленый
      name: options.name || 'Юнит',
      ...options
    });
  }
  
  /**
   * 🌿 Создать декорацию
   */
  static createDecoration(x, y, options = {}) {
    return new Entity({
      x, y,
      type: 'decoration',
      form: options.form || EntityForms.CIRCLE,
      size: options.size || 5,
      color: options.color || 0x888888, // Серый
      name: options.name || 'Декорация',
      ...options
    });
  }
}
