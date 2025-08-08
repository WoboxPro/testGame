/**
 * Хелперы для PIXI.js игры - вынесенные дублирующиеся функции
 */
import * as PIXI from 'pixi.js';

/**
 * Вычисляет финальный угол для снаряда с учетом разброса
 * @param {number} baseAngle - базовый угол в радианах
 * @param {number} bulletIndex - индекс снаряда (для веерной стрельбы)
 * @param {Object} weaponConfig - конфигурация оружия
 * @returns {number} финальный угол в радианах
 */
export function calculateFinalAngle(baseAngle, bulletIndex, weaponConfig) {
  let finalAngle = baseAngle;
  
  if (weaponConfig.fanSpread && weaponConfig.bulletsPerShot > 1) {
    // ВЕЕРНАЯ СТРЕЛЬБА: равномерное распределение по дуге
    const fanAngleRad = (weaponConfig.fanAngle * Math.PI) / 180;
    const stepAngle = fanAngleRad / (weaponConfig.bulletsPerShot - 1);
    const startAngle = baseAngle - fanAngleRad / 2;
    finalAngle = startAngle + (stepAngle * bulletIndex);
    
  } else if (!weaponConfig.fanSpread && weaponConfig.spread > 0 && weaponConfig.maxSpreadAngle > 0) {
    // СЛУЧАЙНЫЙ РАЗБРОС
    const randomSpread = (Math.random() - 0.5) * 2;
    const spreadAngleRad = (randomSpread * weaponConfig.spread * weaponConfig.maxSpreadAngle) * (Math.PI / 180);
    finalAngle = baseAngle + spreadAngleRad;
  }
  
  return finalAngle;
}

/**
 * Вычисляет индивидуальную дальность с разбросом
 * @param {Object} weaponConfig - конфигурация оружия
 * @returns {number} дальность с учетом разброса
 */
export function calculateRangeWithSpread(weaponConfig) {
  let maxRange = weaponConfig.maxRange;
  
  if (weaponConfig.rangeSpread > 0 && weaponConfig.maxRangeLoss > 0) {
    const randomSpread = Math.random() * weaponConfig.rangeSpread;
    const rangeLoss = randomSpread * (weaponConfig.maxRangeLoss / 100);
    maxRange = weaponConfig.maxRange * (1 - rangeLoss);
  }
  
  return maxRange;
}

/**
 * Применяет отдачу к игроку
 * @param {PIXI.Graphics} player - объект игрока
 * @param {number} baseAngle - базовый угол выстрела
 * @param {Object} weaponConfig - конфигурация оружия
 * @param {Object} screenBounds - границы экрана {width, height}
 */
export function applyRecoil(player, baseAngle, weaponConfig, screenBounds) {
  if (weaponConfig.recoil <= 0) return;
  
  // Отдача в противоположную сторону
  const recoilAngle = baseAngle + Math.PI; // + 180 градусов
  const recoilForce = weaponConfig.recoil * weaponConfig.bulletsPerShot;
  
  // Применяем силу отдачи к игроку
  const recoilX = Math.cos(recoilAngle) * recoilForce;
  const recoilY = Math.sin(recoilAngle) * recoilForce;
  
  player.x += recoilX;
  player.y += recoilY;
  
  // Проверяем границы после отдачи
  const boundLeft = 25, boundRight = 25, boundTop = 25, boundBottom = 25;
  player.x = Math.max(boundLeft, Math.min(player.x, screenBounds.width - boundRight));
  player.y = Math.max(boundTop, Math.min(player.y, screenBounds.height - boundBottom));
}

/**
 * Проверяет, можно ли стрелять (проверка скорострельности и обоймы)
 * @param {number} currentTime - текущее время
 * @param {number} lastFireTime - время последнего выстрела
 * @param {Object} weaponConfig - конфигурация оружия
 * @param {Object} ammoState - состояние обоймы {currentAmmo, isReloading}
 * @returns {boolean} можно ли стрелять
 */
export function canFireWeapon(currentTime, lastFireTime, weaponConfig, ammoState) {
  // Проверка скорострельности
  if (currentTime - lastFireTime < weaponConfig.fireRate) return false;
  
  // Проверка обоймы
  if (weaponConfig.useAmmoSystem) {
    if (ammoState.isReloading) return false;
    if (ammoState.currentAmmo <= 0) return false;
  }
  
  return true;
}

/**
 * Расходует патроны
 * @param {Object} ammoState - состояние обоймы (изменяется по ссылке)
 * @param {Object} weaponConfig - конфигурация оружия
 * @param {number} bulletsCount - количество снарядов
 */
export function consumeAmmo(ammoState, weaponConfig, bulletsCount) {
  if (!weaponConfig.useAmmoSystem) return;
  
  if (weaponConfig.ammoPerShot) {
    // Расход за выстрел (один патрон независимо от количества снарядов)
    ammoState.currentAmmo = Math.max(0, ammoState.currentAmmo - 1);
  } else {
    // Расход за каждый снаряд
    ammoState.currentAmmo = Math.max(0, ammoState.currentAmmo - bulletsCount);
  }
}

/**
 * Проверяет границы экрана для объекта
 * @param {Object} object - объект с координатами {x, y}
 * @param {Object} screenBounds - границы экрана {width, height}
 * @param {Object} weaponConfig - конфигурация оружия
 * @returns {boolean} нужно ли удалить объект
 */
