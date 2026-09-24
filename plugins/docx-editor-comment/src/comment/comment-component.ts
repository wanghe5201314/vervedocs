import type { IComment, IGroupColor, IDocxDocumentMeta, DocxCommentMeta } from '@vervedoc/docx-editor-schema'
import { cloneTree, walkTree } from '@vervedoc/docx-editor-schema'
import dayjs from 'dayjs'
import type { CommentHost } from './host'
import { drawAnnotationConnector, getAvatarColor } from './annotation-visual'
import { balloonText, type BalloonTranslate } from './translation'

const PREFIX = 'ce'

function formatCommentDisplayDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = dayjs(dateStr)
  return d.isValid() ? d.format('YYYY/M/D HH:mm') : dateStr.replace(/-/g, '/')
}

function extractCommentBody(content: string, rangeText: string): { sourceText: string; mainText: string } {
  const normalizedContent = String(content || '').trim()
  const normalizedRange = String(rangeText || '').trim()

  if (!normalizedContent) {
    return {
      sourceText: normalizedRange,
      mainText: ''
    }
  }

  const lines = normalizedContent
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return {
      sourceText: normalizedRange,
      mainText: ''
    }
  }

  const firstLine = lines[0]
  const match = firstLine.match(/^取自[：:]?\s*(.*)$/)
  const sourceText = (match?.[1] || normalizedRange).trim()
  const mainText = match
    ? lines.slice(1).join('\n')
    : normalizedContent

  return {
    sourceText,
    mainText
  }
}

export type { DocxCommentMeta } from '@vervedoc/docx-editor-schema'

export interface CommentCallbacks {
  onDelete?: (id: string) => void
  onLocate?: (id: string) => void
  onSave?: (comment: IComment) => void
  onCancel?: (id: string) => void
  onReply?: (id: string, content: string) => void
  onResolve?: (id: string, resolved: boolean) => void
  onRequestSave?: () => void
}

export class CommentComponent {
  constructor(private readonly translate?: BalloonTranslate) {}

  private _t(key: string): string {
    return balloonText(this.translate, `comment.balloon.${key}`)
  }

  /** 宿主契约（由 core 注入，提供选区/文档/渲染等能力） */
  private _command: CommentHost | null = null
  /** 批注数据列表 */
  private _comments: IComment[] = []
  private _drafts = new Map<string, string>()
  /** 生命周期回调（保存/删除/回复/解决/取消） */
  private _callbacks: CommentCallbacks = {}
  /** 批注气泡 overlay 容器（挂载在 Draw scroller 上） */
  private _overlayContainer: HTMLDivElement | null = null
  /** 批注卡片 DOM 映射（commentId → 卡片元素） */
  private _cardDoms: Map<string, HTMLDivElement> = new Map()
  /** Hover-only connector segments, in overlay coordinates. */
  private _anchorLineEls: HTMLDivElement[] = []
  private _hoveredCommentId: string | null = null
  /** 悬浮提示气泡 DOM */
  private _hoverTooltip: HTMLDivElement | null = null
  /** 悬浮提示显示定时器 */
  private _hoverTooltipTimer: number | null = null


  /** 批注高亮颜色（取编辑器选项 annotationColor，默认 #409eff） */
  private get _annotationColor(): string {
    return this._command?.getOptions?.()?.annotationColor || '#409eff'
  }

  /** 将批注颜色映射同步到编辑器 options.group.groupColors，驱动文档高亮重绘 */
  private _syncGroupColors(): void {
    if (!this._command) return
    const currentOptions = this._command.getOptions?.() || {}
    const currentGroup = currentOptions.group || {}
    const groupColors: Record<string, IGroupColor> = {}
    for (const c of this._comments) {
      if (!c.groupId) continue
      groupColors[c.groupId] = {
        color: c.avatarColor || getAvatarColor(c.userName),
        status: c.status ?? 1
      }
    }
    this._command.executeUpdateOptions?.({
      ...currentOptions,
      group: { ...currentGroup, groupColors }
    })
  }

  /** 事件总线（由 core 注入，用于发射 comment-create/comment-delete 交互事件） */
  private _eventBus?: { emit(event: string, ...args: any[]): void }

  /** 注入事件总线 */
  public setEventBus(eventBus: { emit(event: string, ...args: any[]): void }): void {
    this._eventBus = eventBus
  }

  /** 注入宿主契约（由 createCommentPlugin 的 install 调用） */
  public install(command: CommentHost): this {
    if (this._command && this._command !== command) {
      console.warn(
        '[CommentComponent] install() 已被调用，忽略重复注入。' +
        '若要更新回调请使用 DocxEditor.setCommentCallbacks(...)'
      )
      return this
    }
    this._command = command
    return this
  }

  /** 设置批注生命周期回调 */
  public setCallbacks(callbacks: CommentCallbacks): this {
    this._callbacks = callbacks || {}
    return this
  }

  /** 获取全部批注列表 */
  public getAll(): IComment[] {
    return this._comments
  }

  private canEdit(): boolean {
    const options = this._command?.getOptions()
    return !!options && !options.readonly && !options.disabled
  }

  /** 整体替换批注列表并同步高亮颜色 */
  public setAll(comments: IComment[]): void {
    if (!this.canEdit()) return
    this._comments = cloneTree(comments)
    this._drafts.clear()
    this._clearCards()
    this._commitComments()
    this._syncGroupColors()
  }

