// ============================================================================
//  input.js — InputManager
//  Unifies tap (touch), mouse click, and keyboard (space / up arrow) into a
//  single "primary action" callback. Also exposes a separate pause hook.
// ============================================================================

export class InputManager {
  constructor(targetEl) {
    this.target = targetEl || window;
    this._onAction = () => {};
    this._bound = false;
  }

  onAction(cb) {
    this._onAction = cb;
  }

  _fire(e) {
    // Ignore clicks that originate on real UI buttons (they handle themselves).
    if (e && e.target && e.target.closest && e.target.closest('[data-ui-button]')) return;
    if (e && e.cancelable) e.preventDefault();
    this._onAction();
  }

  start() {
    if (this._bound) return;
    this._bound = true;

    this._keyHandler = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === ' ') {
        e.preventDefault();
        this._onAction();
      }
    };
    this._pointerHandler = (e) => this._fire(e);
    this._touchHandler = (e) => this._fire(e);

    window.addEventListener('keydown', this._keyHandler, { passive: false });
    this.target.addEventListener('mousedown', this._pointerHandler);
    this.target.addEventListener('touchstart', this._touchHandler, { passive: false });
  }

  stop() {
    if (!this._bound) return;
    window.removeEventListener('keydown', this._keyHandler);
    this.target.removeEventListener('mousedown', this._pointerHandler);
    this.target.removeEventListener('touchstart', this._touchHandler);
    this._bound = false;
  }
}
