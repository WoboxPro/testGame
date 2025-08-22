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

      // Ищем хоть одну видимую вражескую цель
      let target = this._findVisibleTarget(entity, entity.vision.range);
      if (!target && ai.alwaysMove) {
        // Если всегда движемся — ищем ближайшего врага без ограничения по радиусу
        target = this._findNearestHostile(entity);
      }
      if (!target && !ai.alwaysMove) continue; // никого не видим — стоим (если не включен alwaysMove)

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
    const range2 = range * range;
    for (const other of enemies) {
      if (!this._isValidTarget(entity, other)) continue;
      const dx = other.x - entity.x;
      const dy = other.y - entity.y;
      if (dx * dx + dy * dy <= range2) {
        found = other;
        break;
      }
    }
    return found;
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
}