  /** 新建批注：在高亮选区上创建编辑态气泡，返回新批注或 null（无选区时） */
  public add(userName: string = '当前用户'): IComment | null {
    if (!this._command || !this.canEdit()) return null
    let newComment: IComment | null = null
    const id = this._nextCommentId()
    const commentGroupId = `comment_${id}`
    const groupId = this._command.executeSetGroup((doc, temporaryGroupId) => {
      // Store the same anchor IDs used by both DOCX parsers and the Java writer.
      walkTree(doc.elements, node => {
        if (node.groupIds?.includes(temporaryGroupId)) {
          node.groupIds = node.groupIds.map(group => group === temporaryGroupId ? commentGroupId : group)
        }
      })
      newComment = {
        id, groupId: commentGroupId, content: '', userName,
        createdDate: new Date().toISOString(),
        rangeText: '', isEditing: true
      }
      this._comments.push(newComment)
      this._writeComments(doc)
    })
    if (!groupId || !newComment) return null
    this._syncGroupColors()
    this._eventBus?.emit('commentCreate', newComment)
    return newComment
  }

  private _writeComments(doc: IDocxDocumentMeta): void {
    doc.comments = this.serialize()
  }

  private _nextCommentId(): string {
    const ids = new Set<string>()
    const collect = (comments: IComment[]) => {
      for (const comment of comments) {
        ids.add(comment.id)
        if (comment.replies) collect(comment.replies)
      }
    }
    collect(this._comments)
    const doc = this._command?.getDocument()
    for (const elements of [
      doc?.elements, doc?.header, doc?.footer,
      ...Object.values(doc?.contentZones ?? {}),
      ...Object.values(doc?.headerFooterParts ?? {})
    ]) {
      if (!elements) continue
      walkTree(elements, node => {
        for (const group of node.groupIds ?? []) {
          if (group.startsWith('comment_')) ids.add(group.slice('comment_'.length))
        }
      })
    }
    let id = 0
    while (ids.has(String(id))) id++
    return String(id)
  }

  private _commitComments(removeGroup?: string): void {
    this._command?.commitTransaction(doc => {
      this._writeComments(doc)
      if (removeGroup) {
        for (const elements of [doc.elements, doc.header, doc.footer, ...Object.values(doc.contentZones ?? {}), ...Object.values(doc.headerFooterParts ?? {})]) {
          if (!elements) continue
          walkTree(elements, node => {
            const el = node as any
            if (el.groupId === removeGroup) delete el.groupId
            if (el.groupIds) el.groupIds = el.groupIds.filter((id: string) => id !== removeGroup)
          })
        }
      }
    })
  }

  /** 删除指定 ID 的批注，清除文档高亮并触发 onDelete 回调 */
  public delete(id: string): void {
    if (!this.canEdit()) return
    const idx = this._comments.findIndex(c => c.id === id)
    if (idx !== -1) {
      const comment = this._comments[idx]
      this._comments.splice(idx, 1)
      this._commitComments(comment.groupId)
      this._callbacks.onDelete?.(id)
      this._syncGroupColors()
      this._eventBus?.emit('commentDelete', id)
    }
  }

  /** 定位到指定批注的选区位置 */
  public locate(id: string): void {
    const comment = this._comments.find(c => c.id === id)
    if (comment) this._command?.executeLocationGroup?.(comment.groupId)
  }

  /** 取消编辑态批注：空内容则删除，有内容则退出编辑态 */
  private cancel(id: string): void {
    if (!this.canEdit()) return
    const idx = this._comments.findIndex(c => c.id === id)
    if (idx === -1) return
    const comment = this._comments[idx]
    if (!comment.content) {
      this._comments.splice(idx, 1)
      this._commitComments(comment.groupId)
    } else {
      comment.isEditing = false
    }
    this._syncGroupColors()
  }

  /** 回复指定批注 */
  private reply(id: string, content: string, userName: string = '当前用户'): void {
    if (!this.canEdit()) return
    const comment = this._comments.find(c => c.id === id)
    if (!comment) return
    if (!comment.replies) comment.replies = []
    comment.replies.push({
      id: this._nextCommentId(),
      groupId: comment.groupId,
      content,
      userName,
      avatarColor: getAvatarColor(userName),
      createdDate: new Date().toISOString(),
      rangeText: ''
    })
    this._commitComments()
  }

  /** 标记批注为已解决/未解决 */
  private resolve(id: string, resolved: boolean): void {
    if (!this.canEdit()) return
    const comment = this._comments.find(c => c.id === id)
    if (comment) {
      comment.status = resolved ? 2 : 1
      this._commitComments()
      this._syncGroupColors()
    }
  }

  /** 文档始终保存统一协议；界面派生字段不进入 JSON。 */
  public serialize(): DocxCommentMeta[] {
    const serialize = (c: IComment): DocxCommentMeta => ({
      id: c.id,
      content: c.content,
      author: c.userName,
      date: c.createdDate,
      ...(c.initials !== undefined ? { initials: c.initials } : {}),
      ...(c.status !== undefined ? { status: c.status } : {}),
      ...(c.replies !== undefined ? { replies: c.replies.map(serialize) } : {})
    })
    return this._comments.map(serialize)
  }

  /** JSON 加载和 DOCX 导入使用相同的协议。 */
  public restore(saved: DocxCommentMeta[], syncOnly = false): void {
    this.buildFromMetas(saved, syncOnly)
  }

