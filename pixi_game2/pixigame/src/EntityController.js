/**
 * 🎮 EntityController - Контроллер для управления игровыми сущностями
 *
 * Поддерживает:
 * - Движение через velocity (вектор скорости)
 * - Плавное ускорение/торможение
 * - Переключение активной сущности
 * - Первичные и вторичные клавиши для каждого действия
 * - ECS совместимость (работает с world.entities Map)
 *
 * Система движения:
 * - WASD → меняет velocity
 * - update() → применяет velocity к позиции
 * - friction → плавное торможение
 */

import { Controller } from './Controller.js';
import { timeSystem } from './TimeSystem.js';
import { inputSystem } from './input/InputSystem.js';

export class EntityController extends Controller {
  constructor(options = {}) {
    super({
      ...options,
      type: 'entity'
    });

    // Тип ввода: 'keyboard' | 'touch'
    this.inputType = options.inputType || 'keyboard';

    // Rotation behavior override for this controller:
    // null -> use entity.rotationBehavior (if present), else 'none'
    // allowed: 'none' | 'move' | 'mouse'
    this.rotationMode = options.rotationMode ?? null;
    // Camera (or getter) used only for rotationMode='mouse'
    this.aimCamera = options.aimCamera ?? null; // Camera | (() => Camera|null) | null

    // Привязка клавиш (только для keyboard)
    this.bindings = options.bindings || this._getDefaultBindings();

    // 🎮 KeyActions - кастомные действия для слотов (muzzle и т.д.)
    // Map<actionName, keyCode> например: { "fire": "KeyF", "left_hand": "Mouse1" }
    this.keyActions = options.keyActions || {};

    // 🎮 Глобальный массив всех KeyActions (из UI) для поиска defaultKey
    // Array<{id, name, displayName, description, defaultKey}>
    this.allKeyActions = options.allKeyActions || [];

    // Состояние нажатых клавиш
    this._pressedKeys = new Set();

    // Состояние нажатых кнопок мыши для KeyActions
    this._pressedMouseButtons = new Set();

    // Ссылка на все сущности (для переключения)
    this.allEntities = options.allEntities || [];

    // Настройки touch ввода
    this.touchConfig = options.touchConfig || null;

    // Если keyboard ввод, настраиваем автоматическую подписку на события
    if (this.inputType === 'keyboard') {
      this._setupKeyboardControls();
    }

    // Mouse tracking (only useful for keyboard + rotationMode='mouse')
    this._mouseScreen = { x: 0, y: 0 };
    this._mouseMoveHandler = null;
    if (this.inputType === 'keyboard') {
      this._setupMouseTracking();
    }

    // Если touch контроллер, настраиваем виртуальные джостики
    if (this.inputType === 'touch' && this.touchConfig) {
      this._setupTouchControls();
    }

    console.log(`🎮 EntityController создан: ${this.id} (${this.inputType} система)`);
  }

  /**
   * Действия контроллера
   */
  static ACTIONS = {
    MOVE_UP: 'move_up',
    MOVE_DOWN: 'move_down',
    MOVE_LEFT: 'move_left',
    MOVE_RIGHT: 'move_right',
    ROTATE_LEFT: 'rotate_left',
    ROTATE_RIGHT: 'rotate_right',
    SWITCH_ENTITY: 'switch_target'
  };

  _getDefaultBindings() {
    return {
      move_up: {
        primary: 'KeyW',     // W
        secondary: null
      },
      move_down: {
        primary: 'KeyS',     // S
        secondary: null
      },
      move_left: {
        primary: 'KeyA',     // A
        secondary: null
      },
      move_right: {
        primary: 'KeyD',     // D
        secondary: null
      },
      rotate_left: {
        primary: 'KeyQ',     // Q
        secondary: null
      },
      rotate_right: {
        primary: 'KeyE',     // E
        secondary: null
      },
      switch_target: {
        primary: 'Tab',
        secondary: null
      }
    };
  }

