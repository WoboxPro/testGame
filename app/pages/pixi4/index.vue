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
    graphics2.isAlive = true; // Флаг, показывающий, активен ли объект
    graphics2.rect(0, 0, 40, 40).fill(0xffffff);
    graphics2.pivot.set(20, 20);
    graphics2.position.set(200, 250);
    app.stage.addChild(graphics2);
    // --- Конец второго квадрата ---

    // --- Система коллизий ---
    const obstacles = [graphics2];
    const respawnDelay = 2000;

    function respawn(obj) {
      obj.isAlive = false;
      obj.visible = false;
      setTimeout(() => {
        const margin = 50;
        obj.x = Math.random() * (app.screen.width - margin * 2) + margin;
        obj.y = Math.random() * (app.screen.height - margin * 2) + margin;
        obj.isAlive = true;
        obj.visible = true;
      }, respawnDelay);
    }

    // Проверка столкновения игрока с препятствием (AABB)
    function checkPlayerObstacleCollision(player, obstacle) {
      const boundsObstacle = obstacle.getBounds();
      const boundsPlayer = player.getBounds();
      const inset = 10;
      const playerHitbox = new PIXI.Rectangle(
        boundsPlayer.x + inset,
        boundsPlayer.y + inset,
        boundsPlayer.width - inset * 2,
        boundsPlayer.height - inset * 2
      );
      if (playerHitbox.width < 0) playerHitbox.width = 0;
      if (playerHitbox.height < 0) playerHitbox.height = 0;
      return playerHitbox.x < boundsObstacle.x + boundsObstacle.width &&
             playerHitbox.x + playerHitbox.width > boundsObstacle.x &&
             playerHitbox.y < boundsObstacle.y + boundsObstacle.height &&
             playerHitbox.y + playerHitbox.height > boundsObstacle.y;
    }

    // Проверка столкновения снаряда с препятствием (круги)
    function checkBulletObstacleCollision(bullet, obstacle) {
      const dx = bullet.x - obstacle.x;
      const dy = bullet.y - obstacle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const bulletRadius = 4;
      const obstacleRadius = 20; // Упрощенный "хитбокс" квадрата
      return distance < bulletRadius + obstacleRadius;
    }
    // --- Конец системы коллизий ---

    // --- Управление и состояние игры ---
    const keys = {};
    const speed = 5;
    const mousePosition = { x: 400, y: 300 };
    const bullets = [];
    
    // --- Настройки оружия ---
    const weaponConfig = {
      bulletSpeed: 10,        // Скорость полета снаряда
      penetration: 2,         // Сколько целей может пробить снаряд
      maxRange: 400,          // Максимальная дальность полета
      fireRate: 200,          // Задержка между выстрелами в мс (меньше = быстрее)
      autoFire: true          // true = автоматическая стрельба, false = по клику
    };
    
    // --- Состояние стрельбы ---
    let isMouseDown = false;
    let lastFireTime = 0;

    // Слушатели для клавиатуры
    const onKeyDown = (e) => { keys[e.code] = true; };
    const onKeyUp = (e) => { keys[e.code] = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Функция создания снаряда
    function createBullet() {
      const currentTime = Date.now();
      if (currentTime - lastFireTime < weaponConfig.fireRate) return; // Проверка скорострельности
      
      const bullet = new PIXI.Graphics();
      bullet.entityType = 'bullet';
      const angle = Math.atan2(mousePosition.y - graphics.y, mousePosition.x - graphics.x);
      bullet.vx = Math.cos(angle) * weaponConfig.bulletSpeed;
      bullet.vy = Math.sin(angle) * weaponConfig.bulletSpeed;
      
      // Свойства снаряда
      bullet.penetrationLeft = weaponConfig.penetration; // Сколько целей еще может пробить
      bullet.distanceTraveled = 0; // Пройденное расстояние
      bullet.startX = graphics.x; // Начальная позиция для расчета дальности
      bullet.startY = graphics.y;
      
      bullet.circle(0, 0, 4).fill(0xffff00);
      bullet.position.set(graphics.x, graphics.y);
      bullets.push(bullet);
      app.stage.addChild(bullet);
      
      lastFireTime = currentTime;
    }

    // Слушатели для мыши
    app.stage.interactive = true;
    app.stage.hitArea = app.screen;
    app.stage.on('pointermove', (event) => {
      mousePosition.x = event.global.x;
      mousePosition.y = event.global.y;
    });
    
    // Обработка нажатия мыши
    app.stage.on('pointerdown', () => {
      isMouseDown = true;
      if (!weaponConfig.autoFire) {
        createBullet(); // Для одиночной стрельбы стреляем сразу
      }
    });
    
    // Обработка отпускания мыши
    app.stage.on('pointerup', () => {
      isMouseDown = false;
    });
    
    // Обработка выхода курсора за пределы canvas
    app.stage.on('pointerupoutside', () => {
      isMouseDown = false;
    });
    // --- Конец блока управления ---

    // --- Логика игры в каждом кадре ---
    const rotationSpeed = 0.1;

    app.ticker.add((ticker) => {
      // --- Логика игрока ---
      const targetRotation = Math.atan2(mousePosition.y - graphics.y, mousePosition.x - graphics.x);
      let delta = targetRotation - graphics.rotation;
      if (delta > Math.PI) delta -= 2 * Math.PI;
      if (delta < -Math.PI) delta += 2 * Math.PI;
      graphics.rotation += delta * rotationSpeed;
      const movement = { x: 0, y: 0 };
      if (keys['ArrowUp'])    movement.y = -1;
      if (keys['ArrowDown'])  movement.y = 1;
      if (keys['ArrowLeft'])  movement.x = -1;
      if (keys['ArrowRight']) movement.x = 1;
      graphics.x += movement.x * speed * ticker.deltaTime;
      graphics.y += movement.y * speed * ticker.deltaTime;

      // --- Автоматическая стрельба ---
      if (weaponConfig.autoFire && isMouseDown) {
        createBullet();
      }

      // --- Логика снарядов и их коллизий ---
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        const oldX = b.x;
        const oldY = b.y;
        
        b.x += b.vx * ticker.deltaTime;
        b.y += b.vy * ticker.deltaTime;
        
        // Обновляем пройденное расстояние
        const dx = b.x - oldX;
        const dy = b.y - oldY;
        b.distanceTraveled += Math.sqrt(dx * dx + dy * dy);

        let shouldRemove = false;
        
        // Проверяем дальность полета
        if (b.distanceTraveled > weaponConfig.maxRange) {
          shouldRemove = true;
        }
        
        // Проверяем выход за границы экрана
        if (b.x < -10 || b.x > app.screen.width + 10 || b.y < -10 || b.y > app.screen.height + 10) {
          shouldRemove = true;
        }
        
        // Проверяем попадания в цели
        for (const obstacle of obstacles) {
          if (obstacle.isAlive && b.penetrationLeft > 0 && checkBulletObstacleCollision(b, obstacle)) {
            respawn(obstacle);
            b.penetrationLeft--; // Уменьшаем пробитие
            
            // Если пробитие закончилось, снаряд исчезает
            if (b.penetrationLeft <= 0) {
              shouldRemove = true;
            }
            break; // Обрабатываем только одно попадание за кадр
          }
        }

        // Удаляем снаряд если нужно
        if (shouldRemove) {
          app.stage.removeChild(b);
          b.destroy();
          bullets.splice(i, 1);
        }
      }

      // --- Проверка коллизий игрока с коробками ---
      for (const obstacle of obstacles) {
        if (obstacle.isAlive && obstacle.entityType === 'box' && checkPlayerObstacleCollision(graphics, obstacle)) {
          respawn(obstacle);
        }
      }
      
      // --- Проверка границ для игрока ---
      const boundLeft = 25, boundRight = 25, boundTop = 25, boundBottom = 25;
      graphics.x = Math.max(boundLeft, Math.min(graphics.x, app.screen.width - boundRight));
      graphics.y = Math.max(boundTop, Math.min(graphics.y, app.screen.height - boundBottom));
      
      // --- Логика других объектов ---
      if (graphics2.isAlive) {
        graphics2.rotation -= 0.015 * ticker.deltaTime;
      }
    });

    onUnmounted(() => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      app.destroy(true, true);
    });
  }
});
</script>
