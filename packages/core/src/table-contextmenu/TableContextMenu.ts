import { EDITOR_PREFIX, RowFlex, TableBorder, TdBorder, TdSlash, VerticalAlign } from '@vervedoc/docx-editor-schema'
import type { IElement, ITd } from '@vervedoc/docx-editor-schema'
import type { Draw } from '@vervedoc/docx-editor-view'
import Picker from 'vanilla-picker'

interface IMenuItem {
  label?: string
  icon?: string
  title?: string
  shortcut?: string
  disabled?: boolean
  children?: IMenuItem[]
  childrenLayout?: 'default' | 'icon-grid'
  action?: (anchorElement?: HTMLElement) => void
  closeOnClick?: boolean
  divider?: boolean
  danger?: boolean
  active?: boolean
  iconOnly?: boolean
  inputType?: 'number'
  inputDefault?: number
  inputMin?: number
  inputMax?: number
  inputStep?: number
  inputAction?: (value: number) => void
  unit?: string
  previewColor?: string
}

const createIcon = (content: string) => `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">${content}</svg>`

const createCellAlignIcon = (
  horizontal: 'left' | 'center' | 'right',
  vertical: 'top' | 'middle' | 'bottom'
) => {
  const lineWidth = horizontal === 'center' ? 5.5 : 4
  const x =
    horizontal === 'left'
      ? 5
      : horizontal === 'center'
        ? 9 - lineWidth / 2
        : 13 - lineWidth
  const y = vertical === 'top' ? 5.2 : vertical === 'middle' ? 9 : 12.8

  return createIcon(`
    <rect x="3.25" y="3.25" width="11.5" height="11.5" stroke="currentColor" stroke-width="1.1"/>
    <path d="M${x} ${y}H${x + lineWidth}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  `)
}