  /**
   * Установить привязку для действия
   */
  setBinding(action, primary, secondary = null) {
    if (!this.bindings[action]) {
      console.warn(`⚠️ Unknown action: ${action}`);
      return;
    }
    this.bindings[action].primary = primary;
    this.bindings[action].secondary = secondary;
  }

  /**
   * Получить привязку для действия
   */
  getBinding(action) {
    return this.bindings[action];
  }

  // ==================== 🎮 KeyActions Methods ====================

  /**
   * 🎮 Установить клавишу для KeyAction
   * @param {string} actionName - Имя KeyAction (например, "fire", "left_hand")
   * @param {string|null} keyCode - Код клавиши (например, "KeyF", "Mouse1") или null для сброса
   */
  setKeyAction(actionName, keyCode) {
    if (!keyActionRegistry.has(actionName)) {
      console.warn(`⚠️ KeyAction "${actionName}" не найден в реестре`);
      return;
    }

    if (keyCode === null || keyCode === '') {
      delete this.keyActions[actionName];
    } else {
      this.keyActions[actionName] = keyCode;
    }
    console.log(`🎮 KeyAction "${actionName}" привязан к "${keyCode}"`);
  }

  /**
   * 🎮 Получить клавишу для KeyAction
   * @param {string} actionName - Имя KeyAction
   * @returns {string|null} Код клавиши или null
   */
  getKeyAction(actionName) {
    // 1. Сначала проверяем кастомную привязку в контроллере (ПРИОРИТЕТ)
    if (this.keyActions[actionName]) {
      return this.keyActions[actionName];
    }

    // 2. Иначе ищем defaultKey в глобальном массиве KeyActions
    const keyAction = this.allKeyActions.find(ka => (ka.name === actionName || ka.id === actionName));
    if (keyAction && keyAction.defaultKey) {
      return keyAction.defaultKey;
    }

    // 3. Не найдено - возвращаем null
    return null;
  }

  /**
   * 🎮 Проверить активен ли KeyAction (нажата ли привязанная клавиша)
   * @param {string} actionName - Имя KeyAction
   * @returns {boolean} True если клавиша нажата
   */
  isKeyActionActive(actionName) {
    const keyCode = this.getKeyAction(actionName);
    if (!keyCode) return false;

    // Проверяем кнопки мыши
    if (keyCode.startsWith('Mouse')) {
      return this._pressedMouseButtons.has(keyCode);
    }

    // Проверяем клавиатуру
    return this._pressedKeys.has(keyCode);
  }

  /**
   * 🎮 Получить все KeyActions контроллера
   * @returns {Object} Маппинг actionName → keyCode
   */
  getAllKeyActions() {
    return { ...this.keyActions };
  }

  /**
   * 🎮 Установить все KeyActions сразу
   * @param {Object} keyActions - Маппинг actionName → keyCode
   */
  setAllKeyActions(keyActions) {
    this.keyActions = { ...keyActions };
  }

  // ==================== End KeyActions Methods ====================

  /**
   * Проверить нажата ли клавиша действия
   */
  isActionActive(action) {
    const binding = this.bindings[action];
    if (!binding) return false;

    if (binding.primary && this._pressedKeys.has(binding.primary)) return true;
    if (binding.secondary && this._pressedKeys.has(binding.secondary)) return true;

    return false;
  }

  /**
   * Обработать нажатие клавиши
   */
  handleKeyDown(code) {
    this._pressedKeys.add(code);

    // Переключение сущности - одиночное нажатие
    if (this.isActionActive(EntityController.ACTIONS.SWITCH_ENTITY)) {
      this._switchEntity();
      this._pressedKeys.delete(code); // Сразу сбрасываем чтобы не переключало каждый кадр
    }
  }

  /**
   * Обработать отпускание клавиши
   */
  handleKeyUp(code) {
    this._pressedKeys.delete(code);
  }

