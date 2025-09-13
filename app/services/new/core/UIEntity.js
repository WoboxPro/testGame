import * as PIXI from 'pixi.js';

/**
 * UIEntity - легковесные UI-элементы поверх мира/камеры/канваса
 * Поддерживает режимы позиционирования:
 * - mode: 'canvas'   → координаты канваса (px), overlay поверх всех камер
 * - mode: 'camera'   → координаты внутри вьюпорта камеры (px), клиппинг маской камеры
 * - mode: 'percent'  → пропорции канваса [0..1], overlay поверх всех камер
 * - mode: 'world'    → мировые координаты (x,y), привязка к камере (следит за фокусом/зумом)
 */
export class UIEntity {
  constructor({ canvas, camera = null, mode = 'canvas', attachTo } = {}) {
    if (!canvas || !canvas.app) throw new Error('UIEntity: canvas.app is required');
    this.canvas = canvas;
    this.camera = camera || null;
    // Back-compat: mode → attachTo; 'percent' was legacy variant of canvas-percent
    this.attachTo = attachTo || (mode === 'percent' ? 'canvas' : mode) || 'canvas';
    this.container = new PIXI.Container();
    this._tickerFn = null;

    // attach to appropriate layer
    if (this.attachTo === 'canvas') {
      const layer = canvas.uiOverlay || canvas.app.stage;
      layer.addChild(this.container);
      this.layer = layer;
    } else if (this.attachTo === 'camera' || this.attachTo === 'world' || this.attachTo === 'entity') {
      if (!this.camera) throw new Error('UIEntity: camera is required for mode="camera" or "world"');
      if (!this.camera.uiLayer) {
        // Fallback на контейнер камеры, если uiLayer ещё не создан
        this.camera.uiLayer = new PIXI.Container();
        this.camera.container.addChild(this.camera.uiLayer);
      }
      this.camera.uiLayer.addChild(this.container);
      this.layer = this.camera.uiLayer;
    }
  }

  /**
   * Создать текстовый элемент
   */
  createText({ text = '', x = 0, y = 0, worldX = 0, worldY = 0, fontSize = 20, fill = 0xFFFFFF, fontFamily = 'Arial', align = 'center', strokeColor, strokeWidth = 0, anchor = 0.5, units = 'px', entity = null, offsetX = 0, offsetY = 0 } = {}) {
    const normColor = (c, def = 0xFFFFFF) => (typeof c === 'number' ? c : (typeof c === 'string' ? c : def));
    const style = {
      fill: normColor(fill, 0xFFFFFF),
      fontSize,
      fontFamily,
      align
    };
    if (strokeColor != null && strokeWidth > 0) {
      style.stroke = normColor(strokeColor, 0x000000);
      style.strokeThickness = strokeWidth;
    }
    let t = null;
    try { t = new PIXI.Text({ text: String(text), style }); } catch (_) {}
    if (!t) { try { t = new PIXI.Text(String(text), style); } catch (_) {} }
    if (!t) { try { t = new PIXI.Text(String(text)); } catch (_) {} }
    if (t && t.anchor && typeof t.anchor.set === 'function') t.anchor.set(anchor, anchor);
    if (t) this.container.addChild(t);

    const applyPos = () => {
      if (!t) return;
      const mode = this.attachTo;
      const pxUnits = (units !== 'percent');
      if (mode === 'canvas') {
        if (pxUnits) {
          t.x = x; t.y = y;
        } else {
          const W = this.canvas.width, H = this.canvas.height;
          t.x = Math.round(x * W);
          t.y = Math.round(y * H);
        }
      } else if (mode === 'camera') {
        if (!this.camera) return;
        if (pxUnits) {
          t.x = x; t.y = y; // внутри вьюпорта камеры
        } else {
          t.x = Math.round(x * this.camera.width);
          t.y = Math.round(y * this.camera.height);
        }
      } else if (mode === 'world') {
        if (!this.camera) return;
        let wx = worldX, wy = worldY;
        if (!pxUnits) {
          // Проценты относительно текущего видимого окна камеры в мировых координатах
          const halfW = (this.camera.width / 2) / this.camera.zoom;
          const halfH = (this.camera.height / 2) / this.camera.zoom;
          const left = this.camera.focusX - halfW;
          const top = this.camera.focusY - halfH;
          wx = left + x * (2 * halfW);
          wy = top + y * (2 * halfH);
        } else {
          // Back-compat: если worldX/worldY не заданы, используем x,y как world
          if (wx == null) wx = x;
          if (wy == null) wy = y;
        }
        const s = this.camera.worldToScreen(wx, wy);
        t.x = s.x - this.camera.x;
        t.y = s.y - this.camera.y;
      } else if (mode === 'entity') {
        if (!this.camera || !entity) return;
        const ex = entity.x || 0;
        const ey = entity.y || 0;
        const s = this.camera.worldToScreen(ex, ey);
        let ox = offsetX, oy = offsetY;
        if (!pxUnits) {
          ox = Math.round(offsetX * this.camera.width);
          oy = Math.round(offsetY * this.camera.height);
        }
        t.x = (s.x - this.camera.x) + ox;
        t.y = (s.y - this.camera.y) + oy;
      }
    };

    applyPos();
    // world / entity требуют обновления каждый кадр (камера двигается/зумится)
    if (this.attachTo === 'world' || this.attachTo === 'entity' || (this.attachTo === 'camera' && units === 'percent')) {
      this._tickerFn = () => applyPos();
      try { this.canvas.app.ticker.add(this._tickerFn); } catch (_) {}
    }

    return {
      display: t,
      setText: (val) => { if (t) t.text = String(val); },
      setPosition: (nx, ny) => { x = nx; y = ny; worldX = nx; worldY = ny; applyPos(); },
      destroy: () => { try { if (this._tickerFn) this.canvas.app.ticker.remove(this._tickerFn); } catch(_) {}; if (t) t.destroy(); }
    };
  }

  destroy() {
    try { if (this._tickerFn) this.canvas.app.ticker.remove(this._tickerFn); } catch(_) {}
    this._tickerFn = null;
    if (this.container && this.container.parent) this.container.parent.removeChild(this.container);
    this.container?.destroy({ children: true });
    this.container = null;
  }
}


