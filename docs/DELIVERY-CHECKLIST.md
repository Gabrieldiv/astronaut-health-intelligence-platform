# Final delivery checklist (NASA Space Apps 2026)

One page for the submission. Challenge: [Health Monitoring Software](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/). Deadline: submission until 23:59 (UTC-3).

## Links
- [ ] Repository: https://github.com/lucaspalharesbarbosa/astronaut-health-intelligence-platform
- [ ] Docs portal (English): https://lucaspalharesbarbosa.github.io/astronaut-health-intelligence-platform/
- [ ] Docs portal (Portuguese): https://lucaspalharesbarbosa.github.io/astronaut-health-intelligence-platform/pt/
- [ ] The default branch is `master` and the last CI run on it is green (badge at the top of the README).
- [ ] The portal opens online and the Roadmap and Limitations pages show the access control note (no login in this version).
- [ ] Licenses are in place: code is MIT (`LICENSE`), the 3D anatomy files are CC BY-SA 4.0 (`frontend/web/public/anatomy/LICENSE.md`).

## Run it in 3 commands
Needs Node.js 20.19 or newer. No backend and no API key: the demo works offline.
```bash
git clone https://github.com/lucaspalharesbarbosa/astronaut-health-intelligence-platform.git
cd astronaut-health-intelligence-platform/frontend/web
npm install && npm run dev
```
Open http://localhost:5173 (best at 1440x900 or larger). The first load takes a few seconds.
Optional backend for live NASA DONKI data and Ask AHI: see "App plus backend" in the `README.md`.

## Before presenting
- [ ] Full screen browser at 1440x900 or larger; click once in the page so the browser allows sound.
- [ ] Scenario **Nominal day**, speed **1 min/s**, mission profile **ISS** (the defaults of `docs/demo-script.md`).
- [ ] Optional: Tools menu > **Presentation mode** (key `P`).
- [ ] Fallback if something misbehaves: click **Start demo** in the top bar. The guided 10 step tour runs by itself in about 2 minutes.

## The 4 minute demo, in order
Full script with the talking points: [demo-script.md](demo-script.md).

| Time | Click or press | Say |
| --- | --- | --- |
| 0:00 | Nothing. Point at the **SIMULATED** badge, the crew cards, the 3D body, **What needs attention** | The data is simulated and labeled. Each person is compared with their own normal. Decision support, not a diagnosis |
| 0:30 | Hover **Monitor** under the body. Scroll over the heart to zoom, click the heart. Point at **Measured by** | Only monitored systems react. The panel shows the personal band and the device behind each reading |
| 1:00 | Click the scenario button in the top bar, choose **Acute cardio event**. Wait for the CRITICAL banner and the sound. Click **Mark done** on the rest action, then acknowledge the alert. Press `D` | Fast alerting with sound that escalates until acknowledged, actions flagged for the flight surgeon, audio description |
| 2:00 | Click the **Mission and Earth link** control in the top bar. In the Mission tab pick **Mars transit**. Show the dose bar, then the **Space weather** tab | Cited values, the NASA 600 mSv career limit, real NASA DONKI events as context only. Far from Earth the crew acts first |
| 2:40 | Choose scenario **Progressive fatigue**, speed **1 h/s**. Click the **Heart** chip and pick the **7 days** horizon | Slow drifts against the personal baseline, forecast band that widens with the horizon |
| 3:20 | Press `V` for the Crew view | The astronaut sees one status word, at most two things to do and the Your body systems cards |
| 3:40 | Impact line, then the limitations below | See `docs/demo-script.md`, section 10 |

Backup beats if there is time: **Sensor failure** scenario (organs turn grey, missing data is never normal), pause a device in the vitals strip (shows "Paused by operator"), **Ask AHI** (top bar, or key `K`; needs the backend and a key, otherwise it says Assistant offline).

## Known limitations to say out loud
- All device data is **simulated**. Real NASA data (OSDR panels, DONKI space weather) is reference and mission context only and never feeds a status.
- **No authentication and no role based access control** in this version: the demo has no login. A real deployment needs SSO (OIDC) and server side RBAC in the backend.
- Decision support, not a medical device. Thresholds are demo configuration, not official NASA limits.
- One adult male reference body for every crew member, no textures, procedural kidneys.
- The health engine runs in the browser; the backend does not run it yet. The audit trail is lost on reload.
- Ask AHI uses a cloud model in the demo, which is not acceptable on a real mission. The onboard offline design is in `docs/assistant-architecture.md`.
- Português (Brasil), Español, 日本語 and Deutsch are machine assisted and pending native review.
- Not done yet: clinical review flow, engine port to Python, female reference model, BodyParts3D kidney. All are on the Roadmap page of the portal.

## Where to read more
- Docs portal: Product tour, Feature status matrix, Limitations, Roadmap.
- `README.md`: quick start, scenarios, data and science, license.
- `docs/HANDOFF-final-delivery.md`: what is left (Linux visual baselines, portal screenshots, native translation review).
