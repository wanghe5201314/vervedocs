import { EDITOR_COMPONENT, EDITOR_FONT_OPTIONS, EDITOR_PREFIX, EDITOR_SIZE_OPTIONS } from '@wanghe1995/docx-editor-schema'
import { EditorComponent } from '@wanghe1995/docx-editor-schema'
import { ElementType } from '@wanghe1995/docx-editor-schema'
import { ImageDisplay } from '@wanghe1995/docx-editor-schema'
import { RowFlex } from '@wanghe1995/docx-editor-schema'
import { DeepRequired } from '@wanghe1995/docx-editor-schema'
import { IEditorOption } from '@wanghe1995/docx-editor-schema'
import { IElement } from '@wanghe1995/docx-editor-schema'
import { findParent } from '@wanghe1995/docx-editor-schema'
import { Command } from '@wanghe1995/docx-editor-transform'
import { Draw } from '../draw/Draw'
import { RangeManager } from '@wanghe1995/docx-editor-state'

interface IFloatingBarContext {
  hasSelection: boolean
  isImageSelected: boolean
  imageElement: IElement | null
}

export class FloatingBar {
  private draw: Draw
  private command: Command
  private range: RangeManager
  private options: DeepRequired<IEditorOption>
  private container: HTMLDivElement
  
  private textToolbar: HTMLDivElement | null = null
  private imageToolbar: HTMLDivElement | null = null
  
  private lastMousePosition = { x: 0, y: 0 }
  private currentImageElement: IElement | null = null

  constructor(draw: Draw, command: Command) {
    this.draw = draw
    this.command = command
    this.range = draw.getRange()
    this.options = draw.getOptions()
    this.container = draw.getContainer()
    
    if (this.options.floatingBar?.enabled !== false) {
      this._createToolbars()
      this._addEvents()
    }
  }

