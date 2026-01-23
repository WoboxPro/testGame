import { getBindingLabel, suggestId } from '../utils/editorUtils.js';

export function useUIEntityBinding({ canvases, cameras, uiEntities, select }) {
  
  function addUIToCanvas(model, canvasId) {
    const canvasModel = canvases.find((c) => c.id === canvasId);
    if (canvasModel) {
      canvasModel.instance.addUIEntity(model);
    }
  }

  function addUIToCamera(model, cameraId) {
    const camModel = cameras.find((c) => c.id === cameraId);
    if (camModel && camModel.canvasId) {
      const canvasModel = canvases.find((c) => c.id === camModel.canvasId);
      if (canvasModel) {
        canvasModel.instance.addUIEntity(model);
      }
    }
  }

  function addUIToWorld(model, worldId) {
    for (const canvasModel of canvases) {
      const hasWorldCamera = Array.from(canvasModel.instance.cameras.values())
        .some(cam => cam.worldId === worldId);
      if (hasWorldCamera) {
        canvasModel.instance.addUIEntity(model);
      }
    }
  }

  function addUIEntityToCanvas(model, binding) {
    if (binding.canvasId) {
      addUIToCanvas(model, binding.canvasId);
    } else if (binding.cameraId) {
      addUIToCamera(model, binding.cameraId);
    } else if (binding.worldId) {
      addUIToWorld(model, binding.worldId);
    }
  }

  function createBindingFromForm(bindTo, canvasId, cameraId, worldId) {
    if (bindTo === 'canvas') {
      return { canvasId };
    } else if (bindTo === 'camera') {
      return { cameraId };
    } else {
      return { worldId };
    }
  }

  function createUIEntity({ id, subtype, instance, binding }) {
    if (uiEntities.some((u) => u.id === id)) return false;

    const model = {
      id,
      subtype,
      bindingLabel: getBindingLabel(instance),
      instance
    };

    uiEntities.push(model);
    addUIEntityToCanvas(model, binding);
    select({ type: 'ui', id });

    return true;
  }

  return {
    createBindingFromForm,
    createUIEntity
  };
}
