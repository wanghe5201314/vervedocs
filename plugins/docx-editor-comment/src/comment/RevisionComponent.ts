type Command = any

const PREFIX = 'ce'

interface RevisionBalloonData {
  revisionId: string
  type: 'delete'
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
  private _svgEl: SVGSVGElement | null = null
  private _balloonDoms: Map<string, HTMLDivElement> = new Map()
  private _callbacks: RevisionCallbacks = {}

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
      this._svgEl = this._createSvg()
      this._overlayContainer.append(this._svgEl)
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

  private _createSvg(): SVGSVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.classList.add(`${PREFIX}-revision-lines`)
    svg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:visible;'
    return svg
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
      `padding:6px 10px;background:#fff;border:1px solid #e8e8e8;border-left:3px solid ${this._revisionColor};border-radius:0;` +
      'font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);'
    div.style.top = `${balloon.top}px`
    div.style.left = `${balloon.left}px`

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
    typeLabel.textContent = '删除：'

    const contentSpan = document.createElement('span')
    contentSpan.className = 'revision-content'
    contentSpan.style.cssText = 'color:#444;'
    contentSpan.textContent = balloon.content

    body.append(typeLabel, contentSpan)
    div.append(header, body)
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

  private _getPolylinePoints(balloon: RevisionBalloonData): string {
    const anchorX = Math.min(balloon.anchorStartX, balloon.anchorEndX)
    const anchorY = balloon.anchorEndY
    const pageEdgeX = balloon.pageRight
    const cardLeft = balloon.left
    const cardMidY = balloon.top + 12

    return `${anchorX},${anchorY} ${pageEdgeX},${anchorY} ${cardLeft},${cardMidY}`
  }

  private _getRevisions(): Array<{
    id: string; type: 'delete'; author: string; date: string; content: string; firstIndex: number; lastIndex: number
  }> {
    if (!this._command) return []
    const elementList = this._command.getElementList?.()
    if (!elementList) return []
    const revisionMap = new Map<string, { id: string; type: 'delete'; author: string; date: string; content: string; firstIndex: number; lastIndex: number }>()
    for (let i = 0; i < elementList.length; i++) {
      const el = elementList[i]
      if (!el.revisionId || !el.revisionType) continue
      if (el.revisionType === 'insert') continue
      const existing = revisionMap.get(el.revisionId)
      if (existing) {
        existing.content += el.value || ''
        existing.lastIndex = i
      } else {
        revisionMap.set(el.revisionId, {
          id: el.revisionId,
          type: el.revisionType,
          author: el.revisionAuthor || '',
          date: el.revisionDate || '',
          content: el.value || '',
          firstIndex: i,
          lastIndex: i
        })
      }
    }
    return Array.from(revisionMap.values())
  }

  public getRevisions(): Array<{
    id: string; type: 'delete'; author: string; date: string; content: string
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
    const pageHeight = this._command.getDrawHeight?.() || 1123
    const pageGap = this._command.getPageGap?.() ?? 0
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
    if (!this._svgEl || !this._overlayContainer) return
    while (this._svgEl.firstChild) {
      this._svgEl.removeChild(this._svgEl.firstChild)
    }

    const existingIds = new Set(balloons.map(b => b.revisionId))
    for (const [id, dom] of this._balloonDoms) {
      if (!existingIds.has(id)) {
        dom.remove()
        this._balloonDoms.delete(id)
      }
    }

    if (this._container) {
      const containerRect = this._container.getBoundingClientRect()
      const svgWidth = Math.ceil(containerRect.width)
      const svgHeight = Math.ceil(containerRect.height)
      if (svgWidth > 0 && svgHeight > 0) {
        this._svgEl.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`)
        this._svgEl.setAttribute('width', String(svgWidth))
        this._svgEl.setAttribute('height', String(svgHeight))
      }
    }

    for (const balloon of balloons) {
      const points = this._getPolylinePoints(balloon)

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      circle.setAttribute('cx', String(Math.min(balloon.anchorStartX, balloon.anchorEndX)))
      circle.setAttribute('cy', String(balloon.anchorEndY))
      circle.setAttribute('r', '3')
      circle.setAttribute('fill', this._revisionColor)
      this._svgEl.append(circle)

      const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline')
      polyline.setAttribute('points', points)
      polyline.setAttribute('fill', 'none')
      polyline.setAttribute('stroke', this._revisionColor)
      polyline.setAttribute('stroke-width', '1')
      polyline.setAttribute('stroke-dasharray', '4,3')
      this._svgEl.append(polyline)

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

  private _clear() {
    if (this._svgEl) {
      while (this._svgEl.firstChild) {
        this._svgEl.removeChild(this._svgEl.firstChild)
      }
    }
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
    this._svgEl = null
    this._container = null
    this._command = null
  }
}