// Sound, synthesized live with WebAudio — no audio files, no network.
// Engine hum, two-tone police siren, gunshots, crashes, pickups, job stingers
// and a low-key bass groove. Everything is created on first user gesture.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.grooveTimer = 0;
    this.grooveStep = 0;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  tone(freq, dur, type = 'sine', vol = 0.25, slideTo = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  hiss(dur, vol = 0.3, cutoff = 400) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t);
  }

  shot() { this.hiss(0.12, 0.4, 1800); this.tone(160, 0.08, 'square', 0.12, 60); }
  crash() { this.hiss(0.25, 0.35, 300); this.tone(90, 0.2, 'sawtooth', 0.15, 40); }
  pickup() { this.tone(660, 0.09, 'sine', 0.22); setTimeout(() => this.tone(990, 0.12, 'sine', 0.22), 80); }
  cash() { this.tone(880, 0.1, 'triangle', 0.22); setTimeout(() => this.tone(1174, 0.16, 'triangle', 0.22), 90); }
  missionDone() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.22, 'triangle', 0.25), i * 110));
  }
  busted() { [392, 330, 262].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, 'sawtooth', 0.18), i * 160)); }
  wasted() { [330, 262, 196, 131].forEach((f, i) => setTimeout(() => this.tone(f, 0.35, 'sawtooth', 0.18), i * 180)); }
  horn() { this.tone(370, 0.18, 'square', 0.1); }

  engineStart() {
    if (!this.ctx || this.engineOsc) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.value = 55;
    g.gain.value = 0.0;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 420;
    o.connect(f);
    f.connect(g);
    g.connect(this.master);
    o.start();
    this.engineOsc = o;
    this.engineGain = g;
  }

  engine(speedNorm, on) {
    if (!this.engineOsc || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.engineGain.gain.setTargetAtTime(on && !this.muted ? 0.05 + speedNorm * 0.05 : 0.0, t, 0.1);
    this.engineOsc.frequency.setTargetAtTime(55 + speedNorm * 95, t, 0.1);
  }

  sirenOn() {
    if (!this.ctx || this.sirenOsc) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = 700;
    g.gain.value = 0.0;
    o.connect(g);
    g.connect(this.master);
    o.start();
    this.sirenOsc = o;
    this.sirenGain = g;
  }

  siren(on, t) {
    if (!this.sirenOsc || !this.ctx) return;
    this.sirenGain.gain.setTargetAtTime(on && !this.muted ? 0.045 : 0.0, this.ctx.currentTime, 0.2);
    if (on) this.sirenOsc.frequency.value = (Math.floor(t * 1.4) % 2 === 0) ? 700 : 950;
  }

  // A lazy sunset bass groove: root notes of Am – F – C – G, one bar each.
  groove(dt, playing) {
    if (!this.ctx) return;
    this.grooveTimer += dt;
    if (!playing) return;
    if (this.grooveTimer < 0.42) return;
    this.grooveTimer = 0;
    const roots = [110, 87.31, 130.81, 98];
    const bar = Math.floor(this.grooveStep / 4) % 4;
    const beat = this.grooveStep % 4;
    this.grooveStep++;
    if (beat === 0 || beat === 2) this.tone(roots[bar], 0.3, 'triangle', 0.1);
    if (beat === 3) this.tone(roots[bar] * 1.5, 0.18, 'triangle', 0.07);
  }
}
