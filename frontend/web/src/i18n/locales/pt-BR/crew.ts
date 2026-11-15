// Portuguese (Brazil): machine assisted translation, pending native review.
import type en from '../en/crew'

const m: Record<keyof typeof en, string> = {
  'crew.title': 'Tripulação',
  'crew.noData': 'sem dados',
  'crew.cardAria': '{callsign}, {role}. Status: {status}',
  'crew.cardAriaLost': '{callsign}, {role}. Status: {status}, sinal perdido',
  'crew.cardTitle': '{callsign}, {role} (tecla {key})',
  'crew.trendTitle': 'Frequência cardíaca, últimas 6 horas',
}
export default m
