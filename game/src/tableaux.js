// Screenshot scenes: deterministic staged setups (?shot=cover|street|pier|dusk)
// so the entry's screenshots are real renders of the game with its systems
// visible: a police chase, on-foot downtown, the pier brawl, a sunset beach
// drive.
import { WORLD } from './tuning.js';
import { beginJob } from './jobs.js';
import { newVehicle, callCops } from './cast.js';
import { clampNum } from './seedrand.js';
import { snapToStreet } from './metropolis.js';

function seatHero(S, x, y, heading, modelIdx) {
  const v = newVehicle(x, y, heading, modelIdx, 'player');
  S.vehicles.push(v);
  S.hero.ride = v;
  S.hero.x = x;
  S.hero.y = y;
  S.hero.heading = heading;
  v.speed = 260;
  return v;
}

function chaseCops(S, offsets) {
  S.stars = offsets.length;
  for (const [dx, dy] of offsets) {
    const px = clampNum(S.hero.x + dx, 80, WORLD.width - 80);
    const py = clampNum(S.hero.y + dy, 80, WORLD.sandTop - 80);
    const p = snapToStreet(S.city, px, py);
    const c = callCops(S, p.x, p.y);
    c.speed = 300;
  }
}

function thinCrowd(S) {
  S.vehicles = S.vehicles.filter((v) => v.role === 'player' || v.role === 'police');
  S.walkers = S.walkers.filter((w) => w.viper);
}

export function stageScene(S, name) {
  const h = S.hero;
  S.shotMode = true;
  if (name === 'cover') {
    // Downtown chase: Comet GT, 3 stars, two interceptors on the tail, Heat Run live.
    S.clock = 16.8;
    thinCrowd(S);
    seatHero(S, 1530, 750, 0, 1);
    chaseCops(S, [[-160, 90], [-260, -60]]);
    const t1 = newVehicle(1830, 750, 0, 0, 'traffic');
    t1.speed = 120;
    S.vehicles.push(t1);
    const t2 = newVehicle(1530, 450, Math.PI / 2, 3, 'traffic');
    t2.speed = 110;
    S.vehicles.push(t2);
    beginJob(S, 3); // Heat Run
    S.cash = 2450;
  } else if (name === 'street') {
    // On foot in Downtown at midday, traffic and pedestrians all around.
    S.clock = 11.5;
    h.x = 1500;
    h.y = 750;
    h.heading = 0.4;
    h.health = 100;
    h.ammo = 24;
    S.cash = 320;
    beginJob(S, 0); // First Wheels
    S.vehicles.push(newVehicle(1560, 780, 0, 4, 'parked'));
  } else if (name === 'pier') {
    // The pier brawl mid-fight: two Vipers down, three closing in.
    S.clock = 15.2;
    h.x = S.city.pier.x;
    h.y = S.city.pier.y + 150;
    h.heading = -Math.PI / 2;
    h.health = 100;
    h.ammo = 24;
    S.cash = 1180;
    beginJob(S, 2); // Pier Brawl
    S.vipersDown = 2;
    let down = 0;
    for (const w of S.walkers) {
      if (!w.viper) continue;
      if (down < 2) { w.mood = 'down'; w.downFor = 9999; down++; }
      else { w.x = S.city.pier.x - 40 + down * 24; w.y = S.city.pier.y + 60; }
    }
  } else if (name === 'dusk') {
    // Sunset drive along the beach road, 2 stars, one interceptor behind.
    S.clock = 18.4;
    thinCrowd(S);
    seatHero(S, 1050, 2250, 0, 4);
    chaseCops(S, [[-190, 40]]);
    const t1 = newVehicle(1350, 2250, 0, 2, 'traffic');
    t1.speed = 130;
    S.vehicles.push(t1);
    S.cash = 1875;
    h.health = 92;
  } else {
    return false;
  }
  return true;
}

export const SCENE_NAMES = ['cover', 'street', 'pier', 'dusk'];
