import type { ExcelLocale } from '@/i18n/types'
import * as core from '@univerjs/core'
import * as coreFacade from '@univerjs/core/facade'
import * as docs from '@univerjs/docs'
import * as docsUI from '@univerjs/docs-ui'
import * as findReplace from '@univerjs/find-replace'
import * as formulaEngine from '@univerjs/engine-formula'
import * as renderEngine from '@univerjs/engine-render'
import * as sheetsConditionalFormatting from '@univerjs/sheets-conditional-formatting'
import * as sheetsConditionalFormattingUI from '@univerjs/sheets-conditional-formatting-ui'
import * as sheetsCrosshairHighlight from '@univerjs/sheets-crosshair-highlight'
import * as sheetsDataValidation from '@univerjs/sheets-data-validation'
import * as sheetsDataValidationUI from '@univerjs/sheets-data-validation-ui'
import * as sheetsDrawing from '@univerjs/sheets-drawing'
import * as sheetsDrawingUI from '@univerjs/sheets-drawing-ui'
import * as sheetsFilter from '@univerjs/sheets-filter'
import * as sheetsFilterUI from '@univerjs/sheets-filter-ui'
import * as sheetsFindReplace from '@univerjs/sheets-find-replace'
import * as sheetsHyperLink from '@univerjs/sheets-hyper-link'
import * as sheetsHyperLinkUI from '@univerjs/sheets-hyper-link-ui'
import * as sheets from '@univerjs/sheets'
import * as sheetsFormula from '@univerjs/sheets-formula'
import * as sheetsFormulaUI from '@univerjs/sheets-formula-ui'
import * as sheetsGraphics from '@univerjs/sheets-graphics'
import * as sheetsNote from '@univerjs/sheets-note'
import * as sheetsNoteUI from '@univerjs/sheets-note-ui'
import * as sheetsNumfmt from '@univerjs/sheets-numfmt'
import * as sheetsNumfmtUI from '@univerjs/sheets-numfmt-ui'
import * as sheetsSort from '@univerjs/sheets-sort'
import * as sheetsSortUI from '@univerjs/sheets-sort-ui'
import * as sheetsTable from '@univerjs/sheets-table'
import * as sheetsTableUI from '@univerjs/sheets-table-ui'
import * as sheetsThreadComment from '@univerjs/sheets-thread-comment'
import * as sheetsThreadCommentUI from '@univerjs/sheets-thread-comment-ui'
import * as sheetsUI from '@univerjs/sheets-ui'
import * as sheetsZenEditor from '@univerjs/sheets-zen-editor'
import * as threadComment from '@univerjs/thread-comment'
import * as threadCommentUI from '@univerjs/thread-comment-ui'
import * as ui from '@univerjs/ui'
import * as adapter from './univer-adapter'

import '@univerjs/find-replace/lib/index.css'
import '@univerjs/sheets-conditional-formatting-ui/lib/index.css'
import '@univerjs/sheets-crosshair-highlight/lib/index.css'
import '@univerjs/sheets-data-validation-ui/lib/index.css'
import '@univerjs/design/lib/index.css'
import '@univerjs/ui/lib/index.css'
import '@univerjs/docs-ui/lib/index.css'
import '@univerjs/sheets-drawing-ui/lib/index.css'
import '@univerjs/sheets-filter-ui/lib/index.css'
import '@univerjs/sheets-hyper-link-ui/lib/index.css'
import '@univerjs/sheets-note-ui/lib/index.css'
import '@univerjs/sheets-sort-ui/lib/index.css'
import '@univerjs/sheets-thread-comment-ui/lib/index.css'
import '@univerjs/thread-comment-ui/lib/index.css'
import '@univerjs/sheets-ui/lib/index.css'
import '@univerjs/sheets-formula-ui/lib/index.css'
import '@univerjs/sheets-numfmt-ui/lib/index.css'
import '@univerjs/sheets-table-ui/lib/index.css'
import '@univerjs/sheets-zen-editor/lib/index.css'

