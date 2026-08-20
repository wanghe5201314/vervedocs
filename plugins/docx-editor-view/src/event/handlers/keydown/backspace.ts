﻿import { ZERO } from '@vervedoc/docx-editor-schema'
import { CanvasEvent } from '../../CanvasEvent'

export function backspace(evt: KeyboardEvent, host: CanvasEvent) {
  const draw = host.getDraw()
  if (draw.isReadonly()) return
  const rangeManager = draw.getRange()
  if (!rangeManager.canInput()) return
  const options = draw.getOptions()
  const isTrackChanges = options.trackChanges

  const control = draw.getControl()
  const position = draw.getPosition()
  if (rangeManager.getIsCollapsed()) {
    const range = rangeManager.getRange()
    const elementList = draw.getElementList()
    const element = elementList[range.startIndex]
    if (element.control?.hide || element.area?.hide) {
      const newIndex = control.removeControl(range.startIndex)
      if (newIndex) {
        range.startIndex = newIndex
        range.endIndex = newIndex
        rangeManager.replaceRange(range)
        const positionList = position.getPositionList()
        position.setCursorPosition(positionList[newIndex])
      }
    }
  }
  const { startIndex, endIndex, isCrossRowCol } = rangeManager.getRange()
  let curIndex: number | null
  if (isCrossRowCol) {
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
    curIndex = isDeleted ? 0 : null
  } else if (
    control.getActiveControl() &&
    control.getIsRangeCanCaptureEvent()
  ) {
    curIndex = control.keydown(evt)
    if (curIndex) {
      control.emitControlContentChange()
    }
  } else {
    const cursorPosition = position.getCursorPosition()
    if (!cursorPosition) return
    const { index } = cursorPosition
    const isCollapsed = rangeManager.getIsCollapsed()
    const elementList = draw.getElementList()
    if (isCollapsed && index === 0) {
      const firstElement = elementList[index]
      if (firstElement.value === ZERO) {
        if (firstElement.listId) {
          draw.getListParticle().unsetList()
        }
        evt.preventDefault()
        return
      }
    }
    const startElement = elementList[startIndex]
    if (isCollapsed && startElement.rowFlex && startElement.value === ZERO) {
      const rowFlexElementList = rangeManager.getRangeRowElementList()
      if (rowFlexElementList) {
        const preElement = elementList[startIndex - 1]
        rowFlexElementList.forEach(element => {
          element.rowFlex = preElement?.rowFlex
        })
      }
    }
    if (!isCollapsed) {
      if (isTrackChanges) {

        for (let i = startIndex + 1; i <= endIndex; i++) {
          const element = elementList[i]
          if (element && !element.revisionId) {
            element.revisionId = 'rev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
            element.revisionType = 'delete'
            element.revisionAuthor = '当前用户'
            element.revisionDate = new Date().toISOString()
          }
        }
        curIndex = startIndex
      } else {
        draw.spliceElementList(elementList, startIndex + 1, endIndex - startIndex)
        curIndex = startIndex
      }
    } else {
      if (isTrackChanges) {
        const element = elementList[index]
        if (element && !element.revisionId) {
          let nextRevisionElement = null
          for (let i = index + 1; i < elementList.length; i++) {
            const el = elementList[i]
            if (el && el.revisionType === 'delete' && el.revisionAuthor === '当前用户') {
              nextRevisionElement = el
              break
            }
            if (el && !el.revisionId) break
          }
          if (nextRevisionElement) {
            element.revisionId = nextRevisionElement.revisionId
            element.revisionType = 'delete'
            element.revisionAuthor = nextRevisionElement.revisionAuthor
            element.revisionDate = nextRevisionElement.revisionDate
          } else {
            element.revisionId = 'rev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
            element.revisionType = 'delete'
            element.revisionAuthor = '当前用户'
            element.revisionDate = new Date().toISOString()
          }
        }
        curIndex = index - 1
      } else {
        draw.spliceElementList(elementList, index, 1)
        curIndex = index - 1
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
