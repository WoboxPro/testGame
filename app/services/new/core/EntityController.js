/**
 * 🎮 EntityController - Контроллер управления сущностями
 * 
 * Управление через клавиши:
 * - WASD или стрелки - движение сущности
 * - Shift - ускорение
 * - Ctrl - замедление
 */

export class EntityController {
  constructor(game, options = {}) {
    this.game = game;
    this.isEnabled = options.enabled !== false;
    
    // 🎯 Привязанная сущность
    this.controlledEntity = null;
    
    // ⚙️ Настройки управления
    this.settings = {
      // 📍 Движение сущности
      moveSpeed: options.moveSpeed || 2,           // Базовая скорость движения
      fastSpeedMultiplier: options.fastSpeedMultiplier || 2.0,   // Множитель для Shift
      slowSpeedMultiplier: options.slowSpeedMultiplier || 0.3,   // Множитель для Ctrl
      smoothMove: options.smoothMove !== false,    // Плавное движение
      
      // 🎯 Параметры движения сущности (заготовка)
      useEntityMovementParams: options.useEntityMovementParams || false, // Пока false
      respectEntityBounds: options.respectEntityBounds !== false,        // Учитывать границы мира
      
      // 🎹 Раскладка клавиш
      keyLayout: options.keyLayout || 'wasd',      // 'wasd' | 'arrows' | 'both'
      
      ...options.settings
    };
    
    // 🎯 Состояние
    this.pressedKeys = new Set();
    this.lastMoveTime = 0;
    this.currentSpeed = this.settings.moveSpeed;
    
    // 📋 Карта клавиш
    this.keyMap = this._createKeyMap();
    
    console.log('🎮 EntityController создан');
    
    // 🎯 Запуск если включен
    if (this.isEnabled) {
      this.enable();
    }
  }
  
  /**
   * 🎹 Создать карту клавиш в зависимости от раскладки
   */
  _createKeyMap() {
    const keyMap = {};
    
    if (this.settings.keyLayout === 'wasd' || this.settings.keyLayout === 'both') {
      // WASD раскладка
      keyMap['KeyW'] = 'move_up';
      keyMap['KeyS'] = 'move_down';
      keyMap['KeyA'] = 'move_left';
      keyMap['KeyD'] = 'move_right';
    }
    
    if (this.settings.keyLayout === 'arrows' || this.settings.keyLayout === 'both') {
      // Стрелки
      keyMap['ArrowUp'] = 'move_up';
      keyMap['ArrowDown'] = 'move_down';
      keyMap['ArrowLeft'] = 'move_left';
      keyMap['ArrowRight'] = 'move_right';
    }
    
    // Модификаторы
    keyMap['ShiftLeft'] = 'speed_fast';
    keyMap['ShiftRight'] = 'speed_fast';
    keyMap['ControlLeft'] = 'speed_slow';
    keyMap['ControlRight'] = 'speed_slow';
    
    return keyMap;
  }
  
  /**
   * 🎯 Привязать контроллер к сущности
   */
  attachToEntity(entity) {
    if (!entity) {
      console.warn('🎮 Попытка привязать контроллер к несуществующей сущности');
      return false;
    }
    
    // 🧹 Отвязываемся от предыдущей сущности
    if (this.controlledEntity) {
      this.detachFromEntity();
    }
    
    this.controlledEntity = entity;
    
    // 🔗 Устанавливаем обратную связь
    if (entity.controller !== this) {
      entity.controller = this;
    }
    
    console.log(`🎮 EntityController привязан к сущности: ${entity.name} (${entity.id})`);
    return true;
  }
  
  /**
   * 🚫 Отвязать контроллер от сущности
   */
  detachFromEntity() {
    if (this.controlledEntity) {
      console.log(`🚫 EntityController отвязан от сущности: ${this.controlledEntity.name}`);
      
      // 🧹 Очищаем обратную связь
      if (this.controlledEntity.controller === this) {
        this.controlledEntity.controller = null;
      }
      
      this.controlledEntity = null;
    }
  }
  
  /**
   * ✅ Включить контроллер
   */
  enable() {
    if (this.isEnabled && this.keyDownHandler) {
      return;
    }
    
    this.isEnabled = true;
    this._addEventListeners();
    console.log('✅ EntityController включен');
  }
  
  /**
   * ❌ Выключить контроллер
   */
  disable() {
    if (!this.isEnabled) return;
    
    this.isEnabled = false;
    this._removeEventListeners();
    this.pressedKeys.clear();
    this.currentSpeed = this.settings.moveSpeed;
    console.log('❌ EntityController выключен');
  }
  
  /**
   * 🎯 Переключить состояние
   */
  toggle() {
    if (this.isEnabled) {
      this.disable();
    } else {
      this.enable();
    }
  }
  
  /**
   * 🎧 Добавить обработчики событий
   */
  _addEventListeners() {
    this.keyDownHandler = (event) => this._handleKeyDown(event);
    this.keyUpHandler = (event) => this._handleKeyUp(event);
    
    document.addEventListener('keydown', this.keyDownHandler);
    document.addEventListener('keyup', this.keyUpHandler);
  }
  
  /**
   * 🎧 Удалить обработчики событий
   */
  _removeEventListeners() {
    if (this.keyDownHandler) {
      document.removeEventListener('keydown', this.keyDownHandler);
    }
    if (this.keyUpHandler) {
      document.removeEventListener('keyup', this.keyUpHandler);
    }
  }
  
