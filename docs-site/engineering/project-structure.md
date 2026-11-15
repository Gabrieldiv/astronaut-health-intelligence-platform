---
title: Project Structure
description: Repository layout of the Astronaut Health Intelligence Platform, what lives in each folder of the web app and the backend, the data folders, the docs and the documentation portal.
status: IMPLEMENTED
code:
  - frontend/web/src/types/domain.ts
  - frontend/web/package.json
  - docs-site/package.json
  - backend/pyproject.toml
verified: 2026-11-15
---

# Project Structure

The Astronaut Health Intelligence Platform (AHI) repository is a small monorepo: one web app, an optional backend, data folders with real NASA files and their manifests, internal documents and this documentation portal.

## Repository

```text
.
├── PROJECT_MASTER.md          Product, data and architecture spec (pt-BR)
├── README.md                  Overview, quick start, screenshots
├── CLAUDE.md                  Working rules for AI assisted development
├── LICENSE                    MIT
├── docker-compose.yml         PostgreSQL 17 and the AHI API
├── .github/workflows/         CI and documentation deployment (GitHub Actions)
├── backend/                   AHI API (FastAPI modular monolith, Python 3.12)
├── data/
│   ├── raw/<OSD>/             Original NASA OSDR files, byte for byte, plus API responses
│   ├── manifests/             Provenance manifests (DatasetRecord), discovery output, import log
│   └── processed/             Long format observations (data_origin REAL_PUBLIC)
├── docs/                      Demo script, generated model card, data source inventory, data guide (pt-BR),
│                              anatomy assets guide, assistant architecture
├── docs-site/                 This documentation portal (VitePress, EN and PT-BR)
└── frontend/web/              The web app (React, TypeScript, Vite)
```

## Web app (`frontend/web`)

```text
frontend/web/
├── index.html                 App entry (loading screen while baselines are prepared)
├── anatomy-lab.html           Dev only: every visual state of the 3D body
├── features-lab.html          Dev only: feature components with fake state
├── public/
│   └── anatomy/               3D atlas: nine *.glb files (one per anatomical system), manifest.json,
│                              LICENSE.md (CC BY-SA 4.0). Generated, never edited by hand
├── scripts/
│   ├── evaluate.ts            Headless engine evaluation (npm run evaluate)
│   ├── anatomy/               Asset pipeline (npm run anatomy:build): build.mjs, fetch-source.mjs,
│   │                          export_atlas.py (Blender), build-kidneys.ts, optimize.mjs, validate.mjs,
│   │                          decode-for-preview.mjs, render_previews.py
│   └── osdr/                  discover.mjs, import.mjs, lib.mjs
├── .cache/anatomy/            Pipeline work folder (source archive, raw export, previews). Ignored by git
└── src/
    ├── main.tsx, index.css    Entry and global styles (tokens, screen modes, presentation mode)
    ├── app/                   App shell, keyboard shortcuts, UI store (view, presentation, tour)
    ├── components/            Shared UI: trend chart, sparkline, risk gauge, status, metric value, baseline info
    ├── data/                  Compact OSDR panels, the DONKI snapshot (nasa/) and their typed lazy loaders
    ├── engine/                Simulator, health engine, CUSUM, config, catalog, tests, evaluation.json
    │   ├── sim/               profiles, schedule, physiology, cabin, exams, scenarios, adapters
    │   ├── exams/             Eye (SANS) and hearing exam schedule and assessment
    │   ├── missions/          Mission profiles, cited sources, mission dose, space weather advisory
    │   └── ml/                Experimental Isolation Forest, PCA whitening, multivariate detector
    ├── features/              a11y, alerts, anatomy, assistant, attention, checkin, comms, crew,
    │                          crewview, datasources, lab, mission, report, stage, timeline,
    │                          topbar, tour, vitals, whatif
    ├── lib/                   status colors and labels, FHIR R4 export, API client, NASA loaders
    ├── state/                 zustand store and ticker
    └── types/                 domain.ts (shared contract, additive changes only), nasa.ts,
                               api.gen.ts (generated from backend/openapi.json)
```

## Backend (`backend`)

```text
backend/
├── app/
│   ├── main.py                create_app(): routers, CORS, request logs, lifespan
│   ├── cli.py                 openapi and donki-snapshot commands
│   ├── core/                  settings (.env), logging, TTL cache
│   ├── db/                    engine, sessions, migrations on start
│   └── modules/               health, registry, ingestion, observations, nasa,
│                              assistant, analytics, engine (seam only)
├── alembic/                   migrations
├── tests/                     pytest (external HTTP mocked with respx)
├── openapi.json               exported schema (source of src/types/api.gen.ts)
├── .env.example               configuration template (copy to .env, never commit)
└── Dockerfile
```

| Path | What lives there | Read more |
| --- | --- | --- |
| `src/types/domain.ts` | Canonical model, entities, store contract | [Data model](../architecture/data-model) |
| `src/engine/` | Pure TypeScript engine and simulator, no React | [Engine and simulation](../architecture/engine-and-simulation) |
| `src/engine/config.ts` | Every tunable number (demo configuration) | [Thresholds](../intelligence/thresholds) |
| `src/engine/catalog.ts` | Metrics, regions, mission, crew, scenarios, Earth link profiles | [Data dictionary](../data/data-dictionary) |
| `src/**/*.test.ts` | vitest tests (37 files) | [Testing strategy](./testing) |
| `src/engine/missions/`, `src/engine/exams/`, `src/engine/ml/` | Mission profiles, exams, experimental machine learning | [Mission profiles](../intelligence/mission-profiles), [Eye health and hearing](../intelligence/eye-and-hearing), [Anomaly detection](../intelligence/anomaly-detection#unusual-combination-experimental) |
| `src/features/a11y/`, `src/features/assistant/` | Sounds, audio description, skip links; Ask AHI | [Accessibility](../product/accessibility), [Ask AHI](../product/assistant) |
| `src/lib/api/` | Typed API client with offline fallback | [Backend and API](../architecture/backend#offline-demo-mode) |
| `backend/app/modules/` | One module per responsibility (router, schemas, tables) | [Backend and API](../architecture/backend#modules) |
| `src/state/store.ts` | zustand store, `startTicker()` | [Frontend and state](../architecture/frontend) |
| `src/features/*` | UI features | [Frontend and state](../architecture/frontend#feature-modules) |
| `src/features/anatomy/` | 3D body: `atlas/` (manifest contract, health mapping), `viewer/` (atlas viewer), `procedural/` (fallback model) | [3D anatomy](../architecture/anatomy-3d#component-map) |
| `src/features/attention/` | Attention panel, body system detail, structure detail, alerts and flags | [Product tour](../product/product-tour#selecting-a-structure) |
| `src/lib/` | `status.ts`, `fhir.ts`, `api/`, `nasa/` | [Design system](../product/design-system) |
| `public/anatomy/` | Published atlas files, under CC BY-SA 4.0 (the code is MIT) | [3D anatomy assets](../data/anatomy-assets) |
| `scripts/` | Evaluation, anatomy asset pipeline and OSDR import | [Results](../validation/results), [3D anatomy assets](../data/anatomy-assets#rebuild), [Dataset catalog](../data/dataset-catalog) |

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
