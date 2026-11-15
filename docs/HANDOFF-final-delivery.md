# Handoff: finishing the final delivery (NASA Space Apps 2026)

Written on 2026-11-15 at about 15:15 (UTC-3) for the team member who finishes the delivery.
Deadline: submission until **23:59**, work done by **23:30**.

## 1. Where things stand

| Item | State |
| --- | --- |
| `develop` | Has everything: PR 2 (final delivery) and PR 3 (wave A adjustments), all CI green |
| `master` | Being updated from `develop` by a PR opened right after this document (check it on GitHub) |
| Docs portal (GitHub Pages) | Deploys from `master` on push; still describes the version before wave A |
| Tests | 413 unit tests, 13 Playwright end to end tests, backend pytest, docs build: all green on `develop` |

Repository: https://github.com/lucaspalharesbarbosa/astronaut-health-intelligence-platform

### What is in the app now (short)
- **3D anatomy** on the Z-Anatomy atlas:
  - zoom toward the pointer; Monitor mode (only monitored parts clickable) and Explore mode;
  - keyboard navigator and body scan sweep;
  - **mission backdrops** per profile (Launch, ISS, Moon, Mars transit);
  - auto rotation that pauses 3 s after a click.
- **Health:**
  - mission profiles with cited radiation, gravity, distance and delay; dose versus the NASA 600 mSv career limit;
  - space weather from NASA DONKI;
  - eye health (SANS) and hearing;
  - CUSUM drifts and an experimental Isolation Forest (never changes status);
  - forecast horizons from 24 h to 15 days.
- **Panels:** visual first. Factor chips, action cards, gauges, sparklines, and a mission dialog with a dose bar.
- **Devices:** pause and resume; a paused device shows "Paused by operator", never "Signal lost".
- **Backend** (`backend/`, FastAPI, optional):
  - registry, ingestion, observations, NASA DONKI and OSDR, assistant (Claude API), analytics;
  - the app works fully offline without it;
  - Automatic, Online or Offline switch in Data and model > NASA context, plus a status chip in the top bar.
- **Accessibility:** alert sounds, audio description (D key), skip links, one voice when the language changes.
- **Languages:**
  - English by default; Português (Brasil), Español, 日本語 and Deutsch are optional, machine assisted and pending native review;
  - engine sentences are translated through `src/i18n/engineText.ts`.

## 2. Rules you must follow (from `CLAUDE.md`)
- **Never** write the em dash or en dash characters anywhere (code, UI, docs, commits).
- UI default language is English. Decision support only: no diagnosis, no medication, no invented "official NASA limits". Every external number carries a citation.
- All device data is SIMULATED and labeled. Missing data is never shown as normal.
- **Git:** this project always commits and pushes with the personal account `lucaspalharesbarbosa`. Work on a branch from `develop`, open a PR to `develop`, merge after CI is green. `develop` goes to `master` by PR.

## 3. How to run and check
```bash
cd frontend/web && npm install && npm run dev        # http://localhost:5173
npx tsc -b && npm run lint && npx vitest run --maxWorkers=3 && npx vite build
npx tsc -p e2e                                        # e2e sources typecheck
npm run e2e                                           # Playwright (needs Chromium)
```
```bash
cd docs-site && npm install && npm run docs:build     # portal with dead link check
cd backend && python -m venv .venv && .venv\Scripts\activate && pip install -r requirements-dev.txt && python -m pytest
```
Useful dev helpers in the browser console:
- `window.__ahi.getState().setMissionProfile('MARS_TRANSIT')`
- `window.__ahi.getState().fastForward(ms)`
- `?lang=qps` shows a pseudo locale that brackets every translated string, so untranslated text stands out.

## 4. What is left, in priority order

### 4.1 Docs for wave A (about 1 h)
The portal (`docs-site/`, English and `docs-site/pt/`) and `README.md` do not yet describe the wave A changes. Update them in English and Portuguese:

| Topic | Code |
| --- | --- |
| Mission backdrops | `src/features/mission/backdrops/` |
| Favicon status dot | `src/app/useStatusFavicon.ts` |
| Auto rotation rule | `src/features/anatomy/viewer/autoRotate.ts` |
| Visual first panels | `src/features/attention/`, `src/components/viz/` |
| Paused device states | `src/features/attention/feedState.ts` |
| z-index scale | `src/index.css` |
| Language change speech stop | `src/features/a11y/languageSpeech.ts` |
| Online and offline switch | `src/lib/api/connectivity.ts`, `src/features/connectivity/` |
| Engine text translation | `src/i18n/engineText.ts`, `src/engine/msg.ts` |
| Pseudo locale and sweep script | `src/i18n/pseudo.ts`, `scripts/i18n-sweep.mjs` |

