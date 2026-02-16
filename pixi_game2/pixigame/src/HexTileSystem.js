/**
 * ⬡ HexTileSystem - Система гексагональных тайлов
 *
 * Особенности:
 * - Только бесконечная сетка (infinite)
 * - Axial координаты (q, r)
 * - Два вида ориентации: 'pointy-top' (угол вверх) и 'flat-top' (плоскость сверху)
 * - Конвертация world <-> hex
 * - Соседние гексы (6 направлений)
 * - Визуализация сетки
 */

export class HexTileSystem {
  constructor(world, options = {}) {
    this.world = world;

    this.enabled = options.enabled !== false;

    // Ориентация: 'pointy-top' (угол вверх) | 'flat-top' (плоскость сверху)
    this.orientation = options.orientation || 'pointy-top';

    // Размер гекса (расстояние от центра до вершины)
    this.hexSize = Number(options.hexSize) || 32;

    // Точка привязки (центр гекса 0,0)
    this.origin = {
      x: Number(options.origin?.x) || 0,
      y: Number(options.origin?.y) || 0
    };

    // Визуализация
    this.showGrid = options.showGrid === true;
    this.gridColor = options.gridColor || '#444444';
    this.gridAlpha = Number(options.gridAlpha) || 0.3;
    this.gridLineWidth = Number(options.gridLineWidth) || 1;

    // Данные тайлов
    this.tiles = new Map(); // key: "q:r" -> tileData

    // Направления соседей в axial координатах
    this._neighborDirections = [
      { q: 1, r: 0 },   // восток
      { q: 1, r: -1 },  // северо-восток
      { q: 0, r: -1 },  // северо-запад
      { q: -1, r: 0 },  // запад
      { q: -1, r: 1 },  // юго-запад
      { q: 0, r: 1 }    // юго-восток
    ];

    // Предварительно вычисляем константы для геометрии
    this._updateGeometryConstants();

    console.log(`⬡ HexTileSystem создана (${this.orientation}, size=${this.hexSize}px, grid: ${this.showGrid})`);
  }

  /**
   * Обновить геометрические константы при изменении размера или ориентации
   */
  _updateGeometryConstants() {
    const size = this.hexSize;

    if (this.orientation === 'pointy-top') {
      // Угол вверх: ширина = size * √3, высота = size * 2
      this._hexWidth = size * Math.sqrt(3);
      this._hexHeight = size * 2;
      this._horizontalSpacing = this._hexWidth;
      this._verticalSpacing = size * 1.5;
    } else {
      // Плоскость сверху: ширина = size * 2, высота = size * √3
      this._hexWidth = size * 2;
      this._hexHeight = size * Math.sqrt(3);
      this._horizontalSpacing = size * 1.5;
      this._verticalSpacing = this._hexHeight;
    }
  }

  /**
   * 📍 Конвертировать мировые координаты в hex координаты (axial)
   * @param {number} worldX - Мировая X координата
   * @param {number} worldY - Мировая Y координата
   * @returns {{q: number, r: number}} Axial координаты
   */
  worldToHex(worldX, worldY) {
    // Относительно origin
    const relX = worldX - this.origin.x;
    const relY = worldY - this.origin.y;

    if (this.orientation === 'pointy-top') {
      return this._worldToHexPointy(relX, relY);
    } else {
      return this._worldToHexFlat(relX, relY);
    }
  }

  /**
   * Конвертация для pointy-top ориентации
   */
  _worldToHexPointy(x, y) {
    const size = this.hexSize;
    const sqrt3 = Math.sqrt(3);

    const q = (sqrt3 / 3 * x - 1 / 3 * y) / size;
    const r = (2 / 3 * y) / size;

    return this._roundAxial(q, r);
  }

  /**
   * Конвертация для flat-top ориентации
   */
  _worldToHexFlat(x, y) {
    const size = this.hexSize;
    const sqrt3 = Math.sqrt(3);

    const q = (2 / 3 * x) / size;
    const r = (-1 / 3 * x + sqrt3 / 3 * y) / size;

    return this._roundAxial(q, r);
  }

  /**
   * Округление fractional axial координат до целых
   */
  _roundAxial(q, r) {
    const s = -q - r;

    let rq = Math.round(q);
    let rr = Math.round(r);
    let rs = Math.round(s);

    const qDiff = Math.abs(rq - q);
    const rDiff = Math.abs(rr - r);
    const sDiff = Math.abs(rs - s);

    if (qDiff > rDiff && qDiff > sDiff) {
      rq = -rr - rs;
    } else if (rDiff > sDiff) {
      rr = -rq - rs;
    }

    return { q: rq, r: rr };
  }

