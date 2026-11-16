---
title: Feature Status Matrix
description: Every capability of the Astronaut Health Intelligence Platform with its implementation status, data origin, documentation page and source code.
verified: 2026-11-15
---

# Feature Status Matrix

One table per area with every capability of the Astronaut Health Intelligence Platform (AHI): what exists in the code, what is experimental, what is planned and what is deliberately absent. Statuses were checked against `frontend/web/src` and `backend/` on the verification date. Hover a badge for its meaning.

| Status | Meaning |
| --- | --- |
| <StatusBadge status="IMPLEMENTED" /> | Present in the code and exercised by the running prototype |
| <StatusBadge status="EXPERIMENTAL" /> | Implemented, but heuristic or resting on made up parameters |
| <StatusBadge status="PLANNED" /> | In the product spec backlog or the roadmap, not in the code |
| <StatusBadge status="CONCEPTUAL" /> | A design idea or target picture only |
| <StatusBadge status="NOT_IMPLEMENTED" /> | Deliberately absent; listed so nobody assumes it exists |

Data origins: <OriginBadge origin="SIMULATED" /> simulator output, <OriginBadge origin="MANUAL" /> typed by a person, <OriginBadge origin="DERIVED" /> computed by the platform, <OriginBadge origin="REAL_PUBLIC" /> public NASA data. See [Data origins](../data/data-origins).

## Data and simulation