  /**
   * ⌨️ Обработка нажатия клавиши
   */
  _handleKeyDown(event) {
    const action = this.keyMap[event.code];
    if (!action) {
      return;
    }
    
    // 🚫 Предотвращаем default поведение для наших клавиш
    event.preventDefault();
    
    // 📍 Движение - можем зажимать
    if (action.startsWith('move_')) {
      this.pressedKeys.add(action);
      this._executeAction(action);
    } 
    // ⚡ Модификаторы скорости
    else if (action.startsWith('speed_')) {
      this.pressedKeys.add(action);
      this._updateSpeed();
    }
  }
  
  /**
   * ⌨️ Обработка отпускания клавиши
   */
  _handleKeyUp(event) {
    const action = this.keyMap[event.code];
    if (!action) return;
    
    // 📍 Перестаем двигаться или изменять скорость
    if (action.startsWith('move_') || action.startsWith('speed_')) {
      this.pressedKeys.delete(action);
      
      if (action.startsWith('speed_')) {
        this._updateSpeed();
      }
    }
  }
  
  /**
   * ⚡ Обновить текущую скорость на основе модификаторов
   */
  _updateSpeed() {
    let speed = this.settings.moveSpeed;
    
    // 🔍 Проверяем модификаторы
    if (this.pressedKeys.has('speed_fast')) {
      speed *= this.settings.fastSpeedMultiplier;
    } else if (this.pressedKeys.has('speed_slow')) {
      speed *= this.settings.slowSpeedMultiplier;
    }
    
    this.currentSpeed = speed;
  }
  
  /**
   * ⚡ Выполнить действие
   */
  _executeAction(action) {
    if (!this.controlledEntity) {
      return; // Нет привязанной сущности
    }
    
    switch (action) {
      case 'move_up':
        this._moveEntity(0, -this.currentSpeed);
        break;
      case 'move_down':
        this._moveEntity(0, this.currentSpeed);
        break;
      case 'move_left':
        this._moveEntity(-this.currentSpeed, 0);
        break;
      case 'move_right':
        this._moveEntity(this.currentSpeed, 0);
        break;
    }
  }
  
  /**
   * 📍 Двигать сущность
   */
  _moveEntity(deltaX, deltaY) {
    if (!this.controlledEntity) return;
    
    // 🎯 Получаем текущую позицию
    let newX = this.controlledEntity.x + deltaX;
    let newY = this.controlledEntity.y + deltaY;
    
    // 🎯 Проверяем границы мира если включено
    if (this.settings.respectEntityBounds && this.controlledEntity.world) {
      const world = this.controlledEntity.world;
      if (world.bounds) {
        newX = Math.max(world.bounds.left, Math.min(world.bounds.right, newX));
        newY = Math.max(world.bounds.top, Math.min(world.bounds.bottom, newY));
      }
    }
    
    // 🎯 ЗАГОТОВКА: Использование параметров движения сущности
    if (this.settings.useEntityMovementParams) {
      // TODO: Здесь можно учитывать:
      // - entity.movementSpeed
      // - entity.movementType (walk, fly, swim)
      // - entity.movementRestrictions
      // - entity.stamina/energy для движения
      console.log('🔮 Использование параметров движения сущности (пока не реализовано)');
    }
    
    // 📍 Устанавливаем новую позицию
    this.controlledEntity.setPosition(newX, newY);
    
    console.log(`📍 Сущность ${this.controlledEntity.name} перемещена в (${newX.toFixed(1)}, ${newY.toFixed(1)})`);
  }
  
  /**
   * 🎯 Обновление через PIXI ticker
   */
  _updateFromTicker(ticker) {
    if (!this.isEnabled || !this.controlledEntity) return;
    
    const currentTime = ticker.lastTime;
    
    // Проверяем что прошло достаточно времени для движения (16ms = ~60fps)
    if (currentTime - this.lastMoveTime >= 16) {
      
      // Обновляем скорость на случай изменения модификаторов
      this._updateSpeed();
      
      // Обрабатываем все нажатые клавиши движения
      for (const action of this.pressedKeys) {
        if (action.startsWith('move_')) {
          this._executeAction(action);
        }
      }
      
      this.lastMoveTime = currentTime;
    }
  }
  
  /**
   * ⚙️ Изменить настройки
   */
  updateSettings(newSettings) {
    this.settings = {
      ...this.settings,
      ...newSettings
    };
    
    // 🎹 Пересоздаем карту клавиш если изменилась раскладка
    if (newSettings.keyLayout) {
      this.keyMap = this._createKeyMap();
    }
    
    console.log('⚙️ EntityController настройки обновлены:', newSettings);
  }
  
  /**
   * 📊 Получить информацию о контроллере
   */
  getInfo() {
    return {
      enabled: this.isEnabled,
      controlledEntity: this.controlledEntity?.id || null,
      currentSpeed: this.currentSpeed,
      pressedKeys: Array.from(this.pressedKeys),
      settings: this.settings,
      keyMap: this.keyMap
    };
  }
  
  /**
   * 🧹 Уничтожить контроллер
   */
  destroy() {
    console.log('🧹 Уничтожение EntityController...');
    this.disable();
    this.detachFromEntity();
    this.game = null;
    console.log('✅ EntityController уничтожен');
  }
}
