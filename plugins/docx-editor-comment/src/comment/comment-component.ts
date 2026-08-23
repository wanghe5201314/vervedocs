import type { IComment, IGroupColor } from '@vervedoc/docx-editor-schema'


type Command = any

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

  private _command: Command | null = null
  private _comments: IComment[] = []
  private _callbacks: CommentCallbacks = {}
  private _overlayContainer: HTMLDivElement | null = null
  private _cardDoms: Map<string, HTMLDivElement> = new Map()
  private _anchorLineEls: HTMLDivElement[] = []
  private _hoverTooltip: HTMLDivElement | null = null
  private _hoverTooltipTimer: number | null = null


  private get _annotationColor(): string {
    return this._command?.getOptions?.()?.annotationColor || '#409eff'
  }

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

  public install(command: Command, callbacks?: CommentCallbacks): this {
    this._command = command
    if (callbacks) this._callbacks = callbacks
    return this
  }

  public getComments(): IComment[] {
    return this._comments
  }

  public setComments(comments: IComment[]): void {
    this._comments = comments
    this._syncGroupColors()
  }

  public addComment(userName: string = '当前用户'): IComment | null {
    if (!this._command) return null
    const groupId = this._command.executeSetGroup?.()
    if (!groupId) return null
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
    return newComment
  }

  public deleteComment(id: string): void {
    const idx = this._comments.findIndex(c => c.id === id)
    if (idx !== -1) {
      const comment = this._comments[idx]
      this._comments.splice(idx, 1)
      this._command?.executeDeleteGroup?.(comment.groupId)
      this._callbacks.onDelete?.(id)
      this._syncGroupColors()
    }
  }

  public locateComment(id: string): void {
    const comment = this._comments.find(c => c.id === id)
    if (comment) this._command?.executeLocationGroup?.(comment.groupId)
  }

  public saveComment(comment: IComment): void {
    const idx = this._comments.findIndex(c => c.id === comment.id)
    if (idx !== -1) {
      this._comments[idx] = { ...comment, isEditing: false }
      this._syncGroupColors()
    }
  }

  public cancelComment(id: string): void {
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

  public replyToComment(id: string, content: string, userName: string = '当前用户'): void {
    const comment = this._comments.find(c => c.id === id)
    if (!comment) return
    if (!comment.replies) comment.replies = []
    comment.replies.push({
      id: `reply-${Date.now()}`,
      groupId: comment.groupId,
      content,
      userName,
      avatarColor: getAvatarColor(userName),
      createdDate: formatCommentDate(new Date().toISOString()),
      rangeText: ''
    })
  }

  public resolveComment(id: string, resolved: boolean): void {
    const comment = this._comments.find(c => c.id === id)
    if (comment) {
      comment.status = resolved ? 2 : 1
      this._syncGroupColors()
    }
  }

  public serializeComments(): Array<Record<string, unknown>> {
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

  public restoreComments(saved: any[]): void {
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

  public buildCommentsFromMetas(metas: DocxCommentMeta[]): void {
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

  private _computePositions(): void {
    if (!this._command || this._comments.length === 0) return
    const positionList = this._command.getPositionList?.()
    if (!positionList || positionList.length === 0) return
    const pageWidth = this._command.getDrawWidth?.() || 794

    const balloonLeft = pageWidth + 16

    for (const comment of this._comments) {
      const ctx = this._command?.getGroupContext?.(comment.groupId)
      if (!ctx) continue
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
    const MIN_GAP = 80
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]
      const curr = sorted[i]
      if (curr.position!.top - prev.position!.top < MIN_GAP) {
        curr.position!.top = prev.position!.top + MIN_GAP
      }
    }
  }

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
    const cardMaxWidth = 300
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
    bubble.style.cssText = 'position:absolute;pointer-events:auto;transition:all 0.2s ease;'
    bubble.addEventListener('mouseenter', () => this._showAnchorLines(comment))
    bubble.addEventListener('mouseleave', () => this._hideAnchorLines())

    const card = document.createElement('div')
    card.classList.add(`${PREFIX}-comment-card`)
    card.dataset.commentId = comment.id
    this._applyCardStyle(card, comment)

    const header = document.createElement('div')
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;'

    const userDiv = document.createElement('div')
    userDiv.style.cssText = 'display:flex;align-items:center;gap:8px;'

    const avatar = document.createElement('div')
    avatar.style.cssText = `width:28px;height:28px;border-radius:0;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:13px;flex-shrink:0;background:${comment.avatarColor || getAvatarColor(comment.userName)};`
    avatar.textContent = comment.userName.charAt(0)

    const username = document.createElement('span')
    username.style.cssText = 'font-weight:600;font-size:13px;color:#1f1f1f;'
    username.textContent = comment.userName

    userDiv.append(avatar, username)

    const headerRight = document.createElement('div')
    headerRight.style.cssText = 'display:flex;align-items:center;gap:4px;position:relative;'

    if (comment.status === 2) {
      const badge = document.createElement('span')
      badge.style.cssText = 'font-size:10px;color:#67c23a;background:#f0f9eb;padding:2px 6px;border-radius:10px;white-space:nowrap;'
      badge.textContent = '已解决'
      headerRight.append(badge)
    }

    const dateSpan = document.createElement('span')
    dateSpan.style.cssText = 'font-size:11px;color:#9e9e9e;white-space:nowrap;'
    dateSpan.textContent = comment.createdDate

    const moreBtn = document.createElement('button')
    moreBtn.title = '更多操作'
    moreBtn.style.cssText = 'display:flex;align-items:center;justify-content:center;width:24px;height:24px;border:none;background:transparent;border-radius:50%;cursor:pointer;color:#9e9e9e;transition:all 0.15s ease;padding:0;flex-shrink:0;'
    moreBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="19" r="1.5" fill="currentColor"/></svg>'
    moreBtn.addEventListener('mouseenter', () => { moreBtn.style.background = '#f0f0f0'; moreBtn.style.color = '#666' })
    moreBtn.addEventListener('mouseleave', () => { moreBtn.style.background = 'transparent'; moreBtn.style.color = '#9e9e9e' })
    moreBtn.addEventListener('click', (e) => { e.stopPropagation(); this._toggleMenu(comment.id) })

    headerRight.append(dateSpan, moreBtn)
    header.append(userDiv, headerRight)

    const bodyContainer = document.createElement('div')
    bodyContainer.classList.add(`${PREFIX}-comment-body`)
    this._renderCardBody(bodyContainer, comment)

    card.append(header, bodyContainer)
    bubble.append(card)
    const arrow = document.createElement('div')
    arrow.style.cssText = 'position:absolute;left:-7px;top:14px;width:0;height:0;border-top:6px solid transparent;border-bottom:6px solid transparent;border-right:7px solid #e8e8e8;'
    const arrowInner = document.createElement('div')
    arrowInner.style.cssText = 'position:absolute;left:1px;top:-5px;width:0;height:0;border-top:5px solid transparent;border-bottom:5px solid transparent;border-right:6px solid #fff;'
    arrow.append(arrowInner)
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
      textarea.placeholder = '请输入批注内容...'
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

    const contentDiv = document.createElement('div')
    contentDiv.style.cssText = 'font-size:13px;color:#444;line-height:1.4;word-break:break-word;cursor:pointer;padding:2px 0;'
    contentDiv.textContent = comment.content
    contentDiv.addEventListener('dblclick', () => {
      comment.isEditing = true
      this._refreshCard(comment.id)
    })
    contentDiv.addEventListener('mouseenter', () => { contentDiv.style.background = '#f8f8f8'; contentDiv.style.borderRadius = '4px' })
    contentDiv.addEventListener('mouseleave', () => { contentDiv.style.background = 'transparent' })
    container.append(contentDiv)

    if (comment.replies && comment.replies.length > 0) {
      const replyList = document.createElement('div')
      replyList.style.cssText = 'margin-top:8px;padding-top:8px;border-top:1px solid #f0f0f0;'
      for (const reply of comment.replies) {
        const replyItem = document.createElement('div')
        replyItem.style.cssText = 'display:flex;align-items:flex-start;gap:8px;padding:6px 0;'

        const threadLine = document.createElement('div')
        threadLine.style.cssText = 'width:2px;background:#e4e7ed;border-radius:1px;flex-shrink:0;align-self:stretch;'

        const replyAvatar = document.createElement('div')
        replyAvatar.style.cssText = `width:22px;height:22px;border-radius:0;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:10px;flex-shrink:0;background:${reply.avatarColor || '#909399'};`
        replyAvatar.textContent = reply.userName.charAt(0)

        const replyBody = document.createElement('div')
        replyBody.style.cssText = 'flex:1;min-width:0;'

        const replyHeader = document.createElement('div')
        replyHeader.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:4px;'

        const replyUsername = document.createElement('span')
        replyUsername.style.cssText = 'font-size:12px;font-weight:600;color:#303133;'
        replyUsername.textContent = reply.userName

        const replyDate = document.createElement('span')
        replyDate.style.cssText = 'font-size:10px;color:#c0c4cc;'
        replyDate.textContent = reply.createdDate

        replyHeader.append(replyUsername, replyDate)

        const replyContent = document.createElement('div')
        replyContent.style.cssText = 'font-size:12px;color:#606266;line-height:1.5;word-break:break-word;'
        replyContent.textContent = reply.content

        replyBody.append(replyHeader, replyContent)
        replyItem.append(threadLine, replyAvatar, replyBody)
        replyList.append(replyItem)
      }
      container.append(replyList)
    }

    if (comment.isReplying) {
      this._renderReplyInput(container, comment)
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
      this.replyToComment(comment.id, content)
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
    let css = `min-width:240px;max-width:300px;border-radius:8px;padding:6px 10px;transition:all 0.2s ease;background:#fff;border:1px solid #e8e8e8;box-shadow:0 2px 8px rgba(0,0,0,0.06);`
    if (comment.status === 2) css += 'opacity:0.65;'
    if (comment.isEditing) css += `border-color:${accentColor};box-shadow:0 4px 16px rgba(64,158,255,0.15);background:#fafcff;`
    card.style.cssText = css
  }

  private _updateCardDom(bubble: HTMLDivElement, comment: IComment): void {
    const card = bubble.querySelector(`.${PREFIX}-comment-card`) as HTMLDivElement
    if (!card) return
    this._applyCardStyle(card, comment)

    const header = card.querySelector(':scope > div:first-child') as HTMLDivElement
    if (header) {
      const headerRight = header.querySelector(':scope > div:last-child') as HTMLDivElement
      if (headerRight) {
        const existingBadge = headerRight.querySelector('.resolved-badge')
        if (comment.status === 2 && !existingBadge) {
          const badge = document.createElement('span')
          badge.classList.add('resolved-badge')
          badge.style.cssText = 'font-size:11px;color:#67c23a;background:#f0f9eb;padding:1px 6px;border-radius:3px;white-space:nowrap;'
          badge.textContent = '已解决'
          headerRight.insertBefore(badge, headerRight.firstChild)
        } else if (comment.status !== 2 && existingBadge) {
          existingBadge.remove()
        }
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
      this.cancelComment(comment.id)
      this._callbacks.onCancel?.(comment.id)
      this._callbacks.onRequestSave?.()
      this.render()
    } else {
      comment.isEditing = false
      this._refreshCard(comment.id)
    }
  }

  private _toggleMenu(commentId: string): void {
    this._closeMenu()

    const bubble = this._cardDoms.get(commentId)
    if (!bubble) return
    const card = bubble.querySelector(`.${PREFIX}-comment-card`) as HTMLDivElement
    if (!card) return
    const headerRight = card.querySelector(':scope > div:first-child > div:last-child') as HTMLDivElement
    if (!headerRight) return

    const comment = this._comments.find(c => c.id === commentId)
    if (!comment) return

    const menu = document.createElement('div')
    menu.classList.add(`${PREFIX}-comment-menu`)
    menu.style.cssText = 'position:absolute;top:100%;right:0;margin-top:4px;background:#fff;border:1px solid #e0e0e0;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.1);padding:4px 0;z-index:100;min-width:120px;'

    const items = [
      { label: '编辑', action: () => { comment.isEditing = true; this._refreshCard(commentId) } },
      { label: '回复', action: () => { comment.isReplying = true; this._refreshCard(commentId) } },
      { label: comment.status === 2 ? '重新打开' : '解决', action: () => {
        const resolved = comment.status !== 2
        this.resolveComment(commentId, resolved)
        this._callbacks.onResolve?.(commentId, resolved)
        this._callbacks.onRequestSave?.()
        this.render()
      }},
      { label: '删除', action: () => {
        this.deleteComment(commentId)
        this._callbacks.onRequestSave?.()
        this.render()
      }, isDelete: true }
    ]

    for (const item of items) {
      const btn = document.createElement('button')
      btn.style.cssText = `display:flex;align-items:center;gap:8px;width:100%;padding:7px 14px;border:none;background:none;cursor:pointer;font-size:13px;color:${item.isDelete ? '#e53935' : '#444'};transition:all 0.15s ease;text-align:left;border-radius:4px;margin:0 4px;width:calc(100% - 8px);`
      btn.textContent = item.label
      btn.addEventListener('click', (e) => { e.stopPropagation(); this._closeMenu(); item.action() })
      btn.addEventListener('mouseenter', () => {
        if (item.isDelete) { btn.style.background = '#fce4ec' }
        else { btn.style.background = '#f5f5f5'; btn.style.color = '#1f1f1f' }
      })
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'none'
        btn.style.color = item.isDelete ? '#e53935' : '#444'
      })
      menu.append(btn)
    }

    headerRight.append(menu)

    const closeOnOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest(`.${PREFIX}-comment-menu`)) {
        this._closeMenu()
        document.removeEventListener('click', closeOnOutside)
      }
    }
    setTimeout(() => document.addEventListener('click', closeOnOutside), 0)
  }

  private _closeMenu(): void {
    const existing = document.querySelector(`.${PREFIX}-comment-menu`)
    if (existing) existing.remove()

  }

  private _showAnchorLines(comment: IComment): void {
    this._hideAnchorLines()
    if (!comment.anchor || !this._overlayContainer) return
    const { startX, startY, endX, endY } = comment.anchor
    const lineHeight = comment.anchor.lineHeight || 20
    const color = this._annotationColor
    for (const [x, y] of [[startX, startY], [endX, endY - lineHeight]]) {
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

  public destroy(): void {
    this._clearCards()
    this._hideHoverTooltip()
    this._restoreContainerWidth()
    if (this._overlayContainer) {
      this._overlayContainer.remove()
      this._overlayContainer = null
    }
    this._closeMenu()
    this._comments = []

    this._command = null
  }
}
