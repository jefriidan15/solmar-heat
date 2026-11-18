// Save / load through localStorage: cash, job progress, stats, hero spot.
// A save is a plain JSON object under one key; corrupt saves are ignored.
import { SAVE_KEY } from './tuning.js';

export function readSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (typeof s !== 'object' || s === null) return null;
    return s;
  } catch {
    return null;
  }
}

export function storeSave(S) {
  try {
    const s = {
      cash: Math.round(S.cash),
      jobIndex: S.jobIndex,
      done: S.done,
      px: Math.round(S.hero.x),
      py: Math.round(S.hero.y),
      health: Math.round(S.hero.health),
      ammo: S.hero.ammo,
      played: Math.round(S.played),
      carsStolen: S.stats.carsStolen,
      bustedCount: S.stats.bustedCount,
      wastedCount: S.stats.wastedCount,
      savedAt: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch {
    // Storage full or unavailable: the game keeps running without a save.
  }
}

export function eraseSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}