  /** 从 docx 解析出的批注元数据构建批注列表 */
  public buildFromMetas(metas: DocxCommentMeta[], syncOnly = false): void {
    const build = (meta: DocxCommentMeta, groupId = `comment_${meta.id}`): IComment => {
      if (!/^\d+$/.test(meta.id)) throw new TypeError('批注 id 必须为数字字符串')
      return {
        id: meta.id,
        groupId,
        content: meta.content,
        userName: meta.author ?? '',
        avatarColor: getAvatarColor(meta.author || ''),
        createdDate: meta.date ?? '',
        initials: meta.initials,
        rangeText: '',
        status: meta.status,
        replies: meta.replies?.map(reply => build(reply, groupId))
      }
    }
    const newComments = metas.map(meta => build(meta))
    this._clearCards()
    this._comments = newComments
    this._drafts.clear()
    if (!syncOnly) this._commitComments()
    this._syncGroupColors()
  }

  private _getPageOffsetY(pageNo: number): number {
    const container = this._command?.getContainer?.()
    if (container) {
      const canvases = container.querySelectorAll('canvas[data-index]')
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

  private _collectOccupiedRanges(selector: string): Array<{ top: number; bottom: number }> {
    const container = this._command?.getContainer?.()
    if (!container) return []
    const ranges: Array<{ top: number; bottom: number }> = []
    const elements = container.querySelectorAll(selector)
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

  private _estimateCommentHeight(comment: IComment): number {
    const existing = this._cardDoms.get(comment.id)
    const existingHeight = existing?.offsetHeight || existing?.getBoundingClientRect().height || 0
    if (existingHeight > 0) return existingHeight
    if (comment.isEditing) return 190
    const { sourceText, mainText } = extractCommentBody(comment.content, comment.rangeText)
    let height = 86
    height += Math.min(Math.ceil(sourceText.length / 22), 4) * 16
    height += Math.min(Math.ceil(mainText.length / 24), 6) * 16
    height += Math.min(comment.replies?.length || 0, 3) * 34
    return Math.max(96, Math.min(height, 260))
  }

  private _resolveVerticalOverlaps(comments: IComment[]): void {
    const occupied = this._collectOccupiedRanges(`.${PREFIX}-revision-balloon`)
    const GAP = 12
    for (const comment of comments) {
      if (!comment.position) continue
      const height = this._estimateCommentHeight(comment)
      let top = comment.position.top
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
      comment.position.top = top
      occupied.push({ top, bottom: top + height })
      occupied.sort((a, b) => a.top - b.top)
    }
  }

  private _computePositions(): void {
    if (!this._command || this._comments.length === 0) {
      return
    }
    const pageWidth = this._command.getDrawWidth?.() || 794
    const balloonLeft = pageWidth + 16
    const positionList = this._command.getPositionList?.()

    for (const comment of this._comments) {
      delete comment.position
      delete comment.anchor
      const ctx = this._command?.getGroupContext?.(comment.groupId)
      if (!ctx) continue

      // 鏂版灦鏋勶細getGroupContext 鐩存帴杩斿洖 _anchor 鍧愭爣锛屼笉渚濊禆 positionList
      if (ctx._anchor) {
        const anchor = ctx._anchor
        comment.position = { top: anchor.startY, left: balloonLeft, lineWidth: 0, originalTop: anchor.startY }
        comment.anchor = { ...anchor }
        continue
      }

      // 鏃ф灦鏋勶細閫氳繃 positionList 鏌ユ壘鍧愭爣
      if (!positionList || positionList.length === 0) continue
      const startIdx = ctx.isTable ? (ctx.index ?? -1) : (ctx.startIndex ?? -1)
      const endIdx = ctx.isTable ? ctx.index : ctx.endIndex
      if (startIdx == null || startIdx < 0 || startIdx >= positionList.length) continue
      const startPos = positionList[startIdx]
      if (!startPos?.coordinate) continue
      const pageNo = startPos.pageNo ?? 0
      const preY = this._getPageOffsetY(pageNo)
      const top = preY + (startPos.coordinate.leftTop?.[1] || 0)
      const anchorStartX = startPos.coordinate.leftTop?.[0] || 0
      const anchorStartY = top
      let anchorEndX = startPos.coordinate.rightBottom?.[0] || startPos.coordinate.rightTop?.[0] || anchorStartX
      let anchorEndY = top + (startPos.lineHeight || 20)
      if (endIdx != null && endIdx >= 0 && endIdx < positionList.length) {
        const endPos = positionList[endIdx]
        if (endPos?.coordinate) {
          const endPageNo = endPos.pageNo ?? 0
          const endPreY = this._getPageOffsetY(endPageNo)
          anchorEndX = endPos.coordinate.rightBottom?.[0] || endPos.coordinate.rightTop?.[0] || anchorStartX
          anchorEndY = endPreY + (endPos.coordinate.leftBottom?.[1] || endPos.coordinate.leftTop?.[1] || 0)
        }
      }
      comment.position = { top, left: balloonLeft, lineWidth: 0, originalTop: top }
      comment.anchor = { startX: anchorStartX, startY: anchorStartY, endX: anchorEndX, endY: anchorEndY, lineHeight: startPos.lineHeight || 20 }
    }

    const sorted = this._comments.filter(c => c.position).sort((a, b) => (a.position!.top - b.position!.top))
    this._resolveVerticalOverlaps(sorted)
  }

  /** 刷新气泡和当前悬浮批注的连接线。 */
  public render(): void {
    if (!this._command) return
    const options = this._command.getOptions?.()
    if (options?.showCommentBalloons === false) {
      this._clearCards()
      this._restoreContainerWidth()
      return
    }
    this._computePositions()
    const visibleComments = this._comments.filter(c => c.position)
    if (visibleComments.length === 0) {
      this._clearCards()
      this._restoreContainerWidth()
      return
    }
    if (!this._overlayContainer) {
      this._createOverlayContainer()
    }
    this._expandContainerWidth(visibleComments)
    this._renderCards(visibleComments)
    if (this._hoveredCommentId !== null) {
      const hovered = visibleComments.find(comment => comment.id === this._hoveredCommentId)
      if (hovered) this._drawAnchorLines(hovered)
      else this._hideAnchorLines()
    }
  }

  private _createOverlayContainer(): void {
    if (!this._command) return
    const container = this._command.getContainer?.()
    if (!container) return
    const el = document.createElement('div')
    el.classList.add(`${PREFIX}-comment-overlay`)
    el.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;overflow:visible;'
    container.append(el)
    this._overlayContainer = el
    this._setupTextHover()
  }

  private _clearCards(): void {
    for (const dom of this._cardDoms.values()) {
      dom.remove()
    }
    this._cardDoms.clear()
    this._hideAnchorLines()
  }

  private _expandContainerWidth(visibleComments: IComment[]): void {
    if (!this._command || visibleComments.length === 0) return
    const container = this._command.getContainer?.()
    if (!container) return
    const pageWidth = this._command.getDrawWidth?.() || 794
    const balloonLeft = pageWidth + 16
    const cardMaxWidth = 270
    const neededWidth = balloonLeft + cardMaxWidth + 16
    ;(container as any).__commentNeededWidth = neededWidth
    this._applyContainerWidth(container, pageWidth)
  }

  private _restoreContainerWidth(): void {
    if (!this._command) return
    const container = this._command.getContainer?.()
    if (!container) return
    const pageWidth = this._command.getDrawWidth?.() || 794
    ;(container as any).__commentNeededWidth = 0
    this._applyContainerWidth(container, pageWidth)
  }

  private _applyContainerWidth(container: HTMLDivElement, pageWidth: number): void {
    // 鏂版灦鏋勶細瀹瑰櫒瀹藉害鐢?Draw 绠＄悊锛宱verlay 浠?overflow:visible 鑷劧婧㈠嚭锛屼笉闇€瑕佸己鍒舵敼瀹藉害
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

  private _renderCards(comments: IComment[]): void {
    if (!this._overlayContainer) return
    const existingIds = new Set(comments.map(c => c.id))
    for (const [id, dom] of this._cardDoms) {
      if (!existingIds.has(id)) {
        dom.remove()
        this._cardDoms.delete(id)
      }
    }


    for (const comment of comments) {
      let cardDom = this._cardDoms.get(comment.id)
      if (!cardDom) {
        cardDom = this._createCardDom(comment)
        this._overlayContainer.append(cardDom)
        this._cardDoms.set(comment.id, cardDom)
      } else {
        this._updateCardDom(cardDom, comment)
      }
      cardDom.style.top = `${comment.position!.top}px`
      cardDom.style.left = `${comment.position!.left}px`
    }
  }

  private _createCardDom(comment: IComment): HTMLDivElement {
    const bubble = document.createElement('div')
    bubble.classList.add(`${PREFIX}-comment-balloon`)
    bubble.style.cssText = 'position:absolute;pointer-events:auto;'
    bubble.addEventListener('mouseenter', () => {
      const current = this._comments.find(item => item.id === comment.id)
      if (current) this._showAnchorLines(current)
    })
    bubble.addEventListener('mouseleave', () => this._hideAnchorLines())

    const card = document.createElement('div')
    card.classList.add(`${PREFIX}-comment-card`)
    card.dataset.commentId = comment.id
    this._applyCardStyle(card, comment)

    const header = document.createElement('div')
    header.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;gap:6px;margin-bottom:6px;'

    const userDiv = document.createElement('div')
    userDiv.style.cssText = 'display:flex;align-items:flex-start;gap:8px;min-width:0;flex:1;'

    const avatar = document.createElement('div')
    avatar.classList.add(`${PREFIX}-comment-avatar`)
    avatar.style.cssText = `width:14px;height:14px;border-radius:2px;display:flex;align-items:center;justify-content:center;color:#666;font-weight:600;font-size:9px;flex-shrink:0;background:${comment.avatarColor || '#d9d9d9'};margin-top:2px;`
    avatar.textContent = comment.userName.charAt(0)

    const userMeta = document.createElement('div')
    userMeta.style.cssText = 'display:flex;flex-direction:column;gap:1px;min-width:0;'

    const username = document.createElement('span')
    username.classList.add(`${PREFIX}-comment-username`)
    username.style.cssText = 'font-weight:700;font-size:12px;color:#1f1f1f;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'
    username.textContent = comment.userName

    const dateSpan = document.createElement('span')
    dateSpan.classList.add(`${PREFIX}-comment-date`)
    dateSpan.style.cssText = 'font-size:11px;color:#8c8c8c;line-height:1.15;white-space:nowrap;'
    dateSpan.textContent = formatCommentDisplayDate(comment.createdDate)

    userMeta.append(username, dateSpan)
    userDiv.append(avatar, userMeta)

    const headerRight = document.createElement('div')
    headerRight.style.cssText = 'display:flex;align-items:center;gap:2px;flex-shrink:0;'

    const createActionBtn = (className: string, title: string, icon: string, onClick: () => void) => {
      const btn = document.createElement('button')
      btn.classList.add(className)
      btn.title = title
      btn.setAttribute('aria-label', title)
      btn.type = 'button'
      btn.style.cssText = 'display:flex;align-items:center;justify-content:center;width:20px;height:20px;border:none;background:transparent;border-radius:4px;cursor:pointer;color:#444;transition:background 0.15s ease,color 0.15s ease;padding:0;'
      btn.innerHTML = icon
      btn.addEventListener('mouseenter', () => { btn.style.background = '#f3f3f3' })
      btn.addEventListener('mouseleave', () => { btn.style.background = 'transparent' })
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        onClick()
      })
      return btn
    }

    const editBtn = createActionBtn(
      `${PREFIX}-comment-edit`,
      this._t('edit'),
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 16.25V20h3.75L18.8 8.94l-3.75-3.75L4 16.25Z" fill="currentColor"/><path d="m14.96 5.19 3.75 3.75 1.09-1.09a1.5 1.5 0 0 0 0-2.12l-1.63-1.63a1.5 1.5 0 0 0-2.12 0l-1.09 1.09Z" fill="currentColor"/></svg>',
      () => {
        comment.isEditing = true
        this._refreshCard(comment.id)
      }
    )
    const deleteBtn = createActionBtn(
      `${PREFIX}-comment-delete`,
      this._t('delete'),
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M7 21a2 2 0 0 1-2-2V7h14v12a2 2 0 0 1-2 2H7Z" fill="currentColor"/><path d="M9 4h6l1 2h4v1.5H4V6h4l1-2Z" fill="currentColor"/></svg>',
      () => {
        this.delete(comment.id)
        this._callbacks.onRequestSave?.()
        this.render()
      }
    )
    const resolveBtn = createActionBtn(
      `${PREFIX}-comment-resolve`,
      this._t(comment.status === 2 ? 'reopen' : 'resolve'),
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="m9.55 18.2-5.4-5.4 1.41-1.4 3.99 3.98 8.89-8.88 1.41 1.41-10.3 10.29Z" fill="currentColor"/></svg>',
      () => {
        const resolved = comment.status !== 2
        this.resolve(comment.id, resolved)
        this._callbacks.onResolve?.(comment.id, resolved)
        this._callbacks.onRequestSave?.()
        this.render()
      }
    )
    if (comment.status === 2) {
      resolveBtn.style.color = '#2f8f4e'
      resolveBtn.style.background = '#eef8f1'
    }

    headerRight.append(editBtn, deleteBtn, resolveBtn)
    header.append(userDiv, headerRight)

    const bodyContainer = document.createElement('div')
    bodyContainer.classList.add(`${PREFIX}-comment-body`)
    this._renderCardBody(bodyContainer, comment)

    card.append(header, bodyContainer)
    bubble.append(card)
    return bubble
  }

  private _renderCardBody(container: HTMLDivElement, comment: IComment): void {
    container.innerHTML = ''
    container.dataset.mode = comment.isEditing ? 'editing' : comment.isReplying ? 'replying' : 'viewing'

    if (comment.isEditing) {
      const editDiv = document.createElement('div')
      editDiv.style.cssText = 'margin:8px 0;'

      const textarea = document.createElement('textarea')
      textarea.classList.add(`${PREFIX}-comment-textarea`)
      textarea.placeholder = this._t('placeholder')
      textarea.rows = 3
      textarea.value = this._drafts.get(comment.id) ?? comment.content
      textarea.style.cssText = 'width:93%;min-height:80px;padding:8px 10px;border:1px solid #dcdfe6;border-radius:6px;font-size:13px;font-family:inherit;line-height:1.6;resize:vertical;outline:none;transition:border-color 0.2s ease;'
      textarea.addEventListener('input', () => { this._drafts.set(comment.id, textarea.value) })
      textarea.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') this._handleSave(comment)
      })
      textarea.addEventListener('focus', () => { textarea.style.borderColor = this._annotationColor })
      textarea.addEventListener('blur', () => { textarea.style.borderColor = '#dcdfe6' })

      const actions = document.createElement('div')
      actions.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:8px;'

      const saveBtn = document.createElement('button')
      saveBtn.classList.add(`${PREFIX}-comment-save`)
      saveBtn.textContent = this._t('save')
      saveBtn.style.cssText = `padding:5px 14px;font-size:12px;border:none;border-radius:6px;cursor:pointer;transition:all 0.15s ease;font-weight:500;background:${this._annotationColor};color:#fff;`
      saveBtn.addEventListener('click', () => this._handleSave(comment))
      saveBtn.addEventListener('mouseenter', () => { saveBtn.style.background = '#66b1ff' })
      saveBtn.addEventListener('mouseleave', () => { saveBtn.style.background = this._annotationColor })

      const cancelBtn = document.createElement('button')
      cancelBtn.classList.add(`${PREFIX}-comment-cancel`)
      cancelBtn.textContent = this._t('cancel')
      cancelBtn.style.cssText = 'padding:5px 14px;font-size:12px;border:none;border-radius:6px;cursor:pointer;transition:all 0.15s ease;font-weight:500;background:#f5f5f5;color:#666;'
      cancelBtn.addEventListener('click', () => this._handleCancel(comment))
      cancelBtn.addEventListener('mouseenter', () => { cancelBtn.style.background = '#e8e8e8' })
      cancelBtn.addEventListener('mouseleave', () => { cancelBtn.style.background = '#f5f5f5'; cancelBtn.style.color = '#666' })

      actions.append(saveBtn, cancelBtn)
      editDiv.append(textarea, actions)
      container.append(editDiv)
      setTimeout(() => textarea.focus(), 50)
      return
    }

    const { sourceText, mainText } = extractCommentBody(comment.content, comment.rangeText)

    if (sourceText) {
      const sourceDiv = document.createElement('div')
      sourceDiv.style.cssText = 'font-size:12px;color:#1f1f1f;line-height:1.45;word-break:break-word;'

      const label = document.createElement('span')
      label.classList.add(`${PREFIX}-comment-source`)
      label.style.cssText = 'font-weight:500;color:#1f1f1f;'
      label.textContent = this._t('source')

      const value = document.createElement('span')
      value.textContent = sourceText

      sourceDiv.append(label, value)
      container.append(sourceDiv)
    }

    if (mainText) {
      const contentDiv = document.createElement('div')
      contentDiv.style.cssText = 'margin-top:6px;font-size:12px;color:#444;line-height:1.45;word-break:break-word;cursor:pointer;white-space:pre-wrap;'
      contentDiv.textContent = mainText
      contentDiv.addEventListener('dblclick', () => {
        comment.isEditing = true
        this._refreshCard(comment.id)
      })
      container.append(contentDiv)
    }

    if (comment.replies && comment.replies.length > 0) {
      const replyList = document.createElement('div')
      replyList.style.cssText = 'margin-top:6px;padding-top:6px;border-top:1px solid #ececec;'
      for (const reply of comment.replies) {
        const replyItem = document.createElement('div')
        replyItem.style.cssText = 'display:flex;align-items:flex-start;gap:6px;padding:4px 0;'

        const threadLine = document.createElement('div')
        threadLine.style.cssText = 'width:2px;background:#e4e7ed;border-radius:1px;flex-shrink:0;align-self:stretch;'

        const replyAvatar = document.createElement('div')
        replyAvatar.style.cssText = `width:18px;height:18px;border-radius:0;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:9px;flex-shrink:0;background:${reply.avatarColor || '#909399'};`
        replyAvatar.textContent = reply.userName.charAt(0)

        const replyBody = document.createElement('div')
        replyBody.style.cssText = 'flex:1;min-width:0;'

        const replyHeader = document.createElement('div')
        replyHeader.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:2px;'

        const replyUsername = document.createElement('span')
        replyUsername.style.cssText = 'font-size:11px;font-weight:600;color:#303133;'
        replyUsername.textContent = reply.userName

        const replyDate = document.createElement('span')
        replyDate.style.cssText = 'font-size:9px;color:#c0c4cc;'
        replyDate.textContent = formatCommentDisplayDate(reply.createdDate)

        replyHeader.append(replyUsername, replyDate)

        const replyContent = document.createElement('div')
        replyContent.style.cssText = 'font-size:11px;color:#606266;line-height:1.4;word-break:break-word;'
        replyContent.textContent = reply.content

        replyBody.append(replyHeader, replyContent)
        replyItem.append(threadLine, replyAvatar, replyBody)
        replyList.append(replyItem)
      }
      container.append(replyList)
    }

    if (comment.isReplying) {
      this._renderReplyInput(container, comment)
    } else {
      const replyTrigger = document.createElement('button')
      replyTrigger.type = 'button'
      replyTrigger.classList.add(`${PREFIX}-comment-add-reply`)
      replyTrigger.textContent = this._t('addReply')
      replyTrigger.style.cssText = 'margin-top:6px;padding:0;border:none;background:transparent;color:#1a73e8;font-size:11px;line-height:1.3;cursor:pointer;text-decoration:underline;text-underline-offset:2px;'
      replyTrigger.addEventListener('click', () => {
        comment.isReplying = true
        this._refreshCard(comment.id)
      })
      container.append(replyTrigger)
    }
  }

