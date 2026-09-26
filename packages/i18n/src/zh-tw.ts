export default {
  chart: {
    dialog: { title: '插入圖表', settings: '設定', data: '資料', selectType: '選擇圖表類型', preview: '圖表預覽', config: '圖表設定', clear: '清除', cancel: '取消', confirm: '確定' },
    category: { bar: '直條圖', line: '折線圖', pie: '圓餅圖', scatter: '散佈圖', radar: '雷達圖', mixed: '組合圖' },
    preview: { 'bar-basic': '基本直條圖', 'bar-stacked': '堆疊直條圖', 'bar-horizontal': '橫條圖', 'line-basic': '基本折線圖', 'line-smooth': '平滑折線圖', 'line-stacked': '堆疊折線圖', 'line-area': '堆疊區域圖', 'line-step': '階梯折線圖', 'line-dashed': '虛線折線圖', 'pie-basic': '基本圓餅圖', 'pie-doughnut': '環圈圖', 'scatter-basic': '基本散佈圖', 'radar-basic': '基本雷達圖', 'radar-filled': '填滿雷達圖', 'mixed-line-bar': '折線直條組合圖' },
    config: { showTitle: '顯示標題', title: '標題名稱', titlePlaceholder: '請輸入圖表標題', titlePosition: '標題位置', showLegend: '顯示圖例', legendPosition: '圖例位置', xAxisLabel: 'X 軸標題', xAxisPlaceholder: '請輸入 X 軸標題', yAxisLabel: 'Y 軸標題', yAxisPlaceholder: '請輸入 Y 軸標題', showGrid: '顯示格線', showDataLabel: '顯示資料標籤', colorScheme: '配色方案' },
    position: { left: '左', center: '中', right: '右', top: '上', bottom: '下' },
    colorScheme: { default: '預設', warm: '暖色調', cool: '冷色調', nature: '自然色' },
    sample: { series: '數列{index}', category: '類別{index}' },
    noData: '暫無資料', data: '資料'
  },
  view: {
    common: { cancel: '取消', confirm: '確定', none: '無', leftAlign: '靠左對齊', rightAlign: '靠右對齊', center: '置中', justify: '左右對齊', distribute: '分散對齊', preview: '預覽', color: '顏色', spacing: '間距', points: '點' },
    paragraph: { format: '段落格式', body: '內文', heading1: '標題 1', heading2: '標題 2', heading3: '標題 3', heading4: '標題 4', heading5: '標題 5', heading6: '標題 6', cut: '剪下', copy: '複製', paste: '貼上', fontSettings: '字型...', advancedSettings: '進階段落設定', link: '超連結', comment: '插入批註' },
    hyperlink: {
      text: '顯示文字', address: '連結位址', addressPlaceholder: '請輸入完整位址（例如 https://example.com）',
      textRequired: '請輸入顯示文字', addressRequired: '請輸入連結位址',
      addressInvalid: '連結位址必須使用 http、https、mailto、tel 或 ftp 通訊協定',
      unsupported: '未插入超連結，無法取得具體原因。請重新選取文字後重試，文件未修改。',
      bookmarkSelection: '選取範圍包含書籤標記，目前編輯器尚不支援跨書籤插入超連結。請調整選取範圍以避開書籤邊界；原文和書籤均未修改。',
      fieldSelection: '選取範圍包含 Word 功能變數標記（如目錄或頁碼）。請選取功能變數以外的一般文字，文件未修改。',
      existingLink: '選取範圍包含現有超連結，目前尚不支援巢狀或取代連結。請選取尚未加入連結的文字，文件未修改。',
      crossContainer: '選取範圍跨越不同文字容器（如段落或儲存格）。請在同一段落內選取文字，文件未修改。',
      crossParagraph: '選取範圍包含換行或段落結束標記。請選取同一段落內不含換行的文字，文件未修改。',
      revisions: '選取範圍包含尚未處理的修訂。請先檢閱並接受或拒絕相關修訂，或選取不含修訂的文字，文件未修改。',
      tracking: '目前已開啟追蹤修訂，尚不支援插入超連結。請關閉追蹤修訂後重試，文件未修改。',
      readOnly: '文件處於唯讀模式。請切換至可編輯模式後重試，文件未修改。',
      disabled: '編輯功能已停用。請啟用編輯後重試，文件未修改。',
      noSelection: '找不到游標位置或文字選取範圍。請關閉對話方塊，在內文中放置游標或選取文字後重試，文件未修改。',
      invalidSelection: '文字選取範圍已失效。請關閉對話方塊並重新選取文字，文件未修改。',
      nonText: '選取範圍包含圖片、表格等非一般文字內容。請只選取一般文字，文件未修改。',
      invalidText: '顯示文字必須為非空的一般文字，且不能包含換行或隱藏控制標記。請修改顯示文字後重試，文件未修改。'
    },
    table: { insert: '插入', insertLeft: '在左側插入', insertRight: '在右側插入', insertAbove: '在上方插入', insertBelow: '在下方插入', columnUnit: '欄', rowUnit: '列', insertCell: '儲存格(E)...', splitCell: '分割儲存格', mergeCell: '合併儲存格', delete: '刪除', deleteRow: '刪除列', deleteColumn: '刪除欄', deleteTable: '刪除整個表格', selectAll: '選取整個表格', horizontalAlign: '水平對齊方式', centerAlign: '置中對齊', verticalAlign: '垂直對齊方式', alignTop: '靠上對齊', alignMiddle: '垂直置中', alignBottom: '靠下對齊', background: '網底顏色', repeatHeader: '重複標題列', properties: '表格屬性', select: '選取表格', addColumn: '新增欄', addRow: '新增列' },
    font: { title: '字型', characterSpacing: '字元間距', cjkFont: '中文字型', style: '字型樣式', regular: '標準', italic: '斜體', bold: '粗體', boldItalic: '粗斜體', size: '字級', effects: '效果', strikethrough: '刪除線', underline: '底線', superscript: '上標', subscript: '下標', doubleStrikethrough: '雙刪除線', hidden: '隱藏', previewText: '字型預覽文字 ABCabc 123', scale: '縮放', standard: '標準', expanded: '加寬', condensed: '緊縮', position: '位置', raised: '提高', lowered: '降低', spacingPreview: '字元間距預覽 ABCabc 123', unsupported: '間距與位置功能將於後續版本支援' },
    paragraphDialog: { title: '段落', indentSpacing: '縮排與間距', linePageBreak: '分行與分頁', cjkLayout: '中文排版', general: '一般', alignment: '對齊方式', outline: '大綱階層', bodyText: '內文', level1: '第 1 級', level2: '第 2 級', level3: '第 3 級', level4: '第 4 級', level5: '第 5 級', level6: '第 6 級', indent: '縮排', beforeText: '文字之前', afterText: '文字之後', special: '特殊格式', firstLine: '第一行', hanging: '凸排', measure: '位移量', cm: '公分', adjustRightIndent: '若已定義文件格線，自動調整右側縮排', before: '段落前', after: '段落後', lineSpacing: '行距', single: '單行間距', oneHalf: '1.5 倍行高', double: '雙行間距', atLeast: '至少', exact: '固定行高', multiple: '多倍行高', setting: '設定值', times: '倍', alignGrid: '若已定義文件格線，則貼齊格線', previewText: '段落預覽文字', pagination: '分頁', widow: '孤行控制', keepNext: '與下段同頁', breakBefore: '段落前分頁', lineBreak: '分行', noLineNumber: '取消行號', noHyphen: '不要斷字', unsupported: '此功能將於後續版本支援', cjkWrap: '依中文習慣換行', punctuationOverflow: '允許標點符號超出邊界', wordBreak: '允許西文在單字中間換行', compressPunctuation: '允許壓縮行首標點符號', cjkWesternSpacing: '自動調整中文與西文之間的間距', cjkNumberSpacing: '自動調整中文與數字之間的間距', textAlignment: '文字對齊方式', align: '對齊', auto: '自動', baseline: '基準線對齊' },
    tableDialog: { categories: '屬性類別', table: '表格', cell: '儲存格', presetHint: '預設會取代整個表格的框線組合，未選取的框線將被清除。', border: '框線', preset: '預設', unchanged: '維持原狀', allBorders: '所有框線', outsideBorders: '外框線', noBorders: '無框線', insideBorders: '內框線', insideHorizontal: '內部水平線', insideVertical: '內部垂直線', topBorder: '上框線', bottomBorder: '下框線', leftBorder: '左框線', rightBorder: '右框線', borderPresets: '框線預設', all: '全部', outside: '外側', inside: '內側', colorFormatTitle: '請輸入 #RRGGBB 格式的顏色', colorFormatClearTitle: '請輸入 #RRGGBB 格式的顏色；留白可清除', borderColor: '框線顏色', cellColor: '儲存格底色', chooseColor: '選擇{label}（目前為{state}）', innerWidth: '內框線寬度', outerWidth: '外框線寬度', innerWidthAria: '內框線寬度（像素）', outerWidthAria: '外框線寬度（像素）', colorHelp: '顏色格式：#RRGGBB；留白則維持原狀。', borderPreview: '框線預覽', presetPreview: '框線組合預覽；虛線僅標示表格範圍。未指定的顏色及寬度維持原狀。', unchangedPreview: '未選取預設，框線組合維持原狀；預覽不代表混合樣式。', cellHint: '以下設定僅套用至目前的儲存格（按右鍵的儲存格）。', fill: '底色', noFill: '無底色', invalidColor: '顏色格式無效', clearFill: '清除底色', fillHelp: '顏色格式：#RRGGBB；留白表示無底色。', verticalAlign: '垂直對齊', alignCenter: '置中對齊' },
    pageNumber: { header: '頁首', footer: '頁尾', insert: '插入頁碼', style: '樣式：', position: '位置：', left: '左側', center: '置中', right: '右側', stylePage: '第 1 頁', styleTotal: '第 1 頁，共 x 頁', styleFirst: '第一頁', styleFirstTotal: '第一頁，共 X 頁' },
    fontFamily: { SimSun: '宋體', SimHei: '黑體', KaiTi: '楷體', FangSong: '仿宋', MicrosoftYaHei: '微軟雅黑', DengXian: '等線', STSong: '華文宋體', STHeiti: '華文黑體', STKaiti: '華文楷體', STFangsong: '華文仿宋', STZhongsong: '華文中宋', STXihei: '華文細黑', STXingkai: '華文行楷', STLiti: '華文隸書', STXinwei: '華文新魏', STCaiyun: '華文彩雲' },
    fontSize: { chuhao: '初號', xiaochu: '小初', yihao: '一號', xiaoyi: '小一', erhao: '二號', xiaoer: '小二', sanhao: '三號', xiaosan: '小三', sihao: '四號', xiaosi: '小四', wuhao: '五號', xiaowu: '小五', liuhao: '六號', xiaoliu: '小六', qihao: '七號', bahao: '八號' }
  },
  comment: {
    balloon: { edit: '編輯批註', delete: '刪除批註', resolve: '解決批註', reopen: '重新開啟批註', placeholder: '請輸入批註內容...', save: '儲存', cancel: '取消', source: '取自：', addReply: '新增回覆', replyPlaceholder: '輸入回覆...', reply: '回覆' },
    revision: { unknownAuthor: '未知', accept: '接受修訂', reject: '拒絕修訂', insert: '插入：', delete: '刪除：', format: '格式：', bold: '粗體', italic: '斜體', underline: '底線', strikeout: '刪除線', doubleStrikeout: '雙刪除線', hidden: '隱藏', superscript: '上標', subscript: '下標', color: '字型顏色', size: '字級', font: '字型', highlight: '醒目提示', characterScale: '字元縮放', letterSpacing: '字元間距', textDecoration: '裝飾線樣式', rowFlex: '對齊方式', lineHeight: '行距', lineHeightRule: '行距規則', rowMargin: '行間距', paragraphIndentLeft: '左側縮排', paragraphIndentRight: '右側縮排', paragraphFirstLineIndent: '首行縮排', indentHanging: '凸排', paragraphSpacingBefore: '段前間距', paragraphSpacingAfter: '段後間距', alignLeft: '靠左對齊', alignCenter: '置中', alignRight: '靠右對齊', alignJustify: '左右對齊', alignDistribute: '分散對齊', undo: '取消', default: '預設', property: '{label}：{value}', formatDescription: '設定格式：{details}', setFormat: '設定格式', separator: '，', descriptionSeparator: '；' }
  }
}
