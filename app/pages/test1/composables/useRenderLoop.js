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

  // 🔫 Состояние кнопки мыши для стрельбы
  let _isMousePressed = false;

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

  // 🔫 Обработка нажатия левой кнопки мыши
  function onMouseDown(e) {
    if (e.button !== 0) return; // Только левая кнопка
    _isMousePressed = true;
    updateMuzzleFiringState();
  }

  // 🔫 Обработка отпускания левой кнопки мыши
  function onMouseUp(e) {
    if (e.button !== 0) return; // Только левая кнопка
    _isMousePressed = false;
    updateMuzzleFiringState();
  }

  // 🔫 Обновление состояния стрельбы для всех muzzle
  function updateMuzzleFiringState() {
    for (const world of worlds) {
      if (world.instance?.projectileSystem) {
        const ps = world.instance.projectileSystem;
        // Устанавливаем состояние стрельбы для всех зарегистрированных muzzle
        for (const [muzzleId] of ps.muzzles) {
          ps.setMuzzleFiring(muzzleId, _isMousePressed);
        }
      }
    }
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
      world.instance.update(dt * 1000); // Convert to milliseconds
    }

    // Sync cameraUi from selected camera if there's an active controller
    if (selectedCamera.value) {
      const cam = selectedCamera.value.instance;
      cameraUi.zoom = Number(cam.zoom) || 1;
      cameraUi.focusX = Number(cam.focusX) || 0;
      cameraUi.focusY = Number(cam.focusY) || 0;
    }

    // UI rendering now handled by engine - no need to call updateUITransforms
    // updateUITransforms();

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
    // Pass wheel only, controllers handle their own keyboard events
    window.addEventListener('wheel', onWheel, { passive: false });

    // 🔫 Добавляем обработчики мыши для стрельбы
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);

    // Preload textures from public/assets manifest into PIXI.Assets cache
    preloadPublicAssetsToCache();

    if (!rafId) loop();
  });

  onUnmounted(() => {
    window.removeEventListener('wheel', onWheel);

    // 🔫 Удаляем обработчики мыши
    window.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mouseup', onMouseUp);

    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    resetAll?.();

    // Destroy all controllers (they handle their own keyboard cleanup)
    for (const controller of controllers) {
      controller.instance.destroy?.();
    }
  });

  return {
    stop() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    }
  };
}

