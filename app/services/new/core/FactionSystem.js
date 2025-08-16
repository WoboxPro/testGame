/**
 * 🏛️ FactionSystem - Система управления фракциями и их отношениями
 * 
 * Управляет фракциями, их отношениями и взаимодействиями
 */

export class FactionSystem {
  constructor(world) {
    this.world = world;
    this.factions = new Map();              // factionId -> CreateFaction
    this.entityFactions = new Map();        // entityId -> factionId
    
    // 📊 Типы отношений между фракциями (упрощенные)
    this.relationTypes = {
      WAR: 'war',           // Война (атакуют при встрече)
      NEUTRAL: 'neutral',   // Нейтральные (игнорируют)  
      PEACE: 'peace'        // Мир (помогают друг другу)
    };
    
    console.log('🏛️ FactionSystem создана');
  }
  
  /**
   * ➕ Добавить фракцию в систему
   */
  addFaction(faction) {
    if (!faction || !faction.id) {
      console.warn('🏛️ Некорректная фракция для добавления');
      return false;
    }
    
    this.factions.set(faction.id, faction);
    console.log(`🏛️ Фракция добавлена: ${faction.displayName} (${faction.id})`);
    return true;
  }
  
  /**
   * 🗑️ Удалить фракцию
   */
  removeFaction(factionId) {
    const faction = this.factions.get(factionId);
    if (faction) {
      // Удаляем все отношения с этой фракцией
      this._removeAllRelations(factionId);
      
      // Удаляем привязки сущностей к фракции
      for (const [entityId, entityFactionId] of this.entityFactions.entries()) {
        if (entityFactionId === factionId) {
          this.entityFactions.delete(entityId);
        }
      }
      
      this.factions.delete(factionId);
      console.log(`🗑️ Фракция удалена: ${faction.displayName}`);
      return true;
    }
    return false;
  }
  
  /**
   * 🔗 Установить отношение одной фракции к другой (АСИММЕТРИЧНОЕ)
   */
  setRelation(fromFactionId, toFactionId, relationType) {
    // Принимаем как ID так и объекты фракций
    const fromId = typeof fromFactionId === 'string' ? fromFactionId : fromFactionId.id;
    const toId = typeof toFactionId === 'string' ? toFactionId : toFactionId.id;
    
    const fromFaction = this.factions.get(fromId);
    const toFaction = this.factions.get(toId);
    
    if (!fromFaction || !toFaction) {
      console.warn(`🏛️ Неизвестные фракции для установки отношений: ${fromId}, ${toId}`);
      return false;
    }
    
    if (!Object.values(this.relationTypes).includes(relationType)) {
      console.warn(`🏛️ Неизвестный тип отношений: ${relationType}`);
      return false;
    }
    
    // Устанавливаем отношение ТОЛЬКО в одну сторону
    switch (relationType) {
      case 'war':
        fromFaction.addEnemy(toId);
        break;
      case 'peace':
        fromFaction.addPeace(toId);
        break;
      case 'neutral':
        fromFaction.makeNeutral(toId);
        break;
    }
    
    console.log(`🔗 ${fromFaction.displayName} устанавливает отношение к ${toFaction.displayName}: ${relationType}`);
    return true;
  }
  
  /**
   * 🔗 Установить взаимные отношения (для удобства)
   */
  setMutualRelation(factionId1, factionId2, relationType) {
    this.setRelation(factionId1, factionId2, relationType);
    this.setRelation(factionId2, factionId1, relationType);
    console.log(`🔗 Взаимные отношения: ${relationType}`);
  }
  
  /**
   * 🔍 Получить отношение одной фракции к другой (АСИММЕТРИЧНОЕ)
   */
  getRelation(fromFactionId, toFactionId) {
    const fromId = typeof fromFactionId === 'string' ? fromFactionId : fromFactionId.id;
    const toId = typeof toFactionId === 'string' ? toFactionId : toFactionId.id;
    
    const fromFaction = this.factions.get(fromId);
    if (!fromFaction) return 'neutral';
    
    return fromFaction.getRelationTo(toId);
  }
  
  /**
   * ⚔️ Проверить в состоянии ли войны первая фракция со второй
   */
  isWar(fromFactionId, toFactionId) {
    return this.getRelation(fromFactionId, toFactionId) === 'war';
  }
  
  /**
   * 🤝 Проверить в мире ли первая фракция со второй
   */
  isPeace(fromFactionId, toFactionId) {
    return this.getRelation(fromFactionId, toFactionId) === 'peace';
  }
  
  /**
   * 😐 Проверить нейтральна ли первая фракция ко второй
   */
  isNeutral(fromFactionId, toFactionId) {
    return this.getRelation(fromFactionId, toFactionId) === 'neutral';
  }
  
  /**
   * ⚔️ Проверить взаимную войну (обе стороны воюют)
   */
  areMutualWar(factionId1, factionId2) {
    return this.isWar(factionId1, factionId2) && this.isWar(factionId2, factionId1);
  }
  
  /**
   * 🤝 Проверить взаимный мир (обе стороны в мире)
   */
  areMutualPeace(factionId1, factionId2) {
    return this.isPeace(factionId1, factionId2) && this.isPeace(factionId2, factionId1);
  }
  
