import {
  IGetControlValueOption,
  IGetControlValueResult,
  ILocationControlOption,
  IRemoveControlOption,
  ISetControlExtensionOption,
  ISetControlHighlightOption,
  ISetControlProperties,
  ISetControlValueOption
} from '@wanghe1995/docx-editor-schema'
import { IElement } from '@wanghe1995/docx-editor-schema'
import { EditorZone } from '@wanghe1995/docx-editor-schema'
import { ControlComponent } from '@wanghe1995/docx-editor-schema'
import { LocationPosition } from '@wanghe1995/docx-editor-schema'
import { ILocationPosition } from '@wanghe1995/docx-editor-schema'
import { isTableElement } from '@wanghe1995/docx-editor-schema'
import { BaseCommandAdapter, IAdapterContext } from './types'

export class ControlAdapter extends BaseCommandAdapter {
  constructor(context: IAdapterContext) {
    super(context)
  }

  public getControlValue(payload: IGetControlValueOption): IGetControlValueResult | null {
    return this.draw.getControl().getValueById(payload)
  }

  public setControlValue(payload: ISetControlValueOption): void {
    if (this.isDisabled()) return
    this.draw.getControl().setValueListById([payload])
  }

  public setControlValueList(payload: ISetControlValueOption[]): void {
    if (this.isDisabled()) return
    this.draw.getControl().setValueListById(payload)
  }

  public setControlExtension(payload: ISetControlExtensionOption): void {
    if (this.isDisabled()) return
    this.draw.getControl().setExtensionListById([payload])
  }

  public setControlExtensionList(payload: ISetControlExtensionOption[]): void {
    if (this.isDisabled()) return
    this.draw.getControl().setExtensionListById(payload)
  }

  public setControlProperties(payload: ISetControlProperties): void {
    if (this.isDisabled()) return
    this.draw.getControl().setPropertiesListById([payload])
  }

  public setControlPropertiesList(payload: ISetControlProperties[]): void {
    if (this.isDisabled()) return
    this.draw.getControl().setPropertiesListById(payload)
  }

  public setControlHighlight(payload: ISetControlHighlightOption): void {
    this.draw.getControl().setHighlightList(payload)
    this.draw.render({ isSubmitHistory: false })
  }

  public getControlList(): IElement[] {
    return this.draw.getControl().getList()
  }

  public removeControl(payload?: IRemoveControlOption): void {
    if (this.isDisabled()) return
    if (payload?.id || payload?.conceptId) {
      const { id, conceptId } = payload
      let isExistRemove = false
      const remove = (elementList: IElement[]) => {
        const indicesToRemove: number[] = []
        for (let i = 0; i < elementList.length; i++) {
          const element = elementList[i]
          if (isTableElement(element)) {
            const trList = element.trList!
            for (let r = 0; r < trList.length; r++) {
              for (let d = 0; d < trList[r].tdList.length; d++) {
                remove(trList[r].tdList[d].value)
              }
            }
          }
          if (
            element.control &&
            !(id && element.controlId !== id) &&
            !(conceptId && element.control.conceptId !== conceptId)
          ) {
            indicesToRemove.push(i)
          }
        }
        if (indicesToRemove.length) {
          isExistRemove = true
          indicesToRemove.sort((a, b) => b - a)
          for (const idx of indicesToRemove) {
            elementList.splice(idx, 1)
          }
        }
      }
      const data = [
        this.draw.getHeaderElementList(),
        this.draw.getOriginalMainElementList(),
        this.draw.getFooterElementList()
      ]
      for (const elementList of data) {
        remove(elementList)
      }
      if (isExistRemove) {
        this.draw.render({ isSetCursor: false })
      }
    } else {
      const { startIndex, endIndex } = this.range.getRange()
      if (startIndex !== endIndex) return
      const elementList = this.draw.getElementList()
      const element = elementList[startIndex]
      if (!element.controlId) return
      const control = this.draw.getControl()
      const newIndex = control.removeControl(startIndex)
      if (newIndex === null) return
      this.range.setRange(newIndex, newIndex)
      this.draw.render({ curIndex: newIndex })
    }
  }

  public locationControl(controlId: string, options?: ILocationControlOption): void {
    function location(
      elementList: IElement[],
      zone: EditorZone
    ): ILocationPosition | null {
      let i = 0
      while (i < elementList.length) {
        const element = elementList[i]
        i++
        if (isTableElement(element)) {
          const trList = element.trList!
          for (let r = 0; r < trList.length; r++) {
            for (let d = 0; d < trList[r].tdList.length; d++) {
              const locationContext = location(trList[r].tdList[d].value, zone)
              if (locationContext) {
                return {
                  ...locationContext,
                  positionContext: {
                    isTable: true,
                    index: i - 1,
                    trIndex: r,
                    tdIndex: d,
                    tdId: element.tdId,
                    trId: element.trId,
                    tableId: element.tableId
                  }
                }
              }
            }
          }
        }
        if (element?.controlId !== controlId) continue
        let curIndex = i - 1
        if (options?.position === LocationPosition.OUTER_AFTER) {
          if (
            !(
              element.controlComponent === ControlComponent.POSTFIX &&
              elementList[i + 1]?.controlComponent !== ControlComponent.POST_TEXT
            )
          ) { continue }
        } else if (options?.position === LocationPosition.OUTER_BEFORE) {
          curIndex -= 1
        } else if (options?.position === LocationPosition.AFTER) {
          curIndex -= 1
          if (
            element.controlComponent !== ControlComponent.PLACEHOLDER &&
            element.controlComponent !== ControlComponent.POSTFIX &&
            element.controlComponent !== ControlComponent.POST_TEXT
          ) { continue }
        } else {
          if (
            (element.controlComponent !== ControlComponent.PREFIX &&
              element.controlComponent !== ControlComponent.PRE_TEXT) ||
            elementList[i]?.controlComponent === ControlComponent.PREFIX ||
            elementList[i]?.controlComponent === ControlComponent.PRE_TEXT
          ) { continue }
        }
        return {
          zone,
          range: { startIndex: curIndex, endIndex: curIndex },
          positionContext: { isTable: false }
        }
      }
      return null
    }
    const data = [
      { zone: EditorZone.HEADER, elementList: this.draw.getHeaderElementList() },
      { zone: EditorZone.MAIN, elementList: this.draw.getOriginalMainElementList() },
      { zone: EditorZone.FOOTER, elementList: this.draw.getFooterElementList() }
    ]
    for (const context of data) {
      const locationContext = location(context.elementList, context.zone)
      if (locationContext) {
        const base = this as any
        base.setZone(locationContext.zone)
        this.position.setPositionContext(locationContext.positionContext)
        this.range.replaceRange(locationContext.range)
        this.draw.render({
          curIndex: locationContext.range.startIndex,
          isCompute: false,
          isSubmitHistory: false
        })
        break
      }
    }
  }
}
