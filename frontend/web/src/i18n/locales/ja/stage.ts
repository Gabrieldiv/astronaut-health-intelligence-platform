// Japanese: machine assisted translation, pending native review.
import type en from '../en/stage'

const m: Record<keyof typeof en, string> = {
  'stage.building3d': '3D 人体モデルを準備中...',
  'stage.activity.SLEEP': '睡眠中',
  'stage.activity.REST': '休憩中',
  'stage.activity.WORK': '作業中',
  'stage.activity.EXERCISE': '運動中',
  'stage.activity.EVA': '船外活動中（EVA）',
  'stage.missionDay': 'ミッション {n} 日目',
  'stage.waiting': 'データを待っています。',
  'stage.notMonitored': '監視対象外',
  'stage.selectedStructure': ' 選択中の構造: {name}。押すとシステム全体を選択します。',
  'stage.atlasCount': '（解剖アトラス内の構造 {n} 個）',
  'stage.contextOnly': '参考表示のみ',
  'stage.bodySystems': '体のシステム: {list}',
  'stage.bodyOverview': '体の概要',
}
export default m
