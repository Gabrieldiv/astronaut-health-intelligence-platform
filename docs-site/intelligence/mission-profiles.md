---
title: Mission Profiles, Radiation & Space Weather
description: The four cited mission profiles of the Astronaut Health Intelligence Platform (launch, ISS, Moon, Mars transit), the mission radiation dose estimate against the NASA career limit, and the space weather advisory built on real NASA DONKI events.
status: IMPLEMENTED
origin: SIMULATED, DERIVED, REAL_PUBLIC
code:
  - frontend/web/src/engine/missions/profiles.ts
  - frontend/web/src/engine/missions/sources.ts
  - frontend/web/src/engine/missions/dose.ts
  - frontend/web/src/engine/missions/spaceWeather.ts
  - frontend/web/src/features/mission/MissionContext.tsx
  - frontend/web/src/features/mission/backdrops/facts.ts
  - frontend/web/src/features/mission/backdrops/MissionBackdrop.tsx
tests:
  - frontend/web/src/engine/missions/missions.test.ts
  - frontend/web/src/state/missionProfile.test.ts
verified: 2026-11-15
---

# Mission Profiles, Radiation & Space Weather

## What it does

The same crew, the same devices and the same engine can be read in four mission settings. A **mission profile** says where the crew is: how much radiation the cabin receives, how strong gravity is, how far Earth is, how long a message takes and who must act first. The profile changes the simulated dosimeter rate, the cumulative dose estimate, the autonomy wording and the space weather advisory. It does not change the personal baselines, the anomaly rules or the risk formula.

Profiles are **independent of the scenarios** ([Demo scenarios](../product/demo-scenarios)): a scenario scripts what happens to a crew member, a profile sets the environment around them.

