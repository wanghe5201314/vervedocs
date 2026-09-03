import { EDITOR_PREFIX, BlockType } from '../../../constants'
import type { IElement } from '@vervedoc/docx-editor-schema'
import type { Draw } from '@vervedoc/docx-editor-view'
import { BlockParticle } from '../block-particle'
import { IFrameBlock } from './i-frame-block'
import { VideoBlock } from './video-block'
import { AudioBlock } from './audio-block'
import { ChartBlock } from './chart-block'

export class BaseBlock {
  private draw: Draw
  private element: IElement
  private block: IFrameBlock | VideoBlock | AudioBlock | ChartBlock | null
  private blockContainer: HTMLDivElement
  private blockItem: HTMLDivElement

  constructor(blockParticle: BlockParticle, element: IElement) {
    this.draw = blockParticle.getDraw()
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
    const block = (this.element as any).block
    if (!block) return
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
    const layout = (this.draw as any).getLayout?.()
    const pageHeight = layout?.pages?.[0]?.rect?.height
      ?? (this.draw as any).getOptions?.()?.pageHeight
      ?? 1123
    const pageGap = (this.draw as any).getOptions?.()?.pageGap ?? 24
    const preY = pageNo * (pageHeight + pageGap)
    // 尺寸
    const metrics = (this.element as any).metrics
    if (metrics) {
      this.blockItem.style.width = `${metrics.width}px`
      this.blockItem.style.height = `${metrics.height}px`
    }
    // 位置
    this.blockItem.style.position = 'absolute'
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
