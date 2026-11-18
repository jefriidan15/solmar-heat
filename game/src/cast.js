// The cast: Jax on foot and in cars, parked cars, traffic, Solmar PD
// interceptors, pedestrians, rival Vipers, bullets, pickups and sparks.
// Movement, collisions and the wanted system all live here; jobs.js decides
// what the cast is asked to do, boot.js owns the loop.
import { WORLD, TUNE, VEHICLES } from './tuning.js';
import {
  clampNum, distSq, turnTo, headingTo, between,
} from './seedrand.js';
import { onStreet, inSea, pushOutOfBlocks, snapToStreet, randomStreetPoint, blockAt } from './metropolis.js';

export function newHero(city) {
  return {
    x: city.spawn.x, y: city.spawn.y, heading: -Math.PI / 2,
    health: TUNE.heroHealth, ammo: TUNE.ammoStart,
    ride: null, // the vehicle Jax is driving, or null on foot
    shotCd: 0, grace: 0, sprinting: false,
  };
}

export function newVehicle(x, y, heading, modelIdx, role) {
  const spec = VEHICLES[modelIdx];
  return {
    x, y, heading, speed: 0, spec, modelIdx, role, // 'parked' | 'traffic' | 'police' | 'player'
    goal: null, wait: 0, stuck: 0,
    sirenPhase: Math.random() * 2,
    paint: spec.paint, occupied: role === 'traffic',
  };
}

export function fillBays(S, n) {
  const bays = S.city.bays;
  for (let i = 0; i < n && i < bays.length; i++) {
    const bay = bays[(i * 2 + 1) % bays.length];
    const v = newVehicle(bay.x, bay.y, bay.angle + (S.rng() < 0.5 ? 0 : Math.PI), Math.floor(S.rng() * 5), 'parked');
    S.vehicles.push(v);
  }
}

export function fillTraffic(S, n) {
  for (let i = 0; i < n; i++) {
    const p = randomStreetPoint(S.city, S.rng);
    const v = newVehicle(p.x, p.y, S.rng() * Math.PI * 2, Math.floor(S.rng() * 5), 'traffic');
    v.goal = randomStreetPoint(S.city, S.rng);
    S.vehicles.push(v);
  }
}

export function fillWalkers(S, n) {
  for (let i = 0; i < n; i++) {
    const p = randomStreetPoint(S.city, S.rng);
    S.walkers.push(newWalker(p.x, p.y, S, false));
  }
}

const SHIRTS = ['#e2725b', '#5b8de2', '#e2c25b', '#7ed07e', '#c25be2', '#e2e2e2'];

export function newWalker(x, y, S, viper) {
  return {
    x, y, heading: S.rng() * Math.PI * 2, speed: 0,
    shirt: viper ? '#3a3f4a' : SHIRTS[Math.floor(S.rng() * SHIRTS.length)],
    mood: 'walk', // walk | flee | down | chase | shoot
    goal: randomStreetPoint(S.city, S.rng),
    health: viper ? 70 : 100, viper: !!viper,
    shotCd: between(S.rng, 0.5, 1.5), downFor: 0, panicFor: 0,
  };
}

export function callCops(S, x, y) {
  const v = newVehicle(x, y, headingTo(x, y, S.hero.x, S.hero.y), 5, 'police');
  v.speed = 120;
  S.vehicles.push(v);
  return v;
}

export function copCount(S) {
  let n = 0;
  for (const v of S.vehicles) if (v.role === 'police') n++;
  return n;
}

// Raise the wanted level and roll interceptors in to answer it.
export function raiseHeat(S, stars, reason) {
  const before = S.stars;
  S.stars = clampNum(S.stars + stars, 0, TUNE.maxStars);
  if (S.stars <= before) return;
  S.heatTimer = 0;
  S.say(reason + ' — Wanted level ' + S.stars, 2600);
  if (S.sounds) S.sounds.sirenOn();
  const want = Math.min(S.stars, 2 + Math.floor(S.stars / 2));
  while (copCount(S) < want) {
    const a = S.rng() * Math.PI * 2;
    const d = 620 + S.rng() * 260;
    const px = clampNum(S.hero.x + Math.cos(a) * d, 80, WORLD.width - 80);
    const py = clampNum(S.hero.y + Math.sin(a) * d, 80, WORLD.sandTop - 80);
    const p = snapToStreet(S.city, px, py);
    callCops(S, p.x, p.y);
  }
}