import '@univerjs/docs-ui/facade'
import '@univerjs/engine-formula/facade'
import '@univerjs/sheets-conditional-formatting/facade'
import '@univerjs/sheets-crosshair-highlight/facade'
import '@univerjs/sheets-data-validation/facade'
import '@univerjs/sheets-drawing/facade'
import '@univerjs/sheets-filter/facade'
import '@univerjs/sheets-hyper-link-ui/facade'
import '@univerjs/sheets/facade'
import '@univerjs/sheets-find-replace/facade'
import '@univerjs/sheets-formula/facade'
import '@univerjs/sheets-numfmt/facade'
import '@univerjs/sheets-table/facade'
import '@univerjs/sheets-ui/facade'
import '@univerjs/sheets-drawing-ui/facade'
import '@univerjs/sheets-zen-editor/facade'
import '@univerjs/ui/facade'

type CoreModule = typeof core
type CoreFacadeModule = typeof coreFacade
type DocsModule = typeof docs
type DocsUIModule = typeof docsUI
type FindReplaceModule = typeof findReplace
type FormulaEngineModule = typeof formulaEngine
type RenderEngineModule = typeof renderEngine
type SheetsConditionalFormattingModule = typeof sheetsConditionalFormatting
type SheetsConditionalFormattingUIModule = typeof sheetsConditionalFormattingUI
type SheetsCrosshairHighlightModule = typeof sheetsCrosshairHighlight
type SheetsDataValidationModule = typeof sheetsDataValidation
type SheetsDataValidationUIModule = typeof sheetsDataValidationUI
type SheetsDrawingModule = typeof sheetsDrawing
type SheetsDrawingUIModule = typeof sheetsDrawingUI
type SheetsFilterModule = typeof sheetsFilter
type SheetsFilterUIModule = typeof sheetsFilterUI
type SheetsFindReplaceModule = typeof sheetsFindReplace
type SheetsHyperLinkModule = typeof sheetsHyperLink
type SheetsHyperLinkUIModule = typeof sheetsHyperLinkUI
type SheetsModule = typeof sheets
type SheetsFormulaModule = typeof sheetsFormula
type SheetsFormulaUIModule = typeof sheetsFormulaUI
type SheetsGraphicsModule = typeof sheetsGraphics
type SheetsNoteModule = typeof sheetsNote
type SheetsNoteUIModule = typeof sheetsNoteUI
type SheetsNumfmtModule = typeof sheetsNumfmt
type SheetsNumfmtUIModule = typeof sheetsNumfmtUI
type SheetsSortModule = typeof sheetsSort
type SheetsSortUIModule = typeof sheetsSortUI
type SheetsTableModule = typeof sheetsTable
type SheetsTableUIModule = typeof sheetsTableUI
type SheetsThreadCommentModule = typeof sheetsThreadComment
type SheetsThreadCommentUIModule = typeof sheetsThreadCommentUI
type SheetsUIModule = typeof sheetsUI
type SheetsZenEditorModule = typeof sheetsZenEditor
type ThreadCommentModule = typeof threadComment
type ThreadCommentUIModule = typeof threadCommentUI
type UIModule = typeof ui
type AdapterModule = typeof adapter

