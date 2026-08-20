import { nanoid } from 'nanoid'
import { NS_A, NS_P, emuToCanvas, ptToCanvasPx } from '../constants'
import { getFirstChildByTag, getChildrenByTag, forEachChild, getAttr, findFirstDescendant, getColorElement } from '../xml.helper'
import { resolveColor, resolveOutline } from '../color.resolver'
import { parseTransform, parseTextBody } from './text.parser'
import type { PptxSlideContext } from '../types'
import type { PPTTableElement, TableCell, TableCellStyle, TableTheme } from '@/types/slides'

/**
 * Parse a p:graphicFrame containing a:tbl as a PPTTableElement.
 */
export function parseTableElement(graphicFrameEl: Element, context: PptxSlideContext): PPTTableElement | null {
  // Get transform from the graphic frame (uses p: namespace for xfrm)
  const xfrmEl = findFirstDescendant(graphicFrameEl, NS_P, 'xfrm')
    || findFirstDescendant(graphicFrameEl, NS_A, 'xfrm')
  
  let left = 0, top = 0, width = 400, height = 200

  if (xfrmEl) {
    const offEl = getFirstChildByTag(xfrmEl, NS_A, 'off')
    const extEl = getFirstChildByTag(xfrmEl, NS_A, 'ext')
    if (offEl && extEl) {
      left = emuToCanvas(Number(getAttr(offEl, 'x') || 0), context.slideWidthEmu)
      top = emuToCanvas(Number(getAttr(offEl, 'y') || 0), context.slideWidthEmu)
      width = emuToCanvas(Number(getAttr(extEl, 'cx') || 0), context.slideWidthEmu)
      height = emuToCanvas(Number(getAttr(extEl, 'cy') || 0), context.slideWidthEmu)
    }
  }

  // Find the table element
  const tbl = findFirstDescendant(graphicFrameEl, NS_A, 'tbl')
  if (!tbl) return null

  // Parse column widths from tblGrid
  const tblGrid = getFirstChildByTag(tbl, NS_A, 'tblGrid')
  const colWidths: number[] = []
  
  if (tblGrid) {
    const gridCols = getChildrenByTag(tblGrid, NS_A, 'gridCol')
    let totalWidth = 0
    const rawWidths: number[] = []
    
    for (const col of gridCols) {
      const w = Number(getAttr(col, 'w') || 0)
      rawWidths.push(w)
      totalWidth += w
    }
    
    // Convert to percentage using largest remainder method to ensure sum === 100
    if (totalWidth > 0) {
      const exact = rawWidths.map(w => (w / totalWidth) * 100)
      const floored = exact.map(v => Math.floor(v))
      let remainder = 100 - floored.reduce((a, b) => a + b, 0)
      const remainders = exact.map((v, i) => ({ i, r: v - floored[i] }))
      remainders.sort((a, b) => b.r - a.r)
      for (let j = 0; j < remainder; j++) {
        floored[remainders[j].i]++
      }
      colWidths.push(...floored)
    } else {
      const base = Math.floor(100 / rawWidths.length)
      let extra = 100 - base * rawWidths.length
      for (let j = 0; j < rawWidths.length; j++) {
        colWidths.push(base + (j < extra ? 1 : 0))
      }
    }
  }

  // Parse table properties for theme
  let tableTheme: TableTheme | undefined
  const tblPr = getFirstChildByTag(tbl, NS_A, 'tblPr')
  if (tblPr) {
    const bandRow = getAttr(tblPr, 'bandRow') === '1'
    const firstRow = getAttr(tblPr, 'firstRow') === '1'
    const lastRow = getAttr(tblPr, 'lastRow') === '1'
    const firstCol = getAttr(tblPr, 'firstCol') === '1'
    const lastCol = getAttr(tblPr, 'lastCol') === '1'

    if (firstRow || lastRow || firstCol || lastCol) {
      tableTheme = {
        color: context.theme.colors.accent1,
        rowHeader: firstRow,
        rowFooter: lastRow,
        colHeader: firstCol,
        colFooter: lastCol,
      }
    }
  }

  // Parse rows
  const rows = getChildrenByTag(tbl, NS_A, 'tr')
  const data: TableCell[][] = []

  for (const tr of rows) {
    const rowCells: TableCell[] = []
    const cells = getChildrenByTag(tr, NS_A, 'tc')

    for (const tc of cells) {
      const colspan = Number(getAttr(tc, 'gridSpan') || 1)
      const rowspan = Number(getAttr(tc, 'rowSpan') || 1)
      const hMerge = getAttr(tc, 'hMerge') === '1'
      const vMerge = getAttr(tc, 'vMerge') === '1'

      // Parse text content
      const txBody = getFirstChildByTag(tc, NS_A, 'txBody')
      let text = ''
      if (txBody) {
        const paragraphs = getChildrenByTag(txBody, NS_A, 'p')
        const lines: string[] = []
        for (const p of paragraphs) {
          const runs = getChildrenByTag(p, NS_A, 'r')
          const lineText = runs.map(r => {
            const t = getFirstChildByTag(r, NS_A, 't')
            return t ? (t.textContent || '') : ''
          }).join('')
          lines.push(lineText)
        }
        text = lines.join('\n')
      }

      // Parse cell style
      const style = parseCellStyle(tc, txBody, context)

      rowCells.push({
        id: nanoid(10),
        colspan: hMerge ? 1 : colspan,
        rowspan: vMerge ? 1 : rowspan,
        text: (hMerge || vMerge) ? '' : text,
        style,
      })
    }

    data.push(rowCells)
  }

  if (data.length === 0 || colWidths.length === 0) return null

  // Outline from table borders or default
  const outline = { style: 'solid' as const, width: 1, color: '#e2e6ed' }

  const element: PPTTableElement = {
    id: nanoid(10),
    type: 'table',
    left,
    top,
    width,
    height,
    rotate: 0,
    outline,
    colWidths,
    data,
  }

  if (tableTheme) element.theme = tableTheme

  return element
}

