import dayjs from 'dayjs'
import type { CommentHost } from './host'

const PREFIX = 'ce'

interface RevisionBalloonData {
  revisionId: string
  type: 'insert' | 'delete' | 'format'
  author: string
  date: string
  content: string
  top: number
  left: number
  anchorStartX: number
  anchorStartY: number
  anchorEndX: number
  anchorEndY: number
  pageRight: number
  glyphHeight: number
  startGlyphTop: number
  endGlyphTop: number
}

export interface RevisionCallbacks {
  onAccept?: (revisionId: string) => void
  onReject?: (revisionId: string) => void
}

export class RevisionComponent {
  /** 宿主契约（由 core 注入） */
  private _command: CommentHost | null = null
  /** 气泡挂载容器（Draw scroller） */
  private _container: HTMLDivElement | null = null
  /** 修订 overlay 容器 */
  private _overlayContainer: HTMLDivElement | null = null
  /** 修订气泡 DOM 映射（revisionId → 气泡元素） */
  private _balloonDoms: Map<string, HTMLDivElement> = new Map()
  /** 生命周期回调 */
  private _callbacks: RevisionCallbacks = {}
  /** 锚点竖线 DOM 元素列表 */
  private _anchorLineEls: HTMLDivElement[] = []

  /** 修订高亮颜色（取编辑器选项 revisionColor，默认 #e60000） */
  private get _revisionColor(): string {
    return this._command?.getOptions?.()?.revisionColor || '#e60000'
  }

  /** 注入宿主契约并创建 overlay 容器（由 createRevisionPlugin 的 install 调用） */
  public install(command: CommentHost): this {
    if (this._command && this._command !== command) {
      console.warn(
        '[RevisionComponent] install() 已被调用，忽略重复注入。' +
        '若要更新回调请使用 DocxEditor.setRevisionCallbacks(...)'
      )
      return this
    }
    this._command = command
    const container = command.getContainer?.()
    if (container) {
      this._container = container
      if (!this._overlayContainer) {
        this._overlayContainer = this._createOverlayContainer()
        this._container!.append(this._overlayContainer)
      }
    }
    return this
  }

  /** 设置修订生命周期回调 */
  public setCallbacks(callbacks: RevisionCallbacks): this {
    this._callbacks = callbacks || {}
    return this
  }

  private _createOverlayContainer(): HTMLDivElement {
    const el = document.createElement('div')
    el.classList.add(`${PREFIX}-revision-overlay`)
    el.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;overflow:visible;'
    return el
  }

  private _formatDate(dateStr: string): string {
    if (!dateStr) return ''
    const d = dayjs(dateStr)
    return d.isValid() ? d.format('YYYY/M/D HH:mm') : dateStr.replace(/-/g, '/')
  }

  private _getTypeLabel(type: RevisionBalloonData['type']): string {
    if (type === 'insert') return '插入：'
    if (type === 'delete') return '删除：'
    return '格式：'
  }

