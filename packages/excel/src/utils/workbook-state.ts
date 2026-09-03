import type { Align, ICellStyle, IUiSheet, IWorkbook } from '../types'
import { cellKey } from './cell'
import { normalizeFontFamily } from './font-family'

export const DEFAULT_SHEET_ROWS = 50
export const DEFAULT_SHEET_COLS = 26

export interface IWorkbookStateOptions {
  /** 默认工作表名（与 parser 回调模式一致），如 index => `工作表${index + 1}` */
  defaultSheetName?: (index: number) => string
  /** 字体族归一化（如映射到工具栏可选字体），默认仅做 normalizeFontFamily */
  resolveFontFamily?: (fontFamily: string) => string
}

/** 判断任意输入是否含有可用的工作簿内容（data 数组 / data.sheets / sheets） */
export function hasUsableWorkbookContent(input: any): boolean {
  if (!input || typeof input !== 'object') return false
  if (Array.isArray(input?.data)) {
    return input.data.length > 0
  }
  if (input?.data && typeof input.data === 'object' && Array.isArray(input.data?.sheets)) {
    return input.data.sheets.length > 0
  }
  if (Array.isArray(input?.sheets)) {
    return input.sheets.length > 0
  }
  return false
}

function cloneDeep<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function cloneResources(resources: any): Record<string, any> | undefined {
  return resources && typeof resources === 'object' ? cloneDeep(resources) : undefined
}

function defaultName(options: IWorkbookStateOptions | undefined, index: number): string {
  return options?.defaultSheetName?.(index) || `工作表${index + 1}`
}

export function createDefaultSheet(index: number, options?: IWorkbookStateOptions): IUiSheet {
  return {
    id: String(index),
    name: defaultName(options, index),
    rowCount: DEFAULT_SHEET_ROWS,
    colCount: DEFAULT_SHEET_COLS,
    cells: {},
    styles: {},
    cellMeta: {},
    merges: [],
    colWidths: {},
    rowHeights: {},
    hiddenCols: {},
    hiddenRows: {},
    frozenCols: 0,
    frozenRows: 0,
    filterColumn: null,
    filterKeyword: '',
    filterSelectedValues: {},
    filterActive: false
  }
}

/** 内部 IWorkbook sheet 结构 → IUiSheet（补齐缺省字段，深拷贝可变部分） */
export function fromInternalSheet(sheet: any, index: number, options?: IWorkbookStateOptions): IUiSheet {
  return {
    id: String(sheet?.id || sheet?.meta?.id || index),
    name: String(sheet?.name || sheet?.meta?.name || defaultName(options, index)),
    rowCount: Number(sheet?.rowCount || sheet?.meta?.rowCount || DEFAULT_SHEET_ROWS),
    colCount: Number(sheet?.colCount || sheet?.meta?.colCount || DEFAULT_SHEET_COLS),
    cells: { ...(sheet?.cells || {}) },
    styles: { ...(sheet?.styles || {}) },
    cellRichTexts: sheet?.cellRichTexts
      ? cloneDeep(sheet.cellRichTexts)
      : undefined,
    cellMeta: { ...(sheet?.cellMeta || {}) },
    merges: Array.isArray(sheet?.merges) ? [...sheet.merges] : [],
    colWidths: { ...(sheet?.colWidths || {}) },
    rowHeights: { ...(sheet?.rowHeights || {}) },
    hiddenCols: { ...(sheet?.hiddenCols || {}) },
    hiddenRows: { ...(sheet?.hiddenRows || {}) },
    frozenCols: Number(sheet?.frozenCols || 0),
    frozenRows: Number(sheet?.frozenRows || 0),
    images: Array.isArray(sheet?.images) ? cloneDeep(sheet.images) : undefined,
    filterColumn: Number.isFinite(sheet?.filterColumn) ? Number(sheet.filterColumn) : null,
    filterKeyword: String(sheet?.filterKeyword || ''),
    filterSelectedValues: { ...(sheet?.filterSelectedValues || {}) },
    filterActive: !!sheet?.filterActive
  }
}

/** FortuneSheet 记录（celldata 数组）→ IUiSheet */
export function fromFortuneSheetRecord(sheet: any, index: number, options?: IWorkbookStateOptions): IUiSheet {
  const cells: Record<string, string> = {}
  const styles: Record<string, ICellStyle> = {}
  const celldata = Array.isArray(sheet?.celldata) ? sheet.celldata : []
  celldata.forEach((item: any) => {
    const r = Number(item?.r)
    const c = Number(item?.c)
    const cell = item?.v
    if (!Number.isFinite(r) || !Number.isFinite(c)) return
    const key = cellKey(r, c)
    cells[key] = String(cell?.m ?? cell?.v ?? '')
    const rawFontFamily = String(cell?.ff || '')
    const fontFamily = options?.resolveFontFamily
      ? options.resolveFontFamily(rawFontFamily)
      : normalizeFontFamily(rawFontFamily) || rawFontFamily
    styles[key] = {
      bold: !!cell?.bl,
      italic: !!cell?.it,
      underline: !!cell?.un,
      align: (cell?.ht || 'left') as Align,
      fontFamily,
      fontSize: Number(cell?.fs || 12)
    }
  })
  return {
    id: String(sheet?.id || sheet?.index || index),
    name: String(sheet?.name || defaultName(options, index)),
    rowCount: Number(sheet?.row || DEFAULT_SHEET_ROWS),
    colCount: Number(sheet?.column || DEFAULT_SHEET_COLS),
    cells,
    styles,
    cellMeta: {},
    colWidths: {},
    rowHeights: {},
    hiddenCols: {},
    hiddenRows: {},
    frozenCols: 0,
    frozenRows: 0,
    filterColumn: null,
    filterKeyword: '',
    filterSelectedValues: {},
    filterActive: false
  }
}

/**
 * 归一化外部输入为 IWorkbook。
 * 支持三种形态：FortuneSheet 记录数组（data: []）、内部结构（data.sheets / sheets）。
 */
export function normalizeWorkbook(input: any, options?: IWorkbookStateOptions): IWorkbook {
  if (input && typeof input === 'object') {
    if (Array.isArray(input?.data)) {
      return {
        version: Number(input?.version || 1),
        resources: undefined,
        sheets: input.data.map((sheet: any, i: number) => fromFortuneSheetRecord(sheet, i, options))
      }
    }
    if (input?.data && typeof input.data === 'object' && Array.isArray(input.data?.sheets)) {
      return {
        version: Number(input?.version || 1),
        resources: cloneResources(input.data?.resources),
        sheets: input.data.sheets.map((sheet: any, i: number) => fromInternalSheet(sheet, i, options))
      }
    }
    if (Array.isArray(input?.sheets)) {
      return {
        version: Number(input?.version || 1),
        resources: cloneResources(input?.resources),
        sheets: input.sheets.map((sheet: any, i: number) => fromInternalSheet(sheet, i, options))
      }
    }
  }
  return { version: 1, resources: undefined, sheets: [createDefaultSheet(0, options)] }
}
