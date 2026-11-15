// Spanish: machine assisted translation, pending native review.
import type en from '../en/tour'

const m: Record<keyof typeof en, string> = {
  'tour.dialogAria': 'Demo guiada, paso {n} de {total}: {title}',
  'tour.heading': 'Demo guiada',
  'tour.autoPause': 'Pausar la reproducción automática',
  'tour.autoStart': 'Reproducción automática: avanza cada pocos segundos',
  'tour.auto': 'Auto',
  'tour.exit': 'Salir de la demo (Esc)',
  'tour.stepsAria': 'Pasos de la demo',
  'tour.stepAria': 'Paso {n}: {title}',
  'tour.back': 'Atrás',
  'tour.finish': 'Terminar',
  'tour.next': 'Siguiente',
  'tour.keysHint': '{left}{right} para moverte, {esc} para salir. Al salir se vuelve a un día nominal.',
  'tour.step.crew.title': 'Conoce a la tripulación',
  'tour.step.crew.caption': 'Cuatro astronautas, cada uno comparado con su propio normal. Cada tarjeta dice con palabras sencillas cómo está esa persona: Todo bien, Vigilar, Actuar pronto o Actuar ya.',
  'tour.step.body.title': 'El cuerpo de un vistazo',
  'tour.step.body.caption':
    'La anatomía 3D está conectada con los datos en vivo. Los órganos que necesitan atención se iluminan con el color de su estado. El corazón late a la frecuencia cardíaca en vivo y los pulmones respiran a la frecuencia respiratoria en vivo.',
  'tour.step.body.hint': 'Haz clic en cualquier estructura: el panel muestra sus datos o indica que solo se muestra como referencia.',
  'tour.step.acute.title': 'Evento cardíaco agudo',
  'tour.step.acute.caption': 'La frecuencia cardíaca de ORION sube de golpe mientras baja el oxígeno en sangre. En pocos minutos simulados aparece un aviso CRITICAL, que escala si nadie lo confirma.',
  'tour.step.actions.title': 'Qué hacer y quién puede hacerlo',
  'tour.step.actions.caption':
    'Cada acción explica por qué y si la tripulación puede actuar a bordo ahora o necesita al médico de vuelo. Marcar como hecho lo registra en la auditoría y la simulación muestra una recuperación hipotética.',
  'tour.step.actions.hint': 'Prueba a marcar como hecho el protocolo de descanso.',
  'tour.step.comms.title': 'Lejos de la Tierra',
  'tour.step.comms.caption': 'Ahora imagina a la misma tripulación cerca de Marte, a 22 minutos en cada sentido. Cualquier respuesta de la Tierra tarda al menos 44 minutos, así que AHI pone primero los pasos a bordo y muestra la espera.',
  'tour.step.fatigue.title': 'Cambio lento: fatiga progresiva',
  'tour.step.fatigue.caption': 'Avanza rápido, a 1 hora por segundo. LYRA duerme menos y su variabilidad cardíaca cae por debajo de su propio normal. La línea de tiempo muestra cómo cambia el estado a lo largo de los días.',
  'tour.step.normal.title': 'Su normal, no un promedio',
  'tour.step.normal.caption': 'La banda sombreada es el normal personal de LYRA. Las marcas del gráfico muestran alertas, acciones registradas y chequeos, y el cono discontinuo es el pronóstico.',
  'tour.step.normal.hint': 'La (i) junto a "Tu normal" explica cómo se aprendió.',
  'tour.step.whatif.title': '¿Y si sigue el consejo?',
  'tour.step.whatif.caption': 'Compara las próximas horas con y sin la acción, lado a lado. Es una proyección hipotética, nunca una promesa de efecto clínico.',
  'tour.step.crewview.title': 'Vista de tripulación: para el astronauta',
  'tour.step.crewview.caption': 'Los mismos datos para la persona a la que se refieren: palabras sencillas, las dos cosas principales que hacer, signos vitales grandes frente a su propio normal y un chequeo diario de 30 segundos.',
  'tour.step.tools.title': 'Herramientas de misión',
  'tour.step.tools.caption':
    'El menú Herramientas reúne el resumen de la misión a largo plazo (presupuesto de radiación, ejercicio, sueño), un informe de relevo para el siguiente turno y el origen de cada número. Todos los datos son simulados y están identificados.',
}
export default m