  /**
   * 🎯 Привязать сущность к фракции
   */
  assignEntityToFaction(entity, faction) {
    const factionId = typeof faction === 'string' ? faction : faction.id;
    
    if (!this.factions.has(factionId)) {
      console.warn(`🏛️ Неизвестная фракция: ${factionId}`);
      return false;
    }
    
    const factionObj = this.factions.get(factionId);
    
    // Сохраняем привязку
    this.entityFactions.set(entity.id, factionId);
    entity.faction = factionObj;
    entity.factionId = factionId;
    
    // Применяем стиль фракции
    factionObj.applyFactionStyle(entity);
    
    console.log(`🎯 Сущность ${entity.name} привязана к фракции ${factionObj.displayName}`);
    return true;
  }
  
  /**
   * 🔍 Получить фракцию сущности
   */
  getEntityFaction(entity) {
    const entityId = typeof entity === 'string' ? entity : entity.id;
    const factionId = this.entityFactions.get(entityId);
    return factionId ? this.factions.get(factionId) : null;
  }
  
  /**
   * ⚔️ Проверить может ли первая сущность атаковать вторую
   */
  canEntityAttack(attacker, target) {
    const attackerFaction = this.getEntityFaction(attacker);
    const targetFaction = this.getEntityFaction(target);
    
    // Если у одной из сущностей нет фракции - можем атаковать
    if (!attackerFaction || !targetFaction) return true;
    
    // Проверяем может ли атакующая фракция воевать
    if (!attackerFaction.canFight) return false;
    
    // Проверяем может ли цель быть атакована (пацифистов нельзя атаковать)
    if (!targetFaction.canFight) return false;
    
    // Проверяем отношение атакующей фракции к цели
    return this.isWar(attackerFaction.id, targetFaction.id);
  }
  
  /**
   * ⚔️ Проверить могут ли сущности атаковать друг друга (взаимно)
   */
  canEntitiesAttack(entity1, entity2) {
    return this.canEntityAttack(entity1, entity2) || this.canEntityAttack(entity2, entity1);
  }
  
  /**
   * 🤝 Проверить должна ли первая сущность помогать второй
   */
  shouldEntityHelp(helper, target) {
    const helperFaction = this.getEntityFaction(helper);
    const targetFaction = this.getEntityFaction(target);
    
    if (!helperFaction || !targetFaction) return false;
    
    return this.isPeace(helperFaction.id, targetFaction.id);
  }
  
  /**
   * 🤝 Проверить должны ли сущности помогать друг другу (взаимно)
   */
  shouldEntitiesHelp(entity1, entity2) {
    return this.shouldEntityHelp(entity1, entity2) && this.shouldEntityHelp(entity2, entity1);
  }
  
  /**
   * 📊 Получить все фракции определенного типа отношений к заданной
   */
  getFactionsWithRelation(targetFactionId, relationType) {
    const result = [];
    
    for (const [factionId, faction] of this.factions.entries()) {
      if (factionId !== targetFactionId) {
        const relation = this.getRelation(targetFactionId, factionId);
        if (relation === relationType) {
          result.push(faction);
        }
      }
    }
    
    return result;
  }
  
  /**
   * 👥 Получить все сущности фракции
   */
  getFactionEntities(factionId) {
    const entities = [];
    
    for (const [entityId, entityFactionId] of this.entityFactions.entries()) {
      if (entityFactionId === factionId) {
        const entity = this.world.getEntity(entityId);
        if (entity) {
          entities.push(entity);
        }
      }
    }
    
    return entities;
  }
  
  /**
   * 🗑️ Удалить все отношения фракции (очистить из других фракций)
   */
  _removeAllRelations(factionId) {
    // Удаляем упоминания этой фракции из всех других фракций
    for (const [id, faction] of this.factions.entries()) {
      if (id !== factionId) {
        faction.enemies.delete(factionId);
        faction.peace.delete(factionId);
      }
    }
  }
  
  /**
   * 📊 Получить статистику системы
   */
  getInfo() {
    // Подсчитываем общее количество отношений
    let totalRelations = 0;
    for (const faction of this.factions.values()) {
      totalRelations += faction.enemies.size + faction.peace.size;
    }
    
    return {
      factionCount: this.factions.size,
      relationCount: totalRelations,
      entitiesWithFactions: this.entityFactions.size,
      factions: Array.from(this.factions.values()).map(f => f.getInfo())
    };
  }
  
  /**
   * 🎨 Получить цветовую карту фракций (для отладки)
   */
  getFactionColors() {
    const colors = {};
    for (const [id, faction] of this.factions.entries()) {
      colors[id] = {
        name: faction.displayName,
        color: faction.getColorHex(),
        unitColor: `#${faction.unitColor.toString(16).padStart(6, '0')}`
      };
    }
    return colors;
  }
  
  /**
   * 🧹 Очистить систему
   */
  destroy() {
    this.factions.clear();
    this.entityFactions.clear();
    console.log('🧹 FactionSystem очищена');
  }
}
