import { ZERO } from '@wanghe1995/docx-editor-schema'
import { ElementType } from '@wanghe1995/docx-editor-schema'
import { IDrawOption } from '@wanghe1995/docx-editor-schema'
import { IElement } from '@wanghe1995/docx-editor-schema'
import { ITextDecoration } from '@wanghe1995/docx-editor-schema'
import { IRichtextOption } from '@wanghe1995/docx-editor-schema'
import { isObjectEqual } from '@wanghe1995/docx-editor-schema'
import { BaseCommandAdapter, IAdapterContext } from './types'

export class TextStyleAdapter extends BaseCommandAdapter {
  constructor(context: IAdapterContext) {
    super(context)
  }

  public font(payload: string, options?: IRichtextOption): void {
    const { isIgnoreDisabledRule = false } = options || {}
    const isDisabled = !isIgnoreDisabledRule && this.isDisabled()
    if (isDisabled) return
    const selection = this.range.getSelectionElementList()
    if (selection?.length) {
      selection.forEach(el => { el.font = payload })
      this.draw.render({ isSetCursor: false })
    } else {
      let isSubmitHistory = true
      const { endIndex } = this.range.getRange()
      const elementList = this.draw.getElementList()
      const enterElement = elementList[endIndex]
      if (enterElement?.value === ZERO) {
        enterElement.font = payload
      } else {
        this.range.setDefaultStyle({ font: payload })
        isSubmitHistory = false
      }
      this.draw.render({ isSubmitHistory, curIndex: endIndex, isCompute: false })
    }
  }

  public size(payload: number, options?: IRichtextOption): void {
    const { isIgnoreDisabledRule = false } = options || {}
    const isDisabled = !isIgnoreDisabledRule && this.isDisabled()
    if (isDisabled) return
    const { minSize, maxSize, defaultSize } = this.options
    if (payload < minSize || payload > maxSize) return
    let renderOption: IDrawOption = {}
    let changeElementList: IElement[] = []
    const selection = this.range.getTextLikeSelectionElementList()
    if (selection?.length) {
      changeElementList = selection
      renderOption = { isSetCursor: false }
    } else {
      const { endIndex } = this.range.getRange()
      const elementList = this.draw.getElementList()
      const enterElement = elementList[endIndex]
      if (enterElement?.value === ZERO) {
        changeElementList.push(enterElement)
        renderOption = { curIndex: endIndex }
      } else {
        this.range.setDefaultStyle({ size: payload })
        this.draw.render({ curIndex: endIndex, isCompute: false, isSubmitHistory: false })
        return
      }
    }
    if (!changeElementList.length) return
    let isExistUpdate = false
    changeElementList.forEach(el => {
      if ((!el.size && payload === defaultSize) || (el.size && el.size === payload)) return
      el.size = payload
      isExistUpdate = true
    })
    if (isExistUpdate) this.draw.render(renderOption)
  }

  public characterScale(payload: number, options?: IRichtextOption): void {
    const { isIgnoreDisabledRule = false } = options || {}
    const isDisabled = !isIgnoreDisabledRule && this.isDisabled()
    if (isDisabled) return
    if (!Number.isFinite(payload)) return
    const nextCharacterScale = Math.round(payload)
    if (nextCharacterScale < 33 || nextCharacterScale > 200) return
    const selection = this.range.getTextLikeSelectionElementList()
    let renderOption: IDrawOption = {}
    let changeElementList: IElement[] = []
    if (selection?.length) {
      changeElementList = selection
      renderOption = { isSetCursor: false }
    } else {
      const { endIndex } = this.range.getRange()
      const elementList = this.draw.getElementList()
      const enterElement = elementList[endIndex]
      if (enterElement?.value === ZERO) {
        changeElementList.push(enterElement)
        renderOption = { curIndex: endIndex }
      } else {
        this.range.setDefaultStyle({
          characterScale: nextCharacterScale === 100 ? undefined : nextCharacterScale
        })
        this.draw.render({ curIndex: endIndex, isCompute: false, isSubmitHistory: false })
        return
      }
    }
    if (!changeElementList.length) return
    let isExistUpdate = false
    changeElementList.forEach(el => {
      const prevCharacterScale = el.characterScale ?? 100
      if (prevCharacterScale === nextCharacterScale) return
      if (nextCharacterScale === 100) {
        delete el.characterScale
      } else {
        el.characterScale = nextCharacterScale
      }
      isExistUpdate = true
    })
    if (isExistUpdate) this.draw.render(renderOption)
  }

