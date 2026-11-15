---
title: Roadmap
description: What the Astronaut Health Intelligence Platform delivered for NASA Space Apps 2026 and what comes next, from the Python engine port and a clinical review flow to authentication and access control, real NASA cabin data and the next steps of the 3D anatomy.
status: PLANNED
verified: 2026-11-15
---

# Roadmap

The Astronaut Health Intelligence Platform (AHI) is a prototype with simulated device data, real public NASA data as mission context and an optional backend. This page separates what is **done** from what is **next**, in rough priority order. Current status of every capability: [Feature status matrix](../overview/feature-status).

## Done

| Area | What exists |
| --- | --- |
| Simulation | Crew devices and cabin, scripted scenarios (including "Eye changes (SANS like)"), device pause and resume |
| Health engine | Personal baselines, robust z, EWMA drift, CUSUM, persistence, risk, forecasts with horizons from 24 h to 15 days, recommendations, alerts; unit tested and evaluated on simulated data |
| Experimental machine learning | Per astronaut Isolation Forest that flags an "Unusual combination" without changing status or risk ([Anomaly detection](../intelligence/anomaly-detection#unusual-combination-experimental)) |
| Mission context | Four cited mission profiles (launch, ISS, Moon, Mars transit), mission dose versus the NASA career limit, space weather advisory from real NASA DONKI events ([Mission profiles](../intelligence/mission-profiles)) |
| Eyes and ears | Periodic SANS eye exams and hearing and noise monitoring against the pre-flight baseline ([Eye health and hearing](../intelligence/eye-and-hearing)) |
| Interface | Ground and Crew views (with body system cards), guided demo, Measured by, Earth link, check-in, mission overview, handover report with FHIR R4 export, what-if |
| 3D anatomy | Z-Anatomy atlas with 250 structures, zoom to pointer, Monitor and Explore modes, retrying downloads, keyboard body navigator, body scan, procedural fallback |
| Accessibility and languages | Alert sounds with escalation, audio description, skip links, live regions; optional interface languages (pt-BR, es, ja, de) with English as default ([Accessibility](../product/accessibility)) |
| Final delivery polish | Mission backdrops with cited profile facts, visual first panels (gauges, change bars, delay clock, sentences behind Details), Paused by operator, Waiting for data and Signal lost states with an inline Resume, a red dot on the browser tab for an open critical alert, idle rotation rule, one z-index scale, speech stop on a language change, Online and Offline switch, structured engine messages for translation, pseudo locale and i18n sweep script |
| Backend | FastAPI modular monolith: registry, idempotent ingestion, observations, NASA DONKI and OSDR connectors, assistant, experimental analytics; SQLite or PostgreSQL; offline demo mode in the app ([Backend and API](../architecture/backend)) |
| Assistant | Ask AHI demo with the Claude API, onboard offline architecture documented ([Ask AHI](../product/assistant)) |
| Real NASA data | OSDR OSD-569 and OSD-575 panels as reference, DONKI events as mission context |
| Tests | vitest unit and scenario tests, pytest for the backend, Playwright end to end tests of the demo script and visual tests of the panels, all in CI ([Testing strategy](../engineering/testing)) |
| Documentation | This portal on GitHub Pages (EN and PT-BR) |

## Next

### 1. Port the health engine to Python

The engine runs in TypeScript in the browser so the app works offline. The backend already has the seam (`app/modules/engine`, a `HealthEngine` protocol). Next: port it module by module (baseline first), reuse the vitest fixtures as pytest cases so both engines answer the same inputs, run it after ingestion and expose baseline, anomaly, risk, prediction and recommendation endpoints. The TypeScript engine stays as the offline fallback.

### 2. Clinical review flow

A review queue for Warning and Critical items: assign, comment, approve or reject a recommendation, with every step in the audit trail and a persistent store. Today the simulated flight surgeon replies are templates, and the multivariate flag and the eye and hearing flags all end in "review with the flight surgeon" without a workflow behind them.

### 3. Authentication and role based access control {#access-profiles}

**Not implemented in this version.** The demo has no login and no roles: anyone who opens the page sees every astronaut, and the API accepts every request without authentication. That is acceptable for a simulated prototype and is not acceptable for real crew data. A real deployment needs sign in (SSO) and role based access control (RBAC) **enforced on the server, in the FastAPI backend**, never only in the interface.

Design sketch (a proposal, nothing of this exists in the code yet):

| Piece | Proposal |
| --- | --- |
| Sign in | Single sign on with OpenID Connect (OIDC) against the organization's identity provider. Short lived tokens; AHI stores no passwords |
| Roles | **Crew member**: own data only (the Crew view). **Flight surgeon**: the crew of the assigned missions, with review and acknowledgment rights. **Mission control**: operational status, alerts and communications for the missions it supports. **Administrator**: users, roles and configuration, without access to health data by default |
| Enforcement | A FastAPI dependency checks the token and the role on every route and filters rows by astronaut and mission. The interface hides what a role cannot use, but the server is the control |
| Audit | Every read and write of health data records who, what and when in a persistent, tamper evident store (the same store the clinical review flow needs) |

Which fields mission control sees, and under what rules, is a policy decision for the stakeholders, not a technical one. This item depends on the persistent store of item 2.

### 4. Real ISS cabin replay and radiation series (NASA EDA)

Replace the cabin simulator with a `REAL_PUBLIC` replay of a real ISS period (CO2, temperature, humidity from the EDA Data Tables) and import the EDA dose series (GCR, SAA, accumulated dose), labeled as historical ISS data, not this crew.

### 5. Scientific grounding and native language review

- Ground each remaining demo threshold in a citable source, or keep the demo label.
- Calibrate the simulators with published ranges and document them in the model card.
- Have native speakers review any interface language other than English before it is presented.
- Keep every engine sentence on a structured message so it translates (exam notes, forecast notes, device notes and mission profile texts already do; the plain text handover and ground packets stay English by design) ([Engine text](../product/accessibility#engine-text)).

### 6. 3D anatomy next steps {#anatomy-next-steps}

| Item | Why |
| --- | --- |
| **Textures** | The source has flat colors only, so all detail comes from geometry and materials. Textures add surface detail at a cost in download size |
| **Female reference model** | One reference model (adult male source, neutral groin) stands for every crew member today. A second model needs a compatible license and the same structure ids |
| **BodyParts3D kidney** | The kidneys are simple procedural shapes because the kidney model inside Z-Anatomy has a non commercial license. BodyParts3D, the database Z-Anatomy is based on, is a candidate source for real kidney geometry; its license terms must be checked first |
| **Automated visual tests of the 3D canvas** | Playwright visual tests cover the panels, but the canvas is masked because its frames depend on the GPU. The rendering of the body itself is still checked by hand on the lab page |

Not planned: per astronaut anatomy (scans or body size). The body is reference anatomy by design.

### 7. More OSDR imports

OSD-656 (urine inflammation panel), the OSD-575 multiplex panels, cortisol or immune markers with clinical units, and analog sleep or cognition data, each labeled for what it is.

### 8. Onboard assistant

Replace the cloud model of the demo with the onboard target: a small open weight model on the spacecraft computer, local speech to text, guardrails and a template fallback ([Ask AHI](../product/assistant#the-onboard-target)).

### 9. Deployment

Host the static web app (`VITE_API_URL=off`) so judges can open it without installing anything; later, the Docker Compose stack.

## Also considered

- Sensor based activity recognition instead of schedule based context.
- Comparing the browser Isolation Forest with the scikit-learn path on real data once it exists.

## Next steps

- [Limitations and known issues](../validation/limitations): what the roadmap addresses.
- [Pipeline, normalization and quality](../data/pipeline-and-quality#contributor-priorities): priorities for the data team.
- [NASA data sources](../data/sources): the state of each NASA source.
