export default {
  chart: {
    dialog: { title: 'グラフの挿入', settings: '設定', data: 'データ', selectType: 'グラフの種類を選択', preview: 'グラフのプレビュー', config: 'グラフの設定', clear: 'クリア', cancel: 'キャンセル', confirm: 'OK' },
    category: { bar: '縦棒グラフ', line: '折れ線グラフ', pie: '円グラフ', scatter: '散布図', radar: 'レーダーチャート', mixed: '複合グラフ' },
    preview: { 'bar-basic': '基本の縦棒グラフ', 'bar-stacked': '積み上げ縦棒グラフ', 'bar-horizontal': '横棒グラフ', 'line-basic': '基本の折れ線グラフ', 'line-smooth': '平滑線グラフ', 'line-stacked': '積み上げ折れ線グラフ', 'line-area': '積み上げ面グラフ', 'line-step': '階段状の折れ線グラフ', 'line-dashed': '破線の折れ線グラフ', 'pie-basic': '基本の円グラフ', 'pie-doughnut': 'ドーナツグラフ', 'scatter-basic': '基本の散布図', 'radar-basic': '基本のレーダーチャート', 'radar-filled': '塗りつぶしレーダーチャート', 'mixed-line-bar': '折れ線と縦棒の複合グラフ' },
    config: { showTitle: 'タイトルを表示', title: 'タイトル', titlePlaceholder: 'グラフのタイトルを入力', titlePosition: 'タイトルの位置', showLegend: '凡例を表示', legendPosition: '凡例の位置', xAxisLabel: 'X 軸のタイトル', xAxisPlaceholder: 'X 軸のタイトルを入力', yAxisLabel: 'Y 軸のタイトル', yAxisPlaceholder: 'Y 軸のタイトルを入力', showGrid: '目盛線を表示', showDataLabel: 'データラベルを表示', colorScheme: '配色' },
    position: { left: '左', center: '中央', right: '右', top: '上', bottom: '下' },
    colorScheme: { default: '既定', warm: '暖色', cool: '寒色', nature: '自然色' },
    sample: { series: '系列{index}', category: '分類{index}' },
    noData: 'データがありません', data: 'データ'
  },
  view: {
    common: { cancel: 'キャンセル', confirm: 'OK', none: 'なし', leftAlign: '左揃え', rightAlign: '右揃え', center: '中央揃え', justify: '両端揃え', distribute: '均等割り付け', preview: 'プレビュー', color: '色', spacing: '間隔', points: 'pt' },
    paragraph: { format: '段落の書式', body: '本文', heading1: '見出し 1', heading2: '見出し 2', heading3: '見出し 3', heading4: '見出し 4', heading5: '見出し 5', heading6: '見出し 6', cut: '切り取り', copy: 'コピー', paste: '貼り付け', fontSettings: 'フォント...', advancedSettings: '段落の詳細設定', link: 'ハイパーリンク', comment: 'コメントの挿入' },
    hyperlink: {
      text: '表示文字', address: 'リンク先', addressPlaceholder: '完全なアドレスを入力してください（例: https://example.com）',
      textRequired: '表示文字を入力してください', addressRequired: 'リンク先のアドレスを入力してください',
      addressInvalid: 'リンク先は http、https、mailto、tel、ftp のいずれかのプロトコルを使用する必要があります',
      unsupported: 'リンクは挿入されませんでした。具体的な原因を取得できません。文字を選択し直して再試行してください。文書は変更されていません。',
      bookmarkSelection: '選択範囲にブックマークの境界が含まれています。このエディターでは境界をまたぐリンクの挿入にまだ対応していません。境界を避けて選択してください。文字とブックマークは変更されていません。',
      fieldSelection: '選択範囲に目次やページ番号などの Word フィールドが含まれています。フィールド以外の通常の文字を選択してください。文書は変更されていません。',
      existingLink: '選択範囲に既存のリンクが含まれています。リンクの入れ子や置き換えにはまだ対応していません。リンクのない文字を選択してください。文書は変更されていません。',
      crossContainer: '選択範囲が複数の段落やセルなどにまたがっています。同じ段落内の文字を選択してください。文書は変更されていません。',
      crossParagraph: '選択範囲に改行または段落の終端が含まれています。同じ段落内で改行を含まない文字を選択してください。文書は変更されていません。',
      revisions: '選択範囲に未処理の変更履歴が含まれています。確認して承諾または元に戻すか、変更履歴のない文字を選択してください。文書は変更されていません。',
      tracking: '変更履歴の記録が有効です。このモードではリンクの挿入にまだ対応していません。記録を無効にして再試行してください。文書は変更されていません。',
      readOnly: '文書は読み取り専用です。編集可能なモードに切り替えてください。文書は変更されていません。',
      disabled: '編集機能が無効です。編集を有効にして再試行してください。文書は変更されていません。',
      noSelection: 'カーソル位置または文字の選択範囲がありません。ダイアログを閉じ、本文にカーソルを置くか文字を選択してください。文書は変更されていません。',
      invalidSelection: '文字の選択範囲が無効になりました。ダイアログを閉じ、文字を選択し直してください。文書は変更されていません。',
      nonText: '選択範囲に画像や表などが含まれています。通常の文字のみを選択してください。文書は変更されていません。',
      invalidText: '表示文字は空でない通常の文字列にしてください。改行や非表示の制御マーカーは使用できません。表示文字を修正してください。文書は変更されていません。'
    },
    table: { insert: '挿入', insertLeft: '左に挿入', insertRight: '右に挿入', insertAbove: '上に挿入', insertBelow: '下に挿入', columnUnit: '列', rowUnit: '行', insertCell: 'セル(E)...', splitCell: 'セルの分割', mergeCell: 'セルの結合', delete: '削除', deleteRow: '行の削除', deleteColumn: '列の削除', deleteTable: '表全体の削除', selectAll: '表全体を選択', horizontalAlign: '水平方向の配置', centerAlign: '中央揃え', verticalAlign: '垂直方向の配置', alignTop: '上揃え', alignMiddle: '上下中央揃え', alignBottom: '下揃え', background: '網掛けの色', repeatHeader: 'タイトル行の繰り返し', properties: '表のプロパティ', select: '表を選択', addColumn: '列の追加', addRow: '行の追加' },
    font: { title: 'フォント', characterSpacing: '文字間隔', cjkFont: '中国語用フォント', style: 'スタイル', regular: '標準', italic: '斜体', bold: '太字', boldItalic: '太字斜体', size: 'サイズ', effects: '文字飾り', strikethrough: '取り消し線', underline: '下線', superscript: '上付き', subscript: '下付き', doubleStrikethrough: '二重取り消し線', hidden: '隠し文字', previewText: 'フォントのプレビュー ABCabc 123', scale: '倍率', standard: '標準', expanded: '広く', condensed: '狭く', position: '位置', raised: '上げる', lowered: '下げる', spacingPreview: '文字間隔のプレビュー ABCabc 123', unsupported: '文字間隔と位置は今後のバージョンで対応予定です' },
    paragraphDialog: { title: '段落', indentSpacing: 'インデントと行間隔', linePageBreak: '改ページと改行', cjkLayout: '体裁', general: '全般', alignment: '配置', outline: 'アウトライン レベル', bodyText: '本文', level1: 'レベル 1', level2: 'レベル 2', level3: 'レベル 3', level4: 'レベル 4', level5: 'レベル 5', level6: 'レベル 6', indent: 'インデント', beforeText: '左', afterText: '右', special: '最初の行', firstLine: '字下げ', hanging: 'ぶら下げ', measure: '幅', cm: 'cm', adjustRightIndent: '文書グリッドを定義した場合は右インデントを自動調整する', before: '段落前', after: '段落後', lineSpacing: '行間', single: '1 行', oneHalf: '1.5 行', double: '2 行', atLeast: '最小値', exact: '固定値', multiple: '倍数', setting: '間隔', times: '倍', alignGrid: '文書グリッドを定義した場合はグリッド線に合わせる', previewText: '段落のプレビュー', pagination: '改ページ', widow: '改ページ時 1 行残して段落を区切らない', keepNext: '次の段落と分離しない', breakBefore: '段落前で改ページする', lineBreak: '改行', noLineNumber: '行番号を表示しない', noHyphen: 'ハイフネーションしない', unsupported: 'この機能は今後のバージョンで対応予定です', cjkWrap: '中国語の改行規則を使用する', punctuationOverflow: '句読点のぶら下げを許可する', wordBreak: '欧文を単語の途中で改行する', compressPunctuation: '行頭の句読点を詰める', cjkWesternSpacing: '中国語と欧文の間隔を自動調整する', cjkNumberSpacing: '中国語と数字の間隔を自動調整する', textAlignment: '文字の配置', align: '配置', auto: '自動', baseline: 'ベースラインに揃える' },
    tableDialog: { categories: 'プロパティの種類', table: '表', cell: 'セル', presetHint: 'プリセットを適用すると表全体の罫線構成が置き換わり、選択されていない辺の罫線は消去されます。', border: '罫線', preset: 'プリセット', unchanged: '変更しない', allBorders: 'すべての罫線', outsideBorders: '外枠', noBorders: '罫線なし', insideBorders: '内側の罫線', insideHorizontal: '内側の横線', insideVertical: '内側の縦線', topBorder: '上の罫線', bottomBorder: '下の罫線', leftBorder: '左の罫線', rightBorder: '右の罫線', borderPresets: '罫線のプリセット', all: 'すべて', outside: '外側', inside: '内側', colorFormatTitle: '色を #RRGGBB 形式で入力してください', colorFormatClearTitle: '色を #RRGGBB 形式で入力してください。空欄にすると消去します', borderColor: '罫線の色', cellColor: 'セルの背景色', chooseColor: '{label}を選択（現在：{state}）', innerWidth: '内側の罫線の幅', outerWidth: '外枠の幅', innerWidthAria: '内側の罫線の幅（ピクセル）', outerWidthAria: '外枠の幅（ピクセル）', colorHelp: '色の形式：#RRGGBB。空欄の場合は変更しません。', borderPreview: '罫線のプレビュー', presetPreview: '罫線構成のプレビュー。破線は表の範囲のみを示します。未入力の色と幅は変更しません。', unchangedPreview: 'プリセットが選択されていないため、罫線構成は変更しません。プレビューは混在するスタイルを表しません。', cellHint: '以下の設定は現在のセル（右クリックしたセル）にのみ適用されます。', fill: '塗りつぶし', noFill: '塗りつぶしなし', invalidColor: '色の形式が正しくありません', clearFill: '塗りつぶしをクリア', fillHelp: '色の形式：#RRGGBB。空欄の場合は塗りつぶしなしです。', verticalAlign: '垂直方向の配置', alignCenter: '中央揃え' },
    pageNumber: { header: 'ヘッダー', footer: 'フッター', insert: 'ページ番号の挿入', style: 'スタイル:', position: '位置:', left: '左', center: '中央', right: '右', stylePage: '1 ページ', styleTotal: '1 / x ページ', styleFirst: '最初のページ', styleFirstTotal: '最初のページ / 全 X ページ' },
    fontFamily: { SimSun: 'SimSun（宋体）', SimHei: 'SimHei（黒体）', KaiTi: 'KaiTi（楷体）', FangSong: 'FangSong（仿宋）', MicrosoftYaHei: 'Microsoft YaHei', DengXian: 'DengXian', STSong: 'STSong', STHeiti: 'STHeiti', STKaiti: 'STKaiti', STFangsong: 'STFangsong', STZhongsong: 'STZhongsong', STXihei: 'STXihei', STXingkai: 'STXingkai', STLiti: 'STLiti', STXinwei: 'STXinwei', STCaiyun: 'STCaiyun' },
    fontSize: { chuhao: '初号（42 pt）', xiaochu: '小初（36 pt）', yihao: '一号（26 pt）', xiaoyi: '小一（24 pt）', erhao: '二号（22 pt）', xiaoer: '小二（18 pt）', sanhao: '三号（16 pt）', xiaosan: '小三（15 pt）', sihao: '四号（14 pt）', xiaosi: '小四（12 pt）', wuhao: '五号（10.5 pt）', xiaowu: '小五（9 pt）', liuhao: '六号（7.5 pt）', xiaoliu: '小六（6.5 pt）', qihao: '七号（5.5 pt）', bahao: '八号（5 pt）' }
  },
  comment: {
    balloon: { edit: 'コメントを編集', delete: 'コメントを削除', resolve: 'コメントを解決済みにする', reopen: 'コメントを再開', placeholder: 'コメントを入力してください...', save: '保存', cancel: 'キャンセル', source: '引用元：', addReply: '返信を追加', replyPlaceholder: '返信を入力...', reply: '返信' },
    revision: { unknownAuthor: '不明', accept: '変更を採用', reject: '変更を却下', insert: '挿入：', delete: '削除：', format: '書式：', bold: '太字', italic: '斜体', underline: '下線', strikeout: '取り消し線', doubleStrikeout: '二重取り消し線', hidden: '隠し文字', superscript: '上付き', subscript: '下付き', color: 'フォントの色', size: 'フォントサイズ', font: 'フォント', highlight: '蛍光ペン', characterScale: '文字の拡大縮小', letterSpacing: '文字間隔', textDecoration: '文字飾りのスタイル', rowFlex: '配置', lineHeight: '行間', lineHeightRule: '行間の規則', rowMargin: '行の間隔', paragraphIndentLeft: '左インデント', paragraphIndentRight: '右インデント', paragraphFirstLineIndent: '先頭行インデント', indentHanging: 'ぶら下げインデント', paragraphSpacingBefore: '段落前の間隔', paragraphSpacingAfter: '段落後の間隔', alignLeft: '左揃え', alignCenter: '中央揃え', alignRight: '右揃え', alignJustify: '両端揃え', alignDistribute: '均等割り付け', undo: 'キャンセル', default: '既定', property: '{label}：{value}', formatDescription: '書式を設定：{details}', setFormat: '書式を設定', separator: '、', descriptionSeparator: '；' }
  }
}
