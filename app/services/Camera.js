/**
 * Класс Camera - управление камерой в игровом мире
 * Отвечает за позицию, движение и ограничения камеры
 */
export default class Camera {
  /**
   * @param {number} canvasWidth - ширина видимой области (canvas)
   * @param {number} canvasHeight - высота видимой области (canvas)
   * @param {object} world - объект мира с размерами
   */
  constructor(canvasWidth, canvasHeight, world) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.world = world;
    
    // Позиция камеры в мире
    this.x = 0;
    this.y = 0;
    
    // Скорость движения камеры
    this.speed = 5;
    
    // Ограничения камеры (чтобы не выходила за границы мира)
    this.bounds = this._calculateBounds();
    
    console.log('📹 Camera создана:', this.getInfo());
    console.log('🔍 DEBUG Camera bounds:', this.bounds);
  }
  
  /**
   * Вычисление границ камеры на основе размеров мира и canvas
   */
  _calculateBounds() {
    if (this.world.type === 'infinite') {
      // Для бесконечного мира камера может двигаться в любом направлении
      return {
        minX: -Infinity,
        minY: -Infinity,
        maxX: Infinity,
        maxY: Infinity
      };
    }
    
    if (this.world.type === 'default') {
      // Для default мира (мир = canvas) камера не двигается
      return {
        minX: 0,
        minY: 0,
        maxX: 0,
        maxY: 0
      };
    }
    
    // Для solid/cyclic мира камера может двигаться в пределах: 0 до (world - canvas)
    const maxX = Math.max(0, this.world.width - this.canvasWidth);
    const maxY = Math.max(0, this.world.height - this.canvasHeight);
    
    return {
      minX: 0,
      minY: 0,
      maxX: maxX,
      maxY: maxY
    };
  }
  
  /**
   * Обновление позиции камеры на основе нажатых клавиш
   * @param {object} keys - объект с состоянием клавиш
   */
  update(keys) {
    let moved = false;
    const oldX = this.x;
    const oldY = this.y;
    
    // DEBUG: показываем какие клавиши нажаты (закомментировано для производительности)
    // const pressedKeys = Object.keys(keys).filter(key => keys[key]);
    // if (pressedKeys.length > 0) {
    //   console.log('🔍 DEBUG Pressed keys:', pressedKeys);
    // }
    
    // Управление камерой: Numpad 1,2,3,5 (как WASD) + обычные цифры как резерв
    if (keys['Numpad1'] || keys['Digit1']) { // Влево
      this.x = Math.max(this.bounds.minX, this.x - this.speed);
      moved = true;
    }
    if (keys['Numpad2'] || keys['Digit2']) { // Вниз (поменяли с 5)
      this.y = Math.min(this.bounds.maxY, this.y + this.speed);
      moved = true;
    }
    if (keys['Numpad3'] || keys['Digit3']) { // Вправо
      this.x = Math.min(this.bounds.maxX, this.x + this.speed);
      moved = true;
    }
    if (keys['Numpad5'] || keys['Digit5']) { // Вверх (поменяли с 2)
      this.y = Math.max(this.bounds.minY, this.y - this.speed);
      moved = true;
    }
    
    // Дебаг движения камеры (закомментировано для производительности)
    // if (moved && (this.x !== oldX || this.y !== oldY)) {
    //   console.log(`📹 Camera moved: ${this.x.toFixed(0)}, ${this.y.toFixed(0)} | bounds: ${this.bounds.maxX}×${this.bounds.maxY}`);
    // }
    
    return moved;
  }
  
  /**
   * Применение позиции камеры к PIXI stage
   * @param {PIXI.Container} stage - основная сцена
   * @param {PIXI.Container} uiContainer - UI контейнер (не двигается с камерой)
   */
  applyToStage(stage, uiContainer = null) {
    // Двигаем всю сцену в противоположном направлении от камеры
    stage.x = -this.x;
    stage.y = -this.y;
    
    // Компенсируем движение для UI элементов (если есть)
    if (uiContainer) {
      uiContainer.x = this.x;
      uiContainer.y = this.y;
    }
  }
  
  /**
   * Получение информации о камере для дебага
   */
  getInfo() {
    return {
      position: `${this.x.toFixed(0)}, ${this.y.toFixed(0)}`,
      bounds: `${this.bounds.maxX}×${this.bounds.maxY}`,
      viewport: `${this.canvasWidth}×${this.canvasHeight}`,
      world: this.world.type,
      canMove: this.bounds.maxX > 0 || this.bounds.maxY > 0
    };
  }
  
  /**
   * Проверка, может ли камера двигаться
   */
  canMove() {
    return this.bounds.maxX > 0 || this.bounds.maxY > 0;
  }
  
  /**
   * Обновление границ камеры (если мир изменился)
   */
  updateBounds(world) {
    this.world = world;
    this.bounds = this._calculateBounds();
    
    // Проверяем что текущая позиция камеры в допустимых границах
    this.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, this.x));
    this.y = Math.max(this.bounds.minY, Math.min(this.bounds.maxY, this.y));
  }
}