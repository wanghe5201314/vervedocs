import type { ICellMeta } from '../types'

/**
 * 从 ExcelJS reconcile 结果采集批注，避免二次解压。
 *
 * ExcelJS 会解析 commentsN.xml，但空单元格会被标成 Merge，
 * 在落到 Document Cell 时被丢弃，导致 cell.note 为空。
 * 因此在 reconcile 之后、model 落地之前把 comment 捞出来。
 */

export type SheetCommentMap = Record<string, string>

function parseCellAddress(address: string): { r: number; c: number } | null {
  const match = String(address || '').match(/^([A-Z]+)(\d+)$/i)
  if (!match) return null
  const colText = match[1].toUpperCase()
  const row = Number(match[2]) - 1
  if (!Number.isFinite(row) || row < 0) return null
  let col = 0
  for (let i = 0; i < colText.length; i++) {
    col = col * 26 + (colText.charCodeAt(i) - 64)
  }
  col -= 1
  if (col < 0) return null
  return { r: row, c: col }
}

/** 拼接批注全文（含作者行），不做语义裁剪 */
export function commentModelToText(comment: unknown): string {
  if (!comment) return ''
  if (typeof comment === 'string') return comment
  if (typeof comment !== 'object') return ''

  const root = comment as { note?: unknown; texts?: Array<{ text?: unknown }> }
  const note = root.note !== undefined ? root.note : root

  if (typeof note === 'string') return note
  if (note && typeof note === 'object') {
    const texts = (note as { texts?: Array<{ text?: unknown }> }).texts
    if (Array.isArray(texts)) {
      return texts.map(part => String(part?.text ?? '')).join('')
    }
  }
  if (Array.isArray(root.texts)) {
    return root.texts.map(part => String(part?.text ?? '')).join('')
  }
  return ''
}

function collectCommentsFromWorksheetModel(ws: any): SheetCommentMap {
  const result: SheetCommentMap = {}
  const rows = Array.isArray(ws?.rows) ? ws.rows : []
  for (const row of rows) {
    const cells = Array.isArray(row?.cells) ? row.cells : []
    for (const cell of cells) {
      const text = commentModelToText(cell?.comment)
      if (!text) continue
      const pos = parseCellAddress(String(cell?.address || cell?.ref || ''))
      if (!pos) continue
      result[`${pos.r}:${pos.c}`] = text
    }
  }
  return result
}

/**
 * 在 workbook.xlsx.load 前安装钩子，load 结束后调用返回的函数取回批注。
 * key 为 sheet 在 model.worksheets 中的下标（与 workbook.worksheets 顺序一致）。
 */
export function installExcelJsCommentHarvest(workbook: any): () => Map<number, SheetCommentMap> {
  const xlsx = workbook?.xlsx
  if (!xlsx || typeof xlsx.reconcile !== 'function') {
    return () => new Map()
  }

  const harvested = new Map<number, SheetCommentMap>()
  const originalReconcile = xlsx.reconcile.bind(xlsx)

  xlsx.reconcile = (model: any, options: any) => {
    originalReconcile(model, options)
    harvested.clear()
    const worksheets = Array.isArray(model?.worksheets) ? model.worksheets : []
    worksheets.forEach((ws: any, index: number) => {
      const comments = collectCommentsFromWorksheetModel(ws)
      if (Object.keys(comments).length) {
        harvested.set(index, comments)
      }
    })
  }

  return () => {
    xlsx.reconcile = originalReconcile
    return harvested
  }
}

/** 将采集到的批注合并进 sheet.cellMeta */
export function mergeCommentsIntoCellMeta(
  cellMeta: Record<string, ICellMeta>,
  comments?: SheetCommentMap,
): void {
  if (!comments) return
  for (const [key, text] of Object.entries(comments)) {
    if (!text) continue
    const current = cellMeta[key] || {}
    cellMeta[key] = {
      ...current,
      comment: text,
    }
  }
}
