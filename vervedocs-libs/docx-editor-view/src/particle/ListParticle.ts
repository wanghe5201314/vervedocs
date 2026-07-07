import { ZERO } from '@vervedoc/docx-editor-schema'
import { ElementType } from '@vervedoc/docx-editor-schema'
import { KeyMap } from '@vervedoc/docx-editor-schema'
import { ListStyle, ListType, OlStyle, UlStyle } from '@vervedoc/docx-editor-schema'
import { DeepRequired } from '@vervedoc/docx-editor-schema'
import { IEditorOption } from '@vervedoc/docx-editor-schema'
import { IElement, IElementPosition } from '@vervedoc/docx-editor-schema'
import { IRow, IRowElement } from '@vervedoc/docx-editor-schema'
import { getUUID } from '@vervedoc/docx-editor-schema'
import { isParagraphSeparator } from '@vervedoc/docx-editor-schema'
import { RangeManager } from '@vervedoc/docx-editor-state'
import { Draw } from '../draw/Draw'
import { ListSymbolDrawer } from './ListSymbolDrawer'

export class ListParticle {
  private draw: Draw
  private range: RangeManager
  private options: DeepRequired<IEditorOption>
  private symbolDrawer: ListSymbolDrawer

  private readonly MEASURE_BASE_TEXT = '0'
  private readonly LIST_GAP = 10

  constructor(draw: Draw) {
    this.draw = draw
    this.range = draw.getRange()
    this.options = draw.getOptions()
    this.symbolDrawer = new ListSymbolDrawer()
  }

  public setList(listType: ListType | null, listStyle?: ListStyle) {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    const { startIndex, endIndex } = this.range.getRange()
    if (!~startIndex && !~endIndex) return
    // 需要改变的元素列表
    const changeElementList = this.range.getRangeParagraphElementList()
    if (!changeElementList || !changeElementList.length) return
    // 如果包含列表则设置为取消列表
    const isUnsetList = changeElementList.find(
      el => el.listType === listType && el.listStyle === listStyle
    )
    if (isUnsetList || !listType) {
      this.unsetList()
      return
    }
    // 设置值
    const listId = getUUID()
    changeElementList.forEach(el => {
      el.listId = listId
      el.listType = listType
      el.listStyle = listStyle
    })
    // 光标定位
    const isSetCursor = startIndex === endIndex
    const curIndex = isSetCursor ? endIndex : startIndex
    this.draw.render({ curIndex, isSetCursor })
  }

  public unsetList() {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    const { startIndex, endIndex } = this.range.getRange()
    if (!~startIndex && !~endIndex) return
    // 需要改变的元素列表
    const changeElementList = this.range
      .getRangeParagraphElementList()
      ?.filter(el => el.listId)
    if (!changeElementList || !changeElementList.length) return
    // 如果列表最后字符不是换行符则需插入换行符
    const elementList = this.draw.getElementList()
    const endElement = elementList[endIndex]
    if (endElement.listId) {
      let start = endIndex + 1
      while (start < elementList.length) {
        const element = elementList[start]
        if (isParagraphSeparator(element)) break
        if (element.listId !== endElement.listId) {
          this.draw.spliceElementList(elementList, start, 0, [
            {
              value: ZERO
            }
          ])
          break
        }
        start++
      }
    }
    // 取消设置
    changeElementList.forEach(el => {
      delete el.listId
      delete el.listType
      delete el.listStyle
      delete el.listWrap
    })
    // 光标定位
    const isSetCursor = startIndex === endIndex
    const curIndex = isSetCursor ? endIndex : startIndex
    this.draw.render({ curIndex, isSetCursor })
  }