  private _renderReplyInput(container: HTMLDivElement, comment: IComment): void {
    const replyEdit = document.createElement('div')
    replyEdit.style.cssText = 'margin:8px 0;'

    const textarea = document.createElement('textarea')
    textarea.classList.add(`${PREFIX}-comment-reply-textarea`)
    textarea.placeholder = this._t('replyPlaceholder')
    textarea.rows = 2
    textarea.style.cssText = 'width:93%;min-height:50px;padding:8px 10px;border:1px solid #dcdfe6;border-radius:6px;font-size:13px;font-family:inherit;line-height:1.6;resize:vertical;outline:none;transition:border-color 0.2s ease;'
    textarea.addEventListener('focus', () => { textarea.style.borderColor = this._annotationColor })
    textarea.addEventListener('blur', () => { textarea.style.borderColor = '#dcdfe6' })

    const actions = document.createElement('div')
    actions.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:8px;'

    const replyBtn = document.createElement('button')
    replyBtn.classList.add(`${PREFIX}-comment-reply-submit`)
    replyBtn.textContent = this._t('reply')
    replyBtn.style.cssText = `padding:5px 14px;font-size:12px;border:none;border-radius:6px;cursor:pointer;transition:all 0.15s ease;font-weight:500;background:${this._annotationColor};color:#fff;`
    replyBtn.addEventListener('mouseenter', () => { replyBtn.style.background = '#66b1ff' })
    replyBtn.addEventListener('mouseleave', () => { replyBtn.style.background = this._annotationColor })

    const cancelBtn = document.createElement('button')
    cancelBtn.classList.add(`${PREFIX}-comment-reply-cancel`)
    cancelBtn.textContent = this._t('cancel')
    cancelBtn.style.cssText = 'padding:5px 14px;font-size:12px;border:none;border-radius:6px;cursor:pointer;transition:all 0.15s ease;font-weight:500;background:#f5f5f5;color:#666;'
    cancelBtn.addEventListener('mouseenter', () => { cancelBtn.style.background = '#e8e8e8' })
    cancelBtn.addEventListener('mouseleave', () => { cancelBtn.style.background = '#f5f5f5'; cancelBtn.style.color = '#666' })

    const submitReply = () => {
      const content = textarea.value.trim()
      if (!content) return
      comment.isReplying = false
      this.reply(comment.id, content)
      this._callbacks.onReply?.(comment.id, content)
      this._callbacks.onRequestSave?.()
      this._refreshCard(comment.id)
    }

    replyBtn.addEventListener('click', submitReply)
    textarea.addEventListener('keydown', (e) => { if (e.ctrlKey && e.key === 'Enter') submitReply() })
    cancelBtn.addEventListener('click', () => {
      comment.isReplying = false
      this._refreshCard(comment.id)
    })

    actions.append(replyBtn, cancelBtn)
    replyEdit.append(textarea, actions)
    container.append(replyEdit)
    setTimeout(() => textarea.focus(), 50)
  }

