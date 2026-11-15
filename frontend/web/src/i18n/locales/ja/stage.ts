// Japanese: machine assisted translation, pending native review.
import type en from '../en/stage'

const m: Record<keyof typeof en, string> = {
  'stage.building3d': '3D 人体モデルを準備中...',
  'stage.activity.SLEEP': '睡眠中',
  'stage.activity.REST': '休憩中',
  'stage.activity.WORK': '作業中',
  'stage.activity.EXERCISE': '運動中',
  'stage.activity.EVA': '船外活動中（EVA）',
  'stage.missionDay': 'ミッション {n}日目',
  'stage.waiting': 'データを待っています。',
  'stage.notMonitored': 'モニタリング対象外',
  'stage.selectedStructure': '選択中の構造：{name}。押すとシステム全体を選択します。',
  'stage.atlasCount': '（解剖アトラス内の構造 {n}個）',
  'stage.contextOnly': '参考表示のみ',
  'stage.bodySystems': '体のシステム：{list}',
  'stage.bodyOverview': '体の概要',
  'stage.ind.inRange': '{total}項目中{ok}項目が通常範囲内',
  'stage.ind.title': '健康指標：{name}',
  'stage.ind.explain': '各セグメントは、心拍数、睡眠、血中酸素などの測定指標を、平均的な人ではなく {name} 自身の通常範囲と比べたものです。',
  'stage.ind.summary': '{total}項目中{ok}項目が通常範囲内です',
  'stage.ind.environment': 'キャビン環境と放射線被ばく',
  'stage.ind.showOnBody': 'この体のシステムを体の上に表示',
  'stage.ind.missingNote': 'データのない指標は正常として数えません。',
  'stage.ind.open': 'これらの指標の内訳を開く',
  'stage.ind.noData': 'データなし {n}',
  'stage.ind.aria': '指標{total}件中{ok}件が通常範囲内、要注意{flagged}件、データなし{missing}件。',
}
export default m
