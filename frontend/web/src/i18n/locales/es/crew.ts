// Spanish: machine assisted translation, pending native review.
import type en from '../en/crew'

const m: Record<keyof typeof en, string> = {
  'crew.title': 'Tripulación',
  'crew.noData': 'sin datos',
  'crew.cardAria': '{callsign}, {role}. Estado: {status}',
  'crew.cardAriaLost': '{callsign}, {role}. Estado: {status}, señal perdida',
  'crew.cardTitle': '{callsign}, {role} (tecla {key})',
  'crew.trendTitle': 'Frecuencia cardiaca, últimas 6 horas',
}
export default m