export type LoadedUniverRuntime = {
  core: Pick<CoreModule, 'BorderStyleTypes' | 'BorderType' | 'LocaleType' | 'Univer' | 'mergeLocales'>
  facade: Pick<CoreFacadeModule, 'FUniver'>
  plugins: {
    UniverDocsPlugin: DocsModule['UniverDocsPlugin']
    UniverDocsUIPlugin: DocsUIModule['UniverDocsUIPlugin']
    UniverFindReplacePlugin: FindReplaceModule['UniverFindReplacePlugin']
    UniverFormulaEnginePlugin: FormulaEngineModule['UniverFormulaEnginePlugin']
    UniverRenderEnginePlugin: RenderEngineModule['UniverRenderEnginePlugin']
    UniverSheetsConditionalFormattingPlugin: SheetsConditionalFormattingModule['UniverSheetsConditionalFormattingPlugin']
    UniverSheetsConditionalFormattingUIPlugin: SheetsConditionalFormattingUIModule['UniverSheetsConditionalFormattingUIPlugin']
    UniverSheetsCrosshairHighlightPlugin: SheetsCrosshairHighlightModule['UniverSheetsCrosshairHighlightPlugin']
    UniverSheetsDataValidationPlugin: SheetsDataValidationModule['UniverSheetsDataValidationPlugin']
    UniverSheetsDataValidationUIPlugin: SheetsDataValidationUIModule['UniverSheetsDataValidationUIPlugin']
    UniverSheetsDrawingPlugin: SheetsDrawingModule['UniverSheetsDrawingPlugin']
    UniverSheetsDrawingUIPlugin: SheetsDrawingUIModule['UniverSheetsDrawingUIPlugin']
    UniverSheetsFilterPlugin: SheetsFilterModule['UniverSheetsFilterPlugin']
    UniverSheetsFilterUIPlugin: SheetsFilterUIModule['UniverSheetsFilterUIPlugin']
    UniverSheetsFindReplacePlugin: SheetsFindReplaceModule['UniverSheetsFindReplacePlugin']
    UniverSheetsHyperLinkPlugin: SheetsHyperLinkModule['UniverSheetsHyperLinkPlugin']
    UniverSheetsHyperLinkUIPlugin: SheetsHyperLinkUIModule['UniverSheetsHyperLinkUIPlugin']
    UniverSheetsPlugin: SheetsModule['UniverSheetsPlugin']
    UniverSheetsFormulaPlugin: SheetsFormulaModule['UniverSheetsFormulaPlugin']
    UniverSheetsFormulaUIPlugin: SheetsFormulaUIModule['UniverSheetsFormulaUIPlugin']
    UniverSheetsGraphicsPlugin: SheetsGraphicsModule['UniverSheetsGraphicsPlugin']
    UniverSheetsNotePlugin: SheetsNoteModule['UniverSheetsNotePlugin']
    UniverSheetsNoteUIPlugin: SheetsNoteUIModule['UniverSheetsNoteUIPlugin']
    UniverSheetsNumfmtPlugin: SheetsNumfmtModule['UniverSheetsNumfmtPlugin']
    UniverSheetsNumfmtUIPlugin: SheetsNumfmtUIModule['UniverSheetsNumfmtUIPlugin']
    UniverSheetsSortPlugin: SheetsSortModule['UniverSheetsSortPlugin']
    UniverSheetsSortUIPlugin: SheetsSortUIModule['UniverSheetsSortUIPlugin']
    UniverSheetsTablePlugin: SheetsTableModule['UniverSheetsTablePlugin']
    UniverSheetsTableUIPlugin: SheetsTableUIModule['UniverSheetsTableUIPlugin']
    UniverSheetsThreadCommentPlugin: SheetsThreadCommentModule['UniverSheetsThreadCommentPlugin']
    UniverSheetsThreadCommentUIPlugin: SheetsThreadCommentUIModule['UniverSheetsThreadCommentUIPlugin']
    UniverSheetsUIPlugin: SheetsUIModule['UniverSheetsUIPlugin']
    UniverSheetsZenEditorPlugin: SheetsZenEditorModule['UniverSheetsZenEditorPlugin']
    UniverThreadCommentPlugin: ThreadCommentModule['UniverThreadCommentPlugin']
    UniverThreadCommentUIPlugin: ThreadCommentUIModule['UniverThreadCommentUIPlugin']
    UniverUIPlugin: UIModule['UniverUIPlugin']
  }
  locales: {
    conditionalFormattingUI: Record<string, unknown>
    crosshairHighlight: Record<string, unknown>
    dataValidation: Record<string, unknown>
    dataValidationUI: Record<string, unknown>
    design: Record<string, unknown>
    docsUI: Record<string, unknown>
    drawingUI: Record<string, unknown>
    findReplace: Record<string, unknown>
    sheets: Record<string, unknown>
    sheetsFilter: Record<string, unknown>
    sheetsFilterUI: Record<string, unknown>
    sheetsHyperLink: Record<string, unknown>
    sheetsHyperLinkUI: Record<string, unknown>
    sheetsFormulaUI: Record<string, unknown>
    sheetsNoteUI: Record<string, unknown>
    sheetsNumfmtUI: Record<string, unknown>
    sheetsSortUI: Record<string, unknown>
    sheetsTable: Record<string, unknown>
    sheetsTableUI: Record<string, unknown>
    sheetsThreadCommentUI: Record<string, unknown>
    sheetsUI: Record<string, unknown>
    threadCommentUI: Record<string, unknown>
    zenEditor: Record<string, unknown>
    ui: Record<string, unknown>
  }
  adapter: Pick<AdapterModule, 'internalWorkbookToUniver' | 'univerWorkbookToInternal'>
}

type LoadedUniverBaseRuntime = Omit<LoadedUniverRuntime, 'locales'>

