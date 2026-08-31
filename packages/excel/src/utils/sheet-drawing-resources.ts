import { DrawingTypeEnum, ImageSourceType } from '@univerjs/core'
import type { ISheetFloatingImage, ISheetImageAnchor, IUiSheet, IWorkbook } from '@vervedoc/excel-parser'

export const SHEET_DRAWING_PLUGIN = 'SHEET_DRAWING_PLUGIN'

const DEFAULT_COL_WIDTH = 73
const DEFAULT_ROW_HEIGHT = 19
const EMU_PER_PIXEL = 914400 / 96

function emuToPx(emu: number): number {
  return Number(emu || 0) / EMU_PER_PIXEL
}

function mapAnchorType(editAs?: string): string {
  const value = String(editAs || 'oneCell').toLowerCase()
  if (value === 'twocell') return '1'
  if (value === 'absolute') return '2'
  return '0'
}

function getColumnWidth(sheet: IUiSheet, col: number): number {
  const width = sheet.colWidths?.[col]
  return Number.isFinite(width) ? Number(width) : DEFAULT_COL_WIDTH
}

function getRowHeight(sheet: IUiSheet, row: number): number {
  const height = sheet.rowHeights?.[row]
  return Number.isFinite(height) ? Number(height) : DEFAULT_ROW_HEIGHT
}

function axisOffset(sheet: IUiSheet, axis: 'col' | 'row', index: number): number {
  let total = 0
  if (axis === 'col') {
    for (let i = 0; i < index; i++) total += getColumnWidth(sheet, i)
    return total
  }
  for (let i = 0; i < index; i++) total += getRowHeight(sheet, i)
  return total
}

function toUniverAnchor(sheet: IUiSheet, anchor: ISheetImageAnchor) {
  return {
    column: anchor.col,
    row: anchor.row,
    columnOffset: emuToPx(anchor.colOff),
    rowOffset: emuToPx(anchor.rowOff),
  }
}

function toAbsolutePoint(sheet: IUiSheet, anchor: ISheetImageAnchor) {
  const univerAnchor = toUniverAnchor(sheet, anchor)
  return {
    x: axisOffset(sheet, 'col', univerAnchor.column) + univerAnchor.columnOffset,
    y: axisOffset(sheet, 'row', univerAnchor.row) + univerAnchor.rowOffset,
  }
}

function buildSheetTransform(sheet: IUiSheet, image: ISheetFloatingImage) {
  return {
    from: toUniverAnchor(sheet, image.from),
    to: toUniverAnchor(sheet, image.to),
  }
}

function buildTransform(sheet: IUiSheet, image: ISheetFloatingImage) {
  const start = toAbsolutePoint(sheet, image.from)
  const end = toAbsolutePoint(sheet, image.to)
  const width = Math.max(1, end.x - start.x)
  const height = Math.max(1, end.y - start.y)
  return {
    left: start.x,
    top: start.y,
    width,
    height,
    angle: 0,
    flipX: false,
    flipY: false,
    skewX: 0,
    skewY: 0,
  }
}

function buildSheetDrawing(unitId: string, sheet: IUiSheet, image: ISheetFloatingImage) {
  const sheetTransform = buildSheetTransform(sheet, image)
  const transform = buildTransform(sheet, image)
  return {
    unitId,
    subUnitId: sheet.id,
    drawingId: image.id,
    drawingType: DrawingTypeEnum.DRAWING_IMAGE,
    imageSourceType: ImageSourceType.BASE64,
    source: image.dataUrl,
    transform,
    sheetTransform,
    axisAlignSheetTransform: sheetTransform,
    anchorType: mapAnchorType(image.anchorType),
  }
}

type DrawingUnitData = {
  data: Record<string, ReturnType<typeof buildSheetDrawing>>
  order: string[]
}

export function buildSheetDrawingResources(
  workbook: IWorkbook,
  unitId: string,
): Array<{ name: string; data: string }> {
  const sheets = Array.isArray(workbook?.sheets) ? workbook.sheets : []
  const unitData: Record<string, DrawingUnitData> = {}

  sheets.forEach((sheet) => {
    const images = Array.isArray(sheet?.images) ? sheet.images : []
    if (!images.length) return
    const subUnitId = String(sheet.id)
    if (!unitData[subUnitId]) {
      unitData[subUnitId] = { data: {}, order: [] }
    }
    images.forEach((image) => {
      const drawing = buildSheetDrawing(unitId, sheet, image)
      unitData[subUnitId].data[drawing.drawingId] = drawing
      unitData[subUnitId].order.push(drawing.drawingId)
    })
  })

  if (!Object.keys(unitData).length) return []

  // Univer loadResources 会按 unitId 调用 onLoad(unitId, model)，
  // model 应为 Record<subUnitId, { data, order }>，不能再包一层 unitId。
  return [{
    name: SHEET_DRAWING_PLUGIN,
    data: JSON.stringify(unitData),
  }]
}

export function mergeWorkbookResources(
  existing: unknown,
  drawingResources: Array<{ name: string; data: string }>,
): Array<{ name: string; data: string }> {
  const base = Array.isArray(existing) ? [...existing] : []
  drawingResources.forEach((resource) => {
    const index = base.findIndex(item => item?.name === resource.name)
    if (index >= 0) base[index] = resource
    else base.push(resource)
  })
  return base
}
