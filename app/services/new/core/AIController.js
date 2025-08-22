/**
 * 🤖 AIController — простой ИИ для юнитов
 * Поведение: идти по прямой, пока видит вражескую цель в радиусе vision.range
 */

export class AIController {
  constructor(world) {
    this.world = world;
  }

  update(dtMs = 16.67) {
    if (!this.world) return;
    const entities = this.world.getAllEntities();

    for (const entity of entities) {
      const ai = entity.ai;
      if (!ai?.action || entity.isDead) continue;
      if (!entity.vision || !entity.vision.range) continue;

      // Ищем хоть одну видимую вражескую цель (с учетом типа зрения)
      let target = this._findVisibleTarget(entity, entity.vision.range);
      if (!target && ai.alwaysMove) {
        // Если всегда движемся — ищем ближайшего врага без ограничения по радиусу
        target = this._findNearestHostile(entity);
      }
      // Поворачиваемся ТОЛЬКО если цель видна в текущем FOV
      const rotateTarget = target;
      // Обновляем флаги видимости для внешней логики/UI
      if (!entity.vision) entity.vision = {};
      entity.vision.seesTarget = !!target;
      entity.vision.visibleTargetId = target?.id || null;

      // Поворачиваемся к цели (видимой или ближайшей в радиусе)
      if (rotateTarget && ai?.faceTarget !== false) {
        this._rotateTowardsTarget(entity, rotateTarget, dtMs);
      }

      if (!target && !ai.alwaysMove) continue; // никого не видим — стоим (если не включен alwaysMove)

      // Поворачиваемся к цели, чтобы удерживать её в центре конуса зрения
      if (target && ai?.faceTarget !== false) {
        this._rotateTowardsTarget(entity, target, dtMs);
      }

      if (ai.type === 'seek' && target) {
        this._moveTowards(entity, target, dtMs);
      } else {
        // Идем по прямой в направлении взгляда
        this._moveStraight(entity, dtMs);
      }
    }
  }

  _findVisibleTarget(entity, range) {
    const enemies = this.world.getAllEntities();
    let found = null;
    for (const other of enemies) {
      if (!this._isValidTarget(entity, other)) continue;
      if (this._isTargetVisible(entity, other, range)) { found = other; break; }
    }
    return found;
  }

  _isTargetVisible(entity, other, range) {
    // Проверка дистанции
    const dx = other.x - entity.x;
    const dy = other.y - entity.y;
    if (dx * dx + dy * dy > (range * range)) return false;

    // Тип видимости: circle | cone (по умолчанию circle)
    const vision = entity.vision || {};
    const type = vision.type || 'circle';
    if (type === 'circle') return true;

    // Для конуса проверяем угол относительно направления движения
    const fovDeg = (vision.angle !== undefined ? vision.angle : (vision.fov !== undefined ? vision.fov : 60));
    const halfFovRad = (fovDeg * Math.PI) / 360;

    // Направление взгляда: rotation - rotationOffset + optional directionOffset
    const baseFacing = (entity.rotation || 0) - (entity.rotationOffset || 0);
    const directionOffset = (vision.directionOffsetRad !== undefined)
      ? vision.directionOffsetRad
      : ((vision.directionOffsetDeg || 0) * Math.PI / 180);
    const facing = baseFacing + directionOffset;

    const angToTarget = Math.atan2(dy, dx);
    let diff = angToTarget - facing;
    // Нормализация угла к диапазону [-PI, PI]
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;

    return Math.abs(diff) <= halfFovRad;
  }

