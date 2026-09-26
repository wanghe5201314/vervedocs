export default {
  chart: {
    dialog: { title: '插入图表', settings: '设置', data: '数据', selectType: '选择图表类型', preview: '图表预览', config: '图表配置', clear: '清空', cancel: '取消', confirm: '确定' },
    category: { bar: '柱形图', line: '折线图', pie: '饼图', scatter: '散点图', radar: '雷达图', mixed: '混合图表' },
    preview: { 'bar-basic': '基础柱状图', 'bar-stacked': '堆叠柱状图', 'bar-horizontal': '横向柱状图', 'line-basic': '基础折线图', 'line-smooth': '平滑折线图', 'line-stacked': '堆叠折线图', 'line-area': '堆叠面积图', 'line-step': '阶梯折线图', 'line-dashed': '虚线折线图', 'pie-basic': '基础饼图', 'pie-doughnut': '环形图', 'scatter-basic': '基础散点图', 'radar-basic': '基础雷达图', 'radar-filled': '填充雷达图', 'mixed-line-bar': '折柱混合' },
    config: { showTitle: '显示标题', title: '标题名称', titlePlaceholder: '请输入图表标题', titlePosition: '标题位置', showLegend: '显示图例', legendPosition: '图例位置', xAxisLabel: 'X轴标题', xAxisPlaceholder: '请输入X轴标题', yAxisLabel: 'Y轴标题', yAxisPlaceholder: '请输入Y轴标题', showGrid: '显示网格线', showDataLabel: '显示数据标签', colorScheme: '配色方案' },
    position: { left: '左', center: '中', right: '右', top: '上', bottom: '下' },
    colorScheme: { default: '默认', warm: '暖色调', cool: '冷色调', nature: '自然色' },
    sample: { series: '系列{index}', category: '类别{index}' },
    noData: '暂无数据', data: '数据'
  },
  view: {
    common: {
      cancel: '取消', confirm: '确定', none: '无', leftAlign: '左对齐', rightAlign: '右对齐',
      center: '居中', justify: '两端对齐', distribute: '分散对齐', preview: '预览',
      color: '颜色', spacing: '间距', points: '磅'
    },
    paragraph: {
      format: '段落格式', body: '正文', heading1: '一级标题', heading2: '二级标题',
      heading3: '三级标题', heading4: '四级标题', heading5: '五级标题', heading6: '六级标题',
      cut: '剪切', copy: '复制', paste: '粘贴', fontSettings: '字体...',
      advancedSettings: '段落高级设置', link: '超链接', comment: '插入批注'
    },
    hyperlink: {
      text: '显示文字', address: '链接地址',
      addressPlaceholder: '请输入完整地址（如 https://example.com）',
      textRequired: '请输入显示文字', addressRequired: '请输入链接地址',
      addressInvalid: '链接地址必须使用 http、https、mailto、tel 或 ftp 协议',
      unsupported: '超链接未插入，未能获取具体原因。请重新选择文字后重试，文档未修改。',
      bookmarkSelection: '选区包含书签标记，当前编辑器暂不支持跨书签插入超链接。请调整选区避开书签边界；原文和书签均未修改。',
      fieldSelection: '选区包含 Word 域标记（如目录或页码），暂不支持插入超链接。请选择域以外的普通文字，文档未修改。',
      existingLink: '选区包含已有超链接，当前暂不支持嵌套或替换链接。请选择尚未添加链接的文字，文档未修改。',
      crossContainer: '选区跨越不同文本容器（如段落或单元格）。请在同一段落内选择文字后重试，文档未修改。',
      crossParagraph: '选区包含换行或段落结束标记。请选择同一段落内不含换行的文字，文档未修改。',
      revisions: '选区包含尚未处理的修订。请先审阅并接受或拒绝相关修订，或选择不含修订的文字，文档未修改。',
      tracking: '当前已开启修订模式，暂不支持插入超链接。请关闭修订模式后重试，文档未修改。',
      readOnly: '文档处于只读模式，无法插入超链接。请切换到可编辑模式后重试，文档未修改。',
      disabled: '编辑功能已被禁用，无法插入超链接。请启用编辑后重试，文档未修改。',
      noSelection: '未找到光标位置或文字选区。请关闭弹窗，在正文中放置光标或选择文字后重试，文档未修改。',
      invalidSelection: '文字选区已失效。请关闭弹窗并重新选择文字后重试，文档未修改。',
      nonText: '选区包含图片、表格等非普通文本内容。请只选择普通文字，文档未修改。',
      invalidText: '显示文字必须为非空的普通文本，且不能包含换行或隐藏控制标记。请修改显示文字后重试，文档未修改。'
    },
    table: {
      insert: '插入', insertLeft: '在左侧插入', insertRight: '在右侧插入',
      insertAbove: '在上方插入', insertBelow: '在下方插入', columnUnit: '列', rowUnit: '行',
      insertCell: '单元格(E)...', splitCell: '拆分单元格', mergeCell: '合并单元格',
      delete: '删除', deleteRow: '删除行', deleteColumn: '删除列', deleteTable: '删除整个表格',
      selectAll: '全选表格', horizontalAlign: '水平对齐方式', centerAlign: '居中对齐',
      verticalAlign: '垂直对齐方式', alignTop: '顶端对齐', alignMiddle: '垂直居中',
      alignBottom: '底端对齐', background: '底纹颜色', repeatHeader: '重复表头行',
      properties: '表格属性', select: '选择表格', addColumn: '添加列', addRow: '添加行'
    },
    font: {
      title: '字体', characterSpacing: '字符间距', cjkFont: '中文字体', style: '字形',
      regular: '常规', italic: '倾斜', bold: '加粗', boldItalic: '加粗倾斜', size: '字号',
      effects: '效果', strikethrough: '删除线', underline: '下划线', superscript: '上标',
      subscript: '下标', doubleStrikethrough: '双删除线', hidden: '隐藏',
      previewText: '字体预览文本 ABCabc 123', scale: '缩放', standard: '标准',
      expanded: '加宽', condensed: '紧缩', position: '位置', raised: '提升', lowered: '降低',
      spacingPreview: '字符间距预览 ABCabc 123', unsupported: '间距与位置功能将在后续版本支持'
    },
    paragraphDialog: {
      title: '段落', indentSpacing: '缩进和间距', linePageBreak: '换行和分页',
      cjkLayout: '中文版式', general: '常规', alignment: '对齐方式', outline: '大纲级别',
      bodyText: '正文文本', level1: '1 级', level2: '2 级', level3: '3 级',
      level4: '4 级', level5: '5 级', level6: '6 级', indent: '缩进',
      beforeText: '文本之前', afterText: '文本之后', special: '特殊格式',
      firstLine: '首行缩进', hanging: '悬挂缩进', measure: '度量值', cm: '厘米',
      adjustRightIndent: '如果定义了文档网格，则自动调整右缩进', before: '段前', after: '段后',
      lineSpacing: '行距', single: '单倍行距', oneHalf: '1.5 倍行距', double: '双倍行距',
      atLeast: '最小值', exact: '固定值', multiple: '多倍行距', setting: '设置值', times: '倍',
      alignGrid: '如果定义了文档网格，则与网格对齐', previewText: '段落预览文本',
      pagination: '分页', widow: '孤行控制', keepNext: '与下段同页', breakBefore: '段前分页',
      lineBreak: '换行', noLineNumber: '取消行号', noHyphen: '取消断字',
      unsupported: '该功能将在后续版本支持', cjkWrap: '按中文习惯换行',
      punctuationOverflow: '允许标点溢出边界', wordBreak: '允许西文在单词中间换行',
      compressPunctuation: '允许行首标点压缩', cjkWesternSpacing: '自动调整中文与西文的间距',
      cjkNumberSpacing: '自动调整中文与数字的间距', textAlignment: '文字对齐方式',
      align: '对齐', auto: '自动', baseline: '基线对齐'
    },
    tableDialog: {
      categories: '属性类别', table: '表格', cell: '单元格',
      presetHint: '预设替换整个表格的边框组合，未选中的边将清除。', border: '边框',
      preset: '预设', unchanged: '保持原样', allBorders: '全部边框',
      outsideBorders: '外侧边框', noBorders: '无边框', insideBorders: '内部边框',
      insideHorizontal: '内部横线', insideVertical: '内部竖线', topBorder: '上边框',
      bottomBorder: '下边框', leftBorder: '左边框', rightBorder: '右边框',
      borderPresets: '边框预设', all: '全部', outside: '外侧', inside: '内部',
      colorFormatTitle: '请输入 #RRGGBB 格式的颜色',
      colorFormatClearTitle: '请输入 #RRGGBB 格式的颜色，留空清除',
      borderColor: '边框颜色', cellColor: '单元格底色', chooseColor: '选择{label}（当前{state}）',
      innerWidth: '内框宽度', outerWidth: '外框宽度', innerWidthAria: '内框宽度（像素）',
      outerWidthAria: '外框宽度（像素）', colorHelp: '颜色格式：#RRGGBB；留空保持原样。',
      borderPreview: '边框示意',
      presetPreview: '边框组合示意；虚线仅标示表格范围。未填写的颜色、宽度保持原样。',
      unchangedPreview: '未选择预设，边框组合保持原样；示意不代表混合样式。',
      cellHint: '以下设置仅应用于当前单元格（右键所在格）。', fill: '底色',
      noFill: '无底色', invalidColor: '颜色格式无效', clearFill: '清除底色',
      fillHelp: '颜色格式：#RRGGBB；留空表示无底色。', verticalAlign: '垂直对齐',
      alignCenter: '居中对齐'
    },
    pageNumber: {
      header: '页眉', footer: '页脚', insert: '插入页码', style: '样式:', position: '位置:',
      left: '左侧', center: '居中', right: '右侧', stylePage: '第1页',
      styleTotal: '第1页共x页', styleFirst: '第一页', styleFirstTotal: '第一页共X页'
    },
    fontFamily: {
      SimSun: '宋体', SimHei: '黑体', KaiTi: '楷体', FangSong: '仿宋',
      MicrosoftYaHei: '微软雅黑', DengXian: '等线', STSong: '华文宋体',
      STHeiti: '华文黑体', STKaiti: '华文楷体', STFangsong: '华文仿宋',
      STZhongsong: '华文中宋', STXihei: '华文细黑', STXingkai: '华文行楷',
      STLiti: '华文隶书', STXinwei: '华文新魏', STCaiyun: '华文彩云'
    },
    fontSize: {
      chuhao: '初号', xiaochu: '小初', yihao: '一号', xiaoyi: '小一',
      erhao: '二号', xiaoer: '小二', sanhao: '三号', xiaosan: '小三',
      sihao: '四号', xiaosi: '小四', wuhao: '五号', xiaowu: '小五',
      liuhao: '六号', xiaoliu: '小六', qihao: '七号', bahao: '八号'
    }
  },
  comment: {
    balloon: {
      edit: '编辑批注', delete: '删除批注', resolve: '解决批注', reopen: '重新打开批注',
      placeholder: '请输入批注内容...', save: '保存', cancel: '取消', source: '取自：',
      addReply: '添加回复', replyPlaceholder: '输入回复...', reply: '回复'
    },
    revision: {
      unknownAuthor: '未知', accept: '接受修订', reject: '拒绝修订', insert: '插入：',
      delete: '删除：', format: '格式：', bold: '加粗', italic: '斜体', underline: '下划线',
      strikeout: '删除线', doubleStrikeout: '双删除线', hidden: '隐藏', superscript: '上标',
      subscript: '下标', color: '字体颜色', size: '字号', font: '字体', highlight: '高亮',
      characterScale: '字符缩放', letterSpacing: '字符间距', textDecoration: '装饰线样式',
      rowFlex: '对齐方式', lineHeight: '行距', lineHeightRule: '行距规则', rowMargin: '行间距',
      paragraphIndentLeft: '左缩进', paragraphIndentRight: '右缩进',
      paragraphFirstLineIndent: '首行缩进', indentHanging: '悬挂缩进',
      paragraphSpacingBefore: '段前间距', paragraphSpacingAfter: '段后间距',
      alignLeft: '左对齐', alignCenter: '居中', alignRight: '右对齐',
      alignJustify: '两端对齐', alignDistribute: '分散对齐', undo: '取消', default: '默认',
      property: '{label}: {value}', formatDescription: '设置格式: {details}',
      setFormat: '设置格式', separator: '，', descriptionSeparator: '；'
    }
  }
}
