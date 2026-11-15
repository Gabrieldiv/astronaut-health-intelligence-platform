// Spanish: machine assisted translation, pending native review.
import type en from '../en/whatif'

const m: Record<keyof typeof en, string> = {
  'whatif.now': 'Ahora',
  'whatif.hAgo': 'hace {n} h',
  'whatif.hAhead': '+{n} h',
  'whatif.chartAria': '{metric}: trayectoria proyectada con y sin la acción en las próximas {n} horas',
  'whatif.personalNormal': 'Normal personal',
  'whatif.recent': 'Reciente',
  'whatif.without': 'Sin la acción',
  'whatif.with': 'Con la acción',
  'whatif.recorded': 'Registrado {value} {unit}',
  'whatif.recentReadings': 'Lecturas recientes',
  'whatif.cabin': 'Cabina',
  'whatif.title': 'Y si: {action}',
  'whatif.subtitleMetric': ' · {metric}, próximas {n} h',
  'whatif.simulated': 'Simulado',
  'whatif.footer': 'Solo apoyo a la decisión. No es un diagnóstico. Coméntalo con el oficial médico de la tripulación.',
  'whatif.recompute': 'Recalcular desde ahora',
  'whatif.disclaimer': 'Simulación solo para conversar. No es evidencia de eficacia clínica.',
  'whatif.noneTitle': 'No hay comparación disponible para esta acción',
  'whatif.noneBody':
    'El simulador no pudo proyectar una trayectoria con y sin la acción para {callsign} en este momento. Ocurre cuando faltan datos recientes o la acción no tiene un efecto modelado. La recomendación sigue siendo válida.',
  'whatif.inHours': 'En {n} horas',
  'whatif.normalRange': 'Rango normal personal: {low} a {high} {unit}.',
  'whatif.assumptions': 'Supuestos',
  'whatif.noAssumptions': 'El simulador no indicó supuestos.',
  'whatif.compareAria': 'Comparar con y sin: {title}',
  'whatif.compareTitle': 'Comparar la trayectoria proyectada con y sin esta acción (simulación)',
  'whatif.compare': 'Comparar',
}
export default m
