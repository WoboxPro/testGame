/**
 * Дополнительные хелперы для игровой логики
 */
import * as PIXI from 'pixi.js';

// ==================== МАТЕМАТИЧЕСКИЕ УТИЛИТЫ ====================

/**
 * Вычисляет расстояние между двумя точками
 * @param {number} x1 - X координата первой точки
 * @param {number} y1 - Y координата первой точки
 * @param {number} x2 - X координата второй точки
 * @param {number} y2 - Y координата второй точки
 * @returns {number} расстояние между точками
 */
export function calculateDistance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Нормализует угол в диапазоне -PI до PI
 * @param {number} angle - угол в радианах
 * @returns {number} нормализованный угол
 */
export function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}

/**
 * Вычисляет угол между двумя точками
 * @param {number} x1 - X координата первой точки
 * @param {number} y1 - Y координата первой точки
 * @param {number} x2 - X координата второй точки
 * @param {number} y2 - Y координата второй точки
 * @returns {number} угол в радианах
 */
export function calculateAngleBetween(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

// ==================== КОЛЛИЗИИ ====================

/**
 * Проверяет столкновение между двумя кругами
 * @param {Object} circle1 - первый круг {x, y, radius}
 * @param {Object} circle2 - второй круг {x, y, radius}
 * @returns {boolean} произошло ли столкновение
 */
export function checkCircleCollision(circle1, circle2) {
  const distance = calculateDistance(circle1.x, circle1.y, circle2.x, circle2.y);
  return distance < circle1.radius + circle2.radius;
}

/**
 * Проверяет столкновение игрока с препятствием (AABB)
 * @param {PIXI.Graphics} player - объект игрока
 * @param {PIXI.Graphics} obstacle - объект препятствия
 * @param {number} inset - отступ для хитбокса игрока
 * @returns {boolean} произошло ли столкновение
 */
export function checkPlayerObstacleCollision(player, obstacle, inset = 10) {
  const boundsObstacle = obstacle.getBounds();
  const boundsPlayer = player.getBounds();
  const playerHitbox = new PIXI.Rectangle(
    boundsPlayer.x + inset,
    boundsPlayer.y + inset,
    Math.max(0, boundsPlayer.width - inset * 2),
    Math.max(0, boundsPlayer.height - inset * 2)
  );
  
  return playerHitbox.x < boundsObstacle.x + boundsObstacle.width &&
         playerHitbox.x + playerHitbox.width > boundsObstacle.x &&
         playerHitbox.y < boundsObstacle.y + boundsObstacle.height &&
         playerHitbox.y + playerHitbox.height > boundsObstacle.y;
}

/**
 * Проверяет столкновение снаряда с препятствием (круги)
 * @param {Object} bullet - снаряд с координатами {x, y, bulletRadius}
 * @param {Object} obstacle - препятствие с координатами {x, y}
 * @param {number} obstacleRadius - радиус препятствия
 * @returns {boolean} произошло ли столкновение
 */
export function checkBulletObstacleCollision(bullet, obstacle, obstacleRadius = 20) {
  const bulletRadius = bullet.bulletRadius || 4;
  return checkCircleCollision(
    { x: bullet.x, y: bullet.y, radius: bulletRadius },
    { x: obstacle.x, y: obstacle.y, radius: obstacleRadius }
  );
}

/**
 * Проверяет столкновение взрыва с препятствием
 * @param {number} explosionX - X координата взрыва
 * @param {number} explosionY - Y координата взрыва
 * @param {number} explosionRadius - радиус взрыва
 * @param {Object} obstacle - препятствие с координатами {x, y}
 * @param {number} obstacleRadius - радиус препятствия
 * @returns {boolean} произошло ли столкновение
 */
export function checkExplosionCollision(explosionX, explosionY, explosionRadius, obstacle, obstacleRadius = 20) {
  const distance = calculateDistance(explosionX, explosionY, obstacle.x, obstacle.y);
  return distance <= explosionRadius + obstacleRadius;
}

// ==================== СИСТЕМА ЗДОРОВЬЯ И РЕСПАВНА ====================

/**
 * Наносит урон объекту
 * @param {Object} target - цель с параметрами {health, isAlive}
 * @param {number} damage - количество урона
 * @param {Function} respawnCallback - функция респавна
 * @returns {boolean} был ли объект уничтожен
 */
export function dealDamage(target, damage, respawnCallback) {
  if (!target.isAlive) return false;
  
  target.health -= damage;
  
  if (target.health <= 0) {
    if (respawnCallback) {
      respawnCallback(target);
    }
    return true; // Объект уничтожен
  }
  
  return false; // Объект выжил
}

/**
 * Создает функцию респавна для объекта
 * @param {number} delay - задержка респавна в миллисекундах
 * @param {Object} screenBounds - границы экрана {width, height}
 * @param {number} margin - отступ от краев экрана
 * @returns {Function} функция респавна
 */
export function createRespawnFunction(delay, screenBounds, margin = 50) {
  return function respawn(obj) {
    obj.isAlive = false;
    obj.visible = false;
    
    setTimeout(() => {
      obj.x = Math.random() * (screenBounds.width - margin * 2) + margin;
      obj.y = Math.random() * (screenBounds.height - margin * 2) + margin;
      obj.health = obj.maxHealth; // Восстанавливаем здоровье
      obj.isAlive = true;
      obj.visible = true;
    }, delay);
  };
}

// ==================== СОЗДАНИЕ ИГРОВЫХ ОБЪЕКТОВ ====================

/**
 * Создает игрока (красный треугольник)
 * @param {number} x - начальная X координата
 * @param {number} y - начальная Y координата
 * @returns {PIXI.Graphics} объект игрока
 */
export function createPlayer(x = 400, y = 300) {
  const player = new PIXI.Graphics();
  player.entityType = 'player';
  // Рисуем треугольник
  player.poly([0, -25, 50, 0, 0, 25]).fill(0xde3249);
  // Ставим опорную точку в центр основания
  player.pivot.set(25, 0);
  player.position.set(x, y);
  return player;
}

/**
 * Создает препятствие (белый квадрат)
 * @param {number} x - начальная X координата
 * @param {number} y - начальная Y координата
 * @param {number} health - здоровье объекта
 * @returns {PIXI.Graphics} объект препятствия
 */
export function createObstacle(x = 200, y = 250, health = 1) {
  const obstacle = new PIXI.Graphics();
  obstacle.entityType = 'box';
  obstacle.isAlive = true;
  obstacle.health = health;
  obstacle.maxHealth = health;
  obstacle.rect(0, 0, 40, 40).fill(0xffffff);
  obstacle.pivot.set(20, 20);
  obstacle.position.set(x, y);
  return obstacle;
}

/**
 * Создает снаряд
 * @param {number} x - начальная X координата
 * @param {number} y - начальная Y координата
 * @param {number} vx - скорость по X
 * @param {number} vy - скорость по Y
 * @param {Object} weaponConfig - конфигурация оружия
 * @param {number} maxRange - максимальная дальность
 * @returns {PIXI.Graphics} объект снаряда
 */
export function createBullet(x, y, vx, vy, weaponConfig, maxRange) {
  const bullet = new PIXI.Graphics();
  bullet.entityType = 'bullet';
  
  // Определяем размер пули
  const bulletRadius = weaponConfig.largeBullets ? weaponConfig.bulletSize / 2 : 4;
  bullet.bulletRadius = bulletRadius;
  
  bullet.circle(0, 0, bulletRadius).fill(0xffff00);
  bullet.position.set(x, y);
  
  // Физические свойства
  bullet.vx = vx;
  bullet.vy = vy;
  bullet.penetrationLeft = weaponConfig.penetration;
  bullet.distanceTraveled = 0;
  bullet.timeAlive = 0;
  bullet.maxLifetime = weaponConfig.bulletLifetime;
  bullet.ricochetsLeft = weaponConfig.maxRicochets;
  bullet.damage = weaponConfig.bulletDamage;
  bullet.maxRange = maxRange;
  bullet.startX = x;
  bullet.startY = y;
  
  // Системы эффектов
  bullet.homingActive = false;
  bullet.homingTimer = 0;
  bullet.gravityActive = false;
  bullet.gravityTimer = 0;
  bullet.gravityVelocityX = 0;
  bullet.gravityVelocityY = 0;
  
  // Флаги событий
  bullet.hasTriggeredScreenEdge = false;
  bullet.eventTimers = {};
  bullet.eventDistances = {};
  
  return bullet;
}

// ==================== СИСТЕМЫ ФИЗИКИ ====================

/**
 * Обновляет систему самонаведения снаряда
 * @param {Object} bullet - снаряд
 * @param {Object} target - цель {x, y}
 * @param {Object} weaponConfig - конфигурация оружия
 * @param {Object} ticker - объект ticker для deltaTime
 */
export function updateHomingSystem(bullet, target, weaponConfig, ticker) {
  if (!weaponConfig.homingEnabled) return;
  
  // Обновляем таймер самонаведения
  bullet.homingTimer += ticker.elapsedMS;
  
  // Активируем самонаведение после задержки
  if (!bullet.homingActive && bullet.homingTimer >= weaponConfig.homingDelay) {
    bullet.homingActive = true;
  }
  
  // Применяем самонаведение если оно активно
  if (bullet.homingActive) {
    const toTargetX = target.x - bullet.x;
    const toTargetY = target.y - bullet.y;
    const distanceToTarget = Math.sqrt(toTargetX * toTargetX + toTargetY * toTargetY);
    
    if (distanceToTarget > 10) { // Избегаем дрожания
      // Нормализуем вектор к цели
      const targetDirectionX = toTargetX / distanceToTarget;
      const targetDirectionY = toTargetY / distanceToTarget;
      
      // Текущая скорость пули
      const currentSpeed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
      
      // Нормализуем текущее направление
      const currentDirectionX = bullet.vx / currentSpeed;
      const currentDirectionY = bullet.vy / currentSpeed;
      
      // Вычисляем максимальный поворот за кадр
      const maxTurnRadians = (weaponConfig.maxTurnRate * Math.PI / 180) * ticker.deltaTime;
      
      // Вычисляем угол между текущим направлением и целью
      const cross = currentDirectionX * targetDirectionY - currentDirectionY * targetDirectionX;
      const dot = currentDirectionX * targetDirectionX + currentDirectionY * targetDirectionY;
      const angleToTarget = Math.atan2(cross, dot);
      
      // Ограничиваем поворот максимальным углом
      const turnAngle = Math.max(-maxTurnRadians, Math.min(maxTurnRadians, angleToTarget));
      
      // Применяем поворот с учетом силы самонаведения
      const actualTurnAngle = turnAngle * weaponConfig.homingStrength;
      
      // Поворачиваем направление пули
      const cos = Math.cos(actualTurnAngle);
      const sin = Math.sin(actualTurnAngle);
      
      const newDirectionX = currentDirectionX * cos - currentDirectionY * sin;
      const newDirectionY = currentDirectionX * sin + currentDirectionY * cos;
      
      // Обновляем скорость пули с новым направлением
      bullet.vx = newDirectionX * currentSpeed;
      bullet.vy = newDirectionY * currentSpeed;
    }
  }
}

/**
 * Обновляет систему гравитации снаряда
 * @param {Object} bullet - снаряд
 * @param {Object} weaponConfig - конфигурация оружия
 * @param {Object} ticker - объект ticker для deltaTime
 */
export function updateGravitySystem(bullet, weaponConfig, ticker) {
  if (!weaponConfig.gravityEnabled) return;
  
  // Обновляем таймер гравитации
  bullet.gravityTimer += ticker.elapsedMS;
  
  // Активируем гравитацию после задержки
  if (!bullet.gravityActive && bullet.gravityTimer >= weaponConfig.gravityDelay) {
    bullet.gravityActive = true;
  }
  
  // Применяем гравитацию если она активна
  if (bullet.gravityActive) {
    // Вычисляем направление гравитации
    const gravityAngleRad = (weaponConfig.gravityDirection * Math.PI) / 180;
    const gravityDirX = Math.cos(gravityAngleRad);
    const gravityDirY = Math.sin(gravityAngleRad);
    
    // Увеличиваем скорость под действием гравитации
    bullet.gravityVelocityX += gravityDirX * weaponConfig.gravityStrength * ticker.deltaTime;
    bullet.gravityVelocityY += gravityDirY * weaponConfig.gravityStrength * ticker.deltaTime;
    
    // Ограничиваем максимальную скорость падения
    const gravitySpeed = Math.sqrt(bullet.gravityVelocityX * bullet.gravityVelocityX + bullet.gravityVelocityY * bullet.gravityVelocityY);
    if (gravitySpeed > weaponConfig.maxFallSpeed) {
      const factor = weaponConfig.maxFallSpeed / gravitySpeed;
      bullet.gravityVelocityX *= factor;
      bullet.gravityVelocityY *= factor;
    }
    
    // Применяем гравитацию к скорости пули
    bullet.vx += bullet.gravityVelocityX * ticker.deltaTime;
    bullet.vy += bullet.gravityVelocityY * ticker.deltaTime;
  }
}

/**
 * Обновляет движение снаряда
 * @param {Object} bullet - снаряд
 * @param {Object} ticker - объект ticker для deltaTime
 */
export function updateBulletMovement(bullet, ticker) {
  const oldX = bullet.x;
  const oldY = bullet.y;
  
  // Применяем скорость
  bullet.x += bullet.vx * ticker.deltaTime;
  bullet.y += bullet.vy * ticker.deltaTime;
  
  // Обновляем пройденное расстояние
  const dx = bullet.x - oldX;
  const dy = bullet.y - oldY;
  bullet.distanceTraveled += Math.sqrt(dx * dx + dy * dy);
  
  // Обновляем время жизни
  bullet.timeAlive += ticker.elapsedMS / 1000;
}

/**
 * Проверяет, должен ли снаряд быть удален
 * @param {Object} bullet - снаряд
 * @returns {boolean} нужно ли удалить снаряд
 */
export function shouldRemoveBullet(bullet) {
  // Проверяем время жизни
  if (bullet.timeAlive >= bullet.maxLifetime) {
    return true;
  }
  
  // Проверяем дальность полета
  if (bullet.distanceTraveled > bullet.maxRange) {
    return true;
  }
  
  return false;
}

// ==================== УТИЛИТЫ ДЛЯ ГРАНИЦ ИГРОКА ====================

/**
 * Ограничивает позицию игрока границами экрана
 * @param {Object} player - игрок с координатами {x, y}
 * @param {Object} screenBounds - границы экрана {width, height}
 * @param {Object} bounds - границы игрока {left, right, top, bottom}
 */
export function constrainPlayerToBounds(player, screenBounds, bounds = { left: 25, right: 25, top: 25, bottom: 25 }) {
  player.x = Math.max(bounds.left, Math.min(player.x, screenBounds.width - bounds.right));
  player.y = Math.max(bounds.top, Math.min(player.y, screenBounds.height - bounds.bottom));
}