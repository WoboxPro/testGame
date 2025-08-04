<template>
  <div ref="pixiContainer"></div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import * as PIXI from 'pixi.js';

const pixiContainer = ref(null);

onMounted(async () => {
  if (process.client && pixiContainer.value) {
    const app = new PIXI.Application();
    await app.init({
      width: 800,
      height: 600,
      background: 0x1099bb,
    });
    pixiContainer.value.appendChild(app.canvas);

    const graphics = new PIXI.Graphics();
    graphics.rect(0, 0, 100, 100).fill(0xde3249);
    graphics.pivot.set(50, 50);
    graphics.position.set(400, 300);
    app.stage.addChild(graphics);

    // --- Второй квадрат (синий) ---
    const graphics2 = new PIXI.Graphics();
    graphics2.rect(0, 0, 80, 80).fill(0xffffff); // Синий цвет и размер 80x80
    graphics2.pivot.set(40, 40); // Центр для квадрата 80x80
    graphics2.position.set(200, 250); // Другая позиция
    app.stage.addChild(graphics2);
    // --- Конец второго квадрата ---

    app.ticker.add((ticker) => {
      graphics.rotation += 0.01 * ticker.deltaTime;
      graphics2.rotation -= 0.015 * ticker.deltaTime; // Вращаем в другую сторону и чуть быстрее
    });

    onUnmounted(() => {
      app.destroy(true, true);
    });
  }
});
</script>
