# Solmar Heat — an open-world crime game

[![Make GTA 6](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![Rank](https://make.fun/badge/gta6-01/jefriidan15/solmar-heat/rank.svg)](https://make.fun/bounty/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/jefriidan15/solmar-heat/reward.svg)](https://make.fun/bounty/gta6-01)

**Solmar Heat** is an original open-world crime game for the
[make.fun "Make GTA 6" bounty](https://make.fun/bounty/gta6-01): a sun-soaked
coastal city to explore on foot and by car, with traffic, pedestrians, cars to
steal, a wanted level with responding police, a five-mission story, combat, a
HUD with a live minimap, a start screen and saving — all running offline from
static files in a desktop browser.

Everything is invented for this game: Solmar City, its streets, Jax, Rosa the
fixer, the Vipers, and every car, job and song. Nothing is taken from any
commercial game.

## Play

```sh
node serve.ts   # then open http://localhost:8080
```

Or open `game/index.html` from any static file server. No build step, no
network requests — every script is a file under `game/`.

- **WASD / arrows** — move on foot, drive in a car · **Shift** — run
- **E** — steal / enter a car, exit a car
- **Mouse + click / Space** — aim and shoot · **P / Esc** — pause · **M** — sound

## The game

- **The city:** a procedural coastal grid — Downtown towers, the Marina docks,
  Old Town, a park, a plaza, Solmar Beach and the pier, with day / dusk / night.
- **On foot and by car:** 6 original car models with arcade handling, parked
  cars and live traffic that follows the road network, pedestrians who flee
  trouble.
- **Wanted system:** stealing, hitting pedestrians and shooting raise your
  stars; Solmar PD interceptors chase, ram, and bust you on foot. Lay low and
  the heat cools off.
- **Missions:** Rosa's five-job story — *First Wheels*, *Sunset Courier*,
  *Pier Brawl*, *Heat Run*, *The Solmar Job* — then repeatable courier side
  jobs. Cash, ammo and health pickups; progress autosaves to the browser.
- **Combat:** pistol with ammo, rival Vipers who shoot back, muzzle flashes,
  sparks and crashes.
- **HUD:** cash, wanted stars, health, ammo, speed, clock, district name,
  mission objective with timer, and a live minimap with the mission marker.

## Layout

- `game/index.html` — the page, HUD and menus
- `game/src/tuning.js` — world size, tuning, cars, districts, jobs
- `game/src/seedrand.js` — seeded random + math helpers
- `game/src/metropolis.js` — procedural Solmar City (streets, blocks, beach, pier)
- `game/src/cast.js` — hero, cars, traffic, police, pedestrians, combat, loot
- `game/src/jobs.js` — the five-job story chain and side jobs
- `game/src/painter.js` — camera, world drawing, HUD, minimap
- `game/src/sounds.js` — synthesized WebAudio sound (no audio files)
- `game/src/controls.js` — keyboard + mouse
- `game/src/storage.js` — localStorage saves
- `game/src/tableaux.js` — deterministic screenshot scenes (`?shot=cover|street|pier|dusk`)
- `game/src/boot.js` — game loop and state machine
- `main.ts` — the make.fun entry program (copies `game/` + `screenshots/` to
  `/output`, writes `dossier.json`)
- `screenshots/` — 4 real renders of the game (cover first)

## License

MIT — see [LICENSE](LICENSE).
