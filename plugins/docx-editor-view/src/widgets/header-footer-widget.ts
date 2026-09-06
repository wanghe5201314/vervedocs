/**
 * HeaderFooterWidget —— 页眉页脚交互 widget
 *
 * 从 Draw 分离的页眉页脚 UI 交互逻辑：
 *  - 双击页眉/页脚区域进入编辑
 *  - 双击正文区域退出编辑
 *  - 编辑时绘制虚线边框 + 标签栏（左侧 "页眉 - 第 1 节" + 居中 "插入页码"）
 *  - "插入页码" 弹出面板：样式 + 位置（左侧 / 居中 / 右侧）+ 确定
 *
 * 生命周期：create() → renderBorder() → destroy()
 */

import type { DocumentLayout } from '../layout-types'

/** 文档区域类型：正文 / 页眉 / 页脚 */
export type Zone = 'main' | 'header' | 'footer'

/** 页码位置：左侧 / 居中 / 右侧 */
export type PageNumberPosition = 'left' | 'center' | 'right'
/** 页码样式：阿拉伯数字 / 大小写罗马 / 大小写字母 */
export type PageNumberStyle = '1, 2, 3 ...' | 'I, II, III ...' | 'i, ii, iii ...' | 'A, B, C ...' | 'a, b, c ...'

/** 插入页码的配置选项 */
export interface PageNumberOptions {
  /** 页码样式 */
  style: PageNumberStyle
  /** 页码位置 */
  position: PageNumberPosition
}

/** HeaderFooterWidget 的依赖注入接口 */
export interface HeaderFooterWidgetDeps {
  /** 获取当前文档布局 */
  getLayout: () => DocumentLayout | null
  /** 获取容器元素的矩形位置 */
  getContainerRect: () => DOMRect
  /** 获取当前垂直滚动偏移 */
  getScrollY: () => number
  /** 获取编辑区可视宽度 */
  getWrapperWidth: () => number
  /** 获取水平滚动偏移 */
  getScrollLeft: () => number
  /** 获取页面在容器中的水平偏移 */
  getPageOffsetX: () => number
  /** 获取当前所处区域 */
  getZone: () => Zone
  /** 设置当前所处区域 */
  setZone: (zone: Zone) => void
  /** 让编辑区获取焦点 */
  focusInput: () => void
  /** 绘制页眉/页脚区域虚线边框 */
  drawZoneBorder: (layout: DocumentLayout, scrollY: number, zone: 'header' | 'footer', pageOffsetX: number) => void
  /** 插入页码回调（可选） */
  onInsertPageNumber?: (options: PageNumberOptions) => void
}

/** 页眉页脚交互 widget，负责双击进入/退出编辑、虚线边框、标签栏及插入页码面板 */
export class HeaderFooterWidget {
  /** 左侧标签栏容器：页眉/页脚 - 第 N 节 */
  private labelEl: HTMLDivElement | null = null
  /** 标签栏内的文本 span */
  private labelTextEl: HTMLSpanElement | null = null

  /** 居中的"插入页码"按钮 */
  private insertBtnEl: HTMLButtonElement | null = null

  /** 插入页码弹出面板 */
  private popupEl: HTMLDivElement | null = null
  /** 弹出面板是否可见 */
  private popupVisible = false

  /** 面板内当前选中的页码位置 */
  private selectedPosition: PageNumberPosition = 'center'
  /** 面板内当前选中的页码样式 */
  private selectedStyle: PageNumberStyle = '1, 2, 3 ...'

  /** 点击面板外部时隐藏 popup 的全局 mousedown 监听 */
  private onDocumentMouseDown = (e: MouseEvent) => {
    if (!this.popupVisible) return
    const target = e.target as Node
    if (this.popupEl && this.popupEl.contains(target)) return
    if (this.insertBtnEl && this.insertBtnEl.contains(target)) return
    this.hidePopup()
  }

  /**
   * 创建 HeaderFooterWidget 实例
   * @param deps 依赖注入对象
   */
  constructor(private deps: HeaderFooterWidgetDeps) {}

  /* -------------------- 生命周期 -------------------- */

  /** 创建所有 DOM 元素并绑定全局监听 */
  create(): void {
    this.createLabel()
    this.createInsertButton()
    this.createPopup()
    document.addEventListener('mousedown', this.onDocumentMouseDown, true)
  }

