/**
 * 🔫 ProjectileSystem - Система управления снарядами (пулями)
 *
 * Отвечает за:
 * - Создание пуль из muzzle
 * - Обновление позиций пуль
 * - Удаление пуль по достижению максимальной дистанции
 *
 * Интегрируется с World для автоматического обновления.
 */

import { BulletEntity } from './entities/ProjectileEntity.js';

export class ProjectileSystem {
  constructor(world) {
    this.world = world;

    // Активные пули - Map<bulletId, { bullet, worldId, spawnTime }>
    this.projectiles = new Map();

    // Счетчик для ID пуль
    this._projectileCounter = 1;

    // Muzzle'ы которые могут стрелять - Map<muzzleId, MuzzleEntity>
    this.muzzles = new Map();

    console.log('🔫 ProjectileSystem создана');
  }

  /**
   * 🔫 Зарегистрировать muzzle для стрельбы
   * @param {MuzzleEntity} muzzle - Сущность muzzle
   * @returns {string} - ID muzzle
   */
  registerMuzzle(muzzle) {
    if (!muzzle || !muzzle.id) {
      console.warn('ProjectileSystem.registerMuzzle(): invalid muzzle');
      return null;
    }
    this.muzzles.set(muzzle.id, muzzle);
    console.log(`🔫 Muzzle зарегистрирован: ${muzzle.id}`);
    return muzzle.id;
  }

  /**
   * 🔫 Удалить muzzle из системы
   * @param {string} muzzleId - ID muzzle
   */
  unregisterMuzzle(muzzleId) {
    this.muzzles.delete(muzzleId);
    console.log(`🔫 Muzzle удален: ${muzzleId}`);
  }

