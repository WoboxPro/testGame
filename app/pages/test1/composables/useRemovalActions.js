/**
 * Removal/reset handlers for /test1 editor.
 * Keep under /test1 to avoid leaking editor-only logic.
 */
export function useRemovalActions({
  worlds,
  canvases,
  cameras,
  uiEntities,
  muzzles,
  regions,
  selected,
  canvasHosts,
  removeUI,
  removeGameEntity,
  removeMuzzle,
  removeRegion,
  removeController
}) {
  function removeWorld(worldId) {
    // remove cameras referencing this world
    const camsToRemove = cameras
      .filter((c) => c.worldId === worldId)
      .map((c) => c.id);
    for (const camId of camsToRemove) removeCamera(camId);

    // remove UI bound directly to this world
    const uiToRemove = uiEntities
      .filter((u) => u.instance.worldId === worldId)
      .map((u) => u.id);
    for (const id of uiToRemove) removeUI(id);

    const idx = worlds.findIndex((w) => w.id === worldId);
    if (idx >= 0) worlds.splice(idx, 1);

    if (selected.value?.type === 'world' && selected.value.id === worldId)
      selected.value = null;
  }

  function removeCanvas(canvasId) {
    // remove cameras attached to this canvas
    const camsToRemove = cameras
      .filter((c) => c.canvasId === canvasId)
      .map((c) => c.id);
    for (const camId of camsToRemove) removeCamera(camId);

    // remove UI bound directly to this canvas
    const uiToRemove = uiEntities
      .filter((u) => u.instance.canvasId === canvasId)
      .map((u) => u.id);
    for (const id of uiToRemove) removeUI(id);

    const idx = canvases.findIndex((c) => c.id === canvasId);
    if (idx >= 0) {
      try {
        canvases[idx].instance.destroy();
      } catch (_) {}
      canvases.splice(idx, 1);
    }

    const host = canvasHosts.get(canvasId);
    if (host) host.innerHTML = '';

    if (selected.value?.type === 'canvas' && selected.value.id === canvasId)
      selected.value = null;
  }

  function removeCamera(cameraId) {
    const idx = cameras.findIndex((c) => c.id === cameraId);
    if (idx < 0) return;
    const cam = cameras[idx];

    // remove UI bound directly to this camera
    const uiToRemove = uiEntities
      .filter((u) => u.instance.cameraId === cameraId)
      .map((u) => u.id);
    for (const id of uiToRemove) removeUI(id);

    const canvasModel = canvases.find((c) => c.id === cam.canvasId);
    try {
      canvasModel?.instance?.removeCamera?.(cameraId);
    } catch (_) {}

    cameras.splice(idx, 1);

    if (selected.value?.type === 'camera' && selected.value.id === cameraId)
      selected.value = null;
  }

  function removeSelected() {
    if (!selected.value) return;
    const { type, id } = selected.value;
    if (type === 'world') removeWorld(id);
    else if (type === 'canvas') removeCanvas(id);
    else if (type === 'camera') removeCamera(id);
    else if (type === 'ui') removeUI(id);
    else if (type === 'game_entity') removeGameEntity(id);
    else if (type === 'muzzle') removeMuzzle(id);
    else if (type === 'region') removeRegion(id);
    else if (type === 'controller') removeController(id);
  }

  function handleTreeDelete(type, id) {
    if (type === 'world') removeWorld(id);
    else if (type === 'canvas') removeCanvas(id);
    else if (type === 'camera') removeCamera(id);
    else if (type === 'ui') removeUI(id);
    else if (type === 'game_entity') removeGameEntity(id);
    else if (type === 'muzzle') removeMuzzle(id);
    else if (type === 'region') removeRegion(id);
    else if (type === 'controller') removeController(id);
  }

  function resetAll() {
    // remove everything in safe order: muzzles -> regions -> ui -> cameras -> canvases -> worlds
    for (const m of [...muzzles]) removeMuzzle(m.id);
    for (const r of [...regions]) removeRegion(r.id);
    for (const u of [...uiEntities]) removeUI(u.id);
    for (const cam of [...cameras]) removeCamera(cam.id);
    for (const c of [...canvases]) removeCanvas(c.id);
    for (const w of [...worlds]) removeWorld(w.id);
    selected.value = null;
  }

  return {
    removeWorld,
    removeCanvas,
    removeCamera,
    removeSelected,
    handleTreeDelete,
    resetAll
  };
}

