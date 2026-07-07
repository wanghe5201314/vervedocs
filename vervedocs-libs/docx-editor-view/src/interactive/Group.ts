import { EditorZone } from '@vervedoc/docx-editor-schema'
import { ElementType } from '@vervedoc/docx-editor-schema'
import { DeepRequired } from '@vervedoc/docx-editor-schema'
import { IEditorOption } from '@vervedoc/docx-editor-schema'
import { IElement } from '@vervedoc/docx-editor-schema'
import { IPositionContext } from '@vervedoc/docx-editor-schema'
import { IRange } from '@vervedoc/docx-editor-schema'
import { getUUID } from '@vervedoc/docx-editor-schema'
import { RangeManager } from '@vervedoc/docx-editor-state'
import { Draw } from '../draw/Draw'

interface IGroupLineRange {
  x: number
  y: number
  width: number
  height: number
}

interface IGroupFillRect {
  lineRanges: IGroupLineRange[]
}

export class Group {
  private draw: Draw
  private options: DeepRequired<IEditorOption>
  private range: RangeManager
  private fillRectMap: Map<string, IGroupFillRect>
  private groupIndexMap: Map<string, number> // 批注序号映射

  constructor(draw: Draw) {
    this.draw = draw
    this.options = draw.getOptions()
    this.range = draw.getRange()
    this.fillRectMap = new Map()
    this.groupIndexMap = new Map()
  }

  public setGroup(): string | null {
    if (
      this.draw.isReadonly() ||
      this.draw.getZone().getZone() !== EditorZone.MAIN
    ) {
      return null
    }
    const selection = this.range.getSelection()
    if (!selection) return null
    const groupId = getUUID()
    selection.forEach(el => {
      if (!Array.isArray(el.groupIds)) {
        el.groupIds = []
      }
      el.groupIds.push(groupId)
    })
    this.draw.render({
      isSetCursor: false,
      isCompute: false
    })
    return groupId
  }

  public getElementListByGroupId(
    elementList: IElement[],
    groupId: string
  ): IElement[] {
    const groupElementList: IElement[] = []
    for (let e = 0; e < elementList.length; e++) {
      const element = elementList[e]
      if (element.type === ElementType.TABLE) {
        const trList = element.trList!
        for (let r = 0; r < trList.length; r++) {
          const tr = trList[r]
          for (let d = 0; d < tr.tdList.length; d++) {
            const td = tr.tdList[d]
            const tdGroupElementList = this.getElementListByGroupId(
              td.value,
              groupId
            )
            if (tdGroupElementList.length) {
              groupElementList.push(...tdGroupElementList)
              return groupElementList
            }
          }
        }
      }
      if (element?.groupIds?.includes(groupId)) {
        groupElementList.push(element)
        const nextElement = elementList[e + 1]
        if (!nextElement?.groupIds?.includes(groupId)) break
      }
    }
    return groupElementList
  }

  public deleteGroup(groupId: string) {
    if (this.draw.isReadonly()) return
    // 仅主体内容可以成组
    const elementList = this.draw.getOriginalMainElementList()
    const groupElementList = this.getElementListByGroupId(elementList, groupId)
    if (!groupElementList.length) return
    for (let e = 0; e < groupElementList.length; e++) {
      const element = groupElementList[e]
      const groupIds = element.groupIds!
      const groupIndex = groupIds.findIndex(id => id === groupId)
      groupIds.splice(groupIndex, 1)
      // 不包含成组时删除字段，减少存储及内存占用
      if (!groupIds.length) {
        delete element.groupIds
      }
    }
    this.draw.render({
      isSetCursor: false,
      isCompute: false
    })
  }

  public getContextByGroupId(
    elementList: IElement[],
    groupId: string
  ): (IRange & IPositionContext) | null {
    let groupStartIndex = -1
    let groupEndIndex = -1
    for (let e = 0; e < elementList.length; e++) {
      const element = elementList[e]
      if (element.type === ElementType.TABLE) {
        const trList = element.trList!
        for (let r = 0; r < trList.length; r++) {
          const tr = trList[r]
          for (let d = 0; d < tr.tdList.length; d++) {
            const td = tr.tdList[d]
            const range = this.getContextByGroupId(td.value, groupId)
            if (range) {
              return {
                ...range,
                isTable: true,
                index: e,
                trIndex: r,
                tdIndex: d,
                tdId: td.id,
                trId: tr.id,
                tableId: element.tableId
              }
            }
          }
        }
      }
      if (element.groupIds?.includes(groupId)) {
        if (groupStartIndex === -1) groupStartIndex = e
        groupEndIndex = e
      }
    }
    if (groupStartIndex !== -1) {
      return {
        isTable: false,
        startIndex: groupStartIndex,
        endIndex: groupEndIndex
      }
    }
    return null
  }

  public clearFillInfo() {
    this.fillRectMap.clear()
    this.groupIndexMap.clear()
  }

  public recordFillInfo(
    element: IElement,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    const groupIds = element.groupIds
    if (!groupIds) return
    for (const groupId of groupIds) {
      const fillRect = this.fillRectMap.get(groupId)
      if (!fillRect) {
        this.fillRectMap.set(groupId, {
          lineRanges: [{ x, y, width, height }]
        })
        if (!this.groupIndexMap.has(groupId)) {
          this.groupIndexMap.set(groupId, this.groupIndexMap.size + 1)
        }
      } else {
        const lastLine = fillRect.lineRanges[fillRect.lineRanges.length - 1]
        if (lastLine && Math.abs(lastLine.y - y) < 1) {
          lastLine.width += width
        } else {
          fillRect.lineRanges.push({ x, y, width, height })
        }
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D) {
    if (!this.fillRectMap.size) return

    const range = this.range.getRange()
    const elementList = this.draw.getElementList()
    const anchorGroupIds = elementList[range.endIndex]?.groupIds
    const {
      group: { backgroundColor, opacity, activeOpacity, activeBackgroundColor }
    } = this.options

    ctx.save()
    
    this.fillRectMap.forEach((fillRect, groupId) => {
      const { lineRanges } = fillRect
      const isActive = anchorGroupIds?.includes(groupId)
      
      if (isActive) {
        ctx.globalAlpha = activeOpacity
        ctx.fillStyle = activeBackgroundColor
      } else {
        ctx.globalAlpha = opacity
        ctx.fillStyle = backgroundColor
      }
      for (const line of lineRanges) {
        ctx.fillRect(line.x, line.y, line.width, line.height)
      }

    })
    
    ctx.restore()
    this.clearFillInfo()
  }
  
  // 获取批注序号
  public getCommentIndex(groupId: string): number {
    return this.groupIndexMap.get(groupId) || 0
  }
  
  // 获取所有批注的 groupId 列表(按序号排序)
  public getAllGroupIds(): string[] {
    const groups = Array.from(this.groupIndexMap.entries())
    groups.sort((a, b) => a[1] - b[1])
    return groups.map(g => g[0])
  }
}
