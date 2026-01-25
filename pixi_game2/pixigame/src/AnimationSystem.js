/**
 * 🎬 AnimationSystem - Система управления анимациями сущностей
 *
 * Управляет загрузкой sprite sheets и обновлением анимаций.
 * Интегрируется с TimeSystem для глобального управления скоростью.
 */

import * as PIXI from 'pixi.js';

export class AnimationSystem {
  constructor(world) {
    this.world = world;
    this._spritesheets = new Map(); // url -> { texture, frames, animations, loaded }
  }

  /**
   * Загрузить sprite sheet из JSON файла
   * @param {string} url - путь к JSON файлу (относительно public)
   * @returns {Promise<Object>} - загруженные данные sprite sheet
   */
  async loadSpritesheet(url) {
    if (this._spritesheets.has(url)) {
      return this._spritesheets.get(url);
    }

    try {
      // Загружаем JSON
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load spritesheet JSON: ${url}`);
      }

      const data = await response.json();

      // Если указан baseSpritesheet - загружаем frames из него
      let framesData = data.frames;
      let textureMeta = data.meta;

      if (data.baseSpritesheet) {
        const baseUrl = url.substring(0, url.lastIndexOf('/'));
        const basePath = `${baseUrl}/${data.baseSpritesheet}`;

        console.log(`📦 Loading base spritesheet: ${basePath}`);
        const baseResponse = await fetch(basePath);
        if (!baseResponse.ok) {
          throw new Error(`Failed to load base spritesheet: ${basePath}`);
        }

        const baseData = await baseResponse.json();
        framesData = baseData.frames;
        textureMeta = baseData.meta;

        console.log(`✅ Base spritesheet loaded: ${Object.keys(framesData).length} frames`);
      }

      // Получаем путь к картинке из meta
      const imagePath = textureMeta?.image || url.replace('.json', '.png');
      // Формируем полный путь (убираем имя файла JSON и добавляем картинку)
      const baseUrl = url.substring(0, url.lastIndexOf('/'));
      const fullImagePath = `${baseUrl}/${imagePath}`;

      // Загружаем текстуру через Assets (она кешируется)
      const texture = await PIXI.Assets.load(fullImagePath);

      // Создаем текстуры для каждого кадра
      const frames = {};
      for (const [frameName, frameData] of Object.entries(framesData || {})) {
        const { x, y, w, h } = frameData.frame;
        const frameTexture = new PIXI.Texture({
          source: texture.source,
          frame: new PIXI.Rectangle(x, y, w, h)
        });
        frames[frameName] = frameTexture;
      }

      const spritesheet = {
        url,
        texture,
        frames,
        animations: data.animations || {},
        loaded: true
      };

      this._spritesheets.set(url, spritesheet);
      console.log(`🎬 Spritesheet загружен: ${url} (${Object.keys(frames).length} frames, ${Object.keys(spritesheet.animations).length} animations)`);

      return spritesheet;
    } catch (error) {
      console.error(`❌ Ошибка загрузки spritesheet: ${url}`, error);
      return null;
    }
  }

  /**
   * Получить sprite sheet по URL
   */
  getSpritesheet(url) {
    return this._spritesheets.get(url);
  }

  /**
   * Проверить, загружен ли sprite sheet
   */
  isLoaded(url) {
    const sheet = this._spritesheets.get(url);
    return sheet && sheet.loaded;
  }

  /**
   * Получить текстуру конкретного кадра
   */
  getFrameTexture(url, frameName) {
    const sheet = this._spritesheets.get(url);
    if (!sheet) return null;
    return sheet.frames[frameName];
  }

  /**
   * Получить все кадры для анимации по состоянию
   */
  getAnimationFrames(url, stateName) {
    const sheet = this._spritesheets.get(url);
    if (!sheet) return [];

    const animation = sheet.animations[stateName];
    if (!animation || !animation.frames) return [];

    return animation.frames.map(frameName => sheet.frames[frameName]);
  }

  /**
   * Получить конфигурацию анимации по состоянию
   */
  getAnimationConfig(url, stateName) {
    const sheet = this._spritesheets.get(url);
    if (!sheet) return null;

    return sheet.animations[stateName] || null;
  }

  /**
   * Предзагрузить sprite sheet (можно вызвать заранее)
   */
  async preloadSpritesheet(url) {
    return await this.loadSpritesheet(url);
  }

  /**
   * Удалить sprite sheet из кеша
   */
  unloadSpritesheet(url) {
    const sheet = this._spritesheets.get(url);
    if (sheet) {
      // Очищаем только кадры, не уничтожая базовый source
      // так как это Texture который может быть переиспользован
      for (const texture of Object.values(sheet.frames)) {
        texture.destroy(false);
      }
      this._spritesheets.delete(url);
      console.log(`🗑️ Spritesheet выгружен: ${url}`);
    }
  }

  /**
   * Очистить все загруженные sprite sheets
   */
  clearAll() {
    for (const url of this._spritesheets.keys()) {
      this.unloadSpritesheet(url);
    }
  }

  /**
   * Обновить анимации всех сущностей
   * @param {number} dt - delta time в миллисекундах
   */
  update(dt) {
    for (const [entityId, components] of this.world.entities) {
      const animations = components.get('animations');
      const position = components.get('position');

      if (!animations || !animations.enabled || !animations.spritesheetUrl) {
        continue;
      }

      // Автоматическая загрузка spritesheet если еще не загружен
      if (!this.isLoaded(animations.spritesheetUrl)) {
        this.loadSpritesheet(animations.spritesheetUrl).catch(err => {
          console.warn(`Failed to load spritesheet: ${animations.spritesheetUrl}`, err);
        });
        continue;
      }

      // Получаем конфигурацию текущего состояния
      const config = this.getAnimationConfig(
        animations.spritesheetUrl,
        animations.currentState
      );

      if (!config) {
        continue;
      }

      // Обновляем таймер кадра
      this._updateFrameTimer(animations, config, dt);

       // Обрабатываем события
       this._handleAnimationEvents(animations, config);

       // Устанавливаем nextState из конфигурации если не задан
       if (!animations.nextState && config.nextState) {
         animations.nextState = config.nextState;
       }

       // Устанавливаем nextState из конфигурации defaultState при первом запуске
       if (!animations.nextState && animations.currentState === animations.defaultState) {
         const defaultConfig = this.getAnimationConfig(
           animations.spritesheetUrl,
           animations.defaultState
         );
         if (defaultConfig && defaultConfig.nextState) {
           animations.nextState = defaultConfig.nextState;
         }
       }
     }
   }

  /**
   * Обновить таймер кадра
   */
  _updateFrameTimer(animations, config, dt) {
    if (animations.paused) {
      return;
    }

    // Получаем глобальный timeScale из TimeSystem
    // Примечание: TimeSystem должен быть доступен как глобальный импорт
    let globalTimeScale = 1.0;
    try {
      globalTimeScale = window.timeSystem?.getTimeScale() || 1.0;
    } catch (e) {}

    // Применяем множители
    const speedMultiplier = animations.speedMultiplier || 1.0;
    const adjustedDt = dt * globalTimeScale * speedMultiplier;

    animations.frameTimer += adjustedDt;

    // Длительность одного кадра в миллисекундах
    const frameDuration = 1000 / (config.fps || 10);

    // Переключаем кадры
    if (animations.frameTimer >= frameDuration) {
      animations.frameTimer -= frameDuration;
      const frames = config.frames || [];
      const previousFrame = animations.currentFrameIndex;

      if (config.loop) {
        // Looping animation
        animations.currentFrameIndex = (animations.currentFrameIndex + 1) % frames.length;
      } else {
        // Non-looping animation
        if (animations.currentFrameIndex < frames.length - 1) {
          animations.currentFrameIndex++;
        } else {
          // Анимация завершена
          if (!animations.completed) {
            animations.completed = true;
          }
        }
      }

      // onUpdate событие для каждого кадра
      this._triggerEvent(animations, 'onUpdate', {
        previousFrame,
        currentFrame: animations.currentFrameIndex,
        frameName: frames[animations.currentFrameIndex]
      });
    }
  }

  /**
   * Обработать события анимации
   */
  _handleAnimationEvents(animations, config) {
    const frames = config.frames || [];

    // Проверяем onStart (при первой смене кадра)
    if (animations.currentFrameIndex === 0 && !animations.started) {
      animations.started = true;
      this._triggerEvent(animations, 'onStart', { state: animations.currentState });
    }

    // Проверяем onComplete для looping анимаций (каждый цикл)
    if (config.loop && animations.currentFrameIndex === 0 && animations.started) {
      if (animations.loopCount > 0) {
        this._triggerEvent(animations, 'onComplete', { state: animations.currentState, loopCount: animations.loopCount });
        animations.loopCount++;
      }
    }

    // Проверяем onComplete для non-looping анимаций (один раз)
    if (!config.loop && animations.completed && !animations.onCompleteTriggered) {
      animations.onCompleteTriggered = true;
      this._triggerEvent(animations, 'onComplete', { state: animations.currentState });

      // Авто-переход на следующее состояние если указано
      if (animations.nextState) {
        this._switchToNextState(animations);
      }
    }
  }

  /**
   * Переключиться на следующее состояние
   */
  _switchToNextState(animations) {
    const nextState = animations.nextState;
    if (nextState && nextState !== animations.currentState) {
      this._triggerEvent(animations, 'onStateChange', { from: animations.currentState, to: nextState });
      animations.currentState = nextState;
      animations.currentFrameIndex = 0;
      animations.frameTimer = 0;
      animations.started = false;
      animations.completed = false;
      animations.onCompleteTriggered = false;
      animations.loopCount = 0;
    }
  }

  /**
   * Вызвать событие анимации
   */
  _triggerEvent(animations, eventType, data = {}) {
    const events = animations.events || {};
    const stateEvents = events[animations.currentState] || {};
    const callback = stateEvents[eventType];

    if (typeof callback === 'function') {
      try {
        callback(data);
      } catch (error) {
        console.error(`Animation event error: ${eventType}`, error);
      }
    }
  }

  /**
   * Получить информацию о системе
   */
  getInfo() {
    return {
      loadedSpritesheets: Array.from(this._spritesheets.keys()),
      count: this._spritesheets.size
    };
  }
}