export function closestVehicle(S, x, y, maxD) {
  let best = null;
  let bestD = maxD * maxD;
  for (const v of S.vehicles) {
    const d = distSq(x, y, v.x, v.y);
    if (d < bestD) { bestD = d; best = v; }
  }
  return best;
}

function vehicleTip(v, t) {
  return {
    x: v.x + Math.cos(v.heading) * t * (v.spec.len / 2 - 6),
    y: v.y + Math.sin(v.heading) * t * (v.spec.len / 2 - 6),
  };
}

function hitWorld(S, v) {
  let hit = false;
  for (const t of [1, -1]) {
    const tip = vehicleTip(v, t);
    const before = { x: tip.x, y: tip.y };
    if (pushOutOfBlocks(S.city, tip, 13)) {
      hit = true;
      v.x += tip.x - before.x;
      v.y += tip.y - before.y;
    }
  }
  if (inSea(S.city, v.x, v.y)) {
    v.y = WORLD.seaTop - 14; // cars never enter the sea
    hit = true;
  }
  return hit;
}

// Arcade driving: throttle, steering, drag, off-road slowdown, wall bumps.
function driveVehicle(S, v, throttle, steer, dt) {
  const spec = v.spec;
  const paved = onStreet(S.city, v.x, v.y);
  const maxSp = spec.top * (paved ? 1 : 0.55);
  v.speed += throttle * spec.accel * dt;
  v.speed -= v.speed * (paved ? 0.35 : 0.9) * dt;
  v.speed = clampNum(v.speed, -maxSp * 0.45, maxSp);
  if (Math.abs(v.speed) > 8) {
    v.heading += steer * spec.grip * (v.speed / maxSp) * dt * (v.speed < 0 ? -1 : 1);
  }
  v.x = clampNum(v.x + Math.cos(v.heading) * v.speed * dt, 30, WORLD.width - 30);
  v.y = clampNum(v.y + Math.sin(v.heading) * v.speed * dt, 30, WORLD.height - 30);
  if (hitWorld(S, v)) {
    if (Math.abs(v.speed) > 140) {
      if (S.sounds) S.sounds.crash();
      burst(S, v.x, v.y, 8, '#ffd76a');
      if (v.role === 'player') S.hero.health = Math.max(0, S.hero.health - 4);
    }
    v.speed *= 0.45;
  }
}

export function tickHero(S, input, dt) {
  const h = S.hero;
  h.shotCd = Math.max(0, h.shotCd - dt);
  h.grace = Math.max(0, h.grace - dt);
  if (h.ride) {
    const car = h.ride;
    const mv = input.moveVec();
    driveVehicle(S, car, mv.y !== 0 ? -mv.y : 0, mv.x, dt);
    h.x = car.x; h.y = car.y; h.heading = car.heading;
    if (S.sounds) S.sounds.engine(Math.abs(car.speed) / car.spec.top, true);
    if (input.tapped('e', 'E')) stepOut(S);
    if (input.tapped(' ')) { if (S.sounds) S.sounds.horn(); }
    return;
  }
  if (S.sounds) S.sounds.engine(0, false);
  const mv = input.moveVec();
  h.sprinting = input.held('Shift');
  const sp = h.sprinting ? TUNE.sprint : TUNE.walk;
  h.x = clampNum(h.x + mv.x * sp * dt, 20, WORLD.width - 20);
  h.y = clampNum(h.y + mv.y * sp * dt, 20, WORLD.height - 20);
  if (mv.x !== 0 || mv.y !== 0) h.heading = Math.atan2(mv.y, mv.x);
  const probe = { x: h.x, y: h.y };
  pushOutOfBlocks(S.city, probe, TUNE.heroRadius);
  h.x = probe.x; h.y = probe.y;
  if (inSea(S.city, h.x, h.y)) h.y = WORLD.seaTop - TUNE.heroRadius;
  if (S.aim && (input.mouseHeld || input.held(' '))) {
    h.heading = headingTo(h.x, h.y, S.aim.x, S.aim.y);
  }
  if ((input.mouseTap || input.held(' ')) && h.shotCd <= 0) fire(S, h);
  if (input.tapped('e', 'E')) jackCar(S);
}

