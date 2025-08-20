/**
 * 🎯 Entity - Игровая сущность
 * 
 * Базовый класс для всех объектов в мире
 */
import * as PIXI from 'pixi.js';

export class Entity {
  constructor(options = {}) {
    // 🆔 Уникальный ID
    this.id = options.id || `entity_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // 📍 Позиция в мире
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.rotation = options.rotation || 0;          // Поворот в радианах
    
    // 🎯 Система поворота по направлению движения
    this.rotationBehavior = options.rotationBehavior || 'none'; // 'none' | 'movement' | 'mouse'
    this.rotationSpeed = options.rotationSpeed || 0.2;          // Скорость поворота
    this.rotateChildren = options.rotateChildren !== false;     // Поворачивать дочерние вместе
    this.childRotationType = options.childRotationType || 'stick'; // 'stick' | 'orbit'
    this.rotationOffset = options.rotationOffset || -Math.PI/2; // Смещение угла (по умолчанию -90° = вверх)
    
    // 🔗 Parent-Child система
    this.parent = options.parent || null;           // ID родительской сущности
    this.children = new Set();                      // Set ID дочерних сущностей
    this.offsetX = options.offsetX || 0;            // Смещение от родителя по X
    this.offsetY = options.offsetY || 0;            // Смещение от родителя по Y
    this.localRotation = options.localRotation || 0; // Поворот относительно родителя
    
    // 🏷️ Классификация (для будущей логики)
    this.type = options.type || 'decoration'; // structure / decoration / unit
    
    // 🎨 Система рендеринга
    this.renderSystem = options.renderSystem || 'graphics'; // 'graphics' | 'sprite' | 'skeletal'
    
    // 🎨 Визуальное представление
    this.color = options.color || 0x888888;    // Основной цвет сущности
    this.size = options.size || 5;              // Основной размер сущности (для кругов)
    
    // 🎯 НОВИНКА: Поддержка прямоугольных размеров
    this.width = options.width || null;         // Ширина прямоугольника
    this.height = options.height || null;       // Высота прямоугольника
    
    this.visual = {
      // Для graphics системы (текущая)
      form: options.form || 'circle',           // Форма: circle, rect, diamond, star, etc.
      size: this.size,                          // Основной размер
      color: this.color,                        // Цвет
      
      // Для sprite системы
      sprite: options.sprite || null,           // Путь к базовому спрайту
      attachmentPoints: options.attachmentPoints || {}, // Точки привязки экипировки
      equippedItems: options.equippedItems || {}, // Экипированные предметы
      
      // Для skeletal системы
      skeleton: options.skeleton || null,       // Путь к skeletal данным
      animations: options.animations || {},     // Доступные анимации
      currentAnimation: options.currentAnimation || 'idle', // Текущая анимация
      
      ...options.visual                         // Дополнительные визуальные настройки
    };
    
    // 📋 Дополнительные свойства
    this.name = options.name || `${this.type}_${this.id}`;
    this.data = options.data || {};             // Произвольные данные
    
    // 🎮 Контроллер для управления сущностью
    this.controller = null;
    
    // 🏛️ Фракция сущности (устанавливается через FactionSystem)
    this.faction = options.faction || null;
    this.factionId = options.factionId || null;
    
    // 🌍 Ссылка на мир (для проверки границ и т.д.)
    this.world = null;
    
    // 🎯 Параметры коллизий
    this.collision = options.collision || null;
    
    // 🏃 Параметры движения
    this.velocity = { x: 0, y: 0 };
    this.previousPosition = { x: this.x, y: this.y };
    this.isMovementBlocked = false;
    
  }
  
  /**
   * 🎨 Получить визуальную конфигурацию для рендеринга
   */
  getVisualConfig() {
    return {
      form: this.visual.form,
      size: this.visual.size,
      color: this.visual.color,
      sprite: this.visual.sprite
    };
  }
  
  /**
   * 📍 Установить позицию
   */
  setPosition(x, y) {
    this.previousPosition.x = this.x;
    this.previousPosition.y = this.y;
    this.x = x;
    this.y = y;
  }
  
  /**
   * 🛑 Остановить движение (откат к предыдущей позиции)
   */
  stopMovement() {
    if (this.isMovementBlocked) return; // Уже заблокировано
    
    this.isMovementBlocked = true;
    this.x = this.previousPosition.x;
    this.y = this.previousPosition.y;
    this.velocity.x = 0;
    this.velocity.y = 0;
    
    // Снимаем блокировку в следующем кадре
    setTimeout(() => {
      this.isMovementBlocked = false;
    }, 16); // ~1 кадр при 60 FPS
  }
  
  /**
   * 🏃 Проверить можно ли двигаться
   */
  canMove() {
    return !this.isMovementBlocked;
  }
  
  /**
   * 🔗 Добавить дочернюю сущность
   */
  addChild(childId) {
    this.children.add(childId);
  }
  
  /**
   * ➖ Удалить дочернюю сущность
   */
  removeChild(childId) {
    this.children.delete(childId);
  }
  
  /**
   * 📍 Получить мировые координаты с учетом родителя
   */
  getWorldPosition() {
    if (!this.parent || !this.world) {
      return { x: this.x, y: this.y };
    }
    
    const parentEntity = this.world.getEntity(this.parent);
    if (!parentEntity) {
      return { x: this.x, y: this.y };
    }
    
    const parentPos = parentEntity.getWorldPosition();
    return {
      x: parentPos.x + this.offsetX,
      y: parentPos.y + this.offsetY
    };
  }
  
  /**
   * 🔄 Обновить позицию дочерних сущностей
   */
  updateChildrenPositions() {
    if (!this.world || this.children.size === 0) return;
    
    for (const childId of this.children) {
      const child = this.world.getEntity(childId);
      if (child) {
        const worldPos = child.getWorldPosition();
        child.x = worldPos.x;
        child.y = worldPos.y;
        
        // Рекурсивно обновляем детей детей
        child.updateChildrenPositions();
      }
    }
  }
  
  /**
   * 🎯 Обновить поворот по направлению движения
   */
  updateRotationFromMovement(deltaX, deltaY) {
    if (this.rotationBehavior !== 'movement') return;
    if (deltaX === 0 && deltaY === 0) return; // Нет движения
    
    // Вычисляем целевой угол поворота с учетом смещения
    const targetRotation = Math.atan2(deltaY, deltaX) + this.rotationOffset;
    
    // Плавный поворот к целевому углу
    let angleDiff = targetRotation - this.rotation;
    
    // Нормализуем угол (-π до π)
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
    
    // Сохраняем старый угол для дочерних
    const oldRotation = this.rotation;
    
    // Применяем поворот с учетом скорости
    this.rotation += angleDiff * this.rotationSpeed;
    
    // Нормализуем итоговый угол
    while (this.rotation > Math.PI) this.rotation -= 2 * Math.PI;
    while (this.rotation < -Math.PI) this.rotation += 2 * Math.PI;
    
    // 🔄 Поворачиваем дочерние сущности если включено
    if (this.rotateChildren) {
      const rotationDelta = this.rotation - oldRotation;
      this.rotateChildrenBy(rotationDelta);
    }
  }
  
  /**
   * 🔄 Повернуть дочерние сущности на указанный угол
   */
  rotateChildrenBy(rotationDelta) {
    if (!this.world || this.children.size === 0 || rotationDelta === 0) return;
    
    for (const childId of this.children) {
      const child = this.world.getEntity(childId);
      if (child) {
        // Всегда поворачиваем позицию дочерней сущности вокруг родителя
        const cos = Math.cos(rotationDelta);
        const sin = Math.sin(rotationDelta);
        
        const newOffsetX = child.offsetX * cos - child.offsetY * sin;
        const newOffsetY = child.offsetX * sin + child.offsetY * cos;
        
        child.offsetX = newOffsetX;
        child.offsetY = newOffsetY;
        
        // Поворачиваем саму дочернюю сущность в зависимости от типа
        if (this.childRotationType === 'stick') {
          // 📎 STICK: дочерняя сущность поворачивается вместе с родителем
          child.rotation += rotationDelta;
          
          // Нормализуем угол дочерней сущности
          while (child.rotation > Math.PI) child.rotation -= 2 * Math.PI;
          while (child.rotation < -Math.PI) child.rotation += 2 * Math.PI;
        }
        // 🌍 ORBIT: дочерняя сущность НЕ поворачивается, только перемещается по орбите
        
        // Рекурсивно поворачиваем детей детей
        if (child.rotateChildren) {
          child.rotateChildrenBy(rotationDelta);
        }
      }
    }
  }
  
  /**
   * 🎨 Обновить визуальные настройки
   */
  updateVisual(visualOptions) {
    this.visual = {
      ...this.visual,
      ...visualOptions
    };
  }
  
  /**
   * 🎨 Рендеринг сущности (Entity отвечает за свой внешний вид)
   */
  render(container) {
    // 🎯 Выбираем систему рендеринга
    switch (this.renderSystem) {
      case 'graphics':
        this._renderGraphics(container);
        break;
        
      case 'sprite':
        this._renderSprite(container);
        break;
        
      case 'skeletal':
        this._renderSkeletal(container);
        break;
        
      default:
        console.warn(`Неизвестная система рендеринга: ${this.renderSystem}`);
        this._renderGraphics(container); // Fallback
    }
  }
  
  /**
   * 🔵 Graphics рендеринг (геометрические фигуры)
   */
  _renderGraphics(container) {
    const graphics = new PIXI.Graphics();
    
    // 🎨 Рендерим по форме
    switch (this.visual.form) {
      case 'circle':
        graphics.circle(0, 0, this.visual.size);
        break;
        
      case 'rect':
      case 'building':
      case 'rectangle':
        // 🎯 НОВИНКА: Поддержка width/height для прямоугольников
        if (this.width && this.height) {
          // Используем заданные размеры
          graphics.rect(-this.width/2, -this.height/2, this.width, this.height);
        } else {
          // Используем size как квадрат (как раньше)
          const half = this.visual.size / 2;
          graphics.rect(-half, -half, this.visual.size, this.visual.size);
        }
        break;
        
      case 'diamond':
        graphics.poly([
          -this.visual.size, 0,    // лево
          0, -this.visual.size,    // верх
          this.visual.size, 0,     // право
          0, this.visual.size      // низ
        ]);
        break;
        
      case 'star':
      case 'explosion':
        graphics.star(0, 0, 6, this.visual.size, this.visual.size * 0.5);
        break;
        
      case 'bullet':
        graphics.circle(0, 0, Math.max(1, this.visual.size * 0.3));
        break;
        
      case 'soldier':
        graphics.circle(0, 0, this.visual.size);
        break;
        
      case 'tank':
        const tankSize = this.visual.size * 1.2;
        graphics.rect(-tankSize/2, -tankSize/2, tankSize, tankSize);
        break;
        
      case 'tower':
        // Узкая высокая башня
        const towerWidth = this.visual.size * 0.6;
        const towerHeight = this.visual.size * 1.5;
        graphics.rect(-towerWidth/2, -towerHeight/2, towerWidth, towerHeight);
        break;
        
      case 'tree':
        // Ствол
        graphics.rect(-1, this.visual.size * 0.2, 2, this.visual.size * 0.8);
        graphics.fill({ color: 0x8B4513 });
        // Крона
        graphics.circle(0, -this.visual.size * 0.3, this.visual.size * 0.7);
        graphics.fill({ color: 0x228B22 });
        container.addChild(graphics);
        return; // Уже покрасили и добавили
        
      case 'aircraft':
        // Треугольный самолет
        graphics.poly([
          0, -this.visual.size,           // нос
          -this.visual.size * 0.7, this.visual.size * 0.5,  // левое крыло
          this.visual.size * 0.7, this.visual.size * 0.5    // правое крыло
        ]);
        break;
        
      case 'wall':
        // Длинная тонкая стена
        const wallLength = this.visual.size * 2;
        const wallThickness = this.visual.size * 0.3;
        graphics.rect(-wallLength/2, -wallThickness/2, wallLength, wallThickness);
        break;
        
      case 'rock':
        // Неправильный многоугольник
        const rockPoints = [];
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI * 2) / 6;
          const radius = this.visual.size * (0.7 + Math.random() * 0.3);
          rockPoints.push(Math.cos(angle) * radius, Math.sin(angle) * radius);
        }
        graphics.poly(rockPoints);
        break;
        
      case 'world_outline':
        // Обводка всего мира - прямоугольная рамка
        const worldWidth = this.visual.worldWidth || 100;
        const worldHeight = this.visual.worldHeight || 100;
        const strokeWidth = this.visual.size || 2;
        const worldColor = this.visual.color || this.color || 0x00FFFF; // Голубой по умолчанию
        
        // Рисуем ТОЛЬКО обводку (без заливки)
        graphics.rect(
          -worldWidth/2, 
          -worldHeight/2, 
          worldWidth, 
          worldHeight
        );
        graphics.stroke({ 
          color: worldColor, 
          width: strokeWidth 
        });
        container.addChild(graphics);
        return; // Не применяем fill - только stroke
        
      case 'biome_outline':
        // Обводка биома - прямоугольная рамка
        const biomeBounds = this.visual.biomeBounds || { x: 0, y: 0, width: 100, height: 100 };
        const biomeStrokeWidth = this.size || 2;
        const biomeAlpha = this.visual.borderAlpha || 1.0;
        const biomeColor = this.color || 0xFF00FF; // Розовый по умолчанию если цвет не указан
        
        // Отладочные логи убраны - проблема решена!
        
        // Рисуем ТОЛЬКО обводку биома (без заливки)
        graphics.rect(
          -biomeBounds.width/2, 
          -biomeBounds.height/2, 
          biomeBounds.width, 
          biomeBounds.height
        );
        graphics.stroke({ 
          color: biomeColor, 
          width: biomeStrokeWidth,
          alpha: biomeAlpha
        });
        container.addChild(graphics);
        return; // Не применяем fill - только stroke
        
      case 'zone_boundary':
        // Граница зоны - ПУНКТИРНАЯ прямоугольная рамка
        const zoneBounds = this.visual.zoneBounds || { x: 0, y: 0, width: 100, height: 100 };
        const zoneStrokeWidth = this.size || 2;
        const zoneAlpha = this.visual.borderAlpha || 1.0;
        const zoneColor = this.color || 0x00FFFF; // Голубой по умолчанию
        
        // 🔲 Создаем пунктирную границу зоны
        this._drawDashedRect(graphics, zoneBounds, zoneColor, zoneStrokeWidth, zoneAlpha);
        container.addChild(graphics);
        return; // Не применяем fill - только stroke
        
      case 'border_line':
        // Граница мира - прямая линия (устаревшая, для совместимости)
        const length = this.visual.length || 100;
        const thickness = this.visual.size;
        
        if (this.visual.orientation === 'horizontal') {
          // Горизонтальная линия
          graphics.rect(-length/2, -thickness/2, length, thickness);
        } else {
          // Вертикальная линия
          graphics.rect(-thickness/2, -length/2, thickness, length);
        }
        break;
        
      default:
        // Неизвестная форма - круг по умолчанию
        graphics.circle(0, 0, this.visual.size);
        break;
    }
    
    // 🎨 Применяем цвет (кроме сложных форм типа tree)
    graphics.fill({ color: this.visual.color });
    
    // 🔲 НОВОЕ: Добавляем обводку фракции если есть
    if (this.visual.factionOutline && this.visual.factionOutline.enabled) {
      const outline = this.visual.factionOutline;
      graphics.stroke({ 
        color: outline.color, 
        width: outline.width,
        alpha: outline.alpha
      });
    }
    
    // ➕ Добавляем в контейнер
    container.addChild(graphics);
  }
  
  /**
   * 👤 Sprite рендеринг (Terraria-стиль)
   */
  _renderSprite(container) {
    // 🎨 Базовый спрайт
    if (this.visual.sprite) {
      const baseSprite = PIXI.Sprite.from(this.visual.sprite);
      baseSprite.anchor.set(0.5, 0.5); // Центрируем спрайт
      container.addChild(baseSprite);
    }
    
    // 👕 Экипировка по точкам привязки
    Object.keys(this.visual.equippedItems).forEach(slot => {
      const itemTexture = this.visual.equippedItems[slot];
      const attachPoint = this.visual.attachmentPoints[slot];
      
      if (itemTexture && attachPoint) {
        const itemSprite = PIXI.Sprite.from(itemTexture);
        itemSprite.anchor.set(0.5, 0.5);
        itemSprite.x = attachPoint.x;
        itemSprite.y = attachPoint.y;
        container.addChild(itemSprite);
        
      }
    });
  }
  
  /**
   * 🦴 Skeletal рендеринг (продвинутая анимация)
   */
  _renderSkeletal(container) {
    // TODO: Интеграция с pixi-spine
    this._renderGraphics(container); // Временный fallback
  }
  
  /**
   * 👕 Экипировать предмет (для sprite системы)
   */
  equipItem(slot, itemTexture) {
    if (this.renderSystem !== 'sprite') {
      console.warn('equipItem() работает только с renderSystem: "sprite"');
      return;
    }
    
    if (!this.visual.attachmentPoints[slot]) {
      console.warn(`Точка привязки "${slot}" не найдена`);
      return;
    }
    
    this.visual.equippedItems[slot] = itemTexture;
  }
  
  /**
   * 🎭 Сменить анимацию (для skeletal системы)
   */
  playAnimation(animationName) {
    if (this.renderSystem !== 'skeletal') {
      console.warn('playAnimation() работает только с renderSystem: "skeletal"');
      return;
    }
    this.visual.currentAnimation = animationName;
    // TODO: Применить анимацию к skeletal объекту
  }
  
  /**
   * 🎮 Добавить контроллер к сущности
   */
  addController(controller) {
    if (!controller) {
      console.warn('🎮 Попытка добавить пустой контроллер к сущности');
      return false;
    }
    
    // 🧹 Отключаем старый контроллер если есть
    if (this.controller) {
      this.removeController();
    }
    
    // 🔗 Привязываем новый контроллер
    this.controller = controller;
    
    // 🔗 Устанавливаем обратную связь в контроллере
    if (controller.attachToEntity) {
      controller.attachToEntity(this);
    }
    
    //console.log(`🎮 Контроллер добавлен к сущности: ${this.name} (${this.id})`);
    return true;
  }
  
  /**
   * 🚫 Удалить контроллер от сущности
   */
  removeController() {
    if (this.controller) {
      //console.log(`🚫 Контроллер удален от сущности: ${this.name}`);
      
      // 🧹 Отвязываем контроллер
      if (this.controller.detachFromEntity) {
        this.controller.detachFromEntity();
      }
      
      this.controller = null;
      return true;
    }
    return false;
  }
  
  /**
   * 🎮 Получить текущий контроллер
   */
  getController() {
    return this.controller;
  }
  
  /**
   * 🎮 Проверить есть ли контроллер
   */
  hasController() {
    return this.controller !== null;
  }
  
  /**
   * 📹 Установить камеру для слежения за этой сущностью (синтаксический сахар)
   */
  setCameraFocus(camera, offsetX = 0, offsetY = 0) {
    if (!camera) {
      console.warn('📹 Попытка установить фокус камеры с пустой камерой');
      return false;
    }
    
    // 🎯 Просто вызываем метод камеры
    return camera.followEntity(this, offsetX, offsetY);
  }
  
  /**
   * 📹 Убрать фокус камеры с этой сущности
   */
  removeCameraFocus(camera) {
    if (!camera) {
      console.warn('📹 Попытка убрать фокус с пустой камеры');
      return false;
    }
    
    // 🎯 Проверяем что камера действительно следит за нами
    if (camera.getFollowedEntity() === this) {
      return camera.stopFollowing();
    }
    
    return false;
  }
  
  /**
   * 🔲 Нарисовать пунктирный прямоугольник
   */
  _drawDashedRect(graphics, bounds, color, strokeWidth, alpha) {
    const width = bounds.width;
    const height = bounds.height;
    const x = -width / 2;
    const y = -height / 2;
    
    // Параметры пунктира
    const dashLength = 8;  // Длина штриха
    const gapLength = 4;   // Длина пропуска
    
    // Рисуем каждую сторону пунктиром
    this._drawDashedLine(graphics, x, y, x + width, y, dashLength, gapLength, color, strokeWidth, alpha); // Верх
    this._drawDashedLine(graphics, x + width, y, x + width, y + height, dashLength, gapLength, color, strokeWidth, alpha); // Право
    this._drawDashedLine(graphics, x + width, y + height, x, y + height, dashLength, gapLength, color, strokeWidth, alpha); // Низ
    this._drawDashedLine(graphics, x, y + height, x, y, dashLength, gapLength, color, strokeWidth, alpha); // Лево
  }
  
  /**
   * 📏 Нарисовать пунктирную линию
   */
  _drawDashedLine(graphics, x1, y1, x2, y2, dashLength, gapLength, color, strokeWidth, alpha) {
    const totalLength = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const stepLength = dashLength + gapLength;
    const steps = Math.floor(totalLength / stepLength);
    
    const deltaX = (x2 - x1) / totalLength;
    const deltaY = (y2 - y1) / totalLength;
    
    for (let i = 0; i <= steps; i++) {
      const startDistance = i * stepLength;
      const endDistance = Math.min(startDistance + dashLength, totalLength);
      
      if (startDistance >= totalLength) break;
      
      const startX = x1 + deltaX * startDistance;
      const startY = y1 + deltaY * startDistance;
      const endX = x1 + deltaX * endDistance;
      const endY = y1 + deltaY * endDistance;
      
      graphics.moveTo(startX, startY);
      graphics.lineTo(endX, endY);
      graphics.stroke({
        color: color,
        width: strokeWidth,
        alpha: alpha
      });
    }
  }
  
  /**
   * 📊 Получить информацию о сущности
   */
  getInfo() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      position: { x: this.x, y: this.y },
      visual: this.visual,
      data: this.data
    };
  }
}

/**
 * 🎨 Готовые формы для быстрого создания
 */
export const EntityForms = {
  // 🔴 Базовые формы
  CIRCLE: 'circle',
  RECT: 'rect', 
  DIAMOND: 'diamond',
  STAR: 'star',
  
  // 🏗️ Архитектурные (для structure)
  BUILDING: 'building',        // Большой прямоугольник
  TOWER: 'tower',             // Узкий высокий прямоугольник
  WALL: 'wall',               // Длинный тонкий прямоугольник
  
  // 👥 Юниты (для unit)
  SOLDIER: 'soldier',         // Средний круг
  TANK: 'tank',              // Большой прямоугольник
  AIRCRAFT: 'aircraft',       // Треугольник
  
  // 🌿 Декорации (для decoration)  
  TREE: 'tree',              // Треугольник на прямоугольнике
  ROCK: 'rock',              // Неправильный многоугольник
  GRASS: 'grass',            // Маленькие точки
  
  // 🔥 Эффекты
  BULLET: 'bullet',          // Очень маленький круг
  EXPLOSION: 'explosion',    // Звезда
  PARTICLE: 'particle',      // Точка
  
  // 🗺️ Системные элементы
  WORLD_OUTLINE: 'world_outline', // Обводка всего мира
  BIOME_OUTLINE: 'biome_outline', // Обводка биома
  ZONE_BOUNDARY: 'zone_boundary', // Граница зоны (пунктирная)
  BORDER_LINE: 'border_line'      // Граница мира (устаревшая)
};

/**
 * 🏭 Фабрика для быстрого создания типовых сущностей
 */
export class EntityFactory {
  
  // 🔵 GRAPHICS СИСТЕМА (геометрические фигуры)
  
  /**
   * 🏗️ Создать структуру (graphics)
   */
  static createStructure(x, y, options = {}) {
    return new Entity({
      x, y,
      type: 'structure',
      renderSystem: 'graphics',
      form: options.form || EntityForms.BUILDING,
      size: options.size || 20,
      color: options.color || 0x8B4513, // Коричневый
      name: options.name || 'Строение',
      ...options
    });
  }
  
  /**
   * 👥 Создать юнита (graphics)
   */
  static createUnit(x, y, options = {}) {
    return new Entity({
      x, y,
      type: 'unit',
      renderSystem: 'graphics',
      form: options.form || EntityForms.SOLDIER,
      size: options.size || 7,
      color: options.color || 0x00FF00, // Зеленый
      name: options.name || 'Юнит',
      ...options
    });
  }
  
  /**
   * 🌿 Создать декорацию (graphics)
   */
  static createDecoration(x, y, options = {}) {
    return new Entity({
      x, y,
      type: 'decoration',
      renderSystem: 'graphics',
      form: options.form || EntityForms.CIRCLE,
      size: options.size || 5,
      color: options.color || 0x888888, // Серый
      name: options.name || 'Декорация',
      ...options
    });
  }
  
  // 👤 SPRITE СИСТЕМА (Terraria-стиль)
  
  /**
   * 👤 Создать sprite персонажа с точками привязки
   */
  static createSpriteCharacter(x, y, options = {}) {
    return new Entity({
      x, y,
      type: 'character',
      renderSystem: 'sprite',
      sprite: options.sprite || 'character_base.png',
      attachmentPoints: {
        'head': { x: 0, y: -22 },
        'chest': { x: 0, y: -12 },
        'hand_right': { x: 8, y: -8 },
        'hand_left': { x: -8, y: -8 },
        'waist': { x: 0, y: -2 },
        'feet': { x: 0, y: 15 },
        ...options.attachmentPoints
      },
      equippedItems: options.equippedItems || {},
      name: options.name || 'Sprite Персонаж',
      ...options
    });
  }
  
  /**
   * 🏰 Создать sprite строение
   */
  static createSpriteBuilding(x, y, options = {}) {
    return new Entity({
      x, y,
      type: 'structure',
      renderSystem: 'sprite',
      sprite: options.sprite || 'building_base.png',
      name: options.name || 'Sprite Строение',
      ...options
    });
  }
  
  /**
   * 🌳 Создать sprite декорацию
   */
  static createSpriteDecoration(x, y, options = {}) {
    return new Entity({
      x, y,
      type: 'decoration',
      renderSystem: 'sprite',
      sprite: options.sprite || 'decoration_base.png',
      name: options.name || 'Sprite Декорация',
      ...options
    });
  }
  
  // 🦴 SKELETAL СИСТЕМА (продвинутая анимация)
  
  /**
   * 🤺 Создать skeletal персонажа
   */
  static createSkeletalCharacter(x, y, options = {}) {
    return new Entity({
      x, y,
      type: 'character',
      renderSystem: 'skeletal',
      skeleton: options.skeleton || 'character_skeleton.json',
      currentAnimation: options.currentAnimation || 'idle',
      animations: {
        'idle': { loop: true, speed: 1.0 },
        'walk': { loop: true, speed: 1.2 },
        'run': { loop: true, speed: 2.0 },
        'attack': { loop: false, speed: 1.5 },
        'death': { loop: false, speed: 0.8 },
        ...options.animations
      },
      name: options.name || 'Skeletal Персонаж',
      ...options
    });
  }
  
  /**
   * 🐉 Создать skeletal существо/монстра
   */
  static createSkeletalCreature(x, y, options = {}) {
    return new Entity({
      x, y,
      type: 'unit',
      renderSystem: 'skeletal',
      skeleton: options.skeleton || 'creature_skeleton.json',
      currentAnimation: options.currentAnimation || 'idle',
      animations: {
        'idle': { loop: true, speed: 0.8 },
        'move': { loop: true, speed: 1.5 },
        'attack': { loop: false, speed: 2.0 },
        'special': { loop: false, speed: 1.0 },
        ...options.animations
      },
      name: options.name || 'Skeletal Существо',
      ...options
    });
  }
}
