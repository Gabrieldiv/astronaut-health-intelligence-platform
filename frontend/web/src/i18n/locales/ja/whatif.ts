// Japanese: machine assisted translation, pending native review.
import type en from '../en/whatif'

const m: Record<keyof typeof en, string> = {
  'whatif.now': '現在',
  'whatif.hAgo': '{n} 時間前',
  'whatif.hAhead': '+{n} 時間',
  'whatif.chartAria': '{metric}: 今後 {n} 時間の、アクションあり・なしの予測推移',
  'whatif.personalNormal': '本人のふだんの範囲',
  'whatif.recent': '直近',
  'whatif.without': 'アクションなし',
  'whatif.with': 'アクションあり',
  'whatif.recorded': '記録値 {value} {unit}',
  'whatif.recentReadings': '直近の測定値',
  'whatif.cabin': '船内',
  'whatif.title': 'もしも: {action}',
  'whatif.subtitleMetric': ' · {metric}、今後 {n} 時間',
  'whatif.simulated': 'シミュレーション',
  'whatif.footer': '判断支援のみです。診断ではありません。クルーの医療担当者と相談してください。',
  'whatif.recompute': '現在から再計算',
  'whatif.disclaimer': '話し合いのためのシミュレーションです。臨床効果の根拠ではありません。',
  'whatif.noneTitle': 'このアクションの比較はありません',
  'whatif.noneBody':
    '現在、{callsign} のアクションあり・なしの推移を予測できませんでした。直近のデータがない場合や、アクションの効果がモデル化されていない場合に起こります。推奨そのものは引き続き有効です。',
  'whatif.inHours': '{n} 時間後',
  'whatif.normalRange': '本人のふだんの範囲: {low} から {high} {unit}。',
  'whatif.assumptions': '前提条件',
  'whatif.noAssumptions': 'シミュレーターが示した前提条件はありません。',
  'whatif.compareAria': 'あり・なしを比較: {title}',
  'whatif.compareTitle': 'このアクションを行った場合と行わない場合の予測推移を比較 (シミュレーション)',
  'whatif.compare': '比較',
}
export default m
