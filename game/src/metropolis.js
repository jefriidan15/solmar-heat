// Solmar City: a procedural coastal city on a street grid.
// Streets run every WORLD.streetGap pixels; the blocks between them hold
// buildings, a park, a plaza and parking bays. The south edge is sand and sea,
// with a wooden pier reaching out into it.
import { WORLD } from './tuning.js';
import { makeRng, between, betweenInt, pickOne } from './seedrand.js';

const ROOFS = ['#b5543f', '#c98a4b', '#7d8aa0', '#5e7d6a', '#a05a7a', '#4f6d8f', '#8f7d4f', '#6a5f8f'];
const WALLS = ['#e8dcc8', '#d9c9a8', '#cbb9a0', '#e0d4b8', '#d4c2b2'];
export const GROUND = {
  lawn: '#79a95b',
  lawnAlt: '#6d9a52',
  sand: '#e3cd96',
  sea: '#2f7fa8',
  seaDeep: '#256b92',
};

export function buildCity(seed) {
  const rng = makeRng(seed);
  const city = {
    seed,
    blocks: [], // buildings {x,y,w,h,storeys,roof,wall}
    palms: [],
    lamps: [],
    bays: [], // parked-car spots {x,y,angle}
    park: { x: 1230, y: 1230, w: 240, h: 240 },
    plaza: { x: 2130, y: 630, w: 240, h: 240 },
    garage: { x: 1080, y: 780 }, // Rosa's garage
    hotel: { x: 2430, y: 780 }, // Grand Solmar hotel
    docks: { x: 330, y: 1830 }, // Marina docks pickup
    bank: { x: 1830, y: 480 }, // Solmar Bank
    hideout: { x: 2730, y: 1830 }, // Old Town hideout
    pier: { x: 1830, y: 2400, w: 90, len: 190 },
    clinic: { x: 630, y: 1080 },
    spawn: { x: 1050, y: 930 }, // on the road, beside Rosa's garage block
    northStreets: [],
    eastStreets: [],
  };

  for (let x = 150; x < WORLD.width; x += WORLD.streetGap) city.northStreets.push(x);
  for (let y = 150; y < WORLD.sandTop; y += WORLD.streetGap) city.eastStreets.push(y);

  const overlapsGreen = (bx, by, bw, bh) => {
    for (const g of [city.park, city.plaza]) {
      if (bx < g.x + g.w && bx + bw > g.x && by < g.y + g.h && by + bh > g.y) return true;
    }
    return false;
  };

  for (let row = 0; row < city.eastStreets.length - 1; row++) {
    for (let col = 0; col < city.northStreets.length - 1; col++) {
      const bx = city.northStreets[col] + WORLD.streetHalf + WORLD.kerb + 8;
      const by = city.eastStreets[row] + WORLD.streetHalf + WORLD.kerb + 8;
      const bw = WORLD.streetGap - 2 * (WORLD.streetHalf + WORLD.kerb) - 16;
      if (bw < 60 || overlapsGreen(bx, by, bw, bw)) continue;
      const downtown = row <= 2; // towers in the northern rows
      city.blocks.push({
        x: bx, y: by, w: bw, h: bw,
        storeys: downtown ? betweenInt(rng, 26, 60) : betweenInt(rng, 10, 26),
        roof: pickOne(rng, ROOFS),
        wall: pickOne(rng, WALLS),
      });
      if (rng() < 0.5) city.bays.push({ x: bx + bw / 2, y: by + bw + 26, angle: 0 });
    }
  }

  for (let x = 120; x < WORLD.width; x += 130) {
    city.palms.push({ x: x + between(rng, -20, 20), y: WORLD.sandTop + 42 + between(rng, 0, 30) });
  }
  for (let i = 0; i < 26; i++) {
    city.palms.push({
      x: between(rng, city.park.x, city.park.x + city.park.w),
      y: between(rng, city.park.y, city.park.y + city.park.h),
    });
  }
  for (const sx of city.northStreets) {
    for (const sy of city.eastStreets) {
      if (rng() < 0.6) city.lamps.push({ x: sx + WORLD.streetHalf + 6, y: sy + WORLD.streetHalf + 6 });
    }
  }
  return city;
}

// --- Queries against a built city -------------------------------------------

export function inSea(city, x, y) {
  if (y < WORLD.seaTop) return false;
  const p = city.pier;
  const onPier = x > p.x - p.w / 2 && x < p.x + p.w / 2 && y < p.y + p.len;
  return !onPier;
}

export function onSand(city, x, y) {
  void city;
  return y >= WORLD.sandTop && y < WORLD.seaTop;
}

export function onStreet(city, x, y) {
  if (y >= WORLD.sandTop) return false;
  for (const sx of city.northStreets) if (Math.abs(x - sx) <= WORLD.streetHalf) return true;
  for (const sy of city.eastStreets) if (Math.abs(y - sy) <= WORLD.streetHalf) return true;
  return false;
}

export function insidePark(city, x, y) {
  const p = city.park;
  return x > p.x && x < p.x + p.w && y > p.y && y < p.y + p.h;
}

export function blockAt(city, x, y) {
  for (const b of city.blocks) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }
  return null;
}

// Push a circle out of every building it overlaps; true when pushed.
export function pushOutOfBlocks(city, p, r) {
  let pushed = false;
  for (const b of city.blocks) {
    const cx = Math.max(b.x, Math.min(p.x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(p.y, b.y + b.h));
    const dx = p.x - cx;
    const dy = p.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= r * r) continue;
    pushed = true;
    if (d2 > 0.0001) {
      const d = Math.sqrt(d2);
      p.x = cx + (dx / d) * r;
      p.y = cy + (dy / d) * r;
    } else {
      p.y = b.y - r;
    }
  }
  return pushed;
}

// Nearest point on the street network — traffic and police steer toward it.
export function snapToStreet(city, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const sx of city.northStreets) {
    const d = Math.abs(x - sx);
    if (d < bestD) { bestD = d; best = { x: sx, y }; }
  }
  for (const sy of city.eastStreets) {
    const d = Math.abs(y - sy);
    if (d < bestD) { bestD = d; best = { x, y: sy }; }
  }
  return best;
}

export function randomStreetPoint(city, rng) {
  if (rng() < 0.5) {
    return { x: pickOne(rng, city.northStreets), y: between(rng, 100, WORLD.sandTop - 100) };
  }
  return { x: between(rng, 100, WORLD.width - 100), y: pickOne(rng, city.eastStreets) };
}