  /**
   * Переключить на следующую сущность
   */
  _switchEntity() {
    if (!this.allEntities || this.allEntities.length === 0) return;

    // Используем targetId вместо сравнения ссылок, так как список может обновляться
    const currentIndex = this.allEntities.findIndex(e => e.id === this.targetId);
    const nextIndex = (currentIndex + 1) % this.allEntities.length;
    const nextEntity = this.allEntities[nextIndex];

    if (nextEntity && nextEntity.id !== this.targetId) {
      // Переключаем цель
      const oldTargetId = this.targetId;
      this.attachTo(nextEntity);

      console.log(`🎮 Переключение сущности: ${oldTargetId} -> ${nextEntity.id}`);

      // Callback для уведомления о переключении
      if (this.onEntitySwitched) {
        this.onEntitySwitched(nextEntity);
      }
    }
  }

  /**
   * Установить список всех сущностей для переключения
   */
  setAllEntities(entities) {
    this.allEntities = entities;
  }

  /**
   * Настроить автоматическую подписку на клавиатуру
   */
  _setupKeyboardControls() {
    this._keydownHandler = (e) => this.handleKeyDown(e.code);
    this._keyupHandler = (e) => this.handleKeyUp(e.code);
    window.addEventListener('keydown', this._keydownHandler);
    window.addEventListener('keyup', this._keyupHandler);

    // 🎮 Добавляем обработчики мыши для KeyActions
    this._mousedownHandler = (e) => this.handleMouseDown(e.button);
    this._mouseupHandler = (e) => this.handleMouseUp(e.button);
    window.addEventListener('mousedown', this._mousedownHandler);
    window.addEventListener('mouseup', this._mouseupHandler);

    console.log(`⌨️ EntityController ${this.id} подписан на keyboard + mouse`);
  }

  _setupMouseTracking() {
    if (this._mouseMoveHandler) return;
    this._mouseMoveHandler = (e) => {
      // clientX/clientY are in viewport/screen coords
      this._mouseScreen.x = e.clientX;
      this._mouseScreen.y = e.clientY;
    };
    window.addEventListener('mousemove', this._mouseMoveHandler);
  }

  _clearMouseTracking() {
    if (!this._mouseMoveHandler) return;
    window.removeEventListener('mousemove', this._mouseMoveHandler);
    this._mouseMoveHandler = null;
  }

  /**
   * Очистить подписку на клавиатуру
   */
  _clearKeyboardControls() {
    if (this._keydownHandler) {
      window.removeEventListener('keydown', this._keydownHandler);
      this._keydownHandler = null;
    }
    if (this._keyupHandler) {
      window.removeEventListener('keyup', this._keyupHandler);
      this._keyupHandler = null;
    }

    // 🎮 Удаляем обработчики мыши для KeyActions
    if (this._mousedownHandler) {
      window.removeEventListener('mousedown', this._mousedownHandler);
      this._mousedownHandler = null;
    }
    if (this._mouseupHandler) {
      window.removeEventListener('mouseup', this._mouseupHandler);
      this._mouseupHandler = null;
    }

    console.log(`⌨️ EntityController ${this.id} отписан от keyboard + mouse`);
  }

  /**
   * 🎮 Обработать нажатие кнопки мыши для KeyActions
   * @param {number} button - Номер кнопки (0=левая, 1=средняя, 2=правая)
   */
  handleMouseDown(button) {
    const buttonCode = `Mouse${button}`;
    this._pressedMouseButtons.add(buttonCode);
  }

  /**
   * 🎮 Обработать отпускание кнопки мыши для KeyActions
   * @param {number} button - Номер кнопки (0=левая, 1=средняя, 2=правая)
   */
  handleMouseUp(button) {
    const buttonCode = `Mouse${button}`;
    this._pressedMouseButtons.delete(buttonCode);
  }