| Capability | Status | Origin | Docs | Code |
| --- | --- | --- | --- | --- |
| Device simulators (smart shirt, actigraphy, CEVIS / ARED / T2, dosimeters, cabin sensor, reaction test, intake log) | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="SIMULATED" /> | [Device simulation](../intelligence/scenario-simulation) | <CodeLink path="frontend/web/src/engine/sim/adapters.ts" /> |
| Device pause and resume by an operator (`PAUSED`, readings `NO_DATA`, audit) | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="SIMULATED" /> | [Device simulation](../intelligence/scenario-simulation#pausing-a-device) | <CodeLink path="frontend/web/src/features/vitals/DevicesIndicator.tsx" /> |
| Periodic eye (SANS) and hearing exams, daily noise reading | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="SIMULATED" /> | [Eye health and hearing](../intelligence/eye-and-hearing) | <CodeLink path="frontend/web/src/engine/sim/exams.ts" /> |
| Seven scripted scenarios (including "Eye changes (SANS like)") | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="SIMULATED" /> | [Demo scenarios](../product/demo-scenarios) | <CodeLink path="frontend/web/src/engine/sim/scenarios.ts" /> |
| Canonical `HealthObservation` with `data_origin` and quality | <StatusBadge status="IMPLEMENTED" /> | all | [Data model](../architecture/data-model) | <CodeLink path="frontend/web/src/types/domain.ts" /> |
| Metric catalog (29 metrics, 8 of them from periodic exams) | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="SIMULATED, MANUAL" /> | [Data dictionary](../data/data-dictionary) | <CodeLink path="frontend/web/src/engine/catalog.ts" /> |
| OSDR discovery and import scripts (OSD-569, OSD-575) | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="REAL_PUBLIC" /> | [Dataset catalog](../data/dataset-catalog) | <CodeLink path="frontend/web/scripts/osdr/import.mjs" /> |
| Anatomy asset pipeline (`npm run anatomy:build`: Blender headless export, glTF Transform, validation) | <StatusBadge status="IMPLEMENTED" /> | third party asset, CC BY-SA 4.0 | [3D anatomy assets](../data/anatomy-assets) | <CodeLink path="frontend/web/scripts/anatomy/build.mjs" /> |
| NASA DONKI space weather: live through the API, bundled real snapshot offline | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="REAL_PUBLIC" /> | [NASA data sources](../data/sources#donki-space-weather) | <CodeLink path="backend/app/modules/nasa/donki.py" /> |
| NASA OSDR live study search (API only) | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="REAL_PUBLIC" /> | [NASA data sources](../data/sources#live-study-search) | <CodeLink path="backend/app/modules/nasa/osdr.py" /> |
| Group means of the OSDR panels | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | [Dataset catalog](../data/dataset-catalog) | <CodeLink path="frontend/web/src/features/datasources/LabPanelView.tsx" /> |
| Real ISS cabin replay from NASA EDA | <StatusBadge status="PLANNED" /> | <OriginBadge origin="REAL_PUBLIC" /> | [Roadmap](../resources/roadmap) | none |
| Real radiation dose series (EDA, RadLab) | <StatusBadge status="PLANNED" /> | <OriginBadge origin="REAL_PUBLIC" /> | [NASA data sources](../data/sources) | none |
| Live connection to ISS devices | <StatusBadge status="NOT_IMPLEMENTED" /> | | [Responsible use](./responsible-use) | none |
| Ingestion API (`POST /api/v1/observations`, idempotent, provenance checked) | <StatusBadge status="IMPLEMENTED" /> | all | [Backend and API](../architecture/backend#ingestion-rules) | <CodeLink path="backend/app/modules/ingestion/service.py" /> |

## Health intelligence

| Capability | Status | Origin | Docs | Code |
| --- | --- | --- | --- | --- |
| Personal baseline (median, MAD, p05 / p95, context buckets) | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | [Personal baseline](../intelligence/personal-baseline) | <CodeLink path="frontend/web/src/engine/baseline.ts" /> |
| Robust z-score (acute deviation) | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | [Anomaly detection](../intelligence/anomaly-detection) | <CodeLink path="frontend/web/src/engine/anomaly.ts" /> |
| EWMA drift | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | [Anomaly detection](../intelligence/anomaly-detection#ewma-drift) | <CodeLink path="frontend/web/src/engine/stats.ts" /> |
| Daily persistence windows | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | [Anomaly detection](../intelligence/anomaly-detection#daily-persistence) | <CodeLink path="frontend/web/src/engine/anomaly.ts" /> |
| Data quality and staleness (`NO_DATA`) | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | [Anomaly detection](../intelligence/anomaly-detection#data-quality) | <CodeLink path="frontend/web/src/engine/anomaly.ts" /> |
| Fixed demo thresholds (safety net) | <StatusBadge status="IMPLEMENTED" /> | | [Thresholds](../intelligence/thresholds) | <CodeLink path="frontend/web/src/engine/config.ts" /> |
| Combined rules (R-CARD-01, R-FAT-01, R-ENV-CO2-02) | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | [Risk assessment](../intelligence/risk-assessment#combined-rules) | <CodeLink path="frontend/web/src/engine/risk.ts" /> |
| Rule based risk score 0 to 100 and confidence | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | [Risk assessment](../intelligence/risk-assessment) | <CodeLink path="frontend/web/src/engine/risk.ts" /> |
| CUSUM for small but steady drift (Watch only) | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | [Anomaly detection](../intelligence/anomaly-detection#cusum) | <CodeLink path="frontend/web/src/engine/cusum.ts" /> |
| Eye (SANS) and hearing assessment vs pre-flight baseline | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | [Eye health and hearing](../intelligence/eye-and-hearing) | <CodeLink path="frontend/web/src/engine/exams/assess.ts" /> |
| Mission profiles with cited reference values, mission dose vs NASA career limit | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | [Mission profiles](../intelligence/mission-profiles) | <CodeLink path="frontend/web/src/engine/missions/profiles.ts" /> |
| Space weather advisory per mission profile | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="REAL_PUBLIC" /> | [Mission profiles](../intelligence/mission-profiles#space-weather-advisory) | <CodeLink path="frontend/web/src/engine/missions/spaceWeather.ts" /> |
| Damped Holt forecast with 80% interval | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | [Forecasting](../intelligence/forecasting) | <CodeLink path="frontend/web/src/engine/forecast.ts" /> |
| Forecast horizons 24 h, 36 h, 72 h, 7 days, 15 days with a history rule | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | [Forecasting](../intelligence/forecasting#selectable-horizons) | <CodeLink path="frontend/web/src/features/attention/HorizonPicker.tsx" /> |
| Band exit time and recovery rule | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | [Forecasting](../intelligence/forecasting#band-exit-and-recovery) | <CodeLink path="frontend/web/src/engine/forecast.ts" /> |
| Versioned recommendation catalog and autonomy | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | [Recommendations](../intelligence/recommendations) | <CodeLink path="frontend/web/src/engine/recommendations.ts" /> |
| What-if projection (with and without an action) | <StatusBadge status="EXPERIMENTAL" /> | <OriginBadge origin="SIMULATED" /> | [Recommendations](../intelligence/recommendations#what-if-projection) | <CodeLink path="frontend/web/src/engine/intervention.ts" /> |
| Alerts, deduplication, auto resolve, escalation | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | [Alerts](../intelligence/alerts) | <CodeLink path="frontend/web/src/engine/alerts.ts" /> |
| Daily check-in and self report rules | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="SIMULATED, MANUAL" /> | [Self-report and Earth link](../intelligence/self-report-and-earth-link) | <CodeLink path="frontend/web/src/engine/checkins.ts" /> |
| Earth link delay model and simulated ground replies | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="SIMULATED" /> | [Self-report and Earth link](../intelligence/self-report-and-earth-link#earth-link) | <CodeLink path="frontend/web/src/engine/comms.ts" /> |
| Long term mission days (older days synthesized) | <StatusBadge status="EXPERIMENTAL" /> | <OriginBadge origin="SIMULATED" /> | [Mission features](../product/mission-features#mission-overview) | <CodeLink path="frontend/web/src/engine/missionDays.ts" /> |
| IQR outlier rule | <StatusBadge status="NOT_IMPLEMENTED" /> | | [Methods status](../intelligence/overview#methods-status) | none |
| Isolation Forest "Unusual combination" (per astronaut, informational only) | <StatusBadge status="EXPERIMENTAL" /> | <OriginBadge origin="DERIVED" /> | [Anomaly detection](../intelligence/anomaly-detection#unusual-combination-experimental) | <CodeLink path="frontend/web/src/engine/ml/multivariate.ts" /> |
| Multivariate scoring endpoint (scikit-learn parity path) | <StatusBadge status="EXPERIMENTAL" /> | <OriginBadge origin="DERIVED" /> | [Backend and API](../architecture/backend) | <CodeLink path="backend/app/modules/analytics/service.py" /> |
| ARIMA, XGBoost, SHAP | <StatusBadge status="NOT_IMPLEMENTED" /> | | [AI and analytics](../intelligence/ai-and-analytics) | none |
| Ask AHI assistant (demo with the Claude API, streamed, voice in, read aloud) | <StatusBadge status="EXPERIMENTAL" /> | <OriginBadge origin="DERIVED" /> | [Ask AHI](../product/assistant) | <CodeLink path="frontend/web/src/features/assistant/AssistantPanel.tsx" /> |
| Onboard offline assistant (local model) | <StatusBadge status="CONCEPTUAL" /> | | [Ask AHI](../product/assistant#the-onboard-target) | none |
| Sensor based activity recognition | <StatusBadge status="CONCEPTUAL" /> | | [Limitations](../validation/limitations) | none |

## User interface

| Capability | Status | Origin | Docs | Code |
| --- | --- | --- | --- | --- |
| Ground view (whole crew) | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="SIMULATED" /> | [Product tour](../product/product-tour) | <CodeLink path="frontend/web/src/app/App.tsx" /> |
| Crew view (one astronaut, plain language, "Your body systems" cards) | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="SIMULATED" /> | [Product tour](../product/product-tour#ground-view-and-crew-view) | <CodeLink path="frontend/web/src/features/crewview/CrewView.tsx" /> |
| Mission and Earth link panel (tabs Mission, Earth link and Space weather; profile picker) | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED, REAL_PUBLIC" /> | [Mission profiles](../intelligence/mission-profiles) | <CodeLink path="frontend/web/src/features/mission/MissionContext.tsx" /> |
| Anatomical atlas viewer (Z-Anatomy, 250 structures, status highlights, live heart beat and breathing) | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="SIMULATED, DERIVED" /> | [3D anatomy](../architecture/anatomy-3d) | <CodeLink path="frontend/web/src/features/anatomy/viewer/AtlasViewer.tsx" /> |
| Zoom to the pointer (wheel, trackpad, pinch) | <StatusBadge status="IMPLEMENTED" /> | | [3D anatomy](../architecture/anatomy-3d#navigation-and-preset-views) | <CodeLink path="frontend/web/src/features/anatomy/viewer/zoom.ts" /> |
| Monitor and Explore modes | <StatusBadge status="IMPLEMENTED" /> | | [3D anatomy](../architecture/anatomy-3d#monitor-and-explore) | <CodeLink path="frontend/web/src/features/anatomy/viewer/interaction.ts" /> |
| Keyboard body navigator with spoken announcements | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | [3D anatomy](../architecture/anatomy-3d#keyboard-body-navigator) | <CodeLink path="frontend/web/src/features/anatomy/a11y/KeyboardNavigator.tsx" /> |
| Body scan band (no extra draw call) | <StatusBadge status="IMPLEMENTED" /> | | [3D anatomy](../architecture/anatomy-3d#body-scan) | <CodeLink path="frontend/web/src/features/anatomy/viewer/scan.ts" /> |
| Eye regions on the atlas, ear status rings | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="SIMULATED, DERIVED" /> | [Eye health and hearing](../intelligence/eye-and-hearing#on-the-3d-body) | <CodeLink path="frontend/web/src/features/anatomy/viewer/EarMarkers.tsx" /> |
| System layers, preset views and skin opacity | <StatusBadge status="IMPLEMENTED" /> | | [3D anatomy](../architecture/anatomy-3d#interaction) | <CodeLink path="frontend/web/src/features/anatomy/viewer/SystemControls.tsx" /> |
| Structure selection and structure panel (monitored or context only) | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="SIMULATED, DERIVED" /> | [Product tour](../product/product-tour#selecting-a-structure) | <CodeLink path="frontend/web/src/features/attention/StructureDetail.tsx" /> |
| Anatomy to health mapping (structure, region, metrics) | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | [Data model](../architecture/data-model#anatomy-to-health-mapping) | <CodeLink path="frontend/web/src/features/anatomy/atlas/health.ts" /> |
| Alerts and statistical flags per body system in the detail panel | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | [Product tour](../product/product-tour#region-detail-and-trend-chart) | <CodeLink path="frontend/web/src/features/attention/RegionEvents.tsx" /> |
| Per system lazy loading of the atlas (one GLB per system, session cache, 4 tries with backoff, retry button) | <StatusBadge status="IMPLEMENTED" /> | | [3D anatomy](../architecture/anatomy-3d#fallback) | <CodeLink path="frontend/web/src/features/anatomy/viewer/retry.ts" /> |
| Procedural fallback body when the atlas is unavailable | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="SIMULATED, DERIVED" /> | [3D anatomy](../architecture/anatomy-3d#fallback) | <CodeLink path="frontend/web/src/features/anatomy/procedural/ProceduralViewer.tsx" /> |
| Female reference model | <StatusBadge status="PLANNED" /> | | [Roadmap](../resources/roadmap#anatomy-next-steps) | none (one reference model for every crew member today) |
| Textures on the anatomy | <StatusBadge status="PLANNED" /> | | [Roadmap](../resources/roadmap#anatomy-next-steps) | none (the source model has none) |
| Per astronaut anatomy (scans, body size) | <StatusBadge status="NOT_IMPLEMENTED" /> | | [3D anatomy](../architecture/anatomy-3d#limitations) | none |
| BodyParts3D kidney geometry | <StatusBadge status="PLANNED" /> | | [Roadmap](../resources/roadmap#anatomy-next-steps) | none (procedural kidneys today) |
| Measured by: devices behind each region and structure | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="SIMULATED" /> | [Device simulation](../intelligence/scenario-simulation#measured-by) | <CodeLink path="frontend/web/src/features/attention/MeasuredBy.tsx" /> |
| Body system detail and trend chart with personal band | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="SIMULATED, DERIVED" /> | [Product tour](../product/product-tour#region-detail-and-trend-chart) | <CodeLink path="frontend/web/src/components/TrendChart.tsx" /> |
| Status timeline with event markers | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | [Product tour](../product/product-tour#status-timeline) | <CodeLink path="frontend/web/src/features/timeline/index.tsx" /> |
| Alerts drawer and critical banner | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | [Product tour](../product/product-tour#alerts-drawer) | <CodeLink path="frontend/web/src/features/alerts/Alerts.tsx" /> |
| Alert sounds per severity with repeat and escalation | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | [Accessibility](../product/accessibility#alert-sounds) | <CodeLink path="frontend/web/src/features/a11y/alarmSchedule.ts" /> |
| Audio description (D, Shift+D), skip links, live regions | <StatusBadge status="IMPLEMENTED" /> | | [Accessibility](../product/accessibility#audio-description) | <CodeLink path="frontend/web/src/features/a11y/describe.ts" /> |
| Mission overview (dose, exercise, sleep) | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="SIMULATED" /> | [Mission features](../product/mission-features#mission-overview) | <CodeLink path="frontend/web/src/features/mission/index.tsx" /> |
| Shift handover report | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="SIMULATED, MANUAL" /> | [Mission features](../product/mission-features#shift-handover-report) | <CodeLink path="frontend/web/src/features/report/index.tsx" /> |
| FHIR R4 export (Patient, Device, Observation) | <StatusBadge status="IMPLEMENTED" /> | all | [Mission features](../product/mission-features#fhir-r4-export) | <CodeLink path="frontend/web/src/lib/fhir.ts" /> |
| Data and model dialog (real datasets, devices, model card, origins) | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="REAL_PUBLIC, DERIVED" /> | [Mission features](../product/mission-features#data-and-model) | <CodeLink path="frontend/web/src/features/datasources/DataModelDialog.tsx" /> |
| 10 step guided demo | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="SIMULATED" /> | [Demo scenarios](../product/demo-scenarios#guided-demo) | <CodeLink path="frontend/web/src/features/tour/steps.ts" /> |
| Presentation mode and keyboard shortcuts | <StatusBadge status="IMPLEMENTED" /> | | [Design system](../product/design-system) | <CodeLink path="frontend/web/src/app/shortcuts.tsx" /> |
| Mission backdrops behind the 3D body, with cited profile facts and parallax | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | [Mission profiles](../intelligence/mission-profiles#mission-backdrops) | <CodeLink path="frontend/web/src/features/mission/backdrops/MissionBackdrop.tsx" /> |
| Visual first panels (band gauge, change bar, delay clock, sentences behind Details) | <StatusBadge status="IMPLEMENTED" /> | | [Design system](../product/design-system#visual-first-panels) | <CodeLink path="frontend/web/src/components/viz/BandGauge.tsx" /> |
| Feed states Paused by operator, Waiting for data, Signal lost, with inline Resume | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="SIMULATED" /> | [Product tour](../product/product-tour#live-vitals-cabin-and-devices) | <CodeLink path="frontend/web/src/features/attention/feedState.ts" /> |
| Idle auto rotation rule of the 3D body | <StatusBadge status="IMPLEMENTED" /> | | [3D anatomy](../architecture/anatomy-3d#navigation-and-preset-views) | <CodeLink path="frontend/web/src/features/anatomy/viewer/autoRotate.ts" /> |
| Browser tab status dot while a critical alert is open | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | [Product tour](../product/product-tour#alerts-drawer) | <CodeLink path="frontend/web/src/app/useStatusFavicon.ts" /> |
| Speech stop and short announcement on a language change | <StatusBadge status="IMPLEMENTED" /> | | [Accessibility](../product/accessibility#audio-description) | <CodeLink path="frontend/web/src/features/a11y/languageSpeech.ts" /> |
| Engine text translation through structured messages (the plain text handover and ground packets stay English) | <StatusBadge status="EXPERIMENTAL" /> | | [Engine text](../product/accessibility#engine-text) | <CodeLink path="frontend/web/src/i18n/engineText.ts" /> |
| Pseudo locale `qps` and i18n sweep script (developer tools) | <StatusBadge status="IMPLEMENTED" /> | | [Finding untranslated text](../product/accessibility#finding-untranslated-text) | <CodeLink path="frontend/web/src/i18n/pseudo.ts" /> |
| z-index scale for every overlay | <StatusBadge status="IMPLEMENTED" /> | | [Design system](../product/design-system#z-index-scale) | <CodeLink path="frontend/web/src/index.css" /> |
| Health indicator count with a breakdown by body system | <StatusBadge status="IMPLEMENTED" /> | <OriginBadge origin="DERIVED" /> | [Product tour](../product/product-tour) | <CodeLink path="frontend/web/src/features/stage/IndicatorBreakdown.tsx" /> |
| Mission chip that opens "What the mission profile changes" | <StatusBadge status="IMPLEMENTED" /> | | [Mission profiles](../intelligence/mission-profiles#what-the-profile-changes) | <CodeLink path="frontend/web/src/features/mission/MissionContext.tsx" /> |
| Optional interface languages (pt-BR, es, ja, de; English default) | <StatusBadge status="EXPERIMENTAL" /> | | [Languages](../product/accessibility#languages) | <CodeLink path="frontend/web/src/i18n/index.ts" /> |
| Flight surgeon review queue | <StatusBadge status="PLANNED" /> | | [Roadmap](../resources/roadmap) | none |
| Hosted web app for judges | <StatusBadge status="PLANNED" /> | | [Roadmap](../resources/roadmap) | none |

## Platform and operations

| Capability | Status | Docs | Code |
| --- | --- | --- | --- |
| Offline demo mode: the app runs fully in the browser, `VITE_API_URL=off` for static hosting | <StatusBadge status="IMPLEMENTED" /> | [Backend and API](../architecture/backend#offline-demo-mode) | <CodeLink path="frontend/web/src/lib/api/client.ts" /> |
| Online and offline switch (Automatic, Online, Offline) with a top bar connection chip | <StatusBadge status="IMPLEMENTED" /> | [Backend and API](../architecture/backend#online-and-offline-switch) | <CodeLink path="frontend/web/src/lib/api/connectivity.ts" /> |
| Backend: FastAPI modular monolith (health, registry, ingestion, observations, nasa, assistant, analytics) | <StatusBadge status="IMPLEMENTED" /> | [Backend and API](../architecture/backend) | <CodeLink path="backend/app/main.py" /> |
| Database: SQLite by default, PostgreSQL with Docker Compose, Alembic migrations | <StatusBadge status="IMPLEMENTED" /> | [Backend and API](../architecture/backend#storage-and-migrations) | <CodeLink path="docker-compose.yml" /> |
| OpenAPI schema and generated frontend types (`npm run api:types`) | <StatusBadge status="IMPLEMENTED" /> | [Backend and API](../architecture/backend#generated-types) | <CodeLink path="backend/openapi.json" /> |
| Health engine in Python (port of the TypeScript engine) | <StatusBadge status="PLANNED" /> | [Roadmap](../resources/roadmap) | <CodeLink path="backend/app/modules/engine/__init__.py" label="seam only" /> |
| Authentication and role based access control (not implemented: the demo has no login; needs SSO and server side RBAC in the backend) | <StatusBadge status="PLANNED" /> | [Roadmap](../resources/roadmap#access-profiles) | none |
| Persistent audit trail | <StatusBadge status="PLANNED" /> | [Governance](../data/governance-and-privacy) | none (in memory today) |
| Unit and scenario tests (web: 450 tests in 49 files; backend: 86 pytest tests in 7 files) | <StatusBadge status="IMPLEMENTED" /> | [Testing](../engineering/testing) | <CodeLink path="frontend/web/src/engine/engine.test.ts" /> |
| Headless evaluation of the engine | <StatusBadge status="IMPLEMENTED" /> | [Results](../validation/results) | <CodeLink path="frontend/web/scripts/evaluate.ts" /> |
| End to end browser tests (Playwright: 23 functional tests and 8 visual tests, all run in CI with committed Linux baselines) | <StatusBadge status="IMPLEMENTED" /> | [Testing](../engineering/testing#end-to-end-and-visual-tests) | <CodeLink path="frontend/web/e2e/demo-script.spec.ts" /> |
| CI and documentation deployment (GitHub Actions, GitHub Pages) | <StatusBadge status="IMPLEMENTED" /> | [Deployment](../engineering/deployment) | <CodeLink path=".github/workflows/docs-deploy.yml" /> |

## Next steps

- [Traceability matrix](../validation/traceability): capability, requirement, code, tests and data in one table.
- [Roadmap](../resources/roadmap): order of the planned items.
