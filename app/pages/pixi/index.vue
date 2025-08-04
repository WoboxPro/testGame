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

    // --- Управление клавиатурой для красного квадрата ---
    const keys = {};
    const speed = 5;

    const onKeyDown = (e) => {
      keys[e.code] = true;
    };
    const onKeyUp = (e) => {
      keys[e.code] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    // --- Конец блока управления ---

    app.ticker.add((ticker) => {
      // Движение красного квадрата
      if (keys['ArrowUp']) {
        graphics.y -= speed * ticker.deltaTime;
      }
      if (keys['ArrowDown']) {
        graphics.y += speed * ticker.deltaTime;
      }
      if (keys['ArrowLeft']) {
        graphics.x -= speed * ticker.deltaTime;
      }
      if (keys['ArrowRight']) {
        graphics.x += speed * ticker.deltaTime;
      }

      // Вращение белого квадрата (оставляем как было)
      graphics2.rotation -= 0.015 * ticker.deltaTime;
    });

    onUnmounted(() => {
      // Обязательно удаляем слушатели при размонтировании компонента
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      app.destroy(true, true);
    });
  }
});
</script>