  public sizeAdd(options?: IRichtextOption): void {
    const { isIgnoreDisabledRule = false } = options || {}
    if (!isIgnoreDisabledRule && this.isDisabled()) return
    const { defaultSize, maxSize } = this.options
    const selection = this.range.getTextLikeSelectionElementList()
    let renderOption: IDrawOption = {}
    let changeElementList: IElement[] = []
    if (selection?.length) {
      changeElementList = selection
      renderOption = { isSetCursor: false }
    } else {
      const { endIndex } = this.range.getRange()
      const elementList = this.draw.getElementList()
      const enterElement = elementList[endIndex]
      if (enterElement?.value === ZERO) {
        changeElementList.push(enterElement)
        renderOption = { curIndex: endIndex }
      } else {
        const style = this.range.getDefaultStyle()
        const anchorSize = style?.size || enterElement.size || defaultSize
        this.range.setDefaultStyle({ size: anchorSize + 2 > maxSize ? maxSize : anchorSize + 2 })
        this.draw.render({ curIndex: endIndex, isCompute: false, isSubmitHistory: false })
        return
      }
    }
    if (!changeElementList.length) return
    let isExistUpdate = false
    changeElementList.forEach(el => {
      if (!el.size) el.size = defaultSize
      if (el.size >= maxSize) return
      el.size = el.size + 2 > maxSize ? maxSize : el.size + 2
      isExistUpdate = true
    })
    if (isExistUpdate) this.draw.render(renderOption)
  }

  public sizeMinus(options?: IRichtextOption): void {
    const { isIgnoreDisabledRule = false } = options || {}
    if (!isIgnoreDisabledRule && this.isDisabled()) return
    const { defaultSize, minSize } = this.options
    const selection = this.range.getTextLikeSelectionElementList()
    let renderOption: IDrawOption = {}
    let changeElementList: IElement[] = []
    if (selection?.length) {
      changeElementList = selection
      renderOption = { isSetCursor: false }
    } else {
      const { endIndex } = this.range.getRange()
      const elementList = this.draw.getElementList()
      const enterElement = elementList[endIndex]
      if (enterElement?.value === ZERO) {
        changeElementList.push(enterElement)
        renderOption = { curIndex: endIndex }
      } else {
        const style = this.range.getDefaultStyle()
        const anchorSize = style?.size || enterElement.size || defaultSize
        this.range.setDefaultStyle({ size: anchorSize - 2 < minSize ? minSize : anchorSize - 2 })
        this.draw.render({ curIndex: endIndex, isCompute: false, isSubmitHistory: false })
        return
      }
    }
    if (!changeElementList.length) return
    let isExistUpdate = false
    changeElementList.forEach(el => {
      if (!el.size) el.size = defaultSize
      if (el.size <= minSize) return
      el.size = el.size - 2 < minSize ? minSize : el.size - 2
      isExistUpdate = true
    })
    if (isExistUpdate) this.draw.render(renderOption)
  }

