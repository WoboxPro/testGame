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
    graphics.entityType = 'player'; // Уникальный идентификатор для игрока
    // Рисуем треугольник, уменьшенный в 2 раза
    graphics.poly([0, -25, 50, 0, 0, 25]).fill(0xde3249);
    // Ставим опорную точку в центр основания
    graphics.pivot.set(25, 0);
    graphics.position.set(400, 300);
    app.stage.addChild(graphics);
    // --- Конец создания треугольника ---

    // --- Второй квадрат (белый) ---
    const graphics2 = new PIXI.Graphics();
    graphics2.entityType = 'box'; // Идентификатор для объекта
    graphics2.rect(0, 0, 40, 40).fill(0xffffff);
    graphics2.pivot.set(20, 20);
    graphics2.position.set(200, 250);
    app.stage.addChild(graphics2);
    // --- Конец второго квадрата ---

    // --- Система коллизий ---
    const obstacles = [graphics2]; // Список всех препятствий

    // Функция проверки столкновения.
    // Мы будем проверять столкновение "хитбокса" игрока с границами препятствия.
    function checkAABBCollision(player, obstacle) {
      const boundsObstacle = obstacle.getBounds();
      const boundsPlayer = player.getBounds();

      // Создаем "хитбокс" для игрока, который немного меньше его реальных границ.
      // Это нужно, потому что getBounds() создает большой прямоугольник вокруг повернутой фигуры.
      // Уменьшая его, мы делаем коллизию более точной к видимой части треугольника.
      const inset = 10; // << Поэкспериментируйте с этим значением, чтобы добиться нужного эффекта
      const playerHitbox = new PIXI.Rectangle(
        boundsPlayer.x + inset,
        boundsPlayer.y + inset,
        boundsPlayer.width - inset * 2,
        boundsPlayer.height - inset * 2
      );

      // Предотвращаем отрицательные размеры хитбокса, если inset слишком большой
      if (playerHitbox.width < 0) playerHitbox.width = 0;
      if (playerHitbox.height < 0) playerHitbox.height = 0;

      return playerHitbox.x < boundsObstacle.x + boundsObstacle.width &&
             playerHitbox.x + playerHitbox.width > boundsObstacle.x &&
             playerHitbox.y < boundsObstacle.y + boundsObstacle.height &&
             playerHitbox.y + playerHitbox.height > boundsObstacle.y;
    }
    // --- Конец системы коллизий ---

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

      // Сохраняем старую позицию перед движением
      const oldPosition = { x: graphics.x, y: graphics.y };

      // Применяем движение к координатам
      graphics.x += movement.x * speed * ticker.deltaTime;
      graphics.y += movement.y * speed * ticker.deltaTime;

      // --- Проверка коллизий ---
      for (const obstacle of obstacles) {
        if (obstacle.entityType !== graphics.entityType && checkAABBCollision(graphics, obstacle)) {
          // При столкновении, возвращаем на предыдущую позицию
          graphics.x = oldPosition.x;
          graphics.y = oldPosition.y;
          break; // Выходим из цикла, так как коллизия уже обработана
        }
      }
      // --- Конец проверки коллизий ---


      // --- Проверка границ для красного треугольника ---
      // Размеры "полусторон" от точки pivot (25, 0)
      const boundLeft = 25;
      const boundRight = 25;
      const boundTop = 25;
      const boundBottom = 25;

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
