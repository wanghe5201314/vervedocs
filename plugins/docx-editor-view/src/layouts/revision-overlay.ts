
import { EDITOR_PREFIX } from '@vervedoc/docx-editor-schema'
import { Draw } from '../renders/engine'

interface RevisionBalloonData {
  revisionId: string
  type: 'delete' | 'format'
  author: string
  date: string
  content: string
  top: number
  left: number
  anchorX: number
  anchorY: number
  pageRight: number
}

export class RevisionOverlay {
  private draw: Draw
  private container: HTMLDivElement
  private overlayContainer: HTMLDivElement
  private svgEl: SVGSVGElement
  private balloonDoms: Map<string, HTMLDivElement> = new Map()
  private onAccept?: (revisionId: string) => void
  private onReject?: (revisionId: string) => void

  private get _revisionColor(): string {
    return this.draw.getOptions().revisionColor || '#e60000'
  }

  constructor(draw: Draw, callbacks?: { onAccept?: (id: string) => void; onReject?: (id: string) => void }) {
    this.draw = draw
    this.container = draw.getContainer()
    this.onAccept = callbacks?.onAccept
    this.onReject = callbacks?.onReject
    this.overlayContainer = this._createOverlayContainer()
    this.svgEl = this._createSvg()
    this.overlayContainer.append(this.svgEl)
    this.container.append(this.overlayContainer)
  }

  private _createOverlayContainer(): HTMLDivElement {
    const el = document.createElement('div')
    el.classList.add(`${EDITOR_PREFIX}-revision-overlay`)
    el.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;'
    return el
  }

  private _createSvg(): SVGSVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.classList.add(`${EDITOR_PREFIX}-revision-lines`)
    svg.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;overflow:visible;'
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
    div.classList.add(`${EDITOR_PREFIX}-revision-balloon`)
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

  private _getPolylinePoints(balloon: RevisionBalloonData): string {
    const x1 = balloon.anchorX
    const y1 = balloon.anchorY
    const x2 = balloon.left
    const y2 = balloon.top + 12
    const midX = balloon.pageRight
    if (y2 > y1) {
      return `${x1},${y1} ${midX},${y1} ${midX},${y2} ${x2},${y2}`
    }
    return `${x1},${y1} ${midX},${y1} ${x2},${y2}`
  }

