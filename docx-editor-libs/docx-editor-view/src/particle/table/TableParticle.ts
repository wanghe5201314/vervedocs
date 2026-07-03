import { ElementType, IElement, TableBorder } from '@wanghe1995/docx-editor-schema'
import { TdBorder, TdSlash } from '@wanghe1995/docx-editor-schema'
import { DeepRequired } from '@wanghe1995/docx-editor-schema'
import { IEditorOption } from '@wanghe1995/docx-editor-schema'
import { ITd } from '@wanghe1995/docx-editor-schema'
import { ITr } from '@wanghe1995/docx-editor-schema'
import { deepClone } from '@wanghe1995/docx-editor-schema'
import { RangeManager } from '@wanghe1995/docx-editor-state'
import { Draw } from '../../draw/Draw'

export class TableParticle {
  private draw: Draw
  private range: RangeManager
  private options: DeepRequired<IEditorOption>

  constructor(draw: Draw) {
    this.draw = draw
    this.range = draw.getRange()
    this.options = draw.getOptions()
  }

  public getTrListGroupByCol(payload: ITr[]): ITr[] {
    const trList = deepClone(payload)
    for (let t = 0; t < payload.length; t++) {
      const tr = trList[t]
      for (let d = tr.tdList.length - 1; d >= 0; d--) {
        const td = tr.tdList[d]
        const { rowspan, rowIndex, colIndex } = td
        const curRowIndex = rowIndex! + rowspan - 1
        if (curRowIndex !== d) {
          const changeTd = tr.tdList.splice(d, 1)[0]
          trList[curRowIndex]?.tdList.splice(colIndex!, 0, changeTd)
        }
      }
    }
    return trList
  }

  public getRangeRowCol(): ITd[][] | null {
    const { isTable, index, trIndex, tdIndex } = this.draw
      .getPosition()
      .getPositionContext()
    if (!isTable) return null
    const {
      isCrossRowCol,
      startTdIndex,
      endTdIndex,
      startTrIndex,
      endTrIndex
    } = this.range.getRange()
    const originalElementList = this.draw.getOriginalElementList()
    const element = originalElementList[index!]
    const curTrList = element.trList!
    // 非跨列直接返回光标所在单元格
    if (!isCrossRowCol) {
      return [[curTrList[trIndex!].tdList[tdIndex!]]]
    }
    let startTd = curTrList[startTrIndex!].tdList[startTdIndex!]
    let endTd = curTrList[endTrIndex!].tdList[endTdIndex!]
    // 交换起始位置
    if (startTd.x! > endTd.x! || startTd.y! > endTd.y!) {
      // prettier-ignore
      [startTd, endTd] = [endTd, startTd]
    }
    const startColIndex = startTd.colIndex!
    const endColIndex = endTd.colIndex! + (endTd.colspan - 1)
    const startRowIndex = startTd.rowIndex!
    const endRowIndex = endTd.rowIndex! + (endTd.rowspan - 1)
    // 选区行列
    const rowCol: ITd[][] = []
    for (let t = 0; t < curTrList.length; t++) {
      const tr = curTrList[t]
      const tdList: ITd[] = []
      for (let d = 0; d < tr.tdList.length; d++) {
        const td = tr.tdList[d]
        const tdColIndex = td.colIndex!
        const tdRowIndex = td.rowIndex!
        if (
          tdColIndex >= startColIndex &&
          tdColIndex <= endColIndex &&
          tdRowIndex >= startRowIndex &&
          tdRowIndex <= endRowIndex
        ) {
          tdList.push(td)
        }
      }
      if (tdList.length) {
        rowCol.push(tdList)
      }
    }
    return rowCol.length ? rowCol : null
  }

