import './assets/iconfont/iconfont.css'
import './assets/iconfont/iconfont.js'

import { version } from '../package.json'

// Excel Editor UI - Main Entry
export { ExcelEditor } from './object/ExcelEditor'
export type { Options } from './object/ExcelEditor'

// Version
export const EXCEL_EDITOR_UI_VERSION = version

// Utils
export * from './utils/documents'
export * from './utils/sheet-icons'

// Infer type helper
export { inferTypeAndFormat, toDocumentRow, formatBytes } from './utils/documents'
export { createExcelI18n, registerLangMap, zhCN, enUS } from './i18n'

// Types
export type { Align, VerticalAlign, WrapMode, ICellStyle, IUiSheet, IWorkbook, UndoEntry } from './types'
export type { ExcelLocale, ExcelI18nMessages } from './i18n'
