import type { IComment, IGroupColor } from '@vervedoc/docx-editor-schema'
import { nanoid } from 'nanoid'
import dayjs from 'dayjs'
import type { CommentHost } from './host'

const USER_COLORS = [
  '#409EFF', '#67C23A', '#E6A23C', '#F56C6C',
  '#909399', '#00BCD4', '#9C27B0', '#3F51B5',
  '#FF9800', '#4CAF50', '#009688', '#795548',
  '#FF5722', '#C2185B', '#FFC107', '#607D8B'
]
const PREFIX = 'ce'

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length]
}

function formatCommentDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = dayjs(dateStr)
  return d.isValid() ? d.format('YYYY-MM-DD HH:mm') : dateStr
}

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

export interface DocxCommentMeta {
  id: string | number
  content: string
  author?: string
  date?: string
}

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

  /** 宿主契约（由 core 注入，提供选区/文档/渲染等能力） */
  private _command: CommentHost | null = null
  /** 批注数据列表 */
  private _comments: IComment[] = []
  /** 生命周期回调（保存/删除/回复/解决/取消） */
  private _callbacks: CommentCallbacks = {}
  /** 批注气泡 overlay 容器（挂载在 Draw scroller 上） */
  private _overlayContainer: HTMLDivElement | null = null
  /** 批注卡片 DOM 映射（commentId → 卡片元素） */
  private _cardDoms: Map<string, HTMLDivElement> = new Map()
  /** 锚点竖线 DOM 元素列表 */
  private _anchorLineEls: HTMLDivElement[] = []
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

  /** 整体替换批注列表并同步高亮颜色 */
  public setAll(comments: IComment[]): void {
    this._comments = comments
    this._syncGroupColors()
  }

  /** 新建批注：在高亮选区上创建编辑态气泡，返回新批注或 null（无选区时） */
  public add(userName: string = '当前用户'): IComment | null {
    if (!this._command) return null
    const groupId = this._command.executeSetGroup?.()
    if (!groupId) {
      console.warn('[CommentComponent] add 失败：setGroup 返回 null，请检查选区')
      return null
    }
    const newComment: IComment = {
      id: groupId,
      groupId,
      content: '',
      userName,
      createdDate: formatCommentDate(new Date().toISOString()),
      rangeText: '',
      isEditing: true
    }
    this._comments.push(newComment)
    this._syncGroupColors()
    this._eventBus?.emit('commentCreate', newComment)
    return newComment
  }

  /** 删除指定 ID 的批注，清除文档高亮并触发 onDelete 回调 */
  public delete(id: string): void {
    const idx = this._comments.findIndex(c => c.id === id)
    if (idx !== -1) {
      const comment = this._comments[idx]
      this._comments.splice(idx, 1)
      this._command?.executeDeleteGroup?.(comment.groupId)
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
    const idx = this._comments.findIndex(c => c.id === id)
    if (idx === -1) return
    const comment = this._comments[idx]
    if (!comment.content) {
      this._comments.splice(idx, 1)
      this._command?.executeDeleteGroup?.(comment.groupId)
    } else {
      comment.isEditing = false
    }
    this._syncGroupColors()
  }

  /** 回复指定批注 */
  private reply(id: string, content: string, userName: string = '当前用户'): void {
    const comment = this._comments.find(c => c.id === id)
    if (!comment) return
    if (!comment.replies) comment.replies = []
    comment.replies.push({
      id: `reply-${nanoid()}`,
      groupId: comment.groupId,
      content,
      userName,
      avatarColor: getAvatarColor(userName),
      createdDate: formatCommentDate(new Date().toISOString()),
      rangeText: ''
    })
  }

  /** 标记批注为已解决/未解决 */
  private resolve(id: string, resolved: boolean): void {
    const comment = this._comments.find(c => c.id === id)
    if (comment) {
      comment.status = resolved ? 2 : 1
      this._syncGroupColors()
    }
  }

  /** 序列化批注为可保存结构（含 groupId，用于文档保存） */
  public serialize(): Array<Record<string, unknown>> {
    return this._comments.map(c => ({
      id: c.id,
      groupId: c.groupId,
      content: c.content,
      userName: c.userName,
      avatarColor: c.avatarColor,
      createdDate: c.createdDate,
      rangeText: c.rangeText || '',
      status: c.status,
      replies: c.replies?.map((r: IComment) => ({
        id: r.id,
        groupId: r.groupId,
        content: r.content,
        userName: r.userName,
        avatarColor: r.avatarColor,
        createdDate: r.createdDate,
        rangeText: r.rangeText || ''
      }))
    }))
  }

  /** 从序列化结构恢复批注列表（含 groupId，用于文档加载） */
  public restore(saved: any[]): void {
    const restored: IComment[] = []
    for (const item of saved) {
      if (!item || typeof item !== 'object') continue
      const id = String(item.id || '').trim()
      const groupId = String(item.groupId || id).trim()
      if (!id) continue
      restored.push({
        id,
        groupId,
        content: String(item.content || ''),
        userName: String(item.userName || '未知用户'),
        avatarColor: item.avatarColor || getAvatarColor(String(item.userName || '')),
        createdDate: String(item.createdDate || ''),
        rangeText: String(item.rangeText || ''),
        status: item.status
      })
    }
    this._comments = restored
    this._syncGroupColors()
  }

  /** 从 docx 解析出的批注元数据构建批注列表 */
  public buildFromMetas(metas: DocxCommentMeta[]): void {
    const newComments: IComment[] = []
    for (const meta of metas) {
      const groupId = 'comment_' + meta.id
      newComments.push({
        id: groupId,
        groupId,
        content: meta.content,
        userName: meta.author || '未知用户',
        avatarColor: getAvatarColor(meta.author || ''),
        createdDate: formatCommentDate(meta.date || ''),
        rangeText: ''
      })
    }
    this._comments = newComments
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
      const ctx = this._command?.getGroupContext?.(comment.groupId)
      if (!ctx) continue

      // 鏂版灦鏋勶細getGroupContext 鐩存帴杩斿洖 _anchor 鍧愭爣锛屼笉渚濊禆 positionList
      if ((ctx as any)._anchor) {
        const anchor = (ctx as any)._anchor as { startX: number; startY: number; endX: number; endY: number; lineHeight: number; glyphHeight: number; startGlyphTop: number; endGlyphTop: number }
        comment.position = { top: anchor.startY, left: balloonLeft, lineWidth: 0, originalTop: anchor.startY }
        comment.anchor = { startX: anchor.startX, startY: anchor.startY, endX: anchor.endX, endY: anchor.endY, lineHeight: anchor.lineHeight, glyphHeight: anchor.glyphHeight, startGlyphTop: anchor.startGlyphTop, endGlyphTop: anchor.endGlyphTop }
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

  /** 刷新批注气泡 DOM 渲染（计算锚点位置 + 创建/更新卡片 + 绘制竖线） */
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
    bubble.style.cssText = 'position:absolute;pointer-events:auto;transition:all 0.2s ease;'
    bubble.addEventListener('mouseenter', () => this._showAnchorLines(comment))
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
      '缂栬緫鎵规敞',
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 16.25V20h3.75L18.8 8.94l-3.75-3.75L4 16.25Z" fill="currentColor"/><path d="m14.96 5.19 3.75 3.75 1.09-1.09a1.5 1.5 0 0 0 0-2.12l-1.63-1.63a1.5 1.5 0 0 0-2.12 0l-1.09 1.09Z" fill="currentColor"/></svg>',
      () => {
        comment.isEditing = true
        this._refreshCard(comment.id)
      }
    )
    const deleteBtn = createActionBtn(
      `${PREFIX}-comment-delete`,
      '鍒犻櫎鎵规敞',
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M7 21a2 2 0 0 1-2-2V7h14v12a2 2 0 0 1-2 2H7Z" fill="currentColor"/><path d="M9 4h6l1 2h4v1.5H4V6h4l1-2Z" fill="currentColor"/></svg>',
      () => {
        this.delete(comment.id)
        this._callbacks.onRequestSave?.()
        this.render()
      }
    )
    const resolveBtn = createActionBtn(
      `${PREFIX}-comment-resolve`,
      comment.status === 2 ? '閲嶆柊鎵撳紑鎵规敞' : '瑙ｅ喅鎵规敞',
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
    const arrow = document.createElement('div')
    arrow.style.cssText = 'position:absolute;left:-7px;top:20px;width:14px;height:14px;background:#f7f7f7;border-left:1px solid #d9d9d9;border-bottom:1px solid #d9d9d9;transform:rotate(45deg);border-bottom-left-radius:2px;box-sizing:border-box;'
    bubble.append(arrow)
    return bubble
  }

  private _renderCardBody(container: HTMLDivElement, comment: IComment): void {
    container.innerHTML = ''

    if (comment.isEditing) {
      const editDiv = document.createElement('div')
      editDiv.style.cssText = 'margin:8px 0;'

      const textarea = document.createElement('textarea')
      textarea.classList.add(`${PREFIX}-comment-textarea`)
      textarea.placeholder = '璇疯緭鍏ユ壒娉ㄥ唴瀹?..'
      textarea.rows = 3
      textarea.value = comment.content
      textarea.style.cssText = 'width:93%;min-height:80px;padding:8px 10px;border:1px solid #dcdfe6;border-radius:6px;font-size:13px;font-family:inherit;line-height:1.6;resize:vertical;outline:none;transition:border-color 0.2s ease;'
      textarea.addEventListener('input', () => { comment.content = textarea.value })
      textarea.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') this._handleSave(comment)
      })
      textarea.addEventListener('focus', () => { textarea.style.borderColor = this._annotationColor })
      textarea.addEventListener('blur', () => { textarea.style.borderColor = '#dcdfe6' })

      const actions = document.createElement('div')
      actions.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:8px;'

      const saveBtn = document.createElement('button')
      saveBtn.textContent = '保存'
      saveBtn.style.cssText = `padding:5px 14px;font-size:12px;border:none;border-radius:6px;cursor:pointer;transition:all 0.15s ease;font-weight:500;background:${this._annotationColor};color:#fff;`
      saveBtn.addEventListener('click', () => this._handleSave(comment))
      saveBtn.addEventListener('mouseenter', () => { saveBtn.style.background = '#66b1ff' })
      saveBtn.addEventListener('mouseleave', () => { saveBtn.style.background = this._annotationColor })

      const cancelBtn = document.createElement('button')
      cancelBtn.textContent = '取消'
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
      label.style.cssText = 'font-weight:500;color:#1f1f1f;'
      label.textContent = '取自：'

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
    replyTrigger.textContent = '添加回复'
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
    textarea.placeholder = '输入回复...'
    textarea.rows = 2
    textarea.style.cssText = 'width:93%;min-height:50px;padding:8px 10px;border:1px solid #dcdfe6;border-radius:6px;font-size:13px;font-family:inherit;line-height:1.6;resize:vertical;outline:none;transition:border-color 0.2s ease;'
    textarea.addEventListener('focus', () => { textarea.style.borderColor = this._annotationColor })
    textarea.addEventListener('blur', () => { textarea.style.borderColor = '#dcdfe6' })

    const actions = document.createElement('div')
    actions.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:8px;'

    const replyBtn = document.createElement('button')
    replyBtn.textContent = '回复'
    replyBtn.style.cssText = `padding:5px 14px;font-size:12px;border:none;border-radius:6px;cursor:pointer;transition:all 0.15s ease;font-weight:500;background:${this._annotationColor};color:#fff;`
    replyBtn.addEventListener('mouseenter', () => { replyBtn.style.background = '#66b1ff' })
    replyBtn.addEventListener('mouseleave', () => { replyBtn.style.background = this._annotationColor })

    const cancelBtn = document.createElement('button')
    cancelBtn.textContent = '取消'
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
    let css = `min-width:270px;max-width:270px;border-radius:6px;padding:8px 10px;transition:all 0.2s ease;background:#f7f7f7;border:1px solid #d9d9d9;box-shadow:0 3px 10px rgba(0,0,0,0.08);box-sizing:border-box;`
    if (comment.status === 2) css += 'opacity:0.78;'
    if (comment.isEditing) css += `border-color:${accentColor};box-shadow:0 6px 18px rgba(64,158,255,0.16);background:#fafcff;`
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

      const resolveBtn = header.querySelector(`.${PREFIX}-comment-resolve`) as HTMLButtonElement | null
      if (resolveBtn) {
        resolveBtn.title = comment.status === 2 ? '閲嶆柊鎵撳紑鎵规敞' : '瑙ｅ喅鎵规敞'
        resolveBtn.style.color = comment.status === 2 ? '#2f8f4e' : '#444'
        resolveBtn.style.background = comment.status === 2 ? '#eef8f1' : 'transparent'
      }
    }

    const bodyContainer = card.querySelector(`.${PREFIX}-comment-body`) as HTMLDivElement
    if (bodyContainer) {
      this._renderCardBody(bodyContainer, comment)
    }
  }

  private _refreshCard(commentId: string): void {
    const comment = this._comments.find(c => c.id === commentId)
    if (!comment) return
    const bubble = this._cardDoms.get(commentId)
    if (bubble) this._updateCardDom(bubble, comment)
  }

  private _handleSave(comment: IComment): void {
    if (!comment.content.trim()) {
      this._handleCancel(comment)
      return
    }
    comment.isEditing = false
    this._callbacks.onSave?.(comment)
    this._callbacks.onRequestSave?.()
    this._refreshCard(comment.id)
  }

  private _handleCancel(comment: IComment): void {
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
    this._hideAnchorLines()
    this._command?.setActiveGroup?.(comment.groupId)
    if (!comment.anchor || !this._overlayContainer) return
    const { startX, endX } = comment.anchor
    const lineHeight = comment.anchor.lineHeight || 20
    const glyphHeight = comment.anchor.glyphHeight || lineHeight
    const startGlyphTop = comment.anchor.startGlyphTop ?? comment.anchor.startY
    const endGlyphTop = comment.anchor.endGlyphTop ?? (comment.anchor.endY - glyphHeight)
    const color = this._annotationColor
    for (const [x, y] of [[startX, startGlyphTop], [endX, endGlyphTop]]) {
      const line = document.createElement('div')
      line.style.cssText = `position:absolute;left:${x - 1}px;top:${y}px;width:2px;height:${glyphHeight}px;background:${color};pointer-events:none;z-index:11;opacity:0.7;`
      this._overlayContainer.append(line)
      this._anchorLineEls.push(line)
    }
  }

  private _hideAnchorLines(): void {
    for (const el of this._anchorLineEls) el.remove()
    this._anchorLineEls = []
    this._command?.setActiveGroup?.(null)
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