  public computeListStyle(
    ctx: CanvasRenderingContext2D,
    elementList: IElement[]
  ): Map<string, number> {
    const listStyleMap = new Map<string, number>()
    let start = 0
    let curListId = elementList[start].listId
    let curElementList: IElement[] = []
    const elementLength = elementList.length
    while (start < elementLength) {
      const curElement = elementList[start]
      if (curListId && curListId === curElement.listId) {
        curElementList.push(curElement)
      } else {
        if (curElement.listId && curElement.listId !== curListId) {
          // 列表结束
          if (curElementList.length) {
            const width = this.getListStyleWidth(ctx, curElementList)
            listStyleMap.set(curListId!, width)
          }
          curListId = curElement.listId
          curElementList = curListId ? [curElement] : []
        }
      }
      start++
    }
    if (curElementList.length) {
      const width = this.getListStyleWidth(ctx, curElementList)
      listStyleMap.set(curListId!, width)
    }
    return listStyleMap
  }

  public getListStyleWidth(
    ctx: CanvasRenderingContext2D,
    listElementList: IElement[]
  ): number {
    const { scale, checkbox, defaultSize, defaultFont } = this.options
    const startElement = listElementList[0]
    // 获取元素实际字号和字体（优先从第一个非换行符元素获取）
    let referenceElement = startElement
    for (let i = 1; i < listElementList.length; i++) {
      const el = listElementList[i]
      if (el.value !== ZERO && el.value !== '\t') {
        referenceElement = el
        break
      }
    }
    const elementSize = referenceElement.actualSize || referenceElement.size || defaultSize
    const elementFont = referenceElement.font || defaultFont
    const fontSize = elementSize * scale
    // 非递增样式（UL项目符号等）基于字号计算宽度
    if (
      startElement.listStyle &&
      startElement.listStyle !== ListStyle.DECIMAL
    ) {
      if (startElement.listStyle === ListStyle.CHECKBOX) {
        return (checkbox.width + this.LIST_GAP) * scale
      }
      if (startElement.listType === ListType.UL) {
        const symbolWidth = this.symbolDrawer.getSymbolWidth(
          <UlStyle>(<unknown>startElement.listStyle),
          fontSize
        )
        return Math.ceil(symbolWidth + this.LIST_GAP * scale)
      }
      // 有序列表固定样式
      ctx.save()
      ctx.font = `${fontSize}px ${elementFont}`
      const symbolText = this.getOlValue(<OlStyle>(<unknown>startElement.listStyle), 1)
      const symbolMetrics = ctx.measureText(symbolText)
      ctx.restore()
      return Math.ceil((symbolMetrics.width + this.LIST_GAP) * scale)
    }
    // 计算列表数量
    const count = listElementList.reduce((pre, cur) => {
      if (cur.value === ZERO) {
        pre += 1
      }
      return pre
    }, 0)
    if (!count) return 0
    // 以递增样式最大宽度为准，使用元素字号测量
    const text = `${this.MEASURE_BASE_TEXT.repeat(String(count).length)}${
      KeyMap.PERIOD
    }`
    ctx.save()
    ctx.font = `${fontSize}px ${elementFont}`
    const textMetrics = ctx.measureText(text)
    ctx.restore()
    return Math.ceil((textMetrics.width + this.LIST_GAP) * scale)
  }

