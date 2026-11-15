// Portuguese (Brazil): machine assisted translation, pending native review.
import type en from '../en/whatif'

const m: Record<keyof typeof en, string> = {
  'whatif.now': 'Agora',
  'whatif.hAgo': 'há {n} h',
  'whatif.hAhead': '+{n} h',
  'whatif.chartAria': '{metric}: trajetória projetada com e sem a ação nas próximas {n} horas',
  'whatif.personalNormal': 'Normal pessoal',
  'whatif.recent': 'Recente',
  'whatif.without': 'Sem a ação',
  'whatif.with': 'Com a ação',
  'whatif.recorded': 'Registrado {value} {unit}',
  'whatif.recentReadings': 'Leituras recentes',
  'whatif.cabin': 'Cabine',
  'whatif.title': 'E se: {action}',
  'whatif.subtitleMetric': ' · {metric}, próximas {n} h',
  'whatif.simulated': 'Simulado',
  'whatif.footer': 'Apenas apoio à decisão. Não é um diagnóstico. Converse com o oficial médico da tripulação.',
  'whatif.recompute': 'Recalcular a partir de agora',
  'whatif.disclaimer': 'Simulação apenas para discussão. Não é evidência de eficácia clínica.',
  'whatif.noneTitle': 'Nenhuma comparação disponível para esta ação',
  'whatif.noneBody':
    'O simulador não conseguiu projetar uma trajetória com e sem a ação para {callsign} agora. Isso acontece quando faltam dados recentes ou a ação não tem efeito modelado. A recomendação continua válida.',
  'whatif.inHours': 'Em {n} horas',
  'whatif.normalRange': 'Faixa normal pessoal: {low} a {high} {unit}.',
  'whatif.assumptions': 'Premissas',
  'whatif.noAssumptions': 'O simulador não listou premissas.',
  'whatif.compareAria': 'Comparar com e sem: {title}',
  'whatif.compareTitle': 'Comparar a trajetória projetada com e sem esta ação (simulação)',
  'whatif.compare': 'Comparar',
}
export default m
