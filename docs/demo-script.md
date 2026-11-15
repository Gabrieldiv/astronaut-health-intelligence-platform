# AHI demo script (about 4 to 5 minutes)

All device data in this prototype is **simulated** and labeled `SIMULATED` everywhere; say so once at the start. The NASA space weather events (DONKI) and the OSDR lab panels are real public data, shown as mission context only. The platform is decision support, not a diagnosis.

## 0. Setup (before presenting)

1. `cd frontend/web && npm run dev`, open http://localhost:5173 in full screen (1440x900 or larger).
2. Optional, for live NASA data and Ask AHI: start the backend (`cd backend && uvicorn app.main:create_app --factory --port 8000`) with `ANTHROPIC_API_KEY` in `backend/.env`. Without it the app runs in offline demo mode (bundled DONKI snapshot, "Assistant offline").
3. Scenario: **Nominal day**, speed **1 min/s**, mission profile **ISS**. Optionally **Presentation mode** (`P`).
4. Check that sound is on (Tools > Accessibility and sound) and click once in the page so the browser allows audio.

## 1. Problem (20 s)

Long missions expose crews to five hazards (radiation, isolation, distance from Earth, altered gravity, closed environments). Signals come from many devices at different rates. Medical support is far away, so the crew needs to understand its own state fast.

## 2. The screen in 10 seconds (30 s)

- Left: the crew. Each card says in plain words how that person is doing ("All good", "Keep an eye", "Act soon", "Act now").
- Center: the 3D body, a realistic anatomical atlas. A scan band sweeps it to show monitoring is live. Systems that need attention light up in their status color; the heart beats at the live heart rate, the lungs breathe at the live breathing rate.
- Right: **What needs attention**: status, why, and what to do.
- Bottom: live vitals, cabin and devices. The `SIMULATED` badge is always visible.

## 3. Monitor mode and zoom (20 s)

1. Point at the **Monitor** button under the body: only monitored systems react; the rest is quieter and click-through.
2. Scroll over the heart: the view **zooms toward the pointer**. Click the heart: the panel shows its readings, the personal band and **Measured by** (the Bio-Monitor shirt, its battery and last contact).
3. Optional: switch to **Explore** and click the stomach: "Context only, not monitored. That is not the same as normal."

## 4. Acute event, sound and fast decision (50 s)

1. Pick **Acute cardio event** (ORION), speed **1 min/s**.
2. Within simulated minutes: heart rate up, blood oxygen down, a CRITICAL banner appears and the **alert sound** rings. It repeats every 30 s until someone acknowledges it.
3. Show the recommended actions (flight surgeon review is flagged). Click **Mark done** on the rest protocol: it is logged in the audit trail and the simulation shows a hypothetical recovery (simulation, not clinical efficacy).
4. Acknowledge the alert: the sound stops.
5. Press `D`: the app **describes the screen aloud** (audio description, browser speech). Press `D` again to stop.

## 5. Mission profiles and space weather (40 s)

1. Click the mission control in the top bar (it opens the Mission and Earth link panel), pick **Mars transit** in the Mission tab.
2. Show the hazards, the cited reference values (MSL RAD cruise dose, 4 to 24 min delay) and the **mission dose bar** against the NASA career limit of 600 mSv (NASA-STD-3001).
3. Show the **space weather** card: real NASA DONKI events. If a recent X class flare or a solar particle event is in the window, it says "Move to the radiation storm shelter"; otherwise it is calm. It says whether the data is live or the bundled snapshot. Missing data reads "unknown", never all clear.
4. Message: far from Earth, the crew acts first; the ground reviews later.

## 6. Slow drift (40 s)

1. Pick **Progressive fatigue** (LYRA), speed **1 h/s**.
2. Sleep drops, HRV falls below LYRA's own band, resting heart rate drifts up. Click the **Heart** chip: personal band, history, forecast cone. Pick the **7 days** horizon: the band widens with the horizon.
3. Message: the system does not wait for one number to cross an arbitrary line. It looks at pattern, persistence and context against each person's own baseline.

## 7. Eyes (30 s)

1. Pick **Eye changes (SANS like)** (ORION). The demo starts on mission day 44, so the flight day 30 eye exam already shows a change: the eyes read **Watch** right away.
2. Click the **Eyes** chip: the exam history (OCT retinal thickness, optic nerve sheath, acuity) against the pre-flight baseline. A change beyond the published 19.4 µm variability is a Watch; two signs in one session (the flight day 90 exam in this scenario) is a Warning (demo rule). "No exam yet" is never normal. Point at the two small rings on the sides of the head: the ears, monitored with hearing tests.

## 8. Crew view (20 s)

Press `V`. The astronaut's own screen: a big status word, at most two things to do, the **Your body systems** cards (tap one to highlight it on the body) and the 30 second check-in. Press `V` to come back.

## 9. Ask AHI (20 s, only if a key is set)

Open **Ask AHI** (top bar, or press `K`) and click "How is ORION doing?". The answer streams, explains what the engine already shows and ends with "Based on:". It never diagnoses. Say that a real mission needs an onboard offline model; the cloud model is a demo only.

## 10. Impact (15 s)

> We turn physiological and environmental signals into one integrated, explainable view of each astronaut's health, spotting trends before they become operational problems.

Next steps: port the engine to the Python backend, a clinical review flow, authentication and role based access control, real ISS cabin data from NASA EDA, textures and a female reference model for the 3D body.

## Backup beats

- **Sensor failure** (VEGA, 1 min/s): organs turn grey and the heart stops animating. Missing data is never shown as normal.
- **Pause a device**: open Devices in the vitals strip and pause the shirt. Its readings say "Paused by operator", no data, and no sensor failure alarm.
- **Cabin CO2 rise** (10 min/s): the whole crew shifts slightly; the app shows co-occurrence and reminds that correlation is not causation.
- **Guided demo**: **Start demo** runs a 10 step tour by itself (about 2 minutes on Auto).
