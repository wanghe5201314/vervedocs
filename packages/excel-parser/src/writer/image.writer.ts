import { resolveImageExtension } from '../utils/image-formats'
import type { ISheetFloatingImage, ISheetImageAnchor, IUiSheet } from '../types'
import { dataUrlToBuffer } from '../utils/binary'

function toExcelAnchor(anchor: ISheetImageAnchor) {
  return {
    col: anchor.col,
    row: anchor.row,
    nativeCol: anchor.col,
    nativeRow: anchor.row,
    nativeColOff: Number(anchor.colOff || 0),
    nativeRowOff: Number(anchor.rowOff || 0),
  }
}

function normalizeEditAs(anchorType?: string): string {
  const value = String(anchorType || 'oneCell').toLowerCase()
  if (value === 'twocell' || value === 'twoCell') return 'twoCell'
  if (value === 'absolute') return 'absolute'
  return 'oneCell'
}

function writeWorksheetImage(workbook: any, worksheet: any, image: ISheetFloatingImage) {
  const bytes = dataUrlToBuffer(image.dataUrl)
  if (!bytes) return
  const extension = resolveImageExtension(image.mimeType)
  const imageId = workbook.addImage({ buffer: bytes, extension })
  worksheet.addImage(imageId, {
    tl: toExcelAnchor(image.from),
    br: toExcelAnchor(image.to),
    editAs: normalizeEditAs(image.anchorType),
  })
}

export function writeWorksheetImages(workbook: any, worksheet: any, sheet: IUiSheet) {
  const images = Array.isArray(sheet?.images) ? sheet.images : []
  images.forEach((image) => {
    if (!image?.dataUrl || !image?.from || !image?.to) return
    writeWorksheetImage(workbook, worksheet, image)
  })
}