  private _applyCardStyle(card: HTMLDivElement, comment: IComment): void {
    const annotationColor = this._annotationColor
    const accentColor = comment.status === 2 ? '#67c23a' : annotationColor
    let css = `min-width:270px;max-width:270px;border-radius:0;padding:8px 10px;background:#f7f7f7;border:1px solid #d9d9d9;box-shadow:none;box-sizing:border-box;`
    if (comment.status === 2) css += 'opacity:0.78;'
    if (comment.isEditing) css += `border-color:${accentColor};box-shadow:0 6px 18px rgba(64,158,255,0.16);background:#fafcff;`
    if (comment.id === this._hoveredCommentId) css += `border-color:${comment.avatarColor || getAvatarColor(comment.userName)};box-shadow:none;opacity:1;`
    card.style.cssText = css
  }

  private _updateCardDom(bubble: HTMLDivElement, comment: IComment): void {
    const card = bubble.querySelector(`.${PREFIX}-comment-card`) as HTMLDivElement
    if (!card) return
    this._applyCardStyle(card, comment)

    const header = card.querySelector(':scope > div:first-child') as HTMLDivElement
    if (header) {
      const avatar = header.querySelector(`.${PREFIX}-comment-avatar`) as HTMLDivElement | null
      if (avatar) {
        const bg = comment.avatarColor || getAvatarColor(comment.userName)
        avatar.style.background = bg
        avatar.textContent = comment.userName.charAt(0)
      }
      const username = header.querySelector(`.${PREFIX}-comment-username`) as HTMLSpanElement | null
      if (username) {
        username.textContent = comment.userName
      }
      const dateSpan = header.querySelector(`.${PREFIX}-comment-date`) as HTMLSpanElement | null
      if (dateSpan) {
        dateSpan.textContent = formatCommentDisplayDate(comment.createdDate)
      }

      const editBtn = header.querySelector<HTMLButtonElement>(`.${PREFIX}-comment-edit`)
      if (editBtn) {
        editBtn.title = this._t('edit')
        editBtn.setAttribute('aria-label', editBtn.title)
      }
      const deleteBtn = header.querySelector<HTMLButtonElement>(`.${PREFIX}-comment-delete`)
      if (deleteBtn) {
        deleteBtn.title = this._t('delete')
        deleteBtn.setAttribute('aria-label', deleteBtn.title)
      }
      const resolveBtn = header.querySelector(`.${PREFIX}-comment-resolve`) as HTMLButtonElement | null
      if (resolveBtn) {
        resolveBtn.title = this._t(comment.status === 2 ? 'reopen' : 'resolve')
        resolveBtn.setAttribute('aria-label', resolveBtn.title)
        resolveBtn.style.color = comment.status === 2 ? '#2f8f4e' : '#444'
        resolveBtn.style.background = comment.status === 2 ? '#eef8f1' : 'transparent'
      }
    }

    const bodyContainer = card.querySelector(`.${PREFIX}-comment-body`) as HTMLDivElement
    if (bodyContainer) {
      const mode = comment.isEditing ? 'editing' : comment.isReplying ? 'replying' : 'viewing'
      if (bodyContainer.dataset.mode !== mode || mode === 'viewing') {
        this._renderCardBody(bodyContainer, comment)
      } else if (mode === 'editing') {
        const textarea = bodyContainer.querySelector<HTMLTextAreaElement>(`.${PREFIX}-comment-textarea`)
        if (textarea) textarea.placeholder = this._t('placeholder')
        const save = bodyContainer.querySelector<HTMLButtonElement>(`.${PREFIX}-comment-save`)
        if (save) save.textContent = this._t('save')
        const cancel = bodyContainer.querySelector<HTMLButtonElement>(`.${PREFIX}-comment-cancel`)
        if (cancel) cancel.textContent = this._t('cancel')
      } else {
        const source = bodyContainer.querySelector<HTMLElement>(`.${PREFIX}-comment-source`)
        if (source) source.textContent = this._t('source')
        const textarea = bodyContainer.querySelector<HTMLTextAreaElement>(`.${PREFIX}-comment-reply-textarea`)
        if (textarea) textarea.placeholder = this._t('replyPlaceholder')
        const reply = bodyContainer.querySelector<HTMLButtonElement>(`.${PREFIX}-comment-reply-submit`)
        if (reply) reply.textContent = this._t('reply')
        const cancel = bodyContainer.querySelector<HTMLButtonElement>(`.${PREFIX}-comment-reply-cancel`)
        if (cancel) cancel.textContent = this._t('cancel')
      }
    }
  }

