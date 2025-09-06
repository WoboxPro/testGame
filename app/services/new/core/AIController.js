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
      const visibleTarget = this._findVisibleTarget(entity, entity.vision.range);
      // Поворачиваемся ТОЛЬКО если цель видна в текущем FOV
      const rotateTarget = visibleTarget;
      // Обновляем флаги видимости для внешней логики/UI
      if (!entity.vision) entity.vision = {};
      entity.vision.seesTarget = !!visibleTarget;
      entity.vision.visibleTargetId = visibleTarget?.id || null;

      // Память последнего видения
      const aiState = entity.ai || {};
      if (visibleTarget) {
        aiState._lastSeen = {
          x: visibleTarget.x,
          y: visibleTarget.y,
          time: (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()
        };
      }
      entity.ai = aiState;

      // Поворачиваемся к цели (видимой или ближайшей в радиусе)
      if (rotateTarget && ai?.faceTarget !== false) {
        this._rotateTowardsTarget(entity, rotateTarget, dtMs);
      }
      // Выбираем цель для движения
      let moveTarget = null;
      if (visibleTarget) moveTarget = visibleTarget; // живая цель
      else if (ai.pursueLastSeen && aiState._lastSeen) moveTarget = aiState._lastSeen; // последняя точка
      else if (ai.alwaysMove) moveTarget = this._findNearestHostile(entity) || null; // фоновое движение

      if (!moveTarget) {
        // В спокойном состоянии — медленно оглядываться, если включено
        if (ai.idleScan) {
          this._idleScan(entity, dtMs);
        }
        continue; // не двигаемся
      }

      if (ai.type === 'seek' && moveTarget) {
        if (moveTarget.id) {
          this._moveTowards(entity, moveTarget, dtMs);
        } else {
          this._moveTowardsPosition(entity, moveTarget.x, moveTarget.y, dtMs);
          // Если дошли до последней точки — очищаем память
          const dx = moveTarget.x - entity.x;
          const dy = moveTarget.y - entity.y;
          if ((dx * dx + dy * dy) <= 4) {
            aiState._lastSeen = null;
          }
        }
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

    const withinFov = Math.abs(diff) <= halfFovRad;
    if (!withinFov) return false;

    // Опциональная окклюзия: здания/структуры закрывают линию видимости
    if (vision.occlusion && vision.occlusion.enabled) {
      if (this._isOccluded(entity, other, vision.occlusion)) return false;
    }

    return true;
  }

  _isOccluded(observer, target, occlusion) {
    const blockedBy = new Set(occlusion.blockedBy && Array.isArray(occlusion.blockedBy)
      ? occlusion.blockedBy
      : ['building', 'structure']);
    const entities = this.world.getAllEntities();

    const ax = observer.x, ay = observer.y;
    const bx = target.x, by = target.y;
    const distAT = Math.hypot(bx - ax, by - ay);
    if (distAT <= 0) return false;

    for (const e of entities) {
      if (!e || e.id === observer.id || e.id === target.id) continue;
      // Фильтр типов блокеров: по collision.name или по типу сущности
      const collName = e.collision?.name;
      const isBlockedType = (collName && blockedBy.has(collName)) || (e.type && blockedBy.has(e.type));
      if (!isBlockedType) continue;

      // Грубая аппроксимация препятствия окружностью радиуса по наибольшей полуоси
      const dims = this._getEntityHalfExtents(e);
      const radius = Math.max(dims.halfWidth, dims.halfHeight);
      if (radius <= 0) continue;

      // Быстрая проверка: центр препятствия должен быть ближе к наблюдателю, чем цель
      const cx = e.x, cy = e.y;
      const distAC = Math.hypot(cx - ax, cy - ay);
      if (distAC >= distAT + radius) continue;

      // Точная проверка: пересечение отрезка AB с кругом (C, r)
      if (this._segmentIntersectsCircle(ax, ay, bx, by, cx, cy, radius)) {
        return true;
      }
    }
    return false;
  }

  _getEntityHalfExtents(entity) {
    // Пытаемся взять реальные размеры, иначе оцениваем по visual.size
    let halfWidth = 0, halfHeight = 0;
    if (entity.width && entity.height) {
      halfWidth = Math.abs(entity.width) / 2;
      halfHeight = Math.abs(entity.height) / 2;
    } else if (entity.collision?.form === 'rect' && entity.collision.width && entity.collision.height) {
      halfWidth = Math.abs(entity.collision.width) / 2;
      halfHeight = Math.abs(entity.collision.height) / 2;
    } else {
      const s = (entity.visual?.size != null) ? entity.visual.size : (entity.size || 0);
      halfWidth = s;
      halfHeight = s;
    }
    return { halfWidth, halfHeight };
  }

  _segmentIntersectsCircle(ax, ay, bx, by, cx, cy, r) {
    // Находим ближайшую точку от C на сегменте AB и проверяем расстояние до неё
    const abx = bx - ax, aby = by - ay;
    const acx = cx - ax, acy = cy - ay;
    const abLen2 = abx * abx + aby * aby;
    if (abLen2 === 0) return false;
    let t = (acx * abx + acy * aby) / abLen2;
    if (t < 0) t = 0; else if (t > 1) t = 1;
    const px = ax + abx * t;
    const py = ay + aby * t;
    const dist = Math.hypot(px - cx, py - cy);
    return dist <= r;
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

    // Зеркало/поворот по движению (для сущностей с rotationBehavior='movement')
    if (typeof entity.updateRotationFromMovement === 'function') {
      entity.updateRotationFromMovement(deltaX, deltaY);
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
    this._moveWithAvoidance(entity, deltaX, deltaY, step);
  }

  _moveTowardsPosition(entity, x, y, dtMs) {
    const baseSpeed = entity.stats?.getSpeed ? entity.stats.getSpeed() : 1;
    const step = baseSpeed * (Math.max(0, dtMs) / 16.67);
    const dx = x - entity.x;
    const dy = y - entity.y;
    const len = Math.hypot(dx, dy) || 1;
    const deltaX = (dx / len) * step;
    const deltaY = (dy / len) * step;
    this._moveWithAvoidance(entity, deltaX, deltaY, step);
  }

  _moveWithAvoidance(entity, deltaX, deltaY, step) {
    // Прямо вперёд
    if (this._attemptMove(entity, deltaX, deltaY)) return true;
    const ai = entity.ai || {};
    if (!ai.avoidObstacles) return false;
    // Пробуем обойти: набор углов отклонения
    const offsetsDeg = [15, -15, 30, -30, 45, -45, 60, -60, 90, -90, 120, -120, 150, -150, 180];
    const baseAngle = Math.atan2(deltaY, deltaX);
    for (const deg of offsetsDeg) {
      const rad = deg * Math.PI / 180;
      const nx = Math.cos(baseAngle + rad) * step;
      const ny = Math.sin(baseAngle + rad) * step;
      if (this._attemptMove(entity, nx, ny)) return true;
    }
    return false;
  }

  _idleScan(entity, dtMs) {
    const ai = entity.ai || {};
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const interval = typeof ai.idleScanIntervalMs === 'number' ? ai.idleScanIntervalMs : 1500;
    const jitter = typeof ai.idleScanJitterMs === 'number' ? ai.idleScanJitterMs : 1000;
    if (!ai._idleScanFacing || !ai._idleScanNext || now >= ai._idleScanNext) {
      // Выбираем новую случайную цель направления (мировой угол взгляда)
      const randAngle = -Math.PI + Math.random() * (2 * Math.PI);
      ai._idleScanFacing = randAngle;
      ai._idleScanNext = now + interval + Math.random() * jitter;
      entity.ai = ai;
    }
    // Поворачиваемся к выбранному направлению
    const distance = 100; // синтетическая дальняя цель для вычисления угла
    const tx = entity.x + Math.cos(ai._idleScanFacing) * distance;
    const ty = entity.y + Math.sin(ai._idleScanFacing) * distance;
    this._rotateTowardsTarget(entity, { x: tx, y: ty }, dtMs);
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
      if (blocked) return false;
    }
    if (this.world?.bounds) {
      newX = Math.max(this.world.bounds.left, Math.min(this.world.bounds.right, newX));
      newY = Math.max(this.world.bounds.top, Math.min(this.world.bounds.bottom, newY));
    }
    // Зеркало/поворот по движению
    if (typeof entity.updateRotationFromMovement === 'function') {
      entity.updateRotationFromMovement(deltaX, deltaY);
    }
    entity.setPosition(newX, newY);
    if (this.world?.biomeSystem) this.world.updateEntityPosition(entity, newX, newY);
    return true;
  }

  _rotateTowardsTarget(entity, target, dtMs) {
    // Целевой угол/направление в мировых координатах
    const dx = target.x - entity.x;
    const dy = target.y - entity.y;
    const targetAngleWorld = Math.atan2(dy, dx);

    // 🔁 Режим зеркала: не вращаем, только флип по оси
    if (entity.typeRotate === 'mirror') {
      const dead = Math.max(0, entity.mirrorMouseDeadzone || 0);
      let shouldMirror = entity.isMirrored;
      if (entity.mirrorAxis === 'y') {
        if (Math.abs(dx) > dead) shouldMirror = dx < 0;
      } else { // 'x'
        if (Math.abs(dy) > dead) shouldMirror = dy > 0;
      }
      if (shouldMirror !== entity.isMirrored) {
        const old = entity.isMirrored;
        entity.isMirrored = shouldMirror;
        if (entity.rotateChildren && old !== shouldMirror) {
          entity.rotateChildrenBy(0, true);
          entity.updateChildrenPositions();
        }
      }
      return; // не меняем rotation для зеркала
    }

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


