// Painting: the camera, the city, cars, people, effects, the HUD and the
// minimap. All art is drawn with canvas primitives — no image files, nothing
// fetched.
import { WORLD, TUNE, AREAS } from './tuning.js';
import { clampNum, money, clockText } from './seedrand.js';
import { GROUND } from './metropolis.js';

export function makeView(w, h) {
  return { x: 0, y: 0, w, h };
}

export function follow(view, tx, ty) {
  view.x = clampNum(tx - view.w / 2, 0, WORLD.width - view.w);
  view.y = clampNum(ty - view.h / 2, 0, WORLD.height - view.h);
}

function roundBox(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function onScreen(view, x, y, pad) {
  return x > view.x - pad && x < view.x + view.w + pad && y > view.y - pad && y < view.y + view.h + pad;
}

export function paintWorld(ctx, S, view) {
  const vx = view.x;
  const vy = view.y;
  const vw = view.w;
  const vh = view.h;
  ctx.save();
  ctx.clearRect(0, 0, vw, vh);
  // Ground: lawn with mow stripes.
  ctx.fillStyle = GROUND.lawn;
  ctx.fillRect(0, 0, vw, vh);
  ctx.fillStyle = GROUND.lawnAlt;
  const ts = 120;
  for (let gy = Math.floor(vy / ts) * ts; gy < vy + vh; gy += ts) {
    for (let gx = Math.floor(vx / ts) * ts; gx < vx + vw; gx += ts) {
      if (((gx / ts) + (gy / ts)) % 2 === 0) ctx.fillRect(gx - vx, gy - vy, ts, ts);
    }
  }
  // Beach and sea.
  ctx.fillStyle = GROUND.sand;
  ctx.fillRect(0, WORLD.sandTop - vy, vw, WORLD.seaTop - WORLD.sandTop);
  ctx.fillStyle = GROUND.sea;
  ctx.fillRect(0, WORLD.seaTop - vy, vw, WORLD.height - WORLD.seaTop);
  ctx.fillStyle = GROUND.seaDeep;
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(0, WORLD.seaTop + 30 + i * 22 - vy, vw, 3);
  }
  // Park and plaza.
  ctx.fillStyle = '#5d8a4a';
  ctx.fillRect(S.city.park.x - vx, S.city.park.y - vy, S.city.park.w, S.city.park.h);
  ctx.fillStyle = '#c9b896';
  ctx.fillRect(S.city.plaza.x - vx, S.city.plaza.y - vy, S.city.plaza.w, S.city.plaza.h);
  ctx.strokeStyle = '#a89468';
  ctx.lineWidth = 3;
  ctx.strokeRect(S.city.plaza.x - vx, S.city.plaza.y - vy, S.city.plaza.w, S.city.plaza.h);

  // Streets: asphalt, pavements, centre dashes.
  ctx.fillStyle = '#3c3f45';
  for (const sx of S.city.northStreets) ctx.fillRect(sx - WORLD.streetHalf - vx, 0, WORLD.streetHalf * 2, WORLD.sandTop - vy);
  for (const sy of S.city.eastStreets) ctx.fillRect(0, sy - WORLD.streetHalf - vy, WORLD.width, WORLD.streetHalf * 2);
  ctx.fillStyle = '#9a938a';
  for (const sx of S.city.northStreets) {
    ctx.fillRect(sx - WORLD.streetHalf - WORLD.kerb - vx, 0, WORLD.kerb, WORLD.sandTop - vy);
    ctx.fillRect(sx + WORLD.streetHalf - vx, 0, WORLD.kerb, WORLD.sandTop - vy);
  }
  for (const sy of S.city.eastStreets) {
    ctx.fillRect(0, sy - WORLD.streetHalf - WORLD.kerb - vy, WORLD.width, WORLD.kerb);
    ctx.fillRect(0, sy + WORLD.streetHalf - vy, WORLD.width, WORLD.kerb);
  }
  ctx.fillStyle = '#e8d44f';
  for (const sx of S.city.northStreets) {
    for (let y = 0; y < WORLD.sandTop; y += 46) ctx.fillRect(sx - 2 - vx, y - vy, 4, 22);
  }
  for (const sy of S.city.eastStreets) {
    for (let x = 0; x < WORLD.width; x += 46) ctx.fillRect(x - vx, sy - 2 - vy, 22, 4);
  }

  // Pier deck.
  const pier = S.city.pier;
  ctx.fillStyle = '#8a6b45';
  ctx.fillRect(pier.x - pier.w / 2 - vx, pier.y - vy, pier.w, pier.len);
  ctx.fillStyle = '#a5855c';
  for (let y = pier.y; y < pier.y + pier.len; y += 26) ctx.fillRect(pier.x - pier.w / 2 - vx, y - vy, pier.w, 3);

  // Buildings: shadow, walls, roof, windows, rooftop plant on towers.
  for (const b of S.city.blocks) {
    if (!onScreen(view, b.x + b.w / 2, b.y + b.h / 2, 200)) continue;
    const bx = b.x - vx;
    const by = b.y - vy;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(bx + 6, by + 8, b.w, b.h);
    ctx.fillStyle = b.wall;
    ctx.fillRect(bx, by, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(bx + 5, by + 5, b.w - 10, b.h - 10);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    const cols = Math.max(2, Math.floor(b.w / 34));
    const rows = Math.max(2, Math.floor(b.h / 34));
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        ctx.fillRect(bx + 12 + i * ((b.w - 24) / cols), by + 12 + j * ((b.h - 24) / rows), 7, 7);
      }
    }
    if (b.storeys > 30) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(bx + b.w / 2 - 14, by + b.h / 2 - 14, 28, 28);
    }
  }

  // Palms and lamps.
  for (const pl of S.city.palms) {
    if (!onScreen(view, pl.x, pl.y, 30)) continue;
    const px = pl.x - vx;
    const py = pl.y - vy;
    ctx.strokeStyle = '#7a5a34';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + 3, py - 12);
    ctx.stroke();
    ctx.fillStyle = '#3f8f3f';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.4;
      ctx.beginPath();
      ctx.ellipse(px + 3 + Math.cos(a) * 8, py - 12 + Math.sin(a) * 5, 9, 3.5, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = '#2c2f36';
  for (const l of S.city.lamps) {
    if (!onScreen(view, l.x, l.y, 10)) continue;
    ctx.fillRect(l.x - vx - 2, l.y - vy - 2, 4, 4);
  }

  // Landmark labels (kept off the hero).
  ctx.font = 'bold 15px system-ui, sans-serif';
  const clearOfHero = (lx, ly) => Math.abs(lx - S.hero.x) > 110 || Math.abs(ly - S.hero.y) > 90;
  if (clearOfHero(S.city.garage.x, S.city.garage.y)) tag(ctx, "Rosa's Garage", S.city.garage.x - vx, S.city.garage.y - 24 - vy);
  if (clearOfHero(S.city.hotel.x, S.city.hotel.y)) tag(ctx, 'Grand Solmar', S.city.hotel.x - vx, S.city.hotel.y - 24 - vy);
  if (clearOfHero(S.city.bank.x, S.city.bank.y)) tag(ctx, 'Solmar Bank', S.city.bank.x - vx, S.city.bank.y - 24 - vy);
  if (clearOfHero(S.city.docks.x, S.city.docks.y)) tag(ctx, 'Marina Docks', S.city.docks.x - vx, S.city.docks.y - 24 - vy);
  if (clearOfHero(S.city.hideout.x, S.city.hideout.y)) tag(ctx, 'Hideout', S.city.hideout.x - vx, S.city.hideout.y - 24 - vy);
  if (clearOfHero(pier.x, pier.y)) tag(ctx, 'Solmar Pier', pier.x - vx, pier.y + 12 - vy);
  tag(ctx, 'Solmar Beach', 700 - vx, WORLD.sandTop + 18 - vy);

  paintTarget(ctx, S, view);
  paintLoot(ctx, S, view);
  for (const w of S.walkers) paintWalker(ctx, w, view);
  for (const v of S.vehicles) paintVehicle(ctx, v, view, S.elapsed);
  paintHero(ctx, S, view);
  paintShots(ctx, S, view);
  paintSparks(ctx, S, view);

  // Time-of-day tint: amber dusk, dark blue night with lamp glow.
  const t = S.clock;
  if (t >= 17 && t < 19.5) {
    ctx.fillStyle = 'rgba(255,140,50,0.18)';
    ctx.fillRect(0, 0, vw, vh);
  } else if (t >= 19.5 || t < 6) {
    ctx.fillStyle = 'rgba(10,16,60,0.30)';
    ctx.fillRect(0, 0, vw, vh);
    ctx.fillStyle = 'rgba(255,220,120,0.20)';
    for (const l of S.city.lamps) {
      if (!onScreen(view, l.x, l.y, 20)) continue;
      ctx.beginPath();
      ctx.arc(l.x - vx, l.y - vy, 16, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function tag(ctx, text, x, y) {
  const w = ctx.measureText(text).width;
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  roundBox(ctx, x - w / 2 - 6, y - 13, w + 12, 19, 9);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,24,32,0.85)';
  ctx.fillText(text, x - w / 2, y);
}

export function paintTarget(ctx, S, view) {
  const m = S.target;
  if (!m) return;
  const pulse = 1 + Math.sin(S.played * 4) * 0.12;
  const x = m.x - view.x;
  const y = m.y - view.y;
  ctx.save();
  ctx.strokeStyle = '#ffd23e';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, m.r * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,210,62,0.16)';
  ctx.beginPath();
  ctx.arc(x, y, m.r * pulse, 0, Math.PI * 2);
  ctx.fill();
  const grad = ctx.createLinearGradient(x, y - 190, x, y);
  grad.addColorStop(0, 'rgba(255,210,62,0)');
  grad.addColorStop(1, 'rgba(255,210,62,0.45)');
  ctx.fillStyle = grad;
  ctx.fillRect(x - 9, y - 190, 18, 190);
  ctx.font = 'bold 14px system-ui, sans-serif';
  const w = ctx.measureText(m.label).width;
  ctx.fillStyle = 'rgba(20,24,32,0.8)';
  roundBox(ctx, x - w / 2 - 7, y - m.r - 34, w + 14, 22, 10);
  ctx.fill();
  ctx.fillStyle = '#ffd23e';
  ctx.fillText(m.label, x - w / 2, y - m.r - 19);
  ctx.restore();
}

function paintLoot(ctx, S, view) {
  for (const pk of S.loot) {
    const x = pk.x - view.x;
    const y = pk.y - view.y + Math.sin(pk.bob * 3) * 3;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    ctx.fillStyle = pk.kind === 'cash' ? '#2f9e44' : pk.kind === 'health' ? '#e03131' : '#1971c2';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(pk.kind === 'cash' ? '$' : pk.kind === 'health' ? '+' : 'A', x, y + 5);
    ctx.restore();
  }
}

function paintWalker(ctx, w, view) {
  const x = w.x - view.x;
  const y = w.y - view.y;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 4, 9, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  if (w.mood === 'down') {
    ctx.rotate(w.heading);
    ctx.fillStyle = w.shirt;
    roundBox(ctx, -11, -5, 22, 10, 5);
    ctx.fill();
    ctx.restore();
    return;
  }
  ctx.fillStyle = w.shirt;
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8b98a';
  ctx.beginPath();
  ctx.arc(Math.cos(w.heading) * 3, Math.sin(w.heading) * 3, 4.5, 0, Math.PI * 2);
  ctx.fill();
  if (w.viper) {
    ctx.strokeStyle = '#ff3b30';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#222';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(w.heading) * 16, Math.sin(w.heading) * 16);
    ctx.stroke();
  }
  ctx.restore();
}

function paintVehicle(ctx, v, view, time) {
  const x = v.x - view.x;
  const y = v.y - view.y;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(v.heading);
  const L = v.spec.len;
  const W = v.spec.wid;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  roundBox(ctx, -L / 2 + 4, -W / 2 + 5, L, W, 7);
  ctx.fill();
  ctx.fillStyle = v.paint;
  roundBox(ctx, -L / 2, -W / 2, L, W, 7);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,28,40,0.85)';
  roundBox(ctx, -L / 2 + 9, -W / 2 + 4, L * 0.34, W - 8, 4);
  ctx.fill();
  roundBox(ctx, L * 0.08, -W / 2 + 4, L * 0.3, W - 8, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(L / 2 - 2, -W / 2 + 3, 3, 5);
  ctx.fillRect(L / 2 - 2, W / 2 - 8, 3, 5);
  ctx.fillStyle = '#ff2d2d';
  ctx.fillRect(-L / 2, -W / 2 + 3, 3, 5);
  ctx.fillRect(-L / 2, W / 2 - 8, 3, 5);
  if (v.role === 'police') {
    const flash = Math.floor(time * 6) % 2 === 0;
    ctx.fillStyle = flash ? '#ff2d2d' : '#2d7dff';
    ctx.fillRect(-4, -W / 2 + 2, 8, 6);
    ctx.fillStyle = flash ? '#2d7dff' : '#ff2d2d';
    ctx.fillRect(-4, W / 2 - 8, 8, 6);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PD', 0, 3);
  }
  if (v.spec.name === 'Solmar Taxi') {
    ctx.fillStyle = '#111';
    ctx.fillRect(-6, -W / 2 - 4, 12, 5);
  }
  ctx.restore();
}

function paintHero(ctx, S, view) {
  const h = S.hero;
  if (h.ride) return; // drawn as the car
  const x = h.x - view.x;
  const y = h.y - view.y;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 5, 11, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  if (h.grace > 0 && Math.floor(S.played * 12) % 2 === 0) ctx.globalAlpha = 0.45;
  ctx.fillStyle = '#f2a541'; // Jax's jacket
  ctx.beginPath();
  ctx.arc(0, 0, TUNE.heroRadius - 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(Math.cos(h.heading) * 4, Math.sin(h.heading) * 4, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1c1c1c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(h.heading) * 18, Math.sin(h.heading) * 18);
  ctx.stroke();
  ctx.restore();
}

function paintShots(ctx, S, view) {
  ctx.fillStyle = '#ffe9a8';
  for (const b of S.shots) {
    ctx.beginPath();
    ctx.arc(b.x - view.x, b.y - view.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintSparks(ctx, S, view) {
  for (const pt of S.sparks) {
    ctx.globalAlpha = Math.max(0, pt.life * 2.4);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x - view.x, pt.y - view.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---- HUD (DOM) ----
export function refreshHud(S, dom) {
  const h = S.hero;
  dom.cash.textContent = money(S.cash);
  dom.stars.textContent = '★'.repeat(S.stars) + '☆'.repeat(TUNE.maxStars - S.stars);
  dom.stars.style.color = S.stars > 0 ? '#ffd23e' : 'rgba(255,255,255,0.35)';
  dom.healthFill.style.width = Math.max(0, h.health) + '%';
  dom.healthFill.style.background = h.health > 50 ? '#40c057' : h.health > 25 ? '#fab005' : '#fa5252';
  dom.healthText.textContent = Math.ceil(Math.max(0, h.health)) + ' HP';
  dom.ammo.textContent = h.ride ? '—' : 'Ammo ' + h.ammo;
  dom.speed.textContent = h.ride
    ? Math.round(Math.abs(h.ride.speed) * 0.22) + ' km/h · ' + h.ride.spec.name
    : 'On foot';
  dom.clock.textContent = clockText(S.clock * 3600) + '  ·  ' + areaAt(S, h.x, h.y);
  dom.objective.textContent = S.objective || '';
  dom.timer.textContent = S.job && S.job.timer > 0 ? '⏱ ' + Math.ceil(S.job.timer) + 's' : '';
  dom.jobLabel.textContent = S.storyDone
    ? 'SOLMAR — story complete'
    : 'Mission ' + Math.min(S.jobIndex + 1, 5) + '/5';
  dom.mute.textContent = S.sounds && S.sounds.muted ? '🔇 Muted (M)' : '🔊 Sound (M)';
}

function areaAt(S, x, y) {
  if (y >= WORLD.sandTop) return 'Solmar Beach';
  for (const d of AREAS) {
    if (x >= d.x && x <= d.x + d.w && y >= d.y && y <= d.y + d.h) return d.name;
  }
  return 'Solmar City';
}

export function paintMinimap(ctx, S, w, h) {
  const sx = w / WORLD.width;
  const sy = h / WORLD.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#2f7fa8';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#e3cd96';
  ctx.fillRect(0, WORLD.sandTop * sy, w, (WORLD.seaTop - WORLD.sandTop) * sy);
  ctx.fillStyle = '#79a95b';
  ctx.fillRect(0, 0, w, WORLD.sandTop * sy);
  ctx.fillStyle = '#3c3f45';
  for (const vx of S.city.northStreets) ctx.fillRect(vx * sx - 1, 0, 2, WORLD.sandTop * sy);
  for (const hy of S.city.eastStreets) ctx.fillRect(0, hy * sy - 1, w, 2);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  for (const b of S.city.blocks) {
    ctx.fillRect(b.x * sx, b.y * sy, Math.max(1, b.w * sx), Math.max(1, b.h * sy));
  }
  if (S.target) {
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath();
    ctx.arc(S.target.x * sx, S.target.y * sy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd23e';
    ctx.beginPath();
    ctx.arc(S.target.x * sx, S.target.y * sy, 8 + Math.sin(S.played * 4) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const v of S.vehicles) {
    if (v.role !== 'police') continue;
    ctx.fillStyle = '#ff2d2d';
    ctx.beginPath();
    ctx.arc(v.x * sx, v.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const hero = S.hero;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(hero.x * sx, hero.y * sy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#111';
  ctx.beginPath();
  ctx.arc(hero.x * sx, hero.y * sy, 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.strokeRect(0, 0, w - 1, h - 1);
}
