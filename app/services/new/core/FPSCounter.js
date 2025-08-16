/**
 * 📊 FPS Counter - Счетчик кадров в секунду
 * 
 * Отображает текущий FPS в левом верхнем углу страницы
 */

export class FPSCounter {
  constructor(options = {}) {
    // ⚙️ Настройки
    this.updateInterval = options.updateInterval || 1000; // Обновление каждую секунду
    this.position = options.position || 'top-left';       // Позиция на экране
    this.style = {
      position: 'fixed',
      top: '10px',
      left: '10px',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      color: '#00FF00',
      padding: '8px 12px',
      borderRadius: '4px',
      fontFamily: 'monospace',
      fontSize: '14px',
      fontWeight: 'bold',
      zIndex: 9999,
      userSelect: 'none',
      border: '1px solid #00FF00',
      ...options.style
    };
    
    // 📊 Счетчики
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.currentFPS = 0;
    this.isEnabled = options.enabled !== false;
    
    // 🎯 Ticker интеграция (как в PixiShooterEngine)
    this.lastUpdateTime = 0;
    
    // 🎯 DOM элемент
    this.element = null;
    
    // 🔄 Таймеры
    this.updateTimer = null;
    this.animationFrame = null;
    
    //console.log('📊 FPS Counter создан');
    
    // 🚀 Автозапуск если включен
    if (this.isEnabled) {
      this.start();
    }
  }
  
  /**
   * 🚀 Запустить счетчик FPS
   */
  start() {
    if (this.isEnabled && this.element) {
      //console.log('⚠️ FPS Counter уже запущен');
      return;
    }
    
   // console.log('🚀 Запуск FPS Counter...');
    this.isEnabled = true;
    this._createDOM();
    // 🎯 НЕ запускаем _startCounting - будет работать через ticker!
   // console.log('✅ FPS Counter запущен (через ticker)');
  }
  
  /**
   * 🛑 Остановить счетчик FPS
   */
  stop() {
    if (!this.isEnabled) {
      //console.log('⚠️ FPS Counter уже остановлен');
      return;
    }
    
   // console.log('🛑 Остановка FPS Counter...');
    this.isEnabled = false;
    // 🎯 УДАЛЕНО: _stopCounting - нет больше таймеров
    this._removeDOM();
    
    // 🔧 ФИКС: Дополнительная очистка таймеров!
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    
   // console.log('✅ FPS Counter остановлен');
  }
  
  /**
   * 🔄 Переключить состояние
   */
  toggle() {
    if (this.isEnabled) {
      this.stop();
    } else {
      this.start();
    }
  }
  
  /**
   * 🎨 Создать DOM элемент
   */
  _createDOM() {
    // 🧹 Удаляем старый элемент если есть
    this._removeDOM();
    
    // 🎨 Создаем новый элемент
    this.element = document.createElement('div');
    this.element.id = 'fps-counter';
    this.element.innerHTML = 'FPS: --';
    
    // 🎨 Применяем стили
    Object.assign(this.element.style, this.style);
    
    // ➕ Добавляем в DOM
    document.body.appendChild(this.element);
    
   // console.log('🎨 FPS Counter DOM элемент создан');
  }
  
  /**
   * 🧹 Удалить DOM элемент
   */
  _removeDOM() {
    if (this.element) {
      this.element.remove();
      this.element = null;
    //  console.log('🧹 FPS Counter DOM элемент удален');
    }
  }
  
  // 🎯 УДАЛЕНО: _startCounting
  // Теперь используем PIXI ticker через _updateFromTicker()
  
  // 🎯 УДАЛЕНО: _stopCounting
  // Теперь все таймеры управляются через PIXI ticker
  
  // 🎯 УДАЛЕНО: _startFrameLoop
  // Теперь кадры считаются в _updateFromTicker()
  
  // 🎯 УДАЛЕНО: _startUpdateLoop  
  // Теперь используем PIXI ticker через _updateFromTicker()
  
  /**
   * 🎨 Обновить отображение FPS
   */
  _updateDisplay() {
    if (!this.element) return;
    
    // 🎨 Цвет в зависимости от FPS
    let color = '#00FF00'; // Зеленый (хороший FPS)
    
    if (this.currentFPS < 30) {
      color = '#FF0000'; // Красный (плохой FPS)
    } else if (this.currentFPS < 45) {
      color = '#FFAA00'; // Оранжевый (средний FPS)
    } else if (this.currentFPS < 55) {
      color = '#FFFF00'; // Желтый (нормальный FPS)
    }
    
    // 📊 Обновляем текст и цвет
    this.element.innerHTML = `FPS: ${this.currentFPS}`;
    this.element.style.color = color;
    this.element.style.borderColor = color;
  }
  
  /**
   * ⚙️ Изменить настройки
   */
  updateSettings(newSettings) {
    // 🎨 Обновляем стили
    if (newSettings.style) {
      this.style = { ...this.style, ...newSettings.style };
      if (this.element) {
        Object.assign(this.element.style, this.style);
      }
    }
    
    // ⏱️ Обновляем интервал
    if (newSettings.updateInterval && newSettings.updateInterval !== this.updateInterval) {
      this.updateInterval = newSettings.updateInterval;
      
      // 🎯 УДАЛЕНО: перезапуск таймеров
      // Теперь все работает через ticker автоматически
    }
    
   // console.log('⚙️ FPS Counter настройки обновлены:', newSettings);
  }
  
  /**
   * 📊 Получить текущие данные FPS
   */
  getFPSData() {
    return {
      currentFPS: this.currentFPS,
      isEnabled: this.isEnabled,
      frameCount: this.frameCount,
      updateInterval: this.updateInterval
    };
  }
  
  /**
   * 🎯 Обновление через PIXI ticker (как в PixiShooterEngine)
   */
  _updateFromTicker(ticker) {
    if (!this.isEnabled || !this.element) return;
    
    // Считаем кадры
    this.frameCount++;
    
    // Проверяем нужно ли обновить отображение
    const currentTime = ticker.lastTime;
    const deltaTime = currentTime - this.lastUpdateTime;
    
    if (deltaTime >= this.updateInterval) {
      // Вычисляем FPS как в PixiShooterEngine
      this.currentFPS = Math.round((this.frameCount * 1000) / deltaTime);
      
      // Обновляем отображение
      this._updateDisplay();
      
      // Сброс для следующего измерения
      this.frameCount = 0;
      this.lastUpdateTime = currentTime;
    }
  }

  /**
   * 🧹 Уничтожить счетчик
   */
  destroy() {
   // console.log('🧹 Уничтожение FPS Counter...');
    this.stop();
    this._removeDOM();
    
    // 🔧 ФИКС: Полная очистка всех ссылок!
    this.element = null;
    this.updateTimer = null;
    this.animationFrame = null;
    
   // console.log('✅ FPS Counter уничтожен');
  }
}
