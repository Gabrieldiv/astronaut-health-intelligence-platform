# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# AHI: Astronaut Health Intelligence (NASA Space Apps 2026, Health Monitoring Software)

Full product spec: `PROJECT_MASTER.md` (pt-BR). Read sections 1, 6, 9 and 13 before touching analytics.

## Hard rules
- Never use the em dash or en dash characters in any text: UI strings, docs, comments, commits. Use period, comma, colon or parentheses.
- UI language: English (international judging). Plain language first, technical term second.
- This is decision support, NOT a medical device. No diagnosis, no medication, no invented "official NASA limits".
  Personal baseline bands drive status. Any fixed threshold lives in `src/engine/config.ts`, labeled "demo configuration, not an official limit".
- All device data is simulated and must carry `data_origin: 'SIMULATED'`; the UI always shows a SIMULATED badge.
- Missing data is never treated as normal: it becomes `NO_DATA` / `DATA_STALE`.

## Layout (frontend/web, React 19 + TS + Vite 8 + Tailwind v4 + three/r3f)
- `src/types/domain.ts`: shared contract. Additive changes only.
- `src/engine/`: simulators (device adapters), baseline, anomaly, risk, forecast, recommendations. Pure TS, unit tested with vitest.
- `src/state/store.ts`: zustand store implementing `AppState`; `startTicker()` drives the sim clock.
- `src/features/anatomy/`: 3D body viewer (procedural, no external model files).
- `src/features/*`, `src/components/`: UI. `src/lib/status.ts`: status colors and labels.

## Commands (run inside frontend/web)
- `npm run dev` (port 5173), `npm run lint` (oxlint), `npx tsc -b`, `npm test`, `npx vite build`. CI runs lint, tsc, test, build in that order.
- Single test: `npx vitest run src/engine/risk.test.ts` or `npx vitest run -t "name"`. Tests are `src/**/*.test.ts`, node environment.
- `npm run evaluate` (tsx scripts/evaluate.ts) regenerates `src/engine/evaluation.json` and `docs/model-card.md`. Do not hand edit those.
- Docs portal (VitePress, EN + `pt/`), run inside `docs-site`: `npm run docs:dev`. Spec lives in `PROJECT_MASTER.md` and `docs/` (pt-BR).
- TS has `erasableSyntaxOnly` (no enums, no parameter properties) and `noUnusedLocals`.

## Architecture (big picture)
Everything runs in the browser, no backend. Data flow (details in `src/engine/README.md`):
device adapters (`engine/sim/adapters.ts`) -> canonical `HealthObservation[]` -> per subject+metric `MetricTracker` (`anomaly.ts`, personal baseline) -> `evaluate()` in `engine/engine.ts` (status, combined rules, risk, forecasts, alerts, recommendations, audit) -> zustand store.
- `HealthEngine` is owned by `state/store.ts`. `startTicker()` advances sim time (`simNow += dtReal x speed`), steps the engine in whole sim minutes, and publishes at most every 250 ms real time. Only slices whose engine version changed get new references, so keep selectors on slices.
- Simulation is seeded and reproducible (`SIM.seed`); noise is Ornstein-Uhlenbeck, not white. Scenarios (NOMINAL, ACUTE_CARDIO, SENSOR_FAILURE, ENVIRONMENTAL_CO2, PROGRESSIVE_FATIGUE, PERFORMANCE_DECLINE) start at 08:00 UTC sim time and need different speeds to become visible (see engine README).
- v2 slices (mission, comms with light-time delay, checkIns, missionDays, statusTimeline) and what-if (`engine/intervention.ts`, pure and synchronous) extend the same contract in `types/domain.ts`.
- Real NASA OSDR blood panels (`src/data/OSD-569.json`, `OSD-575.json`) are historical reference only, with provenance; ingest scripts in `scripts/osdr`.
- UI is split per feature in `src/features/*`; `anatomy-lab.html` and `features-lab.html` are standalone dev sandboxes.