  /**
   * 🔫 Создать пулю(ы) из muzzle
   * @param {string} muzzleId - ID muzzle
   * @returns {string[]} - Массив ID созданных пуль (пустой массив если ошибка)
   */
  fireFromMuzzle(muzzleId) {
    const muzzle = this.muzzles.get(muzzleId);
    if (!muzzle) {
      console.warn(`ProjectileSystem.fireFromMuzzle(): muzzle not found: ${muzzleId}`);
      return [];
    }

    // ⚡ Если тип огня - ray, используем raycast
    if (muzzle.fireType === 'ray') {
      return this.fireRayFromMuzzle(muzzleId);
    }

    // Получаем позицию muzzle из world
    const muzzleComponents = this.world.entities.get(muzzleId);
    if (!muzzleComponents) {
      console.warn(`ProjectileSystem.fireFromMuzzle(): muzzle not in world: ${muzzleId}`);
      return [];
    }

    const position = muzzleComponents.get('position');
    if (!position) {
      console.warn(`ProjectileSystem.fireFromMuzzle(): muzzle has no position: ${muzzleId}`);
      return [];
    }

    // Получаем направление с учетом поворота и mirrorDirection
    const rotationComp = muzzleComponents.get('rotation');
    const mirrorDirectionComp = muzzleComponents.get('mirrorDirection');
    const rotation = rotationComp != null
      ? (typeof rotationComp === 'number' ? rotationComp : Number(rotationComp?.value) || 0)
      : (Number(muzzle.rotation) || 0);

    const mirrorDirection = mirrorDirectionComp || muzzle.mirrorDirection || { x: 1, y: 1 };

    // Вычисляем направление с учетом muzzle settings
    const directionMode = muzzle.directionMode || 'relative';
    let baseDirX = muzzle.direction.x;
    let baseDirY = muzzle.direction.y;

    // Применяем rotation к direction ТОЛЬКО для relative режима
    if (directionMode === 'relative') {
      const rotatedDirX = baseDirX * Math.cos(rotation) - baseDirY * Math.sin(rotation);
      const rotatedDirY = baseDirX * Math.sin(rotation) + baseDirY * Math.cos(rotation);
      baseDirX = rotatedDirX * mirrorDirection.x;
      baseDirY = rotatedDirY * mirrorDirection.y;
    }
    // Для static режима rotation НЕ применяется

    // Нормализуем базовое направление
    const dirLength = Math.sqrt(baseDirX * baseDirX + baseDirY * baseDirY);
    if (dirLength > 0) {
      baseDirX /= dirLength;
      baseDirY /= dirLength;
    }

    // Вычисляем базовый угол направления
    const baseAngle = Math.atan2(baseDirY, baseDirX);

    // Получаем параметры множественной стрельбы
    const bulletCount = muzzle.bulletCount || 1;
    const isSpread = muzzle.isSpread || false;
    const spreadAngle = (muzzle.spreadAngle || 45) * (Math.PI / 180); // конвертируем в радианы

    const createdBulletIds = [];

    // Создаем пули
    for (let i = 0; i < bulletCount; i++) {
      let dirX, dirY;

      if (isSpread && bulletCount > 1) {
        // Веерная стрельба - распределяем пули по углу веера равномерно
        // Угол начала веера (отрицательный угол от базового направления)
        const startAngle = baseAngle - spreadAngle / 2;
        // Шаг угла между пулями
        const angleStep = spreadAngle / (bulletCount - 1);
        // Угол текущей пули
        const bulletAngle = startAngle + (i * angleStep);

        dirX = Math.cos(bulletAngle);
        dirY = Math.sin(bulletAngle);
      } else if (!isSpread) {
        // Случайный разброс (для любого количества пуль, включая 1)
        const chance = muzzle.scatterChance ?? 1;
        const roll = Math.random();
        if (roll < chance) {
          // Случайный угол в пределах [-spreadAngle/2, +spreadAngle/2]
          const randomOffset = (Math.random() - 0.5) * spreadAngle;
          const bulletAngle = baseAngle + randomOffset;

          dirX = Math.cos(bulletAngle);
          dirY = Math.sin(bulletAngle);
        } else {
          // Разброс не сработал - по центру
          dirX = baseDirX;
          dirY = baseDirY;
        }
      } else {
        // Стрельба по центру
        dirX = baseDirX;
        dirY = baseDirY;
      }

      // Создаем пулю
      const bulletId = `bullet_${this._projectileCounter++}`;

      // Вычисляем дальность с учетом разброса
      let bulletRange = muzzle.bulletRange;
      if (Math.random() < (muzzle.rangeScatterChance ?? 0)) {
        // Применяем разброс по дальности
        const percent = muzzle.rangeSpreadPercent ?? 10;
        const minRange = bulletRange * (1 - percent / 100);
        // Случайная дальность от minRange до bulletRange
        bulletRange = minRange + Math.random() * (bulletRange - minRange);
      }

      const bullet = new BulletEntity({
        id: bulletId,
        position: { x: position.x, y: position.y },
        direction: { x: dirX, y: dirY },
        speed: muzzle.bulletSpeed,
        range: bulletRange,
        lifetime: muzzle.bulletLifetime || 0,
        color: muzzle.bulletColor || '#FFFFFF',
        size: muzzle.bulletSize || 8,
        piercing: muzzle.bulletPiercing !== undefined ? muzzle.bulletPiercing : 1,
        _rootEntityId: muzzle._rootEntityId || null
      });

      // Добавляем пулю в мир как ECS компоненты
      const bulletComponents = new Map();
      bulletComponents.set('_entityRef', bullet);
      bulletComponents.set('position', bullet.position);
      bulletComponents.set('velocity', { x: dirX * bullet.speed, y: dirY * bullet.speed });
      bulletComponents.set('appearance', bullet.appearance);
      bulletComponents.set('subtype', bullet.subtype);

      // 🎯 Collision component for bullet (point shape)
      bulletComponents.set('collision', {
        type: 'projectile',
        shape: 'point',
        size: 0
      });

      this.world.entities.set(bulletId, bulletComponents);

      // Регистрируем в системе
      this.projectiles.set(bulletId, {
        bullet,
        worldId: this.world.id,
        spawnTime: Date.now(),
        muzzleId
      });

      createdBulletIds.push(bulletId);
    }

    return createdBulletIds;
  }

