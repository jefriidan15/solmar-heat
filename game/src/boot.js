// Solmar Heat — game loop and state machine.
// Menu -> playing -> paused / busted / wasted, with autosave, toasts, the HUD,
// the minimap and the ?shot= scenes. All original: Solmar City, Jax, Rosa,
// the Vipers and every car, street and job are invented for this game.
import { TUNE, AREAS } from './tuning.js';
import { makeRng, money } from './seedrand.js';
import { buildCity } from './metropolis.js';
import { Controls } from './controls.js';
import { SoundBank } from './sounds.js';
import { readSave, storeSave, eraseSave } from './storage.js';
import {
  newHero, fillBays, fillTraffic, fillWalkers,
  tickHero, tickVehicles, tickWalkers, tickShots,
  tickLoot, tickSparks, dropLoot,
} from './cast.js';
import { jobTarget, jobLine, tickJobs, jobCount } from './jobs.js';
import { makeView, follow, paintWorld, paintMinimap, refreshHud } from './painter.js';
import { stageScene } from './tableaux.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const mini = document.getElementById('minimap');
const mctx = mini.getContext('2d');

const dom = {
  cash: document.getElementById('hud-cash'),
  stars: document.getElementById('hud-stars'),
  healthFill: document.getElementById('hud-health-fill'),
  healthText: document.getElementById('hud-health-text'),
  ammo: document.getElementById('hud-ammo'),
  speed: document.getElementById('hud-speed'),
  clock: document.getElementById('hud-clock'),
  objective: document.getElementById('hud-objective'),
  timer: document.getElementById('hud-timer'),
  jobLabel: document.getElementById('hud-mission-label'),
  mute: document.getElementById('hud-mute'),
  toast: document.getElementById('hud-toast'),
  menu: document.getElementById('menu'),
  menuSave: document.getElementById('menu-save'),
  pause: document.getElementById('pause'),
  end: document.getElementById('end'),
  endTitle: document.getElementById('end-title'),
  endText: document.getElementById('end-text'),
};

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') || 20261118);
const shot = params.get('shot') || '';

const S = {
  seed,
  rng: makeRng(seed),
  city: buildCity(seed),
  areas: AREAS,
  elapsed: 0, // seconds since load (drives flashing/pulsing)
  played: 0, // seconds of actual play
  clock: 10.0, // 10:00 morning
  cash: 150,
  stars: 0,
  heatTimer: 0,
  bustTimer: 0,
  busted: false,
  hero: null,
  vehicles: [],
  walkers: [],
  shots: [],
  loot: [],
  sparks: [],
  jobIndex: 0,
  job: null,
  jobActive: null,
  jobReady: true,
  done: [],
  storyDone: false,
  vipersDown: 0,
  dangerX: 0, dangerY: 0,
  stats: { carsStolen: 0, bustedCount: 0, wastedCount: 0 },
  shotMode: false,
  lastSideAt: 0,
  sounds: new SoundBank(),
  target: null,
  objective: '',
  aim: { x: 0, y: 0 },
};

S.say = (text, ms = 2400) => {
  dom.toast.textContent = text;
  dom.toast.classList.add('show');
  clearTimeout(S.say._t);
  S.say._t = setTimeout(() => dom.toast.classList.remove('show'), ms);
};

S.hero = newHero(S.city);
fillBays(S, 10);
fillTraffic(S, TUNE.trafficCars);
fillWalkers(S, TUNE.walkers);
// A few pickups scattered in the world to find.
dropLoot(S, 1350, 930, 'health');
dropLoot(S, 2430, 1050, 'ammo');
dropLoot(S, 630, 1650, 'cash');

const input = new Controls(canvas);
const view = makeView(canvas.width, canvas.height);
let mode = 'menu'; // menu | playing | paused | busted | wasted
let saveTimer = 0;
let last = performance.now();

function show(el, on) { el.classList.toggle('hidden', !on); }

function startGame(fresh) {
  S.sounds.ensure();
  S.sounds.engineStart();
  show(dom.menu, false);
  show(dom.pause, false);
  show(dom.end, false);
  mode = 'playing';
  if (fresh) S.say("Welcome to Solmar — steal a car, then visit Rosa's garage", 4200);
}

function applySave(save) {
  S.cash = save.cash ?? 150;
  S.jobIndex = save.jobIndex ?? 0;
  S.done = Array.isArray(save.done) ? save.done : [];
  S.storyDone = S.jobIndex >= jobCount();
  S.jobReady = true;
  S.hero.x = save.px ?? S.city.spawn.x;
  S.hero.y = save.py ?? S.city.spawn.y;
  S.hero.health = save.health ?? TUNE.heroHealth;
  S.hero.ammo = save.ammo ?? TUNE.ammoStart;
  S.stats.carsStolen = save.carsStolen || 0;
  S.stats.bustedCount = save.bustedCount || 0;
  S.stats.wastedCount = save.wastedCount || 0;
  S.played = save.played || 0;
}

function respawn(reason) {
  const h = S.hero;
  if (h.ride) { h.ride.role = 'parked'; h.ride.speed = 0; h.ride = null; }
  h.x = S.city.clinic.x;
  h.y = S.city.clinic.y;
  h.health = TUNE.heroHealth;
  h.grace = 2;
  S.stars = 0;
  S.bustTimer = 0;
  S.busted = false;
  S.vehicles = S.vehicles.filter((v) => v.role !== 'police');
  const fine = reason === 'busted' ? Math.min(S.cash, 100) : Math.min(S.cash, 150);
  S.cash -= fine;
  if (reason === 'busted') { S.stats.bustedCount++; S.sounds.busted(); }
  else { S.stats.wastedCount++; S.sounds.wasted(); }
  storeSave(S);
}

