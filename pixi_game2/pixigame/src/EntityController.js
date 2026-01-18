/**
 * 🎮 EntityController - Контроллер для управления игровыми сущностями
 *
 * Поддерживает:
 * - Движение сущности (влево/вправо/вверх/вниз)
 * - Переключение активной сущности
 * - Первичные и вторичные клавиши для каждого действия
 * - ECS совместимость (работает с world.entities Map)
 */

import { Controller } from './Controller.js';

export class EntityController extends Controller {
  constructor(options = {}) {
    super({
      ...options,
      type: 'entity'
    });

    // Скорость движения (единиц в секунду)
    this.moveSpeed = options.moveSpeed !== undefined ? options.moveSpeed : 200;

    // Привязка клавиш
    this.bindings = options.bindings || this._getDefaultBindings();

    // Состояние нажатых клавиш
    this._pressedKeys = new Set();

    // Ссылка на все сущности (для переключения)
    this.allEntities = options.allEntities || [];

    console.log(`🎮 EntityController создан: ${this.id}`);
  }

  /**
   * Действия контроллера
   */
  static ACTIONS = {
    MOVE_UP: 'move_up',
    MOVE_DOWN: 'move_down',
    MOVE_LEFT: 'move_left',
    MOVE_RIGHT: 'move_right',
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
      switch_entity: {
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

    const currentIndex = this.allEntities.findIndex(e => e === this.target);
    const nextIndex = (currentIndex + 1) % this.allEntities.length;
    const nextEntity = this.allEntities[nextIndex];

    if (nextEntity && nextEntity !== this.target) {
      // Переключаем цель
      const oldTarget = this.target;
      this.attachTo(nextEntity);

      console.log(`🎮 Переключение сущности: ${oldTarget?.id} -> ${nextEntity.id}`);

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
   * Обновление контроллера (вызывается каждый кадр)
   */
  update(dt) {
    if (!this.enabled || !this.target) return;

    const entity = this.target;
    const moveAmount = this.moveSpeed * dt;

    let moved = false;

    // Для ECS сущности позиция может быть в entity.position (GameEntity)
    // или в компонентах world.entities
    let position = entity.position; // GameEntity case

    // Если это не GameEntity, попробуем получить из world
    if (!position && entity.worldId && entity.entityId) {
      // Нужно передать world для доступа к компонентам
      // Это будет обрабатываться извне через setWorldReference
      return;
    }

    if (!position) return;

    // Движение вверх
    if (this.isActionActive(EntityController.ACTIONS.MOVE_UP)) {
      position.y -= moveAmount;
      moved = true;
    }

    // Движение вниз
    if (this.isActionActive(EntityController.ACTIONS.MOVE_DOWN)) {
      position.y += moveAmount;
      moved = true;
    }

    // Движение влево
    if (this.isActionActive(EntityController.ACTIONS.MOVE_LEFT)) {
      position.x -= moveAmount;
      moved = true;
    }

    // Движение вправо
    if (this.isActionActive(EntityController.ACTIONS.MOVE_RIGHT)) {
      position.x += moveAmount;
      moved = true;
    }

    if (moved && this.onEntityMoved) {
      this.onEntityMoved(entity);
    }
  }

  /**
   * Установить ссылку на мир для доступа к ECS компонентам
   */
  setWorldReference(world) {
    this._world = world;
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

  getInfo() {
    return {
      ...super.getInfo(),
      moveSpeed: this.moveSpeed,
      bindings: this.bindings,
      activeEntityId: this.target?.id
    };
  }
}
