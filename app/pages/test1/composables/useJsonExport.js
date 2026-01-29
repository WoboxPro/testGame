import { reactive, watch } from 'vue';

/**
 * JSON Export helper for /test1 editor.
 * Lives under /test1 to avoid cross-page coupling.
 */
 export function useJsonExport({
   worlds,
   canvases,
   cameras,
   uiEntities,
   gameEntities,
   muzzles,
   regions,
   controllers
 }) {
  // JSON Export Modal
  const jsonModal = reactive({
    open: false,
    title: '',
    items: [], // { id, name, json }
    selectedIndex: 0,
    get selectedJson() {
      if (this.items.length === 0) return '';
      if (this.selectedIndex === -1) {
        // All items as array
        const allItems = this.items.map((item) => JSON.parse(item.json));
        return JSON.stringify(allItems, null, 2);
      }
      return this.items[this.selectedIndex]?.json || '';
    }
  });

  // Helper for computed selected JSON (force reactivity)
  watch(
    () => jsonModal.selectedIndex,
    () => {
      // no-op
    }
  );

  function openJsonModal(type) {
    jsonModal.open = true;
    jsonModal.items = [];
    jsonModal.selectedIndex = 0;

    switch (type) {
      case 'all':
        jsonModal.title = 'Full Project Setup';
        jsonModal.items = [
          {
            id: 'all',
            name: 'All Data',
            json: JSON.stringify(getAllProjectJson(), null, 2)
          }
        ];
        break;
      case 'world':
        jsonModal.title = 'Worlds';
        jsonModal.items = worlds.map((w) => ({
          id: w.id,
          name: w.id,
          json: JSON.stringify(getWorldJsonConfig(w), null, 2)
        }));
        break;
      case 'canvas':
        jsonModal.title = 'Canvases';
        jsonModal.items = canvases.map((c) => ({
          id: c.id,
          name: c.id,
          json: JSON.stringify(getCanvasJsonConfig(c), null, 2)
        }));
        break;
      case 'camera':
        jsonModal.title = 'Cameras';
        jsonModal.items = cameras.map((c) => ({
          id: c.id,
          name: c.id,
          json: JSON.stringify(getCameraJsonConfig(c), null, 2)
        }));
        break;
       case 'ui':
         jsonModal.title = 'UI Entities';
         jsonModal.items = uiEntities.map((u) => ({
           id: u.id,
           name: `${u.subtype}: ${u.id}`,
           json: JSON.stringify(getUIJsonConfig(u), null, 2)
         }));
         break;
       case 'game_entity':
         jsonModal.title = 'Game Entities';
         jsonModal.items = gameEntities.map((e) => ({
           id: e.id,
           name: `${e.subtype}: ${e.id}`,
           json: JSON.stringify(getEntityJsonConfig(e), null, 2)
         }));
         break;
       case 'muzzle':
         jsonModal.title = 'Muzzles';
         jsonModal.items = muzzles.map((m) => ({
           id: m.id,
           name: `Muzzle: ${m.id}`,
           json: JSON.stringify(getMuzzleJsonConfig(m), null, 2)
         }));
         break;
       case 'region':
        jsonModal.title = 'Regions';
        jsonModal.items = regions.map((r) => ({
          id: r.id,
          name: r.displayName,
          json: JSON.stringify(getRegionJsonConfig(r), null, 2)
        }));
        break;
      case 'controller':
        jsonModal.title = 'Controllers';
        jsonModal.items = controllers.map((c) => ({
          id: c.id,
          name: c.id,
          json: JSON.stringify(getControllerJsonConfig(c), null, 2)
        }));
        break;
      default:
        jsonModal.title = 'JSON Export';
        jsonModal.items = [];
        break;
    }
  }

  function closeJsonModal() {
    jsonModal.open = false;
    jsonModal.items = [];
    jsonModal.selectedIndex = 0; // Reset to first item, not -1 (All)
  }

  async function copyJsonToClipboard() {
    try {
      await navigator.clipboard.writeText(jsonModal.selectedJson);
      console.log('JSON copied to clipboard');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  // ---------------------------
  // JSON config extractors
  // ---------------------------

  function getWorldJsonConfig(worldModel) {
    const w = worldModel.instance;
    return {
      id: worldModel.id,
      type: worldModel.type,
      width: worldModel.width,
      height: worldModel.height,
      backgroundColor: worldModel.backgroundColor,
      showBounds: w.showBounds,
      boundsColor: w.boundsColor,
      backgroundTexture: w.backgroundTexture?.textureUrl
        ? {
            textureUrl: w.backgroundTexture.textureUrl,
            scaleMode: w.backgroundTexture.scaleMode,
            tint: w.backgroundTexture.tint
          }
        : undefined,
      regions: w.regionSystem.getAllRegions().map((r) => ({
        id: r.id,
        displayName: r.displayName,
        bounds: r.bounds,
        hasTexture: r.hasTexture,
        bordersEnabled: r.bordersEnabled
      }))
    };
  }

  function getCanvasJsonConfig(canvasModel) {
    return {
      id: canvasModel.id,
      sizeMode: canvasModel.sizeMode,
      width: canvasModel.width,
      height: canvasModel.height,
      backgroundColor: canvasModel.backgroundColor,
      antialias: canvasModel.antialias,
      resolution: canvasModel.resolution,
      cameraCount: cameras.filter((c) => c.canvasId === canvasModel.id).length
    };
  }

  function getCameraJsonConfig(cameraModel) {
    const c = cameraModel.instance;
    return {
      id: cameraModel.id,
      canvasId: cameraModel.canvasId,
      worldId: cameraModel.worldId,
      anchor: cameraModel.anchor,
      width: cameraModel.width,
      height: cameraModel.height,
      x: cameraModel.x,
      y: cameraModel.y,
      focusX: c.focusX,
      focusY: c.focusY,
      zoom: c.zoom,
      minZoom: c.minZoom,
      maxZoom: c.maxZoom,
      priority: cameraModel.priority,
      visibleTypes: c.visibleTypes || []
    };
  }

  function getUIJsonConfig(uiModel) {
    const u = uiModel.instance;
    const base = {
      id: uiModel.id,
      subtype: uiModel.subtype,
      canvasId: u.canvasId || null,
      cameraId: u.cameraId || null,
      worldId: u.worldId || null,
      bindingLabel: uiModel.bindingLabel,
      screenSpace: u.screenSpace,
      position: u.position,
      rotation: u.rotation,
      scale: u.scale,
      visible: u.visible,
      opacity: u.opacity,
      z_index: u.z_index
    };

    if (uiModel.subtype === 'text') {
      return {
        ...base,
        text: u.text
      };
    } else if (uiModel.subtype === 'button') {
      return {
        ...base,
        text: u.text,
        button: u.button
      };
    }
    return base;
  }

  function getRegionJsonConfig(regionModel) {
    const r = regionModel.regionType;
    return {
      id: regionModel.id,
      name: r.name,
      displayName: regionModel.displayName,
      worldId: regionModel.worldId,
      bounds: regionModel.bounds,
      groundTexture: r.groundTexture?.textureUrl
        ? {
            textureUrl: r.groundTexture.textureUrl,
            scaleMode: r.groundTexture.scaleMode,
            tint: r.groundTexture.tint
          }
        : undefined,
      borders: {
        enabled: r.borders.enabled,
        color: r.borders.color,
        width: r.borders.width,
        alpha: r.borders.alpha
      }
    };
  }

   function getControllerJsonConfig(controllerModel) {
    const c = controllerModel.instance;
    const info = c.getInfo();
    return {
      id: controllerModel.id,
      type: controllerModel.type,
      targetId: controllerModel.targetId,
      entityMovement: info.entityMovement,
      zoomSpeed: info.zoomSpeed,
      minZoom: info.minZoom,
      maxZoom: info.maxZoom,
      bindings: info.bindings
    };
  }

  function getEntityJsonConfig(entityModel) {
    const e = entityModel.instance;
    return {
      id: entityModel.id,
      subtype: entityModel.subtype,
      worldId: entityModel.worldId,
      position: e.position,
      rotation: e.rotation,
      scale: e.scale,
      velocity: e.velocity,
      movement: e.movement,
      appearance: e.appearance,
      hasCollision: e.hasCollision,
      collision: e.collision,
      animations: e.animations,
      slots: e.slots ? e.slots.map((slot) => ({
        id: slot.id,
        offset: slot.offset,
        transformBehavior: slot.transformBehavior,
        visualEnabled: slot.visualEnabled,
        color: slot.color,
        maxAttachments: slot.maxAttachments,
        attachedEntities: slot.attachedEntities || []
      })) : []
    };
  }

  function getMuzzleJsonConfig(muzzleModel) {
    const m = muzzleModel.instance;
    return {
      id: muzzleModel.id,
      direction: m.direction,
      showDebug: m.showDebug,
      debugColor: m.debugColor,
      position: m.position,
      rotation: m.rotation,
      scale: m.scale
    };
  }

   function getAllProjectJson() {
     return {
       version: '1.0',
       timestamp: new Date().toISOString(),
       worlds: worlds.map((w) => getWorldJsonConfig(w)),
       canvases: canvases.map((c) => getCanvasJsonConfig(c)),
       cameras: cameras.map((c) => getCameraJsonConfig(c)),
       uiEntities: uiEntities.map((u) => getUIJsonConfig(u)),
       gameEntities: gameEntities.map((e) => getEntityJsonConfig(e)),
       muzzles: muzzles.map((m) => getMuzzleJsonConfig(m)),
       regions: regions.map((r) => getRegionJsonConfig(r)),
       controllers: controllers.map((c) => getControllerJsonConfig(c)),
       summary: {
         worldCount: worlds.length,
         canvasCount: canvases.length,
         cameraCount: cameras.length,
         uiEntityCount: uiEntities.length,
         gameEntityCount: gameEntities.length,
         muzzleCount: muzzles.length,
         regionCount: regions.length,
         controllerCount: controllers.length
       }
     };
   }

  return {
    jsonModal,
    openJsonModal,
    closeJsonModal,
    copyJsonToClipboard,
    // exposed mainly for debugging/tests
    getAllProjectJson
  };
}

