# Handoff: finishing the final delivery (NASA Space Apps 2026)

Updated on 2026-11-15 in the evening (UTC-3), for the team member who finishes the delivery.
Deadline: submission until **23:59**, work done by **23:30**.
The submission checklist (links, 3 commands, the 4 minute demo) is [DELIVERY-CHECKLIST.md](DELIVERY-CHECKLIST.md).

Repository: https://github.com/lucaspalharesbarbosa/astronaut-health-intelligence-platform
Docs portal: https://lucaspalharesbarbosa.github.io/astronaut-health-intelligence-platform/

## 1. Where things stand

| Item | State |
| --- | --- |
| `master` | Holds the final delivery. The docs portal is published from it by GitHub Actions |
| Tests (measured on the final commit) | 450 web unit tests in 49 files (vitest), 86 backend tests in 7 files (pytest), 23 Playwright functional tests and 8 Playwright visual tests |
| Visual tests | Run in CI: the Linux baselines are committed under `frontend/web/e2e/__screenshots__/linux/visual.spec.ts/` and the end to end job sets `E2E_VISUAL=1` |
| Docs portal | English and Portuguese, in parity |

### Done
- Waves of docs and engine text translated through structured messages (`src/engine/msg.ts`, `src/i18n/engineText.ts`). The plain text handover and the packets to the ground stay English by design.
- Indicator breakdown (`src/features/stage/IndicatorBreakdown.tsx`), the mission chip that opens the Mission and Earth link panel (starts with "What the mission profile changes"), the crew profile (`src/features/profile/`, key `I`), Ask AHI in the top bar (key `K`), the connection mode (Automatic, Online, Offline).
- Playwright suites: the demo script (`frontend/web/e2e/demo-script.spec.ts`) and visual (`visual.spec.ts`), CI job "End to end" in `.github/workflows/ci.yml`.
- Linux visual baselines committed. To regenerate them after an intended UI change: push a branch named `visual/baselines` (`git push origin HEAD:refs/heads/visual/baselines`), let `.github/workflows/visual-baselines.yml` run, download the artifact `visual-baselines-linux` into `frontend/web/e2e/__screenshots__/linux/` and commit it. For local Windows runs: `npm run e2e:update` in `frontend/web`.

## 2. Rules you must follow (from `CLAUDE.md`)
- **Never** write the em dash or en dash characters anywhere (code, UI, docs, commits).
- UI default language is English. Decision support only: no diagnosis, no medication, no invented "official NASA limits". Every external number carries a citation.
- All device data is SIMULATED and labeled. Missing data is never shown as normal.
- **Git:** this project commits and pushes with the personal account `lucaspalharesbarbosa`. Work on a branch, open a PR to `master`, merge after CI is green.

## 3. How to run and check
```bash
cd frontend/web && npm install && npm run dev        # http://localhost:5173
npx tsc -b && npm run lint && npx vitest run --maxWorkers=3 && npx vite build
npx tsc -p e2e                                        # e2e sources typecheck
npm run e2e                                           # Playwright (needs Chromium: npx playwright install chromium)
```
```bash
cd docs-site && npm install && npm run docs:build     # portal with dead link check (slow, about 3 minutes)
cd backend && python -m venv .venv && .venv\Scripts\activate && pip install -r requirements-dev.txt && python -m pytest
```
Useful dev helpers in the browser console:
- `window.__ahi.getState().setMissionProfile('MARS_TRANSIT')`
- `window.__ahi.getState().fastForward(ms)`
- `?lang=qps` shows a pseudo locale that brackets every translated string, so untranslated text stands out.

## 4. What is left (all optional)

### 4.1 Refresh the portal screenshots (needs a Chromium with a GPU)
Several images in `docs-site/public/screenshots/` are stale (for example `mars-comms.png` still shows the Earth link drawer, before the unified Mission and Earth link panel). Recreate them with Playwright `page.screenshot` at 1440x900 and keep the file names.

### 4.2 Native review of the four translations
Português (Brasil), Español, 日本語 and Deutsch are machine assisted and marked as pending native review in the app and in the portal. Have a native speaker go through `frontend/web/src/i18n/locales/<lang>/`, using `docs/i18n-glossary.md` as the terminology reference. `src/i18n/i18n.test.ts` and `src/i18n/engineText.test.ts` keep key parity, placeholders and dashes safe; `node scripts/i18n-sweep.mjs` lists UI strings still outside the catalog.

### 4.3 Static deployment on Vercel (optional)
Import the repository with Root Directory `frontend/web`, build command `npm run build`, output directory `dist` and the environment variable `VITE_API_URL=off`. The app then always runs offline (bundled DONKI snapshot, assistant off). No Vercel configuration file is committed.

### 4.4 Assistant with a real key
Already tested by the product owner on their machine. To repeat: copy `backend/.env.example` to `backend/.env`, set `ANTHROPIC_API_KEY` (never commit it), start `uvicorn app.main:create_app --factory --port 8000` in `backend`, and use Ask AHI with the connection mode on Automatic or Online.

### 4.5 EDA data import (untracked, outside the repository)
The NASA EDA import lives untracked on the original dev machine, not in git: `data/raw/EDA/`, `data/processed/EDA-*`, `data/manifests/EDA.json`, `data/references/`, `data/AHI_dados_reais_publicos.xlsx`, `frontend/web/scripts/eda/`, `frontend/web/scripts/dataset/`. The product owner decides whether to bring it in. Cabin telemetry stays simulated until then.

### 4.6 Docker Compose with PostgreSQL
`docker compose up --build` (only SQLite was run so far).

## 5. Known limitations (say them, do not hide them)
- **Authentication and role based access control are NOT implemented.** The demo has no login and the API is open. A real deployment needs SSO (OpenID Connect) and server side RBAC enforced in the FastAPI backend (roles crew member, flight surgeon, mission control, administrator; crew sees only own data; audit of access). Design sketch: portal page Roadmap, item 3.
- **Anatomy:**
  - one adult male reference anatomy for every crew member;
  - no textures; kidneys are procedural;
  - the inner ear is not in the atlas (license), so the ears are a marker.
- **Data:**
  - DONKI and OSDR are public mission context, never astronaut measurements;
  - device data is simulated.
- **Machine learning:** the multivariate detector is experimental and informational.
- **The engine runs in the browser**; the backend does not run it yet. The audit trail is in memory.
- **Roadmap (not done):**
  - engine port to Python;
  - clinical review flow with a decision record;
  - authentication and role based access control;
  - female reference model, textures, BodyParts3D kidney.

## 6. Machine notes (original dev machine only)
- **Git hangs on HTTPS with the Windows TLS backend.** Push with:
  `git -c http.sslBackend=openssl -c credential.helper= -c "credential.helper=!gh auth git-credential" push`
- The untracked EDA files are described in section 4.5.
