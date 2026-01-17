import * as PIXI from 'pixi.js';
import { Entity } from './Entity.js';

/**
 * UI base entity.
 * - binding: exactly one of canvasId/cameraId/worldId (same rule as Entity)
 * - screenSpace: true => fixed size; false => scales (for camera-bound UI)
 */
export class UIEntity extends Entity {
  constructor(options = {}) {
    super({ ...options, type: 'ui' });
    this.screenSpace = options.screenSpace !== false; // default true
    // UI tends to be above gameplay
    this.z_index = Number.isFinite(options.z_index) ? options.z_index : 9999;
  }
}

export class UITextEntity extends UIEntity {
  constructor(options = {}) {
    super({ ...options, subtype: 'text' });
    this.text = {
      content: options.text?.content ?? 'Text',
      fontSize: Number(options.text?.fontSize ?? 18),
      fontFamily: options.text?.fontFamily ?? 'Arial',
      color: options.text?.color ?? '#ffffff',
      align: options.text?.align ?? 'left',
      wordWrap: !!options.text?.wordWrap,
      wordWrapWidth: Number(options.text?.wordWrapWidth ?? 0) || undefined
    };
  }
}

export class UIButtonEntity extends UIEntity {
  constructor(options = {}) {
    super({ ...options, subtype: 'button' });

    this.text = {
      content: options.text?.content ?? 'Button',
      fontSize: Number(options.text?.fontSize ?? 16),
      fontFamily: options.text?.fontFamily ?? 'Arial',
      textColor: options.text?.textColor ?? '#111111'
    };

    this.button = {
      width: Number(options.button?.width ?? 160),
      height: Number(options.button?.height ?? 44),
      backgroundColor: options.button?.backgroundColor ?? '#4fc3f7',
      backgroundColorHover: options.button?.backgroundColorHover ?? '#29b6f6',
      onClick: typeof options.button?.onClick === 'function' ? options.button.onClick : null
    };

    // collision for click (rect)
    this.collision = [
      {
        id: options.collision?.[0]?.id,
        enabled: true,
        offset: { x: 0, y: 0 },
        shape: 'rect',
        width: this.button.width,
        height: this.button.height,
        type: 'hitbox',
        layer: 'ui',
        mask: ['ui'],
        active: true,
        debugVisible: false,
        debugColor: '#00ff00'
      }
    ];
  }
}

// -------------------------
// PIXI helpers (renderer-facing)
// -------------------------

export function createPixiDisplayObjectForUI(uiEntity) {
  if (!uiEntity || uiEntity.type !== 'ui') return null;

  if (uiEntity.subtype === 'text') {
    const style = new PIXI.TextStyle({
      fontFamily: uiEntity.text.fontFamily,
      fontSize: uiEntity.text.fontSize,
      fill: uiEntity.text.color,
      align: uiEntity.text.align,
      wordWrap: !!uiEntity.text.wordWrap,
      wordWrapWidth: uiEntity.text.wordWrapWidth
    });
    const t = new PIXI.Text({ text: uiEntity.text.content, style });
    t.zIndex = uiEntity.z_index || 0;
    t.alpha = uiEntity.opacity ?? 1;
    t.visible = uiEntity.visible !== false;
    return t;
  }

  if (uiEntity.subtype === 'button') {
    const root = new PIXI.Container();
    root.sortableChildren = true;
    root.zIndex = uiEntity.z_index || 0;
    root.alpha = uiEntity.opacity ?? 1;
    root.visible = uiEntity.visible !== false;

    const bg = new PIXI.Graphics();
    bg.rect(0, 0, uiEntity.button.width, uiEntity.button.height).fill(uiEntity.button.backgroundColor);
    bg.zIndex = 0;
    root.addChild(bg);

    const label = new PIXI.Text({
      text: uiEntity.text.content,
      style: {
        fontFamily: uiEntity.text.fontFamily,
        fontSize: uiEntity.text.fontSize,
        fill: uiEntity.text.textColor,
        align: 'center'
      }
    });
    label.anchor?.set?.(0.5);
    label.x = uiEntity.button.width / 2;
    label.y = uiEntity.button.height / 2;
    label.zIndex = 1;
    root.addChild(label);

    // interactivity
    root.eventMode = 'static';
    root.cursor = 'pointer';
    root.hitArea = new PIXI.Rectangle(0, 0, uiEntity.button.width, uiEntity.button.height);

    root.on('pointerover', () => {
      bg.clear();
      bg.rect(0, 0, uiEntity.button.width, uiEntity.button.height).fill(uiEntity.button.backgroundColorHover);
    });
    root.on('pointerout', () => {
      bg.clear();
      bg.rect(0, 0, uiEntity.button.width, uiEntity.button.height).fill(uiEntity.button.backgroundColor);
    });
    root.on('pointertap', () => {
      try {
        if (uiEntity.button.onClick) uiEntity.button.onClick(uiEntity);
      } catch (e) {
        console.error('UIButton onClick error:', e);
      }
    });

    return root;
  }

  return null;
}

