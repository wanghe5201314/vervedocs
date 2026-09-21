import { EDITOR_PREFIX, BlockType } from './constants'
import type { IBlockElement } from './constants'
import type { IElement } from '@vervedoc/docx-editor-schema'
import { BlockParticle } from './block-particle'
import { IFrameBlock } from './block-iframe'

/** 嵌入块基类，根据块类型分发到具体实现（iframe） */
export class BaseBlock {
  /** 关联的块元素 */
  private element: IElement
  /** 具体块实现实例 */
  private block: IFrameBlock | null
  /** 块容器 */
  private blockContainer: HTMLDivElement
  /** 当前块项 DOM */
  private blockItem: HTMLDivElement

  constructor(blockParticle: BlockParticle, element: IElement) {
    this.blockContainer = blockParticle.getBlockContainer()
    this.element = element
    this.block = null
    this.blockItem = this._createBlockItem()
    this.blockContainer.append(this.blockItem)
  }

  public getBlockElement(): IElement {
    return this.element
  }

  private _createBlockItem(): HTMLDivElement {
    const blockItem = document.createElement('div')
    blockItem.classList.add(`${EDITOR_PREFIX}-block-item`)
    return blockItem
  }

  public render() {
    const el = this.element as IBlockElement
    const block = el.block
    if (!block) return
    if (block.type === BlockType.IFRAME) {
      this.block = new IFrameBlock(el)
      this.block.render(this.blockItem)
    }
  }

  public setClientRects(_pageNo: number, x: number, y: number) {
    const metrics = (this.element as IBlockElement).metrics
    if (metrics) {
      this.blockItem.style.width = `${metrics.width}px`
      this.blockItem.style.height = `${metrics.height}px`
    }
    this.blockItem.style.position = 'absolute'
    this.blockItem.style.left = `${x}px`
    this.blockItem.style.top = `${y}px`
  }

  public remove() {

    this.blockItem.remove()
  }
}