  private _createBalloonDom(balloon: RevisionBalloonData): HTMLDivElement {
    const div = document.createElement('div')
    div.classList.add(`${PREFIX}-revision-balloon`)
    div.style.cssText =
      'position:absolute;pointer-events:auto;min-width:270px;max-width:270px;box-sizing:border-box;' +
      'padding:8px 10px;background:#f7f7f7;border:1px solid #d9d9d9;border-radius:6px;' +
      'font-size:12px;box-shadow:0 4px 14px rgba(0,0,0,0.10);'
    div.style.top = `${balloon.top}px`
    div.style.left = `${balloon.left}px`
    div.addEventListener('mouseenter', () => this._showAnchorLines(balloon))
    div.addEventListener('mouseleave', () => this._hideAnchorLines())

    const header = document.createElement('div')
    header.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:6px;gap:6px;'

    const meta = document.createElement('div')
    meta.style.cssText = 'display:flex;align-items:flex-start;gap:8px;min-width:0;flex:1;'

    const marker = document.createElement('div')
    marker.className = 'revision-marker'
    marker.style.cssText = 'width:14px;height:14px;border-radius:2px;background:#d9d9d9;flex-shrink:0;margin-top:2px;'

    const metaText = document.createElement('div')
    metaText.style.cssText = 'display:flex;flex-direction:column;align-items:flex-start;gap:1px;min-width:0;flex:1;'

    const authorSpan = document.createElement('span')
    authorSpan.className = 'revision-author'
    authorSpan.style.cssText = 'color:#1f1f1f;font-weight:700;font-size:12px;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;'
    authorSpan.textContent = balloon.author || '未知'

    const dateSpan = document.createElement('span')
    dateSpan.className = 'revision-date'
    dateSpan.style.cssText = 'color:#8c8c8c;font-size:11px;line-height:1.15;white-space:nowrap;'
    dateSpan.textContent = this._formatDate(balloon.date)

    const actions = document.createElement('div')
    actions.style.cssText = 'display:flex;align-items:center;gap:1px;flex-shrink:0;'

    const acceptBtn = document.createElement('button')
    acceptBtn.title = '接受修订'
    acceptBtn.type = 'button'
    acceptBtn.style.cssText =
      'display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;' +
      'border:none;background:transparent;border-radius:4px;cursor:pointer;transition:background 0.15s;color:#1f1f1f;padding:0;'
    acceptBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="m9.55 18.2-5.4-5.4 1.41-1.4 3.99 3.98 8.89-8.88 1.41 1.41-10.3 10.29Z" fill="currentColor"/></svg>'
    acceptBtn.addEventListener('mouseenter', () => { acceptBtn.style.background = '#f0f0f0' })
    acceptBtn.addEventListener('mouseleave', () => { acceptBtn.style.background = 'transparent' })
    acceptBtn.addEventListener('click', () => { this.accept(balloon.revisionId) })

    const rejectBtn = document.createElement('button')
    rejectBtn.title = '拒绝修订'
    rejectBtn.type = 'button'
    rejectBtn.style.cssText =
      'display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;' +
      'border:none;background:transparent;border-radius:4px;cursor:pointer;transition:background 0.15s;color:#1f1f1f;padding:0;'
    rejectBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="m18.3 5.71-1.41-1.41L12 9.17 7.11 4.3 5.7 5.71 10.59 10.6 5.7 15.49l1.41 1.41L12 12.01l4.89 4.89 1.41-1.41-4.89-4.89 4.89-4.89Z" fill="currentColor"/></svg>'
    rejectBtn.addEventListener('mouseenter', () => { rejectBtn.style.background = '#f0f0f0' })
    rejectBtn.addEventListener('mouseleave', () => { rejectBtn.style.background = 'transparent' })
    rejectBtn.addEventListener('click', () => { this.reject(balloon.revisionId) })

    actions.append(acceptBtn, rejectBtn)
    metaText.append(authorSpan, dateSpan)
    meta.append(marker, metaText)
    header.append(meta, actions)

    const body = document.createElement('div')
    body.style.cssText = 'font-size:12px;line-height:1.45;word-break:break-word;padding:1px 0;color:#1f1f1f;white-space:pre-wrap;'

    const typeLabel = document.createElement('span')
    typeLabel.className = 'revision-type'
    typeLabel.style.cssText = 'color:#1f1f1f;font-weight:600;'
    typeLabel.textContent = this._getTypeLabel(balloon.type)

    const contentSpan = document.createElement('span')
    contentSpan.className = 'revision-content'
    contentSpan.style.cssText = 'color:#1f1f1f;'
    contentSpan.textContent = balloon.content

    body.append(typeLabel, contentSpan)
    div.append(header, body)
    const arrow = document.createElement('div')
    arrow.style.cssText = 'position:absolute;left:-7px;top:20px;width:14px;height:14px;background:#f7f7f7;border-left:1px solid #d9d9d9;border-bottom:1px solid #d9d9d9;transform:rotate(45deg);border-bottom-left-radius:2px;box-sizing:border-box;'
    div.append(arrow)
    return div
  }

  private _collectOccupiedRanges(selector: string): Array<{ top: number; bottom: number }> {
    if (!this._container) return []
    const ranges: Array<{ top: number; bottom: number }> = []
    const elements = this._container.querySelectorAll(selector)
    elements.forEach((el: Element) => {
      const node = el as HTMLElement
      const top = Number.parseFloat(node.style.top || '')
      const height = node.offsetHeight || node.getBoundingClientRect().height || 0
      if (Number.isFinite(top) && height > 0) {
        ranges.push({ top, bottom: top + height })
      }
    })
    ranges.sort((a, b) => a.top - b.top)
    return ranges
  }

  private _estimateBalloonHeight(balloon: RevisionBalloonData): number {
    const existing = this._balloonDoms.get(balloon.revisionId)
    const existingHeight = existing?.offsetHeight || existing?.getBoundingClientRect().height || 0
    if (existingHeight > 0) return existingHeight
    let height = 82
    height += Math.min(Math.ceil((balloon.content || '').length / 24), 6) * 16
    return Math.max(90, Math.min(height, 220))
  }