  /**
   * Обновление контроллера (вызывается каждый кадр)
   *
   * Система движения через velocity:
   * - keyboard: WASD меняет velocity (с ускорением)
   * - touch: виртуальный джостик напрямую управляет скоростью
   * - Трение уменьшает velocity когда нет ввода
   * - Velocity применяется к позиции
   *
   * dt масштабируется через глобальную TimeSystem (timeScale + paused)
   */
  update(dt) {
    if (!this.enabled || !this.target) return;

    // Применяем масштаб времени из глобальной TimeSystem
    dt = timeSystem.getDelta(dt);

    // Если игра на паузе или timeScale = 0, пропускаем обновление
    if (dt === 0) return;

    const entity = this.target;

    // Получаем позицию (GameEntity case)
    let position = entity.position;
    if (!position) return;

    // Получаем параметры движения из сущности
    const movement = entity.movement;
    if (!movement) return;

    // Получаем или создаем velocity компонент
    if (!entity.velocity) {
      entity.velocity = { x: 0, y: 0 };
    }
    const velocity = entity.velocity;

    if (this.inputType === 'keyboard') {
      // Клавиатурный ввод: WASD → ускорение velocity
      const accel = movement.acceleration * dt;

      if (this.isActionActive(EntityController.ACTIONS.MOVE_UP)) {
        velocity.y -= accel;
      }
      if (this.isActionActive(EntityController.ACTIONS.MOVE_DOWN)) {
        velocity.y += accel;
      }
      if (this.isActionActive(EntityController.ACTIONS.MOVE_LEFT)) {
        velocity.x -= accel;
      }
      if (this.isActionActive(EntityController.ACTIONS.MOVE_RIGHT)) {
        velocity.x += accel;
      }

      // Ограничиваем максимальную скорость
      const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
      if (speed > movement.maxSpeed) {
        const scale = movement.maxSpeed / speed;
        velocity.x *= scale;
        velocity.y *= scale;
      }

      // Трение (уменьшаем velocity когда нет ввода)
      if (!this.isActionActive(EntityController.ACTIONS.MOVE_UP) &&
          !this.isActionActive(EntityController.ACTIONS.MOVE_DOWN)) {
        velocity.y *= (1 - movement.friction * dt);
      }
      if (!this.isActionActive(EntityController.ACTIONS.MOVE_LEFT) &&
          !this.isActionActive(EntityController.ACTIONS.MOVE_RIGHT)) {
        velocity.x *= (1 - movement.friction * dt);
      }

      // Останавливаем очень маленькую скорость
      if (Math.abs(velocity.x) < 0.1) velocity.x = 0;
      if (Math.abs(velocity.y) < 0.1) velocity.y = 0;

    } else if (this.inputType === 'touch') {
      // Touch ввод: джостик напрямую управляет скоростью
      const axis = inputSystem.getAxis('move');

      // Устанавливаем скорость на основе позиции джостика
      velocity.x = axis.x * movement.maxSpeed;
      velocity.y = axis.y * movement.maxSpeed;

      // Добавляем небольшое трение для плавности
      if (Math.abs(axis.x) < 0.1) {
        velocity.x *= (1 - movement.friction * dt * 2);
      }
      if (Math.abs(axis.y) < 0.1) {
        velocity.y *= (1 - movement.friction * dt * 2);
      }

      // Останавливаем очень маленькую скорость
      if (Math.abs(velocity.x) < 0.1) velocity.x = 0;
      if (Math.abs(velocity.y) < 0.1) velocity.y = 0;
    }

    // Применяем velocity к позиции
    // НО: если сущность прикреплена к слоту, её позиция управляется слотом, а не контроллером
    if (!entity._parentSlotId) {
      position.x += velocity.x * dt;
      position.y += velocity.y * dt;

      if ((velocity.x !== 0 || velocity.y !== 0) && this.onEntityMoved) {
        this.onEntityMoved(entity);
      }
    } else {
      // Прикрепленная сущность - сбрасываем velocity чтобы не было конфликтов
      velocity.x = 0;
      velocity.y = 0;
    }

    // 🎬 Автоматическое переключение анимаций в зависимости от скорости
    this._updateAnimationState(entity, velocity, movement);

    if ((velocity.x !== 0 || velocity.y !== 0) && this.onEntityMoved) {
      this.onEntityMoved(entity);
    }

     // ---------------------------
     // Rotation / Reflection behavior
     // - keyboard: none | move | mouse
     // - touch:    none | move (mouse ignored)
     // - reflection: mirrorX | mirrorY (excludes rotation)
     // ---------------------------
     const reflection = entity.reflectionBehavior || 'none';

     if (reflection === 'mirrorX' || reflection === 'mirrorY') {
       // Reflection behavior - same logic as rotation
       const baseScale = entity.baseScale || { x: 1, y: 1 };

       // Initialize mirrorDirection if not set
       if (!entity.mirrorDirection) {
         entity.mirrorDirection = { x: 1, y: 1 };
       }

       let direction = 1;
       let directionChanged = false;

       let rotationMode =
         this.rotationMode ??
         (typeof entity.rotationBehavior === 'string' ? entity.rotationBehavior : null) ??
         'none';

       if (this.inputType === 'touch' && rotationMode === 'mouse') {
         rotationMode = 'none';
       }

       if (rotationMode === 'mouse' && this.inputType === 'keyboard') {
         // Mirror based on mouse direction
         const cam = typeof this.aimCamera === 'function' ? this.aimCamera() : this.aimCamera;
         if (cam && typeof cam.screenToWorld === 'function') {
           let sx = this._mouseScreen.x;
           let sy = this._mouseScreen.y;

           const canvasEl = cam.canvas?.app?.canvas;
           if (canvasEl && typeof canvasEl.getBoundingClientRect === 'function') {
             const rect = canvasEl.getBoundingClientRect();
             if (
               sx >= rect.left &&
               sx <= rect.right &&
               sy >= rect.top &&
               sy <= rect.bottom
             ) {
               sx = sx - rect.left;
               sy = sy - rect.top;

               const wp = cam.screenToWorld(sx, sy);
               const dx = (Number(wp?.x) || 0) - position.x;
               const dy = (Number(wp?.y) || 0) - position.y;

               const newDirection = reflection === 'mirrorX'
                 ? (dx > 0 ? 1 : -1)
                 : (dy > 0 ? 1 : -1);

               if (newDirection !== entity.mirrorDirection.x && reflection === 'mirrorX') {
                 entity.mirrorDirection.x = newDirection;
                 directionChanged = true;
               } else if (newDirection !== entity.mirrorDirection.y && reflection === 'mirrorY') {
                 entity.mirrorDirection.y = newDirection;
                 directionChanged = true;
               }
               direction = newDirection;
             }
           }
         }
         // Use stored direction if mouse outside canvas
         direction = reflection === 'mirrorX' ? entity.mirrorDirection.x : entity.mirrorDirection.y;
       } else if (rotationMode === 'move') {
         // Mirror based on movement direction
         const vx = Number(velocity.x) || 0;
         const vy = Number(velocity.y) || 0;
         const speedSq = vx * vx + vy * vy;

         if (speedSq > 0.001) {
           const newDirection = reflection === 'mirrorX'
             ? (vx > 0 ? 1 : -1)
             : (vy > 0 ? 1 : -1);

           if (newDirection !== entity.mirrorDirection.x && reflection === 'mirrorX') {
             entity.mirrorDirection.x = newDirection;
             directionChanged = true;
           } else if (newDirection !== entity.mirrorDirection.y && reflection === 'mirrorY') {
             entity.mirrorDirection.y = newDirection;
             directionChanged = true;
           }
           direction = newDirection;
         } else {
           // Use stored direction when stopped
           direction = reflection === 'mirrorX' ? entity.mirrorDirection.x : entity.mirrorDirection.y;
         }
       } else if (this.inputType === 'keyboard') {
         // Manual mirror control with Q/E (when rotationMode is 'none')
         const rotateLeft = this.isActionActive(EntityController.ACTIONS.ROTATE_LEFT);
         const rotateRight = this.isActionActive(EntityController.ACTIONS.ROTATE_RIGHT);

         if (rotateLeft || rotateRight) {
           const dir = (rotateRight ? 1 : 0) + (rotateLeft ? -1 : 0);
           const newDirection = dir > 0 ? 1 : -1;

           if (newDirection !== entity.mirrorDirection.x && reflection === 'mirrorX') {
             entity.mirrorDirection.x = newDirection;
             directionChanged = true;
           } else if (newDirection !== entity.mirrorDirection.y && reflection === 'mirrorY') {
             entity.mirrorDirection.y = newDirection;
             directionChanged = true;
           }
           direction = newDirection;
         } else {
           // Use stored direction when standing still
           direction = reflection === 'mirrorX' ? entity.mirrorDirection.x : entity.mirrorDirection.y;
         }
       }

       if (reflection === 'mirrorX') {
         entity.scale.x = baseScale.x * direction;
         entity.scale.y = baseScale.y;
       } else {
         entity.scale.x = baseScale.x;
         entity.scale.y = baseScale.y * direction;
       }

       if (this.onEntityRotated) this.onEntityRotated(entity);
     } else {
       // Rotation behavior
       let mode =
         this.rotationMode ??
         (typeof entity.rotationBehavior === 'string' ? entity.rotationBehavior : null) ??
         'none';

       if (mode !== 'none' && mode !== 'move' && mode !== 'mouse') {
         mode = 'none';
       }

       if (this.inputType === 'touch' && mode === 'mouse') {
         mode = 'none';
       }

       const rotSpeed = Number.isFinite(entity.rotationSpeed) ? Number(entity.rotationSpeed) : 8.0;

       const normalizeAngle = (a) => {
         let v = a;
         while (v > Math.PI) v -= 2 * Math.PI;
         while (v < -Math.PI) v += 2 * Math.PI;
         return v;
       };

       const rotateTowards = (current, target, maxStep) => {
         const cur = normalizeAngle(Number(current) || 0);
         const tgt = normalizeAngle(Number(target) || 0);
         let diff = normalizeAngle(tgt - cur); // shortest
         if (Math.abs(diff) <= maxStep) return tgt;
         return normalizeAngle(cur + Math.sign(diff) * maxStep);
       };

       if (mode === 'move') {
         const vx = Number(velocity.x) || 0;
         const vy = Number(velocity.y) || 0;
         const speedSq = vx * vx + vy * vy;
         if (speedSq > 0.001) {
           const desired = Math.atan2(vy, vx);
           entity.rotation = rotateTowards(entity.rotation, desired, rotSpeed * dt);
           if (this.onEntityRotated) this.onEntityRotated(entity);
         }
       } else if (mode === 'mouse') {
         // Requires keyboard input and a camera to convert screen -> world
         if (this.inputType === 'keyboard') {
           const cam = typeof this.aimCamera === 'function' ? this.aimCamera() : this.aimCamera;
           if (cam && typeof cam.screenToWorld === 'function') {
             // IMPORTANT:
             // mousemove gives viewport coords (clientX/Y), but Camera.screenToWorld expects
             // coordinates in PIXI canvas space. Convert using the canvas DOM rect.
             let sx = this._mouseScreen.x;
             let sy = this._mouseScreen.y;

             const canvasEl = cam.canvas?.app?.canvas;
             if (canvasEl && typeof canvasEl.getBoundingClientRect === 'function') {
               const rect = canvasEl.getBoundingClientRect();
               // If cursor is outside this canvas, do not rotate to avoid jumps
               if (
                 sx < rect.left ||
                 sx > rect.right ||
                 sy < rect.top ||
                 sy > rect.bottom
               ) {
                 return;
               }
               sx = sx - rect.left;
               sy = sy - rect.top;
             }

             const wp = cam.screenToWorld(sx, sy);
             const dx = (Number(wp?.x) || 0) - position.x;
             const dy = (Number(wp?.y) || 0) - position.y;
             if (dx * dx + dy * dy > 0.0001) {
               const desired = Math.atan2(dy, dx);
               // For mouse aiming we want crisp/accurate facing, not slow turning.
               entity.rotation = normalizeAngle(desired);
               if (this.onEntityRotated) this.onEntityRotated(entity);
             }
           }
         }
       } else {
         // mode === 'none' => manual rotation by Q/E (keyboard only)
         if (this.inputType === 'keyboard') {
           const rotateLeft = this.isActionActive(EntityController.ACTIONS.ROTATE_LEFT);
           const rotateRight = this.isActionActive(EntityController.ACTIONS.ROTATE_RIGHT);

           if (rotateLeft || rotateRight) {
             const dir = (rotateRight ? 1 : 0) + (rotateLeft ? -1 : 0); // right=+1, left=-1
             const before = Number(entity.rotation) || 0;
             entity.rotation = normalizeAngle(before + dir * rotSpeed * dt);
             if (this.onEntityRotated) this.onEntityRotated(entity);
           }
         }
       }
     }
  }

