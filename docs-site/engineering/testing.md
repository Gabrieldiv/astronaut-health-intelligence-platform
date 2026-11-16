---
title: Testing Strategy
description: How the Astronaut Health Intelligence Platform is tested, the 49 vitest files with 450 tests, the Playwright end to end and visual tests and the backend pytest suite, what each covers, plus what is not tested yet.
status: IMPLEMENTED
code:
  - frontend/web/package.json
  - .github/workflows/ci.yml
  - .github/workflows/docs-check.yml
  - backend/tests
  - frontend/web/playwright.config.ts
tests:
  - frontend/web/src/engine/engine.test.ts
  - frontend/web/src/engine/risk.test.ts
  - frontend/web/src/features/anatomy/atlas/health.test.ts
  - frontend/web/src/features/anatomy/atlas/manifest.contract.test.ts
  - frontend/web/src/state/selection.test.ts
verified: 2026-11-15
---

# Testing Strategy

The rules are the product, so the Astronaut Health Intelligence Platform (AHI) tests the engine first. Web tests use **vitest**, run headless (no browser) and are deterministic because the simulator is seeded. The backend uses **pytest** with external HTTP mocked (respx), so the live NASA sources and the Claude API are never called.

| Fact | Value (2026-11-16) |
| --- | --- |
| Web test files | 49 |
| Web tests | 450, all passing |
| End to end tests (Playwright) | 23 functional tests plus 8 visual tests (`npm run e2e` in `frontend/web`) |
| Backend tests | 86 in 7 files (`python -m pytest` in `backend`) |
| Typecheck | `npx tsc -b` clean |
| Production build | `npx vite build` ok |
| Where | Next to the code (`*.test.ts`) |
| Run | `npm test` inside `frontend/web` |

## Test pyramid today