  private _resolveVerticalOverlaps(balloons: RevisionBalloonData[]): void {
    const occupied = this._collectOccupiedRanges(`.${PREFIX}-comment-balloon`)
    const GAP = 12
    for (const balloon of balloons) {
      const height = this._estimateBalloonHeight(balloon)
      let top = balloon.top
      let changed = true
      while (changed) {
        changed = false
        for (const range of occupied) {
          if (top < range.bottom + GAP && top + height > range.top - GAP) {
            top = range.bottom + GAP
            changed = true
          }
        }
      }
      balloon.top = top
      occupied.push({ top, bottom: top + height })
      occupied.sort((a, b) => a.top - b.top)
    }
  }



  private _formatRevisionDesc(el: any): string {
    const old = el.revisionOldProps || {}
    const parts: string[] = []
    if (!!el.bold !== !!old.bold) parts.push(el.bold ? '加粗' : '取消加粗')
    if (!!el.italic !== !!old.italic) parts.push(el.italic ? '斜体' : '取消斜体')
    if (!!el.underline !== !!old.underline) parts.push(el.underline ? '下划线' : '取消下划线')
    if (!!el.strikeout !== !!old.strikeout) parts.push(el.strikeout ? '删除线' : '取消删除线')
    if ((el.color || '#000000') !== (old.color || '#000000')) parts.push(`字体颜色: ${el.color || '黑色'}`)
    if ((el.size || 0) !== (old.size || 0)) parts.push(`字号: ${el.size}pt`)
    if ((el.font || '') !== (old.font || '')) parts.push(`字体: ${el.font}`)
    if ((el.highlight || '') !== (old.highlight || '')) parts.push(`高亮: ${el.highlight}`)
    return parts.length ? `设置格式: ${parts.join('，')}` : '设置格式'
  }

  private _getAll(): Array<{
    id: string; type: 'insert' | 'delete' | 'format'; author: string; date: string; content: string; firstIndex: number; lastIndex: number
  }> {
    if (!this._command) return []
    const elementList = this._command.getElementList?.()
    if (!elementList) return []
    const revisionMap = new Map<string, { id: string; type: 'insert' | 'delete' | 'format'; author: string; date: string; content: string; firstIndex: number; lastIndex: number }>()
    for (let i = 0; i < elementList.length; i++) {
      const el = elementList[i]
      if (!el.revisionId || !el.revisionType) continue
      const existing = revisionMap.get(el.revisionId)
      if (existing) {
        if (el.revisionType !== 'format') {
          existing.content += el.value || ''
        }
        existing.lastIndex = i
      } else {
        const content = el.revisionType === 'format'
          ? this._formatRevisionDesc(el)
          : el.value || ''
        revisionMap.set(el.revisionId, {
          id: el.revisionId,
          type: el.revisionType,
          author: el.revisionAuthor || '',
          date: el.revisionDate || '',
          content,
          firstIndex: i,
          lastIndex: i
        })
      }
    }
    return Array.from(revisionMap.values())
  }

  /** 获取全部修订列表（从文档元素中提取 revisionId） */
  public getAll(): Array<{
    id: string; type: 'insert' | 'delete' | 'format'; author: string; date: string; content: string
  }> {
    return this._getAll().map(r => ({
      id: r.id,
      type: r.type,
      author: r.author,
      date: r.date,
      content: r.content
    }))
  }

  /** 刷新修订气泡 DOM 渲染（收集修订 + 计算锚点 + 绘制气泡/竖线） */
  public update() {
    if (!this._command) return
    const options = this._command.getOptions?.()
    if (!options?.showRevisionBalloons) {
      this._clear()
      this._restoreContainerWidth()
      return
    }

    const revisions = this._getAll()
    if (revisions.length === 0) {
      this._clear()
      this._restoreContainerWidth()
      return
    }

    const pageWidth = this._command.getDrawWidth?.() || 794
    const balloonLeft = pageWidth + 16
    const balloons: RevisionBalloonData[] = []
    const elementList = this._command.getElementList?.()

    for (const rev of revisions) {
      const anchor = this._command.getRevisionAnchor?.(rev.id)
      if (!anchor) continue
      const startSize = elementList?.[rev.firstIndex]?.size || 0
      const glyphHeight = anchor.glyphHeight || startSize * 1.15 || anchor.lineHeight || 20
      const startGlyphTop = anchor.startGlyphTop ?? anchor.startY
      const endGlyphTop = anchor.endGlyphTop ?? anchor.startY

      balloons.push({
        revisionId: rev.id,
        type: rev.type,
        author: rev.author,
        date: rev.date,
        content: rev.content,
        top: anchor.startY,
        left: balloonLeft,
        anchorStartX: anchor.startX,
        anchorStartY: anchor.startY,
        anchorEndX: anchor.endX,
        anchorEndY: anchor.endY,
        pageRight: pageWidth,
        glyphHeight,
        startGlyphTop,
        endGlyphTop
      })
    }

    if (balloons.length === 0) {
      this._clear()
      this._restoreContainerWidth()
      return
    }

    balloons.sort((a, b) => a.top - b.top)
    this._resolveVerticalOverlaps(balloons)

    this._expandContainerWidth(balloons)
    this._renderBalloons(balloons)
  }

