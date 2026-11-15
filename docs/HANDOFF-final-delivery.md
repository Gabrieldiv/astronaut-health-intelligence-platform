# Handoff: finishing the final delivery (NASA Space Apps 2026)

Updated on 2026-11-15 in the evening (UTC-3), for the team member who finishes the delivery.
Deadline: submission until **23:59**, work done by **23:30**.
The submission checklist (links, 3 commands, the 4 minute demo) is [DELIVERY-CHECKLIST.md](DELIVERY-CHECKLIST.md).

Repository: https://github.com/lucaspalharesbarbosa/astronaut-health-intelligence-platform
Docs portal: https://lucaspalharesbarbosa.github.io/astronaut-health-intelligence-platform/

## 1. Where things stand

| Item | State |
| --- | --- |
| `master` | Has the final delivery (PR 5) and the handoff guide (PR 4) |
| Branch `feature/final-delivery-polish` | Has the polish work below plus the docs updates. Open a PR to `master` when it is green; the push to `master` deploys the portal |
| Docs portal | English and Portuguese, in parity. Wave A pages, the unified Mission and Earth link panel, the e2e and CI pages, and the roadmap with the access control design sketch are written |
| Tests | 430 vitest tests in 48 files on this branch (`npx vitest run` prints the current number, it grows as branches merge), 44 backend pytest tests, 14 Playwright functional tests plus 6 Playwright visual tests |

### Done
- **Wave A docs** (mission backdrops, favicon dot, auto rotation, visual first panels, paused device states, z-index scale, speech stop on a language change, online and offline switch, engine text, pseudo locale): in the portal and README, EN and PT.
- **Remaining translations**: exam notes, forecast notes, device pause notes, autonomy guidance and mission profile texts now go through structured messages (`src/engine/msg.ts`, `src/i18n/engineText.ts`). The plain text handover and the packets to the ground stay English by design.
- **Polish work** (code on this branch or merged into it; check `git log` for the exact commits):
  - indicator breakdown: the "n/total indicators normal" count opens a breakdown by body system (`src/features/stage/IndicatorBreakdown.tsx`);
  - mission chip: one top bar control opens the Mission and Earth link panel (tabs Mission, Earth link, Space weather) that starts with "What the mission profile changes";
  - crew profile view, translation review and the extra e2e coverage: these were handled by other agents in parallel. If `frontend/web/src/features/profile/` exists in the repository, the crew profile is in; its documentation belongs to that work.
- **e2e coverage**: Playwright suite for the demo script (`frontend/web/e2e/demo-script.spec.ts`), a visual suite (`visual.spec.ts`), CI job "End to end" in `.github/workflows/ci.yml`.
- **Accuracy pass** of README and portal: test counts, the unified Mission and Earth link panel, Ask AHI in the top bar, CI jobs, engine text coverage, and the access control statement (below).

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

## 4. What is genuinely left, in priority order

### 4.1 Linux visual baselines (about 20 min, needs the GitHub repository)
No visual baseline image is committed yet (neither Windows nor Linux), so the 6 visual tests are skipped in CI.
1. Push a branch named `visual/baselines`: `git push origin HEAD:refs/heads/visual/baselines`. The workflow `.github/workflows/visual-baselines.yml` runs the visual tests with `E2E_VISUAL=1` and uploads the snapshots as the artifact `visual-baselines-linux`.
2. Download the artifact into `frontend/web/e2e/__screenshots__/linux/` and commit it.
3. In `.github/workflows/ci.yml`, set `E2E_VISUAL: '1'` in the `env` of the step "End to end tests" of the `e2e` job, so CI compares against those images. Update the comments in `frontend/web/playwright.config.ts` and `frontend/web/e2e/visual.spec.ts` that say Windows baselines are committed.
4. Optional, for local runs on Windows: `npm run e2e:update` in `frontend/web`.

### 4.2 Refresh the portal screenshots (about 40 min, needs a working Chromium with a GPU)
`docs-site/public/screenshots/` still shows older layouts (for example the Earth link drawer in `mars-comms.png`, before the unified Mission and Earth link panel). Recreate them with Playwright `page.screenshot` at 1440x900 and keep the file names. The headless Chromium on the original dev machine stopped starting after a memory and network failure; a reboot should fix it.

### 4.3 Native review of the four translations
Português (Brasil), Español, 日本語 and Deutsch are machine assisted and marked as pending native review in the app and in the portal. Have a native speaker go through `frontend/web/src/i18n/locales/<lang>/`. If `docs/i18n-glossary.md` exists in the repository, use it as the terminology reference. `src/i18n/i18n.test.ts` and `src/i18n/engineText.test.ts` keep key parity, placeholders and dashes safe; `node scripts/i18n-sweep.mjs` lists UI strings still outside the catalog.

### 4.4 Optional
- **Assistant with a real key:** put `ANTHROPIC_API_KEY` in `backend/.env` (never commit it), start the backend and try Ask AHI. Model `claude-opus-5-5`, low effort, server side refusal fallback.
- **Docker Compose with PostgreSQL:** `docker compose up --build` (only SQLite was run so far).

### 4.5 Ship
1. Open the PR to `master`. CI runs the app, end to end, backend and docs checks.
2. Merge when it is green. The push to `master` deploys the docs portal (GitHub Pages).
3. Check the portal online.

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
- **Untracked files from another session** (not part of the delivery unless the owner decides):
  - EDA import: `data/raw/EDA/`, `data/processed/EDA-*`, `data/manifests/EDA.json`, `data/references/`, `data/AHI_dados_reais_publicos.xlsx`, `frontend/web/scripts/eda/`, `frontend/web/scripts/dataset/`;
  - edits in `docs/data-guide.md` and `docs/data-source-inventory.md`.
