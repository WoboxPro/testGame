import { onMounted, onUnmounted } from 'vue';

/**
 * Render loop + global input handlers for /test1 editor.
 * Lives under /test1 to avoid cross-page coupling.
 *
 * 🎮 KeyActions Integration:
 * - Muzzle firing is now controlled by KeyActions through slots
 * - Each slot can be bound to a KeyAction (e.g., "fire", "left_hand")
 * - Controllers manage keyAction → keyCode mappings
 * - Muzzles respond to their slot's KeyAction state
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

  /**
   * 🎮 Найти контроллер для сущности по ID
   * @param {string} entityId - ID сущности
   * @returns {Object|null} Контроллер или null
   */
  function findControllerForEntity(entityId) {
    return controllers.find(
      (c) => c.targetId === entityId && c.instance.enabled && c.instance.isKeyActionActive
    ) || null;
  }

  /**
   * 🎮 Обновить состояние стрельбы для всех muzzle на основе KeyActions
   * Логика:
   * 1. Для каждого muzzle находим его слот
   * 2. Если у слота есть keyActionId, находим контроллер родительской сущности
   * 3. Проверяем активен ли KeyAction в контроллере
   * 4. Устанавливаем состояние стрельбы для muzzle
   */
  function updateMuzzleFiringState() {
    for (const world of worlds) {
      if (!world.instance?.projectileSystem) continue;

      const ps = world.instance.projectileSystem;

      // Проходим по всем muzzle в системе
      for (const [muzzleId, muzzleData] of ps.muzzles) {
        // Находим muzzle entity components в world
        const muzzleComponents = world.instance?.entities?.get(muzzleId);
        if (!muzzleComponents) continue;

        // Получаем ссылку на саму сущность через _entityRef
        const muzzleRef = muzzleComponents.get('_entityRef');
        if (!muzzleRef) continue;

        // Находим слот к которому привязан muzzle
        const slotId = muzzleRef._parentSlotId;
        if (!slotId) continue;

        // Находим родительскую сущность (владельца слота)
        const parentEntityId = muzzleRef._parentEntityId;
        if (!parentEntityId) continue;

        // Получаем родительскую сущность
        const parentComponents = world.instance?.entities?.get(parentEntityId);
        if (!parentComponents) continue;

        const parentRef = parentComponents.get('_entityRef');
        if (!parentRef || !parentRef.getSlot) continue;

        // Получаем слот
        const slot = parentRef.getSlot(slotId);
        if (!slot || !slot.keyActionId) {
          // Если у слота нет keyActionId, muzzle не стреляет
          ps.setMuzzleFiring(muzzleId, false);
          continue;
        }

        // Находим контроллер для родительской сущности
        const controllerWrapper = findControllerForEntity(parentEntityId);
        if (!controllerWrapper) {
          // Нет активного контроллера - muzzle не стреляет
          ps.setMuzzleFiring(muzzleId, false);
          continue;
        }

        // Проверяем активен ли KeyAction
        const keyActionId = slot.keyActionId;
        const shouldFire = controllerWrapper.instance.isKeyActionActive(keyActionId);

        // Устанавливаем состояние стрельбы для muzzle
        ps.setMuzzleFiring(muzzleId, shouldFire);
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

    // 🎮 Обновляем состояние стрельбы для всех muzzle на основе KeyActions
    updateMuzzleFiringState();

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
    // Pass wheel only, controllers handle their own keyboard and mouse events
    window.addEventListener('wheel', onWheel, { passive: false });

    // 🎮 Больше не нужно глобально обрабатывать mouseup/mousedown для стрельбы
    // Контроллеры сами обрабатывают мышь через KeyActions

    // Preload textures from public/assets manifest into PIXI.Assets cache
    preloadPublicAssetsToCache();

    if (!rafId) loop();
  });

  onUnmounted(() => {
    window.removeEventListener('wheel', onWheel);

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
