// German: machine assisted translation, pending native review.
import type en from '../en/whatif'

const m: Record<keyof typeof en, string> = {
  'whatif.now': 'Jetzt',
  'whatif.hAgo': 'vor {n} h',
  'whatif.hAhead': '+{n} h',
  'whatif.chartAria': '{metric}: projizierter Verlauf mit und ohne die Maßnahme in den nächsten {n} Stunden',
  'whatif.personalNormal': 'Persönlicher Normalbereich',
  'whatif.recent': 'Zuletzt',
  'whatif.without': 'Ohne Maßnahme',
  'whatif.with': 'Mit Maßnahme',
  'whatif.recorded': 'Gemessen {value} {unit}',
  'whatif.recentReadings': 'Letzte Messwerte',
  'whatif.cabin': 'Kabine',
  'whatif.title': 'Was wäre wenn: {action}',
  'whatif.subtitleMetric': ' · {metric}, nächste {n} h',
  'whatif.simulated': 'Simuliert',
  'whatif.footer': 'Nur Entscheidungsunterstützung. Keine Diagnose. Mit dem medizinischen Crew-Offizier besprechen.',
  'whatif.recompute': 'Ab jetzt neu berechnen',
  'whatif.disclaimer': 'Simulation nur zur Besprechung. Kein Nachweis einer klinischen Wirksamkeit.',
  'whatif.noneTitle': 'Für diese Maßnahme ist kein Vergleich verfügbar',
  'whatif.noneBody':
    'Der Simulator konnte für {callsign} gerade keinen Verlauf mit und ohne Maßnahme berechnen. Das passiert, wenn aktuelle Daten fehlen oder die Maßnahme keine modellierte Wirkung hat. Die Empfehlung selbst bleibt bestehen.',
  'whatif.inHours': 'In {n} Stunden',
  'whatif.normalRange': 'Persönlicher Normalbereich: {low} bis {high} {unit}.',
  'whatif.assumptions': 'Annahmen',
  'whatif.noAssumptions': 'Der Simulator hat keine Annahmen angegeben.',
  'whatif.compareAria': 'Mit und ohne vergleichen: {title}',
  'whatif.compareTitle': 'Projizierten Verlauf mit und ohne diese Maßnahme vergleichen (Simulation)',
  'whatif.compare': 'Vergleichen',
}
export default m
