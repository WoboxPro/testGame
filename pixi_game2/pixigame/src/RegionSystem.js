/**
 * 🗺️ RegionSystem - Система управления регионами в мире
 *
 * Сетево-ориентированный подход - хранит только данные.
 * Отрисовка происходит в Canvas.js.
 */

export class RegionSystem {
  constructor(world) {
    this.world = world;
    this.regions = new Map(); // regionId -> { regionType, bounds, priority }
    this._regionCounter = 1;
  }

  /**
   * ➕ Добавить регион в мир
   * @param {Region} regionType - тип региона
   * @param {Object} bounds - границы региона
   * @returns {string} - ID экземпляра региона
   */
  addRegion(regionType, bounds = {}) {
    const regionId = `region_${this._regionCounter++}`;

    const regionInstance = {
      id: regionId,
      regionType: regionType,
      bounds: {
        x: Number(bounds.x) || 0,
        y: Number(bounds.y) || 0,
        width: Number(bounds.width) || 500,
        height: Number(bounds.height) || 500,
        priority: Number(bounds.priority) || 1
      }
    };

    this.regions.set(regionId, regionInstance);

    console.log(`🗺️ Регион добавлен: ${regionType.displayName} в (${regionInstance.bounds.x}, ${regionInstance.bounds.y})`);

    return regionId;
  }

  /**
   * 🗑️ Удалить регион по ID
   */
  removeRegion(regionId) {
    return this.regions.delete(regionId);
  }

  /**
   * 🔍 Получить регион по ID
   */
  getRegion(regionId) {
    return this.regions.get(regionId);
  }

  /**
   * 📍 Получить все регионы в точке (опционально, для будущего)
   */
  getRegionsAt(x, y) {
    const result = [];
    for (const region of this.regions.values()) {
      const b = region.bounds;
      if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) {
        result.push(region);
      }
    }
    // Сортируем по приоритету (выше приоритет = выше в списке)
    return result.sort((a, b) => b.bounds.priority - a.bounds.priority);
  }

  /**
   * 📊 Получить все регионы
   */
  getAllRegions() {
    return Array.from(this.regions.values()).map(r => ({
      id: r.id,
      displayName: r.regionType.displayName,
      bounds: { ...r.bounds },
      hasTexture: !!r.regionType.groundTexture.textureUrl,
      bordersEnabled: r.regionType.borders.enabled
    }));
  }

  /**
   * 📊 Получить информацию о системе
   */
  getInfo() {
    return {
      regionCount: this.regions.size,
      regions: this.getAllRegions()
    };
  }

  /**
   * 🧹 Очистить все регионы
   */
  clear() {
    this.regions.clear();
    this._regionCounter = 1;
  }
}
