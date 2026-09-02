import type { IUiSheet, IWorkbook } from '../types'

/** 与 @vervedoc/excel 中 SHEET_NOTE_PLUGIN 保持同名，便于 resources 往返 */
export const SHEET_NOTE_PLUGIN = 'SHEET_NOTE_PLUGIN'

type NoteLike = { note?: string }
type SheetNoteMap = Record<string, Record<string, NoteLike>>
type UnitNoteData = Record<string, SheetNoteMap>

/**
 * 导出前把 resources 里的便签写回 cellMeta.comment，
 * 防止仅改了 Univer note 而未同步 meta 时丢失。
 */
export function applyNoteResourcesToWorkbook(data: IWorkbook): void {
  const resources = data?.resources
  const list = Array.isArray(resources) ? resources : []
  const noteResource = list.find((item: any) => item?.name === SHEET_NOTE_PLUGIN)
  if (!noteResource?.data) return

  let unitData: UnitNoteData
  try {
    unitData = JSON.parse(String(noteResource.data))
  } catch {
    return
  }
  if (!unitData || typeof unitData !== 'object') return

  const sheets: IUiSheet[] = Array.isArray(data?.sheets) ? data.sheets : []
  sheets.forEach((sheet) => {
    const sheetNotes = unitData[String(sheet.id)]
    if (!sheetNotes || typeof sheetNotes !== 'object') return
    if (!sheet.cellMeta) sheet.cellMeta = {}
    for (const [rowText, colNotes] of Object.entries(sheetNotes)) {
      if (!colNotes || typeof colNotes !== 'object') continue
      for (const [colText, note] of Object.entries(colNotes)) {
        const row = Number(rowText)
        const col = Number(colText)
        if (!Number.isFinite(row) || !Number.isFinite(col)) continue
        const text = String(note?.note || '')
        if (!text.trim()) continue
        const key = `${row}:${col}`
        sheet.cellMeta[key] = {
          ...(sheet.cellMeta[key] || {}),
          comment: text,
        }
      }
    }
  })
}