  public bold(options?: IRichtextOption): void {
    if (!options?.isIgnoreDisabledRule && this.isDisabled()) return
    const selection = this.range.getSelectionElementList()
    if (selection?.length) {
      const noBoldIndex = selection.findIndex(s => !s.bold)
      selection.forEach(el => { el.bold = !!~noBoldIndex })
      this.draw.render({ isSetCursor: false })
    } else {
      let isSubmitHistory = true
      const { endIndex } = this.range.getRange()
      const elementList = this.draw.getElementList()
      const enterElement = elementList[endIndex]
      if (enterElement?.value === ZERO) {
        enterElement.bold = !enterElement.bold
      } else {
        this.range.setDefaultStyle({ bold: enterElement.bold ? false : !this.range.getDefaultStyle()?.bold })
        isSubmitHistory = false
      }
      this.draw.render({ isSubmitHistory, curIndex: endIndex, isCompute: false })
    }
  }

  public italic(options?: IRichtextOption): void {
    if (!options?.isIgnoreDisabledRule && this.isDisabled()) return
    const selection = this.range.getSelectionElementList()
    if (selection?.length) {
      const noItalicIndex = selection.findIndex(s => !s.italic)
      selection.forEach(el => { el.italic = !!~noItalicIndex })
      this.draw.render({ isSetCursor: false })
    } else {
      let isSubmitHistory = true
      const { endIndex } = this.range.getRange()
      const elementList = this.draw.getElementList()
      const enterElement = elementList[endIndex]
      if (enterElement?.value === ZERO) {
        enterElement.italic = !enterElement.italic
      } else {
        this.range.setDefaultStyle({ italic: enterElement.italic ? false : !this.range.getDefaultStyle()?.italic })
        isSubmitHistory = false
      }
      this.draw.render({ isSubmitHistory, curIndex: endIndex, isCompute: false })
    }
  }

  public underline(textDecoration?: ITextDecoration, options?: IRichtextOption): void {
    if (!options?.isIgnoreDisabledRule && this.isDisabled()) return
    const selection = this.range.getSelectionElementList()
    if (selection?.length) {
      const isSetUnderline = selection.some(
        s => !s.underline || (!textDecoration && s.textDecoration) || (textDecoration && !s.textDecoration) || (textDecoration && s.textDecoration && !isObjectEqual(s.textDecoration, textDecoration))
      )
      selection.forEach(el => {
        el.underline = isSetUnderline
        if (isSetUnderline && textDecoration) { el.textDecoration = textDecoration } else { delete el.textDecoration }
      })
      this.draw.render({ isSetCursor: false, isCompute: false })
    } else {
      let isSubmitHistory = true
      const { endIndex } = this.range.getRange()
      const elementList = this.draw.getElementList()
      const enterElement = elementList[endIndex]
      if (enterElement?.value === ZERO) {
        enterElement.underline = !enterElement.underline
      } else {
        this.range.setDefaultStyle({ underline: enterElement?.underline ? false : !this.range.getDefaultStyle()?.underline })
        isSubmitHistory = false
      }
      this.draw.render({ isSubmitHistory, curIndex: endIndex, isCompute: false })
    }
  }

  public strikeout(options?: IRichtextOption): void {
    if (!options?.isIgnoreDisabledRule && this.isDisabled()) return
    const selection = this.range.getSelectionElementList()
    if (selection?.length) {
      const noStrikeoutIndex = selection.findIndex(s => !s.strikeout)
      selection.forEach(el => { el.strikeout = !!~noStrikeoutIndex })
      this.draw.render({ isSetCursor: false, isCompute: false })
    } else {
      let isSubmitHistory = true
      const { endIndex } = this.range.getRange()
      const elementList = this.draw.getElementList()
      const enterElement = elementList[endIndex]
      if (enterElement?.value === ZERO) {
        enterElement.strikeout = !enterElement.strikeout
      } else {
        this.range.setDefaultStyle({ strikeout: enterElement.strikeout ? false : !this.range.getDefaultStyle()?.strikeout })
        isSubmitHistory = false
      }
      this.draw.render({ isSubmitHistory, curIndex: endIndex, isCompute: false })
    }
  }

