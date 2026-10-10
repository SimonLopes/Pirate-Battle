# Pirate Battle

Live: https://pirate-battle-simon.vercel.app/

A small top-down naval combat game I built for the Jungle Gaming front-end test. The menus and HUD are React, the arena is PixiJS, and the ranking and history API is mocked with MSW, also in the deployed build.

## Setup

You need Node 22.6 or newer, because the unit tests run TypeScript directly with `--experimental-strip-types`.

```
npm install
npm run dev
```

There are no environment variables. The API is mocked by the service worker in `public/mockServiceWorker.js`, so there's nothing to configure.

## Commands

```
npm run dev         # vite dev server
npm run build       # typecheck + production build
npm run preview     # serve the build
npm run lint
npm run typecheck
npm test            # unit tests (node --test, src/**/*.test.ts)
npx playwright install chromium
npx playwright test # e2e, builds and serves the preview on 4175 by itself
npx playwright show-report
```

Playwright runs two projects, `chromium` (Desktop Chrome) and `mobile` (Pixel 7 landscape). It writes an HTML report and keeps traces for failed tests. I generated the visual baselines in `e2e/visual.spec.ts-snapshots` on Windows, so on Linux or macOS you'll need to run `npx playwright test visual --update-snapshots` once first.

## Controls

On desktop:

- W or Up to sail forward, S or Down to reverse
- A/D or Left/Right to turn
- Space fires the front cannon
- Q and E fire the left and right broadsides (three balls each)
- Esc or P pauses and resumes

The game only captures these keys while a match is running. If the window loses focus or the tab is hidden, the match pauses.

On mobile the game is landscape only, and portrait shows a message asking you to rotate. The joystick is on the left: point it where you want to go and the ship turns and sails that way. The buttons on the right fire the front, left and right cannons, and there's a pause button. A fullscreen button shows up when the browser supports the Fullscreen API, and there's also an option to go fullscreen automatically on touch devices.

## Gameplay config

The Options screen has:

- Game session time, 60 to 180 s in steps of 5, default 90
- Enemy spawn time, 2 to 10 s, default 5
- Captain name, 3 to 16 characters
- Fullscreen on mobile
- Mute sounds

Options are saved in localStorage. Each match takes a snapshot of them when it starts, so a change only applies to the next match.

Everything else (hp, speeds, cooldowns, ranges, spawn rules) lives in `src/game/config.ts`. I explain the current values in ARCHITECTURE.md.

You get 1 point for every enemy you sink with your cannonballs. A chaser that rams you dies too, but it doesn't give points.

## Network scenarios

The "Network debug" pill at the bottom left of the menu has a scenario select, a seed and a Reset button. You can also set them in the URL, for example `?scenario=server-error&seed=42`. The choice is kept in localStorage.

The scenarios are success, empty, many-pages, slow, jitter, out-of-order, timeout, network-error, server-error, client-error (404), ranking-fail, history-fail, timeout-after-save and offline-on-finish.

Reset goes back to `success` with seed 1337, clears the saved matches and the pending queue, and refetches ranking and history.

To reproduce the failures:

- Save fails and recovers: pick `offline-on-finish` and finish a match. The result screen shows the error with a Retry button. Switch back to `success` and press Retry, or just reload, since pending records are sent again on start.
- Timeout after save: `timeout-after-save` stores the record but never answers. Switch to `success` and retry, and you get the same record back (it's a PUT by matchId), so nothing is duplicated.
- Out of order: `out-of-order` alternates slow (1.6 s) and fast (0.1 s) answers. Flip pages quickly and the old answer won't replace the new one.
- `slow` and `jitter` show the loading states, `empty` and `many-pages` show the empty state and pagination.

If a scenario like `client-error` is left selected, saving a match returns 404. That's the scenario doing its job, just press Reset.

## Dev params

- `?debug=1` draws the colliders
- `?perf=1` records frame times and shows a perf summary at the end of the match
- `?test=1` exposes `window.__PIRATE__` (getState, setSeed, step) and lets the clock be driven by hand, which the e2e tests use
- `?scenario=` and `?seed=` set the network mocks

## Time

The company gave a 2 day deadline. I didn't make an estimate of my own beyond planning the work inside that window, and in the end I spent about 20 hours over the two days.

## What I cut and would do next

Enemies don't steer around islands, they just slide along them. Proper avoidance, or even a simple flow field, is the first thing I'd add.

There's no difficulty ramp. The spawn interval stays fixed for the whole match on purpose, so the option means what it says.

Sound is just on or off, there's no volume control.

I'd also add more unit tests for the core (enemies and cannons). Right now most of that is covered by the e2e tests.