  public drawListStyle(
    ctx: CanvasRenderingContext2D,
    row: IRow,
    position: IElementPosition
  ) {
    const { elementList, offsetX, listIndex, ascent, height } = row
    const startElement = elementList[0]
    if (startElement.value !== ZERO || startElement.listWrap) return
    // tab width
    let tabWidth = 0
    const { defaultTabWidth, scale, defaultFont, defaultSize } = this.options
    for (let i = 1; i < elementList.length; i++) {
      const element = elementList[i]
      if (element?.type !== ElementType.TAB) break
      tabWidth += defaultTabWidth * scale
    }
    // 列表样式渲染
    const {
      coordinate: {
        leftTop: [startX, startY]
      }
    } = position
    const x =
      startX - offsetX! + tabWidth - (startElement.listHanging || 0) * this.options.scale
    // 复选框样式特殊处理
    if (startElement.listStyle === ListStyle.CHECKBOX) {
      const { width, height: checkboxHeight, gap } = this.options.checkbox
      const checkboxRowElement: IRowElement = {
        ...startElement,
        checkbox: {
          value: !!startElement.checkbox?.value
        },
        metrics: {
          ...startElement.metrics,
          width: (width + gap * 2) * scale,
          height: checkboxHeight * scale
        }
      }
      this.draw.getCheckboxParticle().render({
        ctx,
        x: x - gap * scale,
        y: startY + ascent,
        index: 0,
        row: {
          ...row,
          elementList: [checkboxRowElement, ...row.elementList]
        }
      })
      return
    }
    // 获取元素字号和颜色（优先从第一个非换行符元素获取）
    let referenceElement = startElement
    for (let i = 1; i < elementList.length; i++) {
      const el = elementList[i]
      if (el.value !== ZERO && el.value !== '\t') {
        referenceElement = el
        break
      }
    }
    const elementSize = referenceElement.actualSize || referenceElement.size || defaultSize
    const fontSize = elementSize * scale
    const color = referenceElement.color || this.options.defaultColor
    // 计算垂直居中位置：使用行高的一半作为垂直中心
    const baselineY = startY + ascent
    const rowCenterY = startY + height / 2
    // 无序列表使用 Canvas Path 绘制符号
    if (startElement.listType === ListType.UL) {
      const style = <UlStyle>(<unknown>startElement.listStyle) || UlStyle.DISC
      const symbolWidth = this.symbolDrawer.getSymbolWidth(style, fontSize)
      const symbolX = x + symbolWidth / 2
      this.symbolDrawer.drawSymbol(ctx, style, symbolX, rowCenterY, fontSize, color)
    } else {
      // 有序列表使用文字绘制
      const elementFont = referenceElement.font || defaultFont
      const text = this.getOlValue(
        <OlStyle>(<unknown>startElement.listStyle),
        listIndex! + 1
      )
      if (!text) return
      ctx.save()
      ctx.font = `${referenceElement.italic ? 'italic ' : ''}${referenceElement.bold ? 'bold ' : ''}${fontSize}px ${elementFont}`
      ctx.fillStyle = color
      ctx.fillText(text, x, baselineY)
      ctx.restore()
    }
  }

  private getOlValue(style: OlStyle, n: number): string {
    switch (style) {
      case OlStyle.CHINESE:
        return `${this.chineseFromNumber(n)}、`
      case OlStyle.CHINESE_BRACKET:
        return `（${this.chineseFromNumber(n)}）`
      case OlStyle.DECIMAL_DOT:
      case OlStyle.DECIMAL:
        return `${n}${KeyMap.PERIOD}`
      case OlStyle.DECIMAL_PAREN:
        return `(${n})`
      case OlStyle.DECIMAL_BRACKET:
        return `${n})`
      case OlStyle.DECIMAL_CIRCLE:
        return this.circleFromNumber(n)
      case OlStyle.UPPER_ALPHA:
        return this.alphaFromNumber(n, true)
      case OlStyle.LOWER_ALPHA_DOT:
        return `${this.alphaFromNumber(n, false)}${KeyMap.PERIOD}`
      default:
        return `${n}${KeyMap.PERIOD}`
    }
  }

  private chineseFromNumber(n: number): string {
    const chineseNumbers = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
    const chineseUnits = ['', '十', '百', '千']
    if (n === 0) return chineseNumbers[0]
    if (n < 10) return chineseNumbers[n]
    if (n === 10) return '十'
    if (n < 20) return `十${chineseNumbers[n % 10]}`

    let result = ''
    let unitIndex = 0
    while (n > 0) {
      const digit = n % 10
      if (digit !== 0) {
        result = chineseNumbers[digit] + chineseUnits[unitIndex] + result
      } else if (result !== '' && !result.startsWith(chineseNumbers[0])) {
        result = chineseNumbers[0] + result
      }
      n = Math.floor(n / 10)
      unitIndex++
    }
    return result.replace(/零+$/, '')
  }

  private circleFromNumber(n: number): string {
    const circles = [
      '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩',
      '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳'
    ]
    return circles[n - 1] || String(n)
  }

  private alphaFromNumber(n: number, isUpper: boolean): string {
    let result = ''
    const base = isUpper ? 65 : 97
    while (n > 0) {
      n--
      result = String.fromCharCode(base + (n % 26)) + result
      n = Math.floor(n / 26)
    }
    return result
  }
}
