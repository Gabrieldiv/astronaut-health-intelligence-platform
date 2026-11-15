// Japanese: machine assisted translation, pending native review.
import type en from '../en/tour'

const m: Record<keyof typeof en, string> = {
  'tour.dialogAria': 'ガイド付きデモ、ステップ {n} / {total}: {title}',
  'tour.heading': 'ガイド付きデモ',
  'tour.autoPause': '自動再生を一時停止',
  'tour.autoStart': '自動再生: 数秒ごとに次へ進みます',
  'tour.auto': '自動',
  'tour.exit': 'デモを終了 (Esc)',
  'tour.stepsAria': 'デモのステップ',
  'tour.stepAria': 'ステップ {n}: {title}',
  'tour.back': '戻る',
  'tour.finish': '終了',
  'tour.next': '次へ',
  'tour.keysHint': '{left}{right} で移動、{esc} で終了。終了すると通常の一日に戻ります。',
  'tour.step.crew.title': 'クルーの紹介',
  'tour.step.crew.caption': '4 人の宇宙飛行士を、それぞれ本人のふだんの状態と比べます。各カードは、その人の様子を「問題なし」「様子を見る」「早めに対応」「すぐ対応」のわかりやすい言葉で示します。',
  'tour.step.body.title': '体をひと目で',
  'tour.step.body.caption':
    '3D の人体はライブデータと連動しています。注意が必要な臓器はその状態の色で光ります。心臓はリアルタイムの心拍数で拍動し、肺はリアルタイムの呼吸数で呼吸します。',
  'tour.step.body.hint': '任意の部位をクリックしてください。パネルにそのデータが表示されるか、参考表示のみであることが示されます。',
  'tour.step.acute.title': '急性の心血管イベント',
  'tour.step.acute.caption': 'ORION の心拍数が急上昇し、血中酸素が低下します。シミュレーション上の数分で CRITICAL バナーが表示され、誰も確認しなければ段階的に強まります。',
  'tour.step.actions.title': '何をするか、誰ができるか',
  'tour.step.actions.caption':
    '各アクションには理由と、クルーが今すぐ船内で対応できるか、フライトサージャンが必要かが示されます。「完了にする」で監査記録に残り、シミュレーションが仮想の回復を表示します。',
  'tour.step.actions.hint': '休息プロトコルで「完了にする」を試してみてください。',
  'tour.step.comms.title': '地球から遠く離れて',
  'tour.step.comms.caption': '同じクルーが火星の近く、片道 22 分の場所にいると想像してください。地球からの返答には少なくとも 44 分かかるため、AHI は船内での対応を優先し、待ち時間を表示します。',
  'tour.step.fatigue.title': 'ゆっくりした変化: 進行する疲労',
  'tour.step.fatigue.caption': '1 秒あたり 1 時間で早送りします。LYRA の睡眠が減り、心拍変動が本人のふだんの範囲を下回ります。タイムラインには数日かけて変わる状態が表示されます。',
  'tour.step.normal.title': '平均ではなく、本人のふだん',
  'tour.step.normal.caption': '網掛けの帯は LYRA 個人のふだんの範囲です。グラフ上のマーカーはアラート、記録されたアクション、チェックインを示し、破線の円錐は予測です。',
  'tour.step.normal.hint': '「あなたのふだん」の横の (i) で、どのように学習したかを確認できます。',
  'tour.step.whatif.title': 'アドバイスに従ったら?',
  'tour.step.whatif.caption': 'アクションを行った場合と行わない場合の今後数時間を並べて比較します。仮想の予測であり、臨床効果を約束するものではありません。',
  'tour.step.crewview.title': 'クルービュー: 宇宙飛行士本人向け',
  'tour.step.crewview.caption': '同じデータを本人向けに表示します。わかりやすい言葉、優先すべき 2 つの行動、本人のふだんと比べた大きなバイタル表示、そして 30 秒の毎日のチェックインです。',
  'tour.step.tools.title': 'ミッションツール',
  'tour.step.tools.caption':
    'ツールメニューには、長期のミッション概要 (放射線量の予算、運動、睡眠)、次のシフトへの引き継ぎレポート、各数値の出どころがあります。ここのデータはすべてシミュレーションで、そのように表示されています。',
}
export default m