const ICONS = {
  tableBorder: createIcon(`
    <rect x="2.75" y="2.75" width="12.5" height="12.5" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
    <path d="M9 2.75V15.25M2.75 9H15.25" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
  `),
  borderAll: createIcon(`
    <rect x="2.75" y="2.75" width="12.5" height="12.5" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
    <path d="M9 2.75V15.25M2.75 9H15.25" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
  `),
  borderExternal: createIcon(`
    <rect x="2.75" y="2.75" width="12.5" height="12.5" rx="1.5" stroke="currentColor" stroke-width="1.4"/>
  `),
  borderInternal: createIcon(`
    <path d="M9 2.75V15.25M2.75 9H15.25" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
    <rect x="2.75" y="2.75" width="12.5" height="12.5" rx="1.5" stroke="currentColor" stroke-width="0.8" stroke-dasharray="2 2" opacity="0.45"/>
  `),
  borderDash: createIcon(`
    <rect x="2.75" y="2.75" width="12.5" height="12.5" rx="1.5" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 2"/>
    <path d="M9 2.75V15.25M2.75 9H15.25" stroke="currentColor" stroke-width="1.1" stroke-dasharray="2 2" stroke-linecap="round"/>
  `),
  borderNone: createIcon(`
    <rect x="2.75" y="2.75" width="12.5" height="12.5" rx="1.5" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 2"/>
    <path d="M4 4L14 14" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
  `),
  borderColor: createIcon(`
    <path d="M4 12L9.5 6.5L12 9L6.5 14.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M10.8 5.2L12.8 3.2L14.8 5.2L12.8 7.2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M4 15H14" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
  `),
  borderWidth: createIcon(`
    <path d="M4 5H14" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M4 9H14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M4 13H14" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
  `),
  cellAlign: createCellAlignIcon('center', 'middle'),
  alignTopLeft: createCellAlignIcon('left', 'top'),
  alignTopCenter: createCellAlignIcon('center', 'top'),
  alignTopRight: createCellAlignIcon('right', 'top'),
  alignMiddleLeft: createCellAlignIcon('left', 'middle'),
  alignMiddleCenter: createCellAlignIcon('center', 'middle'),
  alignMiddleRight: createCellAlignIcon('right', 'middle'),
  alignBottomLeft: createCellAlignIcon('left', 'bottom'),
  alignBottomCenter: createCellAlignIcon('center', 'bottom'),
  alignBottomRight: createCellAlignIcon('right', 'bottom'),
  insert: createIcon(`
    <rect x="2.75" y="2.75" width="12.5" height="12.5" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
    <path d="M9 5.25V12.75M5.25 9H12.75" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
  `),
  insertColLeft: createIcon(`
    <rect x="6.2" y="2.75" width="8.05" height="12.5" rx="1.2" stroke="currentColor" stroke-width="1.2"/>
    <path d="M2.8 9H6.2M4.5 7.3V10.7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
  `),
  insertColRight: createIcon(`
    <rect x="2.75" y="2.75" width="8.05" height="12.5" rx="1.2" stroke="currentColor" stroke-width="1.2"/>
    <path d="M11.8 9H15.2M13.5 7.3V10.7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
  `),
  insertRowAbove: createIcon(`
    <rect x="2.75" y="6.2" width="12.5" height="8.05" rx="1.2" stroke="currentColor" stroke-width="1.2"/>
    <path d="M9 2.8V6.2M7.3 4.5H10.7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
  `),
  insertRowBelow: createIcon(`
    <rect x="2.75" y="2.75" width="12.5" height="8.05" rx="1.2" stroke="currentColor" stroke-width="1.2"/>
    <path d="M9 11.8V15.2M7.3 13.5H10.7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
  `),
  delete: createIcon(`
    <path d="M5 5L13 13M13 5L5 13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
  `),
  deleteRow: createIcon(`
    <rect x="2.75" y="2.75" width="12.5" height="12.5" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
    <path d="M5 9H13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
  `),
  deleteTable: createIcon(`
    <rect x="2.75" y="2.75" width="12.5" height="12.5" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
    <path d="M5 5L13 13M13 5L5 13" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
  `),
  cancelMerge: createIcon(`
    <rect x="3" y="4" width="5" height="10" rx="1" stroke="currentColor" stroke-width="1.2"/>
    <rect x="10" y="4" width="5" height="10" rx="1" stroke="currentColor" stroke-width="1.2"/>
    <path d="M8.5 9H9.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
  `),
  merge: createIcon(`
    <rect x="3" y="4" width="5" height="10" rx="1" stroke="currentColor" stroke-width="1.2"/>
    <rect x="10" y="4" width="5" height="10" rx="1" stroke="currentColor" stroke-width="1.2"/>
    <path d="M7.5 9H10.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
  `),
  split: createIcon(`
    <rect x="3" y="4" width="12" height="10" rx="1.4" stroke="currentColor" stroke-width="1.2"/>
    <path d="M9 4V14" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
  `),
  selectAll: createIcon(`
    <rect x="2.75" y="2.75" width="12.5" height="12.5" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
    <rect x="5" y="5" width="2.8" height="2.8" fill="currentColor" opacity="0.5"/>
    <rect x="10.2" y="5" width="2.8" height="2.8" fill="currentColor" opacity="0.5"/>
    <rect x="5" y="10.2" width="2.8" height="2.8" fill="currentColor" opacity="0.5"/>
    <rect x="10.2" y="10.2" width="2.8" height="2.8" fill="currentColor" opacity="0.5"/>
  `),
  backgroundColor: createIcon(`
    <rect x="3" y="3" width="12" height="12" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
    <rect x="5.5" y="5.5" width="7" height="7" rx="1" fill="currentColor" opacity="0.35"/>
  `),
  cellBorder: createIcon(`
    <rect x="3" y="3" width="12" height="12" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
    <path d="M6 6H12M6 9H12M6 12H12" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
  `),
  slash: createIcon(`
    <rect x="3" y="3" width="12" height="12" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
    <path d="M5 13L13 5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
  `)
}

export class TableContextMenu {
  private draw: Draw
  private menuElement: HTMLDivElement | null = null
  private _removeContextmenuHandler: (() => void) | null = null
  private subMenuElement: HTMLDivElement | null = null
  private _hideSubMenuTimer: number | null = null
  private activeColorPanel: HTMLDivElement | null = null
  private activePicker: Picker | null = null

  constructor(draw: Draw) {
    this.draw = draw
  }

  public show(x: number, y: number, element: IElement) {
    this.close()
    const menuItems = this._buildMenuItems(element)
    this.menuElement = this._createMenuElement(menuItems, x, y)
    document.body.appendChild(this.menuElement)
    this._bindGlobalEvents()
  }

