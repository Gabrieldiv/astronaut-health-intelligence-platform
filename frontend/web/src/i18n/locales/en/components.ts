/** Shared components (src/components): risk gauge, baseline explainer, trend chart. */
export default {
  'components.riskScore': 'Risk score',
  'components.riskScoreAria': 'Risk score {n} out of 100',

  'components.baseline.title': 'Why is this my normal?',
  'components.baseline.aria': 'Why is this my normal? {label}',
  'components.baseline.yourNormal': 'Your normal {label}',
  'components.baseline.range': '{low} to {high}',
  'components.baseline.learnedFrom': 'Learned from {n} of your own readings: {window}.',
  'components.baseline.median': 'The middle is your typical value (median {median}). The width comes from how much you usually vary (MAD {mad}), a robust spread that ignores one-off spikes.',
  'components.baseline.learning': 'Still learning your normal. Until there is enough of your own data, status for this signal stays cautious.',
  'components.baseline.learningN': 'Still learning your normal ({n} readings so far). Until there is enough of your own data, status for this signal stays cautious.',
  'components.baseline.compares': 'Status compares you with yourself, not with a population average.',
  'components.baseline.method': 'Baseline method: {version}',

  'components.event.alert': 'Alert',
  'components.event.intervention': 'Action logged',
  'components.event.checkin': 'Check-in',
  'components.chart.now': 'Now',
  'components.chart.noHistory': 'No history yet',
  'components.chart.aria': '{label} trend over the last {n} hours',
  'components.chart.withForecast': ' with forecast',
  'components.chart.eventsMarked': ', {n} events marked',
  'components.chart.yourNormal': 'Your normal',
  'components.chart.forecast': 'Forecast {value}',
  'components.chart.eventsList': 'Events on this chart',
  'components.chart.eventAria': '{kind} at {time} UTC: {label}',
}