let univerBaseRuntimeCache: LoadedUniverBaseRuntime | null = null
const univerRuntimePromises = new Map<ExcelLocale, Promise<LoadedUniverRuntime>>()

function createUniverBaseRuntime(): LoadedUniverBaseRuntime {
  return {
    core: {
      BorderStyleTypes: core.BorderStyleTypes,
      BorderType: core.BorderType,
      LocaleType: core.LocaleType,
      Univer: core.Univer,
      mergeLocales: core.mergeLocales,
    },
    facade: {
      FUniver: coreFacade.FUniver,
    },
    plugins: {
      UniverDocsPlugin: docs.UniverDocsPlugin,
      UniverDocsUIPlugin: docsUI.UniverDocsUIPlugin,
      UniverFindReplacePlugin: findReplace.UniverFindReplacePlugin,
      UniverFormulaEnginePlugin: formulaEngine.UniverFormulaEnginePlugin,
      UniverRenderEnginePlugin: renderEngine.UniverRenderEnginePlugin,
      UniverSheetsConditionalFormattingPlugin: sheetsConditionalFormatting.UniverSheetsConditionalFormattingPlugin,
      UniverSheetsConditionalFormattingUIPlugin: sheetsConditionalFormattingUI.UniverSheetsConditionalFormattingUIPlugin,
      UniverSheetsCrosshairHighlightPlugin: sheetsCrosshairHighlight.UniverSheetsCrosshairHighlightPlugin,
      UniverSheetsDataValidationPlugin: sheetsDataValidation.UniverSheetsDataValidationPlugin,
      UniverSheetsDataValidationUIPlugin: sheetsDataValidationUI.UniverSheetsDataValidationUIPlugin,
      UniverSheetsDrawingPlugin: sheetsDrawing.UniverSheetsDrawingPlugin,
      UniverSheetsDrawingUIPlugin: sheetsDrawingUI.UniverSheetsDrawingUIPlugin,
      UniverSheetsFilterPlugin: sheetsFilter.UniverSheetsFilterPlugin,
      UniverSheetsFilterUIPlugin: sheetsFilterUI.UniverSheetsFilterUIPlugin,
      UniverSheetsFindReplacePlugin: sheetsFindReplace.UniverSheetsFindReplacePlugin,
      UniverSheetsHyperLinkPlugin: sheetsHyperLink.UniverSheetsHyperLinkPlugin,
      UniverSheetsHyperLinkUIPlugin: sheetsHyperLinkUI.UniverSheetsHyperLinkUIPlugin,
      UniverSheetsPlugin: sheets.UniverSheetsPlugin,
      UniverSheetsFormulaPlugin: sheetsFormula.UniverSheetsFormulaPlugin,
      UniverSheetsFormulaUIPlugin: sheetsFormulaUI.UniverSheetsFormulaUIPlugin,
      UniverSheetsGraphicsPlugin: sheetsGraphics.UniverSheetsGraphicsPlugin,
      UniverSheetsNotePlugin: sheetsNote.UniverSheetsNotePlugin,
      UniverSheetsNoteUIPlugin: sheetsNoteUI.UniverSheetsNoteUIPlugin,
      UniverSheetsNumfmtPlugin: sheetsNumfmt.UniverSheetsNumfmtPlugin,
      UniverSheetsNumfmtUIPlugin: sheetsNumfmtUI.UniverSheetsNumfmtUIPlugin,
      UniverSheetsSortPlugin: sheetsSort.UniverSheetsSortPlugin,
      UniverSheetsSortUIPlugin: sheetsSortUI.UniverSheetsSortUIPlugin,
      UniverSheetsTablePlugin: sheetsTable.UniverSheetsTablePlugin,
      UniverSheetsTableUIPlugin: sheetsTableUI.UniverSheetsTableUIPlugin,
      UniverSheetsThreadCommentPlugin: sheetsThreadComment.UniverSheetsThreadCommentPlugin,
      UniverSheetsThreadCommentUIPlugin: sheetsThreadCommentUI.UniverSheetsThreadCommentUIPlugin,
      UniverSheetsUIPlugin: sheetsUI.UniverSheetsUIPlugin,
      UniverSheetsZenEditorPlugin: sheetsZenEditor.UniverSheetsZenEditorPlugin,
      UniverThreadCommentPlugin: threadComment.UniverThreadCommentPlugin,
      UniverThreadCommentUIPlugin: threadCommentUI.UniverThreadCommentUIPlugin,
      UniverUIPlugin: ui.UniverUIPlugin,
    },
    adapter: {
      internalWorkbookToUniver: adapter.internalWorkbookToUniver,
      univerWorkbookToInternal: adapter.univerWorkbookToInternal,
    },
  }
}