  public close() {
    this._destroyActiveColorPanel()
    if (this.menuElement) {
      this.menuElement.remove()
      this.menuElement = null
    }
    if (this.subMenuElement) {
      this.subMenuElement.remove()
      this.subMenuElement = null
    }
    if (this._removeContextmenuHandler) {
      this._removeContextmenuHandler()
      this._removeContextmenuHandler = null
    }
  }

  private _buildMenuItems(element: IElement): IMenuItem[] {
    const currentTd = this._getCurrentTd(element)
    const borderColor = element.borderColor || this._getDefaultBorderColor()
    const borderWidth = Number(element.borderWidth ?? 0.5)
    const borderExternalWidth = Number(element.borderExternalWidth ?? 0)
    const backgroundColor = currentTd?.backgroundColor || '#ffffff'
    const isCrossRowCol = !!this.draw.getRange().getRange().isCrossRowCol
    const canCancelMerge = this._canCancelMerge(currentTd)

    return [
      {
        label: '表格边框',
        icon: ICONS.tableBorder,
        children: [
          {
            label: '全部边框',
            icon: ICONS.borderAll,
            active: (element.borderType || TableBorder.ALL) === TableBorder.ALL,
            action: () => this._setBorderType(TableBorder.ALL)
          },
          {
            label: '外侧边框',
            icon: ICONS.borderExternal,
            active: element.borderType === TableBorder.EXTERNAL,
            action: () => this._setBorderType(TableBorder.EXTERNAL)
          },
          {
            label: '内部边框',
            icon: ICONS.borderInternal,
            active: element.borderType === TableBorder.INTERNAL,
            action: () => this._setBorderType(TableBorder.INTERNAL)
          },
          {
            label: '虚线边框',
            icon: ICONS.borderDash,
            active: element.borderType === TableBorder.DASH,
            action: () => this._setBorderType(TableBorder.DASH)
          },
          {
            label: '无边框',
            icon: ICONS.borderNone,
            active: element.borderType === TableBorder.EMPTY,
            action: () => this._setBorderType(TableBorder.EMPTY)
          },
          {
            divider: true
          },
          {
            label: '边框颜色',
            icon: ICONS.borderColor,
            previewColor: borderColor,
            closeOnClick: false,
            action: (anchorElement) => this._showBorderColorPicker(borderColor, anchorElement)
          },
          {
            label: '边框宽度',
            icon: ICONS.borderWidth,
            inputType: 'number',
            inputDefault: borderWidth,
            inputMin: 0,
            inputMax: 12,
            inputStep: 0.5,
            inputAction: (value) => this._setBorderWidth(value)
          },
          {
            label: '外边框宽度',
            icon: ICONS.borderExternal,
            inputType: 'number',
            inputDefault: borderExternalWidth,
            inputMin: 0,
            inputMax: 12,
            inputStep: 0.5,
            inputAction: (value) => this._setBorderExternalWidth(value)
          }
        ]
      },
      {
        label: '单元格对齐方式',
        icon: ICONS.cellAlign,
        childrenLayout: 'icon-grid',
        children: [
          {
            title: '左上对齐',
            icon: ICONS.alignTopLeft,
            iconOnly: true,
            active: this._isCellAlignActive(currentTd, VerticalAlign.TOP, RowFlex.LEFT),
            action: () => this._setCellAlign(VerticalAlign.TOP, RowFlex.LEFT)
          },
          {
            title: '中上对齐',
            icon: ICONS.alignTopCenter,
            iconOnly: true,
            active: this._isCellAlignActive(currentTd, VerticalAlign.TOP, RowFlex.CENTER),
            action: () => this._setCellAlign(VerticalAlign.TOP, RowFlex.CENTER)
          },
          {
            title: '右上对齐',
            icon: ICONS.alignTopRight,
            iconOnly: true,
            active: this._isCellAlignActive(currentTd, VerticalAlign.TOP, RowFlex.RIGHT),
            action: () => this._setCellAlign(VerticalAlign.TOP, RowFlex.RIGHT)
          },
          {
            title: '左中对齐',
            icon: ICONS.alignMiddleLeft,
            iconOnly: true,
            active: this._isCellAlignActive(currentTd, VerticalAlign.MIDDLE, RowFlex.LEFT),
            action: () => this._setCellAlign(VerticalAlign.MIDDLE, RowFlex.LEFT)
          },
          {
            title: '居中对齐',
            icon: ICONS.alignMiddleCenter,
            iconOnly: true,
            active: this._isCellAlignActive(currentTd, VerticalAlign.MIDDLE, RowFlex.CENTER),
            action: () => this._setCellAlign(VerticalAlign.MIDDLE, RowFlex.CENTER)
          },
          {
            title: '右中对齐',
            icon: ICONS.alignMiddleRight,
            iconOnly: true,
            active: this._isCellAlignActive(currentTd, VerticalAlign.MIDDLE, RowFlex.RIGHT),
            action: () => this._setCellAlign(VerticalAlign.MIDDLE, RowFlex.RIGHT)
          },
          {
            title: '左下对齐',
            icon: ICONS.alignBottomLeft,
            iconOnly: true,
            active: this._isCellAlignActive(currentTd, VerticalAlign.BOTTOM, RowFlex.LEFT),
            action: () => this._setCellAlign(VerticalAlign.BOTTOM, RowFlex.LEFT)
          },
          {
            title: '中下对齐',
            icon: ICONS.alignBottomCenter,
            iconOnly: true,
            active: this._isCellAlignActive(currentTd, VerticalAlign.BOTTOM, RowFlex.CENTER),
            action: () => this._setCellAlign(VerticalAlign.BOTTOM, RowFlex.CENTER)
          },
          {
            title: '右下对齐',
            icon: ICONS.alignBottomRight,
            iconOnly: true,
            active: this._isCellAlignActive(currentTd, VerticalAlign.BOTTOM, RowFlex.RIGHT),
            action: () => this._setCellAlign(VerticalAlign.BOTTOM, RowFlex.RIGHT)
          }
        ]
      },
      {
        label: '插入行列',
        icon: ICONS.insert,
        children: [
          {
            label: '在左侧插入',
            icon: ICONS.insertColLeft,
            inputType: 'number',
            inputDefault: 1,
            inputMin: 1,
            inputMax: 100,
            inputStep: 1,
            inputAction: (count) => this._repeatAction(count, () => {
              this.draw.getTableOperate().insertTableLeftCol()
            }),
            unit: '列'
          },
          {
            label: '在右侧插入',
            icon: ICONS.insertColRight,
            inputType: 'number',
            inputDefault: 1,
            inputMin: 1,
            inputMax: 100,
            inputStep: 1,
            inputAction: (count) => this._repeatAction(count, () => {
              this.draw.getTableOperate().insertTableRightCol()
            }),
            unit: '列'
          },
          {
            label: '在上方插入',
            icon: ICONS.insertRowAbove,
            inputType: 'number',
            inputDefault: 1,
            inputMin: 1,
            inputMax: 100,
            inputStep: 1,
            inputAction: (count) => this._repeatAction(count, () => {
              this.draw.getTableOperate().insertTableTopRow()
            }),
            unit: '行'
          },
          {
            label: '在下方插入',
            icon: ICONS.insertRowBelow,
            inputType: 'number',
            inputDefault: 1,
            inputMin: 1,
            inputMax: 100,
            inputStep: 1,
            inputAction: (count) => this._repeatAction(count, () => {
              this.draw.getTableOperate().insertTableBottomRow()
            }),
            unit: '行'
          }
        ]
      },
      {
        label: '删除行列',
        icon: ICONS.delete,
        children: [
          {
            label: '删除当前行',
            icon: ICONS.deleteRow,
            action: () => this._deleteRow()
          },
          {
            label: '删除当前列',
            icon: ICONS.deleteRow,
            action: () => this._deleteColumn()
          },
          {
            label: '删除表格',
            icon: ICONS.deleteTable,
            danger: true,
            action: () => this._deleteTable()
          }
        ]
      },
      {
        label: '取消合并',
        icon: ICONS.cancelMerge,
        disabled: !canCancelMerge,
        action: () => this._cancelMergeTableCell()
      },
      {
        divider: true
      },
      {
        label: '合并单元格',
        icon: ICONS.merge,
        disabled: !isCrossRowCol,
        action: () => this._mergeTableCell()
      },
      {
        label: '拆分单元格',
        icon: ICONS.split,
        children: [
          {
            label: '左右拆分',
            icon: ICONS.split,
            action: () => this._splitVerticalTableCell()
          },
          {
            label: '上下拆分',
            icon: ICONS.split,
            action: () => this._splitHorizontalTableCell()
          }
        ]
      },
      {
        label: '单元格边框',
        icon: ICONS.cellBorder,
        children: [
          {
            label: '上边框',
            icon: ICONS.cellBorder,
            action: () => this._toggleTdBorderType(TdBorder.TOP)
          },
          {
            label: '右边框',
            icon: ICONS.cellBorder,
            action: () => this._toggleTdBorderType(TdBorder.RIGHT)
          },
          {
            label: '下边框',
            icon: ICONS.cellBorder,
            action: () => this._toggleTdBorderType(TdBorder.BOTTOM)
          },
          {
            label: '左边框',
            icon: ICONS.cellBorder,
            action: () => this._toggleTdBorderType(TdBorder.LEFT)
          }
        ]
      },
      {
        label: '斜线样式',
        icon: ICONS.slash,
        children: [
          {
            label: '正斜线',
            icon: ICONS.slash,
            action: () => this._toggleTdSlashType(TdSlash.FORWARD)
          },
          {
            label: '反斜线',
            icon: ICONS.slash,
            action: () => this._toggleTdSlashType(TdSlash.BACK)
          }
        ]
      },
      {
        label: '单元格底纹',
        icon: ICONS.backgroundColor,
        previewColor: backgroundColor,
        closeOnClick: false,
        action: (anchorElement) => this._showBackgroundColorPicker(backgroundColor, anchorElement)
      },
      {
        divider: true
      },
      {
        label: '全选表格',
        icon: ICONS.selectAll,
        action: () => this._selectAllTable()
      }
    ]
  }

