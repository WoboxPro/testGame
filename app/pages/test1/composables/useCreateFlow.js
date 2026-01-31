import { suggestId } from '../utils/editorUtils.js';

/**
 * Create modal flow for /test1 editor: open/close/confirm + default form values.
 * Keeps logic under /test1.
 */
export function useCreateFlow({
  createModal,
  worlds,
  canvases,
  cameras,
  uiEntities,
  gameEntities,
  unattachedEntities,
  muzzles,
  regions,
  controllers,
  worldForm,
  canvasForm,
  cameraForm,
  uiTextForm,
  uiButtonForm,
  gameEntityForm,
  muzzleForm,
  regionForm,
  controllerForm,
  collisionTypeForm,
  collisionRelationForm,
  createHandlers
}) {
  function openCreate(type) {
    createModal.open = true;
    createModal.type = type;

    if (type === 'world') {
      worldForm.id = suggestId('world', worlds);
    } else if (type === 'canvas') {
      canvasForm.id = suggestId('canvas', canvases);
    } else if (type === 'camera') {
      cameraForm.id = suggestId('camera', cameras);
      cameraForm.canvasId = canvases[0]?.id || '';
      cameraForm.worldId = worlds[0]?.id || '';
      cameraForm.followEntityId = '';
      cameraForm.x = 10 + (cameras.length % 3) * 400;
      cameraForm.y = 10;
    } else if (type === 'ui_text') {
      uiTextForm.id = suggestId('ui_text', uiEntities);
      uiTextForm.bindTo = canvases.length ? 'canvas' : cameras.length ? 'camera' : 'world';
      uiTextForm.canvasId = canvases[0]?.id || '';
      uiTextForm.cameraId = cameras[0]?.id || '';
      uiTextForm.worldId = worlds[0]?.id || '';
    } else if (type === 'ui_button') {
      uiButtonForm.id = suggestId('ui_button', uiEntities);
      uiButtonForm.bindTo = canvases.length ? 'canvas' : cameras.length ? 'camera' : 'world';
      uiButtonForm.canvasId = canvases[0]?.id || '';
      uiButtonForm.cameraId = cameras[0]?.id || '';
      uiButtonForm.worldId = worlds[0]?.id || '';
    } else if (type === 'game_entity') {
      // IMPORTANT: Check BOTH arrays to avoid ID collisions
      gameEntityForm.id = suggestId('unit', [...gameEntities, ...unattachedEntities]);
      gameEntityForm.worldId = worlds[0]?.id || '';
      gameEntityForm.subtype = 'unit';
      gameEntityForm.x = 0;
      gameEntityForm.y = 0;
      gameEntityForm.shape = 'circle';
      gameEntityForm.color = '#4fc3f7';
      gameEntityForm.size = 30;
      gameEntityForm.width = 40;
      gameEntityForm.height = 40;
      gameEntityForm.hasCollision = false;
      gameEntityForm.collisionScale = 1.0;
      gameEntityForm.maxSpeed = 200;
      gameEntityForm.acceleration = 1000;
      gameEntityForm.friction = 5;
    } else if (type === 'region') {
      regionForm.id = suggestId('region', regions);
      regionForm.name = `region_${regions.length + 1}`;
      regionForm.displayName = `Region ${regions.length + 1}`;
      regionForm.worldId = worlds[0]?.id || '';
    } else if (type === 'controller') {
      controllerForm.id = suggestId('controller', controllers);
      controllerForm.type = 'camera';
      controllerForm.cameraId = cameras[0]?.id || '';
      controllerForm.entityId = gameEntities[0]?.id || '';
      controllerForm.customBindings = false;
      // Reset bindings to empty
      for (const action of Object.keys(controllerForm.bindings)) {
        controllerForm.bindings[action].primary = '';
        controllerForm.bindings[action].secondary = '';
      }
    } else if (type === 'collision_type') {
      collisionTypeForm.id = '';
      collisionTypeForm.name = '';
      collisionTypeForm.defaultShape = 'circle';
      collisionTypeForm.worldId = worlds[0]?.id || '';
    } else if (type === 'collision_relation') {
      collisionRelationForm.typeA = '';
      collisionRelationForm.typeB = '';
      collisionRelationForm.block = true;
      collisionRelationForm.trigger = true;
      collisionRelationForm.worldId = worlds[0]?.id || '';
    } else if (type === 'muzzle') {
      muzzleForm.id = suggestId('muzzle', muzzles);
      muzzleForm.direction = { x: 1, y: 0 };
      muzzleForm.directionMode = 'relative';
      muzzleForm.showDebug = true;
      muzzleForm.debugColor = '#FF00FF';
      // 🔫 Fire parameters defaults
      muzzleForm.fireRate = 5;
      muzzleForm.bulletSpeed = 500;
      muzzleForm.bulletRange = 1000;
      muzzleForm.bulletSize = 8;
      muzzleForm.bulletColor = '#FFFFFF';
      muzzleForm.autoFire = false;
    }
  }

  function closeCreate() {
    createModal.open = false;
    createModal.type = null;
  }

  async function confirmCreate() {
    const type = createModal.type;
    const handler = type ? createHandlers?.[type] : null;
    if (!handler) return;
    await handler();
    closeCreate();
  }

  return { openCreate, closeCreate, confirmCreate };
}

