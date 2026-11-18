// Keyboard + mouse state, with edge-triggered "tapped" helpers.
// Keys: WASD/arrows move, E enter/exit car, Shift run, Space or click shoot,
// M mute, P/Esc pause, Enter confirm on menus.
export class Controls {
  constructor(canvas) {
    this.keys = new Set();
    this.taps = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseHeld = false;
    this.mouseTap = false;
    this.canvas = canvas;

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      if (!this.keys.has(e.key)) this.taps.add(e.key);
      this.keys.add(e.key);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key));
    window.addEventListener('blur', () => { this.keys.clear(); this.mouseHeld = false; });
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouseX = e.clientX - r.left;
      this.mouseY = e.clientY - r.top;
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) { this.mouseHeld = true; this.mouseTap = true; }
    });
    window.addEventListener('mouseup', () => { this.mouseHeld = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  held(...keys) {
    return keys.some((k) => this.keys.has(k));
  }

  tapped(...keys) {
    return keys.some((k) => this.taps.has(k));
  }

  // Movement vector: -1..1 on each axis from WASD/arrows, normalized.
  moveVec() {
    let x = 0;
    let y = 0;
    if (this.held('a', 'A', 'ArrowLeft')) x -= 1;
    if (this.held('d', 'D', 'ArrowRight')) x += 1;
    if (this.held('w', 'W', 'ArrowUp')) y -= 1;
    if (this.held('s', 'S', 'ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) { x *= 0.7071; y *= 0.7071; }
    return { x, y };
  }

  endFrame() {
    this.taps.clear();
    this.mouseTap = false;
  }
}
