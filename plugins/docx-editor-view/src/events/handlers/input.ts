import { ZERO } from '@vervedoc/docx-editor-schema'
import {
  EDITOR_ELEMENT_COPY_ATTR,
  EDITOR_ELEMENT_STYLE_ATTR
} from '@vervedoc/docx-editor-schema'
import { ElementType } from '@vervedoc/docx-editor-schema'
import { IElement } from '@vervedoc/docx-editor-schema'
import { IRangeElementStyle } from '@vervedoc/docx-editor-schema'
import { splitText } from '@vervedoc/docx-editor-schema'
import { formatElementContext } from '@vervedoc/docx-editor-schema'
import { CanvasEvent } from '../canvas-event'

// 输入防抖定时器
let inputDebounceTimer: number | null = null
// 待渲染标记
let pendingRender = false

export function input(data: string, host: CanvasEvent) {
  const draw = host.getDraw()
  if (draw.isReadonly() || draw.isDisabled()) return
  const position = draw.getPosition()
  const cursorPosition = position.getCursorPosition()
  if (!data || !cursorPosition) return
  const isComposing = host.isComposing
  // 正在合成文本进行非输入操作
  if (isComposing && host.compositionInfo?.value === data) return
  const rangeManager = draw.getRange()
  if (!rangeManager.canInput()) return
  // 移除合成前，缓存设置的默认样式设置
  const defaultStyle =
    rangeManager.getDefaultStyle() || host.compositionInfo?.defaultStyle || null
  // 移除合成输入
  removeComposingInput(host)
  if (!isComposing) {
    const cursor = draw.getCursor()
    cursor.clearAgentDomValue()
  }
  const { TEXT, HYPERLINK, SUBSCRIPT, SUPERSCRIPT, DATE, TAB } = ElementType
  const text = data.replaceAll(`\n`, ZERO)
  const { startIndex, endIndex } = rangeManager.getRange()
  // 格式化元素
  const elementList = draw.getElementList()
  const copyElement = rangeManager.getRangeAnchorStyle(elementList, endIndex)
  if (!copyElement) return
  const isDesignMode = draw.isDesignMode()
  const options = draw.getOptions()
  const isTrackChanges = options.trackChanges
  const inputData: IElement[] = splitText(text).map(value => {
    const newElement: IElement = {
      value
    }
    if (isTrackChanges) {
      newElement.revisionId = `rev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      newElement.revisionType = 'insert'
      newElement.revisionAuthor = '当前用户'
      newElement.revisionDate = new Date().toISOString()
    }
    if (
      isDesignMode ||
      (!copyElement.title?.disabled && !copyElement.control?.disabled)
    ) {
      const nextElement = elementList[endIndex + 1]
      // 文本、超链接、日期、上下标：复制所有信息（元素类型、样式、特殊属性）
      if (
        !copyElement.type ||
        copyElement.type === TEXT ||
        (copyElement.type === HYPERLINK && nextElement?.type === HYPERLINK) ||
        (copyElement.type === DATE && nextElement?.type === DATE) ||
        (copyElement.type === SUBSCRIPT && nextElement?.type === SUBSCRIPT) ||
        (copyElement.type === SUPERSCRIPT && nextElement?.type === SUPERSCRIPT)
      ) {
        EDITOR_ELEMENT_COPY_ATTR.forEach(attr => {
          // 在分组外无需复制分组信息
          if (attr === 'groupIds' && !nextElement?.groupIds) return
          const value = copyElement[attr] as never
          if (value !== undefined) {
            newElement[attr] = value
          }
        })
      }
      // 仅复制样式：存在默认样式设置 || 无法匹配文本类元素时（TAB）
      if (defaultStyle || copyElement.type === TAB) {
        EDITOR_ELEMENT_STYLE_ATTR.forEach(attr => {
          const value =
            defaultStyle?.[attr as keyof IRangeElementStyle] ||
            copyElement[attr]
          if (value !== undefined) {
            newElement[attr] = value as never
          }
        })
      }
      if (isComposing) {
        newElement.underline = true
      }
    }
    return newElement
  })
  // 控件-移除placeholder
  const control = draw.getControl()
  let curIndex: number
  if (control.getActiveControl() && control.getIsRangeWithinControl()) {
    curIndex = control.setValue(inputData)
    if (!isComposing) {
      control.emitControlContentChange()
    }
  } else {
    const start = startIndex + 1
    if (startIndex !== endIndex) {
      draw.spliceElementList(elementList, start, endIndex - startIndex)
    }
    formatElementContext(elementList, inputData, startIndex, {
      editorOptions: draw.getOptions()
    })
    draw.spliceElementList(elementList, start, 0, inputData)
    curIndex = startIndex + inputData.length
  }
  if (~curIndex) {
    rangeManager.setRange(curIndex, curIndex)
    
    // 使用防抖渲染优化大文档编辑性能
    if (inputDebounceTimer) {
      window.clearTimeout(inputDebounceTimer)
    }
    pendingRender = true
    
    // 如果是合成输入（中文输入法），立即渲染以显示候选字
    if (isComposing) {
      draw.render({
        curIndex,
        isSubmitHistory: false,
        isPartialRender: true
      })
      pendingRender = false
    } else {
      // 普通输入使用防抖，50ms 内的连续输入只渲染一次
      inputDebounceTimer = window.setTimeout(() => {
        if (pendingRender) {
          draw.render({
            curIndex,
            isSubmitHistory: true,
            isPartialRender: true
          })
          pendingRender = false
        }
        inputDebounceTimer = null
      }, 50)
    }
  }
  if (isComposing) {
    host.compositionInfo = {
      elementList,
      value: text,
      startIndex: curIndex - inputData.length,
      endIndex: curIndex,
      defaultStyle
    }
  }
}

export function removeComposingInput(host: CanvasEvent) {
  if (!host.compositionInfo) return
  const { elementList, startIndex, endIndex } = host.compositionInfo
  elementList.splice(startIndex + 1, endIndex - startIndex)
  const rangeManager = host.getDraw().getRange()
  rangeManager.setRange(startIndex, startIndex)
  host.compositionInfo = null
}