function loadUniverBaseRuntime(): Promise<LoadedUniverBaseRuntime> {
  if (!univerBaseRuntimeCache) {
    univerBaseRuntimeCache = createUniverBaseRuntime()
  }
  return Promise.resolve(univerBaseRuntimeCache)
}

function loadUniverLocales(locale: ExcelLocale): Promise<LoadedUniverRuntime['locales']> {
  if (locale === 'enUS') {
    return Promise.all([
      import('@univerjs/find-replace/locale/en-US'),
      import('@univerjs/sheets-conditional-formatting-ui/locale/en-US'),
      import('@univerjs/sheets-crosshair-highlight/locale/en-US'),
      import('@univerjs/sheets-data-validation/locale/en-US'),
      import('@univerjs/sheets-data-validation-ui/locale/en-US'),
      import('@univerjs/design/locale/en-US'),
      import('@univerjs/docs-ui/locale/en-US'),
      import('@univerjs/sheets-drawing-ui/locale/en-US'),
      import('@univerjs/sheets-filter/locale/en-US'),
      import('@univerjs/sheets-filter-ui/locale/en-US'),
      import('@univerjs/sheets-hyper-link/locale/en-US'),
      import('@univerjs/sheets-hyper-link-ui/locale/en-US'),
      import('@univerjs/sheets/locale/en-US'),
      import('@univerjs/sheets-formula-ui/locale/en-US'),
      import('@univerjs/sheets-note-ui/locale/en-US'),
      import('@univerjs/sheets-numfmt-ui/locale/en-US'),
      import('@univerjs/sheets-sort-ui/locale/en-US'),
      import('@univerjs/sheets-table/locale/en-US'),
      import('@univerjs/sheets-table-ui/locale/en-US'),
      import('@univerjs/sheets-thread-comment-ui/locale/en-US'),
      import('@univerjs/sheets-ui/locale/en-US'),
      import('@univerjs/sheets-zen-editor/locale/en-US'),
      import('@univerjs/thread-comment-ui/locale/en-US'),
      import('@univerjs/ui/locale/en-US'),
    ]).then(([
      findReplaceLocale,
      conditionalFormattingUI,
      crosshairHighlight,
      dataValidation,
      dataValidationUI,
      design,
      docsUILocale,
      drawingUI,
      sheetsFilterLocale,
      sheetsFilterUI,
      sheetsHyperLink,
      sheetsHyperLinkUI,
      sheetsLocale,
      sheetsFormulaUI,
      sheetsNoteUI,
      sheetsNumfmtUI,
      sheetsSortUI,
      sheetsTable,
      sheetsTableUI,
      sheetsThreadCommentUI,
      sheetsUI,
      zenEditor,
      threadCommentUILocale,
      uiLocale,
    ]) => ({
      conditionalFormattingUI: conditionalFormattingUI.default,
      crosshairHighlight: crosshairHighlight.default,
      dataValidation: dataValidation.default,
      dataValidationUI: dataValidationUI.default,
      design: design.default,
      docsUI: docsUILocale.default,
      drawingUI: drawingUI.default,
      findReplace: findReplaceLocale.default,
      sheets: sheetsLocale.default,
      sheetsFilter: sheetsFilterLocale.default,
      sheetsFilterUI: sheetsFilterUI.default,
      sheetsHyperLink: sheetsHyperLink.default,
      sheetsHyperLinkUI: sheetsHyperLinkUI.default,
      sheetsFormulaUI: sheetsFormulaUI.default,
      sheetsNoteUI: sheetsNoteUI.default,
      sheetsNumfmtUI: sheetsNumfmtUI.default,
      sheetsSortUI: sheetsSortUI.default,
      sheetsTable: sheetsTable.default,
      sheetsTableUI: sheetsTableUI.default,
      sheetsThreadCommentUI: sheetsThreadCommentUI.default,
      sheetsUI: sheetsUI.default,
      threadCommentUI: threadCommentUILocale.default,
      zenEditor: zenEditor.default,
      ui: uiLocale.default,
    }))
  }

  return Promise.all([
    import('@univerjs/find-replace/locale/zh-CN'),
    import('@univerjs/sheets-conditional-formatting-ui/locale/zh-CN'),
    import('@univerjs/sheets-crosshair-highlight/locale/zh-CN'),
    import('@univerjs/sheets-data-validation/locale/zh-CN'),
    import('@univerjs/sheets-data-validation-ui/locale/zh-CN'),
    import('@univerjs/design/locale/zh-CN'),
    import('@univerjs/docs-ui/locale/zh-CN'),
    import('@univerjs/sheets-drawing-ui/locale/zh-CN'),
    import('@univerjs/sheets-filter/locale/zh-CN'),
    import('@univerjs/sheets-filter-ui/locale/zh-CN'),
    import('@univerjs/sheets-hyper-link/locale/zh-CN'),
    import('@univerjs/sheets-hyper-link-ui/locale/zh-CN'),
    import('@univerjs/sheets/locale/zh-CN'),
    import('@univerjs/sheets-formula-ui/locale/zh-CN'),
    import('@univerjs/sheets-note-ui/locale/zh-CN'),
    import('@univerjs/sheets-numfmt-ui/locale/zh-CN'),
    import('@univerjs/sheets-sort-ui/locale/zh-CN'),
    import('@univerjs/sheets-table/locale/zh-CN'),
    import('@univerjs/sheets-table-ui/locale/zh-CN'),
    import('@univerjs/sheets-thread-comment-ui/locale/zh-CN'),
    import('@univerjs/sheets-ui/locale/zh-CN'),
    import('@univerjs/sheets-zen-editor/locale/zh-CN'),
    import('@univerjs/thread-comment-ui/locale/zh-CN'),
    import('@univerjs/ui/locale/zh-CN'),
  ]).then(([
    findReplaceLocale,
    conditionalFormattingUI,
    crosshairHighlight,
    dataValidation,
    dataValidationUI,
    design,
    docsUILocale,
    drawingUI,
    sheetsFilterLocale,
    sheetsFilterUI,
    sheetsHyperLink,
    sheetsHyperLinkUI,
    sheetsLocale,
    sheetsFormulaUI,
    sheetsNoteUI,
    sheetsNumfmtUI,
    sheetsSortUI,
    sheetsTable,
    sheetsTableUI,
    sheetsThreadCommentUI,
    sheetsUI,
    zenEditor,
    threadCommentUILocale,
    uiLocale,
  ]) => ({
    conditionalFormattingUI: conditionalFormattingUI.default,
    crosshairHighlight: crosshairHighlight.default,
    dataValidation: dataValidation.default,
    dataValidationUI: dataValidationUI.default,
    design: design.default,
    docsUI: docsUILocale.default,
    drawingUI: drawingUI.default,
    findReplace: findReplaceLocale.default,
    sheets: sheetsLocale.default,
    sheetsFilter: sheetsFilterLocale.default,
    sheetsFilterUI: sheetsFilterUI.default,
    sheetsHyperLink: sheetsHyperLink.default,
    sheetsHyperLinkUI: sheetsHyperLinkUI.default,
    sheetsFormulaUI: sheetsFormulaUI.default,
    sheetsNoteUI: sheetsNoteUI.default,
    sheetsNumfmtUI: sheetsNumfmtUI.default,
    sheetsSortUI: sheetsSortUI.default,
    sheetsTable: sheetsTable.default,
    sheetsTableUI: sheetsTableUI.default,
    sheetsThreadCommentUI: sheetsThreadCommentUI.default,
    sheetsUI: sheetsUI.default,
    threadCommentUI: threadCommentUILocale.default,
    zenEditor: zenEditor.default,
    ui: uiLocale.default,
  }))
}

export function loadUniverRuntime(locale: ExcelLocale = 'zhCN'): Promise<LoadedUniverRuntime> {
  const currentLocale = locale === 'enUS' ? 'enUS' : 'zhCN'
  const cached = univerRuntimePromises.get(currentLocale)
  if (cached) return cached

  const runtimePromise = Promise.all([
    loadUniverBaseRuntime(),
    loadUniverLocales(currentLocale),
  ]).then(([baseRuntime, locales]) => ({
    ...baseRuntime,
    locales,
  }))

  univerRuntimePromises.set(currentLocale, runtimePromise)
  return runtimePromise
}
