// Единый реестр эффектов. UI может оставаться прежним; движок будет
// использовать этот реестр, если эффект описан в новом формате
// { effectId, trigger, params } или в legacy-формате по имени.

import * as PIXI from 'pixi.js';
import { createExplosion } from "~/utils/effectHelpers.js";
import { checkExplosionCollision, dealDamage } from "~/utils/gameHelpers.js";
import { createFadeOutEffect } from "~/utils/pixiHelpers.js";

export const effectsRegistry = {
  explosion: {
    id: "explosion",
    displayName: "💥 Взрыв",
    icon: "💥",
    // Схема параметров (для будущего динамического UI)
    paramsSchema: {
      radius: { type: "number", min: 5, max: 300, step: 1, default: 50 },
      damage: { type: "number", min: 1, max: 50, step: 1, default: 3 },
      color: { type: "number", default: 0xff4444 },
    },
    handler: ({ app, engine, bullet, obstacles, respawnCallback, params }) => {
      const radius = params?.radius ?? 50;
      const damage = params?.damage ?? 3;
      const color = params?.color ?? 0xff4444;
      createExplosion(
        bullet.x,
        bullet.y,
        radius,
        damage,
        app,
        engine?.explosions ?? [],
        obstacles,
        respawnCallback,
        color
      );
    },
  },
  fire_puddle: {
    id: "fire_puddle",
    displayName: "🔥 Огненная лужа",
    icon: "🔥",
    paramsSchema: {
      radius: { type: "number", min: 10, max: 300, step: 1, default: 60 },
      durationMs: { type: "number", min: 200, max: 20000, step: 100, default: 3000 },
      damagePerTick: { type: "number", min: 1, max: 20, step: 1, default: 1 },
      tickMs: { type: "number", min: 50, max: 1000, step: 10, default: 200 },
      color: { type: "number", default: 0xff6600 },
    },
    handler: ({ app, engine, bullet, obstacles, respawnCallback, params }) => {
      const radius = params?.radius ?? 60;
      const durationMs = params?.durationMs ?? 3000;
      const damagePerTick = params?.damagePerTick ?? 1;
      const tickMs = params?.tickMs ?? 200;
      const color = params?.color ?? 0xff6600;

      const puddle = new PIXI.Graphics();
      puddle.circle(0, 0, radius).fill(color);
      puddle.alpha = 0.75;
      puddle.position.set(bullet.x, bullet.y);

      // Регистрируем визуал в массив эффектов, чтобы createFadeOutEffect мог его очистить
      const effectsArray = engine?.explosions ?? [];
      effectsArray.push(puddle);
      app.stage.addChild(puddle);

      let elapsed = 0;
      let tickAccum = 0;
      const tickHandler = (ticker) => {
        const dt = ticker?.elapsedMS || 16.67;
        elapsed += dt;
        tickAccum += dt;

        // Периодический урон
        if (tickAccum >= tickMs) {
          tickAccum = 0;
          for (const obstacle of obstacles) {
            if (obstacle.isAlive && checkExplosionCollision(puddle.x, puddle.y, radius, obstacle)) {
              dealDamage(obstacle, damagePerTick, respawnCallback);
            }
          }
        }

        // Небольшое пламя-мигание
        puddle.alpha = 0.65 + 0.15 * Math.sin(elapsed / 120);

        // Завершение по длительности
        if (elapsed >= durationMs) {
          app.ticker.remove(tickHandler);
          // Плавное исчезновение
          createFadeOutEffect(puddle, app, effectsArray, { alphaStep: 0.08, scaleStep: 0.02, delay: 0 });
        }
      };

      app.ticker.add(tickHandler);
    },
  },
};

export function getEffectById(effectId) {
  return effectsRegistry[effectId];
}

