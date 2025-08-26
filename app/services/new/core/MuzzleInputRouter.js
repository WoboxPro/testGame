export class MuzzleInputRouter {
  constructor({ target = (typeof window !== 'undefined' ? window : null), preventContextMenu = true } = {}) {
    this.target = target;
    this.preventContextMenu = preventContextMenu;
    this.mouseBindings = { LMB: new Set(), MMB: new Set(), RMB: new Set() };
    this.keyBindings = new Map(); // code -> Set
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onContextMenu = this._onContextMenu.bind(this);
    this._attached = false;
  }

  attach() {
    if (!this.target || this._attached) return;
    this.target.addEventListener('mousedown', this._onMouseDown);
    this.target.addEventListener('mouseup', this._onMouseUp);
    this.target.addEventListener('keydown', this._onKeyDown);
    this.target.addEventListener('keyup', this._onKeyUp);
    if (this.preventContextMenu) this.target.addEventListener('contextmenu', this._onContextMenu);
    this._attached = true;
  }

  detach() {
    if (!this.target || !this._attached) return;
    this.target.removeEventListener('mousedown', this._onMouseDown);
    this.target.removeEventListener('mouseup', this._onMouseUp);
    this.target.removeEventListener('keydown', this._onKeyDown);
    this.target.removeEventListener('keyup', this._onKeyUp);
    if (this.preventContextMenu) this.target.removeEventListener('contextmenu', this._onContextMenu);
    this._attached = false;
  }

  registerController(controller, binding = {}) {
    if (!controller || !binding) return;
    // stop any auto when binding is controlled externally
    if (controller.stopAuto) controller.stopAuto();
    if (binding.mouse && this.mouseBindings[binding.mouse]) {
      this.mouseBindings[binding.mouse].add(controller);
    }
    if (binding.keys) {
      const keys = Array.isArray(binding.keys) ? binding.keys : [binding.keys];
      for (const code of keys) {
        if (!this.keyBindings.has(code)) this.keyBindings.set(code, new Set());
        this.keyBindings.get(code).add(controller);
      }
    }
  }

  registerFromSlot(weaponEntity, slotName, controller) {
    const slot = weaponEntity?.slots?.[slotName];
    const bind = slot?.input;
    if (!bind) return;
    this.registerController(controller, bind);
  }

  _onContextMenu(e) { e.preventDefault(); }

  _onMouseDown(e) {
    const key = e.button === 0 ? 'LMB' : e.button === 1 ? 'MMB' : e.button === 2 ? 'RMB' : null;
    if (!key) return;
    const set = this.mouseBindings[key];
    if (!set || set.size === 0) return;
    for (const ctrl of set) ctrl?.startAuto?.();
  }

  _onMouseUp(e) {
    const key = e.button === 0 ? 'LMB' : e.button === 1 ? 'MMB' : e.button === 2 ? 'RMB' : null;
    if (!key) return;
    const set = this.mouseBindings[key];
    if (!set || set.size === 0) return;
    for (const ctrl of set) ctrl?.stopAuto?.();
  }

  _onKeyDown(e) {
    const set = this.keyBindings.get(e.code);
    if (!set || set.size === 0) return;
    for (const ctrl of set) ctrl?.startAuto?.();
  }

  _onKeyUp(e) {
    const set = this.keyBindings.get(e.code);
    if (!set || set.size === 0) return;
    for (const ctrl of set) ctrl?.stopAuto?.();
  }
}