  private _refreshCard(commentId: string): void {
    const comment = this._comments.find(c => c.id === commentId)
    if (!comment) return
    const bubble = this._cardDoms.get(commentId)
    if (bubble) this._updateCardDom(bubble, comment)
  }

  private _handleSave(comment: IComment): void {
    if (!this.canEdit()) return
    const content = this._drafts.get(comment.id) ?? comment.content
    if (!content.trim()) {
      this._handleCancel(comment)
      return
    }
    comment.content = content
    this._drafts.delete(comment.id)
    comment.isEditing = false
    this._commitComments()
    this._callbacks.onSave?.(comment)
    this._callbacks.onRequestSave?.()
    this._refreshCard(comment.id)
  }

  private _handleCancel(comment: IComment): void {
    this._drafts.delete(comment.id)
    if (!comment.content) {
      this.cancel(comment.id)
      this._callbacks.onCancel?.(comment.id)
      this._callbacks.onRequestSave?.()
      this.render()
    } else {
      comment.isEditing = false
      this._refreshCard(comment.id)
    }
  }

  private _showAnchorLines(comment: IComment): void {
    if (this._hoveredCommentId === comment.id) return
    if (!comment.anchor || !this._overlayContainer) return
    this._hideAnchorLines(false)
    this._hoveredCommentId = comment.id
    this._hideHoverTooltip()
    this._command?.setActiveGroup?.(comment.groupId)
    const card = this._cardDoms.get(comment.id)?.querySelector<HTMLDivElement>(`.${PREFIX}-comment-card`)
    if (card) this._applyCardStyle(card, comment)
    this._drawAnchorLines(comment)
  }