export function checkScreenBounds(object, screenBounds, weaponConfig) {
  if (!weaponConfig.allowOffScreen) {
    // Если снаряды НЕ могут улетать за экран - удаляем при выходе за границы
    if (object.x < -10 || object.x > screenBounds.width + 10 || 
        object.y < -10 || object.y > screenBounds.height + 10) {
      return true;
    }
  } else if (!weaponConfig.infiniteOffScreen) {
    // Если снаряды могут улетать за экран, но НЕ бесконечно - используем настраиваемый лимит
    const limit = weaponConfig.offScreenLimit;
    if (object.x < -limit || object.x > screenBounds.width + limit || 
        object.y < -limit || object.y > screenBounds.height + limit) {
      return true;
    }
  }
  // Если infiniteOffScreen = true, то снаряды никогда не удаляются по границам экрана
  return false;
}

/**
 * Проверяет, касается ли объект края экрана
 * @param {Object} object - объект с координатами {x, y}
 * @param {Object} screenBounds - границы экрана {width, height}
 * @param {number} margin - отступ от края (по умолчанию 4)
 * @returns {boolean} касается ли края экрана
 */
export function isAtScreenEdge(object, screenBounds, margin = 4) {
  return object.x <= margin || object.x >= screenBounds.width - margin || 
         object.y <= margin || object.y >= screenBounds.height - margin;
}

/**
 * Универсальная функция создания эффекта исчезновения
 * @param {PIXI.Graphics} effect - графический объект эффекта
 * @param {PIXI.Application} app - приложение PIXI
 * @param {Array} effectsArray - массив эффектов для удаления
 * @param {Object} options - опции анимации
 */
export function createFadeOutEffect(effect, app, effectsArray, options = {}) {
  const {
    alphaStep = 0.08,
    scaleStep = 0.03,
    delay = 0
  } = options;
  
  const fadeOut = () => {
    effect.alpha -= alphaStep;
    if (scaleStep > 0) {
      effect.scale.x += scaleStep;
      effect.scale.y += scaleStep;
    }
    
    if (effect.alpha <= 0) {
      app.stage.removeChild(effect);
      effect.destroy();
      const index = effectsArray.indexOf(effect);
      if (index > -1) {
        effectsArray.splice(index, 1);
      }
    } else {
      requestAnimationFrame(fadeOut);
    }
  };
  
  if (delay > 0) {
    setTimeout(fadeOut, delay);
  } else {
    fadeOut();
  }
}

/**
 * Вычисляет рикошет от стен
 * @param {Object} object - объект с координатами и скоростью {x, y, vx, vy}
 * @param {Object} screenBounds - границы экрана {width, height}
 * @param {number} margin - отступ от края
 * @returns {Object} новый угол и флаг рикошета {angle, hasRicocheted}
 */
export function calculateWallRicochet(object, screenBounds, margin = 4) {
  let hasRicocheted = false;
  let newAngle = Math.atan2(object.vy, object.vx);
  
  // Проверяем левую и правую стены
  if (object.x <= margin || object.x >= screenBounds.width - margin) {
    object.vx = -object.vx; // Инвертируем горизонтальную скорость
    object.x = Math.max(margin, Math.min(object.x, screenBounds.width - margin));
    hasRicocheted = true;
  }
  
  // Проверяем верхнюю и нижнюю стены
  if (object.y <= margin || object.y >= screenBounds.height - margin) {
    object.vy = -object.vy; // Инвертируем вертикальную скорость
    object.y = Math.max(margin, Math.min(object.y, screenBounds.height - margin));
    hasRicocheted = true;
  }
  
  if (hasRicocheted) {
    newAngle = Math.atan2(object.vy, object.vx);
  }
  
  return { angle: newAngle, hasRicocheted };
}

/**
 * Вычисляет рикошет от стен для raycast
 * @param {number} currentX - текущая X координата
 * @param {number} currentY - текущая Y координата  
 * @param {number} angle - текущий угол
 * @param {Object} screenBounds - границы экрана {width, height}
 * @returns {Object} новый угол, координаты и флаг рикошета
 */
export function calculateRaycastWallRicochet(currentX, currentY, angle, screenBounds) {
  let hasRicocheted = false;
  let newAngle = angle;
  let newX = currentX;
  let newY = currentY;
  
  // Проверяем левую и правую стены
  if (currentX <= 0 || currentX >= screenBounds.width) {
    newAngle = Math.PI - angle; // Отражение по горизонтали
    newX = Math.max(0, Math.min(currentX, screenBounds.width));
    hasRicocheted = true;
  }
  
  // Проверяем верхнюю и нижнюю стены
  if (currentY <= 0 || currentY >= screenBounds.height) {
    newAngle = -angle; // Отражение по вертикали
    newY = Math.max(0, Math.min(currentY, screenBounds.height));
    hasRicocheted = true;
  }
  
  return { 
    angle: newAngle, 
    x: newX, 
    y: newY, 
    hasRicocheted 
  };
}

/**
 * Создает мuzzle flash эффект
 * @param {number} x - X координата
 * @param {number} y - Y координата
 * @param {PIXI.Application} app - приложение PIXI
 * @param {Array} effectsArray - массив эффектов
 */
export function createMuzzleFlash(x, y, app, effectsArray) {
  const flash = new PIXI.Graphics();
  flash.circle(0, 0, 8).fill(0xffffff); // Белая вспышка
  flash.alpha = 0.9;
  flash.position.set(x, y);
  
  effectsArray.push(flash);
  app.stage.addChild(flash);
  
  createFadeOutEffect(flash, app, effectsArray, {
    alphaStep: 0.2,
    scaleStep: 0.1,
    delay: 30
  });
}