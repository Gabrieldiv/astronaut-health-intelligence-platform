// German: machine assisted translation, pending native review.
import type en from '../en/backdrop'

const m: Record<keyof typeof en, string> = {
  'backdrop.name.LAUNCH': 'Start und Aufstieg',
  'backdrop.name.ISS': 'ISS, niedrige Erdumlaufbahn',
  'backdrop.name.MOON': 'Mond, Artemis-Klasse',
  'backdrop.name.MARS_TRANSIT': 'Marstransit, tiefer Weltraum',
  'backdrop.fact.upToG': 'Bis zu {g} g',
  'backdrop.fact.poweredMin': '{n} min angetriebener Flug',
  'backdrop.fact.altitude': '{km} km Höhe',
  'backdrop.fact.weightless': 'Schwerelos',
  'backdrop.fact.dose': '{v} mSv/Tag',
  'backdrop.fact.gravity': '{g} g',
  'backdrop.fact.distance': '{km} km von der Erde',
  'backdrop.fact.delaySec': 'Verzögerung {s} s',
  'backdrop.fact.delayMin': 'Verzögerung {min} bis {max} min',
  'backdrop.label.ship': 'Schiff, Tag {day} von {total}',
  'backdrop.orbit': 'Umlauf {min} min',
  'backdrop.gauge': 'Spitze {g} g',
  'backdrop.gaugeTitle': 'Referenz-Spitzenlast des Aufstiegs aus dem zitierten Profil, kein Live-Wert.',
}
export default m
