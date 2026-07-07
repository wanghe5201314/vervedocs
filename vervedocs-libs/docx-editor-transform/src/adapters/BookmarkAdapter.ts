import { IElement } from '@vervedoc/docx-editor-schema'
import { formatElementContext } from '@vervedoc/docx-editor-schema'
import { BaseCommandAdapter, IAdapterContext } from './types'

export class BookmarkAdapter extends BaseCommandAdapter {
  constructor(context: IAdapterContext) {
    super(context)
  }

  public getBookmarks(): Array<{ name: string; index: number }> {
    const elementList = this.draw.getOriginalMainElementList()
    const map = new Map<string, number>()
    for (let i = 0; i < elementList.length; i++) {
      const element: any = elementList[i]
      const ext = element?.extension
      const marker = ext && typeof ext === 'object' ? (ext as any).bookmarkMarker : null
      const name = marker?.name
      if (!name || typeof name !== 'string') continue
      const pos = marker?.position === 'end' ? 'end' : 'start'
      if (pos === 'start') {
        if (!map.has(name)) map.set(name, i)
      } else if (!map.has(name)) {
        map.set(name, i)
      }
    }
    return Array.from(map.entries())
      .map(([name, index]) => ({ name, index }))
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  }

  public addBookmark(payload: { name: string }): void {
    if (this.isDisabled()) return
    const activeControl = this.draw.getControl().getActiveControl()
    if (activeControl) return

    const name = payload?.name?.trim()
    if (!name) return
    const isValid = /^[A-Za-z][A-Za-z0-9_]*$/.test(name)
    if (!isValid) return

    const exists = this.getBookmarks().some(b => b.name === name)
    if (exists) return

    const { startIndex, endIndex } = this.range.getRange()
    if (startIndex < 0 || endIndex < 0) return
    const elementList = this.draw.getElementList()
    const ZWSP = '\u200B'
    const isCollapsed = startIndex === endIndex
    const insertStart = startIndex + 1
    const insertEnd = endIndex + 1

    if (!isCollapsed) {
      const endMarker: IElement = {
        value: ZWSP,
        extension: { bookmarkMarker: { name, position: 'end' } }
      }
      formatElementContext(elementList, [endMarker], endIndex, {
        editorOptions: this.options
      })
      this.draw.spliceElementList(elementList, Math.min(insertEnd, elementList.length), 0, [endMarker])

      const startMarker: IElement = {
        value: ZWSP,
        extension: { bookmarkMarker: { name, position: 'start' } }
      }
      formatElementContext(elementList, [startMarker], startIndex, {
        editorOptions: this.options
      })
      this.draw.spliceElementList(elementList, Math.min(insertStart, elementList.length), 0, [startMarker])

      const curIndex = Math.min(insertEnd + 1, elementList.length - 1)
      this.range.setRange(curIndex, curIndex)
      this.draw.render({ curIndex })
      return
    }

    const marker: IElement = {
      value: ZWSP,
      extension: { bookmarkMarker: { name, position: 'start' } }
    }
    formatElementContext(elementList, [marker], startIndex, {
      editorOptions: this.options
    })
    const insertAt = Math.min(insertStart, elementList.length)
    this.draw.spliceElementList(elementList, insertAt, 0, [marker])
    const curIndex = Math.min(insertAt, elementList.length - 1)
    this.range.setRange(curIndex, curIndex)
    this.draw.render({ curIndex })
  }

  public deleteBookmark(payload: { name: string }): void {
    if (this.isDisabled()) return
    const name = payload?.name?.trim()
    if (!name) return
    const elementList = this.draw.getElementList()
    const indicesToDelete: number[] = []
    for (let i = 0; i < elementList.length; i++) {
      const el: any = elementList[i]
      const ext = el?.extension
      const marker = ext && typeof ext === 'object' ? (ext as any).bookmarkMarker : null
      if (marker?.name === name) {
        indicesToDelete.push(i)
      }
    }
    if (!indicesToDelete.length) return
    indicesToDelete.sort((a, b) => b - a)
    for (const idx of indicesToDelete) {
      this.draw.spliceElementList(elementList, idx, 1)
    }
    const firstRemovedIndex = indicesToDelete[indicesToDelete.length - 1]
    const curIndex = Math.max(0, Math.min(firstRemovedIndex - 1, elementList.length - 1))
    this.range.setRange(curIndex, curIndex)
    this.draw.render({ curIndex })
  }

  public gotoBookmark(payload: { name: string }): void {
    const name = payload?.name?.trim()
    if (!name) return
    const list = this.getBookmarks()
    const target = list.find(b => b.name === name)
    if (!target) return
    const index = target.index
    this.position.setPositionContext({ isTable: false })
    this.range.setRange(index, index)
    this.draw.render({
      curIndex: index,
      isCompute: false,
      isSubmitHistory: false
    })
  }
}