  public superscript(options?: IRichtextOption): void {
    if (!options?.isIgnoreDisabledRule && this.isDisabled()) return
    const selection = this.range.getSelectionElementList()
    if (!selection) return
    const superscriptIndex = selection.findIndex(s => s.type === ElementType.SUPERSCRIPT)
    selection.forEach(el => {
      if (~superscriptIndex) {
        if (el.type === ElementType.SUPERSCRIPT) { el.type = ElementType.TEXT; delete el.actualSize }
      } else {
        if (!el.type || el.type === ElementType.TEXT || el.type === ElementType.SUBSCRIPT) { el.type = ElementType.SUPERSCRIPT }
      }
    })
    this.draw.render({ isSetCursor: false })
  }

  public subscript(options?: IRichtextOption): void {
    if (!options?.isIgnoreDisabledRule && this.isDisabled()) return
    const selection = this.range.getSelectionElementList()
    if (!selection) return
    const subscriptIndex = selection.findIndex(s => s.type === ElementType.SUBSCRIPT)
    selection.forEach(el => {
      if (~subscriptIndex) {
        if (el.type === ElementType.SUBSCRIPT) { el.type = ElementType.TEXT; delete el.actualSize }
      } else {
        if (!el.type || el.type === ElementType.TEXT || el.type === ElementType.SUPERSCRIPT) { el.type = ElementType.SUBSCRIPT }
      }
    })
    this.draw.render({ isSetCursor: false })
  }

  public color(payload: string | null, options?: IRichtextOption): void {
    if (!options?.isIgnoreDisabledRule && this.isDisabled()) return
    const selection = this.range.getSelectionElementList()
    if (selection?.length) {
      selection.forEach(el => { if (payload) { el.color = payload } else { delete el.color } })
      this.draw.render({ isSetCursor: false, isCompute: false })
    } else {
      let isSubmitHistory = true
      const { endIndex } = this.range.getRange()
      const elementList = this.draw.getElementList()
      const enterElement = elementList[endIndex]
      if (enterElement?.value === ZERO) {
        if (payload) { enterElement.color = payload } else { delete enterElement.color }
      } else {
        this.range.setDefaultStyle({ color: payload || undefined })
        isSubmitHistory = false
      }
      this.draw.render({ isSubmitHistory, curIndex: endIndex, isCompute: false })
    }
  }

  public highlight(payload: string | null, options?: IRichtextOption): void {
    if (!options?.isIgnoreDisabledRule && this.isDisabled()) return
    const selection = this.range.getSelectionElementList()
    if (selection?.length) {
      selection.forEach(el => { if (payload) { el.highlight = payload } else { delete el.highlight } })
      this.draw.render({ isSetCursor: false, isCompute: false })
    } else {
      let isSubmitHistory = true
      const { endIndex } = this.range.getRange()
      const elementList = this.draw.getElementList()
      const enterElement = elementList[endIndex]
      if (enterElement?.value === ZERO) {
        if (payload) { enterElement.highlight = payload } else { delete enterElement.highlight }
      } else {
        this.range.setDefaultStyle({ highlight: payload || undefined })
        isSubmitHistory = false
      }
      this.draw.render({ isSubmitHistory, curIndex: endIndex, isCompute: false })
    }
  }

  public paragraphColor(payload: string | null): void {
    if (this.isDisabled()) return
    const { startIndex, endIndex } = this.range.getRange()
    if (startIndex < 0 || endIndex < 0) return
    const rowElementList = this.range.getRangeRowElementList()
    if (!rowElementList) return
    rowElementList.forEach(element => {
      if (payload) { element.paragraphColor = payload } else { delete element.paragraphColor }
    })
    const isSetCursor = startIndex === endIndex
    const curIndex = isSetCursor ? endIndex : startIndex
    this.draw.render({ curIndex, isSetCursor })
  }
}
