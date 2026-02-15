/**
 * 📐 TileSystem - Система тайлов для мира
 *
 * Поддерживает:
 * - Бесконечную сетку (infinite)
 * - Фиксированный размер (fixed)
 * - Конвертацию координат world <-> tile
 * - Визуализацию сетки
 */

export class TileSystem {
  constructor(world, options = {}) {
    this.world = world;
    
    // Базовые настройки
    this.enabled = options.enabled !== false;
    
    // Режим: 'infinite' | 'fixed'
    this.mode = options.mode || 'infinite';
    
    // Размер тайла (клетки)
    this.tileSize = {
      width: Number(options.tileSize?.width) || 32,
      height: Number(options.tileSize?.height) || 32
    };
    
    // Точка привязки (левый верхний угол сетки)
    this.origin = {
      x: Number(options.origin?.x) || 0,
      y: Number(options.origin?.y) || 0
    };
    
    // Размер сетки (только для fixed режима)
    this.size = {
      cols: Number(options.size?.cols) || 100,
      rows: Number(options.size?.rows) || 100
    };
    
    // Визуализация
    this.showGrid = options.showGrid === true;
    this.gridColor = options.gridColor || '#444444';
    this.gridAlpha = Number(options.gridAlpha) || 0.3;
    this.gridLineWidth = Number(options.gridLineWidth) || 1;
    
    // Данные тайлов (опционально, для будущего расширения)
    this.tiles = new Map(); // key: "x:y" -> tileData
    
    console.log(`📐 TileSystem создана (${this.mode}, ${this.tileSize.width}x${this.tileSize.height}px, grid: ${this.showGrid})`);
  }
  
  /**
   * 📍 Конвертировать мировые координаты в tile координаты
   * @param {number} worldX - Мировая X координата
   * @param {number} worldY - Мировая Y координата
   * @returns {{x: number, y: number}} Tile координаты
   */
  worldToTile(worldX, worldY) {
    const relX = worldX - this.origin.x;
    const relY = worldY - this.origin.y;
    
    return {
      x: Math.floor(relX / this.tileSize.width),
      y: Math.floor(relY / this.tileSize.height)
    };
  }
  
  /**
   * 📍 Конвертировать tile координаты в мировые (центр тайла)
   * @param {number} tileX - Tile X координата
   * @param {number} tileY - Tile Y координата
   * @param {string} anchor - 'center' | 'topLeft' | 'bottomLeft'
   * @returns {{x: number, y: number}} Мировые координаты
   */
  tileToWorld(tileX, tileY, anchor = 'center') {
    const baseX = this.origin.x + tileX * this.tileSize.width;
    const baseY = this.origin.y + tileY * this.tileSize.height;
    
    if (anchor === 'topLeft') {
      return { x: baseX, y: baseY };
    } else if (anchor === 'bottomLeft') {
      return { x: baseX, y: baseY + this.tileSize.height };
    } else {
      // center (default)
      return {
        x: baseX + this.tileSize.width / 2,
        y: baseY + this.tileSize.height / 2
      };
    }
  }
  
  /**
   * 📍 Конвертировать tile координаты в мировые (левый верхний угол)
   * @param {number} tileX - Tile X координата
   * @param {number} tileY - Tile Y координата
   * @returns {{x: number, y: number}} Мировые координаты левого верхнего угла
   */
  tileToWorldTopLeft(tileX, tileY) {
    return {
      x: this.origin.x + tileX * this.tileSize.width,
      y: this.origin.y + tileY * this.tileSize.height
    };
  }
  
  /**
   * 🎯 Получить тайл по мировым координатам
   * @param {number} worldX - Мировая X координата
   * @param {number} worldY - Мировая Y координата
   * @returns {Object|null} Данные тайла или null
   */
  getTileAt(worldX, worldY) {
    const tile = this.worldToTile(worldX, worldY);
    const key = `${tile.x}:${tile.y}`;
    return this.tiles.get(key) || null;
  }
  
  /**
   * 🎯 Получить тайл по tile координатам
   * @param {number} tileX - Tile X координата
   * @param {number} tileY - Tile Y координата
   * @returns {Object|null} Данные тайла или null
   */
  getTile(tileX, tileY) {
    const key = `${tileX}:${tileY}`;
    return this.tiles.get(key) || null;
  }
  
  /**
   * ✏️ Установить данные тайла
   * @param {number} tileX - Tile X координата
   * @param {number} tileY - Tile Y координата
   * @param {Object} data - Данные тайла
   */
  setTile(tileX, tileY, data) {
    const key = `${tileX}:${tileY}`;
    this.tiles.set(key, {
      x: tileX,
      y: tileY,
      ...data
    });
  }
  
  /**
   * 🗑️ Удалить данные тайла
   * @param {number} tileX - Tile X координата
   * @param {number} tileY - Tile Y координата
   */
  removeTile(tileX, tileY) {
    const key = `${tileX}:${tileY}`;
    this.tiles.delete(key);
  }
  
  /**
   * 🔍 Проверить, находится ли тайл в пределах сетки (только для fixed режима)
   * @param {number} tileX - Tile X координата
   * @param {number} tileY - Tile Y координата
   * @returns {boolean}
   */
  isInBounds(tileX, tileY) {
    if (this.mode === 'infinite') return true;
    
    return tileX >= 0 && tileX < this.size.cols &&
           tileY >= 0 && tileY < this.size.rows;
  }
  
  /**
   * 📦 Получить все тайлы в прямоугольнике (мировые координаты)
   * @param {number} minX - Минимальная X
   * @param {number} minY - Минимальная Y
   * @param {number} maxX - Максимальная X
   * @param {number} maxY - Максимальная Y
   * @returns {Array} Массив тайлов
   */
  getTilesInRect(minX, minY, maxX, maxY) {
    const minTile = this.worldToTile(minX, minY);
    const maxTile = this.worldToTile(maxX, maxY);
    
    const tiles = [];
    
    for (let y = minTile.y; y <= maxTile.y; y++) {
      for (let x = minTile.x; x <= maxTile.x; x++) {
        if (this.isInBounds(x, y)) {
          const tile = this.getTile(x, y);
          if (tile) {
            tiles.push(tile);
          }
        }
      }
    }
    
    return tiles;
  }
  
  /**
   * 📏 Получить границы сетки (только для fixed режима)
   * @returns {{minX, minY, maxX, maxY}|null}
   */
  getBounds() {
    if (this.mode === 'infinite') return null;
    
    return {
      minX: this.origin.x,
      minY: this.origin.y,
      maxX: this.origin.x + this.size.cols * this.tileSize.width,
      maxY: this.origin.y + this.size.rows * this.tileSize.height
    };
  }
  
  /**
   * 🎨 Установить цвет сетки
   * @param {string} color - Hex цвет
   */
  setGridColor(color) {
    this.gridColor = color || '#444444';
  }
  
  /**
   * 👁️ Показать/скрыть сетку
   * @param {boolean} show
   */
  setShowGrid(show) {
    this.showGrid = show === true;
  }
  
  /**
   * 📊 Получить информацию о системе
   */
  getInfo() {
    return {
      enabled: this.enabled,
      mode: this.mode,
      tileSize: this.tileSize,
      origin: this.origin,
      size: this.mode === 'fixed' ? this.size : null,
      showGrid: this.showGrid,
      gridColor: this.gridColor,
      tilesCount: this.tiles.size
    };
  }
  
  /**
   * 🧹 Очистить все данные тайлов
   */
  clearTiles() {
    this.tiles.clear();
  }
}
