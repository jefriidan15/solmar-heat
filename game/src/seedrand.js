// Seeded randomness and small math helpers for Solmar Heat.
// One seed drives the whole city, traffic and crowd so a given seed always
// builds the same streets (and the same screenshots).
export function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickOne(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

export function between(rng, lo, hi) {
  return lo + rng() * (hi - lo);
}

export function betweenInt(rng, lo, hi) {
  return Math.floor(between(rng, lo, hi + 1));
}

export function clampNum(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a <= -Math.PI) a += Math.PI * 2;
  return a;
}

// Signed turn from heading a toward heading b, in (-PI, PI].
export function turnTo(a, b) {
  return wrapAngle(b - a);
}

export function distSq(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
}

export function headingTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

export function money(n) {
  return '$' + Math.round(n).toLocaleString('en-US');
}

export function clockText(totalSeconds) {
  const s = Math.floor(totalSeconds) % 86400;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}
