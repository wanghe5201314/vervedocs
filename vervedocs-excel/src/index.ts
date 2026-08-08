import './assets/iconfont/iconfont.css'
import './assets/iconfont/iconfont.js'

import { version } from '../package.json'

// Excel Editor UI - Main Entry
export { ExcelEditor } from './object/ExcelEditor'
export type { Options } from './object/ExcelEditor'

// Version
export const EXCEL_EDITOR_UI_VERSION = version

// API
export {
  sheetDocumentApi,
  setSheetDocumentApi,
  setAuthProvider as setSheetAuthProvider,
  setSheetRequestConfig,
  createHttpSheetDocumentApi,
  createDefaultSheetDocumentApi,
  getSheetApiBaseUrl,
  fetchSheetDocumentContent,
  fetchSheetDocumentInfo,
} from './api/sheet.api'
export type {
  SheetDocumentApi,
  SheetDocumentMeta,
  SheetDocumentStatus,
  SaveSheetDocumentRequest,
  SaveSheetDocumentResult,
  SetSheetStatusRequest,
  SheetRequestConfig,
  SheetRequestEndpoints,
  AuthTokenProvider as SheetAuthTokenProvider,
} from './api/sheet.api'

// Utils
export * from './utils/documents'
export * from './utils/sheet-icons'


export { createExcelI18n, registerLangMap, zhCN, enUS } from './i18n'

// Types
export type { Align, VerticalAlign, WrapMode, ICellStyle, IUiSheet, IWorkbook, UndoEntry } from './types'
export type { ExcelLocale, ExcelI18nMessages } from './i18n'
export type { ExcelCollaborationConfig, UserInfo } from '@vervedoc/docx-editor-collaboration'
