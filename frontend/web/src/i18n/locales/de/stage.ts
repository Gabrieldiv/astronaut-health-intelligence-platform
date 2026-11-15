// German: machine assisted translation, pending native review.
import type en from '../en/stage'

const m: Record<keyof typeof en, string> = {
  'stage.building3d': '3D-Anatomie wird aufgebaut...',
  'stage.activity.SLEEP': 'Schläft',
  'stage.activity.REST': 'Ruht',
  'stage.activity.WORK': 'Arbeitet',
  'stage.activity.EXERCISE': 'Trainiert',
  'stage.activity.EVA': 'Im Außeneinsatz (EVA)',
  'stage.missionDay': 'Missionstag {n}',
  'stage.waiting': 'Warte auf Daten.',
  'stage.notMonitored': 'Nicht überwacht',
  'stage.selectedStructure': ' Ausgewählte Struktur: {name}. Drücken, um das ganze System auszuwählen.',
  'stage.atlasCount': ' ({n} Strukturen im Anatomieatlas)',
  'stage.contextOnly': 'Nur Kontext',
  'stage.bodySystems': 'Körpersysteme: {list}',
  'stage.bodyOverview': 'Körperübersicht',
  'stage.ind.inRange': '{ok}/{total} im Normalbereich',
  'stage.ind.noData': '{n} ohne Daten',
  'stage.ind.aria': '{ok} von {total} Werten in deinem Normalbereich, {flagged} auffällig, {missing} ohne Daten.',
}
export default m
