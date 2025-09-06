import * as PIXI from 'pixi.js';

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

      // 📱 Тип контроллера: 'keyboard' | 'touch'
      controlType: options.controlType || 'keyboard',
      touch: {
        mode: options.touch?.mode || 'dynamic', // 'dynamic' | 'static'
        staticX: options.touch?.staticX || 80,
        staticY: options.touch?.staticY || 520,
        radius: options.touch?.radius || 60,
        innerRadius: options.touch?.innerRadius || 28,
        showJoystick: options.touch?.showJoystick !== false
      },
      
      ...options.settings
    };
    
    // 🎯 Состояние
    this.pressedKeys = new Set();
    this.lastMoveTime = 0;
    this.currentSpeed = this.settings.moveSpeed;
    
    // 🖱️ Позиция мыши в мировых координатах
    this._mouseWorld = { x: 0, y: 0 };
    this._lastPointerCanvas = { x: 0, y: 0 };
    
    // 📋 Карта клавиш
    this.keyMap = this._createKeyMap();
    
    //console.log('🎮 EntityController создан');
    
    // 🎯 Запуск если включен
    if (this.isEnabled) {
      this.enable();
    }

    // 📱 Состояние тач-джойстика
    this._touchActive = false;
    this._touchCenter = { x: 0, y: 0 };
    this._touchVector = { x: 0, y: 0 };
    this._joystickOuter = null;
    this._joystickInner = null;
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
    // Всегда добавляем клавиатурные слушатели, чтобы Tab работал даже в touch-режиме
    this._addEventListeners();
    if (this.settings.controlType === 'touch' || this.settings.controlType === 'both') {
      this._setupTouchControls();
    }
    //console.log('✅ EntityController включен');
  }
  
  /**
   * ❌ Выключить контроллер
   */
  disable() {
    if (!this.isEnabled) return;
    
    this.isEnabled = false;
    this._removeEventListeners();
    this._teardownTouchControls();
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

    // 🖱️ Отслеживание курсора для поворота 'mouse'
    const app = this.game?.mainApp;
    if (app?.stage && !this._onPointerMoveStage) {
      this._onPointerMoveStage = (e) => {
        const p = e.global; // canvas coords
        this._lastPointerCanvas.x = p.x;
        this._lastPointerCanvas.y = p.y;
        const cam = this.game?.getSelectedCamera?.();
        if (cam && cam.screenToWorld) {
          const world = cam.screenToWorld(p.x, p.y);
          this._mouseWorld.x = world.x;
          this._mouseWorld.y = world.y;
        }
      };
      app.stage.on('pointermove', this._onPointerMoveStage);
    }
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
    const app = this.game?.mainApp;
    if (app?.stage && this._onPointerMoveStage) {
      app.stage.off('pointermove', this._onPointerMoveStage);
      this._onPointerMoveStage = null;
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
    
    // 📍 Движение - можем зажимать (фактическое движение выполняется в тикере с dt)
    if (action.startsWith('move_')) {
      this.pressedKeys.add(action);
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
  _executeAction(action, dtMs = 16.67) {
    if (this.controlledEntities.size === 0) {
      return; // Нет привязанных сущностей
    }
    const frameFactor = Math.max(0, dtMs) / 16.67;
    
    switch (action) {
      case 'move_up':
        this._moveEntities(0, -this.currentSpeed * frameFactor);
        break;
      case 'move_down':
        this._moveEntities(0, this.currentSpeed * frameFactor);
        break;
      case 'move_left':
        this._moveEntities(-this.currentSpeed * frameFactor, 0);
        break;
      case 'move_right':
        this._moveEntities(this.currentSpeed * frameFactor, 0);
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
      // Если сущность поддерживает actions.walking — выставляем флаг на основе намерения движения
      if (entity && entity.actions && Object.prototype.hasOwnProperty.call(entity.actions, 'walking')) {
        const intendedSpeed = Math.hypot(deltaX, deltaY);
        entity.actions.walking = intendedSpeed > 0.0001;
      }
      this._moveEntity(entity, deltaX, deltaY);
    });
  }
  
  /**
   * 📍 Двигать конкретную сущность
   */
  _moveEntity(entity, deltaX, deltaY) {
    if (!entity || entity.isDead) return; // 💀 Мертвые не двигаются
    
    // 📊 Применяем скорость из характеристик сущности
    if (entity.stats && entity.stats.getSpeed) {
      const entitySpeed = entity.stats.getSpeed();
      const speedMultiplier = entitySpeed / this.settings.moveSpeed; // Нормализуем к базовой скорости
      deltaX *= speedMultiplier;
      deltaY *= speedMultiplier;
    }
    
    // 🎯 Обновляем поворот по направлению движения
    entity.updateRotationFromMovement(deltaX, deltaY);
    
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
    
    // Мгновенная проверка коллизий больше не нужна - урон наносится в _checkEntityCollisions
    
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
    const dtMs = ticker.deltaMS;
    
    // Проверяем что прошло достаточно времени для движения (16ms = ~60fps)
    if (currentTime - this.lastMoveTime >= 16) {
      
      // Обновляем скорость на случай изменения модификаторов
      this._updateSpeed();
      // Определяем намерение движения (клавиатура/тач)
      let intendMove = false;
      if (this.settings.controlType === 'keyboard' || this.settings.controlType === 'both') {
        for (const action of this.pressedKeys) {
          if (action.startsWith('move_')) { intendMove = true; break; }
        }
      }
      if (!intendMove && (this.settings.controlType === 'touch' || this.settings.controlType === 'both')) {
        if (this._touchActive) {
          const len = Math.hypot(this._touchVector.x, this._touchVector.y);
          if (len > 0.001) intendMove = true;
        }
      }
      // Применяем к actions.walking и обновляем клипы, если сущность это поддерживает
      const allEntities = this.getControlledEntities();
      for (const entity of allEntities) {
        if (!entity) continue;
        if (entity.actions && Object.prototype.hasOwnProperty.call(entity.actions, 'walking')) {
          entity.actions.walking = intendMove;
          if (typeof entity._updateMovementAnimation === 'function') {
            entity._updateMovementAnimation(0, 0);
          }
        }
      }
      
      if (this.settings.controlType === 'touch' || this.settings.controlType === 'both') {
        // Аналоговое движение по вектору тача
        if (this._touchActive) {
          const frameFactor = Math.max(0, dtMs) / 16.67;
          const deltaX = this._touchVector.x * this.currentSpeed * frameFactor;
          const deltaY = this._touchVector.y * this.currentSpeed * frameFactor;
          this._moveEntities(deltaX, deltaY);
        }
      }
      if (this.settings.controlType === 'keyboard' || this.settings.controlType === 'both') {
        // Обрабатываем все нажатые клавиши движения
        for (const action of this.pressedKeys) {
          if (action.startsWith('move_')) {
            this._executeAction(action, dtMs);
          }
        }
      }

      // 🎯 Поворот по мыши для сущностей с rotationBehavior='mouse'
      const cam = this.game?.getSelectedCamera?.();
      // Если нет камеры, используем последнюю canvas координату как world
      const targetX = cam && cam.screenToWorld ? cam.screenToWorld(this._lastPointerCanvas.x, this._lastPointerCanvas.y).x : this._mouseWorld.x;
      const targetY = cam && cam.screenToWorld ? cam.screenToWorld(this._lastPointerCanvas.x, this._lastPointerCanvas.y).y : this._mouseWorld.y;
      const entities = this.getControlledEntities();
      for (const entity of entities) {
        if (!entity || entity.isDead) continue;
        if (entity.rotationBehavior !== 'mouse') continue;

        // 🪞 Режим зеркала для мыши: не вращаем сущность, только отражаем относительно оси
        if (entity.typeRotate === 'mirror' && entity.mirrorMouse !== false) {
          const dx = targetX - entity.x;
          const dy = targetY - entity.y;
          const dead = Math.max(0, entity.mirrorMouseDeadzone || 0);
          let shouldMirror = entity.isMirrored;
          if (entity.mirrorAxis === 'y') {
            if (Math.abs(dx) > dead) shouldMirror = dx < 0;
          } else { // 'x'
            if (Math.abs(dy) > dead) shouldMirror = dy > 0; // вниз = зеркало, вверх = обычный
          }
          if (shouldMirror !== entity.isMirrored) {
            const old = entity.isMirrored;
            entity.isMirrored = shouldMirror;
            if (entity.rotateChildren && old !== shouldMirror) {
              entity.rotateChildrenBy(0, true);
              entity.updateChildrenPositions();
            }
          }
          // Отдельно: vision может следовать мыши, даже если тело не крутится
          if (entity.visionFollowMouseInMirror !== false) {
            this._rotateVisionChildrenTowards(entity, targetX, targetY);
          }
          continue; // саму сущность не вращаем
        }

        // Обычный поворот на мышь
        this._rotateEntityTowards(entity, targetX, targetY, dtMs);
      }
      
      this.lastMoveTime = currentTime;
    }
  }

  _rotateEntityTowards(entity, targetX, targetY, dtMs) {
    const dx = targetX - entity.x;
    const dy = targetY - entity.y;
    const targetAngleWorld = Math.atan2(dy, dx);

    const rotationOffset = entity.rotationOffset || 0;
    const vision = entity.vision || {};
    const directionOffset = (vision.directionOffsetRad !== undefined)
      ? vision.directionOffsetRad
      : ((vision.directionOffsetDeg || 0) * Math.PI / 180);
    const desiredRotation = targetAngleWorld + rotationOffset - directionOffset;

    const before = entity.rotation || 0;
    let delta = desiredRotation - before;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;

    // Скорость поворота
    const statsRot = entity.stats?.getRotationSpeed ? entity.stats.getRotationSpeed() : null;
    const speed = (statsRot != null) ? statsRot : (entity.rotationSpeed || 0.2);
    const timeFactor = Math.max(0, dtMs) / 16.67;
    const maxStep = Math.max(0, speed * timeFactor);
    const step = Math.sign(delta) * Math.min(Math.abs(delta), maxStep);
    entity.rotation = before + step;

    // Нормализация
    while (entity.rotation > Math.PI) entity.rotation -= 2 * Math.PI;
    while (entity.rotation < -Math.PI) entity.rotation += 2 * Math.PI;

    if (entity.rotateChildren && step !== 0 && entity.rotateChildrenBy) {
      entity.rotateChildrenBy(step);
      if (entity.updateChildrenPositions) entity.updateChildrenPositions();
    }
  }

  _rotateVisionChildrenTowards(entity, targetX, targetY) {
    if (!entity?.world || entity.children.size === 0) return;
    for (const childId of entity.children) {
      const child = entity.world.getEntity(childId);
      if (!child || child.type !== 'vision') continue;
      const dx = targetX - child.x;
      const dy = targetY - child.y;
      let desired = Math.atan2(dy, dx);
      const baseAngle = (child.visual && (child.visual.baseAngle != null)) ? child.visual.baseAngle : 0;
      // Компенсируем baseAngle, чтобы сектор геометрически смотрел на курсор
      desired -= baseAngle;
      // Нормализация
      while (desired > Math.PI) desired -= 2 * Math.PI;
      while (desired < -Math.PI) desired += 2 * Math.PI;
      child.rotation = desired;
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
    // 📱 Переключение типа контроллера на лету
    if (newSettings.controlType || newSettings.touch) {
      this._teardownTouchControls();
      if (this.settings.controlType === 'touch' || this.settings.controlType === 'both') {
        this._setupTouchControls();
      }
    }
    
    //console.log('⚙️ EntityController настройки обновлены:', newSettings);
  }

  /**
   * 📱 Инициализация тач-джойстика
   */
  _setupTouchControls() {
    const app = this.game?.mainApp;
    if (!app || !app.stage) return;
    const stage = app.stage;
    stage.eventMode = 'static';
    
    this._onPointerDown = (e) => {
      const p = e.global;
      if (this.settings.touch.mode === 'dynamic') {
        this._touchCenter.x = p.x;
        this._touchCenter.y = p.y;
      } else {
        this._touchCenter.x = this.settings.touch.staticX;
        this._touchCenter.y = this.settings.touch.staticY;
      }
      this._touchActive = true;
      this._updateJoystickVisual(p.x, p.y, true);
    };
    this._onPointerMove = (e) => {
      if (!this._touchActive) return;
      const p = e.global;
      const dx = p.x - this._touchCenter.x;
      const dy = p.y - this._touchCenter.y;
      const r = this.settings.touch.radius;
      const len = Math.hypot(dx, dy) || 1;
      const clamped = Math.min(len, r);
      const nx = dx / len;
      const ny = dy / len;
      this._touchVector.x = (clamped / r) * nx; // от -1..1
      this._touchVector.y = (clamped / r) * ny;
      this._updateJoystickVisual(this._touchCenter.x + nx * clamped, this._touchCenter.y + ny * clamped, true);
    };
    this._onPointerUp = () => {
      this._touchActive = false;
      this._touchVector.x = 0; this._touchVector.y = 0;
      this._updateJoystickVisual(0, 0, false);
    };
    stage.on('pointerdown', this._onPointerDown);
    stage.on('pointermove', this._onPointerMove);
    stage.on('pointerup', this._onPointerUp);
    stage.on('pointerupoutside', this._onPointerUp);
  }

  _teardownTouchControls() {
    const app = this.game?.mainApp;
    if (app?.stage) {
      const stage = app.stage;
      if (this._onPointerDown) stage.off('pointerdown', this._onPointerDown);
      if (this._onPointerMove) stage.off('pointermove', this._onPointerMove);
      if (this._onPointerUp) stage.off('pointerup', this._onPointerUp);
      if (this._onPointerUp) stage.off('pointerupoutside', this._onPointerUp);
    }
    if (this._joystickOuter) { try { this._joystickOuter.destroy(); } catch(_) {} this._joystickOuter = null; }
    if (this._joystickInner) { try { this._joystickInner.destroy(); } catch(_) {} this._joystickInner = null; }
  }

  _updateJoystickVisual(innerX, innerY, visible) {
    if (!this.settings.touch.showJoystick) return;
    const app = this.game?.mainApp;
    if (!app || !app.stage) return;
    if (!this._joystickOuter) {
      const g1 = new PIXI.Graphics();
      const g2 = new PIXI.Graphics();
      app.stage.addChild(g1);
      app.stage.addChild(g2);
      this._joystickOuter = g1;
      this._joystickInner = g2;
    }
    const r = this.settings.touch.radius;
    const ir = this.settings.touch.innerRadius;
    this._joystickOuter.clear();
    this._joystickInner.clear();
    if (!visible) return;
    // Внешний круг
    this._joystickOuter.circle(this._touchCenter.x, this._touchCenter.y, r);
    this._joystickOuter.stroke({ color: 0xffffff, width: 2, alpha: 0.5 });
    // Внутренний круг (ручка)
    this._joystickInner.circle(innerX, innerY, ir);
    this._joystickInner.fill({ color: 0xffffff, alpha: 0.3 });
  }
  
  /**
   * 🎯 Проверить блокирующие коллизии для сущности в текущей позиции
   */
  _checkEntityCollisions(entity) {
    if (!entity?.collision?.enabled || !entity.world?.collisionSystem || entity.isDead) {
      return false; // 💀 Мертвые сущности не проверяют коллизии
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
      
      const collisionResult = collisionSystem._detectCollision(entity, otherEntity);
      if (hasRule && collisionResult.colliding) {
        
        // 🔒 ПРОВЕРЯЕМ: Это новая коллизия или продолжение старой?
        const collisionKey = collisionSystem._getCollisionKey(entity, otherEntity);
        const wasColliding = collisionSystem.activeCollisions.has(collisionKey);
        
        if (!wasColliding) {
          // 📡 НОВАЯ КОЛЛИЗИЯ: Генерируем событие enter (с уроном)
          const eventName = collisionSystem.collisionRules.get(ruleKey);
          
          // Добавляем в активные коллизии
          collisionSystem.activeCollisions.add(collisionKey);
          
          // 🛡️ Устанавливаем флаг что событие из EntityController 
          collisionSystem._calledFromEntityController = true;
          collisionSystem._checkCombatDamage(entity, otherEntity); // Наносим урон ОДИН раз
          collisionSystem._emitCollisionEvent(`${eventName}_enter`, entity, otherEntity, collisionResult);
          collisionSystem._calledFromEntityController = false;
          
          console.log(`🆕 НОВАЯ КОЛЛИЗИЯ: ${entity.name} ↔ ${otherEntity.name}`);
        } else {
          console.log(`🔄 ПРОДОЛЖЕНИЕ: ${entity.name} ↔ ${otherEntity.name} (урон НЕ наносится)`);
        }
        
        // 🎯 Проверяем тип коллизии - блокируем только 'block' с 'block'
        const entityCollisionType = entity.collision.collisionType || 'block';
        const otherCollisionType = otherEntity.collision.collisionType || 'block';
        
        // Блокируем только если ОБЕ коллизии типа 'block' (триггеры не блокируют)
        if (entityCollisionType === 'block' && otherCollisionType === 'block') {
          console.log(`🚫 EntityController БЛОК: ${entity.name} ↔ ${otherEntity.name}`);
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