  private _drawAnchorLines(comment: IComment): void {
    for (const line of this._anchorLineEls) line.remove()
    this._anchorLineEls = []
    if (!comment.anchor || !this._overlayContainer) return
    const card = this._cardDoms.get(comment.id)?.querySelector<HTMLDivElement>(`.${PREFIX}-comment-card`)
    if (!card) return
    this._anchorLineEls = drawAnnotationConnector(
      this._overlayContainer, card, comment.anchor,
      comment.avatarColor || getAvatarColor(comment.userName), `${PREFIX}-comment-connector`
    )
  }

  private _hideAnchorLines(updateActiveGroup = true): void {
    for (const el of this._anchorLineEls) el.remove()
    this._anchorLineEls = []
    const id = this._hoveredCommentId
    this._hoveredCommentId = null
    if (id === null) return
    const comment = this._comments.find(item => item.id === id)
    const card = this._cardDoms.get(id)?.querySelector<HTMLDivElement>(`.${PREFIX}-comment-card`)
    if (card && comment) this._applyCardStyle(card, comment)
    if (updateActiveGroup) this._command?.setActiveGroup?.(null)
  }

  private _setupTextHover(): void {
    if (!this._command) return
    const container = this._command.getContainer?.()
    if (!container) return
    if (!document.getElementById(`${PREFIX}-tooltip-style`)) {
      const style = document.createElement('style')
      style.id = `${PREFIX}-tooltip-style`
      style.textContent = '@keyframes ce-tooltip-fade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}'
      document.head.append(style)
    }
    container.addEventListener('mousemove', (e: MouseEvent) => {
      if (this._hoveredCommentId !== null) return
      const rect = container.getBoundingClientRect()
      const x = e.clientX - rect.left + container.scrollLeft
      const y = e.clientY - rect.top + container.scrollTop
      const matched = this._findCommentAtPoint(x, y)
      if (matched) {
        if (this._hoverTooltipTimer === null) {
          this._hoverTooltipTimer = window.setTimeout(() => {
            this._showHoverTooltip(matched, e.clientX, e.clientY)
          }, 500)
        }
      } else {
        this._hideHoverTooltip()
      }
    })
    container.addEventListener('mouseleave', () => this._hideHoverTooltip())
  }

