// Touch input for a canvas whose program reads the mouse, as SDL programs do. One finger is the
// left mouse button: it orbits the camera, selects with a tap and works the program's panels. Two
// fingers pinch, which the program receives as the mouse wheel. The program sees no touch events,
// so no finger it would treat as a mouse is left pressed while two are down.

// SDL counts 100 wheel pixels as a step. Spreading the fingers to twice their distance is two steps
// toward the scene for rayrai's free camera (a metre each), as the wheel turned away from the user
// is; a camera orbiting a selected target moves as the wheel moves it, the other way.
const pixelsPerStep = 100;
const stepScale = Math.log(2) / 2;
// A finger presses the button once it moves this far (CSS pixels) or lifts, so that a second finger
// starting a pinch never clicks.
const tapSlop = 8;

export function mouseFromTouch(canvas, target = globalThis) {
  const fingers = new Map();
  let pressed = null, pending = null, pinch = null;
  const mouse = (type, point, buttons) => canvas.dispatchEvent(new MouseEvent(type, {
    bubbles: true, cancelable: true, view: target.window ?? null, clientX: point.x, clientY: point.y,
    screenX: point.screenX, screenY: point.screenY, button: 0, buttons}));
  const pair = () => {
    const [a, b] = fingers.values();
    return {distance: Math.hypot(a.x - b.x, a.y - b.y), point: {x: (a.x + b.x) / 2, y: (a.y + b.y) / 2,
      screenX: (a.screenX + b.screenX) / 2, screenY: (a.screenY + b.screenY) / 2}};
  };
  const release = () => {
    if (!pressed) return;
    mouse('mouseup', pressed, 0);
    pressed = null;
  };
  const handle = event => {
    if (event.target !== canvas) return;
    event.preventDefault();
    event.stopPropagation();
    for (const touch of event.changedTouches) {
      const point = {x: touch.clientX, y: touch.clientY, screenX: touch.screenX, screenY: touch.screenY};
      if (event.type === 'touchstart' || event.type === 'touchmove') fingers.set(touch.identifier, point);
      else fingers.delete(touch.identifier);
    }
    if (!fingers.size) {
      if (pending && event.type === 'touchend') {
        mouse('mousedown', pending, 1);
        pressed = pending;
      }
      pending = null;
      release();
      pinch = null;
    } else if (fingers.size === 1 && !pinch) {
      const [point] = fingers.values();
      if (!pressed && !pending && event.type === 'touchstart') {
        mouse('mousemove', point, 0);
        pending = point;
      } else if (pending && Math.hypot(point.x - pending.x, point.y - pending.y) >= tapSlop) {
        mouse('mousedown', pending, 1);
        mouse('mousemove', point, 1);
        pressed = point;
        pending = null;
      } else if (pressed && event.type === 'touchmove') {
        mouse('mousemove', point, 1);
        pressed = point;
      }
    } else if (fingers.size >= 2) {
      pending = null;
      release();
      const current = pair();
      if (!pinch) mouse('mousemove', current.point, 0);
      else if (current.distance > 0 && pinch.distance > 0 && current.distance !== pinch.distance) {
        const steps = Math.log(current.distance / pinch.distance) / stepScale;
        canvas.dispatchEvent(new WheelEvent('wheel', {bubbles: true, cancelable: true, deltaMode: 0,
          deltaY: -steps * pixelsPerStep, clientX: current.point.x, clientY: current.point.y}));
      }
      pinch = current;
    }
  };
  const options = {capture: true, passive: false};
  for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) target.addEventListener(type, handle, options);
  canvas.addEventListener('contextmenu', event => event.preventDefault());
  return () => {
    for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) target.removeEventListener(type, handle, options);
    release();
  };
}

// Phones report device pixel ratios of 3 and more; a backing store sized by them makes the GPU draw
// up to nine times the pixels a ratio of 1 does. SDL sizes the canvas by window.devicePixelRatio,
// so the ratio the page reports is capped as the scene editor caps its own.
export function limitPixelRatio(maximum = 2, target = globalThis) {
  const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), 'devicePixelRatio') ??
      Object.getOwnPropertyDescriptor(target, 'devicePixelRatio');
  if (!descriptor?.get) return;
  Object.defineProperty(target, 'devicePixelRatio', {configurable: true,
    get: () => Math.min(maximum, descriptor.get.call(target) || 1)});
}

// The fingers on an element whose page handles pointer events itself, tracked as their events
// arrive (ahead of any queued handlers). While two are down they pinch: the spread and midpoint of
// the first two fingers down, taken again whenever that pair changes. The pointerdown events of a
// gesture that became a pinch are marked `pinchGesture`, so a handler that runs later still knows.
export class TouchTracker {
  constructor() {
    this.points = new Map();
    this.downs = [];
    this.pinch = undefined;
  }

  down(event) {
    if (event.pointerType !== 'touch') return;
    if (!this.points.size) this.downs.length = 0;
    this.points.set(event.pointerId, {x: event.clientX, y: event.clientY});
    this.downs.push(event);
    if (this.points.size < 2) return;
    for (const down of this.downs) down.pinchGesture = true;
    if (this.points.size === 2) this.pinch = this.spread();
  }

  move(event) {
    if (this.points.has(event.pointerId)) this.points.set(event.pointerId, {x: event.clientX, y: event.clientY});
  }

  lift(event) {
    if (!this.points.delete(event.pointerId)) return;
    this.pinch = this.pinch && this.points.size >= 2 ? this.spread() : undefined;
  }

  clear() {
    this.points.clear();
    this.pinch = undefined;
  }

  has(pointerId) { return this.points.has(pointerId); }

  spread() {
    const [a, b] = this.points.values();
    return {distance: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2};
  }

  // The pinch since the last call: the midpoint's motion and the log of the spread's shrinking
  // (positive when the fingers close). Null while not pinching.
  advance() {
    if (!this.pinch || this.points.size < 2) return null;
    const next = this.spread(), previous = this.pinch;
    this.pinch = next;
    return {dx: next.x - previous.x, dy: next.y - previous.y,
      zoom: next.distance > 0 && previous.distance > 0 ? -Math.log(next.distance / previous.distance) : 0};
  }
}
