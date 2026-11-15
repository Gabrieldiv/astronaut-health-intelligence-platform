// German: machine assisted translation, pending native review.
import type en from '../en/tour'

const m: Record<keyof typeof en, string> = {
  'tour.dialogAria': 'Geführte Demo, Schritt {n} von {total}: {title}',
  'tour.heading': 'Geführte Demo',
  'tour.autoPause': 'Automatische Wiedergabe anhalten',
  'tour.autoStart': 'Automatische Wiedergabe: geht alle paar Sekunden weiter',
  'tour.auto': 'Auto',
  'tour.exit': 'Demo beenden (Esc)',
  'tour.stepsAria': 'Demo-Schritte',
  'tour.stepAria': 'Schritt {n}: {title}',
  'tour.back': 'Zurück',
  'tour.finish': 'Fertig',
  'tour.next': 'Weiter',
  'tour.keysHint': '{left}{right} zum Blättern, {esc} zum Beenden. Beim Beenden wird ein normaler Tag wiederhergestellt.',
  'tour.step.crew.title': 'Die Crew',
  'tour.step.crew.caption': 'Vier Astronautinnen und Astronauten, jeweils mit ihrem eigenen Normalbereich verglichen. Jede Karte sagt in einfachen Worten, wie es der Person geht: Alles gut, Im Blick behalten, Bald handeln oder Jetzt handeln.',
  'tour.step.body.title': 'Der Körper auf einen Blick',
  'tour.step.body.caption':
    'Die 3D-Anatomie ist mit den Live-Daten verknüpft. Organe, die Aufmerksamkeit brauchen, leuchten in der Farbe ihres Status. Das Herz schlägt mit der Live-Herzfrequenz, die Lunge atmet mit der Live-Atemfrequenz.',
  'tour.step.body.hint': 'Klicken Sie auf eine beliebige Struktur: Das Panel zeigt ihre Daten oder sagt, dass sie nur zur Orientierung gezeigt wird.',
  'tour.step.acute.title': 'Akutes Herz-Kreislauf-Ereignis',
  'tour.step.acute.caption': 'ORIONs Herzfrequenz springt nach oben, während der Blutsauerstoff fällt. Innerhalb weniger simulierter Minuten erscheint ein CRITICAL-Banner, das eskaliert, wenn niemand es bestätigt.',
  'tour.step.actions.title': 'Was zu tun ist und wer es tun kann',
  'tour.step.actions.caption':
    'Jede Maßnahme sagt, warum, und ob die Crew jetzt an Bord handeln kann oder den Flugarzt braucht. Als erledigt markieren schreibt sie ins Prüfprotokoll, und die Simulation zeigt eine hypothetische Erholung.',
  'tour.step.actions.hint': 'Markieren Sie das Ruheprotokoll testweise als erledigt.',
  'tour.step.comms.title': 'Weit weg von der Erde',
  'tour.step.comms.caption': 'Stellen Sie sich dieselbe Crew in der Nähe des Mars vor, 22 Minuten pro Richtung entfernt. Jede Antwort von der Erde dauert mindestens 44 Minuten, deshalb stellt AHI Schritte an Bord an erste Stelle und zeigt die Wartezeit.',
  'tour.step.fatigue.title': 'Langsame Veränderung: zunehmende Müdigkeit',
  'tour.step.fatigue.caption': 'Schnellvorlauf mit 1 Stunde pro Sekunde. LYRA schläft weniger und ihre Herzfrequenzvariabilität fällt unter ihren eigenen Normalbereich. Die Zeitleiste zeigt, wie sich der Status über Tage verändert.',
  'tour.step.normal.title': 'Ihr Normalbereich, kein Durchschnitt',
  'tour.step.normal.caption': 'Das schattierte Band ist LYRAs persönlicher Normalbereich. Markierungen im Diagramm zeigen Alarme, protokollierte Maßnahmen und Check-ins, der gestrichelte Kegel ist die Prognose.',
  'tour.step.normal.hint': 'Das (i) neben "Ihr Normalbereich" erklärt, wie er gelernt wurde.',
  'tour.step.whatif.title': 'Was, wenn sie dem Rat folgt?',
  'tour.step.whatif.caption': 'Vergleichen Sie die nächsten Stunden mit und ohne die Maßnahme nebeneinander. Es ist eine hypothetische Projektion, nie ein Versprechen einer klinischen Wirkung.',
  'tour.step.crewview.title': 'Crew-Ansicht: für die Person selbst',
  'tour.step.crewview.caption': 'Dieselben Daten für die Person, um die es geht: einfache Worte, die zwei wichtigsten Schritte, große Vitalwerte im Vergleich zum eigenen Normalbereich und ein täglicher 30-Sekunden-Check-in.',
  'tour.step.tools.title': 'Missionswerkzeuge',
  'tour.step.tools.caption':
    'Das Menü Werkzeuge enthält die Langzeitübersicht der Mission (Strahlungsbudget, Training, Schlaf), einen Übergabebericht für die nächste Schicht und die Herkunft jeder Zahl. Alle Daten hier sind simuliert und gekennzeichnet.',
}
export default m
