import { AREA_CONTEXT_ATTR } from '@wanghe1995/docx-editor-schema'
import { TABLE_CONTEXT_ATTR } from '@wanghe1995/docx-editor-schema'
import { EDITOR_ROW_ATTR } from '@wanghe1995/docx-editor-schema'
import { LIST_CONTEXT_ATTR } from '@wanghe1995/docx-editor-schema'
import { IElement } from '@wanghe1995/docx-editor-schema'
import { IInsertElementListOption } from '@wanghe1995/docx-editor-schema'
import { IAppendElementListOption } from '@wanghe1995/docx-editor-schema'
import { IUpdateElementByIdOption } from '@wanghe1995/docx-editor-schema'
import { IDeleteElementByIdOption } from '@wanghe1995/docx-editor-schema'
import { formatElementList } from '@wanghe1995/docx-editor-schema'
import { deepClone, cloneProperty, getAnchorElement } from '@wanghe1995/docx-editor-schema'
import { isTableElement, zipElementList } from '@wanghe1995/docx-editor-schema'
import { getElementListByHTML } from '@wanghe1995/docx-editor-schema'
import { BaseCommandAdapter, IAdapterContext } from './types'

export class ElementAdapter extends BaseCommandAdapter {
  constructor(context: IAdapterContext) {
    super(context)
  }

  public insertElementList(payload: IElement[], options: IInsertElementListOption = {}): void {
    this.insertFormattedElementList(payload, options)
  }

  public appendElementList(elementList: IElement[], options?: IAppendElementListOption): void {
    if (!elementList.length) return
    if (this.isReadonly()) return
    this.draw.appendElementList(deepClone(elementList), options)
  }

  public updateElementById(payload: IUpdateElementByIdOption): void {
    const { id, conceptId } = payload
    if (!id && !conceptId) return
    const updateElementInfoList: { elementList: IElement[]; index: number }[] = []
    function getElementInfoById(elementList: IElement[]) {
      let i = 0
      while (i < elementList.length) {
        const element = elementList[i]
        i++
        if (isTableElement(element)) {
          const trList = element.trList!
          for (let r = 0; r < trList.length; r++) {
            const tr = trList[r]
            for (let d = 0; d < tr.tdList.length; d++) {
              const td = tr.tdList[d]
              getElementInfoById(td.value)
            }
          }
        }
        if (
          (id && element.id === id) ||
          (conceptId && element.conceptId === conceptId)
        ) {
          updateElementInfoList.push({ elementList, index: i - 1 })
        }
      }
    }
    const data = [
      this.draw.getOriginalMainElementList(),
      this.draw.getHeaderElementList(),
      this.draw.getFooterElementList()
    ]
    for (const elementList of data) {
      getElementInfoById(elementList)
    }
    if (!updateElementInfoList.length) return
    for (let i = 0; i < updateElementInfoList.length; i++) {
      const { elementList, index } = updateElementInfoList[i]
      const oldElement = elementList[index]
      const newElement = zipElementList(
        [{ ...oldElement, ...payload.properties }],
        { extraPickAttrs: ['id'] }
      )
      cloneProperty<IElement>(AREA_CONTEXT_ATTR, oldElement, newElement[0])
      formatElementList(newElement, {
        isHandleFirstElement: false,
        editorOptions: this.options
      })
      elementList[index] = newElement[0]
    }
    this.draw.render({ isSetCursor: false })
  }

  public deleteElementById(payload: IDeleteElementByIdOption): void {
    const { id, conceptId } = payload
    if (!id && !conceptId) return
    let isExistDelete = false
    function deleteElement(elementList: IElement[]) {
      let i = 0
      while (i < elementList.length) {
        const element = elementList[i]
        if (isTableElement(element)) {
          const trList = element.trList!
          for (let r = 0; r < trList.length; r++) {
            for (let d = 0; d < trList[r].tdList.length; d++) {
              deleteElement(trList[r].tdList[d].value)
            }
          }
        }
        if (
          (id && element.id === id) ||
          (conceptId && element.conceptId === conceptId)
        ) {
          isExistDelete = true
          elementList.splice(i, 1)
          i--
        }
        i++
      }
    }
    const data = [
      this.draw.getOriginalMainElementList(),
      this.draw.getHeaderElementList(),
      this.draw.getFooterElementList()
    ]
    for (const elementList of data) {
      deleteElement(elementList)
    }
    if (!isExistDelete) return
    this.draw.render({ isSetCursor: false })
  }