  private _drawSlash(
    ctx: CanvasRenderingContext2D,
    td: ITd,
    startX: number,
    startY: number
  ) {
    const { scale } = this.options
    ctx.save()
    const width = td.width! * scale
    const height = td.height! * scale
    const x = Math.round(td.x! * scale + startX)
    const y = Math.round(td.y! * scale + startY)
    ctx.beginPath()
    // 正斜线 /
    if (td.slashTypes?.includes(TdSlash.FORWARD)) {
      ctx.moveTo(x + width, y)
      ctx.lineTo(x, y + height)
    }
    // 反斜线 \
    if (td.slashTypes?.includes(TdSlash.BACK)) {
      ctx.moveTo(x, y)
      ctx.lineTo(x + width, y + height)
    }
    ctx.stroke()
    ctx.restore()
  }

  private _drawBorder(
    ctx: CanvasRenderingContext2D,
    element: IElement,
    startX: number,
    startY: number
  ) {
    const {
      colgroup,
      trList,
      borderType,
      borderColor,
      borderWidth = 0.5,
      borderExternalWidth
    } = element
    if (!colgroup || !trList) return
    const {
      scale,
      table: { defaultBorderColor }
    } = this.options
    const colCount = colgroup.length
    const rowCount = trList.length
    const baseColor = borderColor || defaultBorderColor
    const baseWidth = borderWidth
    const outerWidth = borderExternalWidth || baseWidth
    const baseStyle = borderType === TableBorder.DASH ? 'dashed' : 'solid'
    const isEmpty = borderType === TableBorder.EMPTY
    const isExternal = borderType === TableBorder.EXTERNAL
    const isInternal = borderType === TableBorder.INTERNAL
    const drawOuter = !isEmpty && !isInternal
    const drawInner = !isEmpty && !isExternal

    const styleRank = (s: string) => {
      if (s === 'double') return 4
      if (s === 'solid') return 3
      if (s === 'dashed') return 2
      if (s === 'dotted') return 1
      return 0
    }

    const normalizeLine = (line: any) => {
      const w = Number(line?.width)
      const width = Number.isFinite(w) ? w : baseWidth
      const color = typeof line?.color === 'string' && line.color ? line.color : baseColor
      const style =
        line?.style === 'dashed' || line?.style === 'dotted' || line?.style === 'double'
          ? line.style
          : baseStyle
      return { width, color, style }
    }

    const pickLine = (a: any, b: any) => {
      if (!a) return b
      if (!b) return a
      if (a.width !== b.width) return a.width > b.width ? a : b
      if (a.style !== b.style) return styleRank(a.style) >= styleRank(b.style) ? a : b
      return a
    }

    type Seg = { x1: number; y1: number; x2: number; y2: number; width: number; color: string; style: string }
    const segMap = new Map<string, Seg>()

    const addSeg = (key: string, seg: Seg) => {
      const exist = segMap.get(key)
      if (!exist) {
        segMap.set(key, seg)
        return
      }
      const chosen = pickLine(exist, seg)
      segMap.set(key, chosen)
    }

    const addH = (x1: number, x2: number, y: number, line: any) => {
      const sx1 = Math.min(x1, x2)
      const sx2 = Math.max(x1, x2)
      const key = `H:${y}:${sx1}-${sx2}`
      const l = normalizeLine(line)
      addSeg(key, { x1: sx1, y1: y, x2: sx2, y2: y, ...l })
    }

    const addV = (x: number, y1: number, y2: number, line: any) => {
      const sy1 = Math.min(y1, y2)
      const sy2 = Math.max(y1, y2)
      const key = `V:${x}:${sy1}-${sy2}`
      const l = normalizeLine(line)
      addSeg(key, { x1: x, y1: sy1, x2: x, y2: sy2, ...l })
    }

    const getImplicitLine = (isOuterLine: boolean) => ({
      width: isOuterLine ? outerWidth : baseWidth,
      color: baseColor,
      style: baseStyle
    })

    const getTdLine = (td: any, side: TdBorder, implicit: any | null) => {
      const styleLine = td.borderStyle?.[side]
      if (styleLine) return styleLine
      if (td.borderTypes?.includes(side)) {
        return {
          width: baseWidth,
          color: baseColor,
          style: baseStyle
        }
      }
      return implicit
    }

    ctx.save()
    ctx.translate(0.5, 0.5)

    for (let t = 0; t < trList.length; t++) {
      const tr = trList[t]
      for (let d = 0; d < tr.tdList.length; d++) {
        const td = tr.tdList[d] as any
        if (td.slashTypes?.length) {
          this._drawSlash(ctx, td, startX, startY)
        }

        const left = Math.round(td.x! * scale + startX)
        const top = Math.round(td.y! * scale + startY)
        const right = Math.round((td.x! + td.width!) * scale + startX)
        const bottom = Math.round((td.y! + td.height!) * scale + startY)

        const isLeftOuter = td.colIndex === 0
        const isRightOuter = td.colIndex! + td.colspan === colCount
        const isTopOuter = td.rowIndex === 0
        const isBottomOuter = td.rowIndex! + td.rowspan === rowCount

        const implicitTop = drawOuter && isTopOuter ? getImplicitLine(true) : null
        const implicitBottom = drawOuter && isBottomOuter ? getImplicitLine(true) : null
        const implicitLeft = drawOuter && isLeftOuter ? getImplicitLine(true) : null
        const implicitRight = drawOuter && isRightOuter ? getImplicitLine(true) : null

        const implicitInnerRight =
          drawInner && td.colIndex! + td.colspan < colCount
            ? getImplicitLine(false)
            : null
        const implicitInnerBottom =
          drawInner && td.rowIndex! + td.rowspan < rowCount
            ? getImplicitLine(false)
            : null

        const topLine = getTdLine(td, TdBorder.TOP, implicitTop)
        const bottomLine = getTdLine(td, TdBorder.BOTTOM, implicitBottom || implicitInnerBottom)
        const leftLine = getTdLine(td, TdBorder.LEFT, implicitLeft)
        const rightLine = getTdLine(td, TdBorder.RIGHT, implicitRight || implicitInnerRight)

        if (topLine && topLine.style !== 'none') addH(left, right, top, topLine)
        if (bottomLine && bottomLine.style !== 'none') addH(left, right, bottom, bottomLine)
        if (leftLine && leftLine.style !== 'none') addV(left, top, bottom, leftLine)
        if (rightLine && rightLine.style !== 'none') addV(right, top, bottom, rightLine)
      }
    }

    const groupKey = (s: Seg) => `${s.color}|${s.width}|${s.style}`
    const groups = new Map<string, Seg[]>()
    for (const seg of segMap.values()) {
      const k = groupKey(seg)
      const arr = groups.get(k)
      if (arr) arr.push(seg)
      else groups.set(k, [seg])
    }

    for (const [k, segs] of groups) {
      const [color, widthStr, style] = k.split('|')
      const lw = Number(widthStr)
      ctx.strokeStyle = color
      const scaledWidth = (Number.isFinite(lw) ? lw : baseWidth) * scale
      if (style === 'double') {
        const singleWidth = Math.max(0.5 * scale, Math.round((scaledWidth / 3) * 10) / 10)
        const gap = Math.max(0.5 * scale, Math.round(singleWidth * 1.2 * 10) / 10)
        const offset = (singleWidth + gap) / 2
        ctx.setLineDash([])
        ctx.lineWidth = singleWidth
        ctx.beginPath()
        for (const s of segs) {
          const isH = s.y1 === s.y2
          const isV = s.x1 === s.x2
          if (isH) {
            ctx.moveTo(s.x1, s.y1 - offset)
            ctx.lineTo(s.x2, s.y2 - offset)
            ctx.moveTo(s.x1, s.y1 + offset)
            ctx.lineTo(s.x2, s.y2 + offset)
          } else if (isV) {
            ctx.moveTo(s.x1 - offset, s.y1)
            ctx.lineTo(s.x2 - offset, s.y2)
            ctx.moveTo(s.x1 + offset, s.y1)
            ctx.lineTo(s.x2 + offset, s.y2)
          } else {
            ctx.moveTo(s.x1, s.y1)
            ctx.lineTo(s.x2, s.y2)
          }
        }
        ctx.stroke()
      } else {
        ctx.lineWidth = scaledWidth
        if (style === 'dashed') ctx.setLineDash([3 * scale, 3 * scale])
        else if (style === 'dotted') ctx.setLineDash([1 * scale, 2 * scale])
        else ctx.setLineDash([])
        ctx.beginPath()
        for (const s of segs) {
          ctx.moveTo(s.x1, s.y1)
          ctx.lineTo(s.x2, s.y2)
        }
        ctx.stroke()
      }
    }

    ctx.setLineDash([])
    ctx.translate(-0.5, -0.5)
    ctx.restore()
  }

