type Draw = any
type Command = any

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64.replace(/^data:[^;]+;base64,/, ''))
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function generateTableHtml(element: any): string {
  if (!element.trList || !Array.isArray(element.trList)) return ''

  const borderWidth = Number.isFinite(Number(element.borderWidth)) ? Number(element.borderWidth) : 1
  const borderColor = typeof element.borderColor === 'string' && element.borderColor ? element.borderColor : '#000000'
  const borderStyle = element.borderType === 'dash' ? 'dashed' : 'solid'
  const isEmpty = element.borderType === 'empty'
  const isExternal = element.borderType === 'external'
  const tableBorderStyle = isEmpty
    ? 'border: none;'
    : isExternal
      ? `border: ${borderWidth}px ${borderStyle} ${borderColor};`
      : 'border: none;'
  const tdBorderStyle = isEmpty
    ? 'border: none;'
    : isExternal
      ? 'border: none;'
      : `border: ${borderWidth}px ${borderStyle} ${borderColor};`

  let html = `<table style="border-collapse: collapse; width: 100%; ${tableBorderStyle}">`
  for (const tr of element.trList) {
    html += '<tr>'
    if (tr.tdList && Array.isArray(tr.tdList)) {
      for (const td of tr.tdList) {
        const colspan = td.colspan ? ` colspan="${td.colspan}"` : ''
        const rowspan = td.rowspan ? ` rowspan="${td.rowspan}"` : ''
        html += `<td${colspan}${rowspan} style="${tdBorderStyle} padding: 4px 8px;">`
        if (td.value && Array.isArray(td.value)) {
          for (const item of td.value) {
            if (item.value) html += escapeHtml(item.value)
          }
        }
        html += '</td>'
      }
    }
    html += '</tr>'
  }
  html += '</table>'
  return html
}

export class ExportComponent {
  private _command: Command | null = null

  public install(draw: Draw, command: Command): this {
    this._command = command

    const structureAdapter = (draw as any).__structureAdapter
    if (structureAdapter) {
      structureAdapter.exportDocx = this.exportDocx.bind(this)
      structureAdapter.previewHtml = this.previewHtml.bind(this)
    }

    return this
  }

  public async exportDocx(payload?: any): Promise<Blob | null> {
    const callback = payload?.callback
    try {
      const result = this._command.getValue()
      const { Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, BorderStyle } = await import('docx')

      const children: any[] = []
      const mainData = result.data.main || []
      let currentParagraph: any[] = []

      for (const element of mainData) {
        const marker = (element as any)?.extension && typeof (element as any).extension === 'object' ? (element as any).extension.bookmarkMarker : null
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
            const imageData = base64ToArrayBuffer(element.value)
            const width = element.width || 200
            const height = element.height || 200
            children.push(new Paragraph({
              children: [
                new ImageRun({
                  data: imageData,
                  transformation: { width, height },
                  type: 'png'
                })
              ]
            }))
          } catch (imgError) {
            console.warn('[ExportComponent] 图片导出失败:', imgError)
          }
        } else if (element.type === 'table' && element.trList) {
          if (currentParagraph.length > 0) {
            children.push(new Paragraph({ children: currentParagraph }))
            currentParagraph = []
          }
          try {
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

            const borderType = element.borderType ?? 'all'
            const borderColor = normalizeBorderColor(element.borderColor)
            const baseBorderSize = toDocxBorderSize(element.borderWidth)
            const externalBorderSize = element.borderExternalWidth !== undefined ? toDocxBorderSize(element.borderExternalWidth) : baseBorderSize
            const lineStyle = getBorderStyle(borderType)
            const noneBorder = makeBorder({ style: noneBorderStyle, size: 0, color: borderColor })
            const innerBorder = makeBorder({ style: lineStyle, size: baseBorderSize, color: borderColor })
            const outerBorder = makeBorder({ style: lineStyle, size: externalBorderSize, color: borderColor })

            const tableBorders =
              borderType === 'empty'
                ? { top: noneBorder, bottom: noneBorder, left: noneBorder, right: noneBorder, insideHorizontal: noneBorder, insideVertical: noneBorder }
                : borderType === 'external'
                  ? { top: outerBorder, bottom: outerBorder, left: outerBorder, right: outerBorder, insideHorizontal: noneBorder, insideVertical: noneBorder }
                  : borderType === 'internal'
                    ? { top: noneBorder, bottom: noneBorder, left: noneBorder, right: noneBorder, insideHorizontal: innerBorder, insideVertical: innerBorder }
                    : { top: outerBorder, bottom: outerBorder, left: outerBorder, right: outerBorder, insideHorizontal: innerBorder, insideVertical: innerBorder }

            const rows = element.trList.map((tr: any) => {
              const cells = (tr.tdList || []).map((td: any) => {
                const cellContent = (td.value || []).map((item: any) => item.value || '').join('')
                const cellBorders = Array.isArray(td.borderTypes) && td.borderTypes.length
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
            children.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE }, borders: tableBorders }))
          } catch (tableError) {
            console.warn('[ExportComponent] 表格导出失败:', tableError)
          }
        } else if (element.value) {
          const textRunOptions: any = {
            text: element.value,
            bold: element.bold,
            italics: element.italic,
            size: (element.size || 10.5) * 2,
            font: element.font?.split(',')[0] || 'SimSun',
            color: element.color?.replace('#', ''),
            underline: element.underline ? {} : undefined,
            strike: element.strikeout
          }
          if (element.revisionType && element.revisionId) {
            textRunOptions.revision = {
              id: element.revisionId,
              author: element.revisionAuthor || '',
              date: element.revisionDate || '',
              type: element.revisionType === 'insert' ? 'insert' : 'delete'
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
      if (callback) callback(blob)
      return blob
    } catch (error) {
      console.error('[ExportComponent] 导出 Docx 失败:', error)
      return null
    }
  }

  public previewHtml(payload?: any): string {
    const callback = payload?.callback
    try {
      const result = this._command.getValue()
      const mainData = result.data.main || []
      let html = ''

      for (const element of mainData) {
        if (element.value === '\n') {
          html += '<br>'
        } else if (element.type === 'pageBreak') {
          html += '<div style="page-break-after: always;"></div>'
        } else if (element.type === 'image' && element.value) {
          html += `<img src="${element.value}" style="max-width: 100%; height: auto;" />`
        } else if (element.type === 'table') {
          html += generateTableHtml(element)
        } else if (element.value) {
          const styles: string[] = []
          if (element.bold) styles.push('font-weight: bold')
          if (element.italic) styles.push('font-style: italic')
          if (element.underline) styles.push('text-decoration: underline')
          if (element.strikeout) styles.push('text-decoration: line-through')
          if (element.color) styles.push(`color: ${element.color}`)
          if (element.highlight) styles.push(`background-color: ${element.highlight}`)
          if (element.size) styles.push(`font-size: ${element.size}px`)
          if (element.font) styles.push(`font-family: ${element.font}`)
          const styleStr = styles.length > 0 ? ` style="${styles.join('; ')}"` : ''
          html += `<span${styleStr}>${escapeHtml(element.value)}</span>`
        }
      }

      if (callback) callback(html)
      return html
    } catch (error) {
      console.error('[ExportComponent] 预览 HTML 失败:', error)
      if (callback) callback('<p>预览失败</p>')
      return '<p>预览失败</p>'
    }
  }
}