  private _createMenuElement(items: IMenuItem[], x: number, y: number): HTMLDivElement {
    const menu = document.createElement('div')
    menu.classList.add(`${EDITOR_PREFIX}-table-context-menu`)

    items.forEach(item => {
      if (item.divider) {
        const divider = document.createElement('div')
        divider.classList.add(`${EDITOR_PREFIX}-table-context-menu__divider`)
        menu.appendChild(divider)
      } else {
        const menuItem = this._createMenuItem(item)
        menu.appendChild(menuItem)
      }
    })

    menu.style.left = `${x}px`
    menu.style.top = `${y}px`

    const rect = menu.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    if (x + rect.width > viewportWidth) {
      menu.style.left = `${viewportWidth - rect.width - 10}px`
    }
    if (y + rect.height > viewportHeight) {
      menu.style.top = `${viewportHeight - rect.height - 10}px`
    }

    return menu
  }

  private _createMenuItem(item: IMenuItem): HTMLDivElement {
    const menuItem = document.createElement('div')
    menuItem.classList.add(`${EDITOR_PREFIX}-table-context-menu__item`)
    if (item.iconOnly) {
      menuItem.classList.add(`${EDITOR_PREFIX}-table-context-menu__item--icon-only`)
    }
    if (item.title || item.label) {
      menuItem.title = item.title || item.label || ''
    }

    if (item.disabled) {
      menuItem.classList.add('disabled')
    }
    if (item.danger) {
      menuItem.classList.add('danger')
    }
    if (item.active) {
      menuItem.classList.add('active')
    }

    const main = document.createElement('div')
    main.classList.add(`${EDITOR_PREFIX}-table-context-menu__main`)
    menuItem.appendChild(main)

    const meta = document.createElement('div')
    meta.classList.add(`${EDITOR_PREFIX}-table-context-menu__meta`)
    menuItem.appendChild(meta)

    if (item.icon) {
      const iconSpan = document.createElement('span')
      iconSpan.classList.add(`${EDITOR_PREFIX}-table-context-menu__icon`)
      iconSpan.innerHTML = item.icon
      main.appendChild(iconSpan)
    }

    if (item.label && !item.iconOnly) {
      const labelSpan = document.createElement('span')
      labelSpan.classList.add(`${EDITOR_PREFIX}-table-context-menu__label`)
      labelSpan.textContent = item.label
      main.appendChild(labelSpan)
    }

    if (item.inputType === 'number') {
      const input = document.createElement('input')
      input.type = 'number'
      input.min = String(item.inputMin ?? 1)
      input.max = String(item.inputMax ?? 100)
      input.step = String(item.inputStep ?? 1)
      input.value = String(item.inputDefault || 1)
      input.classList.add(`${EDITOR_PREFIX}-table-context-menu__input-number`)

      input.addEventListener('click', (evt) => evt.stopPropagation())
      input.addEventListener('mousedown', (evt) => evt.stopPropagation())
      meta.appendChild(input)

      if (item.unit) {
        const unitSpan = document.createElement('span')
        unitSpan.classList.add(`${EDITOR_PREFIX}-table-context-menu__unit`)
        unitSpan.textContent = item.unit
        meta.appendChild(unitSpan)
      }

      if (item.inputAction) {
        menuItem.addEventListener('click', (evt) => {
          const value = Number.parseFloat(input.value)
          evt.stopPropagation()
          item.inputAction!(Number.isFinite(value) ? value : item.inputDefault || 1)
          this.close()
        })
      }
    } else {
      if (item.previewColor) {
        const preview = document.createElement('span')
        preview.classList.add(`${EDITOR_PREFIX}-table-context-menu__color-preview`)
        preview.style.backgroundColor = item.previewColor
        meta.appendChild(preview)
      }

      if (item.shortcut) {
        const shortcut = document.createElement('span')
        shortcut.classList.add(`${EDITOR_PREFIX}-table-context-menu__shortcut`)
        shortcut.textContent = item.shortcut
        meta.appendChild(shortcut)
      }

      if (item.children && item.children.length > 0) {
        const arrow = document.createElement('span')
        arrow.classList.add(`${EDITOR_PREFIX}-table-context-menu__arrow`)
        arrow.textContent = '>'
        meta.appendChild(arrow)

        menuItem.addEventListener('mouseenter', (evt) => {
          if (this._hideSubMenuTimer) {
            clearTimeout(this._hideSubMenuTimer)
            this._hideSubMenuTimer = null
          }
          this._showSubMenu(
            evt.currentTarget as HTMLDivElement,
            item.children!,
            item.childrenLayout || 'default'
          )
        })
        menuItem.addEventListener('mouseleave', () => {
          this._delayHideSubMenu()
        })
      }

      if (item.action && !item.disabled) {
        menuItem.addEventListener('click', (evt) => {
          evt.stopPropagation()
          item.action!(menuItem)
          if (item.closeOnClick !== false) {
            this.close()
          }
        })
      }
    }

    return menuItem
  }

