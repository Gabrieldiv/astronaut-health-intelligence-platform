// Portuguese (Brazil): machine assisted translation, pending native review.
import type en from '../en/backdrop'

const m: Record<keyof typeof en, string> = {
  'backdrop.name.LAUNCH': 'Lançamento e subida',
  'backdrop.name.ISS': 'ISS, órbita baixa da Terra',
  'backdrop.name.MOON': 'Lua, classe Artemis',
  'backdrop.name.MARS_TRANSIT': 'Trânsito a Marte, espaço profundo',
  'backdrop.fact.upToG': 'Até {g} g',
  'backdrop.fact.poweredMin': '{n} min de voo propulsado',
  'backdrop.fact.altitude': '{km} km de altitude',
  'backdrop.fact.weightless': 'Sem peso',
  'backdrop.fact.dose': '{v} mSv/dia',
  'backdrop.fact.gravity': '{g} g',
  'backdrop.fact.distance': '{km} km da Terra',
  'backdrop.fact.delaySec': 'Atraso de {s} s',
  'backdrop.fact.delayMin': 'Atraso de {min} a {max} min',
  'backdrop.label.ship': 'Nave, dia {day} de {total}',
  'backdrop.orbit': 'Órbita de {min} min',
  'backdrop.gauge': 'Pico de {g} g',
  'backdrop.gaugeTitle': 'Carga de pico de referência da subida, do perfil citado, não é uma leitura ao vivo.',
}
export default m
