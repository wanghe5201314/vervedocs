import type { IElement, IEditorOption, Path } from '@vervedoc/docx-editor-schema'
import { walkTree, getByPath } from '@vervedoc/docx-editor-schema'
import type { RangeManager } from '@vervedoc/docx-editor-state'
import type { Draw } from '@vervedoc/docx-editor-view'
import { TEXTLIKE_ELEMENT_TYPE } from '../constants'

/** 搜索匹配结果（基于树路径） */
export interface ISearchResult {
  /** 匹配所在元素的路径 */
  path: Path
  /** 元素 value 内的起始偏移 */
  offset: number
  /** 匹配关键词长度 */
  length: number
  /** 匹配组标识（同一关键词的一次匹配共享一个 groupId） */
  groupId: string
}

/** 替换选项 */
export interface IReplaceOption {
  /** 指定替换第几组匹配，不传则替换全部 */
  index?: number
}

export interface INavigateInfo {
  index: number
  count: number
}

/** 生成简易唯一 ID */
function getUUID(): string {
  return `s-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
}

function isNumber(v: unknown): v is number {
  return typeof v === 'number'
}

/** 文本类元素判定（可参与搜索） */
function isSearchable(el: IElement): boolean {
  return TEXTLIKE_ELEMENT_TYPE.has(el.type) && !!el.value
}

export class Search {
  private draw: Draw
  private options: IEditorOption
  private range: RangeManager | null
  private searchKeyword: string | null
  private searchNavigateIndex: number | null
  private searchMatchList: ISearchResult[]

  constructor(draw: Draw) {
    this.draw = draw
    this.options = draw.getOptions()
    this.range = draw.getRange()
    this.searchNavigateIndex = null
    this.searchKeyword = null
    this.searchMatchList = []
  }

  public getSearchKeyword(): string | null {
    return this.searchKeyword
  }

  public setSearchKeyword(payload: string | null) {
    this.searchKeyword = payload
    this.searchNavigateIndex = null
  }

  /** 上一个匹配 */
  public searchNavigatePre(): number | null {
    if (!this.searchMatchList.length || !this.searchKeyword) return null
    if (this.searchNavigateIndex === null) {
      this.searchNavigateIndex = 0
    } else {
      this.searchNavigateIndex = Math.max(0, this.searchNavigateIndex - 1)
    }
    this._applyNavigate()
    return this.searchNavigateIndex
  }

  /** 下一个匹配 */
  public searchNavigateNext(): number | null {
    if (!this.searchMatchList.length || !this.searchKeyword) return null
    if (this.searchNavigateIndex === null) {
      this.searchNavigateIndex = 0
    } else {
      this.searchNavigateIndex = Math.min(
        this.searchMatchList.length - 1,
        this.searchNavigateIndex + 1
      )
    }
    this._applyNavigate()
    return this.searchNavigateIndex
  }

  /** 将当前导航匹配定位到光标 */
  private _applyNavigate(): void {
    if (this.searchNavigateIndex === null) return
    const match = this.searchMatchList[this.searchNavigateIndex]
    if (!match || !this.range) return
    this.range.setCaret({ path: match.path.slice() as Path, offset: match.offset })
  }

  public getSearchNavigateIndexList(): number[] {
    if (this.searchNavigateIndex === null || !this.searchKeyword) return []
    return [this.searchNavigateIndex]
  }

  public getSearchMatchList(): ISearchResult[] {
    return this.searchMatchList
  }

  public getSearchNavigateInfo(): null | INavigateInfo {
    if (!this.searchKeyword || !this.searchMatchList.length) return null
    const index = this.searchNavigateIndex !== null ? this.searchNavigateIndex + 1 : 0
    return {
      index,
      count: this.searchMatchList.length
    }
  }

  /**
   * 在元素列表中搜索关键字，返回匹配列表。
   * 基于 walkTree 遍历，在每个文本元素的 value 内进行匹配。
   */
  public getSearchMatchListByKeyword(
    payload: string,
    elementList: IElement[]
  ): ISearchResult[] {
    if (!payload) return []
    const keyword = payload.toLocaleLowerCase()
    const matchList: ISearchResult[] = []

    walkTree(elementList, (node, ctx) => {
      if (!isSearchable(node)) return
      const text = node.value.toLocaleLowerCase()
      let pos = text.indexOf(keyword)
      while (pos !== -1) {
        matchList.push({
          path: ctx.path.slice() as Path,
          offset: pos,
          length: payload.length,
          groupId: getUUID()
        })
        pos = text.indexOf(keyword, pos + keyword.length)
      }
    })

    return matchList
  }

  /** 计算并缓存搜索匹配 */
  public computeSearchMatches(payload: string) {
    this.searchMatchList = this.getSearchMatchListByKeyword(
      payload,
      this.draw.getElementList()
    )
  }

  /**
   * 绘制搜索高亮：从 verve layout 查找匹配元素的 inline 坐标。
   */
  public renderSearchHighlights(ctx: CanvasRenderingContext2D, pageIndex: number) {
    if (!this.searchMatchList.length || !this.searchKeyword) return
    const layout = (this.draw as any).getLayout?.()
    if (!layout) return

    const opts = this.options as any
    const alpha = opts.searchMatchAlpha ?? 0.3
    const matchColor = opts.searchMatchColor ?? '#ffe58f'
    const navigateColor = opts.searchNavigateMatchColor ?? '#ff9c6e'
    const navigateIndexList = this.getSearchNavigateIndexList()

    ctx.save()
    ctx.globalAlpha = alpha
    for (let s = 0; s < this.searchMatchList.length; s++) {
      const match = this.searchMatchList[s]
      const rect = this._findMatchRect(layout, match)
      if (!rect) continue
      if (rect.pageNo !== pageIndex) continue
      ctx.fillStyle = navigateIndexList.includes(s) ? navigateColor : matchColor
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
    }
    ctx.restore()
  }

  /** 在 layout 中查找匹配对应的矩形坐标 */
  private _findMatchRect(
    layout: any,
    match: ISearchResult
  ): { x: number; y: number; width: number; height: number; pageNo: number } | null {
    for (let p = 0; p < layout.pages.length; p++) {
      const page = layout.pages[p]
      const found = this._findInBlocks(page.blocks, page.contentRect.x, page.contentRect.y, p, match)
      if (found) return found
    }
    return null
  }

  private _findInBlocks(
    blocks: any[],
    originX: number,
    originY: number,
    pageNo: number,
    match: ISearchResult
  ): { x: number; y: number; width: number; height: number; pageNo: number } | null {
    for (const b of blocks) {
      if (b.kind === 'table') {
        for (const row of b.rows) {
          for (const cell of row.cells) {
            const cx = originX + b.rect.x + cell.rect.x + cell.contentPaddingLeft
            const cy = originY + b.rect.y + cell.rect.y + cell.contentPaddingTop + cell.verticalOffset
            const found = this._findInBlocks(cell.content, cx, cy, pageNo, match)
            if (found) return found
          }
        }
        continue
      }
      if (b.kind !== 'paragraph') continue
      const bx = originX + b.rect.x
      const by = originY + b.rect.y
      for (const line of b.lines) {
        for (const inl of line.inlines) {
          // 通过 inline 的 path 匹配
          if (this._pathMatchesInline(inl, match)) {
            return {
              x: bx + inl.x,
              y: by + line.y,
              width: inl.width,
              height: line.height,
              pageNo
            }
          }
        }
      }
    }
    return null
  }

  /** 判断 inline 是否属于匹配的元素 */
  private _pathMatchesInline(inl: any, match: ISearchResult): boolean {
    if (!inl.path) return false
    const p = inl.path as Path
    if (p.length !== match.path.length) return false
    for (let i = 0; i < p.length; i++) {
      if (p[i] !== match.path[i]) return false
    }
    return true
  }

  /** 滚动到当前导航匹配的可视范围 */
  public searchNavigateScrollIntoView() {
    if (this.searchNavigateIndex === null) return
    const match = this.searchMatchList[this.searchNavigateIndex]
    if (!match) return
    const layout = (this.draw as any).getLayout?.()
    if (!layout) return
    const rect = this._findMatchRect(layout, match)
    if (!rect) return
    const container = this.draw.getContainer()
    const anchor = document.createElement('div')
    anchor.style.position = 'absolute'
    anchor.style.width = `${rect.width + 50}px`
    anchor.style.height = `${rect.height + 50}px`
    anchor.style.left = `${rect.x}px`
    anchor.style.top = `${rect.y}px`
    container.append(anchor)
    anchor.scrollIntoView(false)
    anchor.remove()
  }

  /**
   * 替换匹配的关键词。
   * 基于 verve 树模型：直接修改元素的 value，再 setDocument 刷新。
   */
  public replaceSearchMatch(payload: string, option?: IReplaceOption) {
    const isReadonly = (this.draw as any).isReadonly?.()
    if (isReadonly) return
    if (!payload) return

    let matchList = this.getSearchMatchList()
    const replaceIndex = option?.index
    if (isNumber(replaceIndex)) {
      matchList = [matchList[replaceIndex]].filter(Boolean)
    }
    if (!matchList.length) return

    const elementList = this.draw.getElementList()
    const keyword = this.searchKeyword!
    let firstMatch: ISearchResult | null = null

    for (const match of matchList) {
      const element = getByPath(elementList, match.path)
      if (!element || !element.value) continue
      // 在 value 中替换关键词
      const before = element.value
      element.value = before.slice(0, match.offset) + payload + before.slice(match.offset + keyword.length)
      if (!firstMatch) firstMatch = match
    }

    if (!firstMatch) return
    // 定位到首个替换位置
    if (this.range) {
      this.range.setCaret({
        path: firstMatch.path.slice() as Path,
        offset: firstMatch.offset + payload.length
      })
    }
    // 重新渲染
    this.draw.setDocument(this.draw.getDocument())
    // 重新计算匹配
    this.computeSearchMatches(keyword)
  }
}