  public getElementById(payload: { id?: string; conceptId?: string }): IElement[] {
    const { id, conceptId } = payload
    const result: IElement[] = []
    if (!id && !conceptId) return result
    const getElement = (elementList: IElement[]) => {
      let i = 0
      while (i < elementList.length) {
        const element = elementList[i]
        i++
        if (isTableElement(element)) {
          const trList = element.trList!
          for (let r = 0; r < trList.length; r++) {
            for (let d = 0; d < trList[r].tdList.length; d++) {
              getElement(trList[r].tdList[d].value)
            }
          }
        }
        if (
          (id && element.id !== id) ||
          (conceptId && element.conceptId !== conceptId)
        ) {
          continue
        }
        result.push(element)
      }
    }
    const data = [
      this.draw.getHeaderElementList(),
      this.draw.getOriginalMainElementList(),
      this.draw.getFooterElementList()
    ]
    for (const elementList of data) {
      getElement(elementList)
    }
    return zipElementList(result, { extraPickAttrs: ['id'] })
  }

  public setValue(payload: any, options?: any): void {
    this.draw.setValue(payload, options)
  }

  public setHTML(payload: { header?: string; main?: string; footer?: string }): void {
    const { header, main, footer } = payload
    const innerWidth = this.draw.getOriginalInnerWidth()
    const getElementList = (htmlText?: string) =>
      htmlText !== undefined
        ? getElementListByHTML(htmlText, { innerWidth })
        : undefined
    this.setValue({
      header: getElementList(header),
      main: getElementList(main),
      footer: getElementList(footer)
    })
  }

  public insertControl(payload: IElement): void {
    if (this.isDisabled()) return
    const cloneElement = deepClone(payload)
    const { startIndex } = this.range.getRange()
    const elementList = this.draw.getElementList()
    const copyElement = getAnchorElement(elementList, startIndex)
    if (!copyElement) return
    const cloneAttr = [
      ...TABLE_CONTEXT_ATTR,
      ...EDITOR_ROW_ATTR,
      ...LIST_CONTEXT_ATTR,
      ...AREA_CONTEXT_ATTR
    ]
    cloneProperty<IElement>(cloneAttr, copyElement, cloneElement)
    this.draw.insertElementList([cloneElement])
  }

  public insertTitle(payload: IElement): void {
    if (this.isDisabled()) return
    const cloneElement = deepClone(payload)
    const { startIndex } = this.range.getRange()
    const elementList = this.draw.getElementList()
    const copyElement = getAnchorElement(elementList, startIndex)
    if (!copyElement) return
    const cloneAttr = [
      ...TABLE_CONTEXT_ATTR,
      ...EDITOR_ROW_ATTR,
      ...LIST_CONTEXT_ATTR,
      ...AREA_CONTEXT_ATTR
    ]
    cloneElement.valueList?.forEach(valueItem => {
      cloneProperty<IElement>(cloneAttr, copyElement, valueItem)
    })
    this.draw.insertElementList([cloneElement])
  }

  public acceptRevision(revisionId?: string): void {
    if (this.isReadonly()) return
    const elementList = this.draw.getElementList()
    let removed = false
    for (let i = elementList.length - 1; i >= 0; i--) {
      const el = elementList[i]
      if (revisionId && el.revisionId !== revisionId) continue
      if (!el.revisionType) continue
      if (el.revisionType === 'delete') {
        elementList.splice(i, 1)
        removed = true
      } else if (el.revisionType === 'insert') {
        delete el.revisionId
        delete el.revisionType
        delete el.revisionAuthor
        delete el.revisionDate
        removed = true
      }
    }
    if (removed) {
      this.draw.render({ isSetCursor: false, isSubmitHistory: true })
    }
  }

  public rejectRevision(revisionId?: string): void {
    if (this.isReadonly()) return
    const elementList = this.draw.getElementList()
    let removed = false
    for (let i = elementList.length - 1; i >= 0; i--) {
      const el = elementList[i]
      if (revisionId && el.revisionId !== revisionId) continue
      if (!el.revisionType) continue
      if (el.revisionType === 'insert') {
        elementList.splice(i, 1)
        removed = true
      } else if (el.revisionType === 'delete') {
        delete el.revisionId
        delete el.revisionType
        delete el.revisionAuthor
        delete el.revisionDate
        removed = true
      }
    }
    if (removed) {
      this.draw.render({ isSetCursor: false, isSubmitHistory: true })
    }
  }

  public acceptAllRevisions(): void {
    this.acceptRevision()
  }

  public rejectAllRevisions(): void {
    this.rejectRevision()
  }
}