  private _showSubMenu(parentItem: HTMLDivElement, children: IMenuItem[], layout: 'default' | 'icon-grid' = 'default') {
    this._hideSubMenu()

    const subMenu = document.createElement('div')
    subMenu.classList.add(`${EDITOR_PREFIX}-table-context-menu`)
    subMenu.classList.add(`${EDITOR_PREFIX}-table-context-menu--sub`)
    if (layout === 'icon-grid') {
      subMenu.classList.add(`${EDITOR_PREFIX}-table-context-menu--icon-grid`)
    }

    children.forEach(child => {
      if (child.divider) {
        const divider = document.createElement('div')
        divider.classList.add(`${EDITOR_PREFIX}-table-context-menu__divider`)
        subMenu.appendChild(divider)
      } else {
        const childItem = this._createMenuItem(child)
        subMenu.appendChild(childItem)
      }
    })

    const parentRect = parentItem.getBoundingClientRect()
    const subMenuGap = 5

    let x = parentRect.right + subMenuGap
    let y = parentRect.top

    document.body.appendChild(subMenu)
    const subRect = subMenu.getBoundingClientRect()

    if (x + subRect.width > window.innerWidth) {
      x = parentRect.left - subRect.width - subMenuGap
    }

    if (y + subRect.height > window.innerHeight) {
      y = window.innerHeight - subRect.height - 10
    }

    subMenu.style.left = `${x}px`
    subMenu.style.top = `${y}px`

    subMenu.addEventListener('mouseenter', () => {
      if (this._hideSubMenuTimer) {
        clearTimeout(this._hideSubMenuTimer)
        this._hideSubMenuTimer = null
      }
    })
    subMenu.addEventListener('mouseleave', () => {
      this._delayHideSubMenu()
    })

    this.subMenuElement = subMenu
  }