  /**
   * Callback при движении сущности
   */
  onEntityMoved(entity) {
    // Override для обработки движения
  }

  /**
   * 🎬 Автоматически переключать анимации в зависимости от скорости
   */
  _updateAnimationState(entity, velocity, movement) {
    // Проверяем есть ли у entity анимации
    const animations = entity.animations;
    if (!animations || !animations.enabled) {
      return;
    }

    // Вычисляем текущую скорость
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    const maxSpeed = movement.maxSpeed || 200;

    // Порог для переключения между walk и run (50% от maxSpeed)
    const runThreshold = maxSpeed * 0.5;

    // Порог для остановки (маленькая скорость)
    const idleThreshold = maxSpeed * 0.1;

    // Определяем нужное состояние
    let newState = animations.currentState;

    if (speed < idleThreshold) {
      newState = 'idle';
    } else if (speed < runThreshold) {
      newState = 'walk';
    } else {
      newState = 'run';
    }

    // Переключаем состояние если нужно
    if (newState !== animations.currentState && entity.setAnimationState) {
      entity.setAnimationState(newState);
    }
  }

  /**
   * Callback при переключении сущности
   */
  onEntitySwitched(newEntity) {
    // Override для обработки переключения
  }

  /**
   * Callback при движении сущности
   */
  onEntityMoved(entity) {
    // Override для обработки движения
  }

