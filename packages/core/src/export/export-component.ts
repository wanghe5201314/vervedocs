type Draw = any
type Command = any

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

/**
 * HTML 预览组件（不含 docx 导出）。
 * .docx 导入/导出请通过宿主注入 DocxImportCallback / DocxExportCallback。
 */
export class ExportComponent {
  private _command: Command | null = null

  public install(draw: Draw, command: Command): this {
    this._command = command

    const structureAdapter = (draw as any).__structureAdapter
    if (structureAdapter) {
      structureAdapter.previewHtml = this.previewHtml.bind(this)
      structureAdapter.exportDocx = async () => {
        console.warn(
          '[ExportComponent] 内置 docx 导出已移除，请注入 WordEditor.exportCallback（如 @vervedoc/docx-parser）'
        )
        return null
      }
    }

    return this
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