  private _drawBackgroundColor(
    ctx: CanvasRenderingContext2D,
    element: IElement,
    startX: number,
    startY: number
  ) {
    const { trList } = element
    if (!trList) return
    const { scale } = this.options
    for (let t = 0; t < trList.length; t++) {
      const tr = trList[t]
      for (let d = 0; d < tr.tdList.length; d++) {
        const td = tr.tdList[d]
        if (!td.backgroundColor) continue
        ctx.save()
        const width = td.width! * scale
        const height = td.height! * scale
        const x = Math.round(td.x! * scale + startX)
        const y = Math.round(td.y! * scale + startY)
        ctx.fillStyle = td.backgroundColor
        ctx.fillRect(x, y, width, height)
        ctx.restore()
      }
    }
  }

  public getTableWidth(element: IElement): number {
    return element.colgroup!.reduce((pre, cur) => pre + cur.width, 0)
  }

  public getTableHeight(element: IElement): number {
    const trList = element.trList
    if (!trList?.length) return 0
    return this.getTdListByColIndex(trList, 0).reduce(
      (pre, cur) => pre + cur.height!,
      0
    )
  }

  public getRowCountByColIndex(trList: ITr[], colIndex: number): number {
    return this.getTdListByColIndex(trList, colIndex).reduce(
      (pre, cur) => pre + cur.rowspan,
      0
    )
  }

