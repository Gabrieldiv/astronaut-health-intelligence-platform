// Japanese: machine assisted translation, pending native review.
import type en from '../en/backdrop'

const m: Record<keyof typeof en, string> = {
  'backdrop.hudOpen': 'ミッション状況: このプロファイルで変わることを開く',
  'backdrop.name.LAUNCH': '打ち上げと上昇',
  'backdrop.name.ISS': 'ISS、地球低軌道',
  'backdrop.name.MOON': '月、アルテミス級',
  'backdrop.name.MARS_TRANSIT': '火星への航行、深宇宙',
  'backdrop.fact.upToG': '最大 {g} g',
  'backdrop.fact.poweredMin': '動力飛行 {n} 分',
  'backdrop.fact.altitude': '高度 {km} km',
  'backdrop.fact.weightless': '無重力',
  'backdrop.fact.dose': '{v} mSv/日',
  'backdrop.fact.gravity': '{g} g',
  'backdrop.fact.distance': '地球から {km} km',
  'backdrop.fact.delaySec': '遅延 {s} 秒',
  'backdrop.fact.delayMin': '遅延 {min} から {max} 分',
  'backdrop.label.ship': '宇宙船、{total} 日中 {day} 日目',
  'backdrop.orbit': '軌道 {min} 分',
  'backdrop.gauge': '最大 {g} g',
  'backdrop.gaugeTitle': '引用したプロファイルによる上昇時の参考最大荷重です。リアルタイムの値ではありません。',
}
export default m
