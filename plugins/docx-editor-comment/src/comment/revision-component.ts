type Command = any

const PREFIX = 'ce'

interface RevisionBalloonData {
  revisionId: string
  type: 'delete' | 'format'
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
}

export interface RevisionCallbacks {
  onAccept?: (revisionId: string) => void
  onReject?: (revisionId: string) => void
}

export class RevisionComponent {
  private _command: Command | null = null
  private _container: HTMLDivElement | null = null
  private _overlayContainer: HTMLDivElement | null = null
  private _balloonDoms: Map<string, HTMLDivElement> = new Map()
  private _callbacks: RevisionCallbacks = {}
  private _anchorLineEls: HTMLDivElement[] = []

  private get _revisionColor(): string {
    return this._command?.getOptions?.()?.revisionColor || '#e60000'
  }

  public install(command: Command, callbacks?: RevisionCallbacks): this {
    this._command = command
    if (callbacks) this._callbacks = callbacks
    const container = command.getContainer?.()
    if (container) {
      this._container = container
      this._overlayContainer = this._createOverlayContainer()
      this._container!.append(this._overlayContainer)
    }
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
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const h = String(d.getHours()).padStart(2, '0')
      const min = String(d.getMinutes()).padStart(2, '0')
      return `${y}-${m}-${day} ${h}:${min}`
    } catch {
      return dateStr
    }
  }

  private _createBalloonDom(balloon: RevisionBalloonData): HTMLDivElement {
    const div = document.createElement('div')
    div.classList.add(`${PREFIX}-revision-balloon`)
    div.style.cssText =
      'position:absolute;pointer-events:auto;min-width:240px;max-width:300px;' +
      `padding:6px 10px;background:#fff;border:1px solid #e8e8e8;border-radius:8px;` +
      'font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);'
    div.style.top = `${balloon.top}px`
    div.style.left = `${balloon.left}px`
    div.addEventListener('mouseenter', () => this._showAnchorLines(balloon))
    div.addEventListener('mouseleave', () => this._hideAnchorLines())

    const header = document.createElement('div')
    header.style.cssText = 'display:flex;align-items:center;justify-content:flex-start;margin-bottom:6px;gap:8px;'

    const authorSpan = document.createElement('span')
    authorSpan.style.cssText = `color:${this._revisionColor};font-weight:600;font-size:13px;white-space:nowrap;`
    authorSpan.textContent = balloon.author || '未知'

    const dateSpan = document.createElement('span')
    dateSpan.style.cssText = 'color:#9e9e9e;font-size:11px;white-space:nowrap;'
    dateSpan.textContent = this._formatDate(balloon.date)

    const actions = document.createElement('div')
    actions.style.cssText = 'display:flex;gap:4px;flex-shrink:0;margin-left:auto;'

    const acceptBtn = document.createElement('button')
    acceptBtn.title = '接受修订'
    acceptBtn.style.cssText =
      'display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;' +
      'border:none;background:transparent;border-radius:0;cursor:pointer;transition:background 0.15s;color:#52c41a;font-size:14px;'
    acceptBtn.textContent = '✓'
    acceptBtn.addEventListener('mouseenter', () => { acceptBtn.style.background = '#f6ffed' })
    acceptBtn.addEventListener('mouseleave', () => { acceptBtn.style.background = 'transparent' })
    acceptBtn.addEventListener('click', () => { this.acceptRevision(balloon.revisionId) })

    const rejectBtn = document.createElement('button')
    rejectBtn.title = '拒绝修订'
    rejectBtn.style.cssText =
      'display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;' +
      `border:none;background:transparent;border-radius:0;cursor:pointer;transition:background 0.15s;color:${this._revisionColor};font-size:14px;`
    rejectBtn.textContent = '✕'
    rejectBtn.addEventListener('mouseenter', () => { rejectBtn.style.background = '#fff1f0' })
    rejectBtn.addEventListener('mouseleave', () => { rejectBtn.style.background = 'transparent' })
    rejectBtn.addEventListener('click', () => { this.rejectRevision(balloon.revisionId) })

    actions.append(acceptBtn, rejectBtn)
    header.append(authorSpan, dateSpan, actions)

    const body = document.createElement('div')
    body.style.cssText = 'font-size:13px;line-height:1.4;word-break:break-word;max-height:72px;overflow:hidden;padding:2px 0;'

    const typeLabel = document.createElement('span')
    typeLabel.style.cssText = `color:${this._revisionColor};font-weight:500;`
    typeLabel.textContent = balloon.type === 'format' ? '' : '删除：'

    const contentSpan = document.createElement('span')
    contentSpan.className = 'revision-content'
    contentSpan.style.cssText = 'color:#444;'
    contentSpan.textContent = balloon.content

    body.append(typeLabel, contentSpan)
    div.append(header, body)
    const arrow = document.createElement('div')
    arrow.style.cssText = 'position:absolute;left:-7px;top:14px;width:0;height:0;border-top:6px solid transparent;border-bottom:6px solid transparent;border-right:7px solid #e8e8e8;'
    const arrowInner = document.createElement('div')
    arrowInner.style.cssText = 'position:absolute;left:1px;top:-5px;width:0;height:0;border-top:5px solid transparent;border-bottom:5px solid transparent;border-right:6px solid #fff;'
    arrow.append(arrowInner)
    div.append(arrow)
    return div
  }

  private _getPageOffsetY(pageNo: number): number {
    if (this._container) {
      const canvases = this._container.querySelectorAll('canvas[data-index]')
      if (canvases.length > pageNo) {
        const canvas = canvases[pageNo] as HTMLElement
        if (canvas && canvas.offsetTop !== undefined) {
          return canvas.offsetTop
        }
      }
    }
    const pageHeight = this._command?.getDrawHeight?.() || 1123
    const pageGap = this._command?.getPageGap?.() ?? 0
    return pageNo * (pageHeight + pageGap)
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

  private _getRevisions(): Array<{
    id: string; type: 'delete' | 'format'; author: string; date: string; content: string; firstIndex: number; lastIndex: number
  }> {
    if (!this._command) return []
    const elementList = this._command.getElementList?.()
    if (!elementList) return []
    const revisionMap = new Map<string, { id: string; type: 'delete' | 'format'; author: string; date: string; content: string; firstIndex: number; lastIndex: number }>()
    for (let i = 0; i < elementList.length; i++) {
      const el = elementList[i]
      if (!el.revisionId || !el.revisionType) continue
      if (el.revisionType === 'insert') continue
      const existing = revisionMap.get(el.revisionId)
      if (existing) {
        if (el.revisionType === 'format') {
          // format 修订只取第一个元素的格式描述
        } else {
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

  public getRevisions(): Array<{
    id: string; type: 'delete' | 'format'; author: string; date: string; content: string
  }> {
    return this._getRevisions().map(r => ({
      id: r.id,
      type: r.type,
      author: r.author,
      date: r.date,
      content: r.content
    }))
  }

  public update() {
    if (!this._command) return
    const options = this._command.getOptions?.()
    if (!options?.showRevisionBalloons) {
      this._clear()
      this._restoreContainerWidth()
      return
    }

    const revisions = this._getRevisions()
    if (revisions.length === 0) {
      this._clear()
      this._restoreContainerWidth()
      return
    }

    const positionList = this._command.getPositionList?.()
    if (!positionList || positionList.length === 0) {
      this._clear()
      this._restoreContainerWidth()
      return
    }

    const pageWidth = this._command.getDrawWidth?.() || 794

    const balloonLeft = pageWidth + 16

    const balloons: RevisionBalloonData[] = []

    for (const rev of revisions) {
      const startPosIdx = rev.firstIndex
      if (startPosIdx < 0 || startPosIdx >= positionList.length) continue
      const startPos = positionList[startPosIdx]
      if (!startPos?.coordinate) continue

      const endPosIdx = Math.min(rev.lastIndex, positionList.length - 1)
      const endPos = positionList[endPosIdx]

      const pageNo = startPos.pageNo ?? 0
      const preY = this._getPageOffsetY(pageNo)
      const top = preY + (startPos.coordinate.leftTop?.[1] || 0)
      const anchorX = startPos.coordinate.leftTop?.[0] || 0
      const anchorY = top
      let anchorEndX = endPos?.coordinate?.rightBottom?.[0] || endPos?.coordinate?.rightTop?.[0] || anchorX
      let anchorEndY = top + (startPos.lineHeight || 20)
      if (endPos?.coordinate) {
        const endPageNo = endPos.pageNo ?? 0
        const endPreY = this._getPageOffsetY(endPageNo)
        anchorEndX = endPos.coordinate.rightBottom?.[0] || endPos.coordinate.rightTop?.[0] || anchorX
        anchorEndY = endPreY + (endPos.coordinate.leftBottom?.[1] || endPos.coordinate.leftTop?.[1] || 0)
      }
      const pageRight = pageWidth

      balloons.push({
        revisionId: rev.id,
        type: rev.type,
        author: rev.author,
        date: rev.date,
        content: rev.content,
        top,
        left: balloonLeft,
        anchorStartX: anchorX,
        anchorStartY: anchorY,
        anchorEndX,
        anchorEndY,
        pageRight
      })
    }

    balloons.sort((a, b) => a.top - b.top)
    const MIN_GAP = 70
    for (let i = 1; i < balloons.length; i++) {
      if (balloons[i].top - balloons[i - 1].top < MIN_GAP) {
        balloons[i].top = balloons[i - 1].top + MIN_GAP
      }
    }

    this._expandContainerWidth(balloons)
    this._renderBalloons(balloons)
  }

  private _expandContainerWidth(balloons: RevisionBalloonData[]): void {
    if (!this._command || balloons.length === 0 || !this._container) return
    const pageWidth = this._command.getDrawWidth?.() || 794
    const balloonLeft = pageWidth + 16
    const cardMaxWidth = 300
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
    for (const [x, y] of [[balloon.anchorStartX, balloon.anchorStartY], [balloon.anchorEndX, balloon.anchorStartY]]) {
      const line = document.createElement('div')
      line.style.cssText = `position:absolute;left:${x - 1}px;top:${y}px;width:2px;height:${lineHeight}px;background:${color};pointer-events:none;z-index:11;opacity:0.7;`
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

  public acceptRevision(revisionId: string) {
    if (!this._command) return
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

  public rejectRevision(revisionId: string) {
    if (!this._command) return
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

  public acceptAllRevisions() {
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

  public rejectAllRevisions() {
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