  /**
   * Настроить виртуальные джостики для touch управления
   */
  _setupTouchControls() {
    if (!this.touchConfig) return;

    // Создаем левый джостик для движения
    if (this.touchConfig.leftStick?.enabled) {
      const leftConfig = this.touchConfig.leftStick;
      inputSystem.addJoystick({
        id: 'move',
        outerRadius: leftConfig.outerRadius,
        innerRadius: leftConfig.innerRadius,
        deadzone: leftConfig.deadzone,
        type: leftConfig.type,
        position: leftConfig.position,
        zone: leftConfig.zone
      });
    }

    // Создаем правый джостик (задел на будущее)
    if (this.touchConfig.rightStick?.enabled) {
      const rightConfig = this.touchConfig.rightStick;
      inputSystem.addJoystick({
        id: 'aim',
        outerRadius: rightConfig.outerRadius,
        innerRadius: rightConfig.innerRadius,
        deadzone: rightConfig.deadzone,
        type: rightConfig.type,
        position: rightConfig.position,
        zone: rightConfig.zone
      });
    }

    console.log(`🕹️ Touch контроллеры настроены для ${this.id}`);
  }

  /**
   * Очистить виртуальные джостики
   */
  _clearTouchControls() {
    if (!this.touchConfig) return;

    if (this.touchConfig.leftStick?.enabled) {
      inputSystem.removeJoystick('move');
    }

    if (this.touchConfig.rightStick?.enabled) {
      inputSystem.removeJoystick('aim');
    }
  }

  /**
   * Уничтожить контроллер
   */
  destroy() {
    if (this.inputType === 'keyboard') {
      this._clearKeyboardControls();
      this._clearMouseTracking();
    }
    if (this.inputType === 'touch') {
      this._clearTouchControls();
    }
    super.destroy();
  }

  getInfo() {
    return {
      ...super.getInfo(),
      inputType: this.inputType,
      rotationMode: this.rotationMode,
      bindings: this.inputType === 'keyboard' ? this.bindings : undefined,
      keyActions: this.keyActions || {},
      touchConfig: this.touchConfig,
      activeEntityId: this.target?.id,
      entityMovement: this.target?.movement || null,
      currentVelocity: this.target?.velocity || { x: 0, y: 0 }
    };
  }
}
