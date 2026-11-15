// Spanish: machine assisted translation, pending native review.
import type en from '../en/components'

const m: Record<keyof typeof en, string> = {
  'components.riskScore': 'Índice de riesgo',
  'components.riskScoreAria': 'Índice de riesgo {n} de 100',

  'components.baseline.title': '¿Por qué este es mi normal?',
  'components.baseline.aria': '¿Por qué este es mi normal? {label}',
  'components.baseline.yourNormal': 'Tu normal: {label}',
  'components.baseline.range': '{low} a {high}',
  'components.baseline.learnedFrom': 'Aprendido de {n} lecturas tuyas: {window}.',
  'components.baseline.median': 'El centro es tu valor típico (mediana {median}). El ancho refleja cuánto sueles variar (MAD {mad}), una medida de dispersión robusta que ignora picos aislados.',
  'components.baseline.learning': 'Todavía aprendiendo tu normal. Hasta tener suficientes datos tuyos, el estado de esta señal es prudente.',
  'components.baseline.learningN': 'Todavía aprendiendo tu normal ({n} lecturas hasta ahora). Hasta tener suficientes datos tuyos, el estado de esta señal es prudente.',
  'components.baseline.compares': 'El estado te compara contigo mismo, no con el promedio de una población.',
  'components.baseline.method': 'Método de la línea base: {version}',

  'components.event.alert': 'Alerta',
  'components.event.intervention': 'Acción registrada',
  'components.event.checkin': 'Check-in',
  'components.chart.now': 'Ahora',
  'components.chart.noHistory': 'Aún sin historial',
  'components.chart.aria': 'Tendencia de {label} en las últimas {n} horas',
  'components.chart.withForecast': ' con pronóstico',
  'components.chart.eventsMarked': ', {n} eventos marcados',
  'components.chart.yourNormal': 'Tu normal',
  'components.chart.forecast': 'Pronóstico {value}',
  'components.chart.eventsList': 'Eventos en este gráfico',
  'components.chart.eventAria': '{kind} a las {time} UTC: {label}',
}
export default m
