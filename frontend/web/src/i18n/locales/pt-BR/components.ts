// Portuguese (Brazil): machine assisted translation, pending native review.
import type en from '../en/components'

const m: Record<keyof typeof en, string> = {
  'components.riskScore': 'Índice de risco',
  'components.riskScoreAria': 'Índice de risco {n} de 100',

  'components.baseline.title': 'Por que este é o meu normal?',
  'components.baseline.aria': 'Por que este é o meu normal? {label}',
  'components.baseline.yourNormal': 'Seu normal: {label}',
  'components.baseline.range': '{low} a {high}',
  'components.baseline.learnedFrom': 'Aprendido a partir de {n} leituras suas: {window}.',
  'components.baseline.median': 'O centro é o seu valor típico (mediana {median}). A largura vem de quanto você costuma variar (MAD {mad}), uma medida de dispersão robusta que ignora picos isolados.',
  'components.baseline.learning': 'Ainda aprendendo o seu normal. Até haver dados seus suficientes, o estado deste sinal fica cauteloso.',
  'components.baseline.learningN': 'Ainda aprendendo o seu normal ({n} leituras até agora). Até haver dados seus suficientes, o estado deste sinal fica cauteloso.',
  'components.baseline.compares': 'O estado compara você com você mesmo, não com a média de uma população.',
  'components.baseline.method': 'Método da linha de base: {version}',

  'components.event.alert': 'Alerta',
  'components.event.intervention': 'Ação registrada',
  'components.event.checkin': 'Check-in',
  'components.chart.now': 'Agora',
  'components.chart.noHistory': 'Ainda sem histórico',
  'components.chart.aria': 'Tendência de {label} nas últimas {n} horas',
  'components.chart.withForecast': ' com previsão',
  'components.chart.eventsMarked': ', {n} eventos marcados',
  'components.chart.yourNormal': 'Seu normal',
  'components.chart.forecast': 'Previsão {value}',
  'components.chart.eventsList': 'Eventos neste gráfico',
  'components.chart.eventAria': '{kind} às {time} UTC: {label}',
}
export default m