  public getTdListByColIndex(trList: ITr[], colIndex: number): ITd[] {
    const data: ITd[] = []
    for (let r = 0; r < trList.length; r++) {
      const tdList = trList[r].tdList
      for (let d = 0; d < tdList.length; d++) {
        const td = tdList[d]
        const min = td.colIndex!
        const max = min + td.colspan - 1
        if (colIndex >= min && colIndex <= max) {
          data.push(td)
        }
      }
    }
    return data
  }

  public getTdListByRowIndex(trList: ITr[], rowIndex: number) {
    const data: ITd[] = []
    for (let r = 0; r < trList.length; r++) {
      const tdList = trList[r].tdList
      for (let d = 0; d < tdList.length; d++) {
        const td = tdList[d]
        const min = td.rowIndex!
        const max = min + td.rowspan - 1
        if (rowIndex >= min && rowIndex <= max) {
          data.push(td)
        }
      }
    }
    return data
  }

  public computeRowColInfo(element: IElement) {
    const { colgroup, trList } = element
    if (!colgroup || !trList) return
    const colCount = colgroup.length
    const rowCount = trList.length
    if (!colCount || !rowCount) return

    const colOffsetList: number[] = new Array(colCount).fill(0)
    let colOffset = 0
    for (let c = 0; c < colCount; c++) {
      colOffsetList[c] = colOffset
      colOffset += colgroup[c].width
    }

    const rowOffsetList: number[] = new Array(rowCount).fill(0)
    let rowOffset = 0
    for (let r = 0; r < rowCount; r++) {
      rowOffsetList[r] = rowOffset
      rowOffset += trList[r].height
    }

    const occupiedRowSpan: number[] = new Array(colCount).fill(0)
    const canPlaceAt = (startColIndex: number, colspan: number) => {
      if (startColIndex < 0) return false
      if (startColIndex + colspan > colCount) return false
      for (let c = startColIndex; c < startColIndex + colspan; c++) {
        if (occupiedRowSpan[c] > 0) return false
      }
      return true
    }

    for (let t = 0; t < rowCount; t++) {
      for (let c = 0; c < colCount; c++) {
        if (occupiedRowSpan[c] > 0) occupiedRowSpan[c] -= 1
      }

      const tr = trList[t]
      for (let d = 0; d < tr.tdList.length; d++) {
        const td = tr.tdList[d]
        const colspan = Math.max(1, td.colspan || 1)
        const rowspan = Math.max(1, td.rowspan || 1)

        let colIndex = 0
        let isFound = false
        const maxStart = Math.max(0, colCount - colspan)
        for (let startColIndex = 0; startColIndex <= maxStart; startColIndex++) {
          if (canPlaceAt(startColIndex, colspan)) {
            colIndex = startColIndex
            isFound = true
            break
          }
        }
        if (!isFound) {
          colIndex = Math.max(0, Math.min(colCount - 1, colCount - colspan))
        }

        for (let c = colIndex; c < colIndex + colspan && c < colCount; c++) {
          occupiedRowSpan[c] = Math.max(occupiedRowSpan[c], rowspan)
        }

        let width = 0
        for (let col = 0; col < colspan; col++) {
          const colItem = colgroup[colIndex + col]
          if (!colItem) break
          width += colItem.width
        }

        let height = 0
        for (let row = 0; row < rowspan; row++) {
          const curTr = trList[t + row]
          if (!curTr) break
          height += curTr.height
        }

        const isLastRowTd = tr.tdList.length - 1 === d
        const isLastColTd = t + rowspan === rowCount
        const isLastTd = isLastRowTd && isLastColTd && colIndex + colspan === colCount

        td.isLastRowTd = isLastRowTd
        td.isLastColTd = isLastColTd
        td.isLastTd = isLastTd

        td.x = colOffsetList[colIndex]
        td.y = rowOffsetList[t]
        td.width = width
        td.height = height
        td.rowIndex = t
        td.colIndex = colIndex
        td.trIndex = t
        td.tdIndex = d
      }
    }
  }

