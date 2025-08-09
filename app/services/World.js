/**
 * Класс World - управление игровым миром
 * Отвечает за размеры, границы, гравитацию и другие глобальные настройки
 */
export default class World {
  /**
   * @param {object} config - конфигурация мира
   * @param {number} config.width - ширина мира (если не указана = canvas width)
   * @param {number} config.height - высота мира (если не указана = canvas height)
   * @param {string} config.type - тип мира: 'default' (жесткие границы = canvas), 'solid', 'infinite', 'cyclic'
   * @param {object} config.gravity - настройки гравитации
   * @param {number} canvasWidth - ширина canvas для 'default' типа
   * @param {number} canvasHeight - высота canvas для 'default' типа
   */
  constructor(config = {}, canvasWidth = 800, canvasHeight = 600) {
    // Тип мира (по умолчанию 'default')
    this.type = config.type || 'default';
    
    // Настройка размеров в зависимости от типа
    this._setupDimensions(config, canvasWidth, canvasHeight);
    
    // Настройка гравитации
    this.gravity = {
      enabled: config.gravity?.enabled || false,
      strength: config.gravity?.strength || 0.1,
      direction: config.gravity?.direction || 90  // градусы: 90 = вниз
    };
    
    // Настройки границ (для будущих типов мира)
    this.boundaries = {
      entities: config.boundaries?.entities || 'stop',      // stop, wrap, bounce, destroy
      projectiles: config.boundaries?.projectiles || 'stop' // stop, wrap, bounce, destroy
    };
    
    console.log('🌍 World создан:', this.getInfo());
  }
  
  /**
   * Настройка размеров мира в зависимости от типа
   */
  _setupDimensions(config, canvasWidth, canvasHeight) {
    switch (this.type) {
      case 'default':
        // Default мир = размер canvas с жесткими границами
        this.width = canvasWidth;
        this.height = canvasHeight;
        break;
        
      case 'solid':
        // Solid мир = фиксированные размеры с твердыми границами
        this.width = config.width || canvasWidth;
        this.height = config.height || canvasHeight;
        break;
        
      case 'infinite':
        // Infinite мир = бесконечные размеры
        this.width = Infinity;
        this.height = Infinity;
        break;
        
      case 'cyclic':
        // Cyclic мир = размеры с циклическими границами (wrap)
        this.width = config.width || canvasWidth;
        this.height = config.height || canvasHeight;
        this.boundaries.entities = 'wrap';
        this.boundaries.projectiles = 'wrap';
        break;
        
      default:
        console.warn(`🌍 Неизвестный тип мира: ${this.type}, используется 'default'`);
        this.type = 'default';
        this.width = canvasWidth;
        this.height = canvasHeight;
    }
  }
  
  /**
   * Проверка, находится ли точка внутри мира
   */
  isPointInside(x, y) {
    if (this.type === 'infinite') return true;
    return x >= 0 && x <= this.width && y >= 0 && y <= this.height;
  }
  
  /**
   * Применение границ к объекту (пуля, энтити)
   * @param {object} obj - объект с x, y, vx, vy
   * @param {string} type - 'entity' или 'projectile'
   * @returns {boolean} - true если объект остался в мире, false если уничтожен
   */
  applyBoundaries(obj, type = 'projectile') {
    if (this.type === 'infinite') return true;
    
    const boundaryType = type === 'entity' ? this.boundaries.entities : this.boundaries.projectiles;
    
    // Проверяем границы
    let hitBoundary = false;
    
    if (obj.x < 0) {
      hitBoundary = true;
      obj.x = 0;
      if (boundaryType === 'bounce') obj.vx = Math.abs(obj.vx);
      else if (boundaryType === 'wrap') obj.x = this.width;
    } else if (obj.x > this.width) {
      hitBoundary = true;
      obj.x = this.width;
      if (boundaryType === 'bounce') obj.vx = -Math.abs(obj.vx);
      else if (boundaryType === 'wrap') obj.x = 0;
    }
    
    if (obj.y < 0) {
      hitBoundary = true;
      obj.y = 0;
      if (boundaryType === 'bounce') obj.vy = Math.abs(obj.vy);
      else if (boundaryType === 'wrap') obj.y = this.height;
    } else if (obj.y > this.height) {
      hitBoundary = true;
      obj.y = this.height;
      if (boundaryType === 'bounce') obj.vy = -Math.abs(obj.vy);
      else if (boundaryType === 'wrap') obj.y = 0;
    }
    
    // Если попали в границу и тип 'destroy' - удаляем объект
    if (hitBoundary && boundaryType === 'destroy') {
      return false;
    }
    
    return true;
  }
  
  /**
   * Получение информации о мире для дебага
   */
  getInfo() {
    return {
      type: this.type,
      size: this.type === 'infinite' ? '∞×∞' : `${this.width}×${this.height}`,
      gravity: this.gravity,
      boundaries: this.boundaries
    };
  }
  
  /**
   * Создание визуальных границ мира (для PIXI)
   * @param {PIXI.Graphics} graphics - объект для рисования
   */
  createVisualBorders(graphics) {
    if (this.type === 'infinite') return; // Бесконечный мир не имеет видимых границ
    
    graphics.clear();
    
    // Рисуем границы мира красной линией (толще!)
    graphics.rect(0, 0, this.width, this.height);
    graphics.stroke({ width: 4, color: 0xff0000 });
    
    console.log('🔴 World borders созданы:', `${this.width}×${this.height} (${this.type})`);
  }
}