  private _findCommentAtPoint(x: number, y: number): IComment | null {
    for (const comment of this._comments) {
      if (!comment.anchor) continue
      const { startX, startY, endX, endY } = comment.anchor
      if (x >= startX - 2 && x <= endX + 2 && y >= startY - 2 && y <= endY + 2) {
        return comment
      }
    }
    return null
  }

  private _showHoverTooltip(comment: IComment, clientX: number, clientY: number): void {
    this._hideHoverTooltip()
    const tooltip = document.createElement('div')
    tooltip.style.cssText = `position:fixed;left:${clientX + 12}px;top:${clientY + 12}px;max-width:280px;padding:8px 12px;background:#fff;border:1px solid #e8e8e8;border-radius:0;box-shadow:0 2px 12px rgba(0,0,0,0.12);font-size:13px;color:#444;line-height:1.5;z-index:9999;pointer-events:none;animation:ce-tooltip-fade 0.2s ease;`
    const author = document.createElement('div')
    author.style.cssText = `font-weight:600;font-size:12px;color:${comment.avatarColor || getAvatarColor(comment.userName)};margin-bottom:4px;`
    author.textContent = comment.userName
    const content = document.createElement('div')
    content.style.cssText = 'word-break:break-word;'
    content.textContent = comment.content
    tooltip.append(author, content)
    document.body.append(tooltip)
    this._hoverTooltip = tooltip
  }

  private _hideHoverTooltip(): void {
    if (this._hoverTooltipTimer !== null) {
      clearTimeout(this._hoverTooltipTimer)
      this._hoverTooltipTimer = null
    }
    if (this._hoverTooltip) {
      this._hoverTooltip.remove()
      this._hoverTooltip = null
    }
  }

  /** 销毁实例：清除 DOM、解引用宿主与事件总线 */
  public destroy(): void {
    this._clearCards()
    this._hideHoverTooltip()
    this._restoreContainerWidth()
    if (this._overlayContainer) {
      this._overlayContainer.remove()
      this._overlayContainer = null
    }
    this._comments = []

    this._command = null
  }
}
