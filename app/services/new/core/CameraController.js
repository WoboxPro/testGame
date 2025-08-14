/**
 * 🎮 CameraController - Контроллер управления камерой
 * 
 * Управление через Numpad:
 * - 1,2,3,5 - движение камеры
 * - +/- - зум
 * - * и ÷ - переключение камер
 */

export class CameraController {
  constructor(game, options = {}) {
    this.game = game;
    this.isEnabled = options.enabled !== false;
    
    // ⚙️ Настройки управления
    this.settings = {
      // 📍 Движение камеры
      moveSpeed: options.moveSpeed || 1,         // 🎯 1 пиксель за шаг (плавно!)
      smoothMove: options.smoothMove !== false,  // 🎯 плавное движение по умолчанию
      
      // 🔍 Зум
      zoomStep: options.zoomStep || 0.1,         // шаг зума
      minZoom: options.minZoom || 0.1,           // минимальный зум
      maxZoom: options.maxZoom || 5.0,           // максимальный зум
      
      // 📷 Переключение камер
      autoSelect: options.autoSelect !== false,  // авто-выбор при переключении
      cycleOrder: options.cycleOrder || 'priority', // 'priority' | 'creation' | 'custom'
      
      ...options.settings
    };
    
    // 🎯 Состояние
    this.pressedKeys = new Set();
    this.lastMoveTime = 0;
    // 🎯 Удаляем moveInterval - будем использовать ticker deltaTime
    
    // 📋 Карта клавиш (Numpad)
    this.keyMap = {
      // 📍 Движение (Numpad 1,2,3,5) - логичная раскладка
      'Numpad1': 'move_left',         // ⬅️ лево
      'Numpad2': 'move_down',         // ⬇️ вниз
      'Numpad3': 'move_right',        // ➡️ право
      'Numpad5': 'move_up',           // ⬆️ вверх
      
      // 🔍 Зум (Numpad +/-)
      'NumpadAdd': 'zoom_in',         // + приблизить
      'NumpadSubtract': 'zoom_out',   // - отдалить
      
      // 📷 Переключение камер (Numpad */÷)
      'NumpadMultiply': 'camera_next',    // * следующая камера
      'NumpadDivide': 'camera_prev'       // ÷ предыдущая камера
    };
    
    // CameraController создан
    
    // 🎯 Запуск если включен
    if (this.isEnabled) {
      this.enable();
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
    // 🎯 НЕ запускаем _startUpdateLoop - будет работать через ticker!
  }
  
  /**
   * ❌ Выключить контроллер
   */
  disable() {
    if (!this.isEnabled) return;
    
    this.isEnabled = false;
    this._removeEventListeners();
    // 🎯 НЕ нужно останавливать таймеры - их больше нет!
    this.pressedKeys.clear();
    // CameraController выключен
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
    // 🎹 Нажатие клавиш
    this.keyDownHandler = (event) => this._handleKeyDown(event);
    this.keyUpHandler = (event) => this._handleKeyUp(event);
    
    document.addEventListener('keydown', this.keyDownHandler);
    document.addEventListener('keyup', this.keyUpHandler);
    
    // Обработчики событий подключены
    
    // 🎯 УДАЛЕНО: updateHandler и _startUpdateLoop
    // Теперь используем PIXI ticker
  }
  
  /**
   * 🎧 Удалить обработчики событий
   */
  _removeEventListeners() {
    document.removeEventListener('keydown', this.keyDownHandler);
    document.removeEventListener('keyup', this.keyUpHandler);
    // 🎯 УДАЛЕНО: _stopUpdateLoop - больше нет таймеров
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
      this._executeAction(action); // Сразу двигаем при нажатии
    } 
    // 🔍 Зум и 📷 переключение - только по нажатию
    else {
      this._executeAction(action);
    }
  }
  
  /**
   * ⌨️ Обработка отпускания клавиши
   */
  _handleKeyUp(event) {
    const action = this.keyMap[event.code];
    if (!action) return;
    
    // 📍 Перестаем двигаться
    if (action.startsWith('move_')) {
      this.pressedKeys.delete(action);
    }
  }
  
  /**
   * 🔄 Обновление (для зажатых клавиш)
   */
  _update() {
    const now = Date.now();
    
    // 📍 Движение при зажатых клавишах
    if (this.pressedKeys.size > 0 && now - this.lastMoveTime > this.moveInterval) {
      this.pressedKeys.forEach(action => {
        this._executeAction(action);
      });
      this.lastMoveTime = now;
    }
  }
  
