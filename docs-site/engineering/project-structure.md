---
title: Project Structure
description: Repository layout of the Astronaut Health Intelligence Platform, what lives in each folder of the web app, the data folders, the docs and the documentation portal.
status: IMPLEMENTED
code:
  - frontend/web/src/types/domain.ts
  - frontend/web/package.json
  - docs-site/package.json
verified: 2026-11-14
---

# Project Structure

The Astronaut Health Intelligence Platform (AHI) repository is a small monorepo: one web app, data folders with real NASA files and their manifests, internal documents and this documentation portal.

## Repository

```text
.
├── PROJECT_MASTER.md          Product, data and architecture spec (pt-BR)
├── README.md                  Overview, quick start, screenshots
├── CLAUDE.md                  Working rules for AI assisted development
├── LICENSE                    MIT
├── .github/workflows/         CI and documentation deployment (GitHub Actions)
├── data/
│   ├── raw/<OSD>/             Original NASA OSDR files, byte for byte, plus API responses
│   ├── manifests/             Provenance manifests (DatasetRecord), discovery output, import log
│   └── processed/             Long format observations (data_origin REAL_PUBLIC)
├── docs/                      Demo script, generated model card, data source inventory, data guide (pt-BR)
├── docs-site/                 This documentation portal (VitePress, EN and PT-BR)
└── frontend/web/              The web app (React, TypeScript, Vite)
```

## Web app (`frontend/web`)

```text
frontend/web/
├── index.html                 App entry (loading screen while baselines are prepared)
├── anatomy-lab.html           Dev only: every visual state of the 3D body
├── features-lab.html          Dev only: feature components with fake state
├── scripts/
│   ├── evaluate.ts            Headless engine evaluation (npm run evaluate)
│   └── osdr/                  discover.mjs, import.mjs, lib.mjs
└── src/
    ├── main.tsx, index.css    Entry and global styles (tokens, screen modes, presentation mode)
    ├── app/                   App shell, keyboard shortcuts, UI store (view, presentation, tour)
    ├── components/            Shared UI: trend chart, sparkline, risk gauge, status, metric value, baseline info
    ├── data/                  Compact OSDR panels for the UI and their typed lazy loader
    ├── engine/                Simulator, health engine, config, catalog, tests, evaluation.json
    │   └── sim/               profiles, schedule, physiology, cabin, scenarios, adapters
    ├── features/              alerts, anatomy, attention, checkin, comms, crew, crewview,
    │                          datasources, lab, mission, report, stage, timeline, topbar,
    │                          tour, vitals, whatif
    ├── lib/                   status colors and labels, FHIR R4 export
    ├── state/                 zustand store and ticker
    └── types/domain.ts        Shared domain contract (additive changes only)
```

| Path | What lives there | Read more |
| --- | --- | --- |
| `src/types/domain.ts` | Canonical model, entities, store contract | [Data model](../architecture/data-model) |
| `src/engine/` | Pure TypeScript engine and simulator, no React | [Engine and simulation](../architecture/engine-and-simulation) |
| `src/engine/config.ts` | Every tunable number (demo configuration) | [Thresholds](../intelligence/thresholds) |
| `src/engine/catalog.ts` | Metrics, regions, mission, crew, scenarios, Earth link profiles | [Data dictionary](../data/data-dictionary) |
| `src/engine/*.test.ts`, `src/lib/fhir.test.ts`, `src/state/store.test.ts` | vitest tests | [Testing strategy](./testing) |
| `src/state/store.ts` | zustand store, `startTicker()` | [Frontend and state](../architecture/frontend) |
| `src/features/*` | UI features | [Frontend and state](../architecture/frontend#feature-modules) |
| `src/features/anatomy/` | Procedural 3D body, workers, cache | [3D anatomy](../architecture/anatomy-3d) |
| `src/lib/` | `status.ts`, `fhir.ts` | [Design system](../product/design-system) |
| `scripts/` | Evaluation and OSDR import | [Results](../validation/results), [Dataset catalog](../data/dataset-catalog) |

The TypeScript configuration enables `erasableSyntaxOnly` (no `enum`, no parameter properties) and `noUnusedLocals`.

## Documentation portal (`docs-site`)

```text
docs-site/
├── .vitepress/
│   ├── config.mts             Site config, nav and sidebars (EN and PT), markdown plugins
│   └── theme/                 Theme extension: custom.css, components (StatusBadge, OriginBadge,
│                              CodeLink, PageMeta), shared vocabulary (meta.ts)
├── public/                    Logo, favicon, screenshots/*.png (real captures of the app)
├── index.md                   English home
├── overview/ science/ data/ intelligence/ architecture/ product/ engineering/ validation/ resources/
└── pt/                        Brazilian Portuguese, same paths
```

How the portal is written, built and published: [Documentation and deployment](./deployment).

## Next steps

- [Standards, contracts and extending](./contributing)
- [Testing strategy](./testing)