  /**
   * ⚡ Выпустить луч(и) из muzzle (raycast)
   * @param {string} muzzleId - ID muzzle
   * @returns {string[]} - Массив ID "лучей" (ray_${id}) для совместимости с callbacks
   */
  fireRayFromMuzzle(muzzleId) {
    const muzzle = this.muzzles.get(muzzleId);
    if (!muzzle) {
      console.warn(`ProjectileSystem.fireRayFromMuzzle(): muzzle not found: ${muzzleId}`);
      return [];
    }

    // Получаем позицию muzzle из world
    const muzzleComponents = this.world.entities.get(muzzleId);
    if (!muzzleComponents) {
      console.warn(`ProjectileSystem.fireRayFromMuzzle(): muzzle not in world: ${muzzleId}`);
      return [];
    }

    const position = muzzleComponents.get('position');
    if (!position) {
      console.warn(`ProjectileSystem.fireRayFromMuzzle(): muzzle has no position: ${muzzleId}`);
      return [];
    }

    // Получаем направление с учетом поворота и mirrorDirection
    const rotationComp = muzzleComponents.get('rotation');
    const mirrorDirectionComp = muzzleComponents.get('mirrorDirection');
    const rotation = rotationComp != null
      ? (typeof rotationComp === 'number' ? rotationComp : Number(rotationComp?.value) || 0)
      : (Number(muzzle.rotation) || 0);

    const mirrorDirection = mirrorDirectionComp || muzzle.mirrorDirection || { x: 1, y: 1 };

    // Вычисляем направление с учетом muzzle settings
    const directionMode = muzzle.directionMode || 'relative';
    let baseDirX = muzzle.direction.x;
    let baseDirY = muzzle.direction.y;

    // Применяем rotation к direction ТОЛЬКО для relative режима
    if (directionMode === 'relative') {
      const rotatedDirX = baseDirX * Math.cos(rotation) - baseDirY * Math.sin(rotation);
      const rotatedDirY = baseDirX * Math.sin(rotation) + baseDirY * Math.cos(rotation);
      baseDirX = rotatedDirX * mirrorDirection.x;
      baseDirY = rotatedDirY * mirrorDirection.y;
    }

    // Нормализуем базовое направление
    const dirLength = Math.sqrt(baseDirX * baseDirX + baseDirY * baseDirY);
    if (dirLength === 0) {
      baseDirX = 1;
      baseDirY = 0;
    } else {
      baseDirX /= dirLength;
      baseDirY /= dirLength;
    }

    // Вычисляем базовый угол направления
    const baseAngle = Math.atan2(baseDirY, baseDirX);

    // Получаем параметры стрельбы
    const rayCount = muzzle.bulletCount || 1;
    const isSpread = muzzle.isSpread || false;
    const spreadAngle = (muzzle.spreadAngle || 45) * (Math.PI / 180);
    let maxRange = muzzle.bulletRange || 1000;
    const piercing = muzzle.bulletPiercing !== undefined ? muzzle.bulletPiercing : 1;
    
    // Разброс по дальности
    const rangeScatterChance = muzzle.rangeScatterChance ?? 0;
    const rangeSpreadPercent = muzzle.rangeSpreadPercent ?? 10;

    const createdRayIds = [];
    const allHits = [];

    // Создаём лучи
    for (let i = 0; i < rayCount; i++) {
      let dirX, dirY;
      
      // Вычисляем дальность с разбросом для этого луча
      let rayRange = maxRange;
      if (Math.random() < rangeScatterChance) {
        const minRange = maxRange * (1 - rangeSpreadPercent / 100);
        rayRange = minRange + Math.random() * (maxRange - minRange);
      }

      if (isSpread && rayCount > 1) {
        // Веерная стрельба - распределяем лучи по углу веера равномерно
        const startAngle = baseAngle - spreadAngle / 2;
        const angleStep = spreadAngle / (rayCount - 1);
        const rayAngle = startAngle + (i * angleStep);

        dirX = Math.cos(rayAngle);
        dirY = Math.sin(rayAngle);
      } else if (!isSpread) {
        // Случайный разброс
        const chance = muzzle.scatterChance ?? 1;
        const roll = Math.random();
        if (roll < chance) {
          const randomOffset = (Math.random() - 0.5) * spreadAngle;
          const rayAngle = baseAngle + randomOffset;

          dirX = Math.cos(rayAngle);
          dirY = Math.sin(rayAngle);
        } else {
          dirX = baseDirX;
          dirY = baseDirY;
        }
      } else {
        dirX = baseDirX;
        dirY = baseDirY;
      }

      // Выполняем raycast (уже обрезан на блокирующей цели благодаря collision matrix)
      const hits = this.world.collisionSystem.raycast(
        { x: position.x, y: position.y },
        { x: dirX, y: dirY },
        rayRange,
        {
          thickness: muzzle.rayCollisionThickness || 10,
          excludeEntityId: muzzleId,
          rootEntityId: muzzle._rootEntityId || null,
          sourceType: 'projectile' // Используем collision matrix для projectile
        }
      );

      // Проверяем есть ли блокирующее попадание
      const blockedHit = hits.find(h => h.blocked);
      
      // Ограничиваем количество попаданий по piercing (только для неблокирующих)
      // piercing = 0 означает бесконечное пробитие (но блокирующие всё равно останавливают)
      // piercing = 1 означает только первая цель
      // piercing = 2+ означает N целей
      let limitedHits;
      if (blockedHit) {
        // Есть блокирующее попадание - берём все до него включительно
        const blockedIndex = hits.indexOf(blockedHit);
        const nonBlockedBefore = hits.slice(0, blockedIndex);
        
        if (piercing === 0) {
          // Бесконечное пробитие - все неблокирующие + блокирующее
          limitedHits = hits.slice(0, blockedIndex + 1);
        } else {
          // Ограниченное пробитие
          const maxNonBlocked = piercing - 1; // -1 потому что блокирующее не считается в piercing
          const allowedNonBlocked = nonBlockedBefore.slice(0, maxNonBlocked);
          limitedHits = [...allowedNonBlocked, blockedHit];
        }
      } else {
        // Нет блокирующих попаданий - применяем piercing как обычно
        const maxHits = piercing === 0 ? hits.length : Math.min(piercing, hits.length);
        limitedHits = hits.slice(0, maxHits);
      }

      // Вычисляем конечную точку луча
      let endX, endY;
      const lastHit = limitedHits[limitedHits.length - 1];
      
      if (lastHit && (lastHit.blocked || (piercing > 0 && limitedHits.length >= piercing))) {
        // Луч остановился на цели (блокирующая или достигнут лимит piercing)
        endX = lastHit.point.x;
        endY = lastHit.point.y;
      } else {
        // Луч прошёл все цели - идёт до rayRange
        endX = position.x + dirX * rayRange;
        endY = position.y + dirY * rayRange;
      }

      // Добавляем активный луч для визуализации
      if (muzzle.showRay) {
        muzzle.addActiveRay({
          startX: position.x,
          startY: position.y,
          endX,
          endY
        });
      }

      // Обрабатываем попадания
      for (const hit of limitedHits) {
        const targetComponents = this.world.entities.get(hit.entityId);
        if (targetComponents) {
          // Вызываем обработку попадания
          this._handleRayHit(muzzle, hit, targetComponents);
        }
      }

      // Debug: логируем попадания луча
      if (limitedHits.length > 0) {
        const blockedInfo = limitedHits.find(h => h.blocked) ? ' [BLOCKED]' : '';
        console.log(`⚡ Ray: ${limitedHits.length} hits, piercing=${piercing}${blockedInfo}, end=(${endX.toFixed(0)}, ${endY.toFixed(0)})`);
      }

      // Сохраняем попадания
      allHits.push(...limitedHits);

      // Создаём ID луча для callback'ов
      const rayId = `ray_${this._projectileCounter++}`;
      createdRayIds.push(rayId);
    }

    // 📡 Вызываем onRayHit callback если есть попадания
    if (muzzle.onRayHit && allHits.length > 0) {
      muzzle.onRayHit(allHits);
    }

    return createdRayIds;
  }

