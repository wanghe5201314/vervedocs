import { ListStyle, ListType, UlStyle } from '../enum/list'

export const ulStyleMapping: Record<UlStyle, string> = {
  [UlStyle.DISC]: '•',
  [UlStyle.CIRCLE]: '◦',
  [UlStyle.SQUARE]: '▫︎',
  [UlStyle.CHECKBOX]: '☑️',
  [UlStyle.DIAMOND]: '◆',
  [UlStyle.DASH]: '—',
  [UlStyle.CHECK]: '✓',
  [UlStyle.TRIANGLE]: '▶',
  [UlStyle.STAR]: '★',
  [UlStyle.ARROW]: '▸',
  [UlStyle.DIAMOND_SOLID]: '♦',
  [UlStyle.ANGLE]: '>',
  [UlStyle.HOLLOW_CIRCLE]: '○',
  [UlStyle.HOLLOW_SQUARE]: '□',
  [UlStyle.HEART_HOLLOW]: '♡',
  [UlStyle.HASH]: '#',
  [UlStyle.TRIANGLE_SOLID]: '▲',
  [UlStyle.STAR_SOLID]: '☆',
  [UlStyle.HEART_SOLID]: '♥',
  [UlStyle.FLOWER]: '✿',
  [UlStyle.ASTERISK]: '*',
  [UlStyle.HOLLOW_DIAMOND]: '◇',
  [UlStyle.HOLLOW_TRIANGLE]: '▷'
}

export const listTypeElementMapping: Record<ListType, string> = {
  [ListType.OL]: 'ol',
  [ListType.UL]: 'ul'
}

export const listStyleCSSMapping: Record<ListStyle, string> = {
  [ListStyle.DISC]: 'disc',
  [ListStyle.CIRCLE]: 'circle',
  [ListStyle.SQUARE]: 'square',
  [ListStyle.DECIMAL]: 'decimal',
  [ListStyle.DECIMAL_DOT]: 'decimal',
  [ListStyle.DECIMAL_PAREN]: 'decimal',
  [ListStyle.DECIMAL_CIRCLE]: 'decimal',
  [ListStyle.DECIMAL_BRACKET]: 'decimal',
  [ListStyle.CHINESE]: 'decimal',
  [ListStyle.CHINESE_BRACKET]: 'decimal',
  [ListStyle.UPPER_ALPHA]: 'upper-alpha',
  [ListStyle.LOWER_ALPHA_DOT]: 'lower-alpha',
  [ListStyle.CHECKBOX]: 'checkbox',
  [ListStyle.DIAMOND]: 'disc',
  [ListStyle.DASH]: 'disc',
  [ListStyle.CHECK]: 'disc'
}
