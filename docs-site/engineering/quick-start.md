---
title: Setup, Commands & Troubleshooting
description: Run the Astronaut Health Intelligence Platform locally, the available commands, your first two minutes in the app and fixes for common problems.
status: IMPLEMENTED
code:
  - frontend/web/package.json
  - frontend/web/vite.config.ts
verified: 2026-11-14
---

# Setup, Commands & Troubleshooting

The Astronaut Health Intelligence Platform (AHI) runs entirely in the browser. There is no backend and no database: the simulation, the health engine and the 3D viewer all run on your machine. After `npm install` the demo works offline.

## Requirements

| Requirement | Notes |
| --- | --- |
| Node.js 20 or newer | Includes npm |
| A desktop browser with WebGL | Chrome, Edge or Firefox with hardware acceleration on |
| Screen | Best at 1440x900 or larger. Short laptop screens get a compact layout |

## Install and run

```bash
git clone https://github.com/lucaspalharesbarbosa/astronaut-health-intelligence-platform.git
cd astronaut-health-intelligence-platform/frontend/web
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). You will see a short loading screen ("Connecting simulated devices and calibrating personal baselines...") and then the Ground view.

## Other commands

Run these inside `frontend/web`.

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server on port 5173 |
| `npm test` | Engine unit and scenario tests (vitest) |
| `npx tsc -b` | Typecheck (also `npm run typecheck`) |
| `npx vite build` | Production build into `dist/` (`npm run build` runs the typecheck first) |
| `npm run preview` | Serve the production build locally |
| `npm run evaluate` | Replays the scenarios headless and regenerates `src/engine/evaluation.json` and `docs/model-card.md` |
| `npm run lint` | Lint with oxlint |
| `node scripts/osdr/discover.mjs` | Searches NASA OSDR and writes `data/manifests/osdr-discovery.json` |
| `node scripts/osdr/import.mjs` | Downloads, hashes and parses the two OSDR datasets used in the app |

::: tip TypeScript rules
The project uses `erasableSyntaxOnly` (no `enum`, no parameter properties) and `noUnusedLocals`. Run `npx tsc -b` before pushing.
:::

## Your first two minutes

1. **Look at the crew rail (left).** Four astronauts: ORION, LYRA, VEGA and ATLAS. Each card says in plain words how that person is doing.
2. **Look at the body (center).** Body systems glow in their status color. The heart beats at the live heart rate and the lungs breathe at the live breathing rate.
3. **Click the heart.** The right panel switches to the body system detail: each metric with its trend chart, the shaded personal normal band and the forecast cone.
4. **Open the scenario picker** in the top bar and choose **Acute cardio event**. At **1 min/s** a CRITICAL banner appears within simulated minutes.
5. **Mark an action done** in "What needs attention" and **acknowledge** the alert.
6. **Press `V`** to switch to the Crew view, then `V` again to come back.
7. **Click Start demo** to let the 10 step guided tour drive the story for you.

Press `?` at any time to see every keyboard shortcut.

## Troubleshooting

::: details The first load takes a few seconds
On startup the engine pre-generates 5 days of minute level history (plus 14 days of daily metrics), so every personal baseline is ready immediately. This takes about 1.2 s warm and 2 to 3 s cold on a laptop. In parallel, the 3D body geometry is built in Web Workers. The interface stays responsive while both finish.
:::

::: details The 3D body loads slowly every time in development
Production builds cache the generated geometry in IndexedDB, so repeat visits skip the build. The development server deliberately skips that cache so geometry edits are never masked by stale data. Use `npx vite build` and `npm run preview` to see the cached behavior.
:::

::: details Port 5173 is already in use
Vite picks the next free port and prints it in the terminal. Open the URL it prints, or stop the other process using 5173.
:::

::: details The page feels slow or the fan spins up
- Make sure hardware acceleration is on in your browser.
- Close other heavy tabs; the 3D viewer renders continuously.
- At very high simulation speed (1 h/s) the engine does more work per second. Pause with `Space` when presenting slides.
- A large window on a weak GPU costs more pixels: try a smaller window or browser zoom.
:::

::: details Nothing changes on screen
Check that the simulation is playing (play button in the scenario player, or `Space`). In the Nominal scenario nothing is supposed to happen: everyone stays within their personal ranges.
:::

::: details I want to start over
Use **Restart** in the scenario player (or in the Tools menu on narrow screens). The scenario starts again from 08:00 UTC sim time. Your Ground or Crew view, presentation mode and alert sound preferences are kept in `localStorage`.
:::

## Next steps

- [Product tour](../product/product-tour): what every panel does.
- [Project structure](./project-structure): where the code lives.
- [Standards, contracts and extending](./contributing): conventions and recipes.
