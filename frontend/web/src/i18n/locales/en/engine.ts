import { FIXED_THRESHOLDS } from '../../../engine/config'
import { PROFILE_CONTEXT, REC_CATALOG } from '../../../engine/recommendations'
import { RULE_TITLES } from '../../../engine/ruleTitles'

/**
 * Engine sentences (src/i18n/engineText.ts renders them from the structured messages the engine
 * attaches next to its English text, see src/engine/msg.ts). Rule titles, recommendation texts,
 * mission profile context and threshold names are derived from the engine constants, so the
 * English stays byte for byte identical to the source of truth. Templates keep `{param}`
 * placeholders; a placeholder starting with a capital letter is capitalized when rendered.
 */
const templates = {
  // Durations and counts
  'eng.dur.min': '{n} min',
  'eng.dur.hours_one': '{n} hour',
  'eng.dur.hours_other': '{n} hours',
  'eng.dur.days_one': '{n} day',
  'eng.dur.days_other': '{n} days',
  'eng.span.night_one': '{n} night',
  'eng.span.night_other': '{n} nights',
  'eng.span.session_one': '{n} session',
  'eng.span.session_other': '{n} sessions',
  'eng.span.test_one': '{n} test',
  'eng.span.test_other': '{n} tests',
  'eng.span.check-in_one': '{n} check-in',
  'eng.span.check-in_other': '{n} check-ins',
  'eng.span.value_one': '{n} value',
  'eng.span.value_other': '{n} values',
  'eng.list.and': '{a} and {b}',
  'eng.list.sep': ', ',
  'eng.sent1': '{a}.',
  'eng.sent2': '{a}. {b}.',

  // Amounts and deviations
  'eng.amt.pct': '{n}%',
  'eng.amt.points': '{n} points',
  'eng.amt.degC': '{n} °C',
  'eng.dev.plain.above': 'above your normal',
  'eng.dev.plain.below': 'below your normal',
  'eng.dev.far.above': 'far above your normal',
  'eng.dev.far.below': 'far below your normal',
  'eng.dev.well.above': 'well above your normal',
  'eng.dev.well.below': 'well below your normal',
  'eng.dev.clearly.above': 'clearly above your normal',
  'eng.dev.clearly.below': 'clearly below your normal',
  'eng.dev.slightly.above': 'slightly above your normal',
  'eng.dev.slightly.below': 'slightly below your normal',
  'eng.dev.sleep.above': 'longer than your normal',
  'eng.dev.sleep.below': 'shorter than your normal',
  'eng.ctx.SLEEP': ' during sleep',
  'eng.ctx.REST': ' at rest',
  'eng.ctx.WORK': ' during work',
  'eng.ctx.EXERCISE': ' for exercise',
  'eng.lead.restingHr': 'Resting heart rate',
  'eng.lead.sleep': 'Sleep',

  // Metric findings (factor labels and crew phrases)
  'eng.dq.label.for': 'No {metric} data for {dur}',
  'eng.dq.label.yet': 'No {metric} data yet',
  'eng.dq.phrase': '{metric} is not being received',
  'eng.fixed.label.above': '{metric} {value}, above the {name} of {limit}',
  'eng.fixed.label.below': '{metric} {value}, below the {name} of {limit}',
  'eng.fixed.phrase.your.above': 'Your {metric} is above the {name}',
  'eng.fixed.phrase.your.below': 'Your {metric} is below the {name}',
  'eng.fixed.phrase.cabin.above': 'Cabin {metric} is above the {name}',
  'eng.fixed.phrase.cabin.below': 'Cabin {metric} is below the {name}',
  'eng.acute.label': '{metric} {value}, {dev}{ctx} (robust z {z})',
  'eng.acute.phrase.your': 'Your {metric} is {dev}{ctx}',
  'eng.acute.phrase.cabin': 'Cabin {metric} is {dev}{ctx}',
  'eng.trend.label': '{metric} {amt} {dev} for {span}',
  'eng.trend.phrase': '{metric} has been {dev} for {span}',
  'eng.cusum.label': '{metric} {amt} {dev}: a small but steady drift over {dur} (CUSUM)',
  'eng.questionable': '{label} (questionable signal, capped at Watch)',
  'eng.self.MOOD.up': 'a better mood',
  'eng.self.MOOD.down': 'a lower mood',
  'eng.self.PERCEIVED_FATIGUE.up': 'more fatigue',
  'eng.self.PERCEIVED_FATIGUE.down': 'less fatigue',
  'eng.self.STRESS.up': 'more stress',
  'eng.self.STRESS.down': 'less stress',
  'eng.self.sentence.last1': 'You reported {more} than usual in your last check-in',
  'eng.self.sentence.lastN': 'You reported {more} than usual in your last {span}',
  'eng.self.label': '{sentence} ({amt} {dev} on a 1 to 5 scale)',

  // Combined rules
  'eng.card.label': 'Heart rate {hr} bpm and blood oxygen {spo2}% changed together, far from your normal',
  'eng.card.phrase': 'Your heart rate and blood oxygen changed quickly together',
  'eng.fat.part.sleep': 'shorter sleep',
  'eng.fat.part.hrv': 'lower HRV',
  'eng.fat.part.hr': 'higher resting heart rate',
  'eng.fat.label': 'Combined recovery pattern: {list} at the same time',
  'eng.fat.label.corroborated': 'Combined recovery pattern: {list} at the same time, matching what you reported in your check-ins',
  'eng.fat.phrase': '{List} are showing up together',
  'eng.psy.fatigueRun': 'You also reported high fatigue in your last {n} check-ins',
  'eng.psy.symptoms': 'You reported {list} today',
  'eng.co2.label.both': 'Your breathing rate and reaction time are above your normal while cabin CO₂ is elevated (co-occurrence, not proof of cause)',
  'eng.co2.label.rr': 'Your breathing rate is above your normal while cabin CO₂ is elevated (co-occurrence, not proof of cause)',
  'eng.co2.label.rt': 'Your reaction time is above your normal while cabin CO₂ is elevated (co-occurrence, not proof of cause)',
  'eng.co2.phrase.both': 'Your breathing rate and reaction time are up while cabin CO₂ is elevated',
  'eng.co2.phrase.rr': 'Your breathing rate is up while cabin CO₂ is elevated',
  'eng.co2.phrase.rt': 'Your reaction time is up while cabin CO₂ is elevated',
  'eng.device.silent.label': 'No data from {dev} for {dur} ({list}): status unknown, not normal',
  'eng.device.silent.labelWhile': 'No data from {dev} for a while ({list}): status unknown, not normal',
  'eng.device.silent.phrase.your': 'Your {dev} is not sending data',
  'eng.device.silent.phrase.the': 'The {dev} is not sending data',
  'eng.device.silent.title': '{dev} not sending data',
  'eng.device.weak.label': '{dev} signal is weak; {list} marked questionable and capped at Watch',
  'eng.device.weak.phrase.your': 'Your {dev} signal is weak',
  'eng.device.weak.phrase.the': 'The {dev} signal is weak',
  'eng.device.weak.title': '{dev} signal quality reduced',

  // Risk headline (shown on the stage) and region summaries
  'eng.head.normal': 'All indicators are within your normal range.',
  'eng.head.missing': 'Some readings are missing, so this picture is incomplete.',
  'eng.head.cabinNormal': 'Cabin air and radiation are within their usual range.',
  'eng.head.so': '{phrase}, so {tail}.',
  'eng.tail.sensor': 'a sensor check is suggested',
  'eng.tail.talk': 'a short talk with the crew medical officer may help',
  'eng.tail.airNow': 'cabin air action is requested now',
  'eng.tail.air': 'a cabin air check is suggested',
  'eng.tail.medicalNow': 'medical review is requested now',
  'eng.tail.surgeon': 'a flight surgeon review is suggested',
  'eng.tail.watch': 'keep an eye on it',
  'eng.region.unmonitored': 'Not directly monitored in this prototype. {desc}',
  'eng.region.noData': 'No data: {list} not being received.',
  'eng.region.normalButNoData': 'Within your normal range, but no data for {list}.',
  'eng.region.normal': 'Within your normal range.',

  // Limitations, data window, forecast and the experimental multivariate detector
  'eng.limit.simulated': 'Simulated data only (data_origin SIMULATED); no real astronaut data.',
  'eng.limit.support': 'Decision support for review, not a diagnosis or a medical device.',
  'eng.limit.thresholds': 'Fixed thresholds are demo configuration, not official NASA limits.',
  'eng.limit.correlation': 'Correlation between signals does not prove cause.',
  'eng.limit.missing': 'No current data for {list}; status for those signals is unknown, not normal.',
  'eng.dataWindow': 'Personal baseline: last {days} days (daily metrics: last {dailyDays} days). Current values: last 3 readings.',
  'eng.forecast.disclaimer':
    'Statistical projection from recent simulated data. Not a clinical prediction: uncertainty grows with the horizon and the projection assumes recent conditions continue.',
  'eng.mv.noData': 'Not evaluated: no current data for {list}. Missing data is never treated as typical.',
  'eng.mv.typical': 'The combination of your signals looks like your own recent days.',
  'eng.mv.share': '{metric} {pct}%',
  'eng.mv.part': '{metric} {dev}',
  'eng.mv.unusual':
    'Unusual combination: {parts} at the same time for {dur}. This mix is rare in your own recent days (score {score}, your threshold {threshold}). Signals that contributed most: {shares}.',
  'eng.mv.elevated': 'Unusual mix of signals right now ({shares}). Not flagged: it must last and agree with the slower trend rules first.',

  // Space weather advisory (NASA DONKI, REAL_PUBLIC)
  'eng.sw.event.flareClass': '{cls} solar flare',
  'eng.sw.event.flare': 'Solar flare',
  'eng.sw.event.sep': 'Solar energetic particle event',
  'eng.sw.event.cme': 'Coronal mass ejection',
  'eng.sw.event.stormKp': 'Geomagnetic storm (Kp {kp})',
  'eng.sw.event.storm': 'Geomagnetic storm',
  'eng.sw.two': '{a} and {b}',
  'eng.sw.more': '{list} and {n} more',
  'eng.sw.noData.title': 'Space weather not available yet',
  'eng.sw.noData.body': 'No NASA DONKI data has been loaded. This is unknown, not "all clear": follow the space weather briefing from mission control.',
  'eng.sw.quiet.title': 'No major solar event in the last {h} hours',
  'eng.sw.quiet.body': 'No solar energetic particle event or X class flare in NASA DONKI in the {h} h before the data was retrieved.',
  'eng.sw.shelter.title': 'Move to the radiation storm shelter',
  'eng.sw.shelter.bodyMoon':
    'NASA DONKI reports a recent {what}. On the Moon there is no Earth magnetic field to stop solar particles. Follow the shelter procedure now: move to the most shielded area, stop surface or extravehicular activity, and keep personal dosimeters on. Do not wait for Earth to confirm; report to mission control when you can.',
  'eng.sw.shelter.bodyDeep':
    'NASA DONKI reports a recent {what}. In deep space there is no Earth magnetic field to stop solar particles. Follow the shelter procedure now: move to the most shielded area, stop surface or extravehicular activity, and keep personal dosimeters on. Do not wait for Earth to confirm; report to mission control when you can.',
  'eng.sw.launch.title': 'Pre launch space weather note',
  'eng.sw.launch.body':
    'NASA DONKI reports a recent {what}. The ascent dose is negligible, but the launch team should include space weather in the go or no go briefing and in the plan for the first days in orbit.',
  'eng.sw.monitor.title': 'Monitor radiation: solar event reported',
  'eng.sw.monitor.body':
    'NASA DONKI reports a recent {what}. In low Earth orbit the magnetic field shields most of it. Keep monitoring the dosimeters and follow flight control guidance about shielded areas and spacewalks.',

  // Alerts and recommendations
  'eng.ruleTitle': '{title}',
  'eng.alert.titleFor': '{name}: {title}',
  'eng.alert.detail': '{label}. Decision support only, not a diagnosis.',
  'eng.recTitle': '{title}',
  'eng.rec.rationale': '{label}. {why}',
  'eng.rec.rationaleCtx': '{label}. {why} {extra}',
  'eng.rec.onboardTitle': 'Crew medical officer: start the onboard assessment protocol now',
  'eng.rec.onboardRationale':
    '{label}. Earth is about {oneWay} away each way ({profile}), so the earliest flight surgeon reply is about {earliest} after a request (2 x {oneWay} light time plus at least {reviewMin} min review), not before {clock} if sent now. Start the onboard assessment protocol and send a health packet; the ground review follows when the reply arrives.',
}