  public drawRange(
    ctx: CanvasRenderingContext2D,
    element: IElement,
    startX: number,
    startY: number
  ) {
    const { scale, rangeAlpha, rangeColor } = this.options
    const { type, trList } = element
    if (!trList || type !== ElementType.TABLE) return
    const {
      isCrossRowCol,
      startTdIndex,
      endTdIndex,
      startTrIndex,
      endTrIndex
    } = this.range.getRange()
    // 存在跨行/列
    if (!isCrossRowCol) return
    let startTd = trList[startTrIndex!].tdList[startTdIndex!]
    let endTd = trList[endTrIndex!].tdList[endTdIndex!]
    // 交换起始位置
    if (startTd.x! > endTd.x! || startTd.y! > endTd.y!) {
      // prettier-ignore
      [startTd, endTd] = [endTd, startTd]
    }
    const startColIndex = startTd.colIndex!
    const endColIndex = endTd.colIndex! + (endTd.colspan - 1)
    const startRowIndex = startTd.rowIndex!
    const endRowIndex = endTd.rowIndex! + (endTd.rowspan - 1)
    ctx.save()
    for (let t = 0; t < trList.length; t++) {
      const tr = trList[t]
      for (let d = 0; d < tr.tdList.length; d++) {
        const td = tr.tdList[d]
        const tdColIndex = td.colIndex!
        const tdRowIndex = td.rowIndex!
        if (
          tdColIndex >= startColIndex &&
          tdColIndex <= endColIndex &&
          tdRowIndex >= startRowIndex &&
          tdRowIndex <= endRowIndex
        ) {
          const x = td.x! * scale
          const y = td.y! * scale
          const width = td.width! * scale
          const height = td.height! * scale
          ctx.globalAlpha = rangeAlpha
          ctx.fillStyle = rangeColor
          ctx.fillRect(x + startX, y + startY, width, height)
        }
      }
    }
    ctx.restore()
  }

  public render(
    ctx: CanvasRenderingContext2D,
    element: IElement,
    startX: number,
    startY: number
  ) {
    this._drawBackgroundColor(ctx, element, startX, startY)
    this._drawBorder(ctx, element, startX, startY)
  }
}
