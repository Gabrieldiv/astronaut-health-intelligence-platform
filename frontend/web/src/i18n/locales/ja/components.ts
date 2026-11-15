// Japanese: machine assisted translation, pending native review.
import type en from '../en/components'

const m: Record<keyof typeof en, string> = {
  'components.riskScore': 'リスクスコア',
  'components.riskScoreAria': 'リスクスコア 100 中 {n}',

  'components.baseline.title': 'なぜこれが私の通常範囲？',
  'components.baseline.aria': 'なぜこれが私の通常範囲？ {label}',
  'components.baseline.yourNormal': 'あなたの通常の{label}',
  'components.baseline.range': '{low} から {high}',
  'components.baseline.learnedFrom': 'あなた自身の {n} 件の測定から学習: {window}。',
  'components.baseline.median': '中央があなたの典型的な値です（中央値 {median}）。幅は普段のばらつき（MAD {mad}）から決まります。一時的な急な変化に左右されにくい指標です。',
  'components.baseline.learning': 'あなたの通常範囲をまだ学習中です。十分なデータがそろうまで、この信号の状態は慎重に表示します。',
  'components.baseline.learningN': 'あなたの通常範囲をまだ学習中です（これまで {n} 件）。十分なデータがそろうまで、この信号の状態は慎重に表示します。',
  'components.baseline.compares': '状態は集団の平均ではなく、あなた自身と比べています。',
  'components.baseline.method': 'ベースラインの方法: {version}',

  'components.event.alert': 'アラート',
  'components.event.intervention': '記録された対応',
  'components.event.checkin': 'チェックイン',
  'components.chart.now': '現在',
  'components.chart.noHistory': 'まだ履歴がありません',
  'components.chart.aria': '直近 {n} 時間の{label}の推移',
  'components.chart.withForecast': '（予測あり）',
  'components.chart.eventsMarked': '、{n} 件のイベントを表示',
  'components.chart.yourNormal': 'あなたの通常範囲',
  'components.chart.forecast': '予測 {value}',
  'components.chart.eventsList': 'このグラフのイベント',
  'components.chart.eventAria': '{kind}、{time} UTC: {label}',
}
export default m