  private _getRevisions(): Array<{
    id: string; type: 'delete' | 'format'; author: string; date: string; content: string; firstIndex: number
  }> {
    if (!this.draw) return []
    const elementList = this.draw.getElementList()
    const revisionMap = new Map<string, { id: string; type: 'delete' | 'format'; author: string; date: string; content: string; firstIndex: number }>()
    for (let i = 0; i < elementList.length; i++) {
      const el = elementList[i]
      if (!el.revisionId || !el.revisionType) continue
      if (el.revisionType === 'insert') continue
      const existing = revisionMap.get(el.revisionId)
      if (existing) {
        existing.content += el.value || ''
      } else {
        revisionMap.set(el.revisionId, {
          id: el.revisionId,
          type: el.revisionType,
          author: el.revisionAuthor || '',
          date: el.revisionDate || '',
          content: el.value || '',
          firstIndex: i
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
    const options = this.draw.getOptions()
    if (!options.showRevisionBalloons) {
      this._clear()
      return
    }

    const revisions = this._getRevisions()
    if (revisions.length === 0) {
      this._clear()
      return
    }

    const positionList = this.draw.getPosition().getPositionList()
    if (!positionList || positionList.length === 0) {
      this._clear()
      return
    }

    const pageWidth = this.draw.getWidth()
    const pageHeight = this.draw.getHeight()
    const pageGap = this.draw.getPageGap()
    const balloonLeft = pageWidth + 16

    const balloons: RevisionBalloonData[] = []

    for (const rev of revisions) {
      const posIdx = rev.firstIndex
      if (posIdx < 0 || posIdx >= positionList.length) continue
      const pos = positionList[posIdx]
      if (!pos?.coordinate) continue

      const pageNo = pos.pageNo ?? 0
      const preY = pageNo * (pageHeight + pageGap)
      const top = preY + (pos.coordinate.leftTop?.[1] || 0)
      const anchorX = pos.coordinate.rightTop?.[0] || pos.coordinate.leftTop?.[0] || 0
      const anchorY = preY + (pos.coordinate.leftTop?.[1] || 0) + (pos.lineHeight || 20)
      const pageRight = pageWidth

      balloons.push({
        revisionId: rev.id,
        type: rev.type,
        author: rev.author,
        date: rev.date,
        content: rev.content,
        top,
        left: balloonLeft,
        anchorX,
        anchorY,
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

    this._renderBalloons(balloons)
  }

  private _renderBalloons(balloons: RevisionBalloonData[]) {
    while (this.svgEl.firstChild) {
      this.svgEl.removeChild(this.svgEl.firstChild)
    }

    const existingIds = new Set(balloons.map(b => b.revisionId))
    for (const [id, dom] of this.balloonDoms) {
      if (!existingIds.has(id)) {
        dom.remove()
        this.balloonDoms.delete(id)
      }
    }

    const containerRect = this.container.getBoundingClientRect()
    const svgWidth = Math.ceil(containerRect.width)
    const svgHeight = Math.ceil(containerRect.height)
    if (svgWidth > 0 && svgHeight > 0) {
      this.svgEl.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`)
      this.svgEl.setAttribute('width', String(svgWidth))
      this.svgEl.setAttribute('height', String(svgHeight))
    }

    for (const balloon of balloons) {
      const points = this._getPolylinePoints(balloon)
      
      // 起始位置圆点
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      circle.setAttribute('cx', String(balloon.anchorX))
      circle.setAttribute('cy', String(balloon.anchorY))
      circle.setAttribute('r', '3')
      circle.setAttribute('fill', this._revisionColor)
      this.svgEl.append(circle)
      
      // 连接线
      const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline')
      polyline.setAttribute('points', points)
      polyline.setAttribute('fill', 'none')
      polyline.setAttribute('stroke', this._revisionColor)
      polyline.setAttribute('stroke-width', '1')
      polyline.setAttribute('stroke-dasharray', '4,3')
      this.svgEl.append(polyline)

      let balloonDom = this.balloonDoms.get(balloon.revisionId)
      if (!balloonDom) {
        balloonDom = this._createBalloonDom(balloon)
        this.overlayContainer.append(balloonDom)
        this.balloonDoms.set(balloon.revisionId, balloonDom)
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
    while (this.svgEl.firstChild) {
      this.svgEl.removeChild(this.svgEl.firstChild)
    }
    for (const dom of this.balloonDoms.values()) {
      dom.remove()
    }
    this.balloonDoms.clear()
  }

  public acceptRevision(revisionId: string) {
    const elementList = this.draw.getElementList()
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
      this.draw.spliceElementList(elementList, idx, 1)
    }
    const dom = this.balloonDoms.get(revisionId)
    if (dom) {
      dom.remove()
      this.balloonDoms.delete(revisionId)
    }
    this.draw.render({ isSubmitHistory: true })
    this.onAccept?.(revisionId)
  }

  public rejectRevision(revisionId: string) {
    const elementList = this.draw.getElementList()
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
      this.draw.spliceElementList(elementList, idx, 1)
    }
    const dom = this.balloonDoms.get(revisionId)
    if (dom) {
      dom.remove()
      this.balloonDoms.delete(revisionId)
    }
    this.draw.render({ isSubmitHistory: true })
    this.onReject?.(revisionId)
  }

  public acceptAllRevisions() {
    const elementList = this.draw.getElementList()
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
      this.draw.spliceElementList(elementList, idx, 1)
    }
    this._clear()
    this.draw.render({ isSubmitHistory: true })
  }

  public rejectAllRevisions() {
    const elementList = this.draw.getElementList()
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
      this.draw.spliceElementList(elementList, idx, 1)
    }
    this._clear()
    this.draw.render({ isSubmitHistory: true })
  }

  public destroy() {
    this._clear()
    this.overlayContainer.remove()
  }
}