  private _createToolbars() {
    // 文字工具栏
    this.textToolbar = document.createElement('div')
    this.textToolbar.className = `${EDITOR_PREFIX}-floating-toolbar`
    this.textToolbar.setAttribute(EDITOR_COMPONENT, EditorComponent.COMPONENT)
    this.textToolbar.innerHTML = `
      <select class="fb-select fb-fontfamily" title="字体">
        ${this._createFontOptionsHtml()}
      </select>
      <select class="fb-select fb-fontsize" title="字号">
        ${this._createSizeOptionsHtml()}
      </select>
      <div class="fb-divider"></div>
      <button class="fb-btn" data-action="bold" title="加粗">
        <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/></svg>
      </button>
      <button class="fb-btn" data-action="italic" title="斜体">
        <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/></svg>
      </button>
      <button class="fb-btn" data-action="underline" title="下划线">
        <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z"/></svg>
      </button>
      <div class="fb-divider"></div>
      <div class="fb-color-picker" data-type="color">
        <button class="fb-btn fb-color-btn" title="文字颜色">
          <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M11 2L5.5 16h2.25l1.12-3h6.25l1.12 3h2.25L13 2h-2zm-1.38 9L12 4.67 14.38 11H9.62z"/></svg>
          <span class="fb-color-indicator" style="background:#000000"></span>
        </button>
        <input type="color" class="fb-color-input" value="#000000">
      </div>
      <div class="fb-color-picker" data-type="highlight">
        <button class="fb-btn fb-color-btn" title="高亮颜色">
          <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M6 14l3 3v5h6v-5l3-3V9H6v5zm5-12h2v3h-2V2zM3.5 5.88l1.41-1.41 2.12 2.12L5.62 8 3.5 5.88zm13.46.71l2.12-2.12 1.41 1.41L18.38 8l-1.42-1.41z"/></svg>
          <span class="fb-color-indicator" style="background:#ffff00"></span>
        </button>
        <input type="color" class="fb-color-input" value="#ffff00">
      </div>
      <div class="fb-divider"></div>
      <button class="fb-btn" data-action="alignLeft" title="左对齐">
        <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z"/></svg>
      </button>
      <button class="fb-btn" data-action="alignCenter" title="居中">
        <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z"/></svg>
      </button>
      <button class="fb-btn" data-action="alignRight" title="右对齐">
        <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z"/></svg>
      </button>
    `
    this.container.appendChild(this.textToolbar)
    
    // 图片工具栏
    this.imageToolbar = document.createElement('div')
    this.imageToolbar.className = `${EDITOR_PREFIX}-floating-toolbar ${EDITOR_PREFIX}-image-toolbar`
    this.imageToolbar.setAttribute(EDITOR_COMPONENT, EditorComponent.COMPONENT)
    this.imageToolbar.innerHTML = `
      <span class="fb-label">环绕</span>
      <button class="fb-btn" data-action="imgInline" data-display="INLINE" title="嵌入文字">
        <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M4 9h16v2H4V9zm0 4h10v2H4v-2z"/></svg>
      </button>
      <button class="fb-btn" data-action="imgSurround" data-display="SURROUND" title="文字环绕">
        <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M4 19h16v2H4v-2zm0-4h4v2H4v-2zm0-4h4v2H4v-2zm0-4h4v2H4V7zm0-4h16v2H4V3zm12 4h4v6h-4V7zm-2 10h8v2h-8v-2z"/></svg>
      </button>
      <button class="fb-btn" data-action="imgFloatTop" data-display="FLOAT_TOP" title="浮于文字上方">
        <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M3 5h2V3c-1.1 0-2 .9-2 2zm0 8h2v-2H3v2zm4 8h2v-2H7v2zM3 9h2V7H3v2zm10-6h-2v2h2V3zm6 0v2h2c0-1.1-.9-2-2-2zM5 21v-2H3c0 1.1.9 2 2 2zm-2-4h2v-2H3v2zM9 3H7v2h2V3zm2 18h2v-2h-2v2zm8-8h2v-2h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2zm0-12h2V7h-2v2zm0 8h2v-2h-2v2zm-4 4h2v-2h-2v2zm0-16h2V3h-2v2zM7 17h10V7H7v10z"/></svg>
      </button>
      <button class="fb-btn" data-action="imgFloatBottom" data-display="FLOAT_BOTTOM" title="衬于文字下方">
        <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M3 5h2V3c-1.1 0-2 .9-2 2zm0 8h2v-2H3v2zm4 8h2v-2H7v2zM3 9h2V7H3v2zm10-6h-2v2h2V3zm6 0v2h2c0-1.1-.9-2-2-2zM5 21v-2H3c0 1.1.9 2 2 2zm-2-4h2v-2H3v2zM9 3H7v2h2V3zm2 18h2v-2h-2v2zm8-8h2v-2h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2zm0-12h2V7h-2v2zm0 8h2v-2h-2v2zm-4 4h2v-2h-2v2zm0-16h2V3h-2v2z"/></svg>
      </button>
      <div class="fb-divider"></div>
      <button class="fb-btn" data-action="rotateLeft" title="向左旋转">
        <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M7.11 8.53L5.7 7.11C4.8 8.27 4.24 9.61 4.07 11h2.02c.14-.87.49-1.72 1.02-2.47zM6.09 13H4.07c.17 1.39.72 2.73 1.62 3.89l1.41-1.42c-.52-.75-.87-1.59-1.01-2.47zm1.01 5.32c1.16.9 2.51 1.44 3.9 1.61V17.9c-.87-.15-1.71-.49-2.46-1.03L7.1 18.32zM13 4.07V1L8.45 5.55 13 10V6.09c2.84.48 5 2.94 5 5.91s-2.16 5.43-5 5.91v2.02c3.95-.49 7-3.85 7-7.93s-3.05-7.44-7-7.93z"/></svg>
      </button>
      <button class="fb-btn" data-action="rotateRight" title="向右旋转">
        <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M15.55 5.55L11 1v3.07C7.06 4.56 4 7.92 4 12s3.05 7.44 7 7.93v-2.02c-2.84-.48-5-2.94-5-5.91s2.16-5.43 5-5.91V10l4.55-4.45zM19.93 11c-.17-1.39-.72-2.73-1.62-3.89l-1.42 1.42c.54.75.88 1.6 1.02 2.47h2.02zM13 17.9v2.02c1.39-.17 2.74-.71 3.9-1.61l-1.44-1.44c-.75.54-1.59.89-2.46 1.03zm3.89-2.42l1.42 1.41c.9-1.16 1.45-2.5 1.62-3.89h-2.02c-.14.87-.48 1.72-1.02 2.48z"/></svg>
      </button>
      <div class="fb-divider"></div>
      <button class="fb-btn" data-action="replaceImage" title="替换图片">
        <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
      </button>
      <button class="fb-btn" data-action="saveImage" title="保存图片">
        <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
      </button>
      <button class="fb-btn" data-action="deleteImage" title="删除">
        <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
      </button>
    `
    this.container.appendChild(this.imageToolbar)
    
    // 绑定事件
    this._bindToolbarEvents()
  }