  /**
   * 📍 Конвертировать hex координаты в мировые (центр гекса)
   * @param {number} q - Axial Q координата
   * @param {number} r - Axial R координата
   * @param {string} anchor - 'center' | 'topLeft' (topLeft = верхняя вершина для pointy, левая для flat)
   * @returns {{x: number, y: number}} Мировые координаты
   */
  hexToWorld(q, r, anchor = 'center') {
    let x, y;

    if (this.orientation === 'pointy-top') {
      const result = this._hexToWorldPointy(q, r);
      x = result.x;
      y = result.y;
    } else {
      const result = this._hexToWorldFlat(q, r);
      x = result.x;
      y = result.y;
    }

    // Применяем origin
    x += this.origin.x;
    y += this.origin.y;

    if (anchor === 'center') {
      return { x, y };
    } else if (anchor === 'topLeft') {
      // topLeft = верхняя вершина для pointy-top, левая вершина для flat-top
      if (this.orientation === 'pointy-top') {
        return { x, y: y - this.hexSize };
      } else {
        return { x: x - this.hexSize, y };
      }
    }

    return { x, y };
  }

  /**
   * Конвертация для pointy-top ориентации
   */
  _hexToWorldPointy(q, r) {
    const size = this.hexSize;
    const sqrt3 = Math.sqrt(3);

    const x = size * (sqrt3 * q + sqrt3 / 2 * r);
    const y = size * (3 / 2 * r);

    return { x, y };
  }

  /**
   * Конвертация для flat-top ориентации
   */
  _hexToWorldFlat(q, r) {
    const size = this.hexSize;
    const sqrt3 = Math.sqrt(3);

    const x = size * (3 / 2 * q);
    const y = size * (sqrt3 / 2 * q + sqrt3 * r);

    return { x, y };
  }

  /**
   * 🎯 Получить гекс по мировым координатам
   * @param {number} worldX - Мировая X координата
   * @param {number} worldY - Мировая Y координата
   * @returns {Object|null} Данные гекса или null
   */
  getHexAt(worldX, worldY) {
    const hex = this.worldToHex(worldX, worldY);
    return this.getHex(hex.q, hex.r);
  }

  /**
   * 🎯 Получить гекс по axial координатам
   * @param {number} q - Axial Q координата
   * @param {number} r - Axial R координата
   * @returns {Object|null} Данные гекса или null
   */
  getHex(q, r) {
    const key = `${q}:${r}`;
    return this.tiles.get(key) || null;
  }

  /**
   * ✏️ Установить данные гекса
   * @param {number} q - Axial Q координата
   * @param {number} r - Axial R координата
   * @param {Object} data - Данные гекса
   */
  setHex(q, r, data) {
    const key = `${q}:${r}`;
    this.tiles.set(key, {
      q,
      r,
      ...data
    });
  }

  /**
   * 🗑️ Удалить данные гекса
   * @param {number} q - Axial Q координата
   * @param {number} r - Axial R координата
   */
  removeHex(q, r) {
    const key = `${q}:${r}`;
    this.tiles.delete(key);
  }

  /**
   * 🔄 Получить 6 соседних гексов
   * @param {number} q - Axial Q координата
   * @param {number} r - Axial R координата
   * @returns {Array<{q: number, r: number}>} Массив координат соседей
   */
  getNeighbors(q, r) {
    return this._neighborDirections.map(dir => ({
      q: q + dir.q,
      r: r + dir.r
    }));
  }

  /**
   * 🔄 Получить данные соседних гексов (только существующие)
   * @param {number} q - Axial Q координата
   * @param {number} r - Axial R координата
   * @returns {Array<Object>} Массив данных существующих соседей
   */
  getNeighborTiles(q, r) {
    const neighbors = this.getNeighbors(q, r);
    return neighbors
      .map(n => this.getHex(n.q, n.r))
      .filter(tile => tile !== null);
  }

  /**
   * 📏 Получить все гексы в радиусе (включая центр)
   * @param {number} q - Axial Q координата центра
   * @param {number} r - Axial R координата центра
   * @param {number} radius - Радиус (0 = только центр)
   * @returns {Array<{q: number, r: number}>} Массив координат
   */
  getHexesInRadius(q, r, radius) {
    const results = [];

    for (let dq = -radius; dq <= radius; dq++) {
      for (let dr = Math.max(-radius, -dq - radius); dr <= Math.min(radius, -dq + radius); dr++) {
        results.push({
          q: q + dq,
          r: r + dr
        });
      }
    }

    return results;
  }

