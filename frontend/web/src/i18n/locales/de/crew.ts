// German: machine assisted translation, pending native review.
import type en from '../en/crew'

const m: Record<keyof typeof en, string> = {
  'crew.title': 'Crew',
  'crew.noData': 'keine Daten',
  'crew.cardAria': '{callsign}, {role}. Status: {status}',
  'crew.cardAriaLost': '{callsign}, {role}. Status: {status}, Signal verloren',
  'crew.cardTitle': '{callsign}, {role} (Taste {key})',
  'crew.trendTitle': 'Herzfrequenz, letzte 6 Stunden',
}
export default m
