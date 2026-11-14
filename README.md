<div align="center">

# Astronaut Health Intelligence Platform

**Real-time health monitoring and decision support for astronauts, with a 3D view of the body.**

[![CI](https://github.com/lucaspalharesbarbosa/astronaut-health-intelligence-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/lucaspalharesbarbosa/astronaut-health-intelligence-platform/actions/workflows/ci.yml)
[![Documentation](https://img.shields.io/badge/docs-EN%20%7C%20PT--BR-5eead4?style=flat-square)](https://lucaspalharesbarbosa.github.io/astronaut-health-intelligence-platform/)
[![NASA Space Apps 2026](https://img.shields.io/badge/NASA%20Space%20Apps-2026-0b3d91?style=flat-square)](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/)
[![Code license: MIT](https://img.shields.io/badge/code-MIT-blue?style=flat-square)](LICENSE)
[![3D assets: CC BY-SA 4.0](https://img.shields.io/badge/3D%20assets-CC%20BY--SA%204.0-lightgrey?style=flat-square)](frontend/web/public/anatomy/LICENSE.md)
![TypeScript](https://img.shields.io/badge/TypeScript-React%2019-3178c6?style=flat-square)
![three.js](https://img.shields.io/badge/3D-three.js-black?style=flat-square)

[Documentation](https://lucaspalharesbarbosa.github.io/astronaut-health-intelligence-platform/) ·
[Documentação em português](https://lucaspalharesbarbosa.github.io/astronaut-health-intelligence-platform/pt/) ·
[Quick start](#quick-start) ·
[Demo scenarios](#demo-scenarios)

![AHI Ground view: crew, 3D anatomy, what needs attention, timeline and live vitals](docs-site/public/screenshots/ground-view.png)

</div>

> [!IMPORTANT]
> AHI is **decision support, not a medical device**. It does not diagnose or prescribe. All device data in this project is **simulated** and labeled `SIMULATED` everywhere. Real NASA data is shown only as historical reference, with full provenance.

---

## Table of contents

- [Why AHI](#why-ahi)
- [What it does](#what-it-does)
- [Quick start](#quick-start)
- [Demo scenarios](#demo-scenarios)
- [How it works](#how-it-works)
- [Data and science](#data-and-science)
- [Project structure](#project-structure)
- [Documentation](#documentation)
- [Limitations and roadmap](#limitations-and-roadmap)
- [License and acknowledgments](#license-and-acknowledgments)

---

## Why AHI

Long missions expose crews to the five hazards of human spaceflight: **radiation, isolation and confinement, distance from Earth, altered gravity and hostile closed environments**. Health signals come from many devices at different rates, and medical support may be minutes away. On a Mars mission, a question to Earth and its answer take up to 44 minutes.

The crew needs to understand its own health **at a glance** and act early. AHI turns physiological and environmental signals into one integrated, explainable view of each astronaut, comparing every person **with their own normal**, not with a population average.

## What it does

| | |
| --- | --- |
| **3D anatomy** | A realistic anatomical atlas (Z-Anatomy) with 250 selectable structures in system layers. Body systems that need attention light up in their status color, the heart beats at the live heart rate and the lungs breathe at the live breathing rate. Click a structure to see the data it is monitored with, or that it is context only. |
| **Personal baselines** | Each metric is compared with that astronaut's own normal band (robust median and MAD, aware of sleep, rest, work and exercise). |
| **Explainable risk** | Transparent rules produce a status (All good, Keep an eye, Act soon, Act now, Signal lost) with the reasons in plain language. Missing data is never shown as normal. |
| **What to do** | Non-prescriptive recommended actions, tagged "Can act on board now" or "Needs flight surgeon", plus a hypothetical with vs without comparison. |
| **Distance from Earth** | ISS, Moon and Mars link profiles. Messages travel with the real light-time delay, and AHI puts on-board steps first when Earth is far. |
| **Forecasts** | Short-horizon projections with uncertainty and "time until it leaves your normal range". |
| **Mission tools** | Status timeline, daily check-in, long-term mission overview, shift handover report with FHIR R4 export, alert escalation. |
| **Real NASA data** | Two public NASA OSDR datasets (Inspiration4 blood panels) with full provenance in a Data and model dialog. |
| **Two views** | Ground view for flight surgeons and mission control, Crew view for the astronaut. Presentation mode and a 10-step guided demo. |

<table>
  <tr>
    <td width="50%"><img src="docs-site/public/screenshots/critical-alert.png" alt="Acute cardio event: critical banner, heart and lungs highlighted on the 3D body, recommended actions" /><br/><sub><b>Acute event:</b> critical banner, heart and lungs highlighted in red, actions with flight surgeon flag.</sub></td>
    <td width="50%"><img src="docs-site/public/screenshots/crew-view.png" alt="Crew view for the astronaut" /><br/><sub><b>Crew view:</b> plain language, top two actions, daily check-in.</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs-site/public/screenshots/body-detail.png" alt="Heart detail with personal band and forecast" /><br/><sub><b>Body system detail:</b> personal normal band, history and forecast cone.</sub></td>
    <td width="50%"><img src="docs-site/public/screenshots/whatif.png" alt="What-if comparison with and without action" /><br/><sub><b>What if:</b> hypothetical trajectories with and without an action.</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs-site/public/screenshots/mission-overview.png" alt="Mission overview" /><br/><sub><b>Mission overview:</b> radiation vs demo budget, exercise, sleep, HR and HRV.</sub></td>
    <td width="50%"><img src="docs-site/public/screenshots/data-model.png" alt="Real NASA OSDR data with provenance" /><br/><sub><b>Real NASA data:</b> Inspiration4 blood count with provenance.</sub></td>
  </tr>
</table>

## Quick start

Requirements: **Node.js 20 or newer**. No backend, no API keys. After `npm install` the demo works offline.

```bash
git clone https://github.com/lucaspalharesbarbosa/astronaut-health-intelligence-platform.git
cd astronaut-health-intelligence-platform/frontend/web
npm install
npm run dev
```

Open http://localhost:5173 (best at 1440x900 or larger) and click **Start demo**.

| Command (inside `frontend/web`) | What it does |
| --- | --- |
| `npm run dev` | Development server on port 5173 |
| `npm test` | Engine, scenario and FHIR unit tests (vitest) |
| `npx tsc -b` | Type check |
| `npx vite build` | Production build into `dist/` |
| `npm run evaluate` | Re-runs the engine evaluation and regenerates `docs/model-card.md` |
| `npm run anatomy:validate` | Checks the published 3D atlas against its manifest contract |
| `npm run anatomy:build` | Rebuilds the 3D atlas from the Z-Anatomy source (needs Blender 4.5 LTS; not needed to run the app) |

The first load calibrates personal baselines and downloads the 3D anatomy (about 3 MB for the default view), so it takes a few seconds.

## Demo scenarios

Pick a scenario in the top bar, or click **Start demo** for the guided tour.

| Scenario | Who | What happens | First alert (simulated time) |
| --- | --- | --- | --- |
| Nominal day | All | Stable, within personal ranges | None (0 false alerts in 60 crew days) |
| Acute cardio event | ORION | Heart rate jumps, blood oxygen drops, CRITICAL | 7 min |
| Sensor failure | VEGA | Bio-Monitor shirt goes stale, then offline; organs turn grey | 14 min |
| Cabin CO₂ rise | Cabin | CO₂ climbs, breathing rate and reaction time shift for everyone | 90 min (HIGH at 2.3 h) |
| Progressive fatigue | LYRA | Sleep drops, HRV falls, resting heart rate drifts up | 31.8 h (HIGH at 33.5 h) |
| Exercise performance decline | ATLAS | Workout output falls session after session | 27.5 h (HIGH at 75.5 h) |

Times come from `npm run evaluate` (engine `ahi-engine 2.0.0`, 5 seeds). A 4-minute pitch script is in [docs/demo-script.md](docs/demo-script.md).

## How it works

```mermaid
flowchart LR
    DEV["Simulated device adapters<br/>Bio-Monitor, actigraphy, CEVIS/ARED/T2,<br/>cabin sensors, dosimeters"] --> CAN["Canonical HealthObservation<br/>data_origin on every record"]
    CAN --> BASE["Personal baseline<br/>median, MAD, context aware"]
    BASE --> ANOM["Anomaly detection<br/>robust z, EWMA, persistence, data quality"]
    ANOM --> RISK["Risk rules<br/>LOW, MODERATE, HIGH, CRITICAL"]
    RISK --> REC["Recommendations<br/>onboard vs ground review"]
    RISK --> ALERT["Alerts, escalation, audit"]
    BASE --> FC["Forecast<br/>damped Holt + 80% interval"]
    REC --> UI["Dashboard + 3D anatomy"]
    ALERT --> UI
    FC --> UI
```

- **Everything runs in the browser.** A zustand store drives a simulation clock (from real time up to 1 hour per second). The engine is pure TypeScript and unit tested.
- **Adapter contract.** Each simulated device follows the adapter contract from the project spec, so real feeds or a FastAPI ingestion backend can replace the simulators without changing the UI.
- **Anatomical atlas in 3D.** The body is the open Z-Anatomy atlas, prepared in Blender and shipped as one compressed GLB per anatomical system (250 structures, about 880k triangles, 4.64 MB), loaded on demand. One file (`atlas/health.ts`) maps each structure to a monitored body region; structures that nothing measures are shown as context only, with no status. If the atlas cannot load, a procedural model generated in code takes over automatically.

**Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, three.js with react-three-fiber, zustand, recharts, vitest. 3D asset preparation: Blender (headless) and glTF Transform. Documentation site: VitePress.

## Data and science

| Data | Origin | Status |
| --- | --- | --- |
| Vital signs, sleep, activity, exercise, hydration, cognition | Simulated devices, calibrated to plausible ranges | `SIMULATED` |
| Daily check-in (mood, fatigue, stress, sleep quality) | Typed in the app | `MANUAL` |
| Cabin CO₂, temperature, humidity, radiation | Simulated (NASA EDA real replay is the next step) | `SIMULATED` |
| Blood count and metabolic panel (Inspiration4, OSD-569 and OSD-575) | NASA Open Science Data Repository | `REAL_PUBLIC` (reference only) |
| 3D anatomical model (reference anatomy, not health data) | Z-Anatomy atlas, based on BodyParts3D; kidneys are AHI procedural geometry | Third party asset, CC BY-SA 4.0 |

The 3D body is one reference model shown for every crew member. It is not a scan of anyone, and the status colors on it come from the simulated health data.

Principles: every record carries its origin, astronaut and analog or animal data are never mixed, thresholds are **demo configuration, not official NASA limits**, and correlation is never presented as causation.

- Data sources and provenance: [docs/data-source-inventory.md](docs/data-source-inventory.md)
- Data team guide (metrics, schemas, NASA sources, in Portuguese): [docs/data-guide.md](docs/data-guide.md)
- Model card and evaluation: [docs/model-card.md](docs/model-card.md)
- 3D anatomy assets (provenance, license, rebuild guide): [docs/anatomy-assets.md](docs/anatomy-assets.md)

## Project structure

```text
.
├── frontend/web/             # The app (React + TypeScript + Vite)
│   ├── src/engine/           # Simulators, baselines, anomalies, risk, forecast, recommendations
│   ├── src/state/            # zustand store and simulation clock
│   ├── src/features/         # UI features (anatomy, crew, attention, timeline, comms, ...)
│   ├── src/types/domain.ts   # Canonical data model and shared contract
│   ├── public/anatomy/       # 3D atlas: one GLB per anatomical system, manifest.json, LICENSE.md (CC BY-SA 4.0)
│   └── scripts/              # Engine evaluation, NASA OSDR import, anatomy asset pipeline (scripts/anatomy)
├── data/                     # NASA OSDR raw files, manifests (provenance) and processed data
├── docs/                     # Demo script, model card, data inventory, data team guide, anatomy assets guide
├── docs-site/                # Documentation website (VitePress, English and Portuguese)
└── PROJECT_MASTER.md         # Product, data and architecture specification (Portuguese)
```

## Documentation

The full documentation is published with GitHub Pages, in **English and Brazilian Portuguese**:

**https://lucaspalharesbarbosa.github.io/astronaut-health-intelligence-platform/**

It covers the product tour, mission features, demo scenarios, architecture, data model, health intelligence engine, 3D anatomy, NASA data sources, model card, ethics and limits, roadmap and contributing guide.

To run the documentation locally:

```bash
cd docs-site
npm install
npm run docs:dev
```

## Limitations and roadmap

- Device data is simulated. No public continuous physiological telemetry of astronauts exists, so vital signs stay simulated and calibrated. No claim of live ISS connectivity.
- Physiology model, thresholds and intervention effects are simplified and hypothetical.
- The 3D body is one reference model for every crew member (adult male source model with a neutral groin; build, proportions and chest remain those of the source). It is not the astronaut's scan and does not adapt to sex, height or body composition. It has no textures, and the kidneys are simple procedural shapes.
- Indicators relate to a body system, not to a single structure: a highlighted structure marks its body system, never a finding in that structure. Structures that nothing measures (digestive organs, glands, nerves, eyes and others) are context only and show no status.
- Eyes are not monitored. Tracking spaceflight associated neuro-ocular syndrome (SANS) from periodic exams is future work.
- Performance was only observed on one development laptop; it is not a benchmark.

Next steps: replay of real ISS cabin telemetry from NASA EDA, radiation data from RadLab, more NASA OSDR imports, a FastAPI ingestion backend behind the same adapters, a flight surgeon review workflow, role-based access, and for the 3D anatomy a female reference model and textures.

## License and acknowledgments

This repository has two licenses:

- **Code**: released under the [MIT License](LICENSE).
- **3D anatomy assets** (`frontend/web/public/anatomy/*.glb` and `manifest.json`): a derived work of the Z-Anatomy atlas, distributed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). The MIT License does not apply to these files. See [frontend/web/public/anatomy/LICENSE.md](frontend/web/public/anatomy/LICENSE.md) and [docs/anatomy-assets.md](docs/anatomy-assets.md).

Required attribution for the anatomy assets:

```text
Z-Anatomy - The libre 3D atlas of anatomy - CC-BY-SA 4.0 (https://www.z-anatomy.com/)
BodyParts3D - The Database Center for Life Science - CC-BY-SA 2.1 Japan
```

The assets were modified by this project (structures grouped, decimated, re-oriented and compressed; ear, kidney and reproductive structures left out; kidneys rebuilt as AHI procedural geometry).

Acknowledgments:

- Real data: NASA Open Science Data Repository, studies **OSD-569** and **OSD-575** (SpaceX Inspiration4 biospecimen program). The source does not state a license; see [docs/data-source-inventory.md](docs/data-source-inventory.md).
- Built for the [NASA Space Apps Challenge 2026](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/), *Health Monitoring Software*.
- Not affiliated with or endorsed by NASA.