| Level | What | Status |
| --- | --- | --- |
| Unit | Statistics, baseline, forecast, risk, alerts, FHIR export | <StatusBadge status="IMPLEMENTED" /> |
| Scenario (engine level integration) | Full engine runs per scenario with seeded data | <StatusBadge status="IMPLEMENTED" /> |
| Store | Slices, references, actions; structure, region and metric selection | <StatusBadge status="IMPLEMENTED" /> (14 tests in 3 files) |
| Anatomy data layer | Structure to region mapping, structure health view, manifest contract against the real GLB files | <StatusBadge status="IMPLEMENTED" /> (29 tests in 2 files) |
| Anatomy assets | `npm run anatomy:validate` on the published files ([3D anatomy assets](../data/anatomy-assets#rebuild)) | <StatusBadge status="IMPLEMENTED" /> (script, not a test) |
| Viewer logic | Zoom math, whole body framing, idle rotation rule, interaction modes, retry policy, scan timing, keyboard navigation | <StatusBadge status="IMPLEMENTED" /> (48 tests in 7 files) |
| 3D rendering | Visual states, picking, loading and fallback, checked by hand on `anatomy-lab.html`; the canvas is masked in the visual tests | <StatusBadge status="NOT_IMPLEMENTED" /> (no pixel test) |
| Evaluation | Headless replay with metrics ([Results](../validation/results)) | <StatusBadge status="IMPLEMENTED" /> (script, not a test) |
| UI component tests | React components | <StatusBadge status="PLANNED" /> |
| End to end (browser) | Playwright: the demo script flows, including run scenario, acknowledge alert and write the audit trail (spec section 16) ([details](#end-to-end-and-visual-tests)) | <StatusBadge status="IMPLEMENTED" /> (23 tests, run in CI) |
| Visual regression of panels | Playwright screenshots of stable panels ([details](#visual-tests)) | <StatusBadge status="IMPLEMENTED" /> (8 tests, Linux baselines committed, run in CI) |
| API, database, ingestion integration | Health and registry, ingestion and observations, NASA connectors, assistant, analytics, OpenAPI schema | <StatusBadge status="IMPLEMENTED" /> (pytest, 86 tests) |
| Data tests | Schema, units, timestamps, duplicates, provenance | Partial: enforced inside the OSDR import script (fails on sex mismatch, counts missing cells), not as separate tests |

## Web test files

| File | Tests | What it covers |
| --- | --- | --- |
| <CodeLink path="frontend/web/src/engine/stats.test.ts" /> | 8 | Median, MAD and quantiles; robust z ignores a single outlier and honors the scale floor; `badZ` orientation; EWMA alpha from the half-life with irregular steps; smooth tracking of a step change; reproducible seeded randomness; Ornstein-Uhlenbeck noise autocorrelation and unit variance; linear slope |
| <CodeLink path="frontend/web/src/engine/baseline.test.ts" /> | 5 | `INSUFFICIENT_DATA` below the minimum sample size; median plus or minus 2 robust SD band; robustness to outliers; clamping to physical limits; reservoir keeps the most recent values |
| <CodeLink path="frontend/web/src/engine/anomaly.test.ts" /> | 8 | Baseline and LOW on normal data; acute jump to CRITICAL within a few readings; single spike filtered by the 3 reading median; EWMA drift catches a sustained shift and escalates with persistence; missing or stale data is `NO_DATA`, never LOW; questionable data capped at MODERATE; exercise compared with the exercise baseline; consecutive short nights with persistence wording |
| <CodeLink path="frontend/web/src/engine/risk.test.ts" /> | 14 | Score bands; three MODERATE rules become HIGH; one weight per rule and slow patterns capped at HIGH; data quality weight cap; R-CARD-01; R-FAT-01 two of three and three of three; missing data never a normal component; assessment output (rules, factors, confidence, limitations, headline); headline with no findings; region `NO_DATA`; alert dedupe, escalation, auto resolve and history; acute MODERATE blips not actionable; combined rules group components; one recommendation per astronaut and rule with human review |
| <CodeLink path="frontend/web/src/engine/forecast.test.ts" /> | 17 | Damped linear trend; too few points; interval widens with the horizon; binning of irregular points; not eligible with insufficient data; 6 h and 24 h horizons with widening 80% intervals; hours to band exit; daily steps; no band exit while recovering from the opposite side; selectable horizons up to 15 days and the history rule ("Not enough history for this horizon") |
| <CodeLink path="frontend/web/src/engine/alerts.test.ts" /> | 5 | CRITICAL escalation at 5 and 15 min; late evaluation jumps to the right level; HIGH at 30 and 90 min, MODERATE never; stops when acknowledged or resolved; escalations audited in the engine |
| <CodeLink path="frontend/web/src/engine/engine.test.ts" /> | 11 | Baselines `READY` at startup; reproducible with the same seed; bounded history; NOMINAL never reaches HIGH over two simulated days; ACUTE_CARDIO reaches CRITICAL within about 15 sim minutes with one grouped alert; it eases after a logged consult (hypothetical); SENSOR_FAILURE goes stale then offline and is `NO_DATA`; PROGRESSIVE_FATIGUE escalates over days; ENVIRONMENTAL_CO2 raises CO2 for everyone and ventilation lowers it; PERFORMANCE_DECLINE lowers output; acknowledging writes an audit event |
| <CodeLink path="frontend/web/src/engine/checkins.test.ts" /> | 8 | One simulated check-in per astronaut per morning; check-in metrics in the brain region; live morning check-ins; fatigue scenario moves answers but stays MODERATE alone; CO2 makes a headache more likely; manual check-in replaces the simulated one and is `MANUAL`; self report reaches MODERATE at most with no alert; high fatigue run count |
| <CodeLink path="frontend/web/src/engine/comms.test.ts" /> | 9 | Delivery after the one way delay and a reply after review plus delay; timing independent of processing rate; handover reports get no reply and replies are non-prescriptive; profile applied to the mission; one automatic health packet per HIGH or CRITICAL alert; on board first step under Mars states the earliest reply; packets and replies audited; profile switch and manual messages; no on board first step under ISS |
| <CodeLink path="frontend/web/src/engine/intervention.test.ts" /> | 7 | Sleep extension: HRV recovers with the action, deterministic, no state change; explicit metric and horizon; null when not applicable; nominal gives identical lines and says so; acute cardio uses a short horizon; ventilation projects CO2; exercise adjustment, one point per session |
| <CodeLink path="frontend/web/src/engine/missionDays.test.ts" /> | 6 | Day 1 to the current day for everyone; plausible values (ISS-like dose, sleep, exercise around plan); deterministic synthesis; live update of the current day with stable references; fatigue and performance decline visible in recent days |
| <CodeLink path="frontend/web/src/engine/timeline.test.ts" /> | 3 | Last 24 sim hours every 15 min after startup; live frames follow the risk level, also after a big jump; bounded to the history window |
| <CodeLink path="frontend/web/src/lib/fhir.test.ts" /> | 7 | Collection bundle with unique full URLs; pseudonymized patients without personal fields; LOINC only for known vital signs; data origin tag on every observation; missing data never exported as a value; cabin observations without a patient; valid FHIR ids and stable UUIDs |
| <CodeLink path="frontend/web/src/state/store.test.ts" /> | 1 | v2 slices published, references stable when unchanged, actions wired |
| <CodeLink path="frontend/web/src/state/selection.test.ts" /> | 13 | Nothing selected at start; `selectStructure` sets structure and region in one update and clears the metric; a context only structure clears the region; `selectStructure(null)` clears everything; `selectRegion` clears the structure; `selectAstronaut` clears structure, region and metric; `selectMetric` keeps them; a clock tick never touches the selection; `focusTarget` (alert View buttons) clears a structure of another region, keeps one of the same region, changes astronaut first and ignores cabin targets; `clearSelection` goes back to the overview |
| <CodeLink path="frontend/web/src/features/anatomy/atlas/health.test.ts" /> | 21 | Every anatomical system mapped by rule; only brain structures map to the brain and only the kidneys map to the kidneys (procedural origin kept); digestive organs, glands, lymphoid and sense organs stay context only; required ids; primary structure of a region; atlas counts; related metrics come only from the catalog and never include cabin metrics; status is `null` for context only, `NO_DATA` (never normal) when health is missing, else the region status; region alerts by severity then time; anomalies inside a time window; observed value at a time, never invented; structure health view for monitored and context only structures; plain language texts never claim a diagnosis or a neurological measurement and contain no em dash or en dash |
| <CodeLink path="frontend/web/src/features/anatomy/atlas/manifest.contract.test.ts" /> | 8 | Reads the real `public/anatomy`: GLB JSON chunk reader; top level shape, source and license facts; valid structures with unique ids; the seven required ids mapped to their regions; paired structures on the side their id names; real structures mapped by the health rules; one file entry per system with consistent counts; every GLB shipped with one mesh node named after each structure id |
| <CodeLink path="frontend/web/src/engine/cusum.test.ts" /> | 7 | No accumulation within the allowance; accumulation by (m - k) per hour up to h; independent of the sampling cadence; cap and bounded clearing; spike clamp; a small resting heart rate drift under the EWMA rule; LOW on stable data |
| <CodeLink path="frontend/web/src/engine/devicePause.test.ts" /> | 6 | Paused device state and detail; metrics `NO_DATA` with "Paused by operator", never normal; no sensor failure alarm; audit entries; resume waits for the first reading |
| <CodeLink path="frontend/web/src/engine/exams/exams.test.ts" /> | 19 | SANS eye exam schedule (pre-flight, FD 30, FD 90, R-30); hearing cadence; 19.4 µm retinal rule; new folds only; demo levels for optic nerve sheath and acuity; HSRB hearing shift; noise dose and 72 dBA rule; missing data never normal; SANS scenario Watch then Warning |
| <CodeLink path="frontend/web/src/engine/missions/missions.test.ts" /> | 18 | Four profiles with https sources; published reference values; Earth link per profile; dose rates per profile; 600 mSv career limit; space weather advisory per profile, calm cases and no data; autonomy by delay; no em dash or en dash |
| <CodeLink path="frontend/web/src/engine/ml/isolationForest.test.ts" /> | 5 | Standard c(n) normalization; deterministic per seed; far points score higher; constant features and too little data handled |
| <CodeLink path="frontend/web/src/engine/ml/whitening.test.ts" /> | 3 | PCA whitening decorrelates and keeps the variance floor |
| <CodeLink path="frontend/web/src/engine/ml/multivariate.test.ts" /> | 7 | Personal threshold; flag only when the score persists and the drift rules agree; contributions; explanation wording |
| <CodeLink path="frontend/web/src/engine/ml/engineMultivariate.test.ts" /> | 3 | Quiet on a nominal day; flags the acute scenario without touching the risk score; `NO_DATA` when the shirt stops |
| <CodeLink path="frontend/web/src/state/missionProfile.test.ts" /> | 1 | Store wiring of the mission profile |
| <CodeLink path="frontend/web/src/lib/api/client.test.ts" /> | 6 | `VITE_API_URL` and `off`; connected when `/health` answers as the AHI API; offline otherwise |
| <CodeLink path="frontend/web/src/lib/nasa/spaceWeather.test.ts" /> | 7 | Bundled snapshot is valid REAL_PUBLIC DONKI data; contract check; backend used when it answers; fallback to the snapshot when the backend is unreachable, DONKI is down (502), the payload is unexpected or the call times out |
| <CodeLink path="frontend/web/src/features/a11y/alarmSchedule.test.ts" /> | 15 | Which alerts ring, repeat intervals, escalation after 2 min, one sound at a time, minimum gap, history never rings |
| <CodeLink path="frontend/web/src/features/a11y/describe.test.ts" /> | 9 | Spoken status, readings and units; missing data spoken as no data; simulated data stated |
| <CodeLink path="frontend/web/src/features/assistant/assistant.test.ts" /> | 11 | Grounded snapshot; "Based on:" split; speech text without markdown; stream parsing |
| <CodeLink path="frontend/web/src/features/anatomy/atlas/examRegions.test.ts" /> | 11 | Eyes and ears regions on the atlas; ear anchors; exam metrics per region |
| <CodeLink path="frontend/web/src/features/anatomy/a11y/keyboardNav.test.ts" /> | 12 | Region and structure order; arrows, Home and End; announcements with status and no data |
| <CodeLink path="frontend/web/src/features/anatomy/viewer/zoom.test.ts" /> | 10 | Zoom toward the pointer keeps the aimed point; distance limits; no move at a limit |
| <CodeLink path="frontend/web/src/features/anatomy/viewer/interaction.test.ts" /> | 5 | Monitor and Explore: which structures are interactive; persisted mode with safe fallback |
| <CodeLink path="frontend/web/src/features/anatomy/viewer/retry.test.ts" /> | 8 | Backoff 0.6, 1.8, 5.4 s; 4 tries; error keeps the last cause; non retryable errors |
| <CodeLink path="frontend/web/src/features/anatomy/viewer/scan.test.ts" /> | 6 | Scan timing; one pass per cycle; reduced motion is slow and dim |
| <CodeLink path="frontend/web/src/i18n/i18n.test.ts" /> | 60 | Five languages, English first and the only reviewed one; every locale has exactly the English keys, no empty strings, the same placeholders, no dash characters and the protected tokens untranslated; status words and catalog labels follow the language |
| <CodeLink path="frontend/web/src/features/anatomy/viewer/autoRotate.test.ts" /> | 3 | Idle rotation: turns when idle, stops during a drag and resumes 3 s after the last interaction, stays still while something is selected or hovered or the camera flies |
| <CodeLink path="frontend/web/src/features/anatomy/viewer/framing.test.ts" /> | 4 | Whole body framing fills the free height, is limited by the width on a narrow viewport, grows when the reserved bands shrink, and a close up is never farther than the whole body shot |
| <CodeLink path="frontend/web/src/features/attention/feedState.test.ts" /> | 2 | Paused (not Signal lost) while paused, Waiting during the resume grace, then Live; a missing reading with no healthy device stays Signal lost |
| <CodeLink path="frontend/web/src/features/stage/indicators.test.ts" /> | 4 | Indicator count: all normal, flagged first and worst first, a reading with no current value never counted as normal, empty before the first evaluation |
| <CodeLink path="frontend/web/src/features/stage/indicatorBreakdown.test.ts" /> | 3 | Breakdown by body system counts every indicator, puts the most urgent group first and keeps missing data out of the normal ones |
| <CodeLink path="frontend/web/src/components/viz/scale.test.ts" /> | 8 | Gauge scale, change versus the personal median (missing data never read as a change or as normal), limit fraction, change bar width, delay clock fraction |
| <CodeLink path="frontend/web/src/app/useStatusFavicon.test.ts" /> | 2 | Red dot on the tab icon only for an open CRITICAL alert; the icon is an SVG data URL |
| <CodeLink path="frontend/web/src/features/a11y/languageSpeech.test.ts" /> | 3 | A language change cancels the old voice and announces once in the new language; a quick second change speaks only the latest; silent with audio description off |
| <CodeLink path="frontend/web/src/lib/api/connectivity.test.ts" /> | 7 | Automatic, Online and Offline: stored choice, `VITE_API_URL=off` wins, top bar chip, blocked storage, Offline never touches the network, Online reports an unreachable API and still serves the bundled snapshot |
| <CodeLink path="frontend/web/src/features/profile/profileData.test.ts" /> | 20 | Crew profile data: metrics grouped by domain with no invented rows; personal band marker, missing value is `NO_DATA`; plain language check-in answers; radiation dose never zero without data, compared with the NASA career limit; alerts, actions and audit lines per astronaut; worn devices; the profile store |
| <CodeLink path="frontend/web/src/i18n/engineText.test.ts" /> | 14 | Engine sentences through structured messages: English byte for byte, every sampled sentence translated in each language, mission profiles and exam rule titles, every engine key exists in English |

## End to end and visual tests {#end-to-end-and-visual-tests}

Playwright (Chromium only) drives the real app in a browser. Configuration: <CodeLink path="frontend/web/playwright.config.ts" />. Run them with `npm run e2e` inside `frontend/web` (needs a Chromium that can run WebGL).

| Suite | Tests | What it covers |
| --- | --- | --- |
| <CodeLink path="frontend/web/e2e/demo-script.spec.ts" /> | 15 | The demo script as a user: the ground view with the SIMULATED badge, progressive fatigue, acute cardio event with the audit trail, sensor failure (no data, never normal), pausing and resuming a device, forecast horizons, Mars transit guidance, Crew view body system cards, skip link, the keyboard body navigator, Ask AHI offline and closing with Esc, the NASA context tab in offline mode, switching language to Japanese and back, the crew profile dialog (every section, switch astronaut, Esc) |
| <CodeLink path="frontend/web/e2e/polish.spec.ts" /> | 8 | The final polish: the indicator count and its breakdown by body system, selecting a row shows that system on the body, the Mission and Earth link panel and the mission profile chip (Moon), stage headline and alert title translated to Portuguese and restored, Offline mode hiding the OSDR list, pausing the Bio-Monitor |
| <CodeLink path="frontend/web/e2e/visual.spec.ts" /> | 8 | Screenshots of stable panels (10 images): top bar, crew list, attention panel, devices panel, Crew view side column (body systems and actions), Mission and Earth link panel (two tabs), the indicator breakdown popover and what the mission profile changes. The 3D canvas is masked |

- The tests start their own dev server on port 5190 and always run in offline demo mode: the API address points at a port nothing listens on, and every request to it is aborted.
- The simulation is seeded and paused at a fixed simulated time, so the screenshots are repeatable.

### Visual tests {#visual-tests}

The 8 tests in <CodeLink path="frontend/web/e2e/visual.spec.ts" /> compare screenshots of stable panels with committed baseline images (10 images). The 3D canvas is masked and CSS animations are disabled, so only the interface around the body is compared.

- **Where the baselines live:** `frontend/web/e2e/__screenshots__/linux/visual.spec.ts/`. Only Linux baselines are committed (no Windows baselines).
- **In CI:** the end to end job runs with `E2E_VISUAL=1`, so the visual tests run against the Linux baselines on every pull request. Outside Windows the file is skipped unless `E2E_VISUAL=1` is set.
- **How to regenerate them after an intended UI change:** push a branch named `visual/baselines`. The manual workflow `.github/workflows/visual-baselines.yml` runs the visual tests with `E2E_VISUAL=1` and uploads the Linux images as the artifact `visual-baselines-linux`. Download it and commit the images under `frontend/web/e2e/__screenshots__/linux/`. On Windows, `npm run e2e:update` regenerates the local images.

## Principles

- **Test the safety properties.** Several tests exist only to prove that missing data is never normal, that self report never escalates alone, that replies never prescribe, and that patients are pseudonymized.
- **Deterministic.** Seeds make every scenario test reproducible.
- **Scenario tests check behavior, not exact numbers**, so tuning a demo value does not break them unless the behavior changes.
- **Evaluation is separate.** Detection times and false alert rates come from `npm run evaluate`, not from asserts.
- **Anatomy is tested as data, not as pixels.** The mapping from structures to regions, the selection rules and the manifest are pure TypeScript and run in node. The contract test reads the published GLB files, so a rebuilt atlas that breaks an id the app relies on fails `npm test`.

## In CI

The CI workflow (`.github/workflows/ci.yml`) has two jobs. **App** runs lint, the typecheck, `npm test` and the production build. **End to end** installs Chromium and runs `npm run e2e` (the functional tests and, with `E2E_VISUAL=1`, the visual tests against the committed Linux baselines). Both run on pushes to `master` and pull requests to `master` or `develop` that touch `frontend/web/**`. The backend has its own workflow (`backend.yml`). The documentation build runs in pull requests (`docs-check.yml`) and in the deploy on `master`. A manual workflow (`visual-baselines.yml`, branches named `visual/**`) regenerates the Linux visual baselines. See [Documentation and deployment](./deployment#validation).

## Next steps

- [Validation strategy](../validation/strategy)
- [Traceability matrix](../validation/traceability)