function fire(S, h) {
  if (h.ammo <= 0) {
    S.say('Out of ammo — find an ammo pickup', 1800);
    h.shotCd = 0.4;
    return;
  }
  h.ammo--;
  h.shotCd = TUNE.shotCooldown;
  const a = h.heading;
  S.shots.push({
    x: h.x + Math.cos(a) * 20, y: h.y + Math.sin(a) * 20,
    vx: Math.cos(a) * 780, vy: Math.sin(a) * 780,
    life: TUNE.shotRange / 780, from: 'hero', damage: TUNE.shotDamage,
  });
  flash(S, h.x + Math.cos(a) * 22, h.y + Math.sin(a) * 22);
  if (S.sounds) S.sounds.shot();
  raiseHeat(S, 1, 'Shots fired');
}

function jackCar(S) {
  const h = S.hero;
  const v = closestVehicle(S, h.x, h.y, 52);
  if (!v) { S.say('No car close by', 1400); return; }
  if (v.role === 'police') { S.say('That is a cop car — bad idea', 1800); return; }
  const wasTraffic = v.role === 'traffic';
  v.role = 'player';
  v.occupied = false;
  h.ride = v;
  S.stats.carsStolen++;
  if (wasTraffic) {
    let seen = false;
    for (const w of S.walkers) {
      if (distSq(w.x, w.y, h.x, h.y) < 260 * 260) { seen = true; break; }
    }
    if (seen || S.stars > 0) raiseHeat(S, 1, 'Car stolen');
    else S.say('Stolen clean — nobody saw', 1800);
  } else {
    S.say('Took the ' + v.spec.name, 1600);
  }
  if (S.sounds) { S.sounds.engineStart(); S.sounds.pickup(); }
}

function stepOut(S) {
  const h = S.hero;
  const v = h.ride;
  if (!v) return;
  v.role = 'parked';
  v.speed = 0;
  h.ride = null;
  h.x = v.x + Math.cos(v.heading + Math.PI / 2) * 34;
  h.y = v.y + Math.sin(v.heading + Math.PI / 2) * 34;
  const probe = { x: h.x, y: h.y };
  pushOutOfBlocks(S.city, probe, TUNE.heroRadius);
  h.x = probe.x; h.y = probe.y;
}

export function tickVehicles(S, dt) {
  const h = S.hero;
  for (const v of S.vehicles) {
    if (v.role === 'player' || v.role === 'parked') continue;
    if (v.role === 'traffic') {
      if (!v.goal || distSq(v.x, v.y, v.goal.x, v.goal.y) < 40 * 40) {
        v.goal = randomStreetPoint(S.city, S.rng);
      }
      const want = headingTo(v.x, v.y, v.goal.x, v.goal.y);
      const steer = clampNum(turnTo(v.heading, want) * 1.6, -1, 1);
      let blocked = false;
      for (const o of S.vehicles) {
        if (o === v) continue;
        if (distSq(v.x, v.y, o.x, o.y) < 70 * 70) {
          const a = headingTo(v.x, v.y, o.x, o.y);
          if (Math.abs(turnTo(v.heading, a)) < 0.5) { blocked = true; break; }
        }
      }
      driveVehicle(S, v, blocked ? -0.4 : 0.55, steer, dt);
      v.speed = clampNum(v.speed, 0, 130);
    } else if (v.role === 'police') {
      const want = headingTo(v.x, v.y, h.x, h.y);
      const steer = clampNum(turnTo(v.heading, want) * 2.2, -1, 1);
      const distP = Math.sqrt(distSq(v.x, v.y, h.x, h.y));
      driveVehicle(S, v, distP > 60 ? 1 : 0.4, steer, dt);
      if (distP < 46) {
        if (h.ride) {
          if (Math.abs(v.speed) > 60) {
            h.health = Math.max(0, h.health - TUNE.ramDamage * dt * 0.8);
            if (S.sounds && Math.random() < 0.1) S.sounds.crash();
          }
          h.ride.x += Math.cos(v.heading) * 26 * dt; // shove the player's car
          h.ride.y += Math.sin(v.heading) * 26 * dt;
        } else if (S.stars > 0 && h.grace <= 0) {
          S.bustTimer += dt;
          if (S.bustTimer > TUNE.bustSecs) S.busted = true;
        }
      }
    }
  }
  // Soft push so traffic never stacks on one spot.
  for (let i = 0; i < S.vehicles.length; i++) {
    for (let j = i + 1; j < S.vehicles.length; j++) {
      const a = S.vehicles[i];
      const b = S.vehicles[j];
      const d2 = distSq(a.x, a.y, b.x, b.y);
      if (d2 < 44 * 44 && d2 > 0.01) {
        const d = Math.sqrt(d2);
        const push = (44 - d) / 2;
        const nx = (b.x - a.x) / d;
        const ny = (b.y - a.y) / d;
        if (a.role !== 'player') { a.x -= nx * push; a.y -= ny * push; }
        if (b.role !== 'player') { b.x += nx * push; b.y += ny * push; }
        if ((a.role === 'player' || b.role === 'player') && Math.abs(a.speed - b.speed) > 120 && S.sounds) {
          S.sounds.crash();
        }
      }
    }
  }
  // A moving car that hits a pedestrian knocks them down — and the law notices.
  for (const v of S.vehicles) {
    if (v.role === 'parked' || Math.abs(v.speed) < 40) continue;
    for (const w of S.walkers) {
      if (w.mood === 'down' || w.viper) continue;
      if (distSq(v.x, v.y, w.x, w.y) < 34 * 34) {
        w.mood = 'down';
        w.downFor = 6;
        w.health = 40;
        burst(S, w.x, w.y, 6, '#ffffff');
        if (v.role === 'player' || v.role === 'police') raiseHeat(S, 1, 'Pedestrian hit');
      }
    }
  }
}

