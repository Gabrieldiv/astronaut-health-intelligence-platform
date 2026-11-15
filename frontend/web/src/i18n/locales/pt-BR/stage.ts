// Portuguese (Brazil): machine assisted translation, pending native review.
import type en from '../en/stage'

const m: Record<keyof typeof en, string> = {
  'stage.building3d': 'Montando a anatomia 3D...',
  'stage.activity.SLEEP': 'Dormindo',
  'stage.activity.REST': 'Descansando',
  'stage.activity.WORK': 'Trabalhando',
  'stage.activity.EXERCISE': 'Em exercício',
  'stage.activity.EVA': 'Em caminhada espacial (EVA)',
  'stage.missionDay': 'Dia de missão {n}',
  'stage.waiting': 'Aguardando dados.',
  'stage.notMonitored': 'Não monitorado',
  'stage.selectedStructure': ' Estrutura selecionada: {name}. Pressione para selecionar o sistema inteiro.',
  'stage.atlasCount': ' ({n} estruturas no atlas de anatomia)',
  'stage.contextOnly': 'Apenas contexto',
  'stage.bodySystems': 'Sistemas do corpo: {list}',
  'stage.bodyOverview': 'Visão geral do corpo',
  'stage.ind.inRange': '{ok}/{total} no normal',
  'stage.ind.noData': '{n} sem dados',
  'stage.ind.aria': '{ok} de {total} indicadores dentro do seu normal, {flagged} em destaque, {missing} sem dados.',
}
export default m
