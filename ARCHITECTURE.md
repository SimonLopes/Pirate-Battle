# Architecture

## Folders

```
src/
  main.tsx          starts MSW, then renders React
  App.tsx           screen flow (menu, game, result) and saving matches
  audio.ts          sound effects and loops (Web Audio)
  api/              axios client, types, player id, pending queue, useMatchSave
  game/
    config.ts       every gameplay number
    core/           the simulation, no Pixi and no DOM
    render/         Pixi app, asset loading, renderer, effects
    input/          keyboard, touch layout, joystick
    hud/            React HUD and the store it reads
    GameSession.ts  wires sim, input, render and sound for one match
  menu/             Menu, Options, Ranking, History, Result, NetworkPanel
  mocks/            MSW handlers, scenarios, fixtures, localStorage store
  lib/              storage and validation helpers
  ui/               shared React components
e2e/                Playwright specs
```

## Simulation and rendering

I kept the simulation in `game/core` as plain TypeScript with no idea that Pixi or React exist. That made it easy to unit test and to step by hand from Playwright. Each call to `step(world, dt, actions)` advances the match by one tick, moving ships, resolving collisions, firing and moving cannonballs, applying hits, running the enemies and spawns, and ending the match when time or hp runs out.

The renderer only reads the world and moves sprites to match it, it never writes back. The one thing the simulation hands outward is a list of sound cues in `world.cues`, which `GameSession` plays and clears after each step.

## The loop

The simulation runs on a fixed timestep of 1/60 s. `GameSession` adds the Pixi ticker delta to an accumulator and runs as many steps as fit, up to 5 per frame. If a frame takes longer than that, I drop the leftover time instead of trying to catch up, so a slow device doesn't spiral. After a pause or a hidden tab I also skip the first frame, otherwise the timer would jump forward.

With `?test=1` the ticker stops driving the simulation, and tests call `__PIRATE__.step(ms)` instead. That runs the same `step()` with the same inputs and still renders, so the tests exercise the real rules and drawing, they just control the clock.

## Randomness

`core/rng.ts` is a small seeded generator. Each match gets a seed (the current time, or one the tests set), and gameplay draws from `world.rng` for spawn positions and enemy types. Sound variants use a second generator, `cueRng`, so playing a sound never shifts the gameplay sequence. The same seed always gives the same match.

## Input

Keyboard and touch both write into a single `Actions` object (thrust, turn and the three fire buttons), and the simulation only ever looks at that. This way I didn't need any special cases for mobile in the game logic. The joystick compares its direction with the ship heading and turns it into forward plus turn left or right, with a small dead zone. Keys are only captured while the match is running, so the menus keep normal keyboard behaviour.

## HUD

The HUD reads from a tiny external store in `hud/store.ts` through `useSyncExternalStore`. `GameSession` publishes score, hp, seconds left and status, and the store only notifies when one of those actually changed, so React renders about once a second instead of every frame. Screen reader announcements (match started, paused, low hp, match over) go through the same store into an aria-live region.

## Lifecycle

`GameCanvas` creates the Pixi `Application` in an effect and destroys it in the cleanup. Because `app.init` is async, I keep an `alive` flag: if Strict Mode, or the player leaving quickly, unmounts the component before init finishes, the app is destroyed as soon as init resolves. `GameSession.destroy()` removes the ticker callback and the keyboard, blur and visibility listeners, destroys the renderer and stops the sounds. Restarting destroys the old session and builds a new one. Textures load once and stay cached, and the loading screen shows progress with a retry button if something fails.

## Collisions

Each ship is a circle, with the hull circle offset a bit forward from the sprite center (`hullOffset`) so it matches the shape of the boat better. Islands come from the map as circle and rectangle colliders. Hulls are pushed out of colliders and clamped inside the arena. Cannonballs disappear when they hit an island, leave the arena, or run out of range or lifetime. A player ball damages the first enemy it touches and is removed in the same step, so one ball can never score twice. A chaser that rams the player deals its damage and is removed.