function endScreen(kind) {
  mode = kind;
  const fine = kind === 'busted' ? 100 : 150;
  dom.endTitle.textContent = kind === 'busted' ? 'BUSTED' : 'WASTED';
  dom.endTitle.style.color = kind === 'busted' ? '#4dabf7' : '#fa5252';
  dom.endText.textContent = kind === 'busted'
    ? 'The Solmar PD caught up with you. Bail is $' + fine + ' — Rosa is already working on it.'
    : 'You went down in Solmar. The hospital patched you up for $' + fine + ' — the city is still yours.';
  show(dom.end, true);
}

function togglePause() {
  if (mode === 'playing') { mode = 'paused'; show(dom.pause, true); storeSave(S); }
  else if (mode === 'paused') { mode = 'playing'; show(dom.pause, false); }
}

function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.05) dt = 0.05;
  if (dt <= 0) dt = 0.001;
  S.elapsed += dt;

  // Mouse position in world coordinates (canvas is scaled by CSS).
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  S.aim.x = view.x + input.mouseX * sx;
  S.aim.y = view.y + input.mouseY * sy;

  if (mode === 'playing') {
    S.played += dt;
    S.clock = (S.clock + (dt / TUNE.daySecs) * 24) % 24;
    tickHero(S, input, dt);
    tickVehicles(S, dt);
    tickWalkers(S, dt);
    tickShots(S, dt);
    tickLoot(S, dt);
    tickSparks(S, dt);
    tickJobs(S, dt);
    S.target = jobTarget(S);
    S.objective = jobLine(S);
    if (S.sounds) {
      S.sounds.siren(S.stars > 0, S.elapsed);
      S.sounds.groove(dt, true);
    }
    saveTimer += dt;
    if (saveTimer > 15) { saveTimer = 0; storeSave(S); }
    if (S.busted) { respawn('busted'); endScreen('busted'); }
    else if (S.hero.health <= 0) { respawn('wasted'); endScreen('wasted'); }
    if (input.tapped('p', 'P', 'Escape')) togglePause();
    if (input.tapped('m', 'M')) {
      S.sounds.ensure();
      const m = S.sounds.toggleMute();
      S.say(m ? 'Sound off' : 'Sound on', 1200);
    }
  } else if (mode === 'menu') {
    // Slow drift over the city behind the title screen.
    const t = S.elapsed * 0.008;
    follow(view, 900 + Math.sin(t) * 700, 900 + Math.cos(t * 0.7) * 500);
    S.target = null;
  } else if (mode === 'paused') {
    if (input.tapped('p', 'P', 'Escape')) togglePause();
    if (input.tapped('m', 'M')) {
      const m = S.sounds.toggleMute();
      S.say(m ? 'Sound off' : 'Sound on', 1200);
    }
  } else if (mode === 'busted' || mode === 'wasted') {
    if (input.tapped('Enter', ' ')) { show(dom.end, false); mode = 'playing'; }
  }

  if (mode !== 'menu') follow(view, S.hero.x, S.hero.y);
  paintWorld(ctx, S, view);
  paintMinimap(mctx, S, mini.width, mini.height);
  if (mode !== 'menu') refreshHud(S, dom);
  input.endFrame();
  if (!window.__solmarReady) {
    window.__solmarReady = true;
    window.__solmar = S;
    document.title = 'Solmar Heat — ready';
  }
}

// ---- Menu wiring ----
const saved = readSave();
if (saved) {
  dom.menuSave.textContent = 'Save found: ' + money(saved.cash) + ', mission ' + Math.min((saved.jobIndex ?? 0) + 1, 5) + '/5 — Continue picks it up.';
  document.getElementById('btn-continue').classList.remove('hidden');
}
document.getElementById('btn-start').addEventListener('click', () => {
  eraseSave();
  S.cash = 150;
  S.jobIndex = 0;
  S.done = [];
  S.storyDone = false;
  S.jobReady = true;
  startGame(true);
});
document.getElementById('btn-continue').addEventListener('click', () => {
  if (saved) applySave(saved);
  startGame(false);
});
document.getElementById('btn-resume').addEventListener('click', togglePause);
document.getElementById('btn-quit').addEventListener('click', () => {
  storeSave(S);
  show(dom.pause, false);
  mode = 'menu';
  show(dom.menu, true);
});
document.getElementById('btn-end').addEventListener('click', () => {
  show(dom.end, false);
  mode = 'playing';
});
dom.mute.addEventListener('click', () => {
  S.sounds.ensure();
  const m = S.sounds.toggleMute();
  S.say(m ? 'Sound off' : 'Sound on', 1200);
});

// Screenshot scenes start the game immediately, no menu.
if (shot) {
  show(dom.menu, false);
  if (stageScene(S, shot)) {
    S.sounds.ensure();
    mode = 'playing';
    document.title = 'Solmar Heat — shot ' + shot;
  } else {
    document.title = 'Solmar Heat — unknown shot';
  }
}

requestAnimationFrame(frame);
