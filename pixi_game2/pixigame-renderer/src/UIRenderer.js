import * as PIXI from 'pixi.js';

/**
 * Apply scale mode to sprite for button background texture.
 * @param {PIXI.Sprite} sprite
 * @param {number} targetWidth
 * @param {number} targetHeight
 * @param {string} scaleMode - 'stretch' | 'contain' | 'cover' | 'tile' | 'center'
 */
function applyScaleMode(sprite, targetWidth, targetHeight, scaleMode = 'stretch') {
  const texture = sprite.texture;
  const texWidth = texture.width;
  const texHeight = texture.height;

  switch (scaleMode) {
    case 'stretch':
      sprite.width = targetWidth;
      sprite.height = targetHeight;
      sprite.x = 0;
      sprite.y = 0;
      break;

    case 'contain': {
      const scale = Math.min(targetWidth / texWidth, targetHeight / texHeight);
      sprite.scale.set(scale);
      sprite.x = (targetWidth - texWidth * scale) / 2;
      sprite.y = (targetHeight - texHeight * scale) / 2;
      break;
    }

    case 'cover': {
      const scale = Math.max(targetWidth / texWidth, targetHeight / texHeight);
      sprite.scale.set(scale);
      sprite.x = (targetWidth - texWidth * scale) / 2;
      sprite.y = (targetHeight - texHeight * scale) / 2;
      break;
    }

    case 'tile': {
      // Используем Texture с повторением через tilingSprite
      // Но для простого Sprite делаем центрированное отображение
      sprite.width = texWidth;
      sprite.height = texHeight;
      sprite.x = (targetWidth - texWidth) / 2;
      sprite.y = (targetHeight - texHeight) / 2;
      break;
    }

    case 'center':
    default:
      sprite.width = texWidth;
      sprite.height = texHeight;
      sprite.x = (targetWidth - texWidth) / 2;
      sprite.y = (targetHeight - texHeight) / 2;
      break;
  }
}

/**
 * Create PIXI display object for UI entity (client-only renderer layer).
 *
 * @param {any} uiEntity Entity with type === 'ui'
 * @param {{ onAction?: (actionId: string, payload: any, entity: any) => void }} [ctx]
 * @returns {PIXI.DisplayObject|null}
 */
export function createPixiDisplayObjectForUI(uiEntity, ctx = {}) {
  if (!uiEntity || uiEntity.type !== 'ui') return null;

  if (uiEntity.subtype === 'text') {
    const style = new PIXI.TextStyle({
      fontFamily: uiEntity.text?.fontFamily ?? 'Arial',
      fontSize: Number(uiEntity.text?.fontSize ?? 18),
      fill: uiEntity.text?.color ?? '#ffffff',
      align: uiEntity.text?.align ?? 'left',
      wordWrap: !!uiEntity.text?.wordWrap,
      wordWrapWidth: uiEntity.text?.wordWrapWidth
    });
    const t = new PIXI.Text({ text: uiEntity.text?.content ?? '', style });
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

    const w = Number(uiEntity.button?.width ?? 160);
    const h = Number(uiEntity.button?.height ?? 44);
    const bgCfg = uiEntity.button?.background || {};
    const bgColor = bgCfg.color ?? uiEntity.button?.backgroundColor ?? '#4fc3f7';
    const bgHover = bgCfg.colorHover ?? uiEntity.button?.backgroundColorHover ?? '#29b6f6';
    const texUrl = bgCfg.textureUrl || null;
    const texUrlHover = bgCfg.textureUrlHover || null;
    const scaleMode = bgCfg.scaleMode || 'stretch';
    const tint = bgCfg.tint;
    const tintHover = bgCfg.tintHover;

    // Always draw color fallback (network-friendly + works while texture loads/fails)
    const bgFill = new PIXI.Graphics();
    bgFill.rect(0, 0, w, h).fill(bgColor);
    bgFill.zIndex = 0;
    root.addChild(bgFill);

    /** @type {PIXI.Sprite | null} */
    let bgSprite = null;
    if (texUrl) {
      const sprite = PIXI.Sprite.from(texUrl);
      applyScaleMode(sprite, w, h, scaleMode);
      if (tint) {
        try { sprite.tint = tint; } catch (_) {}
      }
      sprite.zIndex = 1;
      root.addChild(sprite);
      bgSprite = sprite;
    }

    const label = new PIXI.Text({
      text: uiEntity.text?.content ?? 'Button',
      style: {
        fontFamily: uiEntity.text?.fontFamily ?? 'Arial',
        fontSize: Number(uiEntity.text?.fontSize ?? 16),
        fill: uiEntity.text?.textColor ?? '#111111',
        align: 'center'
      }
    });
    label.anchor?.set?.(0.5);
    label.x = w / 2;
    label.y = h / 2;
    label.zIndex = 2;
    root.addChild(label);

    // interactivity
    root.eventMode = 'static';
    root.cursor = 'pointer';
    root.hitArea = new PIXI.Rectangle(0, 0, w, h);

    root.on('pointerover', () => {
      bgFill.clear();
      bgFill.rect(0, 0, w, h).fill(bgHover);
      if (bgSprite) {
        if (texUrlHover) bgSprite.texture = PIXI.Texture.from(texUrlHover);
        applyScaleMode(bgSprite, w, h, scaleMode);
        if (tintHover) {
          try { bgSprite.tint = tintHover; } catch (_) {}
        }
      }
    });
    root.on('pointerout', () => {
      bgFill.clear();
      bgFill.rect(0, 0, w, h).fill(bgColor);
      if (bgSprite) {
        bgSprite.texture = PIXI.Texture.from(texUrl);
        applyScaleMode(bgSprite, w, h, scaleMode);
        if (tint) {
          try { bgSprite.tint = tint; } catch (_) {}
        }
      }
    });
    root.on('pointertap', () => {
      const actionId = uiEntity.button?.actionId;
      if (!actionId) return;
      try {
        ctx.onAction?.(actionId, uiEntity.button?.actionPayload, uiEntity);
      } catch (e) {
        console.error('UI action handler error:', e);
      }
    });

    return root;
  }

  return null;
}

