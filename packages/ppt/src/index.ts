// PPT Editor UI - Main Entry
export { PptEditor } from './object/pptEditor'
export type { Options } from './object/pptEditor'
export { createPptI18n, registerLangMap, zhCN, enUS } from './i18n'

// Types
export type {
  Slide,
  SlideTheme,
  PPTElement,
  PPTTextElement,
  PPTImageElement,
  PPTShapeElement,
  PPTLineElement,
  PPTChartElement,
  PPTTableElement,
  PPTLatexElement,
  PPTVideoElement,
  PPTAudioElement,
  PPTAnimation,
  SlideBackground,
} from './types/slides'
export type { PptLocale, PptI18nMessages } from './i18n'
