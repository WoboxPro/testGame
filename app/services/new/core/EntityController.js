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
    
    // 🎯 Привязанные сущности
    this.controlledEntities = new Map(); // id -> Entity
    this.activeEntityId = null;          // ID активной сущности для переключения
    
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
      
      // 🎮 Режимы управления множественными сущностями
      controlMode: options.controlMode || 'all',   // 'all' (все сразу) | 'single' (по одной)
      
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
    
    //console.log('🎮 EntityController создан');
    
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
    
    // Переключение между сущностями
    keyMap['Tab'] = 'switch_entity';
    
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
    
    // 🔍 Проверяем не привязана ли уже эта сущность
    if (this.controlledEntities.has(entity.id)) {
      //console.log(`🎮 Сущность ${entity.name} уже привязана к контроллеру`);
      return true;
    }
    
    // ➕ Добавляем сущность в коллекцию
    this.controlledEntities.set(entity.id, entity);
    
    // 🎯 Устанавливаем как активную если первая
    if (!this.activeEntityId) {
      this.activeEntityId = entity.id;
    }
    
    // 🔗 Устанавливаем обратную связь
    if (entity.controller !== this) {
      entity.controller = this;
    }
    
    //console.log(`🎮 EntityController привязан к сущности: ${entity.name} (${entity.id}). Всего управляемых: ${this.controlledEntities.size}`);
    return true;
  }
  
  /**
   * 🚫 Отвязать контроллер от сущности (конкретной или всех)
   */
  detachFromEntity(entityId = null) {
    if (entityId) {
      // 🎯 Отвязываем конкретную сущность
      const entity = this.controlledEntities.get(entityId);
      if (entity) {
        //console.log(`🚫 EntityController отвязан от сущности: ${entity.name}`);
        
        // 🧹 Очищаем обратную связь
        if (entity.controller === this) {
          entity.controller = null;
        }
        
        this.controlledEntities.delete(entityId);
        
        // 🎯 Если это была активная сущность, переключаемся на первую доступную
        if (this.activeEntityId === entityId) {
          const firstEntity = this.controlledEntities.values().next().value;
          this.activeEntityId = firstEntity ? firstEntity.id : null;
        }
        
        return true;
      }
    } else {
      // 🧹 Отвязываем все сущности
      this.controlledEntities.forEach(entity => {
        //console.log(`🚫 EntityController отвязан от сущности: ${entity.name}`);
        if (entity.controller === this) {
          entity.controller = null;
        }
      });
      
      this.controlledEntities.clear();
      this.activeEntityId = null;
      return true;
    }
    
    return false;
  }
  
  /**
   * 🎯 Получить активную сущность
   */
  getActiveEntity() {
    return this.activeEntityId ? this.controlledEntities.get(this.activeEntityId) : null;
  }
  
  /**
   * 🎯 Получить все управляемые сущности
   */
  getControlledEntities() {
    return Array.from(this.controlledEntities.values());
  }
  
  /**
   * 🔄 Переключиться на следующую сущность
   */
  switchToNextEntity() {
    if (this.controlledEntities.size <= 1) {
      return; // Нечего переключать
    }
    
    const entitiesArray = Array.from(this.controlledEntities.values());
    const currentIndex = entitiesArray.findIndex(entity => entity.id === this.activeEntityId);
    const nextIndex = (currentIndex + 1) % entitiesArray.length;
    
    this.activeEntityId = entitiesArray[nextIndex].id;
    //console.log(`🔄 Переключение на сущность: ${entitiesArray[nextIndex].name}`);
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
    //console.log('✅ EntityController включен');
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
    //console.log('❌ EntityController выключен');
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
    // 🔄 Переключение сущностей
    else if (action === 'switch_entity') {
      this.switchToNextEntity();
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
    if (this.controlledEntities.size === 0) {
      return; // Нет привязанных сущностей
    }
    
    switch (action) {
      case 'move_up':
        this._moveEntities(0, -this.currentSpeed);
        break;
      case 'move_down':
        this._moveEntities(0, this.currentSpeed);
        break;
      case 'move_left':
        this._moveEntities(-this.currentSpeed, 0);
        break;
      case 'move_right':
        this._moveEntities(this.currentSpeed, 0);
        break;
    }
  }
  
  /**
   * 📍 Двигать сущности (в зависимости от режима управления)
   */
  _moveEntities(deltaX, deltaY) {
    if (this.controlledEntities.size === 0) return;
    
    // 🎯 Определяем какие сущности двигать
    let entitiesToMove = [];
    
    if (this.settings.controlMode === 'all') {
      // 🌍 Двигаем все управляемые сущности
      entitiesToMove = Array.from(this.controlledEntities.values());
    } else if (this.settings.controlMode === 'single') {
      // 🎯 Двигаем только активную сущность
      const activeEntity = this.getActiveEntity();
      if (activeEntity) {
        entitiesToMove = [activeEntity];
      }
    }
    
    // 📍 Перемещаем выбранные сущности
    entitiesToMove.forEach(entity => {
      this._moveEntity(entity, deltaX, deltaY);
    });
  }
  
  /**
   * 📍 Двигать конкретную сущность
   */
  _moveEntity(entity, deltaX, deltaY) {
    if (!entity) return;
    
    // 🎯 Получаем предполагаемую новую позицию
    let newX = entity.x + deltaX;
    let newY = entity.y + deltaY;
    
    // 🎯 НОВИНКА: Проверяем коллизии заранее
    if (entity.collision?.enabled && entity.world?.collisionSystem) {
      // Временно устанавливаем новую позицию для проверки
      const oldX = entity.x;
      const oldY = entity.y;
      entity.x = newX;
      entity.y = newY;
      
      // Проверяем будут ли коллизии
      const wouldCollide = this._checkEntityCollisions(entity);
      
      // Возвращаем старую позицию
      entity.x = oldX;
      entity.y = oldY;
      
      // Если будет коллизия - блокируем движение
      if (wouldCollide) {
        console.log(`🚫 EntityController: Движение заблокировано для ${entity.name} - коллизия впереди`);
        return;
      }
    }
    
    // 🎯 Проверяем границы мира если включено
    if (this.settings.respectEntityBounds && entity.world) {
      const world = entity.world;
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
      //console.log('🔮 Использование параметров движения сущности (пока не реализовано)');
    }
    
    // 📍 Устанавливаем новую позицию
    entity.setPosition(newX, newY);
    
    // 🌍 Обновляем позицию в системе биомов
    if (entity.world && entity.world.biomeSystem) {
      entity.world.updateEntityPosition(entity, newX, newY);
    }
    
    // 📍 Убираем логи движения - слишком много спама
    // if (this.settings.controlMode === 'single' || entity.id === this.activeEntityId) {
    //   console.log(`📍 ${entity.name} перемещена в (${newX.toFixed(1)}, ${newY.toFixed(1)})`);
    // }
  }
  
  /**
   * 🎯 Обновление через PIXI ticker
   */
  _updateFromTicker(ticker) {
    if (!this.isEnabled || this.controlledEntities.size === 0) return;
    
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
    
    //console.log('⚙️ EntityController настройки обновлены:', newSettings);
  }
  
  /**
   * 🎯 Проверить блокирующие коллизии для сущности в текущей позиции
   */
  _checkEntityCollisions(entity) {
    if (!entity?.collision?.enabled || !entity.world?.collisionSystem) {
      return false;
    }
    
    const collisionSystem = entity.world.collisionSystem;
    const entities = entity.world.getAllEntities();
    const entitiesWithCollision = entities.filter(e => 
      e.collision?.enabled && 
      e.id !== entity.id // Исключаем саму сущность
    );
    
    // Проверяем коллизии с другими сущностями
    for (const otherEntity of entitiesWithCollision) {
      const ruleKey = collisionSystem._getRuleKey(entity.collision.name, otherEntity.collision.name);
      const hasRule = collisionSystem.collisionRules.has(ruleKey);
      
      if (hasRule && collisionSystem._detectCollision(entity, otherEntity)) {
        // 🎯 НОВИНКА: Проверяем тип коллизии - блокируем только 'block'
        const entityCollisionType = entity.collision.collisionType || 'block';
        const otherCollisionType = otherEntity.collision.collisionType || 'block';
        
        // Блокируем только если хотя бы одна коллизия типа 'block'
        if (entityCollisionType === 'block' || otherCollisionType === 'block') {
          return true; // Найдена блокирующая коллизия
        }
      }
    }
    
    return false; // Блокирующих коллизий нет
  }
  
  /**
   * 📊 Получить информацию о контроллере
   */
  getInfo() {
    return {
      enabled: this.isEnabled,
      controlledEntitiesCount: this.controlledEntities.size,
      controlledEntityIds: Array.from(this.controlledEntities.keys()),
      activeEntityId: this.activeEntityId,
      activeEntityName: this.getActiveEntity()?.name || null,
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
    //console.log('🧹 Уничтожение EntityController...');
    this.disable();
    this.detachFromEntity(); // Отвязываем все сущности
    this.game = null;
    //console.log('✅ EntityController уничтожен');
  }
}