## Spawning

A match starts with one chaser and one shooter, and then a new ship arrives every spawn interval, half chasers and half shooters. Positions are random from the match rng, but I only accept a spot in open water at least 24 px from any island, 48 px from the edges, 520 px from the player and not on top of another enemy. If 30 tries don't find a spot, that spawn is skipped and the next one comes after the normal interval.

## Balance

The current values in `config.ts` are a 90 s match with a spawn every 5 s. The player has 140 hp and sails at 180 px/s. A cannonball deals 10 damage, flies at 400 px/s and lasts up to 560 px or 1.4 s. The front cannon reloads in 0.3 s and the broadsides in 0.8 s. A chaser has 20 hp, moves at 120 px/s and deals 20 when it rams you. A shooter has 30 hp, moves at 90 px/s, and stops to fire when it's within 320 px, every 2.2 s.

I started with a harder setup (100 hp, 120 s, spawns every 3 s and tougher enemies), but it felt unfair, especially on touch, so I eased it. The spawn interval can't go below 2 s, because at 1 s enemies pile up faster than you can sink them. There's no ramp, the pressure comes from the enemies you leave alive.

## API

HTTP goes through an Axios client in `api/client.ts` (base `/api`, 8 s timeout), and everything on top of it uses TanStack Query. There are three endpoints:

- `GET /api/ranking?page&pageSize&sessionTime&spawnInterval`
- `GET /api/players/:playerId/history?page&pageSize`
- `PUT /api/matches/:matchId` with the full record

A record has the match id, player id and name, `playedAt`, score, `durationMs`, the end reason (time or death) and the config used (session time and spawn interval). The types in `api/types.ts` are shared with the mocks.

The ranking only compares matches played with the same config as your current options, because scores from a 60 s match and a 180 s match aren't comparable. It sorts by score, then shorter duration, then older `playedAt`, and finally `matchId` so the order is always deterministic. History is newest first.

The queries use `keepPreviousData` and `refetchOnMount: 'always'`, and the page is part of the query key, so a late answer for an old page can't land on the current one. Failed queries retry up to 2 times on network or 5xx errors, but not on 4xx. After a successful save I invalidate both ranking and history.

I save with a PUT keyed by a `matchId` generated on the client, which makes it idempotent: if the id already exists, the mock returns the stored record instead of adding a second one. Before sending, the record goes into a pending queue in localStorage (`pirate-battle.pending`) and only leaves it on success. When the app starts it sends whatever is still in the queue. The result screen shows saving, saved or failed with a Retry button, and you can start another match while a record is still pending.

## MSW

MSW runs in dev, in the tests and in production. The worker file is in `public/` and is registered with `BASE_URL`. If the worker can't start, the menu shows "Ranking is unavailable right now" and the game still works. Confirmed records are stored in localStorage and merged with the fixtures, so both tabs always read the same data. The scenario and seed come from the URL or the Network debug panel, and the jitter latency is derived from the seed so tests stay reproducible.

## Local storage

I keep the options, the last result (so it still shows after a reload), the player id and the pending queue in localStorage, plus the mock store and the network settings. Every read is validated, and every write is wrapped so a full or blocked storage can't crash the game.

## Tests

The unit tests (`node --test`) cover combat and spawn rules. Everything else is in Playwright, running on desktop Chromium and Pixel 7 landscape. That covers options, asset loading and failures, movement and islands, cannons and cooldowns, enemy behaviour, ending by time and by death, pause and blur, result persistence, quitting, touch controls, ranking and history states, saving, pending recovery, and retrying after a timeout. The tests use `?test=1` with a fixed seed and step the clock by hand, but they press the real keys and touch controls. There are visual snapshots of the menu, the arena and the result screen.

## Limitations

Enemies head straight for the player and slide along islands, since there's no pathfinding, so one can get stuck behind an island for a while. The visual baselines only exist for Windows. The mock API lives in each browser's localStorage, so there's no shared backend.
