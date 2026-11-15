---
title: Product Tour
description: A walk through every part of the Astronaut Health Intelligence Platform interface, Ground view and Crew view, with real screenshots.
status: IMPLEMENTED
origin: SIMULATED
code:
  - frontend/web/src/app/App.tsx
  - frontend/web/src/features/topbar/TopBar.tsx
  - frontend/web/src/features/attention/AttentionPanel.tsx
  - frontend/web/src/features/attention/StructureDetail.tsx
  - frontend/web/src/features/attention/RegionEvents.tsx
  - frontend/web/src/features/crewview/CrewView.tsx
  - frontend/web/src/features/profile/CrewProfileDialog.tsx
  - frontend/web/src/features/mission/MissionContext.tsx
  - frontend/web/src/features/attention/MeasuredBy.tsx
  - frontend/web/src/features/attention/HorizonPicker.tsx
  - frontend/web/src/features/vitals/DevicesIndicator.tsx
  - frontend/web/src/features/attention/FeedStatus.tsx
  - frontend/web/src/components/viz/BandGauge.tsx
  - frontend/web/src/features/mission/backdrops/MissionBackdrop.tsx
  - frontend/web/src/features/connectivity/index.tsx
  - frontend/web/src/app/useStatusFavicon.ts
verified: 2026-11-15
---

# Product Tour

The Astronaut Health Intelligence Platform (AHI) is a single screen application with two views over the same live state. This page walks through every part of the interface. All values you see are simulated.

![Ground view with the crew rail, 3D body, what needs attention panel, status timeline and live vitals](/screenshots/ground-view.png)

## Status language

Every status combines **color, icon and words**, so color is never the only cue. Plain words come first, the technical term second.

| Level | Crew wording | Technical label | Color |
| --- | --- | --- | --- |
| `LOW` | All good | Nominal | Green |
| `MODERATE` | Keep an eye | Watch | Amber |
| `HIGH` | Act soon | Warning | Orange |
| `CRITICAL` | Act now | Critical | Red |
| `NO_DATA` | Signal lost | No data | Grey |

These are operational attention levels of the prototype, not medical classifications.

## Ground view and Crew view

| | Ground view | Crew view |
| --- | --- | --- |
| For | Flight surgeon and mission control | The astronaut the data is about |
| Scope | Whole crew | One astronaut |
| Content | Crew rail, 3D body, attention panel, timeline, live vitals, cabin, devices | Big status word and headline, 3D body, at most two things to do, "Your body systems" cards, check-in, "Your body vs your normal" |
| Detail | Risk score, confidence, rule ids, forecasts | No risk score or model details |

Switch with the **Ground / Crew** toggle in the top bar or press `V`. The choice is remembered in the browser.

![Crew view: a large status word, the top two actions with autonomy badges, the daily check-in and vitals against the personal normal](/screenshots/crew-view.png)

The Crew view keeps the language simple: "Do this now", "Do this soon" or "When you can" on each action, and "Normal for you" or "13% above your normal" on each vital. When there is nothing to do it says so: "Nothing to do right now. Keep your usual routine."

**Your body systems** lists one card per body system, one per row: a plain label (for example "Heart"), its status in words and color, and its key reading. Tap a card to highlight that system on the 3D body.

## Top bar

The top bar has three zones: identity on the left, the scenario player in the center, and tools on the right.

