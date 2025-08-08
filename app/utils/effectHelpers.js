/**
 * Хелперы для визуальных эффектов и анимации
 */
import * as PIXI from 'pixi.js';
import { createFadeOutEffect } from './pixiHelpers.js';
import { checkExplosionCollision, dealDamage } from './gameHelpers.js';

// ==================== ВИЗУАЛЬНЫЕ ЭФФЕКТЫ ====================

/**
 * Создает визуальный эффект луча для raycast
 * @param {number} startX - начальная X координата
 * @param {number} startY - начальная Y координата  
 * @param {number} endX - конечная X координата
 * @param {number} endY - конечная Y координата
 * @param {PIXI.Application} app - приложение PIXI
 * @param {Array} effectsArray - массив эффектов для управления
 */
export function createRayVisual(startX, startY, endX, endY, app, effectsArray) {
  const rayLine = new PIXI.Graphics();
  rayLine.moveTo(startX, startY);
  rayLine.lineTo(endX, endY);
  rayLine.stroke({ width: 3, color: 0xff0000, alpha: 0.8 }); // Красная линия
  
  effectsArray.push(rayLine);
  app.stage.addChild(rayLine);
  
  // Луч исчезает быстро
  createFadeOutEffect(rayLine, app, effectsArray, {
    alphaStep: 0.1,
    scaleStep: 0,
    delay: 50
  });
}

/**
 * Создает эффект точки попадания
 * @param {number} x - X координата
 * @param {number} y - Y координата
 * @param {string} type - тип точки ('hit', 'ricochet', 'end')
 * @param {PIXI.Application} app - приложение PIXI
 * @param {Array} effectsArray - массив эффектов для управления
 */
export function createImpactPoint(x, y, type, app, effectsArray) {
  const impact = new PIXI.Graphics();
  
  switch (type) {
    case 'hit':
      // Красная точка попадания во врага
      impact.circle(0, 0, 6).fill(0xff0000);
      break;
    case 'ricochet':
      // Желтая точка рикошета
      impact.circle(0, 0, 4).fill(0xffff00);
      break;
    case 'end':
      // Синяя точка окончания луча
      impact.circle(0, 0, 3).fill(0x0088ff);
      break;
    default:
      // По умолчанию белая точка
      impact.circle(0, 0, 4).fill(0xffffff);
  }
  
  impact.alpha = 0.8;
  impact.position.set(x, y);
  
  effectsArray.push(impact);
  app.stage.addChild(impact);
  
  // Точки исчезают медленнее чем вспышка
  createFadeOutEffect(impact, app, effectsArray, {
    alphaStep: 0.05,
    scaleStep: 0.02,
    delay: 100
  });
}

/**
 * Создает эффект взрыва с уроном
 * @param {number} x - X координата взрыва
 * @param {number} y - Y координата взрыва
 * @param {number} radius - радиус взрыва
 * @param {number} damage - урон взрыва
 * @param {PIXI.Application} app - приложение PIXI
 * @param {Array} effectsArray - массив эффектов для управления
 * @param {Array} obstacles - массив препятствий для проверки коллизий
 * @param {Function} respawnCallback - функция респавна для препятствий
 * @param {number} color - цвет взрыва (по умолчанию красноватый)
 */
export function createExplosion(x, y, radius, damage, app, effectsArray, obstacles, respawnCallback, color = 0xff4444) {
  // Создаем визуальный эффект взрыва
  const explosion = new PIXI.Graphics();
  explosion.circle(0, 0, radius).fill(color);
  explosion.alpha = 0.8;
  explosion.position.set(x, y);
  effectsArray.push(explosion);
  app.stage.addChild(explosion);
  
  // Проверяем коллизии взрыва с препятствиями
  for (const obstacle of obstacles) {
    if (obstacle.isAlive && checkExplosionCollision(x, y, radius, obstacle)) {
      dealDamage(obstacle, damage, respawnCallback);
    }
  }
  
  // Эффект исчезновения взрыва
  createFadeOutEffect(explosion, app, effectsArray, {
    alphaStep: 0.08,
    scaleStep: 0.03,
    delay: 0
  });
}

// ==================== СОБЫТИЯ СНАРЯДОВ ====================

/**
 * Обрабатывает события снарядов
 * @param {Object} bullet - снаряд
 * @param {string} eventName - название события
 * @param {Object} ticker - объект ticker
 * @param {Object} weaponConfig - конфигурация оружия
 * @param {Function} applyEffectCallback - функция применения эффектов
 * @param {Object} extraData - дополнительные данные
 */