type RuleId = 'R-HR-01' | 'R-HR-02' | 'R-HR-03' | 'R-HRV-01' | 'R-SPO2-01' | 'R-SPO2-02' | 'R-RR-01' | 'R-BP-01' | 'R-TEMP-01' | 'R-ACT-01' | 'R-HYD-01' | 'R-SLEEP-01' | 'R-SLEEP-02' | 'R-EX-01' | 'R-RT-01' | 'R-RAD-02' | 'R-ENV-CO2-01' | 'R-ENV-CO2-02' | 'R-ENV-TEMP-01' | 'R-ENV-RH-01' | 'R-ENV-RAD-01' | 'R-FAT-01' | 'R-CARD-01' | 'R-DQ-01' | 'R-DQ-02' | 'R-PSY-01' | 'R-PSY-02' | 'R-PSY-03' | 'R-PSY-04'
type RecRuleId = Exclude<RuleId, 'R-PSY-04'>
type ThresholdName = 'demo safety floor' | 'demo watch floor' | 'demo resting ceiling' | 'demo resting watch level' | 'demo critical level' | 'demo warning level' | 'demo watch level' | 'demo comfort band' | 'demo particle event level' | 'demo mission dose watch level'
type ProfileCtxKey =
  | 'ISS.R-EX-01' | 'ISS.R-ACT-01'
  | 'MARS_TRANSIT.R-EX-01' | 'MARS_TRANSIT.R-ACT-01' | 'MARS_TRANSIT.R-ENV-RAD-01' | 'MARS_TRANSIT.R-RAD-02' | 'MARS_TRANSIT.R-PSY-01'
  | 'MOON.R-EX-01' | 'MOON.R-ENV-RAD-01'
  | 'LAUNCH.R-HR-01'

type DerivedKey = `eng.rule.${RuleId}` | `eng.rec.${RecRuleId}.${'title' | 'why'}` | `eng.threshold.${ThresholdName}` | `eng.profileCtx.${ProfileCtxKey}`

const derived: [string, string][] = [
  ...Object.entries(RULE_TITLES).map(([id, title]): [string, string] => [`eng.rule.${id}`, title]),
  ...Object.entries(REC_CATALOG.byRule).flatMap(([id, tpl]): [string, string][] => [
    [`eng.rec.${id}.title`, tpl.title],
    [`eng.rec.${id}.why`, tpl.why],
  ]),
  ...FIXED_THRESHOLDS.map((f): [string, string] => [`eng.threshold.${f.name}`, f.name]),
  ...Object.entries(PROFILE_CONTEXT).flatMap(([profile, byRule]) =>
    Object.entries(byRule ?? {}).map(([rule, text]): [string, string] => [`eng.profileCtx.${profile}.${rule}`, text ?? '']),
  ),
]

const engine = { ...templates, ...(Object.fromEntries(derived) as Record<DerivedKey, string>) }
export default engine
