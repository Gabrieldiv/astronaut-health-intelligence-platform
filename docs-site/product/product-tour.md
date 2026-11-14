---
title: Product Tour
description: A walk through every part of the Astronaut Health Intelligence Platform interface, Ground view and Crew view, with real screenshots.
status: IMPLEMENTED
origin: SIMULATED
code:
  - frontend/web/src/app/App.tsx
  - frontend/web/src/features/topbar/TopBar.tsx
  - frontend/web/src/features/attention/AttentionPanel.tsx
  - frontend/web/src/features/crewview/CrewView.tsx
verified: 2026-11-14
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
| Content | Crew rail, 3D body, attention panel, timeline, live vitals, cabin, devices | Big status word and headline, 3D body, at most two things to do, check-in, "Your body vs your normal" |
| Detail | Risk score, confidence, rule ids, forecasts | No risk score or model details |

Switch with the **Ground / Crew** toggle in the top bar or press `V`. The choice is remembered in the browser.

![Crew view: a large status word, the top two actions with autonomy badges, the daily check-in and vitals against the personal normal](/screenshots/crew-view.png)

The Crew view keeps the language simple: "Do this now", "Do this soon" or "When you can" on each action, and "Normal for you" or "13% above your normal" on each vital. When there is nothing to do it says so: "Nothing to do right now. Keep your usual routine."

## Top bar

The top bar has three zones: identity on the left, the scenario player in the center, and tools on the right.

| Element | What it does |
| --- | --- |
| AHI logo and **SIMULATED** chip | Always visible. Click the chip to see where the data comes from (simulated device adapters, planned real data, derived values) |
| Mission name and **MET** | Mission elapsed time on the simulated clock. The UTC time is in the tooltip |
| **Scenario player** | Scenario picker, play and pause, speed (Real time, 1 min/s, 10 min/s, 1 h/s) and restart |
| **Earth link** | Current profile (ISS, Moon, Mars near, Mars far), one way delay and messages in transit. Opens the Earth link drawer. See [Mission features](./mission-features#earth-link-and-mars-delay) |
| **Ground / Crew** | View toggle |
| **Tools** menu | Mission overview, Shift handover, Data and model, Presentation mode, Keyboard shortcuts |
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

## 3D body and body system chips

The center stage shows the selected astronaut:

- **Headline**: callsign, role, mission day, current activity (Sleeping, Resting, Working, Exercising) and one plain sentence about their state.
- **3D body**: a procedural holographic body. Each body system glows in its status color, the heart beats at the live heart rate and the lungs breathe at the live breathing rate. A status change sends a short scan pulse from that region.
- **Body system chips** beside the body: Brain, Lungs, Heart and Kidneys on the left; Muscles, Skeleton and Skin on the right. Each chip shows a status dot. Click a chip or an organ to open its detail.
- **Layer pill** under the body: Skin, Muscles, Skeleton, Organs, Vessels, plus a camera reset. Muscles appear automatically when they are selected or not nominal.
- **Status legend** in the corner, with the five levels and the note "Vs personal baseline. Simulated data."

Details on how the body is built: [3D anatomy](../architecture/anatomy-3d).

::: info Eyes are not monitored
The eyes are drawn as passive anatomy only. No eye monitoring device feeds this prototype. Tracking spaceflight associated neuro-ocular syndrome (SANS) from periodic exams is on the [roadmap](../resources/roadmap).
:::

## What needs attention

The right panel answers three questions for the selected astronaut: how are they, why, and what to do.

![What needs attention: overall status, recommended actions with autonomy badges, why and forecasts](/screenshots/attention-actions.png)

| Section | Content |
| --- | --- |
| **Overall status** | Status word, risk score (0 to 100) and confidence. Confidence drops when key signals are missing or questionable; if core vitals are missing it says "Status cannot be confirmed" |
| **Recommended actions** | Short imperative title, rationale, priority and audience. **Mark done** logs an intervention in the audit trail; **Dismiss** hides it; **Compare** opens the [what-if comparison](./mission-features#what-if-comparison) |
| **Why** | Contributing factors in plain language with a weight bar, for example "HRV 28% below personal baseline for 3 days". Missing signals are listed as such |
| **Forecast** | Per metric: "Stable over next 6 h", "Projected to leave your normal range in ~5 h" or "Not enough data to forecast yet" |

### Autonomy badges

Every recommendation says who can close the loop:

| Badge | Meaning |
| --- | --- |
| **Can act on board now** | Crew self care, crew medical officer, onboard checks or cabin ventilation. No need to wait for Earth |
| **Needs flight surgeon** | A flight surgeon on Earth should review it. Subject to the communication delay |
| **Earth reply in N min+** | Shown with large delays: the earliest possible answer (one way delay there and back) |

## Region detail and trend chart

Click an organ or a body system chip to switch the right panel to **Body system detail**.

![Body system detail for LYRA's heart with metric rows, personal normal and trend chart](/screenshots/body-detail.png)

Each metric row shows the current value, the deviation from the personal normal ("11% above your normal"), the normal range ("Your normal: 66 to 80 bpm") and the robust z score. Expand a row to see:

- **Trend chart** with a window of 6 h, 24 h or 72 h:
  - shaded **personal normal band** labeled "Your normal",
  - history line (gaps mean no data, never a filled value),
  - dashed **forecast cone** after "now" (80% interval),
  - **event markers** on the time axis for alerts, logged actions and check-ins.
- **Data quality** and **data origin** badges (for example GOOD SIGNAL, SIMULATED).
- **"Why is this my normal?"** (the info button): the window, number of readings, median and MAD behind the band, and the baseline version. Until there is enough data it says "Still learning your normal".

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
- **Devices**: how many simulated devices are online, the worst device state (Online, Degraded, Data stale, Offline) and battery. Click to open the device list.

## Alerts drawer

Open with the bell or `A`.

- **Open** tab: alerts not yet acknowledged, grouped by crew member and body system, worst first. Each alert has **Acknowledge** and **View** (jumps to the related astronaut, region and metric).
- **History** tab: acknowledged and auto resolved alerts plus the **activity log** (alert acknowledged, action logged, scenario changed, alert escalated, messages sent and received, Earth link changed, check-in recorded), newest first.
- **Escalation**: a CRITICAL or HIGH alert that stays unacknowledged shows "Unacknowledged for 6 min. Escalated." and an **Escalated** badge. Timings are in [Alerts and escalation](../intelligence/alerts).
- **Sound for new critical alerts**: an optional two tone chime, off by default.

A prominent **critical banner** also appears over the stage for the newest unacknowledged CRITICAL alert. It floats over the headline so the 3D body keeps its full size. You can hide the banner without acknowledging the alert.

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
| `Space` | Play or pause the simulation |
| `Esc` | Close a panel, or back from body detail |
| `?` | Show the shortcuts help |
| `←` `→` | Previous / next step in the guided demo |

Shortcuts are ignored while you type in a field or hold a modifier key.

## Screen sizes

| Mode | When | What changes |
| --- | --- | --- |
| Short (compact) | Desktop width with a viewport height up to 820 px (for example 1280x720) | Timeline becomes a slim ribbon that expands on hover or focus, vitals drop sparklines, crew cards become compact rows |
| Default | Typical laptop and desktop | Full layout |
| Roomy | 1680x1000 and larger | Wider attention panel, taller timeline, an extra crew vital, all forecasts expanded |

## Next steps

- [User journeys and roles](./user-journeys): the same screens as task flows.
- [Mission features](./mission-features): Earth link, check-in, mission overview, handover report, what-if.
- [Health intelligence](../intelligence/overview): how status, alerts and forecasts are computed.