  private _bindToolbarEvents() {
    // 文字工具栏事件
    if (this.textToolbar) {
      // 字体选择
      const fontFamilySelect = this.textToolbar.querySelector('.fb-fontfamily') as HTMLSelectElement
      fontFamilySelect.value = this._resolveFontValue(this.options.defaultFont)
      fontFamilySelect?.addEventListener('change', () => {
        this.command.executeFont(fontFamilySelect.value)
      })

      // 字号选择
      const fontSizeSelect = this.textToolbar.querySelector('.fb-fontsize') as HTMLSelectElement
      fontSizeSelect.value = this._resolveSizeValue(this.options.defaultSize)
      fontSizeSelect?.addEventListener('change', () => {
        this.command.executeSize(Number(fontSizeSelect.value))
      })
      
      // 按钮点击
      this.textToolbar.querySelectorAll('.fb-btn:not(.fb-color-btn)').forEach(btn => {
        btn.addEventListener('click', () => {
          const action = btn.getAttribute('data-action')
          this._executeTextAction(action)
        })
      })
      
      // 颜色选择器
      this.textToolbar.querySelectorAll('.fb-color-picker').forEach(picker => {
        const type = picker.getAttribute('data-type')
        const btn = picker.querySelector('.fb-color-btn') as HTMLButtonElement
        const input = picker.querySelector('.fb-color-input') as HTMLInputElement
        const indicator = picker.querySelector('.fb-color-indicator') as HTMLSpanElement
        
        // 点击按钮触发颜色选择器
        btn?.addEventListener('click', () => {
          input?.click()
        })
        
        // 颜色选择实时应用
        input?.addEventListener('input', () => {
          const value = input.value
          if (value) {
            if (type === 'color') {
              this.command.executeColor(value)
            } else if (type === 'highlight') {
              this.command.executeHighlight(value)
            }
            if (indicator) {
              indicator.style.background = value
            }
          }
        })
      })
    }
    
    // 图片工具栏事件
    if (this.imageToolbar) {
      this.imageToolbar.querySelectorAll('.fb-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const action = btn.getAttribute('data-action')
          this._executeImageAction(action)
        })
      })
    }
  }

  private _createFontOptionsHtml() {
    const defaultFont = this.options.defaultFont?.trim()
    const hasDefaultFont = defaultFont && EDITOR_FONT_OPTIONS.some(
      option => option.value === defaultFont || option.label === defaultFont
    )
    const fontOptions = hasDefaultFont
      ? [...EDITOR_FONT_OPTIONS]
      : [
        ...EDITOR_FONT_OPTIONS,
        {
          label: defaultFont || '',
          value: defaultFont || ''
        }
      ].filter(option => option.label && option.value)

    return fontOptions
      .map(option => `<option value="${option.value}" style="font-family:${option.value}">${option.label}</option>`)
      .join('')
  }

  private _createSizeOptionsHtml() {
    const defaultSize = this.options.defaultSize
    const hasDefaultSize = EDITOR_SIZE_OPTIONS.some(option => option.value === defaultSize)
    const sizeOptions = hasDefaultSize
      ? [...EDITOR_SIZE_OPTIONS]
      : [
        ...EDITOR_SIZE_OPTIONS,
        {
          label: String(defaultSize),
          value: defaultSize
        }
      ]

    return sizeOptions
      .map(option => `<option value="${option.value}">${option.label}</option>`)
      .join('')
  }

  private _resolveFontValue(font: string) {
    const normalizedFont = font.trim().toLowerCase()
    const match = EDITOR_FONT_OPTIONS.find(option => {
      const optionValue = option.value.trim().toLowerCase()
      const optionLabel = option.label.trim().toLowerCase()
      const primaryFamily = option.value
        .split(',')
        .map(item => item.replace(/['"]/g, '').trim().toLowerCase())
        .find(Boolean)

      return optionValue === normalizedFont
        || optionLabel === normalizedFont
        || primaryFamily === normalizedFont
    })

    return match?.value || font
  }

  private _resolveSizeValue(size: number) {
    const normalizedSize = Number(size)
    const match = EDITOR_SIZE_OPTIONS.find(option => option.value === normalizedSize)
    return String(match?.value ?? normalizedSize)
  }

  private _executeTextAction(action: string | null) {
    if (!action) return
    switch (action) {
      case 'bold':
        this.command.executeBold()
        break
      case 'italic':
        this.command.executeItalic()
        break
      case 'underline':
        this.command.executeUnderline()
        break
      case 'alignLeft':
        this.command.executeRowFlex(RowFlex.LEFT)
        break
      case 'alignCenter':
        this.command.executeRowFlex(RowFlex.CENTER)
        break
      case 'alignRight':
        this.command.executeRowFlex(RowFlex.RIGHT)
        break
    }
  }

  private _executeImageAction(action: string | null) {
    if (!action || !this.currentImageElement) return
    
    switch (action) {
      case 'imgInline':
        this.command.executeChangeImageDisplay(this.currentImageElement, ImageDisplay.INLINE)
        this._updateImageToolbarState()
        break
      case 'imgSurround':
        this.command.executeChangeImageDisplay(this.currentImageElement, ImageDisplay.SURROUND)
        this._updateImageToolbarState()
        break
      case 'imgFloatTop':
        this.command.executeChangeImageDisplay(this.currentImageElement, ImageDisplay.FLOAT_TOP)
        this._updateImageToolbarState()
        break
      case 'imgFloatBottom':
        this.command.executeChangeImageDisplay(this.currentImageElement, ImageDisplay.FLOAT_BOTTOM)
        this._updateImageToolbarState()
        break
      case 'rotateLeft':
        this._rotateImage(-90)
        break
      case 'rotateRight':
        this._rotateImage(90)
        break
      case 'replaceImage':
        this._replaceImage()
        break
      case 'saveImage':
        this.command.executeSaveAsImageElement()
        break
      case 'deleteImage':
        this.command.executeBackspace()
        this.dispose()
        break
    }
  }

  private _rotateImage(angle: number) {
    if (!this.currentImageElement) return
    const currentValue = this.currentImageElement.value
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      
      // 90度旋转时交换宽高
      if (Math.abs(angle) === 90) {
        canvas.width = img.height
        canvas.height = img.width
      } else {
        canvas.width = img.width
        canvas.height = img.height
      }
      
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate(angle * Math.PI / 180)
      ctx.drawImage(img, -img.width / 2, -img.height / 2)
      
      const newDataUrl = canvas.toDataURL()
      this.command.executeReplaceImageElement(newDataUrl)
      
      // 旋转后重新获取图片元素引用以支持连续旋转
      setTimeout(() => {
        const context = this._getContext()
        if (context.isImageSelected && context.imageElement) {
          this.currentImageElement = context.imageElement
        }
      }, 50)
    }
    img.src = currentValue
  }

  private _replaceImage() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (event) => {
          this.command.executeReplaceImageElement(event.target?.result as string)
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }

  private _updateImageToolbarState() {
    if (!this.imageToolbar || !this.currentImageElement) return
    
    const displayBtns = this.imageToolbar.querySelectorAll('[data-display]')
    displayBtns.forEach(btn => {
      const display = btn.getAttribute('data-display')
      const imgDisplay = this.currentImageElement?.imgDisplay || ImageDisplay.INLINE
      if (display && ImageDisplay[display as keyof typeof ImageDisplay] === imgDisplay) {
        btn.classList.add('active')
      } else {
        btn.classList.remove('active')
      }
    })
  }

  private _addEvents() {
    const pageContainer = this.draw.getPageContainer()
    
    // 监听鼠标抬起
    pageContainer.addEventListener('mouseup', this._handleMouseUp)
    
    // 监听点击外部隐藏
    document.addEventListener('mousedown', this._handleClickOutside)
    
    // 禁用右键菜单
    pageContainer.addEventListener('contextmenu', this._handleContextMenu)
  }

  private _handleMouseUp = (e: MouseEvent) => {
    this.lastMousePosition = { x: e.clientX, y: e.clientY }
    
    setTimeout(() => {
      const context = this._getContext()
      
      if (context.isImageSelected && context.imageElement) {
        this.currentImageElement = context.imageElement
        this._hideTextToolbar()
        this._showImageToolbar()
        this._updateImageToolbarState()
      } else if (context.hasSelection) {
        this.currentImageElement = null
        this._hideImageToolbar()
        this._showTextToolbar()
      } else {
        this.currentImageElement = null
        this._hideTextToolbar()
        this._hideImageToolbar()
      }
    }, 10)
  }

  private _handleClickOutside = (e: MouseEvent) => {
    const target = e.target as Element
    const isInToolbar = findParent(
      target,
      (node: Node & Element) => 
        node?.classList?.contains(`${EDITOR_PREFIX}-floating-toolbar`),
      true
    )
    const isInContainer = this.container.contains(target)
    
    if (!isInToolbar && !isInContainer) {
      this.dispose()
    }
  }

  private _handleContextMenu = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  private _getContext(): IFloatingBarContext {
    const range = this.range.getRange()
    const hasSelection = range.startIndex !== range.endIndex && range.startIndex >= 0
    
    const elementList = this.draw.getElementList()
    const startElement = elementList[range.startIndex]
    const endElement = elementList[range.endIndex]
    
    const isImageSelected = 
      (startElement?.type === ElementType.IMAGE) ||
      (endElement?.type === ElementType.IMAGE)
    
    const imageElement = isImageSelected
      ? (startElement?.type === ElementType.IMAGE ? startElement : endElement)
      : null
    
    return { hasSelection, isImageSelected, imageElement }
  }

  private _showTextToolbar() {
    if (!this.textToolbar) return
    this.textToolbar.classList.add('show')
    this._positionToolbar(this.textToolbar)
  }

  private _hideTextToolbar() {
    this.textToolbar?.classList.remove('show')
  }

  private _showImageToolbar() {
    if (!this.imageToolbar) return
    this.imageToolbar.classList.add('show')
    this._positionToolbar(this.imageToolbar)
  }

  private _hideImageToolbar() {
    this.imageToolbar?.classList.remove('show')
    this.currentImageElement = null
  }

  private _positionToolbar(toolbar: HTMLDivElement) {
    const rect = toolbar.getBoundingClientRect()
    const width = rect.width || 400
    const height = rect.height || 40
    
    let left = this.lastMousePosition.x - width / 2
    let top = this.lastMousePosition.y - height - 10
    
    // 边界检查
    if (left < 10) left = 10
    if (left + width > window.innerWidth - 10) {
      left = window.innerWidth - width - 10
    }
    if (top < 10) {
      top = this.lastMousePosition.y + 20
    }
    
    toolbar.style.left = `${left}px`
    toolbar.style.top = `${top}px`
  }

  public removeEvent() {
    const pageContainer = this.draw.getPageContainer()
    pageContainer.removeEventListener('mouseup', this._handleMouseUp)
    document.removeEventListener('mousedown', this._handleClickOutside)
    pageContainer.removeEventListener('contextmenu', this._handleContextMenu)
  }

  public dispose() {
    this._hideTextToolbar()
    this._hideImageToolbar()
  }

  public destroy() {
    this.removeEvent()
    this.textToolbar?.remove()
    this.imageToolbar?.remove()
  }
}
