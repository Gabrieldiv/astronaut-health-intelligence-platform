// German: machine assisted translation, pending native review.
import type en from '../en/components'

const m: Record<keyof typeof en, string> = {
  'components.riskScore': 'Risikowert',
  'components.riskScoreAria': 'Risikowert {n} von 100',

  'components.baseline.title': 'Warum ist das mein Normalbereich?',
  'components.baseline.aria': 'Warum ist das mein Normalbereich? {label}',
  'components.baseline.yourNormal': 'Dein Normalbereich: {label}',
  'components.baseline.range': '{low} bis {high}',
  'components.baseline.learnedFrom': 'Gelernt aus {n} deiner eigenen Messungen: {window}.',
  'components.baseline.median': 'Die Mitte ist dein typischer Wert (Median {median}). Die Breite ergibt sich daraus, wie stark du üblicherweise schwankst (MAD {mad}), ein robustes Streuungsmaß, das einzelne Ausreißer ignoriert.',
  'components.baseline.learning': 'Dein Normalbereich wird noch gelernt. Bis genug eigene Daten vorliegen, bleibt der Status dieses Signals vorsichtig.',
  'components.baseline.learningN': 'Dein Normalbereich wird noch gelernt ({n} Messungen bisher). Bis genug eigene Daten vorliegen, bleibt der Status dieses Signals vorsichtig.',
  'components.baseline.compares': 'Der Status vergleicht dich mit dir selbst, nicht mit einem Bevölkerungsdurchschnitt.',
  'components.baseline.method': 'Methode der Basislinie: {version}',

  'components.event.alert': 'Warnung',
  'components.event.intervention': 'Maßnahme protokolliert',
  'components.event.checkin': 'Check-in',
  'components.chart.now': 'Jetzt',
  'components.chart.noHistory': 'Noch kein Verlauf',
  'components.chart.aria': 'Verlauf von {label} in den letzten {n} Stunden',
  'components.chart.withForecast': ' mit Prognose',
  'components.chart.eventsMarked': ', {n} Ereignisse markiert',
  'components.chart.yourNormal': 'Dein Normalbereich',
  'components.chart.forecast': 'Prognose {value}',
  'components.chart.eventsList': 'Ereignisse in diesem Diagramm',
  'components.chart.eventAria': '{kind} um {time} UTC: {label}',
}
export default m