  private _expandContainerWidth(balloons: RevisionBalloonData[]): void {
    if (!this._command || balloons.length === 0 || !this._container) return
    const pageWidth = this._command.getDrawWidth?.() || 794
    const balloonLeft = pageWidth + 16
    const cardMaxWidth = 270
    const neededWidth = balloonLeft + cardMaxWidth + 16
    ;(this._container as any).__revisionNeededWidth = neededWidth
    this._applyContainerWidth(this._container, pageWidth)
  }

  private _restoreContainerWidth(): void {
    if (!this._command || !this._container) return
    const pageWidth = this._command.getDrawWidth?.() || 794
    ;(this._container as any).__revisionNeededWidth = 0
    this._applyContainerWidth(this._container, pageWidth)
  }

  private _applyContainerWidth(container: HTMLDivElement, pageWidth: number): void {
    // 新架构下容器宽度由 Draw 管理，overlay 通过 overflow: visible 自然溢出
    if ((container as any).__vervedocsNewLayout) return
    const commentWidth = (container as any).__commentNeededWidth || 0
    const revisionWidth = (container as any).__revisionNeededWidth || 0
    const neededWidth = Math.max(commentWidth, revisionWidth)
    if (neededWidth > pageWidth) {
      container.style.width = `${neededWidth}px`
      container.style.minWidth = `${neededWidth}px`
    } else {
      container.style.width = `${pageWidth}px`
      container.style.minWidth = ''
    }
  }

  private _renderBalloons(balloons: RevisionBalloonData[]) {
    if (!this._overlayContainer) return

    const existingIds = new Set(balloons.map(b => b.revisionId))
    for (const [id, dom] of this._balloonDoms) {
      if (!existingIds.has(id)) {
        dom.remove()
        this._balloonDoms.delete(id)
      }
    }

    for (const balloon of balloons) {
      let balloonDom = this._balloonDoms.get(balloon.revisionId)
      if (!balloonDom) {
        balloonDom = this._createBalloonDom(balloon)
        this._overlayContainer.append(balloonDom)
        this._balloonDoms.set(balloon.revisionId, balloonDom)
      } else {
        balloonDom.style.top = `${balloon.top}px`
        balloonDom.style.left = `${balloon.left}px`
        const authorSpan = balloonDom.querySelector('.revision-author') as HTMLSpanElement
        if (authorSpan) {
          authorSpan.textContent = balloon.author || '未知'
        }
        const dateSpan = balloonDom.querySelector('.revision-date') as HTMLSpanElement
        if (dateSpan) {
          dateSpan.textContent = this._formatDate(balloon.date)
        }
        const typeSpan = balloonDom.querySelector('.revision-type') as HTMLSpanElement
        if (typeSpan) {
          typeSpan.textContent = this._getTypeLabel(balloon.type)
        }
        const contentSpan = balloonDom.querySelector('.revision-content') as HTMLSpanElement
        if (contentSpan) {
          contentSpan.textContent = balloon.content
        }
      }
    }
  }

  private _showAnchorLines(balloon: RevisionBalloonData): void {
    this._hideAnchorLines()
    if (!this._overlayContainer) return
    const color = this._revisionColor
    const lineHeight = balloon.anchorEndY - balloon.anchorStartY || 20
    const glyphHeight = balloon.glyphHeight || lineHeight
    const startGlyphTop = balloon.startGlyphTop ?? balloon.anchorStartY
    const endGlyphTop = balloon.endGlyphTop ?? balloon.anchorStartY
    for (const [x, y] of [[balloon.anchorStartX, startGlyphTop], [balloon.anchorEndX, endGlyphTop]]) {
      const line = document.createElement('div')
      line.style.cssText = `position:absolute;left:${x - 1}px;top:${y}px;width:2px;height:${glyphHeight}px;background:${color};pointer-events:none;z-index:11;opacity:0.7;`
      this._overlayContainer.append(line)
      this._anchorLineEls.push(line)
    }
  }

