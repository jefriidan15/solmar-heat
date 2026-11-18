// Rosa's five-job story chain, plus repeatable courier side jobs once the
// story is finished. Each job is a small stage machine; tickJobs advances it
// and pays out on completion. Targets feed the HUD and the minimap.
import { JOBS } from './tuning.js';
import { raiseHeat, newWalker, dropLoot } from './cast.js';
import { randomStreetPoint } from './metropolis.js';

export function jobCount() {
  return JOBS.length;
}

export function beginJob(S, index) {
  const def = JOBS[index];
  if (!def) return false;
  S.jobIndex = index;
  S.job = { def, stage: 'start', timer: def.timeLimit || 0, grabFor: 0, startedAt: S.played };
  S.jobActive = def.id;
  S.vipersDown = 0;
  if (def.id === 'first-wheels') S.job.stage = 'steal';
  if (def.id === 'sunset-courier') S.job.stage = 'pickup';
  if (def.id === 'pier-brawl') {
    S.job.stage = 'fight';
    dropLoot(S, S.city.pier.x, S.city.pier.y + 30, 'health');
    for (let i = 0; i < 5; i++) {
      const v = newWalker(S.city.pier.x - 30 + i * 16, S.city.pier.y + 60 + (i % 2) * 40, S, true);
      S.walkers.push(v);
    }
    S.say('The Vipers are on the pier — take them down', 3000);
  }
  if (def.id === 'heat-run') {
    S.job.stage = 'escape';
    S.stars = 0;
    raiseHeat(S, 3, 'The whole Solmar PD is rolling');
  }
  if (def.id === 'solmar-job') {
    S.job.stage = 'bank';
    S.say('Hit the bank, then run for the hideout', 3000);
  }
  S.say(def.title + ' — ' + def.brief, 5200);
  return true;
}

export function beginSideJob(S) {
  const a = randomStreetPoint(S.city, S.rng);
  const b = randomStreetPoint(S.city, S.rng);
  const pay = 150 + Math.floor(S.rng() * 250);
  S.job = {
    def: { id: 'side-courier', title: 'Side Job — Courier', giver: 'Rosa', brief: 'Quick cash run.', goal: 'Deliver the package', reward: pay },
    stage: 'pickup', timer: 120, grabFor: 0, startedAt: S.played,
    pickupAt: a, deliverAt: b,
  };
  S.jobActive = 'side-courier';
  S.say('Side job: pick up the package, deliver it for $' + pay, 3600);
}

// Where the yellow marker points, or null when there is nothing to show.
export function jobTarget(S) {
  const j = S.job;
  if (!j) return null;
  const c = S.city;
  switch (j.def.id) {
    case 'first-wheels':
      return j.stage === 'steal' ? null : { x: c.garage.x, y: c.garage.y, r: 60, label: "Rosa's Garage" };
    case 'sunset-courier':
      return j.stage === 'pickup'
        ? { x: c.docks.x, y: c.docks.y, r: 55, label: 'Docks — package' }
        : { x: c.hotel.x, y: c.hotel.y, r: 60, label: 'Grand Solmar — deliver' };
    case 'pier-brawl':
      return { x: c.pier.x, y: c.pier.y + 90, r: 120, label: 'Solmar Pier — Vipers ' + S.vipersDown + '/5' };
    case 'heat-run':
    case 'solmar-job':
      return j.stage === 'bank'
        ? { x: c.bank.x, y: c.bank.y, r: 55, label: 'Solmar Bank' }
        : { x: c.hideout.x, y: c.hideout.y, r: 60, label: 'Hideout' };
    case 'side-courier':
      return j.stage === 'pickup'
        ? { x: j.pickupAt.x, y: j.pickupAt.y, r: 50, label: 'Package pickup' }
        : { x: j.deliverAt.x, y: j.deliverAt.y, r: 55, label: 'Deliver here' };
    default:
      return null;
  }
}

export function jobLine(S) {
  const j = S.job;
  if (!j) {
    return S.jobIndex >= JOBS.length
      ? 'Free roam — a side job is coming, or just enjoy Solmar'
      : 'Talk to Rosa to start the next job';
  }
  switch (j.def.id) {
    case 'first-wheels': return j.stage === 'steal' ? 'Steal a car (E near a car)' : "Drive it to Rosa's garage";
    case 'sunset-courier': return j.stage === 'pickup' ? 'Pick up the package at the Marina docks' : 'Deliver it to the Grand Solmar hotel';
    case 'pier-brawl': return 'Defeat the Vipers on the pier (' + S.vipersDown + '/5)';
    case 'heat-run': return 'Lose the police — reach the Old Town hideout';
    case 'solmar-job': return j.stage === 'bank' ? 'Grab the cash at Solmar Bank (stay in the vault)' : 'Escape to the hideout with the cash';
    case 'side-courier': return j.stage === 'pickup' ? 'Pick up the package' : 'Deliver the package';
    default: return j.def.goal;
  }
}