export function tickWalkers(S, dt) {
  const h = S.hero;
  for (const w of S.walkers) {
    w.shotCd -= dt;
    if (w.mood === 'down') {
      w.downFor -= dt;
      if (w.downFor <= 0) { w.mood = 'flee'; w.panicFor = 3; }
      continue;
    }
    const dP = Math.sqrt(distSq(w.x, w.y, h.x, h.y));
    if (w.viper) {
      if (S.jobActive === 'pier-brawl' && dP < 700) {
        w.mood = dP > 260 ? 'chase' : 'shoot';
      } else if (S.jobActive !== 'pier-brawl') {
        w.mood = 'walk';
      }
      if (w.mood === 'chase') {
        w.heading = headingTo(w.x, w.y, h.x, h.y);
        w.x += Math.cos(w.heading) * 150 * dt;
        w.y += Math.sin(w.heading) * 150 * dt;
      } else if (w.mood === 'shoot' && w.shotCd <= 0) {
        w.shotCd = between(S.rng, 1.2, 2.0);
        const a = headingTo(w.x, w.y, h.x, h.y) + between(S.rng, -0.12, 0.12);
        S.shots.push({
          x: w.x + Math.cos(a) * 18, y: w.y + Math.sin(a) * 18,
          vx: Math.cos(a) * 640, vy: Math.sin(a) * 640,
          life: 0.7, from: 'viper', damage: 7,
        });
        flash(S, w.x + Math.cos(a) * 20, w.y + Math.sin(a) * 20);
        if (dP < 700 && S.sounds) S.sounds.shot();
      } else if (w.mood === 'walk') {
        stroll(S, w, dt, 70);
      }
      continue;
    }
    if (w.panicFor > 0) {
      w.panicFor -= dt;
      w.mood = 'flee';
      const a = headingTo(S.dangerX ?? h.x, S.dangerY ?? h.y, w.x, w.y);
      w.heading = a;
      w.x += Math.cos(a) * 200 * dt;
      w.y += Math.sin(a) * 200 * dt;
    } else {
      w.mood = 'walk';
      stroll(S, w, dt, 55);
    }
    const probe = { x: w.x, y: w.y };
    pushOutOfBlocks(S.city, probe, 10);
    w.x = clampNum(probe.x, 20, WORLD.width - 20);
    w.y = clampNum(probe.y, 20, WORLD.sandTop - 20);
  }
  if (S.walkers.length < TUNE.walkers && S.rng() < 0.02) {
    const pt = randomStreetPoint(S.city, S.rng);
    if (distSq(pt.x, pt.y, h.x, h.y) > 500 * 500) S.walkers.push(newWalker(pt.x, pt.y, S, false));
  }
}

function stroll(S, w, dt, speed) {
  if (!w.goal || distSq(w.x, w.y, w.goal.x, w.goal.y) < 30 * 30) {
    w.goal = randomStreetPoint(S.city, S.rng);
  }
  const a = headingTo(w.x, w.y, w.goal.x, w.goal.y);
  w.heading = a;
  w.x += Math.cos(a) * speed * dt;
  w.y += Math.sin(a) * speed * dt;
}

