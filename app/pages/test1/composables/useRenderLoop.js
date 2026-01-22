import { onMounted, onUnmounted } from 'vue';

/**
 * Render loop + global input handlers for /test1 editor.
 * Lives under /test1 to avoid cross-page coupling.
 */
export function useRenderLoop({
  controllers,
  worlds,
  canvases,
  selectedCamera,
  cameraUi,
  applySelectedCameraUi,
  updateUITransforms,
  resetAll,
  PIXI
}) {
  let lastTime = performance.now();
  let rafId = null;

  let _assetsPreloadStarted = false;

  function onKeyDown(e) {
    // Pass key events to all controllers
    for (const controller of controllers) {
      controller.instance.handleKeyDown?.(e.code);
    }
  }

  function onKeyUp(e) {
    // Pass key events to all controllers
    for (const controller of controllers) {
      controller.instance.handleKeyUp?.(e.code);
    }
  }

  function onWheel(e) {
    if (!selectedCamera.value) return;

    // Only work if there's an active controller for this camera
    const controller = controllers.find(
      (c) => c.targetId === selectedCamera.value.id && c.instance.enabled
    );
    if (!controller) return;

    // Only when cursor is over viewport area (avoid scrolling panels)
    const vp = document.querySelector('.viewport');
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const inside =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;
    if (!inside) return;

    e.preventDefault();
    const direction = e.deltaY > 0 ? -1 : 1;
    cameraUi.zoom = Math.max(
      0.1,
      Math.min(5.0, cameraUi.zoom + direction * 0.1)
    );
    applySelectedCameraUi();
  }

  // Render loop for multiple canvases
  function loop() {
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.1); // Limit dt to avoid huge jumps
    lastTime = now;

    // Update all controllers
    for (const controller of controllers) {
      controller.instance.update(dt);
    }

    // Update all worlds (collision checks, etc)
    for (const world of worlds) {
      world.instance.update();
    }

    // Sync cameraUi from selected camera if there's an active controller
    if (selectedCamera.value) {
      const cam = selectedCamera.value.instance;
      cameraUi.zoom = Number(cam.zoom) || 1;
      cameraUi.focusX = Number(cam.focusX) || 0;
      cameraUi.focusY = Number(cam.focusY) || 0;
    }

    // Update UI transforms (camera-bound scaling, etc.)
    updateUITransforms();

    for (const c of canvases) {
      try {
        c.instance.render();
      } catch (_) {}
    }
    rafId = requestAnimationFrame(loop);
  }

  async function preloadPublicAssetsToCache() {
    if (_assetsPreloadStarted) return;
    _assetsPreloadStarted = true;
    try {
      const res = await fetch('/assets/manifest.json', { cache: 'no-cache' });
      if (!res.ok) return;
      const json = await res.json();
      const images = Array.isArray(json?.images) ? json.images : [];
      if (images.length === 0) return;
      await PIXI.Assets.load(images);
    } catch (_) {
      // ignore
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    // Passive false to allow preventDefault for zoom
    window.addEventListener('wheel', onWheel, { passive: false });

    // Preload textures from public/assets manifest into PIXI.Assets cache
    preloadPublicAssetsToCache();

    if (!rafId) loop();
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('wheel', onWheel);
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    resetAll?.();
  });

  return {
    stop() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    }
  };
}

