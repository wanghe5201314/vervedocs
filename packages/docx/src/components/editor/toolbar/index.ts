// 工具栏数据定义

// 颜色调色板 - 扩展版（10列×8行，含完整明度渐变）
export const colorPalette = [
  // 灰度系列
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
  // 标准色
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
  // 浅色系列 - 亮度80%
  '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
  // 浅色系列 - 亮度60%
  '#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd',
  // 中色系列 - 亮度40%
  '#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0',
  // 深色系列 - 亮度20%
  '#a61c00', '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3c78d8', '#3d85c6', '#674ea7', '#a64d79',
  // 更深色系列 - 亮度0%
  '#85200c', '#990000', '#b45f06', '#bf9000', '#38761d', '#134f5c', '#1155cc', '#0b5394', '#351c75', '#741b47',
  // 最深色系列
  '#5b0f00', '#660000', '#783f04', '#7f6000', '#274e13', '#0c343d', '#1c4587', '#073763', '#20124d', '#4c1130'
]

// 项目符号样式 - WPS风格
export const bulletStyles = [
  { style: 'disc', icon: '●', label: '实心圆点' },
  { style: 'square', icon: '■', label: '实心方块' },
  { style: 'diamond', icon: '◆', label: '实心菱形' },
  { style: 'hollow-diamond', icon: '◇', label: '空心菱形' },
  { style: 'arrow', icon: '▶', label: '箭头' },
  { style: 'check', icon: '✓', label: '对勾' },
  { style: 'circle', icon: '○', label: '空心圆点' },
  { style: 'hollow-square', icon: '□', label: '空心方块' }
]

// 编号样式 - WPS风格
export const numberStyles = [
  { style: 'chinese', samples: ['一、', '二、', '三、'], label: '中文数字' },
  { style: 'chinese-bracket', samples: ['（一）', '（二）', '（三）'], label: '中文括号' },
  { style: 'decimal', samples: ['1.', '2.', '3.'], label: '阿拉伯数字' },
  { style: 'decimal-paren', samples: ['(1)', '(2)', '(3)'], label: '数字括号' },
  { style: 'decimal-circle', samples: ['①', '②', '③'], label: '圈码' },
  { style: 'decimal-bracket', samples: ['1)', '2)', '3)'], label: '数字右括号' },
  { style: 'upper-alpha', samples: ['A', 'B', 'C'], label: '大写字母' },
  { style: 'lower-alpha-dot', samples: ['a.', 'b.', 'c.'], label: '小写字母' }
]

// 行距选项
export const lineHeightOptions = [
  { value: 1, label: '单倍行距' },
  { value: 1.15, label: '1.15 倍行距' },
  { value: 1.5, label: '1.5 倍行距' },
  { value: 2, label: '双倍行距' },
  { value: 2.5, label: '2.5 倍行距' },
  { value: 3, label: '三倍行距' }
]

// 页边距预设
export const marginPresets = [
  { name: '普通', margins: [96, 120, 96, 120], style: { margin: '14px 18px' } },
  { name: '窄', margins: [48, 48, 48, 48], style: { margin: '7px 7px' } },
  { name: '适中', margins: [96, 72, 96, 72], style: { margin: '14px 11px' } },
  { name: '宽', margins: [96, 192, 96, 192], style: { margin: '14px 28px' } }
]

// 纸张大小
export const paperSizes = [
  { name: 'A4', width: 794, height: 1123, displayWidth: '21厘米', displayHeight: '29.7厘米' },
  { name: 'A3', width: 1123, height: 1587, displayWidth: '29.7厘米', displayHeight: '42厘米' },
  { name: 'A5', width: 559, height: 794, displayWidth: '14.8厘米', displayHeight: '21厘米' },
  { name: 'B5', width: 665, height: 945, displayWidth: '17.6厘米', displayHeight: '25厘米' },
  { name: 'Letter', width: 816, height: 1054, displayWidth: '21.6厘米', displayHeight: '27.9厘米' },
  { name: '16开', width: 696, height: 983, displayWidth: '18.4厘米', displayHeight: '26厘米' }
]

// 背景颜色调色板
export const bgColorPalette = [
  '#FFFFFF', '#000000', '#E7E6E6', '#44546A', '#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5', '#70AD47',
  '#F2F2F2', '#7F7F7F', '#D0CECE', '#D6DCE4', '#D9E2F3', '#FCE4D6', '#EDEDED', '#FFF2CC', '#DEEAF6', '#E2EFD9',
  '#D9D9D9', '#595959', '#AFABAB', '#ADB9CA', '#B4C6E7', '#F8CBAD', '#DBDBDB', '#FFE599', '#BDD7EE', '#C5E0B3',
  '#BFBFBF', '#404040', '#757070', '#8496B0', '#8EAADB', '#F4B183', '#C0C0C0', '#FFD966', '#9CC3E5', '#A8D08D',
  '#A6A6A6', '#262626', '#3A3838', '#323F4F', '#2F5496', '#C65911', '#7B7B7B', '#BF9000', '#2E75B5', '#538135'
]

