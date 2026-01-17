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

    const legacyBgColor = options.button?.backgroundColor ?? '#4fc3f7';
    const legacyBgHover = options.button?.backgroundColorHover ?? '#29b6f6';
    const bg = options.button?.background || {};

    this.button = {
      width: Number(options.button?.width ?? 160),
      height: Number(options.button?.height ?? 44),

      /**
       * Network-friendly background config.
       * - If textureUrl is present => renderer uses sprite background
       * - Else => renderer uses color fallback
       */
      background: {
        color: bg.color ?? legacyBgColor,
        colorHover: bg.colorHover ?? legacyBgHover,
        textureUrl: bg.textureUrl ?? null,
        textureUrlHover: bg.textureUrlHover ?? null,
        tint: bg.tint ?? null,
        tintHover: bg.tintHover ?? null,
      },

      // Network-friendly UI: store an action identifier (no function closures)
      actionId: options.button?.actionId ?? null,
      actionPayload: options.button?.actionPayload ?? null
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
