import type { IEditorData, IElement } from '@vervedoc/docx-editor-schema'
import type { IDocxExportOptions, IDocxExportResult } from '../contract'

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64.replace(/^data:[^;]+;base64,/, ''))
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

function normalizeMainElements(data: IEditorData | IElement[]): IElement[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && Array.isArray((data as IEditorData).main)) {
    return (data as IEditorData).main || []
  }
  return []
}

/**
 * 将编辑器 JSON（IElement[] / IEditorData）写成本地 .docx ArrayBuffer
 */
export async function writeDocx(
  data: IEditorData | IElement[],
  options?: IDocxExportOptions
): Promise<IDocxExportResult> {
  try {
    const { Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, BorderStyle } =
      await import('docx')

    const children: any[] = []
    const mainData = normalizeMainElements(data)
    const defaultSize = options?.defaultSize ?? 10.5
    const defaultFont = options?.defaultFont || 'SimSun'
    let currentParagraph: any[] = []

    for (const element of mainData) {
      const marker =
        (element as any)?.extension && typeof (element as any).extension === 'object'
          ? (element as any).extension.bookmarkMarker
          : null
      if (marker?.name) continue

      if (element.value === '\n' || element.type === 'pageBreak') {
        if (currentParagraph.length > 0) {
          children.push(new Paragraph({ children: currentParagraph }))
          currentParagraph = []
        }
        if (element.type === 'pageBreak') {
          children.push(new Paragraph({ pageBreakBefore: true }))
        }
      } else if (element.type === 'image' && element.value) {
        if (currentParagraph.length > 0) {
          children.push(new Paragraph({ children: currentParagraph }))
          currentParagraph = []
        }
        try {
          const imageData = base64ToArrayBuffer(String(element.value))
          const width = element.width || 200
          const height = element.height || 200
          children.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: imageData,
                  transformation: { width, height },
                  type: 'png'
                })
              ]
            })
          )
        } catch (imgError) {
          console.warn('[docx-parser] 图片导出失败:', imgError)
        }
      } else if (element.type === 'table' && (element as any).trList) {
        if (currentParagraph.length > 0) {
          children.push(new Paragraph({ children: currentParagraph }))
          currentParagraph = []
        }
        try {
          const tableEl = element as any
          const normalizeBorderColor = (color: unknown): string => {
            if (typeof color !== 'string') return '000000'
            const c = color.trim()
            if (!c) return '000000'
            return c.startsWith('#') ? c.slice(1) : c
          }
          const getBorderStyle = (borderType: unknown): any => {
            const bt = borderType === 'dash' ? 'dash' : 'single'
            if (bt === 'dash') return (BorderStyle as any).DASHED ?? 'dashed'
            return (BorderStyle as any).SINGLE ?? 'single'
          }
          const noneBorderStyle = (BorderStyle as any).NONE ?? (BorderStyle as any).NIL ?? 'none'
          const toDocxBorderSize = (w: unknown): number => {
            const width = Number(w)
            if (!Number.isFinite(width) || width <= 0) return 8
            return Math.max(1, Math.round(width * 8))
          }
          const makeBorder = (payload: { style: any; size: number; color: string }) => ({
            style: payload.style,
            size: payload.size,
            color: payload.color
          })

          const borderType = tableEl.borderType ?? 'all'
          const borderColor = normalizeBorderColor(tableEl.borderColor)
          const baseBorderSize = toDocxBorderSize(tableEl.borderWidth)
          const externalBorderSize =
            tableEl.borderExternalWidth !== undefined
              ? toDocxBorderSize(tableEl.borderExternalWidth)
              : baseBorderSize
          const lineStyle = getBorderStyle(borderType)
          const noneBorder = makeBorder({ style: noneBorderStyle, size: 0, color: borderColor })
          const innerBorder = makeBorder({ style: lineStyle, size: baseBorderSize, color: borderColor })
          const outerBorder = makeBorder({ style: lineStyle, size: externalBorderSize, color: borderColor })

          const tableBorders =
            borderType === 'empty'
              ? {
                  top: noneBorder,
                  bottom: noneBorder,
                  left: noneBorder,
                  right: noneBorder,
                  insideHorizontal: noneBorder,
                  insideVertical: noneBorder
                }
              : borderType === 'external'
                ? {
                    top: outerBorder,
                    bottom: outerBorder,
                    left: outerBorder,
                    right: outerBorder,
                    insideHorizontal: noneBorder,
                    insideVertical: noneBorder
                  }
                : borderType === 'internal'
                  ? {
                      top: noneBorder,
                      bottom: noneBorder,
                      left: noneBorder,
                      right: noneBorder,
                      insideHorizontal: innerBorder,
                      insideVertical: innerBorder
                    }
                  : {
                      top: outerBorder,
                      bottom: outerBorder,
                      left: outerBorder,
                      right: outerBorder,
                      insideHorizontal: innerBorder,
                      insideVertical: innerBorder
                    }

          const rows = (tableEl.trList || []).map((tr: any) => {
            const cells = (tr.tdList || []).map((td: any) => {
              const cellContent = (td.value || []).map((item: any) => item.value || '').join('')
              const cellBorders =
                Array.isArray(td.borderTypes) && td.borderTypes.length
                  ? {
                      ...(td.borderTypes.includes('top') ? { top: innerBorder } : {}),
                      ...(td.borderTypes.includes('right') ? { right: innerBorder } : {}),
                      ...(td.borderTypes.includes('bottom') ? { bottom: innerBorder } : {}),
                      ...(td.borderTypes.includes('left') ? { left: innerBorder } : {})
                    }
                  : undefined
              return new TableCell({
                children: [new Paragraph({ children: [new TextRun(cellContent)] })],
                columnSpan: td.colspan || 1,
                rowSpan: td.rowspan || 1,
                ...(cellBorders ? { borders: cellBorders } : {})
              })
            })
            return new TableRow({ children: cells })
          })
          children.push(
            new Table({
              rows,
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: tableBorders
            })
          )
        } catch (tableError) {
          console.warn('[docx-parser] 表格导出失败:', tableError)
        }
      } else if (element.value) {
        const textRunOptions: any = {
          text: element.value,
          bold: element.bold,
          italics: element.italic,
          size: ((element as any).size || defaultSize) * 2,
          font: String((element as any).font || defaultFont).split(',')[0] || defaultFont,
          color: typeof (element as any).color === 'string' ? (element as any).color.replace('#', '') : undefined,
          underline: (element as any).underline ? {} : undefined,
          strike: (element as any).strikeout
        }
        if (
          (element as any).revisionType &&
          (element as any).revisionId &&
          ((element as any).revisionType === 'insert' || (element as any).revisionType === 'delete')
        ) {
          textRunOptions.revision = {
            id: (element as any).revisionId,
            author: (element as any).revisionAuthor || '',
            date: (element as any).revisionDate || '',
            type: (element as any).revisionType
          }
        }
        currentParagraph.push(new TextRun(textRunOptions))
      }
    }

    if (currentParagraph.length > 0) {
      children.push(new Paragraph({ children: currentParagraph }))
    }

    const doc = new Document({ sections: [{ children }] })
    const blob = await Packer.toBlob(doc)
    const arrayBuffer = await blob.arrayBuffer()
    return { success: true, data: arrayBuffer }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, error: message }
  }
}