  private _delayHideSubMenu() {
    if (this._hideSubMenuTimer) {
      clearTimeout(this._hideSubMenuTimer)
    }
    this._hideSubMenuTimer = window.setTimeout(() => {
      this._hideSubMenu()
      this._hideSubMenuTimer = null
    }, 150)
  }

  private _hideSubMenu() {
    if (this._hideSubMenuTimer) {
      clearTimeout(this._hideSubMenuTimer)
      this._hideSubMenuTimer = null
    }
    if (this.subMenuElement) {
      this.subMenuElement.remove()
      this.subMenuElement = null
    }
  }

  private _bindGlobalEvents() {
    const clickHandler = (evt: MouseEvent) => {
      const target = evt.target as Node
      const isMenuTarget =
        !!this.menuElement?.contains(target) ||
        !!this.subMenuElement?.contains(target) ||
        !!this.activeColorPanel?.contains(target)
      if (!isMenuTarget) {
        this.close()
      }
    }

    const keyHandler = (evt: KeyboardEvent) => {
      if (evt.key === 'Escape') {
        this.close()
      }
    }

    const scrollHandler = () => {
      this.close()
    }

    document.addEventListener('click', clickHandler)
    document.addEventListener('keydown', keyHandler)
    window.addEventListener('scroll', scrollHandler, true)
    window.addEventListener('resize', scrollHandler)

    this._removeContextmenuHandler = () => {
      document.removeEventListener('click', clickHandler)
      document.removeEventListener('keydown', keyHandler)
      window.removeEventListener('scroll', scrollHandler, true)
      window.removeEventListener('resize', scrollHandler)
    }
  }

