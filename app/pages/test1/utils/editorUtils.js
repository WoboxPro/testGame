/**
 * Small shared helpers for /test1 editor.
 * Keep these here (under /test1) to avoid leaking editor-only logic.
 */

export function suggestId(prefix, list) {
  const existing = new Set((list || []).map((x) => x.id));
  let i = 1;
  while (existing.has(`${prefix}_${i}`)) i++;
  return `${prefix}_${i}`;
}

export function getBindingLabel(entity) {
  if (!entity) return 'unbound';
  if (entity.canvasId) return `canvas:${entity.canvasId}`;
  if (entity.cameraId) return `camera:${entity.cameraId}`;
  if (entity.worldId) return `world:${entity.worldId}`;
  return 'unbound';
}

export function destroyDisplayObject(obj) {
  if (!obj) return;
  try {
    if (obj.parent) obj.parent.removeChild(obj);
  } catch (_) {}
  try {
    obj.destroy?.({ children: true });
  } catch (_) {}
}

/**
 * Delete cached PIXI display objects that match prefix.
 * @param {Map<string, any>} cacheMap
 * @param {string} prefix
 */
export function cleanupCacheByPrefix(cacheMap, prefix) {
  if (!cacheMap) return;
  for (const [key, obj] of cacheMap) {
    if (key.startsWith(prefix)) {
      destroyDisplayObject(obj);
      cacheMap.delete(key);
    }
  }
}

