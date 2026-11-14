---
title: Standards, Contracts & Extending
description: Coding standards, module contracts and step by step recipes to add a metric, a device adapter, a scenario or a real dataset to the Astronaut Health Intelligence Platform.
status: IMPLEMENTED
code:
  - frontend/web/src/types/domain.ts
  - frontend/web/src/engine/catalog.ts
  - frontend/web/src/engine/config.ts
  - frontend/web/src/engine/sim/adapters.ts
verified: 2026-11-14
---

# Standards, Contracts & Extending

Thanks for helping the Astronaut Health Intelligence Platform (AHI). This page covers the contracts and conventions every change follows, and recipes for the most common changes.

## Before you push

Setup and every command are in [Setup, commands and troubleshooting](./quick-start). Before you push, run inside `frontend/web`:

```bash
npx tsc -b           # typecheck
npm test             # vitest: engine unit and scenario tests
npx vite build       # production build
```

If you changed engine rules or the simulator, also run `npm run evaluate` and commit the regenerated `src/engine/evaluation.json` and `docs/model-card.md`. The same checks run in CI ([Documentation and deployment](./deployment)).

Dev only pages served by `npm run dev`: `/anatomy-lab.html` (every visual state of the 3D body) and `/features-lab.html`. In development the store is also exposed on `window.__ahi` for poking scenarios from the console. Where each file lives: [Project structure](./project-structure).

## Contracts

- **`domain.ts` changes are additive only.** Add optional fields or new union members; never rename or remove a field other modules use. Mark additions with a short comment (the file uses "Additive (v2)").
- **The engine stays pure.** No DOM, no React, no network in `src/engine/`. It must run headless (the evaluation script does exactly that).
- **The store publishes only changed slices.** If you add a slice, give it an engine version so unchanged data keeps its object reference.
- **Adapters return canonical observations.** Nothing downstream of an adapter knows which device produced a record.

## Conventions

| Rule | Why |
| --- | --- |
| UI text in **English**, plain language first, technical term second | International judging; crew readability |
| **No em dash or en dash characters** anywhere: UI strings, docs, comments, commits. Use a period, comma, colon or parentheses | Project writing rule |
| Every record carries **`data_origin`**; device data is `SIMULATED` and the UI always shows the badge | Transparency |
| Missing data is `null` and becomes `NO_DATA` / `DATA_STALE`, never zero and never normal | Safety |
| Fixed thresholds live only in `src/engine/config.ts`, labeled "demo configuration, not an official limit" | No invented NASA limits |
| No diagnosis, no medication, no treatment advice in any text | Decision support only |
| Status always combines color, icon and words | Accessibility |
| Engine logic has **vitest** tests (`*.test.ts` next to the code) | Rules are the product |
| `npx tsc -b` passes: `erasableSyntaxOnly` (no `enum`, no parameter properties) and `noUnusedLocals` are on | Build hygiene |

A quick check for forbidden dashes:

```bash
grep -rnP '\x{2014}|\x{2013}' --include=*.ts --include=*.tsx --include=*.md --exclude-dir=node_modules .
```

## Add a metric

1. **Contract**: add the code to the `MetricCode` union in `src/types/domain.ts` (additive).
2. **Catalog**: add a `MetricDefinition` in `src/engine/catalog.ts`: label, short label, canonical unit, region, decimals, bad direction, a plain-language one liner and a display range (a chart range, never a clinical limit).
3. **Rules**: add a `METRIC_RULES` entry in `src/engine/config.ts` (continuous or event, context bucketed or not, `minScale`, acute and drift flags, `staleMin`, cadence, rule id). Add it to `ASTRONAUT_METRICS` or `CABIN_METRICS`, and to `FORECAST_METRICS` if it should be projected.
4. **Source**: make an adapter emit it (see below).
5. **Recommendation**: add a catalog entry for its rule id in `src/engine/recommendations.ts` (title, why, audience, region, intervention kind, autonomy if it differs from the audience default).
6. **Tests**: cover the new rule in the engine tests; run `npm test` and `npm run evaluate` to check nominal false alerts stay at zero.
7. **UI**: the region detail, vitals and FHIR export pick metrics from the catalog. Add a LOINC code in `src/lib/fhir.ts` only if it is well established.

## Add a device adapter

Adapters live in `src/engine/sim/adapters.ts` and implement `DeviceAdapter`: `id`, `kind`, `name`, `assignedTo`, `metrics`, `read(simNow)` returning `HealthObservation[]`, optional `readEvents(from, to)` for daily backfill, and `status(simNow)` (state, battery, signal).

1. Extend `BaseAdapter` and build observations with `makeObservation(...)` so `data_origin`, quality and activity context are always set.
2. Model device behavior honestly: cadence, `DEGRADED` signal with `QUESTIONABLE` values, `DATA_STALE`, `OFFLINE`.
3. Register it in the engine constructor (`src/engine/engine.ts`, next to the other `addAdapter(...)` calls).
4. If it is a new kind, add it to `DeviceKind` in `domain.ts` and describe its real counterpart and the path to real data in `src/features/datasources/DevicesTab.tsx`.

A **real** adapter (file import or live feed) follows the same contract with `data_origin: 'REAL_PUBLIC'` (or `MANUAL`) and a filled `source_reference`. Nothing downstream changes.

## Add a scenario

1. Add the id to `ScenarioId` in `domain.ts` and a `ScenarioDefinition` (name, description, target) to `SCENARIOS` in `catalog.ts`.
2. In `src/engine/sim/scenarios.ts`, add its timing to `SCENARIO_TIMING` and a severity function (0 to 1 over time from the scenario start). Feed it into the scenario effects that `sim/physiology.ts` (body) or `sim/cabin.ts` (cabin) consume.
3. If an intervention should ease it, add a **hypothetical** relief entry (clearly a simulation device, never a clinical claim).
4. Add it to the scenario list in `scripts/evaluate.ts` (simulated hours and evaluation step), run `npm run evaluate`, and document the timings in [Demo scenarios](../product/demo-scenarios) and [Results](../validation/results).

## Add a real dataset

Follow [Pipeline, normalization and quality](../data/pipeline-and-quality): discovery, fitness report, download into `data/raw/<ACCESSION>/`, manifest with SHA-256 in `data/manifests/`, a text only parser, the quality checklist, canonical output in `data/processed/`, a compact UI file in `frontend/web/src/data/`, and an entry in `docs/data-source-inventory.md`.

- Use the OSDR scripts in `frontend/web/scripts/osdr/` as the model (allow listed hosts, files treated as untrusted data).
- Label it `REAL_PUBLIC`, keep it out of the simulated crew, and never use lab ranges as alert limits.
- Show it in the Data and model dialog with full provenance.

## Commits and pull requests

- Small, focused commits with an imperative subject ("Add hydration forecast").
- Describe what changed for the user and what was verified (typecheck, tests, build, evaluation).
- No em or en dash characters in commit messages either.

## Next steps

- [Testing strategy](./testing)
- [Architecture overview](../architecture/overview)
- [Glossary](../overview/glossary)
