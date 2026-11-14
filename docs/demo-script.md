# AHI demo script (about 4 minutes)

All device data in this MVP is **simulated** and labeled `SIMULATED` everywhere. The platform is decision support, not a diagnosis.

## 0. Setup (before presenting)
1. `cd frontend/web && npm run dev`, open http://localhost:5173 in full screen (1440x900 or larger).
2. Scenario: **Nominal day**, speed **1 min/s**.

## 1. Problem (30 s)
Long missions expose crews to five hazards (radiation, isolation, distance from Earth, altered gravity, closed environments). Signals come from many devices at different rates. Medical support is far away, so the crew needs to understand its own state fast.

## 2. The screen in 10 seconds (40 s)
- Left: the crew. Each card says in plain words how that person is doing ("All good", "Keep an eye", "Act soon", "Act now").
- Center: the 3D body. Organs glow in the color of their status. The heart beats at the live heart rate, the lungs breathe at the live breathing rate.
- Right: **What needs attention**: status, why, and what to do.
- Bottom: live vitals, cabin environment and device status. The `SIMULATED DATA` badge is always visible.

## 3. Progressive fatigue (60 s)
1. Pick **Progressive fatigue** (affects LYRA), speed **1 h/s**.
2. Sleep drops, HRV falls below LYRA's own normal band, resting heart rate drifts up.
3. The brain and heart turn amber, then orange. Click the heart: the trend chart shows the personal baseline band, the history and the forecast cone.
4. Message: the system does not wait for one number to cross an arbitrary line. It looks at pattern, persistence and context against each person's own baseline.

## 4. Acute event and fast decision (50 s)
1. Pick **Acute cardio event** (ORION), speed **1 min/s**.
2. Within simulated minutes: heart rate up, blood oxygen down, a CRITICAL banner appears.
3. Show the recommended actions (flight surgeon review is flagged). Click **Mark done** on the rest protocol: the intervention is logged in the audit trail and the simulation shows a hypothetical recovery (clearly labeled as simulation, not clinical efficacy).
4. Acknowledge the alert.

## 5. Sensor failure (30 s)
1. Pick **Sensor failure** (VEGA).
2. The shirt goes stale, then offline. Organs turn grey and the heart stops animating: **missing data is never shown as normal**.
3. The recommendation is to check sensor fit.

## 6. Environment (20 s)
**Cabin CO2 rise**: the whole crew shifts slightly (breathing rate, reaction time). The app shows co-occurrence and reminds that correlation is not causation.

## 7. Impact (20 s)
> We turn physiological and environmental signals into one integrated, explainable view of each astronaut's health, spotting trends before they become operational problems.

Next steps: real NASA OSDR datasets (`REAL_PUBLIC`), backend ingestion API (FastAPI) behind the same device adapter contract, flight surgeon review workflow.
