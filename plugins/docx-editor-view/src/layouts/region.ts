import { EDITOR_PREFIX } from '@vervedoc/docx-editor-schema'
import { EditorZone } from '@vervedoc/docx-editor-schema'
import { IEditorOption } from '@vervedoc/docx-editor-schema'
import { nextTick } from '@vervedoc/docx-editor-schema'
import { Draw } from '../renders/engine'
import { I18n } from '../plugin-stubs'
import { ZoneTip } from './region-tooltip'
import { PAGE_NUMBER_STYLES } from '@vervedoc/docx-editor-schema'

export class Zone {
  private readonly INDICATOR_PADDING = 2
  private draw: Draw
  private options: Required<IEditorOption>
  private i18n: I18n
  private container: HTMLDivElement

  private currentZone: EditorZone
  private indicatorContainer: HTMLDivElement | null
  private pageNumberMenu: HTMLDivElement | null

  constructor(draw: Draw) {
    this.draw = draw
    this.i18n = draw.getI18n()
    this.options = draw.getOptions()
    this.container = draw.getContainer()
    this.currentZone = EditorZone.MAIN
    this.indicatorContainer = null
    this.pageNumberMenu = null
    // 区域提示
    if (!this.options.zone.tipDisabled) {
      new ZoneTip(draw, this)
    }
  }

  public isHeaderActive(): boolean {
    return this.getZone() === EditorZone.HEADER
  }

  public isMainActive(): boolean {
    return this.getZone() === EditorZone.MAIN
  }

  public isFooterActive(): boolean {
    return this.getZone() === EditorZone.FOOTER
  }

  public getZone(): EditorZone {
    return this.currentZone
  }

  public setZone(payload: EditorZone) {
    const { header, footer } = this.options
    if (
      (!header.editable && payload === EditorZone.HEADER) ||
      (!footer.editable && payload === EditorZone.FOOTER)
    ) {
      return
    }
    if (this.currentZone === payload) return
    this.currentZone = payload
    this.draw.getRange().clearRange()
    this.draw.render({
      isSubmitHistory: false,
      isSetCursor: false,
      isCompute: false
    })
    // 指示器
    this.drawZoneIndicator()
    // 回调
    nextTick(() => {
      const listener = this.draw.getListener()
      if (listener.zoneChange) {
        listener.zoneChange(payload)
      }
      const eventBus = this.draw.getEventBus()
      if (eventBus.hasSubscribers('zoneChange')) {
        eventBus.emit('zoneChange', payload)
      }
    })
  }

  public getZoneByY(y: number): EditorZone {
    // 页眉底部距离页面顶部距离
    const header = this.draw.getHeader()
    const headerBottomY = header.getExtraHeight() + this.draw.getMargins()[0]
    // 页脚上部距离页面顶部距离
    const footer = this.draw.getFooter()
    const pageHeight = this.draw.getHeight()
    const footerTopY =
      pageHeight - (footer.getExtraHeight() + this.draw.getMargins()[2])
    // 页眉：当前位置小于页眉底部位置
    if (y < headerBottomY) {
      return EditorZone.HEADER
    }
    // 页脚：当前位置大于页脚顶部位置
    if (y > footerTopY) {
      return EditorZone.FOOTER
    }
    return EditorZone.MAIN
  }

