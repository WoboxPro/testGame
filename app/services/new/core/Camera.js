/**
 * 📷 Camera - Связь между миром и канвасом
 * 
 * Особенности:
 * - Позиция камеры в мировых координатах
 * - Привязана к конкретному Canvas
 * - Преобразует мировые координаты в экранные
 * - Может следить за объектами
 */

export class Camera {
  constructor(canvas, world = null) {
    this.canvas = canvas;
    this.world = world;
    
    // 📍 Позиция камеры в мировых координатах
    this.x = 0;  // Камера смотрит на центр мира
    this.y = 0;
    
    // 🔍 Настройки камеры
    this.zoom = 1.0;
    this.rotation = 0;
    
    // 🎯 Следование за объектом
    this.target = null;        // ID сущности за которой следить
    this.followSpeed = 1.0;    // Скорость следования (1.0 = мгновенно)
    this.followOffset = { x: 0, y: 0 }; // Смещение от цели
    
    // 🚧 Ограничения движения камеры
    this.bounds = null; // Установится автоматически если есть world
    this.setBoundsFromWorld();
    
    console.log(`📷 Camera создана: позиция (${this.x}, ${this.y}), привязана к Canvas ${canvas.width}x${canvas.height}`);
  }
  
  /**
   * Установить границы камеры из мира
   */
  setBoundsFromWorld() {
    if (!this.world) return;
    
    // Камера не может показать за пределы мира
    const halfCanvasW = this.canvas.width / 2;
    const halfCanvasH = this.canvas.height / 2;
    
    this.bounds = {
      left: this.world.bounds.left + halfCanvasW,
      right: this.world.bounds.right - halfCanvasW,
      top: this.world.bounds.top + halfCanvasH,
      bottom: this.world.bounds.bottom - halfCanvasH
    };
    
    console.log(`🚧 Границы камеры: X[${this.bounds.left}, ${this.bounds.right}], Y[${this.bounds.top}, ${this.bounds.bottom}]`);
  }
  
  /**
   * Установить позицию камеры
   */
  setPosition(x, y) {
    this.x = x;
    this.y = y;
    this._applyBounds();
  }
  
  /**
   * Переместить камеру относительно текущей позиции
   */
  move(deltaX, deltaY) {
    this.x += deltaX;
    this.y += deltaY;
    this._applyBounds();
  }
  
  /**
   * Применить ограничения границ
   */
  _applyBounds() {
    if (this.bounds) {
      this.x = Math.max(this.bounds.left, Math.min(this.bounds.right, this.x));
      this.y = Math.max(this.bounds.top, Math.min(this.bounds.bottom, this.y));
    }
  }
  
  /**
   * Установить цель для следования
   */
  setTarget(entityId, followSpeed = 1.0, offset = { x: 0, y: 0 }) {
    this.target = entityId;
    this.followSpeed = followSpeed;
    this.followOffset = offset;
    
    console.log(`🎯 Camera следует за entity ${entityId} (скорость: ${followSpeed})`);
  }
  
  /**
   * Убрать цель следования
   */
  clearTarget() {
    this.target = null;
    console.log(`🎯 Camera перестала следовать за целью`);
  }
  
  /**
   * Обновить камеру (вызывается каждый кадр)
   */
  update() {
    if (this.target && this.world) {
      const entity = this.world.getEntity(this.target);
      if (entity) {
        // Целевая позиция с учетом смещения
        const targetX = entity.x + this.followOffset.x;
        const targetY = entity.y + this.followOffset.y;
        
        // Плавное следование или мгновенное
        if (this.followSpeed >= 1.0) {
          this.setPosition(targetX, targetY);
        } else {
          // Интерполяция для плавного движения
          const lerpX = this.x + (targetX - this.x) * this.followSpeed;
          const lerpY = this.y + (targetY - this.y) * this.followSpeed;
          this.setPosition(lerpX, lerpY);
        }
      }
    }
  }
  
  /**
   * Преобразовать мировые координаты в экранные
   */
  worldToScreen(worldX, worldY) {
    return {
      x: (worldX - this.x) * this.zoom + this.canvas.centerX,
      y: (worldY - this.y) * this.zoom + this.canvas.centerY
    };
  }
  
  /**
   * Преобразовать экранные координаты в мировые
   */
  screenToWorld(screenX, screenY) {
    return {
      x: (screenX - this.canvas.centerX) / this.zoom + this.x,
      y: (screenY - this.canvas.centerY) / this.zoom + this.y
    };
  }
  
  /**
   * Проверить видимость точки на экране
   */
  isVisible(worldX, worldY, margin = 0) {
    const screen = this.worldToScreen(worldX, worldY);
    return screen.x >= -margin && 
           screen.x <= this.canvas.width + margin && 
           screen.y >= -margin && 
           screen.y <= this.canvas.height + margin;
  }
  
  /**
   * Получить область мира которая видна на экране
   */
  getVisibleWorldArea() {
    const topLeft = this.screenToWorld(0, 0);
    const bottomRight = this.screenToWorld(this.canvas.width, this.canvas.height);
    
    return {
      left: topLeft.x,
      top: topLeft.y,
      right: bottomRight.x,
      bottom: bottomRight.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y
    };
  }
  
  /**
   * Установить zoom
   */
  setZoom(zoom) {
    this.zoom = Math.max(0.1, Math.min(5.0, zoom)); // Ограничиваем zoom
    console.log(`🔍 Camera zoom: ${this.zoom}`);
  }
  
  /**
   * Получить информацию о камере
   */
  getInfo() {
    return {
      position: { x: this.x, y: this.y },
      zoom: this.zoom,
      rotation: this.rotation,
      target: this.target,
      followSpeed: this.followSpeed,
      bounds: this.bounds ? { ...this.bounds } : null,
      visibleArea: this.getVisibleWorldArea()
    };
  }
}