export function triggerBulletEvent(bullet, eventName, ticker, weaponConfig, applyEffectCallback, extraData = {}) {
  const eventEffects = weaponConfig.events[eventName] || [];
  
  eventEffects.forEach(effect => {
    // Проверяем частоту/дистанцию (только для onFlight)
    if (eventName === 'onFlight') {
      const triggerType = effect.triggerType || 'time';
      
      if (triggerType === 'time' && effect.frequency) {
        // Проверка по времени
        if (!bullet.eventTimers) bullet.eventTimers = {};
        const effectKey = effect.effectId || effect.name;
        if (!bullet.eventTimers[effectKey]) bullet.eventTimers[effectKey] = 0;
        
        bullet.eventTimers[effectKey] += ticker.elapsedMS;
        if (bullet.eventTimers[effectKey] < effect.frequency) return;
        bullet.eventTimers[effectKey] = 0; // Сбрасываем таймер
        
      } else if (triggerType === 'distance' && effect.distance) {
        // Проверка по расстоянию
        if (!bullet.eventDistances) bullet.eventDistances = {};
        const effectKey = effect.effectId || effect.name;
        if (!bullet.eventDistances[effectKey]) bullet.eventDistances[effectKey] = 0;
        
        const currentDistance = bullet.distanceTraveled;
        const nextTriggerDistance = bullet.eventDistances[effectKey] + effect.distance;
        
        if (currentDistance < nextTriggerDistance) return;
        bullet.eventDistances[effectKey] = nextTriggerDistance; // Обновляем следующую цель
      }
    }
    
    // Проверяем шанс срабатывания
    const chance = effect.chance || 100;
    if (Math.random() * 100 > chance) return;
    
    // Применяем эффект
    if (applyEffectCallback) {
      const effectId = effect.effectId || effect.name;
      applyEffectCallback(bullet, effectId, effect.params || {}, extraData);
    }
  });
}

/**
 * Применяет стандартные эффекты снарядов
 * @param {Object} bullet - снаряд
 * @param {string} effectName - название эффекта
 * @param {Object} context - контекст для применения эффектов
 * @param {Object} extraData - дополнительные данные
 */
export function applyStandardEffect(bullet, effectName, context, extraData = {}) {
  const { app, explosions, obstacles, respawnCallback } = context;
  
  switch (effectName) {
    case 'explosion':
      // Создаем взрыв с стандартными параметрами
      createExplosion(bullet.x, bullet.y, 50, 3, app, explosions, obstacles, respawnCallback);
      break;
    // Здесь можно добавить другие эффекты: freeze, lightning, etc.
  }
}

// ==================== СИСТЕМЫ УПРАВЛЕНИЯ ПОВОРОТОМ ====================

/**
 * Обновляет поворот игрока к курсору
 * @param {Object} player - игрок с координатами и поворотом
 * @param {Object} mousePosition - позиция курсора {x, y}
 * @param {number} rotationSpeed - скорость поворота
 */
export function updatePlayerRotation(player, mousePosition, rotationSpeed = 0.1) {
  const targetRotation = Math.atan2(mousePosition.y - player.y, mousePosition.x - player.x);
  let delta = targetRotation - player.rotation;
  
  // Нормализуем угол
  if (delta > Math.PI) delta -= 2 * Math.PI;
  if (delta < -Math.PI) delta += 2 * Math.PI;
  
  player.rotation += delta * rotationSpeed;
}

/**
 * Обновляет движение игрока
 * @param {Object} player - игрок с координатами
 * @param {Object} keys - состояние клавиш
 * @param {number} speed - скорость движения
 * @param {number} deltaTime - время кадра
 */
export function updatePlayerMovement(player, keys, speed, deltaTime) {
  const movement = { x: 0, y: 0 };
  
  if (keys['ArrowUp']) movement.y = -1;
  if (keys['ArrowDown']) movement.y = 1;
  if (keys['ArrowLeft']) movement.x = -1;
  if (keys['ArrowRight']) movement.x = 1;
  
  player.x += movement.x * speed * deltaTime;
  player.y += movement.y * speed * deltaTime;
}

// ==================== СИСТЕМА ПЕРЕЗАРЯДКИ ====================

/**
 * Обновляет систему перезарядки
 * @param {Object} ammoState - состояние боеприпасов (изменяется по ссылке)
 * @param {Object} weaponConfig - конфигурация оружия
 * @param {number} currentTime - текущее время
 * @param {number} reloadStartTime - время начала перезарядки
 * @returns {boolean} завершилась ли перезарядка
 */
export function updateReloadSystem(ammoState, weaponConfig, currentTime, reloadStartTime) {
  if (!ammoState.isReloading) return false;
  
  const reloadDuration = weaponConfig.reloadTime * 1000; // Конвертируем в миллисекунды
  
  if (currentTime - reloadStartTime >= reloadDuration) {
    // Перезарядка завершена
    ammoState.isReloading = false;
    ammoState.currentAmmo = weaponConfig.maxAmmo;
    return true;
  }
  
  return false;
}