  /** 销毁 widget：移除全局监听与所有 DOM 元素并清理引用 */
  destroy(): void {
    document.removeEventListener('mousedown', this.onDocumentMouseDown, true)
    this.labelEl?.remove()
    this.insertBtnEl?.remove()
    this.popupEl?.remove()
    this.labelEl = null
    this.labelTextEl = null
    this.insertBtnEl = null
    this.popupEl = null
  }

  /* -------------------- DOM 构建 -------------------- */

  /** 创建左侧标签栏 DOM（页眉/页脚 - 第 N 节） */
  private createLabel(): void {
    const el = document.createElement('div')
    el.className = 'vervedocs-zone-label'
    Object.assign(el.style, {
      position: 'fixed',
      display: 'none',
      zIndex: '100',
      alignItems: 'center',
      gap: '6px',
      padding: '2px 10px',
      background: '#e8e8e8',
      border: '1px solid #bfbfbf',
      borderRadius: '0',
      fontSize: '12px',
      color: '#595959',
      userSelect: 'none',
      pointerEvents: 'auto',
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      boxShadow: 'none',
    } as CSSStyleDeclaration)

    const textEl = document.createElement('span')
    textEl.textContent = '页眉 - 第 1 节'
    el.appendChild(textEl)

    this.labelEl = el
    this.labelTextEl = textEl
    document.body.appendChild(el)
  }

