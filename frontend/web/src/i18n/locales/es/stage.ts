// Spanish: machine assisted translation, pending native review.
import type en from '../en/stage'

const m: Record<keyof typeof en, string> = {
  'stage.building3d': 'Construyendo la anatomía 3D...',
  'stage.activity.SLEEP': 'Durmiendo',
  'stage.activity.REST': 'Descansando',
  'stage.activity.WORK': 'Trabajando',
  'stage.activity.EXERCISE': 'Haciendo ejercicio',
  'stage.activity.EVA': 'En caminata espacial (EVA)',
  'stage.missionDay': 'Día de misión {n}',
  'stage.waiting': 'Esperando datos.',
  'stage.notMonitored': 'No monitorizado',
  'stage.selectedStructure': ' Estructura seleccionada: {name}. Pulsa para seleccionar todo el sistema.',
  'stage.atlasCount': ' ({n} estructuras en el atlas de anatomía)',
  'stage.contextOnly': 'Solo contexto',
  'stage.bodySystems': 'Sistemas del cuerpo: {list}',
  'stage.bodyOverview': 'Vista general del cuerpo',
  'stage.ind.inRange': '{ok}/{total} indicadores normales',
  'stage.ind.title': 'Indicadores de salud: {name}',
  'stage.ind.explain': 'Cada segmento es un indicador medido, como la frecuencia cardíaca, el sueño o el oxígeno en sangre, comparado con el rango normal de {name} y no con una persona promedio.',
  'stage.ind.summary': '{ok} de {total} indicadores están en el rango normal',
  'stage.ind.environment': 'Exposición de la cabina y radiación',
  'stage.ind.showOnBody': 'Mostrar este sistema en el cuerpo',
  'stage.ind.missingNote': 'Los indicadores sin datos nunca se cuentan como normales.',
  'stage.ind.open': '¿Qué cubren estos indicadores? Abrir el detalle',
  'stage.ind.noData': '{n} sin datos',
  'stage.ind.aria': '{ok} de {total} indicadores dentro de tu rango normal, {flagged} señalados, {missing} sin datos.',
}
export default m
