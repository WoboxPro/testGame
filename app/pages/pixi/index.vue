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

    // --- Создание красного треугольника ---
    const graphics = new PIXI.Graphics();
    // Рисуем треугольник по координатам вершин [x1, y1, x2, y2, x3, y3]
    // Получается фигура, вытянутая вправо
    graphics.poly([0, -50, 100, 0, 0, 50]).fill(0xde3249);
    // Ставим опорную точку в центр основания для интуитивного управления
    graphics.pivot.set(50, 0);
    graphics.position.set(400, 300);
    app.stage.addChild(graphics);
    // --- Конец создания треугольника ---

    // --- Второй квадрат (синий) ---
    const graphics2 = new PIXI.Graphics();
    graphics2.rect(0, 0, 80, 80).fill(0xffffff); // Синий цвет и размер 80x80
    graphics2.pivot.set(40, 40); // Центр для квадрата 80x80
    graphics2.position.set(200, 250); // Другая позиция
    app.stage.addChild(graphics2);
    // --- Конец второго квадрата ---

    // --- Управление клавиатурой для красного треугольника ---
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

    // --- Логика поворота и движения ---
    let targetRotation = 0;
    const rotationSpeed = 0.1; // Плавность поворота (0.1 = 10% от разницы за кадр)

    app.ticker.add((ticker) => {
      const movement = { x: 0, y: 0 };

      // Определяем направление движения по нажатым клавишам
      if (keys['ArrowUp'])    movement.y = -1;
      if (keys['ArrowDown'])  movement.y = 1;
      if (keys['ArrowLeft'])  movement.x = -1;
      if (keys['ArrowRight']) movement.x = 1;

      // Если есть движение, вычисляем целевой угол
      if (movement.x !== 0 || movement.y !== 0) {
        targetRotation = Math.atan2(movement.y, movement.x);
      }

      // Плавно поворачиваем треугольник к целевому углу
      let delta = targetRotation - graphics.rotation;
      // Эта магия нужна, чтобы поворот всегда шел по кратчайшему пути
      if (delta > Math.PI) delta -= 2 * Math.PI;
      if (delta < -Math.PI) delta += 2 * Math.PI;
      graphics.rotation += delta * rotationSpeed;

      // Применяем движение к координатам
      // Умножаем на speed и deltaTime для консистентной скорости
      graphics.x += movement.x * speed * ticker.deltaTime;
      graphics.y += movement.y * speed * ticker.deltaTime;

      // --- Проверка границ для красного треугольника ---
      // Размеры "полусторон" от точки pivot (50, 0)
      const boundLeft = 50;   // Расстояние от pivot до левого края (вершины 0, -50 и 0, 50)
      const boundRight = 50;  // Расстояние от pivot до правого края (вершина 100, 0)
      const boundTop = 50;    // Расстояние от pivot до верхней вершины (0, -50)
      const boundBottom = 50; // Расстояние от pivot до нижней вершины (0, 50)

      graphics.x = Math.max(boundLeft, Math.min(graphics.x, app.screen.width - boundRight));
      graphics.y = Math.max(boundTop, Math.min(graphics.y, app.screen.height - boundBottom));
      // --- Конец проверки границ ---

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
