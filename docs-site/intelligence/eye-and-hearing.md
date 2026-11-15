---
title: Eye Health (SANS) & Hearing
description: Periodic eye exams for Spaceflight Associated Neuro-ocular Syndrome (SANS) and hearing and noise monitoring in the Astronaut Health Intelligence Platform, compared with each astronaut's own pre-flight baseline.
status: IMPLEMENTED
origin: SIMULATED, DERIVED
code:
  - frontend/web/src/engine/exams/assess.ts
  - frontend/web/src/engine/exams/schedule.ts
  - frontend/web/src/engine/sim/exams.ts
  - frontend/web/src/engine/config.ts
  - frontend/web/src/features/anatomy/viewer/EarMarkers.tsx
tests:
  - frontend/web/src/engine/exams/exams.test.ts
verified: 2026-11-15
---

# Eye Health (SANS) & Hearing

## What it does

Eyes and ears are monitored body regions. Unlike heart rate or SpO₂, they are not measured continuously: the crew does **periodic exams**. The Astronaut Health Intelligence Platform (AHI) simulates those exams, compares each in-flight measure with the **same person's pre-flight baseline (same eye or same ear)**, and shows the result on the body, in the region detail with the exam history, and in alerts.

::: warning Decision support, not a diagnosis
A flag means "review with the flight surgeon". AHI does not diagnose SANS or hearing loss and does not suggest any treatment. All exam values are <OriginBadge origin="SIMULATED" />.
:::

## Eyes: SANS monitoring

Spaceflight Associated Neuro-ocular Syndrome (SANS) is a set of eye changes seen in long duration crews ([Spaceflight hazards](../science/spaceflight-hazards)). NASA monitors it with optical coherence tomography (OCT), ocular ultrasound and visual acuity, among other tests[^e1].

| Exam | Measures (per eye) | When |
| --- | --- | --- |
| OCT | Retinal thickness, choroidal folds | Pre-flight about 18 months before launch; in flight on flight day 30, flight day 90 and R-30 (30 days before return)[^e1] |
| Ocular ultrasound | Optic nerve sheath diameter | Pre-flight about 7 months before launch; same in-flight sessions[^e1] |
| Visual acuity | logMAR | With the OCT sessions[^e1] |

| Change versus the pre-flight baseline | Status | Source of the number |
| --- | --- | --- |
| Retinal thickness more than +19.4 µm | Watch | Published test to test variability of the measure[^e1] |
| New choroidal folds | Watch | Published sign of SANS[^e1] |
| Optic nerve sheath +0.5 mm or more | Watch | Demo configuration, not an official limit |
| Visual acuity +0.1 logMAR or more (about one chart line) | Watch | Demo configuration, not an official limit |
| Two or more of the above in one session | Warning | Demo configuration, not an official limit |

The scenario **"Eye changes (SANS like)"** makes the simulated exams drift over the mission (thicker retina, wider optic nerve sheath, then new folds), so the flag can be shown in the demo.

## Ears: hearing and noise

| Measure | Rule | Status | Source |
| --- | --- | --- | --- |
| Hearing threshold, high pitch (mean of 2, 3 and 4 kHz) | Shift of more than 10 dB versus pre-flight | Watch | NASA hearing loss risk record[^e2] |
| Hearing threshold, high pitch | Shift of 30 dB or more | Warning | Same record: sudden losses of 30 dB or more could affect mission operations[^e2] |
| Hearing threshold, low pitch (0.25, 0.5, 1 kHz) | Same criteria | Watch or Warning | Demo grouping of the same criterion |
| Noise exposure, work period | Above 72 dBA LEQ over 16 h | Watch | ISS flight rule cited in the risk record[^e2] |
| Daily noise dose | Above 100% (85 dBA over 8 h equals 100%) | Warning | NASA-STD-3001 Volume 2, [V2 6115][^e3] |

Schedule: pre-flight audiometry, then in-flight hearing assessments every 30 days from flight day 15 (the cadence is demo configuration; the record confirms in-flight assessments, not this cadence)[^e2]. The noise reading is one crew worn value per day so the trend is visible (demo); on the ISS crew worn dosimetry runs for 24 hours about every 60 days[^e4]. The 3 dB exchange rate used in the dose formula is a demo assumption that follows the NIOSH convention; the NASA technical brief does not state it.

## Missing exams

"No exam yet" is never shown as normal. A measure without a value, or without a pre-flight baseline for that eye or ear, is `NO_DATA` with a plain reason, for example "No pre-flight baseline on file for the left eye, so the change cannot be judged."

## On the 3D body

- **Eyes** use the atlas structures for the left and right eye; selecting one opens the eye region with the exam history.
- **Ears** have no atlas geometry (the inner ear is excluded from the shipped atlas for license reasons, see [3D anatomy assets](../data/anatomy-assets)). Two small status colored rings on the sides of the head mark the ears. They are visual only: the ears region is selected from its body system chip, its floating label or the keyboard body navigator.

## Limitations

- Exams are simulated: the values are plausible ranges, not clinical data.
- Optic nerve sheath, acuity and the "two signs" rule are demo configuration.
- No fundoscopy, Amsler grid or MRI, which NASA also uses[^e1].
- Noise is a single daily value, not a dosimeter time series.

## Status

<StatusBadge status="IMPLEMENTED" /> Covered by `exams.test.ts` (schedule, baseline comparison per side, Watch and Warning rules, noise dose, `NO_DATA` cases).

## Sources

[^e1]: NASA OCHMO-MTB-001, *Spaceflight Associated Neuro-ocular Syndrome (SANS)*, NASA-STD-3001 Medical Technical Brief, 2024-02-21. <https://www.nasa.gov/wp-content/uploads/2024/02/ochmo-mtb-001-sans.pdf>
[^e2]: NASA Human System Risk Board, *Risk of in-mission and long-term Hearing Loss and Performance Decrements*, risk record Rev B. <https://www.nasa.gov/wp-content/uploads/2025/11/hsrb-hearing-loss-risk-record-rev-b-1-web.pdf>
[^e3]: NASA OCHMO-TB-035, *Acoustics*, NASA-STD-3001 Technical Brief, 2023-10-06. <https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-035-acoustics.pdf>
[^e4]: Limardo J., Allen C., Danielson R., *Status: Crewmember Noise Exposures on the ISS*, ICES 2015, NTRS 20150011048. <https://ntrs.nasa.gov/citations/20150011048>

## Next steps

- [Monitored physiology](../science/monitored-physiology)
- [Alerts and escalation](./alerts)
- [3D anatomy rendering](../architecture/anatomy-3d)
