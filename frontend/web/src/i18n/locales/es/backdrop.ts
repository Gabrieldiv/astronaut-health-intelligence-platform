// Spanish: machine assisted translation, pending native review.
import type en from '../en/backdrop'

const m: Record<keyof typeof en, string> = {
  'backdrop.hudOpen': 'Contexto de la misión: abrir qué cambia este perfil',
  'backdrop.name.LAUNCH': 'Lanzamiento y ascenso',
  'backdrop.name.ISS': 'ISS, órbita terrestre baja',
  'backdrop.name.MOON': 'Luna, clase Artemis',
  'backdrop.name.MARS_TRANSIT': 'Tránsito a Marte, espacio profundo',
  'backdrop.fact.upToG': 'Hasta {g} g',
  'backdrop.fact.poweredMin': '{n} min de vuelo propulsado',
  'backdrop.fact.altitude': '{km} km de altitud',
  'backdrop.fact.weightless': 'Ingravidez',
  'backdrop.fact.dose': '{v} mSv/día',
  'backdrop.fact.gravity': '{g} g',
  'backdrop.fact.distance': '{km} km de la Tierra',
  'backdrop.fact.delaySec': 'Retardo de {s} s',
  'backdrop.fact.delayMin': 'Retardo de {min} a {max} min',
  'backdrop.label.ship': 'Nave, día {day} de {total}',
  'backdrop.orbit': 'Órbita de {min} min',
  'backdrop.gauge': 'Pico de {g} g',
  'backdrop.gaugeTitle': 'Carga máxima de referencia del ascenso, del perfil citado, no es una lectura en vivo.',
}
export default m