  private _hideAnchorLines(): void {
    for (const el of this._anchorLineEls) el.remove()
    this._anchorLineEls = []
  }

  private _clear() {
    this._hideAnchorLines()
    for (const dom of this._balloonDoms.values()) {
      dom.remove()
    }
    this._balloonDoms.clear()
  }

  /** 接受指定修订：插入型保留、删除型移除、格式型还原 */
  public accept(revisionId: string) {
    if (!this._command) return
    this._hideAnchorLines()
    const elementList = this._command.getElementList?.()
    if (!elementList) return
    const indicesToRemove: number[] = []
    for (let i = elementList.length - 1; i >= 0; i--) {
      const el = elementList[i]
      if (el.revisionId === revisionId) {
        if (el.revisionType === 'delete') {
          indicesToRemove.push(i)
        } else {
          delete el.revisionId
          delete el.revisionType
          delete el.revisionAuthor
          delete el.revisionDate
        }
      }
    }
    for (const idx of indicesToRemove) {
      this._command.spliceElementList?.(elementList, idx, 1, undefined, { isIgnoreDeletedRule: true })
    }
    const dom = this._balloonDoms.get(revisionId)
    if (dom) {
      dom.remove()
      this._balloonDoms.delete(revisionId)
    }
    this._command.renderDraw?.({ isSubmitHistory: true })
    this._callbacks.onAccept?.(revisionId)
  }

  /** 拒绝指定修订：插入型移除、删除型保留、格式型还原 */
  public reject(revisionId: string) {
    if (!this._command) return
    this._hideAnchorLines()
    const elementList = this._command.getElementList?.()
    if (!elementList) return
    const indicesToRemove: number[] = []
    for (let i = elementList.length - 1; i >= 0; i--) {
      const el = elementList[i]
      if (el.revisionId === revisionId) {
        if (el.revisionType === 'insert') {
          indicesToRemove.push(i)
        } else {
          delete el.revisionId
          delete el.revisionType
          delete el.revisionAuthor
          delete el.revisionDate
        }
      }
    }
    for (const idx of indicesToRemove) {
      this._command.spliceElementList?.(elementList, idx, 1, undefined, { isIgnoreDeletedRule: true })
    }
    const dom = this._balloonDoms.get(revisionId)
    if (dom) {
      dom.remove()
      this._balloonDoms.delete(revisionId)
    }
    this._command.renderDraw?.({ isSubmitHistory: true })
    this._callbacks.onReject?.(revisionId)
  }

  /** 接受文档中的所有修订 */
  public acceptAll() {
    if (!this._command) return
    const elementList = this._command.getElementList?.()
    if (!elementList) return
    const indicesToRemove: number[] = []
    for (let i = elementList.length - 1; i >= 0; i--) {
      const el = elementList[i]
      if (!el.revisionId || !el.revisionType) continue
      if (el.revisionType === 'delete') {
        indicesToRemove.push(i)
      } else {
        delete el.revisionId
        delete el.revisionType
        delete el.revisionAuthor
        delete el.revisionDate
      }
    }
    for (const idx of indicesToRemove) {
      this._command.spliceElementList?.(elementList, idx, 1, undefined, { isIgnoreDeletedRule: true })
    }
    this._clear()
    this._command.renderDraw?.({ isSubmitHistory: true })
  }

  /** 拒绝文档中的所有修订 */
  public rejectAll() {
    if (!this._command) return
    const elementList = this._command.getElementList?.()
    if (!elementList) return
    const indicesToRemove: number[] = []
    for (let i = elementList.length - 1; i >= 0; i--) {
      const el = elementList[i]
      if (!el.revisionId || !el.revisionType) continue
      if (el.revisionType === 'insert') {
        indicesToRemove.push(i)
      } else {
        delete el.revisionId
        delete el.revisionType
        delete el.revisionAuthor
        delete el.revisionDate
      }
    }
    for (const idx of indicesToRemove) {
      this._command.spliceElementList?.(elementList, idx, 1, undefined, { isIgnoreDeletedRule: true })
    }
    this._clear()
    this._command.renderDraw?.({ isSubmitHistory: true })
  }

  /** 销毁实例：清除 DOM、解引用宿主 */
  public destroy() {
    this._clear()
    this._restoreContainerWidth()
    if (this._overlayContainer) {
      this._overlayContainer.remove()
      this._overlayContainer = null
    }

    this._container = null
    this._command = null
  }
}
