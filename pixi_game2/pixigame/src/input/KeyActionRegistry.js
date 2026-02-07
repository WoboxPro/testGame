/**
 * 🎮 KeyActionRegistry - Глобальный регистр KeyActions
 *
 * KeyAction - это именованное действие (например, "fire", "left_hand")
 * которое может быть привязано к клавише в контроллере.
 *
 * Примеры KeyActions:
 * - "fire" - стрельба (обычно Mouse1 или F)
 * -left_hand" - действие левой руки
 * - "jump" - прыжок
 * - "dash" - рывок
 *
 * Ключевые особенности:
 * - KeyAction имеет имя и опциональную клавишу по умолчанию
 * - В контроллере можно переопределить клавишу для любого KeyAction
 * - Slot может быть привязан к KeyAction, и все muzzle в слоте будут реагировать на него
 */

export class KeyActionRegistry {
  constructor() {
    // Глобальный список всех KeyActions
    // Map<name, KeyAction>
    this.actions = new Map();

    // Предопределенные KeyActions
    this._registerBuiltinActions();
  }

  /**
   * @typedef {Object} KeyAction
   * @property {string} name - Уникальное имя действия (например, "fire", "left_hand")
   * @property {string} displayName - Отображаемое имя (например, "🔫 Fire", "Left Hand")
   * @property {string|null} defaultKey - Клавиша по умолчанию (например, "KeyF", "Mouse1", null)
   * @property {string} description - Описание действия
   * @property {string} category - Категория для группировки (например, "combat", "movement")
   */

  /**
   * Зарегистрировать предопределенные KeyActions
   * @private
   */
  _registerBuiltinActions() {
    // Боевые действия
    this.register({
      name: 'fire',
      displayName: '🔫 Fire',
      defaultKey: null, // Без дефолтной клавиши - пользователь сам назначит
      description: 'Стрельба из оружия',
      category: 'combat'
    });

    this.register({
      name: 'alt_fire',
      displayName: '🎯 Alt Fire',
      defaultKey: null,
      description: 'Альтернативная стрельба',
      category: 'combat'
    });

    this.register({
      name: 'reload',
      displayName: '🔄 Reload',
      defaultKey: 'KeyR',
      description: 'Перезарядка оружия',
      category: 'combat'
    });

    // Действия рук
    this.register({
      name: 'left_hand',
      displayName: '左手 Left Hand',
      defaultKey: null,
      description: 'Действие левой руки',
      category: 'hands'
    });

    this.register({
      name: 'right_hand',
      displayName: '右手 Right Hand',
      defaultKey: null,
      description: 'Действие правой руки',
      category: 'hands'
    });

    // Движение
    this.register({
      name: 'jump',
      displayName: '⬆️ Jump',
      defaultKey: 'Space',
      description: 'Прыжок',
      category: 'movement'
    });

    this.register({
      name: 'dash',
      displayName: '💨 Dash',
      defaultKey: 'ShiftLeft',
      description: 'Рывок / ускорение',
      category: 'movement'
    });

    this.register({
      name: 'crouch',
      displayName: '⬇️ Crouch',
      defaultKey: 'ControlLeft',
      description: 'Присесть',
      category: 'movement'
    });

    // Интерактивные действия
    this.register({
      name: 'interact',
      displayName: '✋ Interact',
      defaultKey: 'KeyE',
      description: 'Взаимодействовать с объектом',
      category: 'interaction'
    });

    this.register({
      name: 'use_item',
      displayName: '🎒 Use Item',
      defaultKey: 'KeyG',
      description: 'Использовать предмет',
      category: 'interaction'
    });
  }

  /**
   * Зарегистрировать новый KeyAction
   * @param {KeyAction} action - KeyAction для регистрации
   * @returns {KeyAction} Зарегистрированный KeyAction
   */
  register(action) {
    if (!action.name) {
      throw new Error('KeyAction must have a name');
    }

    if (this.actions.has(action.name)) {
      console.warn(`KeyAction "${action.name}" already registered, overwriting`);
    }

    this.actions.set(action.name, {
      name: action.name,
      displayName: action.displayName || action.name,
      defaultKey: action.defaultKey || null,
      description: action.description || '',
      category: action.category || 'other'
    });

    console.log(`✅ KeyAction зарегистрирован: ${action.name}`);
    return this.actions.get(action.name);
  }

  /**
   * Удалить KeyAction
   * @param {string} name - Имя KeyAction для удаления
   * @returns {boolean} True если удален, false если не найден
   */
  unregister(name) {
    const result = this.actions.delete(name);
    if (result) {
      console.log(`🗑️ KeyAction удален: ${name}`);
    }
    return result;
  }

  /**
   * Получить KeyAction по имени
   * @param {string} name - Имя KeyAction
   * @returns {KeyAction|null} KeyAction или null если не найден
   */
  get(name) {
    return this.actions.get(name) || null;
  }

  /**
   * Проверить существует ли KeyAction
   * @param {string} name - Имя KeyAction
   * @returns {boolean} True если существует
   */
  has(name) {
    return this.actions.has(name);
  }

  /**
   * Получить все KeyActions
   * @returns {KeyAction[]} Массив всех KeyActions
   */
  getAll() {
    return Array.from(this.actions.values());
  }

  /**
   * Получить KeyActions по категории
   * @param {string} category - Категория для фильтрации
   * @returns {KeyAction[]} Массив KeyActions в категории
   */
  getByCategory(category) {
    return this.getAll().filter(action => action.category === category);
  }

  /**
   * Получить все категории
   * @returns {string[]} Массив уникальных категорий
   */
  getCategories() {
    const categories = new Set(this.getAll().map(action => action.category));
    return Array.from(categories);
  }

  /**
   * Получить дефолтную клавишу для KeyAction
   * @param {string} name - Имя KeyAction
   * @returns {string|null} Дефолтная клавиша или null
   */
  getDefaultKey(name) {
    const action = this.get(name);
    return action ? action.defaultKey : null;
  }

  /**
   * Очистить все KeyActions (включая встроенные)
   */
  clear() {
    this.actions.clear();
    console.log('🧹 Все KeyActions удалены');
  }

  /**
   * Получить информацию о реестре
   * @returns {Object} Информация о реестре
   */
  getInfo() {
    return {
      total: this.actions.size,
      categories: this.getCategories(),
      actions: this.getAll().map(action => ({
        name: action.name,
        displayName: action.displayName,
        defaultKey: action.defaultKey,
        category: action.category
      }))
    };
  }
}

// Глобальный синглтон для всей игры
export const keyActionRegistry = new KeyActionRegistry();
