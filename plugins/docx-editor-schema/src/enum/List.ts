export enum ListType {
  UL = 'ul',
  OL = 'ol'
}

export enum UlStyle {
  DISC = 'disc', // 实心圆点
  CIRCLE = 'circle', // 空心圆点
  SQUARE = 'square', // 实心方块
  CHECKBOX = 'checkbox', // 复选框
  DIAMOND = 'diamond', // 菱形
  DASH = 'dash', // 破折号
  CHECK = 'check', // 打勾
  TRIANGLE = 'triangle', // 三角形
  STAR = 'star', // 五角星
  ARROW = 'arrow', // 箭头
  DIAMOND_SOLID = 'diamond-solid', // 实心菱形
  ANGLE = 'angle', // 大于号
  HOLLOW_CIRCLE = 'hollow-circle', // 空心圆
  HOLLOW_SQUARE = 'hollow-square', // 空心方块
  HEART_HOLLOW = 'heart-hollow', // 空心爱心
  HASH = 'hash', // 井号
  TRIANGLE_SOLID = 'triangle-solid', // 实心三角形
  STAR_SOLID = 'star-solid', // 实心五角星
  HEART_SOLID = 'heart-solid', // 实心爱心
  FLOWER = 'flower', // 花朵
  ASTERISK = 'asterisk', // 星号
  HOLLOW_DIAMOND = 'hollow-diamond', // 空心菱形
  HOLLOW_TRIANGLE = 'hollow-triangle' // 空心三角形
}

export enum OlStyle {
  DECIMAL = 'decimal', // 阿拉伯数字
  DECIMAL_DOT = 'decimal-dot', // 阿拉伯数字+点
  DECIMAL_PAREN = 'decimal-paren', // 阿拉伯数字+括号
  DECIMAL_CIRCLE = 'decimal-circle', // 圈码
  DECIMAL_BRACKET = 'decimal-bracket', // 阿拉伯数字+右括号
  CHINESE = 'chinese', // 中文
  CHINESE_BRACKET = 'chinese-bracket', // 中文括号
  UPPER_ALPHA = 'upper-alpha', // 大写字母
  LOWER_ALPHA_DOT = 'lower-alpha-dot' // 小写字母+点
}

export enum ListStyle {
  DISC = UlStyle.DISC,
  CIRCLE = UlStyle.CIRCLE,
  SQUARE = UlStyle.SQUARE,
  CHECKBOX = UlStyle.CHECKBOX,
  DIAMOND = UlStyle.DIAMOND,
  DASH = UlStyle.DASH,
  CHECK = UlStyle.CHECK,
  DECIMAL = OlStyle.DECIMAL,
  DECIMAL_DOT = OlStyle.DECIMAL_DOT,
  DECIMAL_PAREN = OlStyle.DECIMAL_PAREN,
  DECIMAL_CIRCLE = OlStyle.DECIMAL_CIRCLE,
  DECIMAL_BRACKET = OlStyle.DECIMAL_BRACKET,
  CHINESE = OlStyle.CHINESE,
  CHINESE_BRACKET = OlStyle.CHINESE_BRACKET,
  UPPER_ALPHA = OlStyle.UPPER_ALPHA,
  LOWER_ALPHA_DOT = OlStyle.LOWER_ALPHA_DOT
}
