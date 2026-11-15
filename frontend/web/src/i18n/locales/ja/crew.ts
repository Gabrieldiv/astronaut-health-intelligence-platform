// Japanese: machine assisted translation, pending native review.
import type en from '../en/crew'

const m: Record<keyof typeof en, string> = {
  'crew.title': 'クルー',
  'crew.noData': 'データなし',
  'crew.cardAria': '{callsign}、{role}。状態: {status}',
  'crew.cardAriaLost': '{callsign}、{role}。状態: {status}、信号なし',
  'crew.cardTitle': '{callsign}、{role}（キー {key}）',
  'crew.trendTitle': '心拍数、直近6時間',
}
export default m