| Element | What it does |
| --- | --- |
| AHI logo and **SIMULATED** chip | Always visible. Click the chip to see where the data comes from (simulated device adapters, planned real data, derived values) |
| Mission name and **mission profile** | Launch and ascent, ISS, Moon (Artemis class) or Mars transit. Its info button opens the mission context dialog: hazards, cited reference values, mission dose and space weather. See [Mission profiles](../intelligence/mission-profiles) |
| **MET** | Mission elapsed time on the simulated clock. The UTC time is in the tooltip |
| **Scenario player** | Scenario picker, play and pause, speed (Real time, 1 min/s, 10 min/s, 1 h/s) and restart |
| **Earth link** | Current profile (ISS, Moon, Mars near, Mars far), one way delay and messages in transit. Opens the Earth link drawer. See [Mission features](./mission-features#earth-link-and-mars-delay) |
| **Ground / Crew** | View toggle |
| **Connection chip** | "Offline demo", "Live NASA data", "API unreachable" or "Checking connection". Opens Data and model, where the [Online and offline switch](../architecture/backend#online-and-offline-switch) lives |
| **Tools** menu | Mission overview, Shift handover, Data and model, Presentation mode, Accessibility and sound, Language, Keyboard shortcuts |
| **Start demo** | Starts the 10 step [guided demo](./demo-scenarios#guided-demo) |
| **Alerts bell** | Count of alerts not yet acknowledged. Pulses red when one is CRITICAL. Opens the alerts drawer (`A`) |

::: tip Priority collapse
On narrow windows the top bar measures its real width and collapses step by step: labels go first, then the restart button and the view toggle move into the Tools menu. **Start demo** and the alerts bell are never clipped.
:::

## Crew rail

The left column has one card per astronaut (ORION, LYRA, VEGA, ATLAS) with:

- the crew wording of their status ("All good", "Act soon"...),
- live heart rate and blood oxygen,
- a heart rate sparkline of the last 6 hours.

Click a card, or press `1` to `4`, to select that astronaut. Everything else on the screen follows the selection.

### Crew profile {#crew-profile}

Each card has a small person button ("Open profile of ORION"). The same button sits in the 3D stage header (Ground view) and next to the name in the Crew view, and the `I` key opens the profile of the selected astronaut. It opens a dialog with all the data of one person, visual first (icon, color and number first, sentences behind each **Details** toggle). The switcher at the top moves between the four astronauts without closing it, `Esc` closes it and focus returns to the button that opened it.

| Section | What it shows |
| --- | --- |
| Identity | Callsign, pseudonymized ID, role, age, sex, mission day, mission and vehicle, with the SIMULATED badge and a note that the data is simulated and pseudonymized |
| Today | Status pill, attention score, one segment per tracked indicator, open alerts, the headline behind Details |
| Personal baselines | Per metric, a band gauge with the person's own normal range, the current value, the typical value (median) and how many readings the baseline rests on, grouped as heart and circulation, breathing and oxygen, sleep and recovery, activity and exercise, mind and mood, environment exposure |
| Wearables and devices | Devices worn by the person with state, battery, last contact and the metrics they feed |
| Latest check-in | Mood, fatigue, stress and sleep quality in plain words, symptoms behind Details |
| Eye and hearing exams | Latest exam session and when the next exam is due |
| Radiation | Mission dose versus the NASA career limit (600 mSv, NASA-STD-3001), with the citation |
| Recent events | Last alerts, logged actions and log lines that name the person |

A section without data says "No data" explicitly: a missing reading is never shown as normal and a missing dose is never shown as zero. **Print summary** prints the profile with the same print stylesheet as the handover report. Decision support only, not a diagnosis, and all the data is simulated.

## 3D body and body system chips

The center stage shows the selected astronaut:

- **Headline**: callsign, role, mission day, current activity (Sleeping, Resting, Working, Exercising) and one plain sentence about their state.
- **3D body**: a realistic anatomical model (the Z-Anatomy atlas) with natural tissue colors under a translucent skin. A body system that needs attention lights up in its status color, the heart beats at the live heart rate and the lungs breathe at the live breathing rate. A status change sends a short scan pulse from that region. When data is missing the organ turns grey and stops moving.
- **Body system chips** beside the body: Brain, Eyes, Lungs, Heart and Kidneys on the left; Ears, Muscles, Skeleton and Skin on the right. Each chip shows a status dot. A chip always means the whole body system.
- **Health indicators count** next to the headline (for example "25/25 indicators normal"): each segment is one measured indicator, such as heart rate, sleep or blood oxygen, compared with the astronaut's own normal range. Click it to see the breakdown by body system, with the flagged and the missing indicators named. Indicators without data are never counted as normal.
- **Body scan**: a soft band of light sweeps the body from head to feet every few seconds, a cue that monitoring is live (slow and dim with reduced motion).
- **Control pill** under the body: **Layers**, the **Monitor / Explore** mode button, the preset views **Front**, **Back**, **Left** and **Right**, and a reset button.
- **Status legend** in the corner, with the five levels and the note "Vs personal baseline. Simulated data."
- **Reference anatomy caption** under the body: "Reference anatomy: Z-Anatomy atlas (CC BY-SA 4.0)". Its info button explains that this is one adult reference model shown for every crew member, not the astronaut's own scan, and lists the credits.
- **Mission backdrop** behind the body: a dimmed scene of the active mission profile (launch pad, Earth from low orbit, lunar surface, Earth to Mars transfer) and a small chip with the profile name and two or three cited facts. It is decoration and context, never a health status ([Mission backdrops](../intelligence/mission-profiles#mission-backdrops)).

### Layers, views and skin opacity

| Control | What it does |
| --- | --- |
| **Layers** | One switch per anatomical system: Skin, Muscular, Skeletal, Cardiovascular, Respiratory, Nervous, Nerves, Digestive, Urinary, Other. Muscles are "auto": they appear when they are selected or need attention. Nerves and Other start hidden |
| **Skin opacity** | A slider from 0 to 100% (22% by default), to see more of the surface or more of the inside |
| **Presets** | Default, Organs, Skeleton, Muscles, All |
| **Front / Back / Left / Right** | Turn the body to a preset view with a smooth transition |
| **Monitor / Explore** | Monitor (default): only monitored body systems respond to hover and click; the rest is quieter and click-through. Explore: every structure can be selected, for anatomical reference. Remembered on this device |
| **Reset** | Shows the whole body again and clears the selection |

Drag to rotate and pan. The mouse wheel, a trackpad or a pinch **zoom toward the point under the pointer**, so what you aim at stays in place. The body turns slowly on its own while nobody touches it: any pointer down, drag, wheel or touch stops it, it stays still while a structure is hovered or selected, and it resumes 3 seconds after the last interaction ([3D anatomy](../architecture/anatomy-3d#navigation-and-preset-views)). A system that is still downloading shows its progress, and "try 2" or "try 3" while it retries; if it still fails it shows **retry** and stays clickable. The rest of the body stays usable.

**Keyboard**: `Tab` to the body, then `Up` / `Down` for body systems, `Left` / `Right` for structures, `Enter` to select and `Esc` to clear. Each step is announced ([Accessibility](./accessibility)).

### Selecting a structure {#selecting-a-structure}

Hover a part of the body to see its name, its anatomical system and its status, or "Not monitored" (in Explore mode). Click to select it: the camera moves to the structure, the rest of the body fades to a see-through outline and the right panel becomes **Anatomy detail**.

| Part of the panel | Content |
| --- | --- |
| **Selected structure** | Name, anatomical system and side (for example "Left femur, Skeletal system, Left side") |
| **Reference anatomy** | Where the 3D shape comes from: "Z-Anatomy atlas" or "AHI procedural" (the kidneys) |
| **Structures in the atlas** | How many structures that anatomical system has, and "Part of" when the structure belongs to a larger one (for example the coronary arteries are part of the heart) |
| **Monitored with** | For monitored structures: the body system it is monitored with, that system's status, one plain sentence saying how the indicators relate to the structure, and the same metric rows, charts, alerts and flags as the body system detail. **Whole region** switches to the whole body system |
| **Measured by** | The devices that feed the readings: name, type, state, battery, last seen and data origin. Readings from the crew app (check-ins, self tests, intake log) are named as such |
| **Context only: not monitored** | For structures no device or metric relates to (for example the stomach or a nerve), in Explore mode: a calm card with no status. "No status is shown here because nothing is measured. That is not the same as normal." |

Indicators describe a body system as a whole. They are **related indicators, not measurements of the selected structure**: selecting the left femur shows the accumulated radiation dose as bone health context, not a measurement of that bone. Which structures relate to which metrics: [Anatomy to health mapping](../architecture/data-model#anatomy-to-health-mapping).

**Alerts on structures.** An open alert belongs to a body system. Its structures show a pulsing rim in the alert's status color, a monitored organ in alert is visible through the body wall without any click, and a floating label names the system and its key value. In the panel, **Alerts and flags** lists what triggered each alert, the value observed when it was raised next to the personal normal, the data origin badge and the rule id.

Click the selected structure again, click empty space, press `Esc` or use **Overview** to go back. If the reference atlas cannot load, the app shows a simplified body with the notice "Reference atlas unavailable. Showing simplified model."; body systems, chips and alerts keep working. How the body is built: [3D anatomy](../architecture/anatomy-3d).

::: info Eyes and ears
The eyes and ears are monitored from periodic simulated exams (SANS eye exams, hearing tests, daily noise). Their detail shows the exam history against the pre-flight baseline; "No exam yet" is never shown as normal. The ears have no 3D geometry: two small status rings on the sides of the head mark them. See [Eye health and hearing](../intelligence/eye-and-hearing).
:::

## What needs attention

The right panel answers three questions for the selected astronaut: how are they, why, and what to do.

![What needs attention: overall status, recommended actions with autonomy badges, why and forecasts](/screenshots/attention-actions.png)

| Section | Content |
| --- | --- |
| **Overall status** | Status word, risk score (0 to 100) and confidence. Confidence drops when key signals are missing or questionable; if core vitals are missing it says "Status cannot be confirmed" |
| **Recommended actions** | Short imperative title, rationale, priority and audience. **Mark done** logs an intervention in the audit trail; **Dismiss** hides it; **Compare** opens the [what-if comparison](./mission-features#what-if-comparison) |
| **Why** | Contributing factors in plain language with a weight bar, for example "HRV 28% below personal baseline for 3 days". Missing signals are listed as such. When the experimental detector sees an unusual mix of signals, a neutral note "Unusual combination" lists the signals that contributed most, the model version and "Experimental, machine learning"; it does not change the status |
| **Forecast** | Per metric: "Stable over next 6 h", "Projected to leave your normal range in ~5 h" or "Not enough data to forecast yet" |

::: info Visual first
The panel shows a picture first and keeps the full sentence behind a **Details** toggle. Each **Why** item is a chip with the signal icon, the metric, the direction and size of the change, a mini gauge of the value against the personal normal and the weight bar. Each action card has an icon and a time hint: **Now** (critical), **Within 1 h** (high) or **Today** (everything else); the hint is a UI convention of the demo, not a clinical rule. Forecast rows show the trend (Rising, Falling, Steady), the expected range and "Leaves normal in N h" or "Stays normal". Text behind a closed **Details** toggle is still read by screen readers and audio description ([Design system](./design-system#visual-first-panels)).
:::

### Autonomy badges

Every recommendation says who can close the loop:

| Badge | Meaning |
| --- | --- |
| **Can act on board now** | Crew self care, crew medical officer, onboard checks or cabin ventilation. No need to wait for Earth |
| **Needs flight surgeon** | A flight surgeon on Earth should review it. Subject to the communication delay |
| **Earth reply in N min+** | Shown with large delays: the earliest possible answer (one way delay there and back) |

## Region detail and trend chart

Click a body system chip to switch the right panel to **Body system detail**. Clicking a monitored structure in the body shows the same data under its own header ([Selecting a structure](#selecting-a-structure)).

![Body system detail: the 3D body with one body system selected, and its metric rows, personal normal and trend chart in the right panel](/screenshots/body-detail.png)

Each metric row shows the current value, the deviation from the personal normal ("11% above your normal"), the normal range ("Your normal: 66 to 80 bpm") and the robust z score. A **band gauge** draws the personal normal as a soft stripe and the current value as a marker in the status color; without a value it draws the band only, never a marker. A metric without a reading says why: **Paused by operator**, **Waiting for data** or **Signal lost** ([Live vitals, cabin and devices](#live-vitals-cabin-and-devices)). Expand a row to see:

- **Trend chart** with a window of 6 h, 24 h or 72 h:
  - shaded **personal normal band** labeled "Your normal",
  - history line (gaps mean no data, never a filled value),
  - dashed **forecast cone** after "now" (80% interval), with a **horizon picker**: 24 h, 36 h, 72 h, 7 days or 15 days. A horizon needs at least half its length in history, otherwise "Not enough history for this horizon" ([Forecasting](../intelligence/forecasting#selectable-horizons)),
  - **event markers** on the time axis for alerts, logged actions and check-ins.
- **Data quality** and **data origin** badges (for example GOOD SIGNAL, SIMULATED).
- **"Why is this my normal?"** (the info button): the window, number of readings, median and MAD behind the band, and the baseline version. Until there is enough data it says "Still learning your normal".

Below the metrics, **Alerts and flags** lists the open alerts of that body system (severity, time, the metric that triggered it, the value observed when it was raised against the personal normal, data origin, rule id) and the statistical flags of the last 24 hours. A line above the metrics says how many alerts are open and jumps to them. The wording stays non diagnostic: alerts and flags ask for a review.

Press `Esc` or **Overview** to go back.

## Status timeline

The slim strip under the stage has one lane per astronaut plus the cabin, colored by status over time, with markers:

| Marker | Meaning |
| --- | --- |
| Alert | Colored by severity |
| Action logged | An intervention marked done |
| Check-in | A daily check-in (simulated or typed) |
| Earth link | A message to or from Earth, in transit or delivered |

Choose **24 h**, **72 h** or **All**. Click a marker to jump to that crew member and body system (Earth link markers open the Earth link drawer). With the timeline focused, arrow keys step through markers and `Enter` opens one.

![Status timeline during progressive fatigue: LYRA's lane drifts from green to amber and orange over days](/screenshots/timeline-fatigue.png)

## Live vitals, cabin and devices

The bottom strip has three parts:

- **Live vitals** of the selected astronaut: heart rate, heart variability, blood oxygen, breathing rate, blood pressure and skin temperature, each with a status icon, a sparkline of the last 6 h and "Normal for you" or the deviation from the personal normal.
- **Cabin**: CO2, cabin temperature, relative humidity and radiation dose rate, with the cabin status.
- **Devices**: how many simulated devices are online, the worst device state (Online, Degraded, Data stale, Offline, Paused by operator) and battery. Click to open the device list, where each device can be **paused** (with a confirmation) and resumed. A paused device's readings show "Paused by operator" and no data, never normal values ([Pausing a device](../intelligence/scenario-simulation#pausing-a-device)).

Panels say why a metric has no reading, in a neutral color:

| State | Meaning |
| --- | --- |
| **Paused by operator** | An operator paused the device that feeds it: a decision, not a fault. An inline **Resume** button sits right there |
| **Waiting for data** | The device is back online (for example just resumed), the first reading is on its way |
| **Signal lost** | No reading and no healthy device behind it (the usual missing data case) |

Only a live reading carries a value; none of these states is shown as normal. A body system shows Paused or Waiting only when every metric without data is in that state.

## Alerts drawer

Open with the bell or `A`.

- **Open** tab: alerts not yet acknowledged, grouped by crew member and body system, worst first. Each alert has **Acknowledge** and **View** (jumps to the related astronaut, region and metric).
- **History** tab: acknowledged and auto resolved alerts plus the **activity log** (alert acknowledged, action logged, scenario changed, alert escalated, messages sent and received, Earth link changed, check-in recorded), newest first.
- **Escalation**: a CRITICAL or HIGH alert that stays unacknowledged shows "Unacknowledged for 6 min. Escalated." and an **Escalated** badge. Timings are in [Alerts and escalation](../intelligence/alerts).
- **Sounds**: critical alerts ring by default and repeat until acknowledged, with a more urgent sound after 2 minutes; warnings can ring too. Settings in Tools > Accessibility and sound ([Accessibility](./accessibility#alert-sounds)).

A prominent **critical banner** also appears over the stage for the newest unacknowledged CRITICAL alert. It floats over the headline so the 3D body keeps its full size. You can hide the banner without acknowledging the alert.

**Browser tab.** While a CRITICAL alert is open (not acknowledged, not resolved), the tab icon gets a red dot, so a hidden tab still shows that someone must look. The normal icon comes back as soon as the alert is acknowledged or resolved.

![Critical banner during the acute cardio event](/screenshots/critical-alert.png)

## Presentation mode

**Tools > Presentation mode** (or `P`) enlarges text and hides secondary details for projectors. The 3D labels grow too.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `1` `2` `3` `4` | Select crew member |
| `V` | Switch Ground / Crew view |
| `P` | Presentation mode (also in Tools) |
| `A` | Open or close alerts |
| `I` | Open or close the profile of the selected crew member |
| `Space` | Play or pause the simulation |
| `Esc` | Close a panel, or back from body or anatomy detail |
| `?` | Show the shortcuts help |
| `D` | Describe the screen aloud (`Shift` + `D` turns audio description on or off) |
| `←` `→` | Previous / next step in the guided demo |

Shortcuts are ignored while you type in a field or hold a modifier key.

## Ask AHI

The **Ask AHI** button at the bottom right opens the assistant: plain language answers about what the app shows, streamed, with a "Based on:" line, voice input where the browser supports it and optional read aloud. It needs the backend with a key; otherwise it shows "Assistant offline". See [Ask AHI](./assistant).

## Screen sizes

| Mode | When | What changes |
| --- | --- | --- |
| Short (compact) | Desktop width with a viewport height up to 820 px (for example 1280x720) | Timeline becomes a slim ribbon that expands on hover or focus, vitals drop sparklines, crew cards become compact rows |
| Default | Typical laptop and desktop | Full layout |
| Roomy | 1680x1000 and larger | Wider attention panel, taller timeline, an extra crew vital, all forecasts expanded |

## Next steps

- [User journeys and roles](./user-journeys): the same screens as task flows.
- [Mission features](./mission-features): Earth link, check-in, mission overview, handover report, what-if.
- [Accessibility, sound and languages](./accessibility).
- [Health intelligence](../intelligence/overview): how status, alerts and forecasts are computed.
