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
}
export default m