function parseCellStyle(
  tc: Element,
  txBody: Element | null,
  context: PptxSlideContext,
): TableCellStyle | undefined {
  const style: TableCellStyle = {}
  let hasStyle = false

  // Cell properties
  const tcPr = getFirstChildByTag(tc, NS_A, 'tcPr')
  if (tcPr) {
    // Background color
    const solidFill = getFirstChildByTag(tcPr, NS_A, 'solidFill')
    if (solidFill) {
      const colorEl = getColorElement(solidFill)
      style.backcolor = resolveColor(colorEl, context.theme, '')
      if (style.backcolor) hasStyle = true
    }
  }

  // Text formatting from first run
  if (txBody) {
    const paragraphs = getChildrenByTag(txBody, NS_A, 'p')
    if (paragraphs.length > 0) {
      const pPr = getFirstChildByTag(paragraphs[0], NS_A, 'pPr')
      if (pPr) {
        const algn = getAttr(pPr, 'algn')
        if (algn) {
          const alignMap: Record<string, 'left' | 'center' | 'right'> = {
            l: 'left', ctr: 'center', r: 'right',
          }
          if (alignMap[algn]) {
            style.align = alignMap[algn]
            hasStyle = true
          }
        }
      }

      const runs = getChildrenByTag(paragraphs[0], NS_A, 'r')
      if (runs.length > 0) {
        const rPr = getFirstChildByTag(runs[0], NS_A, 'rPr')
        if (rPr) {
          const bold = getAttr(rPr, 'b')
          if (bold === '1') { style.bold = true; hasStyle = true }

          const italic = getAttr(rPr, 'i')
          if (italic === '1') { style.em = true; hasStyle = true }

          const underline = getAttr(rPr, 'u')
          if (underline && underline !== 'none') { style.underline = true; hasStyle = true }

          const strike = getAttr(rPr, 'strike')
          if (strike && strike !== 'noStrike') { style.strikethrough = true; hasStyle = true }

          const sz = getAttr(rPr, 'sz')
          if (sz) {
            style.fontsize = ptToCanvasPx(Number(sz) / 100, context.slideWidthEmu).toFixed(1) + 'px'
            hasStyle = true
          }

          const latinEl = getFirstChildByTag(rPr, NS_A, 'latin')
          const eaEl = getFirstChildByTag(rPr, NS_A, 'ea')
          const fontEl = eaEl || latinEl
          if (fontEl) {
            const tf = getAttr(fontEl, 'typeface')
            if (tf && !tf.startsWith('+')) {
              style.fontname = tf
              hasStyle = true
            }
          }

          const solidFill = getFirstChildByTag(rPr, NS_A, 'solidFill')
          if (solidFill) {
            const colorEl = getColorElement(solidFill)
            const color = resolveColor(colorEl, context.theme, '')
            if (color) { style.color = color; hasStyle = true }
          }
        }
      }
    }
  }

  return hasStyle ? style : undefined
}
