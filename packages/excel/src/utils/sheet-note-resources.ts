import type { IUiSheet, IWorkbook } from '../types'

export const SHEET_NOTE_PLUGIN = 'SHEET_NOTE_PLUGIN'

type SheetNote = {
  id: string
  row: number
  col: number
  note: string
  width?: number
  height?: number
  show?: boolean
}

type SheetNoteMap = Record<string, Record<string, SheetNote>>
type UnitNoteData = Record<string, SheetNoteMap>

function createNoteId(row: number, col: number): string {
  return `n${row}_${col}`
}

function asResourceList(resources: unknown): Array<{ name?: string; data?: string }> {
  if (Array.isArray(resources)) return resources
  return []
}

export function buildSheetNoteResources(
  workbook: IWorkbook,
): Array<{ name: string; data: string }> {
  const sheets = Array.isArray(workbook?.sheets) ? workbook.sheets : []
  const unitData: UnitNoteData = {}

  sheets.forEach((sheet) => {
    const subUnitId = String(sheet.id)
    const sheetNotes: SheetNoteMap = {}
    for (const [key, meta] of Object.entries(sheet.cellMeta || {})) {
      const comment = String(meta?.comment || '')
      if (!comment.trim()) continue
      const [rowText, colText] = key.split(':')
      const row = Number(rowText)
      const col = Number(colText)
      if (!Number.isFinite(row) || !Number.isFinite(col) || row < 0 || col < 0) continue
      if (!sheetNotes[row]) sheetNotes[row] = {}
      sheetNotes[row][col] = {
        id: createNoteId(row, col),
        row,
        col,
        note: comment,
      }
    }
    if (Object.keys(sheetNotes).length) {
      unitData[subUnitId] = sheetNotes
    }
  })

  if (!Object.keys(unitData).length) return []
  return [{
    name: SHEET_NOTE_PLUGIN,
    data: JSON.stringify(unitData),
  }]
}

/** 将 SHEET_NOTE_PLUGIN resources 写回各 sheet.cellMeta.comment */
export function applyNoteResourcesToSheets(
  sheets: IUiSheet[],
  resources: unknown,
): void {
  const list = asResourceList(resources)
  const noteResource = list.find(item => item?.name === SHEET_NOTE_PLUGIN)
  if (!noteResource?.data) return

  let unitData: UnitNoteData = {}
  try {
    unitData = JSON.parse(String(noteResource.data))
  } catch {
    return
  }
  if (!unitData || typeof unitData !== 'object') return

  sheets.forEach((sheet) => {
    const sheetNotes = unitData[String(sheet.id)]
    if (!sheetNotes || typeof sheetNotes !== 'object') return
    if (!sheet.cellMeta) sheet.cellMeta = {}

    // 先清掉仅由 note 产生、现已删除的 comment 较难判定；采用覆盖写入存在的 note
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
