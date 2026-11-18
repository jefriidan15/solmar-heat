// Solmar Heat — world geometry, tuning, vehicle roster, districts and jobs.
// All names, places and people are invented for this game.
export const WORLD = {
  width: 3600,
  height: 2600,
  streetGap: 300, // centreline-to-centreline distance of the street grid
  streetHalf: 34, // half the asphalt width of a street
  kerb: 14, // pavement strip beside each street
  sandTop: 2280, // sand begins here
  seaTop: 2440, // water begins here
};

export const TUNE = {
  walk: 175, // px/s on foot
  sprint: 268, // px/s holding Shift
  heroRadius: 13,
  heroHealth: 100,
  shotDamage: 34,
  shotRange: 420,
  shotCooldown: 0.28,
  ammoStart: 24,
  heatDecaySecs: 26, // one star fades after this long unseen
  ramDamage: 9,
  bustSecs: 1.4, // a cop standing on you this long busts you
  trafficCars: 16,
  walkers: 46,
  maxStars: 5,
  daySecs: 420, // one full in-game day
};

export const VEHICLES = [
  { name: 'Vela', paint: '#e8b23a', top: 330, accel: 210, grip: 2.6, len: 46, wid: 22 },
  { name: 'Comet GT', paint: '#d23b3b', top: 430, accel: 265, grip: 3.1, len: 48, wid: 22 },
  { name: 'Bruto', paint: '#3f6fb5', top: 300, accel: 185, grip: 2.3, len: 52, wid: 24 },
  { name: 'Solmar Taxi', paint: '#f2c230', top: 350, accel: 220, grip: 2.7, len: 47, wid: 22 },
  { name: 'Marlin', paint: '#2fb5a5', top: 390, accel: 240, grip: 2.9, len: 47, wid: 22 },
  { name: 'Patrol Interceptor', paint: '#22262e', top: 400, accel: 280, grip: 3.3, len: 49, wid: 23 },
];

export const AREAS = [
  { name: 'Downtown Solmar', x: 900, y: 500, w: 1500, h: 800 },
  { name: 'Marina', x: 300, y: 1500, w: 900, h: 700 },
  { name: 'Old Town', x: 2400, y: 1500, w: 900, h: 700 },
  { name: 'Solmar Beach', x: 300, y: 2280, w: 3000, h: 320 },
];

export const JOBS = [
  {
    id: 'first-wheels',
    title: '1 — First Wheels',
    giver: 'Rosa',
    brief: 'New in Solmar? Everybody drives. Take any car off the street — quick, before its owner notices — and bring it to my garage.',
    goal: 'Steal a car and drive it to Rosa\'s garage',
    reward: 300,
  },
  {
    id: 'sunset-courier',
    title: '2 — Sunset Courier',
    giver: 'Rosa',
    brief: 'A package is waiting at the Marina docks. The buyer is at the Grand Solmar hotel, and he does not wait. Two and a half minutes.',
    goal: 'Pick up the package at the docks, deliver it to the hotel',
    reward: 600,
    timeLimit: 150,
  },
  {
    id: 'pier-brawl',
    title: '3 — Pier Brawl',
    giver: 'Rosa',
    brief: 'The Vipers think the pier is theirs. Go down there and change their minds. They are armed — so are you.',
    goal: 'Defeat the Vipers on the pier (0/5)',
    reward: 900,
  },
  {
    id: 'heat-run',
    title: '4 — Heat Run',
    giver: 'Rosa',
    brief: 'Somebody talked. The whole Solmar PD is rolling. Lose them and get to the hideout under the Old Town bridge.',
    goal: 'Lose the police and reach the hideout',
    reward: 1200,
  },
  {
    id: 'solmar-job',
    title: '5 — The Solmar Job',
    giver: 'Rosa',
    brief: 'One job and we are done being small. The Solmar Bank vault, then gone before the sirens even start. Bring the cash home.',
    goal: 'Grab the cash at Solmar Bank, then escape to the hideout',
    reward: 2500,
  },
];

export const PEOPLE = {
  rosa: { name: 'Rosa Delgado', role: 'Fixer — Rosa\'s Garage, Downtown' },
  vipers: { name: 'The Vipers', role: 'Rival crew — Solmar Pier' },
};

export const SAVE_KEY = 'solmar-heat-save-v2';
