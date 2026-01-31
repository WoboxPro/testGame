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
   * 🔫 Создать пулю из muzzle
   * @param {string} muzzleId - ID muzzle
   * @returns {string|null} - ID созданной пули или null
   */
  fireFromMuzzle(muzzleId) {
    const muzzle = this.muzzles.get(muzzleId);
    if (!muzzle) {
      console.warn(`ProjectileSystem.fireFromMuzzle(): muzzle not found: ${muzzleId}`);
      return null;
    }

    // Получаем позицию muzzle из world
    const muzzleComponents = this.world.entities.get(muzzleId);
    if (!muzzleComponents) {
      console.warn(`ProjectileSystem.fireFromMuzzle(): muzzle not in world: ${muzzleId}`);
      return null;
    }

    const position = muzzleComponents.get('position');
    if (!position) {
      console.warn(`ProjectileSystem.fireFromMuzzle(): muzzle has no position: ${muzzleId}`);
      return null;
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
    let dirX = muzzle.direction.x;
    let dirY = muzzle.direction.y;

    // Применяем rotation к direction ТОЛЬКО для relative режима
    if (directionMode === 'relative') {
      const rotatedDirX = dirX * Math.cos(rotation) - dirY * Math.sin(rotation);
      const rotatedDirY = dirX * Math.sin(rotation) + dirY * Math.cos(rotation);
      dirX = rotatedDirX * mirrorDirection.x;
      dirY = rotatedDirY * mirrorDirection.y;
    }
    // Для static режима rotation НЕ применяется

    // Нормализуем направление
    const dirLength = Math.sqrt(dirX * dirX + dirY * dirY);
    if (dirLength > 0) {
      dirX /= dirLength;
      dirY /= dirLength;
    }

    // Создаем пулю
    const bulletId = `bullet_${this._projectileCounter++}`;
    const bullet = new BulletEntity({
      id: bulletId,
      position: { x: position.x, y: position.y },
      direction: { x: dirX, y: dirY },
      speed: muzzle.bulletSpeed,
      range: muzzle.bulletRange,
      color: '#FFFFFF',
      size: 8
    });

    // Добавляем пулю в мир как ECS компоненты
    const bulletComponents = new Map();
    bulletComponents.set('_entityRef', bullet);
    bulletComponents.set('position', bullet.position);
    bulletComponents.set('velocity', { x: dirX * bullet.speed, y: dirY * bullet.speed });
    bulletComponents.set('appearance', bullet.appearance);
    bulletComponents.set('subtype', bullet.subtype);

    this.world.entities.set(bulletId, bulletComponents);

    // Регистрируем в системе
    this.projectiles.set(bulletId, {
      bullet,
      worldId: this.world.id,
      spawnTime: Date.now(),
      muzzleId
    });

    console.log(`🔫 Пуля создана: ${bulletId} from muzzle ${muzzleId}, dir=(${dirX.toFixed(2)}, ${dirY.toFixed(2)})`);
    return bulletId;
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
        this.fireFromMuzzle(muzzleId);
        muzzle.fire(currentTime);
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
      // Удаляем из мира
      this.world.entities.delete(bulletId);
      // Удаляем из системы
      this.projectiles.delete(bulletId);
      console.log(`🗑️ Пуля удалена: ${bulletId}`);
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
    console.log('🧹 Все пули удалены');
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
