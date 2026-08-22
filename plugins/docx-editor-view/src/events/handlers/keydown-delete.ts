﻿import { CanvasEvent } from '../canvas-event'

export function del(evt: KeyboardEvent, host: CanvasEvent) {
  const draw = host.getDraw()
  if (draw.isReadonly()) return
  // 可输入性验证
  const rangeManager = draw.getRange()
  if (!rangeManager.canInput()) return
  const options = draw.getOptions()
  const isTrackChanges = options.trackChanges

  const { startIndex, endIndex, isCrossRowCol } = rangeManager.getRange()
  // 隐藏控件删除
  const elementList = draw.getElementList()
  const control = draw.getControl()
  if (rangeManager.getIsCollapsed()) {
    const nextElement = elementList[startIndex + 1]
    if (nextElement?.control?.hide || nextElement?.area?.hide) {
      const newIndex = control.removeControl(startIndex + 1)
      if (newIndex) {
        // 更新位置信息
        const position = draw.getPosition()
        const positionList = position.getPositionList()
        position.setCursorPosition(positionList[newIndex])
      }
    }
  }
  // 删除操作
  let curIndex: number | null
  if (isCrossRowCol) {
    // 表格跨行列选中时清空单元格内容
    const rowCol = draw.getTableParticle().getRangeRowCol()
    if (!rowCol) return
    let isDeleted = false
    for (let r = 0; r < rowCol.length; r++) {
      const row = rowCol[r]
      for (let c = 0; c < row.length; c++) {
        const col = row[c]
        if (col.value.length > 1) {
          draw.spliceElementList(col.value, 1, col.value.length - 1)
          isDeleted = true
        }
      }
    }
    // 删除成功后定位
    curIndex = isDeleted ? 0 : null
  } else if (control.getActiveControl() && control.getIsRangeWithinControl()) {
    // 光标在控件内
    curIndex = control.keydown(evt)
    if (curIndex) {
      control.emitControlContentChange()
    }
  } else if (elementList[endIndex + 1]?.controlId) {
    // 光标在控件前
    curIndex = control.removeControl(endIndex + 1)
  } else {
    // 普通元素
    const position = draw.getPosition()
    const cursorPosition = position.getCursorPosition()
    if (!cursorPosition) return
    const { index } = cursorPosition
    // 命中图片直接删除
    const positionContext = position.getPositionContext()
    if (positionContext.isDirectHit && positionContext.isImage) {
      draw.spliceElementList(elementList, index, 1)
      curIndex = index - 1
    } else {
      const isCollapsed = rangeManager.getIsCollapsed()
      if (!isCollapsed) {
        if (isTrackChanges) {

          for (let i = startIndex + 1; i <= endIndex; i++) {
            const element = elementList[i]
            if (element && !element.revisionId) {
              element.revisionId = `rev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
              element.revisionType = 'delete'
              element.revisionAuthor = '当前用户'
              element.revisionDate = new Date().toISOString()
            }
          }
          curIndex = startIndex
        } else {
          draw.spliceElementList(
            elementList,
            startIndex + 1,
            endIndex - startIndex
          )
          curIndex = startIndex
        }
      } else {
        if (!elementList[index + 1]) return
        if (isTrackChanges) {
          const element = elementList[index + 1]

          if (element && !element.revisionId) {
            const nextElement = elementList[index + 2]
            if (nextElement && nextElement.revisionType === 'delete' && nextElement.revisionAuthor === '当前用户') {
              element.revisionId = nextElement.revisionId
              element.revisionType = 'delete'
              element.revisionAuthor = nextElement.revisionAuthor
              element.revisionDate = nextElement.revisionDate
            } else {
              element.revisionId = `rev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
              element.revisionType = 'delete'
              element.revisionAuthor = '当前用户'
              element.revisionDate = new Date().toISOString()
            }
          }
          curIndex = index
        } else {
          draw.spliceElementList(elementList, index + 1, 1)
          curIndex = index
        }
      }
    }
  }
  draw.getGlobalEvent().setCanvasEventAbility()
  if (curIndex === null) {
    rangeManager.setRange(startIndex, startIndex)
    draw.render({
      curIndex: startIndex,
      isSubmitHistory: false,
      isPartialRender: true
    })
  } else {
    rangeManager.setRange(curIndex, curIndex)
    draw.render({
      curIndex,
      isPartialRender: true
    })
  }
}
