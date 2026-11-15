/**
 * Published sources behind every mission profile reference value.
 *
 * Each entry was read on the web when the profile table was written (accessed 2026-11-15).
 * `quote` keeps the exact short statement the value comes from, so a reviewer can check it
 * against the source without guessing. Values derived by arithmetic from these sources (for
 * example a light time from a distance) say so in profiles.ts.
 */

export type MissionSourceId =
  | 'NASA_STD_3001_V1_REVC'
  | 'NASA_OCHMO_TB_RADIATION'
  | 'SHAVERS_2024_ISS'
  | 'BERGER_2017_DOSIS'
  | 'ZEITLIN_2013_MSL_RAD'
  | 'SWRI_2013_MSL_RAD'
  | 'GUO_2015_MSL_RAD'
  | 'ZHANG_2020_CHANGE4_LND'
  | 'NASA_HRP_5_HAZARDS'
  | 'NASA_ISS_ALTITUDE'
  | 'NASA_ISS_MISSION_LENGTH'
  | 'NASA_MOON_FACT_SHEET'
  | 'NASA_ARTEMIS_II'
  | 'NASA_SPACE_COMMS_7_THINGS'
  | 'NASA_SHUTTLE_ENGINES'
  | 'BAGIAN_1993_ASCENT_G'
  | 'NOAA_SWPC_FLARES'
  | 'NASA_DONKI'

export interface MissionSource {
  id: MissionSourceId
  /** Short label for inline citations, e.g. "Zeitlin et al. 2013". */
  short: string
  title: string
  publisher: string
  year: number
  url: string
  /** Exact short statement used (kept under a sentence). */
  quote: string
  /** True for an official NASA standard (not a research measurement). */
  officialStandard?: boolean
}