export function tickShots(S, dt) {
  const h = S.hero;
  for (let i = S.shots.length - 1; i >= 0; i--) {
    const b = S.shots[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0;
    if (!dead && S.city && blockAt(S.city, b.x, b.y)) {
      dead = true;
      burst(S, b.x, b.y, 4, '#ffd76a');
    }
    if (!dead && b.from === 'hero') {
      for (const w of S.walkers) {
        if (w.mood === 'down') continue;
        if (distSq(b.x, b.y, w.x, w.y) < 18 * 18) {
          dead = true;
          w.health -= b.damage;
          burst(S, b.x, b.y, 6, '#ff5b5b');
          if (w.health <= 0) {
            w.mood = 'down';
            w.downFor = 9999;
            if (w.viper) {
              S.vipersDown++;
              dropLoot(S, w.x, w.y, S.rng() < 0.5 ? 'cash' : 'ammo');
              S.say('Viper down — ' + S.vipersDown + '/5', 1600);
            } else {
              raiseHeat(S, 1, 'Pedestrian shot');
            }
          } else if (!w.viper) {
            w.panicFor = 4;
            S.dangerX = h.x;
            S.dangerY = h.y;
          }
          break;
        }
      }
      if (!dead) {
        for (const v of S.vehicles) {
          if (v.role === 'player' || v.role === 'parked') continue;
          if (distSq(b.x, b.y, v.x, v.y) < 30 * 30) {
            dead = true;
            burst(S, b.x, b.y, 4, '#ffd76a');
            if (v.role === 'police') raiseHeat(S, 1, 'Shot at police');
            break;
          }
        }
      }
    }
    if (!dead && b.from === 'viper') {
      const tx = h.ride ? h.ride.x : h.x;
      const ty = h.ride ? h.ride.y : h.y;
      const r = h.ride ? 30 : 16;
      if (distSq(b.x, b.y, tx, ty) < r * r && h.grace <= 0) {
        dead = true;
        h.health = Math.max(0, h.health - b.damage);
        h.grace = 0.25;
        burst(S, b.x, b.y, 5, '#ff5b5b');
      }
    }
    if (dead) S.shots.splice(i, 1);
  }
}

export function dropLoot(S, x, y, kind) {
  S.loot.push({ x, y, kind, bob: S.rng() * 6 });
}

export function tickLoot(S, dt) {
  const h = S.hero;
  for (let i = S.loot.length - 1; i >= 0; i--) {
    const pk = S.loot[i];
    pk.bob += dt;
    const tx = h.ride ? h.ride.x : h.x;
    const ty = h.ride ? h.ride.y : h.y;
    if (distSq(pk.x, pk.y, tx, ty) < 40 * 40) {
      if (pk.kind === 'cash') {
        const v = 50 + Math.floor(S.rng() * 100);
        S.cash += v;
        S.say('Picked up $' + v, 1500);
        if (S.sounds) S.sounds.cash();
      } else if (pk.kind === 'health') {
        h.health = Math.min(TUNE.heroHealth, h.health + 35);
        S.say('Health +35', 1500);
        if (S.sounds) S.sounds.pickup();
      } else if (pk.kind === 'ammo') {
        h.ammo += 12;
        S.say('Ammo +12', 1500);
        if (S.sounds) S.sounds.pickup();
      }
      S.loot.splice(i, 1);
    }
  }
}

export function burst(S, x, y, n, color) {
  for (let i = 0; i < n; i++) {
    const a = S.rng() * Math.PI * 2;
    const s = 60 + S.rng() * 160;
    S.sparks.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: 0.35 + S.rng() * 0.3, color, size: 2 + S.rng() * 3,
    });
  }
}

export function flash(S, x, y) {
  S.sparks.push({ x, y, vx: 0, vy: 0, life: 0.08, color: '#ffe9a8', size: 9 });
}

export function tickSparks(S, dt) {
  for (let i = S.sparks.length - 1; i >= 0; i--) {
    const pt = S.sparks[i];
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 0.92;
    pt.vy *= 0.92;
    pt.life -= dt;
    if (pt.life <= 0) S.sparks.splice(i, 1);
  }
  if (S.sparks.length > 400) S.sparks.splice(0, S.sparks.length - 400);
}