  /** 创建居中"插入页码"按钮 DOM（含图标、文字、下拉箭头及悬停态） */
  private createInsertButton(): void {
    const btn = document.createElement('button')
    btn.className = 'vervedocs-zone-insert-pagenumber'
    Object.assign(btn.style, {
      position: 'fixed',
      display: 'none',
      zIndex: '100',
      alignItems: 'center',
      gap: '4px',
      height: '22px',
      padding: '0 10px',
      background: '#e8e8e8',
      border: '1px solid #bfbfbf',
      borderRadius: '0',
      fontSize: '12px',
      color: '#333333',
      cursor: 'pointer',
      userSelect: 'none',
      pointerEvents: 'auto',
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      boxShadow: 'none',
    } as CSSStyleDeclaration)

    // 左侧图标（灰色页码 icon，统一色调）
    const icon = document.createElement('span')
    icon.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="2" y="1.5" width="10" height="11" rx="1" stroke="#333333" stroke-width="1"/>' +
      '<text x="7" y="9.5" text-anchor="middle" font-size="6.5" fill="#333333" font-family="Arial" font-weight="600">1</text>' +
      '</svg>'
    icon.style.display = 'inline-flex'
    icon.style.alignItems = 'center'
    btn.appendChild(icon)

    const label = document.createElement('span')
    label.textContent = '插入页码'
    label.style.color = '#333333'
    btn.appendChild(label)

    const caret = document.createElement('span')
    caret.textContent = '▾'
    caret.style.fontSize = '10px'
    caret.style.color = '#595959'
    caret.style.marginLeft = '2px'
    btn.appendChild(caret)

    btn.addEventListener('mouseenter', () => { btn.style.background = '#dcdcdc'; btn.style.borderColor = '#a6a6a6' })
    btn.addEventListener('mouseleave', () => { btn.style.background = '#e8e8e8'; btn.style.borderColor = '#bfbfbf' })
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      this.togglePopup()
    })

    this.insertBtnEl = btn
    document.body.appendChild(btn)
  }

  /** 创建插入页码弹出面板 DOM（样式选择 + 位置预览 + 确定按钮） */
  private createPopup(): void {
    const popup = document.createElement('div')
    popup.className = 'ce-zone-pagenumber-menu'
    Object.assign(popup.style, {
      position: 'fixed',
      display: 'none',
      zIndex: '1000',
      width: '244px',
      padding: '10px 14px 12px',
      background: '#ffffff',
      border: '1px solid #d9d9d9',
      borderRadius: '5px',
      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.12)',
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      userSelect: 'none',
    } as CSSStyleDeclaration)

    // -------- 样式 --------
    const styleRow = document.createElement('div')
    Object.assign(styleRow.style, {
      display: 'flex',
      alignItems: 'center',
      marginBottom: '10px',
    } as CSSStyleDeclaration)

    const styleLabel = document.createElement('span')
    styleLabel.textContent = '样式:'
    Object.assign(styleLabel.style, {
      width: '40px',
      fontSize: '12px',
      color: '#1f1f1f',
      flexShrink: '0',
    } as CSSStyleDeclaration)
    styleRow.appendChild(styleLabel)

    const styleSelect = document.createElement('select')
    Object.assign(styleSelect.style, {
      flex: '1',
      height: '26px',
      padding: '0 8px',
      fontSize: '12px',
      color: '#1f1f1f',
      background: '#ffffff',
      border: '1px solid #cfcfcf',
      borderRadius: '3px',
      outline: 'none',
      cursor: 'pointer',
    } as CSSStyleDeclaration)
    const styleOptions: PageNumberStyle[] = [
      '1, 2, 3 ...',
      'I, II, III ...',
      'i, ii, iii ...',
      'A, B, C ...',
      'a, b, c ...',
    ]
    styleOptions.forEach((s) => {
      const opt = document.createElement('option')
      opt.value = s
      opt.textContent = s
      styleSelect.appendChild(opt)
    })
    styleSelect.value = this.selectedStyle
    styleSelect.addEventListener('change', () => {
      this.selectedStyle = styleSelect.value as PageNumberStyle
    })
    styleRow.appendChild(styleSelect)
    popup.appendChild(styleRow)

    // -------- 位置 --------
    const posTitle = document.createElement('div')
    posTitle.textContent = '位置:'
    Object.assign(posTitle.style, {
      fontSize: '12px',
      color: '#1f1f1f',
      marginBottom: '6px',
    } as CSSStyleDeclaration)
    popup.appendChild(posTitle)

    const posRow = document.createElement('div')
    Object.assign(posRow.style, {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-start',
      marginBottom: '12px',
    } as CSSStyleDeclaration)

    const positions: Array<{ value: PageNumberPosition; text: string }> = [
      { value: 'left', text: '左侧' },
      { value: 'center', text: '居中' },
      { value: 'right', text: '右侧' },
    ]

    const posItems: Array<{ value: PageNumberPosition; el: HTMLDivElement; preview: HTMLDivElement }> = []

    positions.forEach(({ value, text }) => {
      const item = document.createElement('div')
      Object.assign(item.style, {
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        cursor: 'pointer',
      } as CSSStyleDeclaration)

      const preview = document.createElement('div')
      Object.assign(preview.style, {
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        width: '40px',
        height: '54px',
        padding: '7px 5px',
        background: '#ffffff',
        border: '1px solid #dddddd',
        borderRadius: '3px',
        boxSizing: 'border-box',
      } as CSSStyleDeclaration)

      // 顶部数字
      const num = document.createElement('span')
      num.textContent = '1'
      Object.assign(num.style, {
        position: 'absolute',
        top: '3px',
        fontSize: '8px',
        lineHeight: '1',
        color: '#666666',
      } as CSSStyleDeclaration)
      if (value === 'left') { num.style.left = '5px' }
      else if (value === 'right') { num.style.right = '5px' }
      else { num.style.left = '50%'; num.style.transform = 'translateX(-50%)' }
      preview.appendChild(num)

      // 页内假的文本行
      for (let i = 0; i < 5; i++) {
        const line = document.createElement('div')
        Object.assign(line.style, {
          height: '2px',
          marginTop: i === 0 ? '14px' : '3px',
          background: '#dadada',
          borderRadius: '999px',
          width: i === 4 ? '70%' : '100%',
        } as CSSStyleDeclaration)
        preview.appendChild(line)
      }

      const textEl = document.createElement('span')
      textEl.textContent = text
      Object.assign(textEl.style, {
        fontSize: '11px',
        color: '#1f1f1f',
      } as CSSStyleDeclaration)

      item.appendChild(preview)
      item.appendChild(textEl)
      item.addEventListener('click', () => {
        this.selectedPosition = value
        this.updatePositionSelection(posItems, textEl.parentElement as HTMLDivElement)
        // 更新所有项高亮
        posItems.forEach((it) => {
          const isActive = it.value === value
          it.preview.style.background = isActive ? '#ececec' : '#ffffff'
          it.preview.style.borderColor = isActive ? '#d6d6d6' : '#dddddd'
          const t = it.el.querySelector('span:last-child') as HTMLSpanElement | null
          if (t) t.style.color = isActive ? '#1677ff' : '#1f1f1f'
        })
      })

      posRow.appendChild(item)
      posItems.push({ value, el: item, preview })
    })
    popup.appendChild(posRow)

    // 初始化默认选中
    posItems.forEach((it) => {
      const isActive = it.value === this.selectedPosition
      it.preview.style.background = isActive ? '#ececec' : '#ffffff'
      it.preview.style.borderColor = isActive ? '#d6d6d6' : '#dddddd'
      const t = it.el.querySelector('span:last-child') as HTMLSpanElement | null
      if (t) t.style.color = isActive ? '#1677ff' : '#1f1f1f'
    })

    // -------- 确定 --------
    const footer = document.createElement('div')
    Object.assign(footer.style, {
      display: 'flex',
      justifyContent: 'flex-end',
      marginTop: '4px',
    } as CSSStyleDeclaration)

    const confirmBtn = document.createElement('button')
    confirmBtn.textContent = '确定'
    Object.assign(confirmBtn.style, {
      minWidth: '58px',
      height: '26px',
      padding: '0 14px',
      fontSize: '12px',
      color: '#ffffff',
      background: '#1677ff',
      border: '1px solid #1677ff',
      borderRadius: '3px',
      cursor: 'pointer',
    } as CSSStyleDeclaration)
    confirmBtn.addEventListener('mouseenter', () => {
      confirmBtn.style.background = '#4096ff'
      confirmBtn.style.borderColor = '#4096ff'
    })
    confirmBtn.addEventListener('mouseleave', () => {
      confirmBtn.style.background = '#1677ff'
      confirmBtn.style.borderColor = '#1677ff'
    })
    confirmBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      this.deps.onInsertPageNumber?.({
        style: this.selectedStyle,
        position: this.selectedPosition,
      })
      this.hidePopup()
    })
    footer.appendChild(confirmBtn)
    popup.appendChild(footer)

    this.popupEl = popup
    document.body.appendChild(popup)
  }

  /**
   * 更新位置项的选中高亮（占位方法，实际高亮逻辑已在 click 中处理）
   * @param _items 所有位置项集合
   * @param _current 当前点击的位置项
   */
  private updatePositionSelection(
    _items: Array<{ value: PageNumberPosition; el: HTMLDivElement; preview: HTMLDivElement }>,
    _current: HTMLDivElement,
  ): void {
    // 高亮逻辑已在 click 中处理，此方法保留占位以便未来扩展
  }

  /* -------------------- 交互 -------------------- */

  /**
   * 处理 mousedown 事件中的双击页眉/页脚逻辑。
   * 返回 true 表示已处理（Draw 应跳过后续 hit/选词逻辑）。
   * @param e 鼠标事件
   * @returns 是否已处理该事件
   */
  handleMouseDown(e: MouseEvent): boolean {
    if (e.detail !== 2) return false
    const layout = this.deps.getLayout()
    if (!layout) return false
    const rect = this.deps.getContainerRect()
    const docY = e.clientY - rect.top + this.deps.getScrollY()
    const hitZone = this.hitZone(docY)
    if (hitZone === 'header' || hitZone === 'footer') {
      this.deps.setZone(hitZone)
      this.deps.focusInput()
      return true
    }
    if (hitZone === 'main' && this.deps.getZone() !== 'main') {
      this.hidePopup()
      this.deps.setZone('main')
      this.deps.focusInput()
      return true
    }
    return false
  }

  /**
   * 判断文档坐标 docY 落在哪个区域
   * @param docY 文档纵向坐标
   * @returns 命中的区域类型
   */
  hitZone(docY: number): Zone {
    const layout = this.deps.getLayout()
    if (!layout) return 'main'
    for (const page of layout.pages) {
      if (docY < page.rect.y || docY > page.rect.y + page.rect.height) continue
      if (page.headerRect && docY >= page.headerRect.y && docY <= page.headerRect.y + page.headerRect.height) return 'header'
      if (page.footerRect && docY >= page.footerRect.y && docY <= page.footerRect.y + page.footerRect.height) return 'footer'
      return 'main'
    }
    return 'main'
  }

  /**
   * 渲染 zone 边框 + 更新标签栏（在 overlay clearOverlay 之后调用）
   */
  renderBorder(): void {
    const layout = this.deps.getLayout()
    const zone = this.deps.getZone()
    if (!layout) return

    if (zone === 'main') {
      this.hideLabel()
      this.hideInsertButton()
      this.hidePopup()
      return
    }

    // 绘制虚线边框
    this.deps.drawZoneBorder(layout, this.deps.getScrollY(), zone, this.deps.getPageOffsetX())

    // 更新左侧标签栏 + 居中"插入页码"按钮
    this.updateLabel(layout, zone)
    this.updateInsertButton(layout, zone)
    // 若 popup 显示中，同步跟随按钮位置
    if (this.popupVisible) this.positionPopup()
  }

  /**
   * 更新左侧标签栏的位置与文本
   * @param layout 文档布局
   * @param zone 当前区域（header / footer）
   */
  private updateLabel(layout: DocumentLayout, zone: 'header' | 'footer'): void {
    if (!this.labelEl || !this.labelTextEl) return
    const page = layout.pages[0]
    if (!page) return
    const rect = zone === 'header' ? page.headerRect : page.footerRect
    if (!rect) return

    const containerRect = this.deps.getContainerRect()
    const pageOffsetX = this.deps.getPageOffsetX()
    const scrollY = this.deps.getScrollY()

    // 分隔虚线的 y（页眉：headerRect 下沿；页脚：footerRect 上沿）
    const dividerDocY = zone === 'header' ? rect.y + rect.height : rect.y
    const dividerScreenY = dividerDocY - scrollY + containerRect.top

    // 标签贴在页面左边缘（页边距之外）并向右微移，与虚线对齐
    const screenX = page.rect.x + pageOffsetX + containerRect.left + 24
    const labelY = zone === 'header'
      ? dividerScreenY + 1
      : dividerScreenY - this.labelEl.offsetHeight - 1

    this.labelEl.style.left = `${screenX}px`
    this.labelEl.style.top = `${labelY}px`
    this.labelEl.style.display = 'flex'
    this.labelTextEl.textContent = zone === 'header' ? '页眉 - 第 1 节' : '页脚 - 第 1 节'
  }

  /**
   * 更新居中"插入页码"按钮的位置（横向居中于页面，纵向贴齐虚线）
   * @param layout 文档布局
   * @param zone 当前区域（header / footer）
   */
  private updateInsertButton(layout: DocumentLayout, zone: 'header' | 'footer'): void {
    if (!this.insertBtnEl) return
    const page = layout.pages[0]
    if (!page) return
    const rect = zone === 'header' ? page.headerRect : page.footerRect
    if (!rect) return

    const containerRect = this.deps.getContainerRect()
    const pageOffsetX = this.deps.getPageOffsetX()
    const scrollY = this.deps.getScrollY()

    // 先显示以便可以拿到宽度
    this.insertBtnEl.style.display = 'inline-flex'

    // 居中于页面（沿页面横向中点）
    const pageCenterX = rect.x + pageOffsetX + containerRect.left + rect.width / 2
    const btnWidth = this.insertBtnEl.offsetWidth
    const left = pageCenterX - btnWidth / 2

    // 与虚线对齐：按钮紧贴虚线（页眉时在下方，页脚时在上方）
    const dividerDocY = zone === 'header' ? rect.y + rect.height : rect.y
    const dividerScreenY = dividerDocY - scrollY + containerRect.top
    const btnHeight = this.insertBtnEl.offsetHeight
    const top = zone === 'header'
      ? dividerScreenY + 1
      : dividerScreenY - btnHeight - 1

    this.insertBtnEl.style.left = `${left}px`
    this.insertBtnEl.style.top = `${top}px`
  }

  /** 隐藏左侧标签栏 */
  private hideLabel(): void {
    if (this.labelEl) this.labelEl.style.display = 'none'
  }

  /** 隐藏"插入页码"按钮 */
  private hideInsertButton(): void {
    if (this.insertBtnEl) this.insertBtnEl.style.display = 'none'
  }

  /* -------------------- 弹出面板 -------------------- */

  /** 切换弹出面板的显示/隐藏状态 */
  private togglePopup(): void {
    if (this.popupVisible) this.hidePopup()
    else this.showPopup()
  }

  /** 显示弹出面板并定位 */
  private showPopup(): void {
    if (!this.popupEl) return
    this.popupEl.style.display = 'block'
    this.popupVisible = true
    this.positionPopup()
  }

  /** 隐藏弹出面板 */
  private hidePopup(): void {
    if (!this.popupEl) return
    this.popupEl.style.display = 'none'
    this.popupVisible = false
  }

  /** 根据按钮位置计算弹出面板坐标，含越界翻转处理 */
  private positionPopup(): void {
    if (!this.popupEl || !this.insertBtnEl) return
    const btnRect = this.insertBtnEl.getBoundingClientRect()
    const popupWidth = this.popupEl.offsetWidth
    const popupHeight = this.popupEl.offsetHeight

    let left = btnRect.left + btnRect.width / 2 - popupWidth / 2
    let top = btnRect.bottom + 6

    // 越界处理
    const vw = window.innerWidth
    const vh = window.innerHeight
    if (left < 4) left = 4
    if (left + popupWidth > vw - 4) left = vw - popupWidth - 4
    if (top + popupHeight > vh - 4) {
      // 若下方空间不足，则显示在按钮上方
      top = btnRect.top - popupHeight - 6
    }

    this.popupEl.style.left = `${left}px`
    this.popupEl.style.top = `${top}px`
  }
}
