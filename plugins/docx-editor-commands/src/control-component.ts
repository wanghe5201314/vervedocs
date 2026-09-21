import type { IElement } from '@vervedoc/docx-editor-schema'
import { walkTree } from '@vervedoc/docx-editor-schema'
import type { Draw } from '@vervedoc/docx-editor-view'
import { EDITOR_PREFIX } from './constants'

/**
 * 控件组件（checkbox / radio / text / select / date / number）挂载骨架。
 *
 * verve view 未提供 Control 系列类，此处提供统一挂载框架：
 * - install 时获取容器
 * - clear 在每帧渲染后清理已从文档中删除的控件 DOM
 * - render 在控件元素需要渲染时创建对应 DOM（具体控件 UI 待实现）
 */
export class ControlComponent {
  private draw: Draw | null = null
  private container: HTMLDivElement | null = null
  private controlMap: Map<string, HTMLElement> = new Map()

  public install(draw: Draw): this {
    this.draw = draw
    this.container = draw.getContainer()
    this._createControlContainer()
    return this
  }

  private _createControlContainer(): HTMLDivElement {
    const controlContainer = document.createElement('div')
    controlContainer.classList.add(`${EDITOR_PREFIX}-control-container`)
    controlContainer.style.position = 'absolute'
    controlContainer.style.inset = '0'
    controlContainer.style.pointerEvents = 'auto'
    this.container?.append(controlContainer)
    return controlContainer
  }

  /**
   * 渲染单个控件元素（具体控件 UI 待实现）。
   * 由外部渲染流程在遇到 control 类型元素时调用。
   */
  public render(element: IElement, x: number, y: number): void {
    if (!this.draw) return
    const id = (element as { id?: string }).id
    if (!id) return
    // TODO: 根据 element.type（checkbox/radio/text/select/date/number）创建对应控件 DOM
    void x
    void y
  }

  /** 每帧渲染后清理已从文档中删除的控件 DOM */
  public clear(): void {
    if (!this.controlMap.size || !this.draw) return
    const elementList = this.draw.getElementList()
    const controlIds: string[] = []
    walkTree(elementList, (node) => {
      if (node.type === 'control') {
        const id = (node as { id?: string }).id
        if (id) controlIds.push(id)
      }
    })
    this.controlMap.forEach((el, id) => {
      if (!controlIds.includes(id)) {
        el.remove()
        this.controlMap.delete(id)
      }
    })
  }

  public destroy(): void {
    this.controlMap.forEach(el => el.remove())
    this.controlMap.clear()
    this.draw = null
    this.container = null
  }
}