// 水印预设
export const watermarkPresets = [
  { name: '保密', options: { data: '保密' } },
  { name: '严禁复制', options: { data: '严禁复制' } },
  { name: '原件', options: { data: '原件' } },
  { name: '样本', options: { data: '样本' } },
  { name: '绝密', options: { data: '绝密' } },
  { name: '紧急', options: { data: '紧急' } }
]


// 分割线样式
export const separatorStyles = [
  // 实线系列
  { name: '极细实线', type: 'solid', width: 0.5, dashArray: [0, 0] },
  { name: '细实线', type: 'solid', width: 1, dashArray: [0, 0] },
  { name: '中实线', type: 'solid', width: 2, dashArray: [0, 0] },
  { name: '粗实线', type: 'solid', width: 3, dashArray: [0, 0] },
  { name: '特粗实线', type: 'solid', width: 4, dashArray: [0, 0] },
  // 点线系列
  { name: '细点线', type: 'dotted', width: 0.5, dashArray: [1, 1] },
  { name: '点线', type: 'dotted', width: 1, dashArray: [1, 1] },
  { name: '粗点线', type: 'dotted', width: 2, dashArray: [1, 1] },
  { name: '大点线', type: 'dotted', width: 3, dashArray: [2, 2] },
  // 虚线系列
  { name: '细短虚线', type: 'dashed', width: 0.5, dashArray: [3, 2] },
  { name: '短虚线', type: 'dashed', width: 1, dashArray: [3, 2] },
  { name: '粗短虚线', type: 'dashed', width: 2, dashArray: [3, 2] },
  { name: '细长虚线', type: 'dashed', width: 0.5, dashArray: [6, 3] },
  { name: '长虚线', type: 'dashed', width: 1, dashArray: [6, 3] },
  { name: '粗长虚线', type: 'dashed', width: 2, dashArray: [6, 3] },
  { name: '特长虚线', type: 'dashed', width: 1, dashArray: [10, 5] },
  // 点划线系列
  { name: '点划线', type: 'dashed', width: 1, dashArray: [6, 2, 1, 2] },
  { name: '粗点划线', type: 'dashed', width: 2, dashArray: [6, 2, 1, 2] },
  { name: '双点划线', type: 'dashed', width: 1, dashArray: [6, 2, 1, 2, 1, 2] },
  { name: '粗双点划线', type: 'dashed', width: 2, dashArray: [6, 2, 1, 2, 1, 2] },
  // 双线系列
  { name: '细双线', type: 'double', width: 2, dashArray: [0, 0] },
  { name: '双线', type: 'double', width: 3, dashArray: [0, 0] },
  { name: '粗双线', type: 'double', width: 4, dashArray: [0, 0] },
  { name: '特粗双线', type: 'double', width: 5, dashArray: [0, 0] },
  // 三线
  { name: '三线', type: 'triple', width: 4, dashArray: [0, 0] },
  // 波浪线系列
  { name: '细波浪线', type: 'wavy', width: 0.5, dashArray: [0, 0] },
  { name: '波浪线', type: 'wavy', width: 1, dashArray: [0, 0] },
  { name: '粗波浪线', type: 'wavy', width: 2, dashArray: [0, 0] },
  // 装饰线系列
  { name: '渐变线', type: 'gradient', width: 2, dashArray: [0, 0] },
  { name: '阴影线', type: 'shadow', width: 2, dashArray: [0, 0] },
  { name: '浮雕线', type: 'emboss', width: 3, dashArray: [0, 0] }
]

// 公式分类
export const formulaCategories = [
  {
    name: '数学公式', icon: 'functions',
    formulas: [
      { name: '二次公式', latex: 'x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}', preview: 'x = (-b ± √(b²-4ac)) / 2a' },
      { name: '勾股定理', latex: 'a^2+b^2=c^2', preview: 'a² + b² = c²' },
      { name: '圆的周长', latex: 'C=2\\pi r', preview: 'C = 2πr' }
    ]
  },
  {
    name: '物理公式', icon: 'bolt',
    formulas: [
      { name: '质能方程', latex: 'E=mc^2', preview: 'E = mc²' },
      { name: '牛顿第二定律', latex: 'F=ma', preview: 'F = ma' },
      { name: '动能公式', latex: 'E_k=\\frac{1}{2}mv^2', preview: 'Eₖ = ½mv²' }
    ]
  },
  {
    name: '化学公式', icon: 'science',
    formulas: [
      { name: '理想气体方程', latex: 'PV=nRT', preview: 'PV = nRT' },
      { name: '水的电离', latex: 'H_2O\\rightleftharpoons H^++OH^-', preview: 'H₂O ⇌ H⁺ + OH⁻' }
    ]
  }
]

// 缩放级别
export const zoomLevels = [50, 75, 100, 125, 150, 200]


// 标题级别映射
export const titleLevelMap: Record<string, string> = {
  first: '标题1',
  second: '标题2',
  third: '标题3',
  fourth: '标题4',
  fifth: '标题5',
  sixth: '标题6'
}