  private _repeatAction(count: number, action: () => void) {
    const times = Math.max(1, Math.floor(count))
    for (let i = 0; i < times; i++) {
      action()
    }
  }

  private _getCurrentTd(element: IElement): ITd | null {
    const positionContext = this.draw.getPosition().getPositionContext()
    if (
      !positionContext.isTable ||
      positionContext.trIndex === undefined ||
      positionContext.tdIndex === undefined
    ) {
      return null
    }
    return (
      element.trList?.[positionContext.trIndex]?.tdList[positionContext.tdIndex] || null
    )
  }

  private _canCancelMerge(td: ITd | null) {
    if (!td) return false
    return td.rowspan > 1 || td.colspan > 1
  }

  private _getDefaultBorderColor() {
    return this.draw.getOptions().table.defaultBorderColor
  }

  private _deleteTable() {
    this.draw.getTableOperate().deleteTable()
  }

  private _deleteRow() {
    this.draw.getTableOperate().deleteTableRow()
  }

  private _deleteColumn() {
    this.draw.getTableOperate().deleteTableCol()
  }

  private _selectAllTable() {
    this.draw.getTableOperate().tableSelectAll()
  }

  private _setBorderType(borderType: TableBorder) {
    this.draw.getTableOperate().tableBorderType(borderType)
  }

  private _setBorderWidth(value: number) {
    this.draw.getTableOperate().tableBorderWidth(value)
  }

  private _setBorderExternalWidth(value: number) {
    this.draw.getTableOperate().tableBorderExternalWidth(value)
  }

  private _isCellAlignActive(td: ITd | null, verticalAlign: VerticalAlign, rowFlex: RowFlex) {
    const currentVerticalAlign = td?.verticalAlign || VerticalAlign.TOP
    const currentHorizontalAlign = this._getTdRowFlex(td)
    return currentVerticalAlign === verticalAlign && currentHorizontalAlign === rowFlex
  }

  private _getTdRowFlex(td: ITd | null) {
    const rowFlex = td?.value.find(item => item.rowFlex)?.rowFlex
    return rowFlex || RowFlex.LEFT
  }

  private _getSelectedTds() {
    const rowCol = this.draw.getTableParticle().getRangeRowCol()
    if (!rowCol) return []
    const selectedTds: ITd[] = []
    const seen = new Set<string>()

    for (let r = 0; r < rowCol.length; r++) {
      const row = rowCol[r]
      for (let c = 0; c < row.length; c++) {
        const td = row[c]
        if (!td) continue
        const tdKey = td.id || `${td.rowIndex}-${td.colIndex}-${td.trIndex}-${td.tdIndex}`
        if (seen.has(tdKey)) continue
        seen.add(tdKey)
        selectedTds.push(td)
      }
    }

    return selectedTds
  }

  private _setCellAlign(verticalAlign: VerticalAlign, rowFlex: RowFlex) {
    const selectedTds = this._getSelectedTds()
    if (!selectedTds.length) return

    let hasChanged = false
    for (let i = 0; i < selectedTds.length; i++) {
      const td = selectedTds[i]
      const currentVerticalAlign = td.verticalAlign || VerticalAlign.TOP
      if (currentVerticalAlign !== verticalAlign) {
        td.verticalAlign = verticalAlign
        hasChanged = true
      }

      for (let j = 0; j < td.value.length; j++) {
        const element = td.value[j]
        const currentRowFlex = element.rowFlex || RowFlex.LEFT
        if (currentRowFlex === rowFlex) continue
        if (rowFlex === RowFlex.LEFT) {
          delete element.rowFlex
        } else {
          element.rowFlex = rowFlex
        }
        hasChanged = true
      }
    }

    if (!hasChanged) return
    const { endIndex } = this.draw.getRange().getRange()
    this.draw.render({
      curIndex: endIndex
    })
  }

