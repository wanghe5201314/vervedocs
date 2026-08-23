import {
  IControlHighlight,
  IControlHighlightRule
} from '@vervedoc/docx-editor-schema'
import { IElement } from '@vervedoc/docx-editor-schema'
import { ISearchResult } from '@vervedoc/docx-editor-schema'
import { Control } from './control'

type IHighlightMatchResult = (ISearchResult & IControlHighlightRule)[]

export class ControlSearch {
  private highlightList: IControlHighlight[]
  private highlightMatchResult: IHighlightMatchResult

  constructor(_control: Control) {
    this.highlightList = []
    this.highlightMatchResult = []
  }

  // 获取控件设置高亮信息
  public getControlHighlight(_elementList: IElement[], _index: number) {
    return ''
  }

  public getHighlightMatchResult(): IHighlightMatchResult {
    return this.highlightMatchResult
  }

  public getHighlightList(): IControlHighlight[] {
    return this.highlightList
  }

  public setHighlightList(payload: IControlHighlight[]) {
    this.highlightList = payload
  }

  public computeHighlightList() {}

  public renderHighlightList(
    _ctx: CanvasRenderingContext2D,
    _pageIndex: number
  ) {}
}
