type CoreModule = typeof import('@univerjs/core')
type CoreFacadeModule = typeof import('@univerjs/core/facade')
type DocsModule = typeof import('@univerjs/docs')
type DocsUIModule = typeof import('@univerjs/docs-ui')
type FindReplaceModule = typeof import('@univerjs/find-replace')
type FormulaEngineModule = typeof import('@univerjs/engine-formula')
type RenderEngineModule = typeof import('@univerjs/engine-render')
type SheetsConditionalFormattingModule = typeof import('@univerjs/sheets-conditional-formatting')
type SheetsConditionalFormattingUIModule = typeof import('@univerjs/sheets-conditional-formatting-ui')
type SheetsCrosshairHighlightModule = typeof import('@univerjs/sheets-crosshair-highlight')
type SheetsDataValidationModule = typeof import('@univerjs/sheets-data-validation')
type SheetsDataValidationUIModule = typeof import('@univerjs/sheets-data-validation-ui')
type SheetsDrawingModule = typeof import('@univerjs/sheets-drawing')
type SheetsDrawingUIModule = typeof import('@univerjs/sheets-drawing-ui')
type SheetsFilterModule = typeof import('@univerjs/sheets-filter')
type SheetsFilterUIModule = typeof import('@univerjs/sheets-filter-ui')
type SheetsFindReplaceModule = typeof import('@univerjs/sheets-find-replace')
type SheetsHyperLinkModule = typeof import('@univerjs/sheets-hyper-link')
type SheetsHyperLinkUIModule = typeof import('@univerjs/sheets-hyper-link-ui')
type SheetsModule = typeof import('@univerjs/sheets')
type SheetsFormulaModule = typeof import('@univerjs/sheets-formula')
type SheetsFormulaUIModule = typeof import('@univerjs/sheets-formula-ui')
type SheetsGraphicsModule = typeof import('@univerjs/sheets-graphics')
type SheetsNoteModule = typeof import('@univerjs/sheets-note')
type SheetsNoteUIModule = typeof import('@univerjs/sheets-note-ui')
type SheetsNumfmtModule = typeof import('@univerjs/sheets-numfmt')
type SheetsNumfmtUIModule = typeof import('@univerjs/sheets-numfmt-ui')
type SheetsSortModule = typeof import('@univerjs/sheets-sort')
type SheetsSortUIModule = typeof import('@univerjs/sheets-sort-ui')
type SheetsTableModule = typeof import('@univerjs/sheets-table')
type SheetsTableUIModule = typeof import('@univerjs/sheets-table-ui')
type SheetsThreadCommentModule = typeof import('@univerjs/sheets-thread-comment')
type SheetsThreadCommentUIModule = typeof import('@univerjs/sheets-thread-comment-ui')
type SheetsUIModule = typeof import('@univerjs/sheets-ui')
type SheetsZenEditorModule = typeof import('@univerjs/sheets-zen-editor')
type ThreadCommentModule = typeof import('@univerjs/thread-comment')
type ThreadCommentUIModule = typeof import('@univerjs/thread-comment-ui')
type UIModule = typeof import('@univerjs/ui')
type AdapterModule = typeof import('./univer-adapter')
import type { ExcelLocale } from '@/i18n/types'

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

let univerBaseRuntimePromise: Promise<LoadedUniverBaseRuntime> | null = null
const univerRuntimePromises = new Map<ExcelLocale, Promise<LoadedUniverRuntime>>()