  _findNearestHostile(entity) {
    const entities = this.world.getAllEntities();
    let nearest = null;
    let bestD2 = Infinity;
    for (const other of entities) {
      if (!this._isValidTarget(entity, other)) continue;
      const dx = other.x - entity.x;
      const dy = other.y - entity.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) { bestD2 = d2; nearest = other; }
    }
    return nearest;
  }

  _findNearestHostileWithin(entity, range) {
    const entities = this.world.getAllEntities();
    let nearest = null;
    let bestD2 = range * range;
    for (const other of entities) {
      if (!this._isValidTarget(entity, other)) continue;
      const dx = other.x - entity.x;
      const dy = other.y - entity.y;
      const d2 = dx * dx + dy * dy;
      if (d2 <= bestD2 && (nearest === null || d2 < bestD2)) {
        bestD2 = d2;
        nearest = other;
      }
    }
    return nearest;
  }

  _isValidTarget(self, other) {
    if (!other || other.id === self.id || other.isDead) return false;
    // Разрешаем атаковать только боевые юниты
    if (other.type !== 'unit') return false;
    // Должны иметь характеристики (получать урон)
    if (!other.stats || (other.stats.getHealth && other.stats.getHealth() === 0)) return false;
    // Фракционная проверка: только если self может атаковать other
    const fs = this.world?.factionSystem;
    if (!fs) return true; // если нет системы фракций — считаем валидной целью
    const attackerFaction = fs.getEntityFaction(self);
    const targetFaction = fs.getEntityFaction(other);
    // Не атакуем цели без фракции, если не разрешено явно
    if (!targetFaction) {
      const ai = self.ai || {};
      if (!ai.attackNeutral) return false;
    }
    return !!fs.canEntityAttack(self, other);
  }

  _moveStraight(entity, dtMs) {
    // Скорость с учетом dt
    const baseSpeed = entity.stats?.getSpeed ? entity.stats.getSpeed() : 1;
    const step = baseSpeed * (Math.max(0, dtMs) / 16.67);

    // Вектор взгляда: rotation - rotationOffset
    const facingAngle = (entity.rotation || 0) - (entity.rotationOffset || 0);
    const deltaX = Math.cos(facingAngle) * step;
    const deltaY = Math.sin(facingAngle) * step;

    // Предиктивная проверка коллизий как в EntityController
    let newX = entity.x + deltaX;
    let newY = entity.y + deltaY;

    if (entity.collision?.enabled && this.world?.collisionSystem) {
      const collisionSystem = this.world.collisionSystem;
      const entities = this.world.getAllEntities();
      const others = entities.filter(e => e.collision?.enabled && e.id !== entity.id);

      // временно применяем позицию
      const oldX = entity.x; const oldY = entity.y;
      entity.x = newX; entity.y = newY;
      let blocked = false;

      for (const other of others) {
        const ruleKey = collisionSystem._getRuleKey(entity.collision.name, other.collision.name);
        if (!collisionSystem.collisionRules.has(ruleKey)) continue;
        const res = collisionSystem._detectCollision(entity, other);
        if (res.colliding) {
          // блокируем только block↔block
          const aType = entity.collision.collisionType || 'block';
          const bType = other.collision.collisionType || 'block';
          if (aType === 'block' && bType === 'block') { blocked = true; break; }
        }
      }

      // откатываем позицию
      entity.x = oldX; entity.y = oldY;
      if (blocked) return; // не двигаемся
    }

    // Учитываем границы мира
    if (this.world?.bounds) {
      newX = Math.max(this.world.bounds.left, Math.min(this.world.bounds.right, newX));
      newY = Math.max(this.world.bounds.top, Math.min(this.world.bounds.bottom, newY));
    }

    entity.setPosition(newX, newY);
    if (this.world?.biomeSystem) this.world.updateEntityPosition(entity, newX, newY);
  }

  _moveTowards(entity, target, dtMs) {
    const baseSpeed = entity.stats?.getSpeed ? entity.stats.getSpeed() : 1;
    const step = baseSpeed * (Math.max(0, dtMs) / 16.67);
    const dx = target.x - entity.x;
    const dy = target.y - entity.y;
    const len = Math.hypot(dx, dy) || 1;
    const deltaX = (dx / len) * step;
    const deltaY = (dy / len) * step;
    this._attemptMove(entity, deltaX, deltaY);
  }

  _attemptMove(entity, deltaX, deltaY) {
    let newX = entity.x + deltaX;
    let newY = entity.y + deltaY;
    if (entity.collision?.enabled && this.world?.collisionSystem) {
      const collisionSystem = this.world.collisionSystem;
      const entities = this.world.getAllEntities();
      const others = entities.filter(e => e.collision?.enabled && e.id !== entity.id);
      const oldX = entity.x; const oldY = entity.y;
      entity.x = newX; entity.y = newY;
      let blocked = false;
      for (const other of others) {
        const ruleKey = collisionSystem._getRuleKey(entity.collision.name, other.collision.name);
        if (!collisionSystem.collisionRules.has(ruleKey)) continue;
        const res = collisionSystem._detectCollision(entity, other);
        if (res.colliding) {
          const aType = entity.collision.collisionType || 'block';
          const bType = other.collision.collisionType || 'block';
          if (aType === 'block' && bType === 'block') { blocked = true; break; }
        }
      }
      entity.x = oldX; entity.y = oldY;
      if (blocked) return;
    }
    if (this.world?.bounds) {
      newX = Math.max(this.world.bounds.left, Math.min(this.world.bounds.right, newX));
      newY = Math.max(this.world.bounds.top, Math.min(this.world.bounds.bottom, newY));
    }
    entity.setPosition(newX, newY);
    if (this.world?.biomeSystem) this.world.updateEntityPosition(entity, newX, newY);
  }

  _rotateTowardsTarget(entity, target, dtMs) {
    // Целевой угол в мировых координатах
    const dx = target.x - entity.x;
    const dy = target.y - entity.y;
    const targetAngleWorld = Math.atan2(dy, dx);

    // Угол, который должен иметь entity.rotation, чтобы направление взгляда совпадало с targetAngleWorld
    // facing = (rotation - rotationOffset) + directionOffset
    const rotationOffset = entity.rotationOffset || 0;
    const vision = entity.vision || {};
    const directionOffset = (vision.directionOffsetRad !== undefined)
      ? vision.directionOffsetRad
      : ((vision.directionOffsetDeg || 0) * Math.PI / 180);
    const desiredRotation = targetAngleWorld + rotationOffset - directionOffset;

    // Плавный поворот к целевому углу
    const before = entity.rotation || 0;
    let delta = desiredRotation - before;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;

    // Приоритет: stats.rotationSpeed, иначе entity.rotationSpeed, иначе 0.2
    const statsRot = entity.stats?.getRotationSpeed ? entity.stats.getRotationSpeed() : null;
    const speed = (statsRot != null) ? statsRot : (entity.rotationSpeed || 0.2);
    const timeFactor = Math.max(0, dtMs) / 16.67;
    const maxStep = Math.max(0, speed * timeFactor);
    const step = Math.sign(delta) * Math.min(Math.abs(delta), maxStep);
    entity.rotation = before + step;
    const appliedDelta = step;

    // Нормализация
    while (entity.rotation > Math.PI) entity.rotation -= 2 * Math.PI;
    while (entity.rotation < -Math.PI) entity.rotation += 2 * Math.PI;

    // Поворачиваем дочерние сущности, чтобы визуальные элементы (например, конус) следовали повороту
    if (entity.rotateChildren && appliedDelta !== 0) {
      entity.rotateChildrenBy(appliedDelta);
      entity.updateChildrenPositions();
    }

    // Дополнительно: принудительно синхронизируем поворот дочерних vision-элементов с родителем
    if (entity.world && entity.children && entity.children.size > 0) {
      for (const childId of entity.children) {
        const child = entity.world.getEntity(childId);
        if (child && child.type === 'vision') {
          child.rotation = entity.rotation;
        }
      }
    }
  }
}