export const MISSION_SOURCES: Record<MissionSourceId, MissionSource> = {
  NASA_STD_3001_V1_REVC: {
    id: 'NASA_STD_3001_V1_REVC',
    short: 'NASA-STD-3001 Vol. 1 Rev. C, [V1 4030]',
    title: 'NASA Spaceflight Human-System Standard, Volume 1: Crew Health, Revision C (approved 2023-09-15)',
    publisher: 'NASA Office of the Chief Health and Medical Officer',
    year: 2023,
    url: 'https://standards.nasa.gov/sites/default/files/standards/NASA/C//nasa-std-3001-vol-1-rev-c-signature.pdf',
    quote: "An individual crewmember's total career effective radiation dose due to spaceflight radiation exposure shall be less than 600 mSv.",
    officialStandard: true,
  },
  NASA_OCHMO_TB_RADIATION: {
    id: 'NASA_OCHMO_TB_RADIATION',
    short: 'NASA OCHMO-TB-020 Rev. E',
    title: 'NASA-STD-3001 Technical Brief: Design for Ionizing Radiation Protection (OCHMO-TB-020 Rev. E)',
    publisher: 'NASA Office of the Chief Health and Medical Officer',
    year: 2022,
    url: 'https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf',
    quote: '[V1 4031] Solar particle events: effective dose of less than 250 mSv per event; the career limit is universal for all ages and sexes.',
    officialStandard: true,
  },
  SHAVERS_2024_ISS: {
    id: 'SHAVERS_2024_ISS',
    short: 'Shavers et al. 2024',
    title: 'Space agency-specific standards for crew dose and risk assessment of ionising radiation exposures for the International Space Station. Z Med Phys 34(1):14-30. doi:10.1016/j.zemedi.2023.06.005',
    publisher: 'Zeitschrift fuer Medizinische Physik (NASA, ESA, JAXA, Roscosmos, CSA authors)',
    year: 2024,
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10919966',
    quote: 'Effective doses usually accumulate at a rate of ~0.2 to ~0.5 mSv or more each day of a mission.',
  },
  BERGER_2017_DOSIS: {
    id: 'BERGER_2017_DOSIS',
    short: 'Berger et al. 2017 (DOSIS 3D)',
    title: 'DOSIS & DOSIS 3D: radiation measurements with the DOSTEL instruments onboard the Columbus Laboratory of the ISS in the years 2009-2016. J. Space Weather Space Clim. 7, A8. doi:10.1051/swsc/2017005',
    publisher: 'Journal of Space Weather and Space Climate',
    year: 2017,
    url: 'https://elib.dlr.de/111501',
    quote: 'The absorbed doses measured at the end of May 2016 reached up to 286 µGy/day with dose equivalent values of 647 µSv/day.',
  },
  ZEITLIN_2013_MSL_RAD: {
    id: 'ZEITLIN_2013_MSL_RAD',
    short: 'Zeitlin et al. 2013 (MSL RAD)',
    title: 'Measurements of Energetic Particle Radiation in Transit to Mars on the Mars Science Laboratory. Science 340(6136):1080-1084. doi:10.1126/science.1235989',
    publisher: 'Science',
    year: 2013,
    url: 'https://doi.org/10.1126/science.1235989',
    quote: 'Cruise absorbed dose rate 481 µGy/day inside the spacecraft (value as cited by Guo et al. 2015); about 0.66 Sv for a round trip transit.',
  },
  SWRI_2013_MSL_RAD: {
    id: 'SWRI_2013_MSL_RAD',
    short: 'SwRI 2013 (MSL RAD release)',
    title: 'SwRI-led team calculates the radiation exposure associated with a trip to Mars (press release, 30 May 2013)',
    publisher: 'Southwest Research Institute',
    year: 2013,
    url: 'https://www.swri.org/newsroom/press-releases/swri-led-team-calculates-the-radiation-exposure-associated-trip-mars',
    quote: 'The RAD data show an average GCR dose equivalent rate of 1.8 milliSieverts per day in cruise; 253-day journey.',
  },
  GUO_2015_MSL_RAD: {
    id: 'GUO_2015_MSL_RAD',
    short: 'Guo et al. 2015',
    title: 'Variations of dose rate observed by MSL/RAD in transit to Mars. Astronomy & Astrophysics 577, A58 (arXiv:1503.06631)',
    publisher: 'Astronomy & Astrophysics',
    year: 2015,
    url: 'https://arxiv.org/abs/1503.06631',
    quote: 'Re-evaluated cruise dose rate 458 µGy/day, compared to the earlier reported value (481 µGy/day); 253-day cruise.',
  },
  ZHANG_2020_CHANGE4_LND: {
    id: 'ZHANG_2020_CHANGE4_LND',
    short: "Zhang et al. 2020 (Chang'E 4 LND)",
    title: 'First measurements of the radiation dose on the lunar surface. Science Advances 6(39):eaaz1334. doi:10.1126/sciadv.aaz1334',
    publisher: 'Science Advances',
    year: 2020,
    url: 'https://doi.org/10.1126/sciadv.aaz1334',
    quote: 'Average total absorbed dose rate in silicon of 13.2 ± 1 µGy/hour; average dose equivalent of 1369 µSv/day on the lunar surface.',
  },
  NASA_HRP_5_HAZARDS: {
    id: 'NASA_HRP_5_HAZARDS',
    short: 'NASA HRP, 5 Hazards',
    title: '5 Hazards of Human Spaceflight',
    publisher: 'NASA Human Research Program',
    year: 2026,
    url: 'https://www.nasa.gov/hrp/hazards',
    quote: 'Rather than a three-day lunar trip, astronauts would be leaving our planet for roughly three years.',
  },
  NASA_ISS_ALTITUDE: {
    id: 'NASA_ISS_ALTITUDE',
    short: 'NASA, ISS research',
    title: 'Why Do Research On The International Space Station?',
    publisher: 'NASA',
    year: 2024,
    url: 'https://www.nasa.gov/missions/station/iss-research/why-do-research-on-the-international-space-station/',
    quote: 'Only 400 kilometers (250 miles) above our heads.',
  },
  NASA_ISS_MISSION_LENGTH: {
    id: 'NASA_ISS_MISSION_LENGTH',
    short: 'NASA, astronaut health care FAQ',
    title: 'The Real Story About Astronaut Health Care in Space',
    publisher: 'NASA',
    year: 2024,
    url: 'https://www.nasa.gov/missions/station/faq-the-real-story-about-astronaut-health-care-in-space/',
    quote: 'A typical mission to the International Space Station lasts about six months.',
  },
  NASA_MOON_FACT_SHEET: {
    id: 'NASA_MOON_FACT_SHEET',
    short: 'NASA NSSDC Moon Fact Sheet',
    title: 'Moon Fact Sheet',
    publisher: 'NASA Space Science Data Coordinated Archive',
    year: 2024,
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html',
    quote: 'Semimajor axis 0.3844 x 10^6 km; surface gravity 1.62 m/s^2 (0.165 of Earth).',
  },
  NASA_ARTEMIS_II: {
    id: 'NASA_ARTEMIS_II',
    short: 'NASA, Artemis II',
    title: 'Artemis II mission page',
    publisher: 'NASA',
    year: 2026,
    url: 'https://www.nasa.gov/mission/artemis-ii/',
    quote: 'Crewed lunar flyby, April 1 to April 10, 2026: 9 days, 1 hour, 32 minutes.',
  },
  NASA_SPACE_COMMS_7_THINGS: {
    id: 'NASA_SPACE_COMMS_7_THINGS',
    short: 'NASA, Space Communications',
    title: 'Space Communications: 7 Things You Need to Know',
    publisher: 'NASA',
    year: 2020,
    url: 'https://www.nasa.gov/solar-system/space-communications-7-things-you-need-to-know/',
    quote: "At Mars' closest approach the delay is about four minutes; at the greatest distance it is around 24 minutes.",
  },
  NASA_SHUTTLE_ENGINES: {
    id: 'NASA_SHUTTLE_ENGINES',
    short: 'NASA, Space Shuttle engines',
    title: 'History of the Space Shuttle Main Engines',
    publisher: 'NASA',
    year: 2025,
    url: 'https://www.nasa.gov/space-shuttle-recordation/engines/',
    quote: "The main engines continued to operate for 8.5 minutes after launch, the duration of the Shuttle's powered flight.",
  },
  BAGIAN_1993_ASCENT_G: {
    id: 'BAGIAN_1993_ASCENT_G',
    short: 'Bagian et al. 1993 (NASA NTRS)',
    title: 'Reach performance while wearing the Space Shuttle launch and entry suit during exposure to launch accelerations',
    publisher: 'NASA Technical Reports Server',
    year: 1993,
    url: 'https://ntrs.nasa.gov/citations/19940019731',
    quote: 'Crewmen aboard the Space Shuttle are subjected to accelerations during ascent which range up to +3 Gx.',
  },
  NOAA_SWPC_FLARES: {
    id: 'NOAA_SWPC_FLARES',
    short: 'NOAA SWPC, solar flares',
    title: 'Solar Flares (Radio Blackouts)',
    publisher: 'NOAA Space Weather Prediction Center',
    year: 2024,
    url: 'https://www.spaceweather.gov/phenomena/solar-flares-radio-blackouts',
    quote: 'Flares are classified by peak 0.1 to 0.8 nm X-ray flux: ... "M" flares (10^-5 W/m2), and finally "X" flares (10^-4 W/m2).',
    officialStandard: true,
  },
  NASA_DONKI: {
    id: 'NASA_DONKI',
    short: 'NASA DONKI (CCMC)',
    title: 'Space Weather Database Of Notifications, Knowledge, Information (DONKI)',
    publisher: 'NASA Community Coordinated Modeling Center, Goddard',
    year: 2026,
    url: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
    quote: 'Catalog of solar flares, solar energetic particle events, CMEs and geomagnetic storms.',
  },
}

export function sourceById(id: MissionSourceId): MissionSource {
  return MISSION_SOURCES[id]
}
