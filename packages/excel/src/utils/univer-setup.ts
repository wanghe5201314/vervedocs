import type { LocaleType, Univer as UniverType } from '@univerjs/core'
import type { LoadedUniverRuntime } from './univer-runtime'

/** 参与 mergeLocales 的 locale 模块（各语言使用同一集合，避免重复列举） */
const LOCALE_MODULE_KEYS = [
  'conditionalFormattingUI',
  'crosshairHighlight',
  'dataValidation',
  'dataValidationUI',
  'design',
  'ui',
  'docsUI',
  'drawingUI',
  'findReplace',
  'sheets',
  'sheetsFilter',
  'sheetsFilterUI',
  'sheetsHyperLink',
  'sheetsHyperLinkUI',
  'sheetsUI',
  'sheetsFormulaUI',
  'sheetsNoteUI',
  'sheetsNumfmtUI',
  'sheetsSortUI',
  'sheetsTable',
  'sheetsTableUI',
  'sheetsThreadCommentUI',
  'threadCommentUI',
  'zenEditor',
] as const satisfies ReadonlyArray<keyof LoadedUniverRuntime['locales']>

function mergeAllLocales(runtime: LoadedUniverRuntime) {
  return runtime.core.mergeLocales(
    ...LOCALE_MODULE_KEYS.map(key => runtime.locales[key])
  )
}

function registerCorePlugins(runtime: LoadedUniverRuntime, univer: UniverType, host: HTMLElement) {
  const p = runtime.plugins
  univer.registerPlugin(p.UniverRenderEnginePlugin)
  univer.registerPlugin(p.UniverFormulaEnginePlugin)
  univer.registerPlugin(p.UniverUIPlugin, {
    container: host,
    header: false,
    toolbar: false,
    footer: true,
    contextMenu: true,
  })
  univer.registerPlugin(p.UniverDocsPlugin)
  univer.registerPlugin(p.UniverDocsUIPlugin)
  univer.registerPlugin(p.UniverSheetsPlugin)
  univer.registerPlugin(p.UniverSheetsGraphicsPlugin)
  univer.registerPlugin(p.UniverSheetsDrawingPlugin)
  univer.registerPlugin(p.UniverSheetsTablePlugin)
  univer.registerPlugin(p.UniverSheetsDataValidationPlugin)
  univer.registerPlugin(p.UniverSheetsConditionalFormattingPlugin)
  univer.registerPlugin(p.UniverSheetsFilterPlugin)
  univer.registerPlugin(p.UniverSheetsSortPlugin)
  univer.registerPlugin(p.UniverSheetsHyperLinkPlugin)
  univer.registerPlugin(p.UniverSheetsNotePlugin)
  univer.registerPlugin(p.UniverThreadCommentPlugin)
  univer.registerPlugin(p.UniverSheetsThreadCommentPlugin)
  univer.registerPlugin(p.UniverFindReplacePlugin)
  univer.registerPlugin(p.UniverSheetsFindReplacePlugin)
  univer.registerPlugin(p.UniverSheetsUIPlugin, {
    footer: {
      addSheetButtonConfig: {
        show: true,
        defaultRowCount: 50,
        defaultColumnCount: 26,
      }
    }
  })
}

function registerFeaturePlugins(runtime: LoadedUniverRuntime, univer: UniverType) {
  const p = runtime.plugins
  univer.registerPlugin(p.UniverSheetsFormulaPlugin)
  univer.registerPlugin(p.UniverSheetsFormulaUIPlugin)
  univer.registerPlugin(p.UniverSheetsNumfmtPlugin)
  univer.registerPlugin(p.UniverSheetsNumfmtUIPlugin)
  univer.registerPlugin(p.UniverSheetsDrawingUIPlugin)
  univer.registerPlugin(p.UniverSheetsTableUIPlugin)
  univer.registerPlugin(p.UniverSheetsDataValidationUIPlugin)
  univer.registerPlugin(p.UniverSheetsConditionalFormattingUIPlugin)
  univer.registerPlugin(p.UniverSheetsFilterUIPlugin)
  univer.registerPlugin(p.UniverSheetsSortUIPlugin)
  univer.registerPlugin(p.UniverSheetsHyperLinkUIPlugin)
  univer.registerPlugin(p.UniverSheetsNoteUIPlugin)
  univer.registerPlugin(p.UniverThreadCommentUIPlugin)
  univer.registerPlugin(p.UniverSheetsThreadCommentUIPlugin)
  univer.registerPlugin(p.UniverSheetsCrosshairHighlightPlugin)
  univer.registerPlugin(p.UniverSheetsZenEditorPlugin)
}

/** 创建并配置 Univer 实例（不含 facade，由调用方 newAPI） */
export function createUniverInstance(
  runtime: LoadedUniverRuntime,
  host: HTMLElement,
  localeType: LocaleType,
): UniverType {
  const univer = new runtime.core.Univer({
    locale: localeType,
    locales: {
      [runtime.core.LocaleType.ZH_CN]: mergeAllLocales(runtime),
      [runtime.core.LocaleType.EN_US]: mergeAllLocales(runtime),
    },
  })
  registerCorePlugins(runtime, univer, host)
  registerFeaturePlugins(runtime, univer)
  return univer
}