  /**
   * ⚡ Выполнить действие
   */
  _executeAction(action, ticker = null) {
    const camera = this.game.getSelectedCamera();
    
    switch (action) {
      // 📍 Движение камеры
      case 'move_up':
        this._moveCamera(0, -this.settings.moveSpeed);
        break;
      case 'move_down':
        this._moveCamera(0, this.settings.moveSpeed);
        break;
      case 'move_left':
        this._moveCamera(-this.settings.moveSpeed, 0);
        break;
      case 'move_right':
        this._moveCamera(this.settings.moveSpeed, 0);
        break;
        
      // 🔍 Зум
      case 'zoom_in':
        this._zoomCamera(this.settings.zoomStep);
        break;
      case 'zoom_out':
        this._zoomCamera(-this.settings.zoomStep);
        break;
        
      // 📷 Переключение камер
      case 'camera_next':
        this._switchCamera(1);
        break;
      case 'camera_prev':
        this._switchCamera(-1);
        break;
    }
  }
  
  /**
   * 📍 Двигать камеру
   */
  _moveCamera(deltaX, deltaY) {
    const camera = this.game.getSelectedCamera();
    if (!camera) {
      // Нет выбранной камеры
      return;
    }
    
    // 🎯 Двигаем фокус камеры в мире
    camera.setFocus(
      camera.focusX + deltaX,
      camera.focusY + deltaY
    );
    
    // Камера перемещена
  }
  
  /**
   * 🔍 Зумить камеру
   */
  _zoomCamera(deltaZoom) {
    const camera = this.game.getSelectedCamera();
    if (!camera) {
      // Нет выбранной камеры
      return;
    }
    
    // 🔍 Применяем зум с ограничениями
    const newZoom = Math.max(
      this.settings.minZoom,
      Math.min(this.settings.maxZoom, camera.zoom + deltaZoom)
    );
    
    if (newZoom !== camera.zoom) {
      camera.setZoom(newZoom);
      // Зум изменен
    } else {
      // Зум достиг предела
    }
  }
  
  /**
   * 📷 Переключить камеру
   */
  _switchCamera(direction) {
    const cameras = Array.from(this.game.cameras.values());
    if (cameras.length <= 1) {
      // Только одна камера
      return;
    }
    
    // 🔍 Находим текущую камеру
    const currentCamera = this.game.getSelectedCamera();
    let currentIndex = 0;
    
    if (currentCamera) {
      currentIndex = cameras.findIndex(cam => cam.id === currentCamera.id);
      if (currentIndex === -1) currentIndex = 0;
    }
    
    // 🔄 Вычисляем следующий индекс
    let nextIndex = currentIndex + direction;
    if (nextIndex >= cameras.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = cameras.length - 1;
    
    // 📷 Переключаемся
    const nextCamera = cameras[nextIndex];
    this.game.selectCamera(nextCamera);
    
    // Камера переключена
  }
  
  // 🎯 УДАЛЕНЫ: _startUpdateLoop и _stopUpdateLoop
  // Теперь используем PIXI ticker через _updateFromTicker()
  
  /**
   * ⚙️ Изменить настройки
   */
  updateSettings(newSettings) {
    this.settings = {
      ...this.settings,
      ...newSettings
    };
    // Настройки обновлены
  }
  
  /**
   * 📊 Получить информацию о контроллере
   */
  getInfo() {
    return {
      enabled: this.isEnabled,
      selectedCamera: this.game.getSelectedCamera()?.id || null,
      pressedKeys: Array.from(this.pressedKeys),
      settings: this.settings,
      keyMap: this.keyMap
    };
  }
  
  /**
   * 🧹 Очистка ресурсов
   */
  /**
   * 🎯 Обновление через PIXI ticker (как в PixiShooterEngine)
   */
  _updateFromTicker(ticker) {
    if (!this.isEnabled) return;
    
    // Проверяем нажатые клавиши и выполняем движение
    // Используем deltaTime для плавности движения
    const currentTime = ticker.lastTime;
    
    // Проверяем что прошло достаточно времени для движения (16ms = ~60fps)
    if (currentTime - this.lastMoveTime >= 16) {
      
      // Обрабатываем все нажатые клавиши движения
      for (const key of this.pressedKeys) {
        const action = this.keyMap[key];
        if (action && action.startsWith('move_')) {
          this._executeAction(action, ticker);
        }
      }
      
      this.lastMoveTime = currentTime;
    }
  }

  destroy() {
    this.disable();
    // 🎯 НЕ нужно останавливать таймеры - их больше нет!
    this.game = null;        // 🔧 ФИКС: очищаем ссылки!
    // CameraController уничтожен
  }
}