  /**
   * 📏 Получить все гексы в радиусе с данными (только существующие)
   * @param {number} q - Axial Q координата центра
   * @param {number} r - Axial R координата центра
   * @param {number} radius - Радиус
   * @returns {Array<Object>} Массив данных существующих гексов
   */
  getTilesInRadius(q, r, radius) {
    const coords = this.getHexesInRadius(q, r, radius);
    return coords
      .map(c => this.getHex(c.q, c.r))
      .filter(tile => tile !== null);
  }

  /**
   * 📐 Получить расстояние между двумя гексами
   * @param {number} q1 - Q первой координаты
   * @param {number} r1 - R первой координаты
   * @param {number} q2 - Q второй координаты
   * @param {number} r2 - R второй координаты
   * @returns {number} Расстояние
   */
  distance(q1, r1, q2, r2) {
    return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
  }

  /**
   * 📦 Получить все гексы в прямоугольной области (мировые координаты)
   * @param {number} minX - Минимальная X
   * @param {number} minY - Минимальная Y
   * @param {number} maxX - Максимальная X
   * @param {number} maxY - Максимальная Y
   * @returns {Array<Object>} Массив данных гексов
   */
  getHexesInRect(minX, minY, maxX, maxY) {
    const tiles = [];

    // Находим приблизительные границы в hex координатах.
    // ВАЖНО: для axial-координат нельзя корректно получить min/max (q,r),
    // используя только (minX,minY) и (maxX,maxY) — по диагональным углам
    // будут пропуски. Берём все 4 угла и делаем min/max по q/r.
    const corners = [
      { x: minX, y: minY },
      { x: minX, y: maxY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY }
    ];
    const cornerHexes = corners.map(p => this.worldToHex(p.x, p.y));

    let minQ = Math.min(...cornerHexes.map(h => h.q));
    let maxQ = Math.max(...cornerHexes.map(h => h.q));
    let minR = Math.min(...cornerHexes.map(h => h.r));
    let maxR = Math.max(...cornerHexes.map(h => h.r));

    // Добавляем запас для гексов на границах и округлений worldToHex
    const padding = 2;
    minQ -= padding;
    maxQ += padding;
    minR -= padding;
    maxR += padding;

    for (let q = minQ; q <= maxQ; q++) {
      for (let r = minR; r <= maxR; r++) {
        const center = this.hexToWorld(q, r, 'center');
        
        // Проверяем, что центр гекса в пределах прямоугольника (с запасом на размер)
        if (center.x >= minX - this.hexSize && center.x <= maxX + this.hexSize &&
            center.y >= minY - this.hexSize && center.y <= maxY + this.hexSize) {
          const tile = this.getHex(q, r);
          if (tile) {
            tiles.push(tile);
          }
        }
      }
    }

    return tiles;
  }

  /**
   * 📐 Получить вершины гекса в мировых координатах
   * @param {number} q - Axial Q координата
   * @param {number} r - Axial R координата
   * @returns {Array<{x: number, y: number}>} 6 вершин гекса
   */
  getHexVertices(q, r) {
    const center = this.hexToWorld(q, r, 'center');
    const vertices = [];

    for (let i = 0; i < 6; i++) {
      const angle = this.orientation === 'pointy-top'
        ? Math.PI / 3 * i - Math.PI / 6  // pointy-top: первая вершина сверху
        : Math.PI / 3 * i;                // flat-top: первая вершина справа

      vertices.push({
        x: center.x + this.hexSize * Math.cos(angle),
        y: center.y + this.hexSize * Math.sin(angle)
      });
    }

    return vertices;
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
   * 🔄 Изменить ориентацию
   * @param {string} orientation - 'pointy-top' | 'flat-top'
   */
  setOrientation(orientation) {
    if (orientation === 'pointy-top' || orientation === 'flat-top') {
      this.orientation = orientation;
      this._updateGeometryConstants();
    }
  }

  /**
   * 📏 Изменить размер гекса
   * @param {number} size - Новый размер (радиус)
   */
  setHexSize(size) {
    this.hexSize = Number(size) || 32;
    this._updateGeometryConstants();
  }

  /**
   * 📊 Получить информацию о системе
   */
  getInfo() {
    return {
      enabled: this.enabled,
      orientation: this.orientation,
      hexSize: this.hexSize,
      origin: this.origin,
      hexWidth: this._hexWidth,
      hexHeight: this._hexHeight,
      showGrid: this.showGrid,
      gridColor: this.gridColor,
      gridAlpha: this.gridAlpha,
      tilesCount: this.tiles.size
    };
  }

  /**
   * 🧹 Очистить все данные гексов
   */
  clearTiles() {
    this.tiles.clear();
  }
}
