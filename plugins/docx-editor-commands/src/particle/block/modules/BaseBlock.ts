import { EDITOR_PREFIX } from '@vervedoc/docx-editor-schema'
import { BlockType } from '@vervedoc/docx-editor-schema'
import { IRowElement } from '@vervedoc/docx-editor-schema'
import { Draw } from '@vervedoc/docx-editor-view'
import { BlockParticle } from '../BlockParticle'
import { IFrameBlock } from './IFrameBlock'
import { VideoBlock } from './VideoBlock'
import { AudioBlock } from './AudioBlock'
import { ChartBlock } from './ChartBlock'

export class BaseBlock {
  private draw: Draw
  private element: IRowElement
  private block: IFrameBlock | VideoBlock | AudioBlock | ChartBlock | null
  private blockContainer: HTMLDivElement
  private blockItem: HTMLDivElement

  constructor(blockParticle: BlockParticle, element: IRowElement) {
    this.draw = blockParticle.getDraw()
    this.blockContainer = blockParticle.getBlockContainer()
    this.element = element
    this.block = null
    this.blockItem = this._createBlockItem()
    this.blockContainer.append(this.blockItem)
  }

  public getBlockElement(): IRowElement {
    return this.element
  }

  private _createBlockItem(): HTMLDivElement {
    const blockItem = document.createElement('div')
    blockItem.classList.add(`${EDITOR_PREFIX}-block-item`)
    return blockItem
  }

  public render() {
    const block = this.element.block!
    if (block.type === BlockType.IFRAME) {
      this.block = new IFrameBlock(this.element)
      this.block.render(this.blockItem)
    } else if (block.type === BlockType.VIDEO) {
      this.block = new VideoBlock(this.element)
      this.block.render(this.blockItem)
    } else if (block.type === BlockType.AUDIO) {
      this.block = new AudioBlock(this.element)
      this.block.render(this.blockItem)
    } else if (block.type === BlockType.CHART) {
      this.block = new ChartBlock(this.element, this.draw)
      this.block.render(this.blockItem)
    }
  }

  public setClientRects(pageNo: number, x: number, y: number) {
    const height = this.draw.getHeight()
    const pageGap = this.draw.getPageGap()
    const preY = pageNo * (height + pageGap)
    // 尺寸
    const { metrics } = this.element
    this.blockItem.style.width = `${metrics.width}px`
    this.blockItem.style.height = `${metrics.height}px`
    // 位置
    this.blockItem.style.left = `${x}px`
    this.blockItem.style.top = `${preY + y}px`
  }

  public remove() {
    // 销毁 block 资源
    if (this.block && 'destroy' in this.block) {
      this.block.destroy()
    }
    this.blockItem.remove()
  }
}
