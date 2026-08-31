import { resolveImageMimeType } from '../utils/image-formats'
import type { ISheetFloatingImage, ISheetImageAnchor } from '../types'
import { bufferToDataUrl } from '../utils/binary'

function readAnchor(anchor: any): ISheetImageAnchor | null {
  if (!anchor || typeof anchor !== 'object') return null
  const col = Number(anchor.nativeCol ?? anchor.col ?? anchor.column)
  const row = Number(anchor.nativeRow ?? anchor.row)
  if (!Number.isFinite(col) || !Number.isFinite(row) || col < 0 || row < 0) return null
  return {
    col,
    row,
    colOff: Number(anchor.nativeColOff ?? anchor.colOff ?? anchor.columnOffset ?? 0),
    rowOff: Number(anchor.nativeRowOff ?? anchor.rowOff ?? anchor.rowOffset ?? 0),
  }
}

export function parseWorksheetImages(
  worksheet: any,
  workbook: any,
  sheetIndex: number,
): ISheetFloatingImage[] {
  const getImages = worksheet?.getImages
  if (typeof getImages !== 'function') return []
  const imageList = getImages.call(worksheet)
  if (!Array.isArray(imageList) || imageList.length === 0) return []

  const result: ISheetFloatingImage[] = []
  imageList.forEach((image: any, imageIndex: number) => {
    if (String(image?.type || 'image') !== 'image') return
    const media = typeof workbook?.getImage === 'function'
      ? workbook.getImage(Number(image?.imageId))
      : null
    const dataUrl = bufferToDataUrl(media?.buffer, resolveImageMimeType(media?.extension))
    if (!dataUrl) return

    const from = readAnchor(image?.range?.tl)
    const to = readAnchor(image?.range?.br)
    if (!from || !to) return

    result.push({
      id: `img-${sheetIndex}-${imageIndex}`,
      name: String(image?.name || `图片${imageIndex + 1}`),
      mimeType: resolveImageMimeType(media?.extension),
      dataUrl,
      from,
      to,
      anchorType: String(image?.range?.editAs || image?.editAs || 'oneCell'),
    })
  })
  return result
}