function heroAt(S, target, radius) {
  const h = S.hero;
  const x = h.ride ? h.ride.x : h.x;
  const y = h.ride ? h.ride.y : h.y;
  const dx = x - target.x;
  const dy = y - target.y;
  return dx * dx + dy * dy < radius * radius;
}

function finishJob(S) {
  const j = S.job;
  const pay = j.def.reward;
  S.cash += pay;
  S.done.push(j.def.id);
  if (S.sounds) { S.sounds.missionDone(); S.sounds.cash(); }
  S.say('Job done — +$' + pay, 3400);
  S.job = null;
  S.jobActive = null;
  S.jobIndex++;
  if (S.jobIndex < JOBS.length) {
    S.jobReady = true;
    S.say('Next job is waiting — drive to Rosa\'s garage to start it', 3600);
  } else if (!S.storyDone) {
    S.storyDone = true;
    S.say('KING OF SOLMAR — you ran the whole story. Free roam + side jobs now.', 6000);
  }
}

function failJob(S, why) {
  S.say('Job failed: ' + why + ' — Rosa will give you another shot', 3600);
  S.job = null;
  S.jobActive = null;
  S.walkers = S.walkers.filter((w) => !w.viper);
  S.vipersDown = 0;
  S.jobReady = true;
}

export function tickJobs(S, dt) {
  const j = S.job;
  if (!j) {
    // Start the next story job when Jax reaches Rosa's garage.
    if (S.jobReady && S.jobIndex < JOBS.length) {
      const h = S.hero;
      const dx = h.x - S.city.garage.x;
      const dy = h.y - S.city.garage.y;
      if (dx * dx + dy * dy < 90 * 90) beginJob(S, S.jobIndex);
    } else if (!S.job && S.storyDone && S.played - (S.lastSideAt || 0) > 8) {
      S.lastSideAt = S.played;
      beginSideJob(S);
    }
    return;
  }
  if (j.timer > 0) {
    j.timer -= dt;
    if (j.timer <= 0) { failJob(S, 'out of time'); return; }
  }
  const target = jobTarget(S);
  switch (j.def.id) {
    case 'first-wheels':
      if (j.stage === 'steal' && S.hero.ride) j.stage = 'deliver';
      else if (j.stage === 'deliver' && target && heroAt(S, target, target.r)) finishJob(S);
      break;
    case 'sunset-courier':
      if (j.stage === 'pickup' && target && heroAt(S, target, target.r)) {
        j.stage = 'deliver';
        S.say('Package secured — get it to the hotel', 2600);
      } else if (j.stage === 'deliver' && target && heroAt(S, target, target.r)) finishJob(S);
      break;
    case 'pier-brawl':
      if (S.vipersDown >= 5) {
        dropLoot(S, S.city.pier.x, S.city.pier.y + 90, 'cash');
        finishJob(S);
      }
      break;
    case 'heat-run':
      if (target && heroAt(S, target, target.r)) {
        S.stars = 0;
        S.vehicles = S.vehicles.filter((v) => v.role !== 'police');
        S.bustTimer = 0;
        finishJob(S);
      }
      break;
    case 'solmar-job':
      if (j.stage === 'bank' && target) {
        if (heroAt(S, target, target.r)) {
          j.grabFor += dt;
          if (j.grabFor > 1.5 && S.stars < 2) raiseHeat(S, 2, 'Bank alarm tripped');
          if (j.grabFor >= 5) {
            j.stage = 'escape';
            raiseHeat(S, 2, 'The vault is open — RUN');
            S.say('Cash grabbed — lose the cops and reach the hideout', 3400);
          }
        } else {
          j.grabFor = Math.max(0, j.grabFor - dt * 2);
        }
      } else if (j.stage === 'escape' && target && heroAt(S, target, target.r)) {
        S.stars = 0;
        S.vehicles = S.vehicles.filter((v) => v.role !== 'police');
        S.bustTimer = 0;
        finishJob(S);
      }
      break;
    case 'side-courier':
      if (j.stage === 'pickup' && target && heroAt(S, target, target.r)) {
        j.stage = 'deliver';
        S.say('Package picked up', 1800);
      } else if (j.stage === 'deliver' && target && heroAt(S, target, target.r)) finishJob(S);
      break;
    default:
      break;
  }
  // Keep the wanted level honest: no cops left, no heat.
  if (S.stars > 0) {
    S.heatTimer += dt;
    const seen = S.vehicles.some((v) => v.role === 'police');
    if (!seen && S.heatTimer > 12) {
      S.stars = 0;
      S.say('You slipped away — heat is off', 2200);
    } else if (S.heatTimer > 26) {
      S.stars = Math.max(0, S.stars - 1);
      S.heatTimer = 0;
      if (S.stars === 0) S.say('Heat is off', 1800);
    }
  } else {
    S.heatTimer = 0;
  }
}
