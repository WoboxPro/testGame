/**
 * 📷 CameraController - Контроллер для управления камерой
 *
 * Поддерживает:
 * - Движение камеры (влево/вправо/вверх/вниз)
 * - Зум (приближение/отдаление)
 * - Переключение активной камеры
 * - Первичные и вторичные клавиши для каждого действия
 */

import { Controller } from './Controller.js';

export class CameraController extends Controller {
  constructor(options = {}) {
    super({
      ...options,
      type: 'camera'
    });

    // Скорость движения камеры (единиц в секунду)
    this.moveSpeed = options.moveSpeed !== undefined ? options.moveSpeed : 500;

    // Скорость зума (единиц в секунду)
    this.zoomSpeed = options.zoomSpeed !== undefined ? options.zoomSpeed : 2;

    // Минимальный и максимальный зум
    this.minZoom = options.minZoom !== undefined ? options.minZoom : 0.1;
    this.maxZoom = options.maxZoom !== undefined ? options.maxZoom : 5;

    // Привязка клавиш
    this.bindings = options.bindings || this._getDefaultBindings();

    // Состояние нажатых клавиш
    this._pressedKeys = new Set();

    // Ссылка на все камеры (для переключения)
    this.allCameras = options.allCameras || [];

    console.log(`📷 CameraController создан: ${this.id}`);
  }

  /**
   * Действия контроллера
   */
  static ACTIONS = {
    MOVE_UP: 'move_up',
    MOVE_DOWN: 'move_down',
    MOVE_LEFT: 'move_left',
    MOVE_RIGHT: 'move_right',
    ZOOM_IN: 'zoom_in',
    ZOOM_OUT: 'zoom_out',
    SWITCH_CAMERA: 'switch_target'
  };

  _getDefaultBindings() {
    return {
      move_up: {
        primary: 'Numpad5',
        secondary: null
      },
      move_down: {
        primary: 'Numpad2',
        secondary: null
      },
      move_left: {
        primary: 'Numpad1',
        secondary: null
      },
      move_right: {
        primary: 'Numpad3',
        secondary: null
      },
      zoom_in: {
        primary: 'NumpadAdd',         // NumPad +
        secondary: null
      },
      zoom_out: {
        primary: 'NumpadSubtract',    // NumPad -
        secondary: null
      },
      switch_target: {
        primary: 'Numpad0',
        secondary: null
      }
    };
  }

  /**
   * Установить привязку для действия
   */
  setBinding(action, primary, secondary = null) {
    if (!this.bindings[action]) {
      console.warn(`⚠️ Unknown action: ${action}`);
      return;
    }
    this.bindings[action].primary = primary;
    this.bindings[action].secondary = secondary;
  }

  /**
   * Получить привязку для действия
   */
  getBinding(action) {
    return this.bindings[action];
  }

  /**
   * Проверить нажата ли клавиша действия
   */
  isActionActive(action) {
    const binding = this.bindings[action];
    if (!binding) return false;

    if (binding.primary && this._pressedKeys.has(binding.primary)) return true;
    if (binding.secondary && this._pressedKeys.has(binding.secondary)) return true;

    return false;
  }

  /**
   * Обработать нажатие клавиши
   */
  handleKeyDown(code) {
    this._pressedKeys.add(code);

    // Переключение камеры - одиночное нажатие
    if (this.isActionActive(CameraController.ACTIONS.SWITCH_CAMERA)) {
      this._switchCamera();
      this._pressedKeys.delete(code); // Сразу сбрасываем чтобы не переключало каждый кадр
    }
  }

  /**
   * Обработать отпускание клавиши
   */
  handleKeyUp(code) {
    this._pressedKeys.delete(code);
  }

  /**
   * Переключить на следующую камеру
   */
  _switchCamera() {
    if (!this.allCameras || this.allCameras.length === 0) return;

    const currentIndex = this.allCameras.findIndex(c => c === this.target);
    const nextIndex = (currentIndex + 1) % this.allCameras.length;
    const nextCamera = this.allCameras[nextIndex];

    if (nextCamera && nextCamera !== this.target) {
      // Переключаем цель
      const oldTarget = this.target;
      this.attachTo(nextCamera);

      console.log(`📷 Переключение камеры: ${oldTarget?.id} -> ${nextCamera.id}`);

      // Callback для уведомления о переключении
      if (this.onCameraSwitched) {
        this.onCameraSwitched(nextCamera);
      }
    }
  }

  /**
   * Установить список всех камер для переключения
   */
  setAllCameras(cameras) {
    this.allCameras = cameras;
  }

  /**
   * Обновление контроллера (вызывается каждый кадр)
   */
  update(dt) {
    if (!this.enabled || !this.target) return;

    const cam = this.target;
    const moveAmount = this.moveSpeed * dt;
    const zoomAmount = this.zoomSpeed * dt;

    let moved = false;
    let zoomed = false;

    // Движение вверх
    if (this.isActionActive(CameraController.ACTIONS.MOVE_UP)) {
      cam.focusY -= moveAmount;
      moved = true;
    }

    // Движение вниз
    if (this.isActionActive(CameraController.ACTIONS.MOVE_DOWN)) {
      cam.focusY += moveAmount;
      moved = true;
    }

    // Движение влево
    if (this.isActionActive(CameraController.ACTIONS.MOVE_LEFT)) {
      cam.focusX -= moveAmount;
      moved = true;
    }

    // Движение вправо
    if (this.isActionActive(CameraController.ACTIONS.MOVE_RIGHT)) {
      cam.focusX += moveAmount;
      moved = true;
    }

    // Зум +
    if (this.isActionActive(CameraController.ACTIONS.ZOOM_IN)) {
      cam.setZoom(cam.zoom + zoomAmount);
      zoomed = true;
    }

    // Зум -
    if (this.isActionActive(CameraController.ACTIONS.ZOOM_OUT)) {
      cam.setZoom(cam.zoom - zoomAmount);
      zoomed = true;
    }

    if (moved && this.onCameraMoved) {
      this.onCameraMoved(cam);
    }

    if (zoomed && this.onCameraZoomed) {
      this.onCameraZoomed(cam);
    }
  }

  /**
   * Callback при переключении камеры
   */
  onCameraSwitched(newCamera) {
    // Override для обработки переключения
  }

  /**
   * Callback при движении камеры
   */
  onCameraMoved(camera) {
    // Override для обработки движения
  }

  /**
   * Callback при зуме камеры
   */
  onCameraZoomed(camera) {
    // Override для обработки зума
  }

  getInfo() {
    return {
      ...super.getInfo(),
      moveSpeed: this.moveSpeed,
      zoomSpeed: this.zoomSpeed,
      minZoom: this.minZoom,
      maxZoom: this.maxZoom,
      bindings: this.bindings,
      activeCameraId: this.target?.id
    };
  }
}