::: info Where to find it in the app
The profile selector sits in the top bar. The **mission context** view shows the hazards of the profile, reference values with their sources, the mission dose bar and the space weather advisory. The 3D stage also shows a [backdrop](#mission-backdrops) of the active profile.
:::

## The four profiles

Every value below is stored in `profiles.ts` with the id of its source; the source list (with the exact short statement used) is in `sources.ts` and at the end of this page.

| Profile | Radiation reference | Gravity | Distance and one way delay | Typical duration | Who acts first |
| --- | --- | --- | --- | --- | --- |
| Launch and ascent | Negligible during minutes of ascent | Up to about 3 g (+3 Gx) during ascent, then weightless[^m10] | Pad to low Earth orbit, delay near zero | About 8.5 min of powered flight[^m9] | Mission Control in near real time |
| ISS (low Earth orbit) | Up to 286 µGy/day absorbed, 647 µSv/day dose equivalent (DOSIS 3D, Columbus, May 2016)[^m3] | Weightless | About 400 km, near real time[^m5] | About six months[^m6] | Mission Control in near real time: the crew can ask before acting |
| Moon (Artemis class) | 13.2 µGy/h absorbed, 1369 µSv/day dose equivalent on the lunar surface (Chang'E 4 LND)[^m4] | 0.165 g on the surface[^m7] | About 384,400 km mean, about 1.3 s[^m7] | About 9 days (Artemis II: 9 d 1 h 32 min)[^m8] | Short delay: the ground supports, but help is days away |
| Mars transit | 481 µGy/day absorbed, 1.8 mSv/day dose equivalent in cruise (MSL RAD)[^m1][^m2] | Weightless | About 4 to 24 min one way[^m11] | 253 days one way (MSL cruise)[^m2] | The crew acts first; the ground reviews later |

The one way light times for the ISS and the Moon are computed from the distance (the code says so next to the value). Mars delay comes from NASA's communications page[^m11].

## Mission radiation dose

The simulated personal and area dosimeters follow the profile:

- **ISS:** the orbital shape of the cabin model (latitude modulation and South Atlantic Anomaly passes) scaled so its long run mean equals the ISS reference.
- **Moon and Mars transit:** galactic cosmic rays are steady in deep space, so the rate is the reference mean with a slow wobble and a little noise (demo configuration).
- **Launch:** an order of magnitude ground background (demo configuration).

The **cumulative mission dose** is shown against the official **NASA career limit: total career effective dose below 600 mSv, the same for all ages and sexes** (NASA-STD-3001 Volume 1 Revision C, requirement [V1 4030])[^m12]. The per event limit for a solar particle event (below 250 mSv, [V1 4031]) is quoted from the radiation technical brief[^m13].

::: warning Approximation, not the NASA method
The effective dose shown is **absorbed dose times the profile's reference quality ratio** (dose equivalent divided by absorbed dose from the same published measurement). It is a decision support approximation. NASA's effective dose method uses the NASA Q model and a reference phantom; AHI does not implement it.
:::

Typical mission dose (reference rate times typical duration, rounded, from the cited values above):

| Profile | Typical mission dose | Share of the 600 mSv career limit |
| --- | --- | --- |
| Launch and ascent | Negligible | about 0% |
| ISS, about 182 days | about 118 mSv | about 20% |
| Moon, about 9 days | about 12 mSv | about 2% |
| Mars transit, one way, 253 days | about 455 mSv | about 76% |

These figures are arithmetic on published averages, not a prediction for a real crew. The published daily effective dose range for ISS crews is about 0.2 to 0.5 mSv or more per day[^m14], which brackets the ISS figure.

## Space weather advisory

The advisory reads **real public NASA DONKI events** ([NASA data sources](../data/sources#donki-space-weather)) in the context of the active profile. It is mission context: it never feeds a personal baseline, a status or an alert.

| Condition | Launch | ISS | Moon | Mars transit |
| --- | --- | --- | --- | --- |
| A solar energetic particle event (SEP) or an X class flare[^m15] started in the last 72 h (demo window) | Pre launch space weather note for the launch team | Monitoring note: the Earth magnetic field shields most of it, follow flight control | **Move to the radiation storm shelter** (onboard action, does not wait for Earth) | **Move to the radiation storm shelter** |
| No significant event | Calm | Calm | Calm | Calm |
| No data yet | "Unknown" | "Unknown" | "Unknown" | "Unknown" |

Missing space weather data is never shown as "all clear". Each advisory links to the most recent triggering DONKI event and states when the data was retrieved and whether it came from the live API or the bundled snapshot.

The 72 hour window and the "X class" cut are demo configuration in `config.ts` (`SPACE_WEATHER`), not official limits. The shelter wording follows the general crew procedure described by NASA; it is not a medical instruction.

## Mission backdrops {#mission-backdrops}

Behind the 3D body the stage shows a scene of the active profile: the launch pad with the ascent plume, Earth seen from low orbit, the lunar surface, or the Earth to Mars transfer arc with the ship. It is context and decoration; it never carries a health status. A compact chip shows the profile name and two or three facts. **Every number in the chip is read from the cited profile table above** (`facts.ts`); the backdrop adds no new reference value.

| Profile | Chip facts | Extra widget |
| --- | --- | --- |
| Launch and ascent | Up to 3 g, 8.5 min powered flight[^m9][^m10] | Peak g gauge: the cited reference peak, not a live reading |
| ISS | 400 km up, weightless, 0.65 mSv/day[^m3][^m5] | Orbit progress on the simulated clock, period about 92 min (derived, see below) |
| Moon | 0.165 g, 384,400 km from Earth, delay 1.3 s[^m7] | none |
| Mars transit | 1.8 mSv/day, delay 4 to 24 min[^m2][^m11] | Ship position on the arc: the simulated mission day over the cited 253 day transit[^m2] |

The ISS orbit period is **derived**, not quoted: a circular orbit at the cited 400 km altitude, with Kepler's third law, the mean Earth radius (6371 km) and Earth's gravitational parameter (398,600 km³/s²)[^m16], gives about 92 minutes. The Moon delay is the mean distance divided by the speed of light. Numbers follow the selected interface language. How the backdrop is drawn: [3D anatomy](../architecture/anatomy-3d#mission-backdrop).

### What the profile changes

The chip is a button: it opens the Mission and Earth link panel, which now starts with **What the mission profile changes**. The profile changes only the environment and communication side of the simulation:

- the **radiation** read by the dosimeters and the mission dose against the NASA career limit;
- the **Earth link**: the message delay and who decides first (crew or ground);
- the **recommendations**: extra context sentences where the environment makes a rule more relevant;
- the **space weather advisory**: shelter on the Moon and Mars transit, monitoring on the ISS, from real NASA DONKI events;
- the **scenery and the chip** on the 3D stage.

It does **not** change the simulated vital signs, sleep or exercise of the astronauts: those follow the selected demo scenario and each person's own baseline.

## Limitations

- One reference value per profile; real dose rates vary with solar cycle, shielding and location in the vehicle.
- The effective dose is an approximation (see the warning above).
- The advisory only looks at event type and flare class, not at particle flux forecasts.
- Profiles do not change physiology: the simulated crew responds to scenarios, not to gravity level.

## Status

<StatusBadge status="IMPLEMENTED" /> Profiles, dose and advisory are covered by `missions.test.ts` (cited values present, career limit, dose arithmetic, advisory per profile, no data case) and `missionProfile.test.ts` (store wiring).

## Sources

[^m1]: Zeitlin C. et al. 2013. Measurements of Energetic Particle Radiation in Transit to Mars on the Mars Science Laboratory. *Science* 340(6136):1080-1084. <https://doi.org/10.1126/science.1235989>. Cruise absorbed dose rate 481 µGy/day (as cited by Guo et al. 2015, <https://arxiv.org/abs/1503.06631>, which re-evaluates it to 458 µGy/day).
[^m2]: Southwest Research Institute 2013, MSL RAD press release: 1.8 mSv/day average GCR dose equivalent in cruise, 253 day journey. <https://www.swri.org/newsroom/press-releases/swri-led-team-calculates-the-radiation-exposure-associated-trip-mars>
[^m3]: Berger T. et al. 2017. DOSIS & DOSIS 3D: radiation measurements with the DOSTEL instruments onboard the Columbus Laboratory of the ISS in the years 2009-2016. *J. Space Weather Space Clim.* 7, A8. <https://elib.dlr.de/111501>
[^m4]: Zhang S. et al. 2020. First measurements of the radiation dose on the lunar surface. *Science Advances* 6(39):eaaz1334. <https://doi.org/10.1126/sciadv.aaz1334>
[^m5]: NASA, Why do research on the International Space Station. <https://www.nasa.gov/missions/station/iss-research/why-do-research-on-the-international-space-station/>
[^m6]: NASA, FAQ: the real story about astronaut health care in space. <https://www.nasa.gov/missions/station/faq-the-real-story-about-astronaut-health-care-in-space/>
[^m7]: NASA NSSDC, Moon Fact Sheet (surface gravity, mean distance 384,400 km). <https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html>
[^m8]: NASA, Artemis II mission page. <https://www.nasa.gov/mission/artemis-ii/>
[^m9]: NASA, Space Shuttle main engines (about 8.5 minutes of powered flight). <https://www.nasa.gov/space-shuttle-recordation/engines/>
[^m10]: Bagian J. P. et al. 1993, NASA Technical Reports Server 19940019731 (ascent acceleration up to about +3 Gx). <https://ntrs.nasa.gov/citations/19940019731>
[^m11]: NASA, Space Communications: 7 Things You Need to Know (Mars delay about 4 to 24 minutes). <https://www.nasa.gov/solar-system/space-communications-7-things-you-need-to-know/>
[^m12]: NASA-STD-3001 Volume 1 Revision C, Crew Health, requirement [V1 4030]. <https://standards.nasa.gov/sites/default/files/standards/NASA/C//nasa-std-3001-vol-1-rev-c-signature.pdf>
[^m13]: NASA OCHMO-TB-020 Rev. E, Design for Ionizing Radiation Protection ([V1 4031], solar particle event limit). <https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf>
[^m14]: Shavers M. et al. 2024. Space agency-specific standards for crew dose and risk assessment of ionising radiation exposures for the International Space Station. *Z Med Phys* 34(1):14-30. <https://pmc.ncbi.nlm.nih.gov/articles/PMC10919966>
[^m15]: NOAA Space Weather Prediction Center, Solar flares (radio blackouts): flare class letters by peak X-ray flux. <https://www.spaceweather.gov/phenomena/solar-flares-radio-blackouts>
[^m16]: NASA NSSDC, Earth Fact Sheet (volumetric mean radius 6371 km, GM 0.39860 x 10^6 km³/s²). <https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html>

## Next steps

- [Radiation and cabin environment](../science/radiation-and-environment): the science behind the hazards.
- [NASA data sources](../data/sources): DONKI and the bundled snapshot.
- [Recommendations, autonomy and what-if](./recommendations): who can act and when.