  private _toggleTdBorderType(borderType: TdBorder) {
    this.draw.getTableOperate().tableTdBorderType(borderType)
  }

  private _toggleTdSlashType(slashType: TdSlash) {
    this.draw.getTableOperate().tableTdSlashType(slashType)
  }

  private _mergeTableCell() {
    this.draw.getTableOperate().mergeTableCell()
  }

  private _cancelMergeTableCell() {
    this.draw.getTableOperate().cancelMergeTableCell()
  }

  private _splitVerticalTableCell() {
    this.draw.getTableOperate().splitVerticalTableCell()
  }

  private _splitHorizontalTableCell() {
    this.draw.getTableOperate().splitHorizontalTableCell()
  }

  private _showBorderColorPicker(currentColor: string, anchorElement?: HTMLElement) {
    this._showColorPanel(currentColor, anchorElement, (nextColor) => {
      this.draw.getTableOperate().tableBorderColor(nextColor)
    })
  }

  private _showBackgroundColorPicker(currentColor: string, anchorElement?: HTMLElement) {
    this._showColorPanel(currentColor, anchorElement, (nextColor) => {
      this.draw.getTableOperate().tableTdBackgroundColor(nextColor)
    })
  }

  private _showColorPanel(
    currentColor: string,
    anchorElement: HTMLElement | undefined,
    onApply: (color: string) => void
  ) {
    this._destroyActiveColorPanel()

    const normalizedColor = this._normalizeColorValue(currentColor)
    const panel = document.createElement('div')
    panel.classList.add(`${EDITOR_PREFIX}-table-context-menu__color-panel`)

    const pickerHost = document.createElement('div')
    pickerHost.classList.add(`${EDITOR_PREFIX}-table-context-menu__picker-host`)
    panel.appendChild(pickerHost)
    document.body.appendChild(panel)
    this.activeColorPanel = panel
    this._positionColorPanel(panel, anchorElement)

    const picker = new Picker({
      parent: pickerHost,
      popup: false,
      color: normalizedColor,
      editor: true,
      editorFormat: 'hex',
      cancelButton: false,
      onChange: (color) => {
        onApply(color.hex)
      },
      onDone: () => {
        this.close()
      },
      onClose: () => {
        this.close()
      }
    })
    this.activePicker = picker

    const doneButton = pickerHost.querySelector('.picker_done button')
    if (doneButton) {
      doneButton.textContent = '确认'
    }
  }

  private _destroyActiveColorPanel() {
    if (this.activePicker) {
      const picker = this.activePicker
      this.activePicker = null
      picker.destroy()
    }
    if (this.activeColorPanel) {
      this.activeColorPanel.remove()
      this.activeColorPanel = null
    }
  }

  private _positionColorPanel(panel: HTMLDivElement, anchorElement?: HTMLElement) {
    const anchor = anchorElement || this.subMenuElement || this.menuElement
    if (!anchor) return

    const gap = 8
    const margin = 8
    const anchorRect = anchor.getBoundingClientRect()
    const panelRect = panel.getBoundingClientRect()

    let left = anchorRect.right + gap
    let top = anchorRect.top

    if (left + panelRect.width > window.innerWidth - margin) {
      left = anchorRect.left - panelRect.width - gap
    }
    if (left < margin) {
      left = Math.max(margin, window.innerWidth - panelRect.width - margin)
    }

    if (top + panelRect.height > window.innerHeight - margin) {
      top = window.innerHeight - panelRect.height - margin
    }
    if (top < margin) {
      top = margin
    }

    panel.style.left = `${left}px`
    panel.style.top = `${top}px`
  }

  private _normalizeColorValue(color: string, fallback = true) {
    const trimmed = color.trim()
    const normalized = trimmed.startsWith('#') ? trimmed : `#${trimmed}`
    if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
      return normalized
    }
    return fallback ? '#000000' : ''
  }
}