Pages to touch:
- `product/` (tour, accessibility)
- `architecture/` (backend, 3D anatomy)
- `intelligence/mission-profiles`
- the status and traceability matrices
- the roadmap

Run the docs build before the PR.

### 4.2 Remaining translations (about 1 h)
Still English when another language is selected:
- exam detail notes and exam region summaries (`src/engine/exams/book.ts`, `assess.ts`);
- two forecast messages ("insufficient data" and the per horizon "not enough history" note);
- data quality notes in `src/engine/engine.ts`;
- mission profile data texts (`src/engine/missions/profiles.ts`);
- some symptom tags without a `checkin.symptomInline.*` key.

How to do it:
1. Add a structured message next to the English text in the engine (pattern in `src/engine/msg.ts`).
2. Add the keys to `src/i18n/locales/<lang>/engine.ts` for en, pt-BR, es, ja, de.
3. Render the text through `engineText`.

`src/i18n/i18n.test.ts` and `src/i18n/engineText.test.ts` check key parity, placeholders and dashes. Then run the app with `?lang=qps` and `node scripts/i18n-sweep.mjs` to find what is left.

Plain text handover and packets to ground stay English **by design**.

### 4.3 Final quality pass (about 45 min)
Walk `docs/demo-script.md` in the app, in English and once in Portuguese:
- each mission profile;
- scenarios Acute cardio, Sensor failure, Eye changes;
- pause and resume a device;
- forecast 24 h to 15 days;
- Crew view;
- audio description (D) and a language change while speaking;
- the Online and Offline switch;
- Ask AHI offline.

Fix small issues on a branch from `develop`.

### 4.4 Screenshots and visual baselines (about 50 min, needs a working Chromium)
- Refresh the portal screenshots in `docs-site/public/screenshots/`. A capture script was prepared during the session, but it lives in a temporary folder; recreate it if needed with Playwright `page.screenshot` at 1440x900.
- Generate the Playwright visual baselines on Windows: `npm run e2e:update` (visual tests are skipped in CI on Linux by design).
- On the original dev machine, headless Chromium stopped starting after a memory and network failure; a reboot should fix it.

### 4.5 Ship
1. Open a PR from `develop` to `master`. CI runs app, e2e, backend and docs checks.
2. Merge when it is green. The push to `master` deploys the docs portal (GitHub Pages).
3. Check the portal online.

## 5. Optional, only if time allows
- **Assistant with a real key:**
  - put `ANTHROPIC_API_KEY` in `backend/.env` (never commit it), start the backend and try Ask AHI;
  - model `claude-opus-5-5`, low effort, server side refusal fallback.
- **Docker Compose with PostgreSQL:** `docker compose up --build` (only SQLite was run so far).
- **Native review of the translations**, especially Japanese and German.

## 6. Known limitations (say them, do not hide them)
- **Anatomy:**
  - one adult male reference anatomy for every crew member;
  - no textures; kidneys are procedural;
  - the inner ear is not in the atlas (license), so the ears are a marker.
- **Data:**
  - DONKI and OSDR are public mission context, never astronaut measurements;
  - device data is simulated.
- **Machine learning:** the multivariate detector is experimental and informational.
- **Roadmap (not done):**
  - engine port to Python;
  - clinical review flow with a decision record;
  - access profiles;
  - female reference model;
  - BodyParts3D kidney.

## 7. Machine notes (original dev machine only)
- **Git hangs on HTTPS with the Windows TLS backend.** Push with:
  `git -c http.sslBackend=openssl -c credential.helper= -c "credential.helper=!gh auth git-credential" push`
- **Untracked files from another session** (not part of the delivery unless the owner decides):
  - EDA import: `data/raw/EDA/`, `data/processed/EDA-*`, `data/manifests/EDA.json`, `data/references/`, `data/AHI_dados_reais_publicos.xlsx`, `frontend/web/scripts/eda/`, `frontend/web/scripts/dataset/`;
  - edits in `docs/data-guide.md` and `docs/data-source-inventory.md`.