  public drawZoneIndicator() {
    this._clearZoneIndicator()
    if (!this.isHeaderActive() && !this.isFooterActive()) return
    const { scale } = this.options
    const isHeaderActive = this.isHeaderActive()
    const pageList = this.draw.getPageList()
    const margins = this.draw.getMargins()
    const innerWidth = this.draw.getInnerWidth()
    const pageHeight = this.draw.getHeight()
    const pageGap = this.draw.getPageGap()
    const preY = pageHeight + pageGap
    // 创建指示器容器
    this.indicatorContainer = document.createElement('div')
    this.indicatorContainer.classList.add(`${EDITOR_PREFIX}-zone-indicator`)
    // 指示器位置
    const header = this.draw.getHeader()
    const footer = this.draw.getFooter()
    const indicatorHeight = isHeaderActive
      ? header.getHeight()
      : footer.getHeight()
    const indicatorTop = isHeaderActive
      ? header.getHeaderTop()
      : pageHeight - footer.getFooterBottom() - indicatorHeight
    for (let p = 0; p < pageList.length; p++) {
      const startY = preY * p + indicatorTop
      const indicatorLeftX = margins[3] - this.INDICATOR_PADDING
      const indicatorRightX = margins[3] + innerWidth + this.INDICATOR_PADDING
      const indicatorTopY = isHeaderActive
        ? startY - this.INDICATOR_PADDING
        : startY + indicatorHeight + this.INDICATOR_PADDING
      const indicatorBottomY = isHeaderActive
        ? startY + indicatorHeight + this.INDICATOR_PADDING
        : startY - this.INDICATOR_PADDING

      // 工具栏行
      const toolbar = document.createElement('div')
      toolbar.classList.add(`${EDITOR_PREFIX}-zone-toolbar`)
      toolbar.style.top = `${indicatorBottomY}px`
      toolbar.style.left = `${margins[3]}px`
      toolbar.style.width = `${innerWidth}px`
      toolbar.style.transform = `scale(${scale})`
      toolbar.style.transformOrigin = '0 0'

      // 左侧标签
      const labelLeft = document.createElement('div')
      labelLeft.classList.add(`${EDITOR_PREFIX}-zone-toolbar-label`)
      const zoneName = this._getZoneName(isHeaderActive)
      labelLeft.innerText = `${zoneName} - 第 ${p + 1} 节-`
      toolbar.append(labelLeft)

      // 右侧插入页码按钮
      const btnInsertPageNo = document.createElement('div')
      btnInsertPageNo.classList.add(`${EDITOR_PREFIX}-zone-toolbar-btn`)
      btnInsertPageNo.innerHTML = `<svg viewBox="0 0 1024 1024" width="14" height="14"><path d="M896 896H128V128h576v64H192v640h640V448h64v448z" fill="#0078d4"></path><path d="M640 192h192v64H640zM704 128h64v192h-64z" fill="#0078d4"></path><path d="M352 448h320v64H352zM352 576h256v64H352zM352 320h192v64H352z" fill="#0078d4"></path></svg><span>插入页码</span><svg viewBox="0 0 1024 1024" width="12" height="12"><path d="M512 714.667l-298.667-298.667h597.333z" fill="currentColor"></path></svg>`
      btnInsertPageNo.onclick = (e) => {
        e.stopPropagation()
        this._showPageNumberMenu(btnInsertPageNo)
      }
      toolbar.append(btnInsertPageNo)

      this.indicatorContainer.append(toolbar)

      // 上边线
      const lineTop = document.createElement('span')
      lineTop.classList.add(`${EDITOR_PREFIX}-zone-indicator-border__top`)
      lineTop.style.top = `${indicatorTopY}px`
      lineTop.style.width = `${innerWidth}px`
      lineTop.style.marginLeft = `${margins[3]}px`
      this.indicatorContainer.append(lineTop)

      // 左边线
      const lineLeft = document.createElement('span')
      lineLeft.classList.add(`${EDITOR_PREFIX}-zone-indicator-border__left`)
      lineLeft.style.top = `${startY}px`
      lineLeft.style.height = `${indicatorHeight}px`
      lineLeft.style.left = `${indicatorLeftX}px`
      this.indicatorContainer.append(lineLeft)

      // 下边线
      const lineBottom = document.createElement('span')
      lineBottom.classList.add(`${EDITOR_PREFIX}-zone-indicator-border__bottom`)
      lineBottom.style.top = `${indicatorBottomY}px`
      this.indicatorContainer.append(lineBottom)

      // 右边线
      const lineRight = document.createElement('span')
      lineRight.classList.add(`${EDITOR_PREFIX}-zone-indicator-border__right`)
      lineRight.style.top = `${startY}px`
      lineRight.style.height = `${indicatorHeight}px`
      lineRight.style.left = `${indicatorRightX}px`
      this.indicatorContainer.append(lineRight)
    }
    this.container.append(this.indicatorContainer)
  }

  private _showPageNumberMenu(target: HTMLElement) {
    // 移除已有菜单
    this._hidePageNumberMenu()

    const rect = target.getBoundingClientRect()
    const menu = document.createElement('div')
    menu.classList.add(`${EDITOR_PREFIX}-zone-pagenumber-menu`)
    menu.style.top = `${rect.bottom + 2}px`
    menu.style.left = `${rect.left}px`

    PAGE_NUMBER_STYLES.forEach(item => {
      const menuItem = document.createElement('div')
      menuItem.classList.add(`${EDITOR_PREFIX}-zone-pagenumber-menu-item`)
      menuItem.innerText = item.label
      menuItem.onclick = (e) => {
        e.stopPropagation()
        this._insertPageNumber(item.value, item.numberType)
        this._hidePageNumberMenu()
      }
      menu.append(menuItem)
    })

    document.body.append(menu)
    this.pageNumberMenu = menu

    // 滚动时关闭菜单
    const scrollHandler = () => this._hidePageNumberMenu()
    window.addEventListener('scroll', scrollHandler, true)
    ;(menu as any)._scrollHandler = scrollHandler

    // 点击其他地方关闭菜单
    const closeHandler = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        this._hidePageNumberMenu()
      }
    }
    setTimeout(() => {
      document.addEventListener('click', closeHandler)
    }, 0)
    ;(menu as any)._closeHandler = closeHandler
  }

  private _hidePageNumberMenu() {
    if (this.pageNumberMenu) {
      // 移除滚动监听
      const scrollHandler = (this.pageNumberMenu as any)._scrollHandler
      if (scrollHandler) {
        window.removeEventListener('scroll', scrollHandler, true)
      }
      // 移除点击监听
      const closeHandler = (this.pageNumberMenu as any)._closeHandler
      if (closeHandler) {
        document.removeEventListener('click', closeHandler)
      }
      this.pageNumberMenu.remove()
      this.pageNumberMenu = null
    }
  }

  private _insertPageNumber(format: string, numberType?: any) {
    const options = this.draw.getOptions()
    // 设置页码格式
    options.pageNumber = options.pageNumber || {}
    const pageNumberOptions = options.pageNumber as any
    pageNumberOptions.format = format
    if (numberType) {
      pageNumberOptions.numberType = numberType
    }
    // 重新渲染
    this.draw.render({
      isSubmitHistory: true,
      isSetCursor: false
    })
  }

  private _getZoneName(isHeader: boolean) {
    const key = `frame.${isHeader ? 'header' : 'footer'}`
    const zoneName = this.i18n.t(key)
    if (zoneName && zoneName !== key) {
      return zoneName
    }
    return isHeader ? '页眉' : '页脚'
  }

  private _clearZoneIndicator() {
    this.indicatorContainer?.remove()
    this.indicatorContainer = null
    this._hidePageNumberMenu()
  }
}