function loadUniverBaseRuntime(): Promise<LoadedUniverBaseRuntime> {
  if (!univerBaseRuntimePromise) {
    univerBaseRuntimePromise = (async () => {
      const [
        core,
        coreFacade,
        docs,
        docsUI,
        findReplace,
        formulaEngine,
        renderEngine,
        sheetsConditionalFormatting,
        sheetsConditionalFormattingUI,
        sheetsCrosshairHighlight,
        sheetsDataValidation,
        sheetsDataValidationUI,
        sheetsDrawing,
        sheetsDrawingUI,
        sheetsFilter,
        sheetsFilterUI,
        sheetsFindReplace,
        sheetsHyperLink,
        sheetsHyperLinkUI,
        sheets,
        sheetsFormula,
        sheetsFormulaUI,
        sheetsGraphics,
        sheetsNote,
        sheetsNoteUI,
        sheetsNumfmt,
        sheetsNumfmtUI,
        sheetsSort,
        sheetsSortUI,
        sheetsTable,
        sheetsTableUI,
        sheetsThreadComment,
        sheetsThreadCommentUI,
        sheetsUI,
        sheetsZenEditor,
        threadComment,
        threadCommentUI,
        ui,
        adapter,
      ] = await Promise.all([
        import('@univerjs/core'),
        import('@univerjs/core/facade'),
        import('@univerjs/docs'),
        import('@univerjs/docs-ui'),
        import('@univerjs/find-replace'),
        import('@univerjs/engine-formula'),
        import('@univerjs/engine-render'),
        import('@univerjs/sheets-conditional-formatting'),
        import('@univerjs/sheets-conditional-formatting-ui'),
        import('@univerjs/sheets-crosshair-highlight'),
        import('@univerjs/sheets-data-validation'),
        import('@univerjs/sheets-data-validation-ui'),
        import('@univerjs/sheets-drawing'),
        import('@univerjs/sheets-drawing-ui'),
        import('@univerjs/sheets-filter'),
        import('@univerjs/sheets-filter-ui'),
        import('@univerjs/sheets-find-replace'),
        import('@univerjs/sheets-hyper-link'),
        import('@univerjs/sheets-hyper-link-ui'),
        import('@univerjs/sheets'),
        import('@univerjs/sheets-formula'),
        import('@univerjs/sheets-formula-ui'),
        import('@univerjs/sheets-graphics'),
        import('@univerjs/sheets-note'),
        import('@univerjs/sheets-note-ui'),
        import('@univerjs/sheets-numfmt'),
        import('@univerjs/sheets-numfmt-ui'),
        import('@univerjs/sheets-sort'),
        import('@univerjs/sheets-sort-ui'),
        import('@univerjs/sheets-table'),
        import('@univerjs/sheets-table-ui'),
        import('@univerjs/sheets-thread-comment'),
        import('@univerjs/sheets-thread-comment-ui'),
        import('@univerjs/sheets-ui'),
        import('@univerjs/sheets-zen-editor'),
        import('@univerjs/thread-comment'),
        import('@univerjs/thread-comment-ui'),
        import('@univerjs/ui'),
        import('./univer-adapter'),
        import('@univerjs/find-replace/lib/index.css'),
        import('@univerjs/sheets-conditional-formatting-ui/lib/index.css'),
        import('@univerjs/sheets-crosshair-highlight/lib/index.css'),
        import('@univerjs/sheets-data-validation-ui/lib/index.css'),
        import('@univerjs/design/lib/index.css'),
        import('@univerjs/ui/lib/index.css'),
        import('@univerjs/docs-ui/lib/index.css'),
        import('@univerjs/sheets-drawing-ui/lib/index.css'),
        import('@univerjs/sheets-filter-ui/lib/index.css'),
        import('@univerjs/sheets-hyper-link-ui/lib/index.css'),
        import('@univerjs/sheets-note-ui/lib/index.css'),
        import('@univerjs/sheets-sort-ui/lib/index.css'),
        import('@univerjs/sheets-thread-comment-ui/lib/index.css'),
        import('@univerjs/thread-comment-ui/lib/index.css'),
        import('@univerjs/sheets-ui/lib/index.css'),
        import('@univerjs/sheets-formula-ui/lib/index.css'),
        import('@univerjs/sheets-numfmt-ui/lib/index.css'),
        import('@univerjs/sheets-table-ui/lib/index.css'),
        import('@univerjs/sheets-zen-editor/lib/index.css'),
        import('@univerjs/docs-ui/facade'),
        import('@univerjs/engine-formula/facade'),
        import('@univerjs/sheets-conditional-formatting/facade'),
        import('@univerjs/sheets-crosshair-highlight/facade'),
        import('@univerjs/sheets-data-validation/facade'),
        import('@univerjs/sheets-drawing/facade'),
        import('@univerjs/sheets-filter/facade'),
        import('@univerjs/sheets-hyper-link-ui/facade'),
        import('@univerjs/sheets/facade'),
        import('@univerjs/sheets-find-replace/facade'),
        import('@univerjs/sheets-formula/facade'),
        import('@univerjs/sheets-numfmt/facade'),
        import('@univerjs/sheets-table/facade'),
        import('@univerjs/sheets-ui/facade'),
        import('@univerjs/sheets-drawing-ui/facade'),
        import('@univerjs/sheets-zen-editor/facade'),
        import('@univerjs/ui/facade'),
      ])

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
    })()
  }

  return univerBaseRuntimePromise
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
      findReplace,
      conditionalFormattingUI,
      crosshairHighlight,
      dataValidation,
      dataValidationUI,
      design,
      docsUI,
      drawingUI,
      sheetsFilter,
      sheetsFilterUI,
      sheetsHyperLink,
      sheetsHyperLinkUI,
      sheets,
      sheetsFormulaUI,
      sheetsNoteUI,
      sheetsNumfmtUI,
      sheetsSortUI,
      sheetsTable,
      sheetsTableUI,
      sheetsThreadCommentUI,
      sheetsUI,
      zenEditor,
      threadCommentUI,
      ui,
    ]) => ({
      conditionalFormattingUI: conditionalFormattingUI.default,
      crosshairHighlight: crosshairHighlight.default,
      dataValidation: dataValidation.default,
      dataValidationUI: dataValidationUI.default,
      design: design.default,
      docsUI: docsUI.default,
      drawingUI: drawingUI.default,
      findReplace: findReplace.default,
      sheets: sheets.default,
      sheetsFilter: sheetsFilter.default,
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
      threadCommentUI: threadCommentUI.default,
      zenEditor: zenEditor.default,
      ui: ui.default,
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
    findReplace,
    conditionalFormattingUI,
    crosshairHighlight,
    dataValidation,
    dataValidationUI,
    design,
    docsUI,
    drawingUI,
    sheetsFilter,
    sheetsFilterUI,
    sheetsHyperLink,
    sheetsHyperLinkUI,
    sheets,
    sheetsFormulaUI,
    sheetsNoteUI,
    sheetsNumfmtUI,
    sheetsSortUI,
    sheetsTable,
    sheetsTableUI,
    sheetsThreadCommentUI,
    sheetsUI,
    zenEditor,
    threadCommentUI,
    ui,
  ]) => ({
    conditionalFormattingUI: conditionalFormattingUI.default,
    crosshairHighlight: crosshairHighlight.default,
    dataValidation: dataValidation.default,
    dataValidationUI: dataValidationUI.default,
    design: design.default,
    docsUI: docsUI.default,
    drawingUI: drawingUI.default,
    findReplace: findReplace.default,
    sheets: sheets.default,
    sheetsFilter: sheetsFilter.default,
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
    threadCommentUI: threadCommentUI.default,
    zenEditor: zenEditor.default,
    ui: ui.default,
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
