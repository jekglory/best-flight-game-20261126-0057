# best-flight-game-20261126-0057

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/jekglory/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/jekglory/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

Meridian Run — a bush-plane courier game. Fly a little high-wing plane over a seeded valley: thread golden rings, land soft on island strips, and deliver a parcel through a storm on a short tank. Throttle makes speed, speed makes lift, and below stall speed the wing quits — fly it like a plane, not a rocket.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. No build step, no network: every file the game loads sits under `game/`.

## Play

- **↑/↓ or W/S** pitch, **←/→ or A/D** throttle, **Space** airbrake, **Shift** boost, **F** flaps
- **Mouse** steers pitch, **wheel** sets throttle, **click** boosts
- **P** pause, **M** sound, **1/2/3** pick a mission, **Enter** fly, **R** restart

## Missions

1. **RING RUN** — thread all 8 golden rings before the fuel runs dry.
2. **ISLAND HOP** — land gently on both island strips. Soft touchdowns only.
3. **STORM COURIER** — deliver the parcel through storm gusts and birds on 62% fuel.

The HUD shows altitude (ft), airspeed (kt) and heading on a compass strip, plus fuel and damage bars, an artificial horizon, an airspeed dial and an altimeter tape. Rings pay 500 points plus a speed bonus; a soft landing pays up to 1,000; leftover fuel and fast flying add a bonus.

## Layout

- `game/index.html` — page shell, loads the scripts in order
- `game/src/terrain.js` — seeded valley: ground, runways, rings, clouds, birds, trees
- `game/src/physics.js` — flight model: lift, stall, drag, fuel, damage, landings
- `game/src/aircraft.js` — the bush plane, drawn from paths, plus exhaust and smoke
- `game/src/missions.js` — the three sorties, scoring, win/loss verdicts
- `game/src/hud.js` — instruments and HUD: top bar, compass, dials, warnings
- `game/src/audio.js` — WebAudio synth: engine drone, ring chime, landing, crash
- `game/src/input.js` — keyboard and mouse
- `game/src/render.js` — sky, ridges, terrain, runways, rings, screens
- `game/src/main.js` — game loop, states, screenshot scenes, self-test
- `main.ts` — hand-in program: copies `game/` and `screenshots/` to `/output`, writes `dossier.json`
- `screenshots/` — 4 captures of the game running (start, play, danger, win)

## Self-test

Open `http://localhost:8080/?selftest=1` — 14 logic assertions (terrain, stall, fuel, rings, landings, birds, verdicts) run in the page and report PASS/FAIL in the corner.

---

<sub>Entered on [make.fun](https://make.fun/?ref=wkrc9se2&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
