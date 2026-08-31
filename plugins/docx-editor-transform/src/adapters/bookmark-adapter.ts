import { IElement } from '@vervedoc/docx-editor-schema'
import { formatElementContext } from '@vervedoc/docx-editor-schema'
import { BaseCommandAdapter, IAdapterContext } from './types'

export interface IBookmarkInfo {
  name: string
  index: number
  startIndex: number
  endIndex: number | null
  collapsed: boolean
  hidden: boolean
}

export class BookmarkAdapter extends BaseCommandAdapter {
  constructor(context: IAdapterContext) {
    super(context)
  }

  private _getBookmarkMarker(element: IElement | undefined) {
    const ext = (element as any)?.extension
    const marker =
      ext && typeof ext === 'object' ? (ext as any).bookmarkMarker : null
    if (!marker?.name || typeof marker.name !== 'string') return null
    return {
      name: marker.name as string,
      position: marker.position === 'end' ? 'end' : 'start'
    }
  }

  private _isBookmarkNameValid(name: string) {
    return /^[\w\u4e00-\u9fff]+$/.test(name)
  }

  public getBookmarks(): IBookmarkInfo[] {
    const elementList = this.draw.getOriginalMainElementList()
    const map = new Map<string, IBookmarkInfo>()
    for (let i = 0; i < elementList.length; i++) {
      const marker = this._getBookmarkMarker(elementList[i])
      if (!marker) continue
      const current = map.get(marker.name)
      if (!current) {
        map.set(marker.name, {
          name: marker.name,
          index: i,
          startIndex: marker.position === 'start' ? i : -1,
          endIndex: marker.position === 'end' ? i : null,
          collapsed: marker.position !== 'end',
          hidden: marker.name.startsWith('_')
        })
        continue
      }
      if (marker.position === 'start') {
        if (current.startIndex < 0) current.startIndex = i
        current.index = current.startIndex
      } else {
        current.endIndex = i
        if (current.startIndex < 0) {
          current.startIndex = i
          current.index = i
        }
      }
    }
    return Array.from(map.values())
      .map(bookmark => ({
        ...bookmark,
        collapsed:
          bookmark.endIndex == null || bookmark.endIndex <= bookmark.startIndex + 1
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  }

  public addBookmark(payload: { name: string }): void {
    if (this.isDisabled()) return
    const activeControl = this.draw.getControl().getActiveControl()
    if (activeControl) return

    const name = payload?.name?.trim()
    if (!name) return
    const isValid = this._isBookmarkNameValid(name)
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
      const marker = this._getBookmarkMarker(elementList[i])
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
    const elementList = this.draw.getElementList()
    const caretIndex = Math.max(
      0,
      Math.min(target.startIndex + 1, elementList.length - 1)
    )
    const hasRange =
      target.endIndex !== null && target.endIndex > target.startIndex + 1
    const startIndex = caretIndex
    const endIndex = hasRange
      ? Math.max(caretIndex, (target.endIndex as number) - 1)
      : startIndex
    this.position.setPositionContext({ isTable: false })
    this.range.setRange(startIndex, endIndex)
    this.draw.render({
      curIndex: endIndex,
      isCompute: false,
      isSubmitHistory: false
    })
  }
}