  /**
   * ⚡ Обработать попадание луча
   * @private
   */
  _handleRayHit(muzzle, hit, targetComponents) {
    const targetEntity = targetComponents.get('_entityRef');
    
    // Вызываем onHit callback на цели если есть
    if (targetEntity?.onHit) {
      targetEntity.onHit(
        { type: 'ray', muzzle },
        hit.point,
        muzzle.id
      );
    }
  }

  /**
   * 🔫 Установить режим стрельбы для muzzle
   * @param {string} muzzleId - ID muzzle
   * @param {boolean} isFiring - true если кнопка зажата
   */
  setMuzzleFiring(muzzleId, isFiring) {
    const muzzle = this.muzzles.get(muzzleId);
    if (muzzle) {
      muzzle.setFiring(isFiring);
    }
  }

  /**
   * 🔄 Обновление системы (вызывается каждый кадр)
   * @param {number} dt - delta time в миллисекундах
   */
  update(dt) {
    // ⏱️ Получаем глобальный timeScale из TimeSystem
    let globalTimeScale = 1.0;
    let isPaused = false;
    try {
      globalTimeScale = window.timeSystem?.getTimeScale() || 1.0;
      isPaused = window.timeSystem?.isPaused() || false;
    } catch (e) {}

    // Если игра на паузе - пропускаем обновление пуль
    if (isPaused) {
      return;
    }

    // Применяем timeScale к dt
    const adjustedDt = dt * globalTimeScale;

    const currentTime = performance.now();

    // 1. Проверяем все muzzle и создаем пули если нужно
    for (const [muzzleId, muzzle] of this.muzzles) {
      if (muzzle.shouldFire(currentTime)) {
        const bulletIds = this.fireFromMuzzle(muzzleId);
        muzzle.fire(currentTime);
        
        // 📡 Вызываем onFire callback если есть
        if (muzzle.onFire && bulletIds.length > 0) {
          muzzle.onFire(bulletIds);
        }
      }
    }

    // 2. Обновляем все пули
    const bulletsToRemove = [];

    for (const [bulletId, projectileData] of this.projectiles) {
      const bullet = projectileData.bullet;

      // Обновляем позицию с учётом timeScale
      const alive = bullet.update(adjustedDt);

      // Синхронизируем с ECS
      const bulletComponents = this.world.entities.get(bulletId);
      if (bulletComponents) {
        const dir = bullet.getNormalizedDirection();
        bulletComponents.set('position', bullet.position);
        bulletComponents.set('velocity', { x: dir.x * bullet.speed, y: dir.y * bullet.speed });
      }

      // Проверяем жива ли пуля
      if (!alive) {
        bulletsToRemove.push(bulletId);
      }
    }

    // 3. Удаляем мертвые пули
    for (const bulletId of bulletsToRemove) {
      this.removeProjectile(bulletId);
    }
  }

  /**
   * 🗑️ Удалить пулю
   * @param {string} bulletId - ID пули
   */
  removeProjectile(bulletId) {
    const projectileData = this.projectiles.get(bulletId);
    if (projectileData) {
      this.world.entities.delete(bulletId);
      this.projectiles.delete(bulletId);
    }
  }

  /**
   * 🧹 Очистить все пули
   */
  clearAll() {
    for (const bulletId of this.projectiles.keys()) {
      this.world.entities.delete(bulletId);
    }
    this.projectiles.clear();
  }

  /**
   * 🧹 Очистить все muzzle
   */
  clearMuzzles() {
    this.muzzles.clear();
    console.log('🧹 Все muzzle удалены');
  }

  /**
   * 📊 Получить информацию о системе
   */
  getInfo() {
    return {
      projectileCount: this.projectiles.size,
      muzzleCount: this.muzzles.size,
      projectiles: Array.from(this.projectiles.values()).map(p => ({
        id: p.bullet.id,
        alive: p.bullet.isAlive(),
        traveled: p.bullet.getTraveledDistance().toFixed(1),
        remaining: p.bullet.getRemainingRange().toFixed(1)
      }))
    };
  }
}
