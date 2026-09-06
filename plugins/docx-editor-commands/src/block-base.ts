import { EDITOR_PREFIX, BlockType } from './constants'
import type { IBlockElement } from './constants'
import type { IElement } from '@vervedoc/docx-editor-schema'
import type { Draw } from '@vervedoc/docx-editor-view'
import { BlockParticle } from './block-particle'
import { IFrameBlock } from './block-iframe'
import { VideoBlock } from './block-video'
import { AudioBlock } from './block-audio'
import { ChartBlock } from './block-chart'

/** 嵌入块基类，根据块类型分发到具体实现（iframe/video/audio/chart） */
export class BaseBlock {
  /** 编辑器绘制实例 */
  private draw: Draw
  /** 关联的块元素 */
  private element: IElement
  /** 具体块实现实例 */
  private block: IFrameBlock | VideoBlock | AudioBlock | ChartBlock | null
  /** 块容器 */
  private blockContainer: HTMLDivElement
  /** 当前块项 DOM */
  private blockItem: HTMLDivElement

  /**
   * 创建嵌入块实例
   * @param blockParticle 块粒子管理器
   * @param element 元素
   */
  constructor(blockParticle: BlockParticle, element: IElement) {
    this.draw = blockParticle.getDraw()
    this.blockContainer = blockParticle.getBlockContainer()
    this.element = element
    this.block = null
    this.blockItem = this._createBlockItem()
    this.blockContainer.append(this.blockItem)
  }

  /**
   * 获取块元素
   * @returns 块元素
   */
  public getBlockElement(): IElement {
    return this.element
  }

  /** 创建块项 DOM 并添加样式类 */
  private _createBlockItem(): HTMLDivElement {
    const blockItem = document.createElement('div')
    blockItem.classList.add(`${EDITOR_PREFIX}-block-item`)
    return blockItem
  }

  /** 根据块类型实例化并渲染对应实现 */
  public render() {
    const el = this.element as IBlockElement
    const block = el.block
    if (!block) return
    if (block.type === BlockType.IFRAME) {
      this.block = new IFrameBlock(el)
      this.block.render(this.blockItem)
    } else if (block.type === BlockType.VIDEO) {
      this.block = new VideoBlock(el)
      this.block.render(this.blockItem)
    } else if (block.type === BlockType.AUDIO) {
      this.block = new AudioBlock(el)
      this.block.render(this.blockItem)
    } else if (block.type === BlockType.CHART) {
      this.block = new ChartBlock(el, this.draw)
      this.block.render(this.blockItem)
    }
  }

  /**
   * 设置块项的位置与尺寸
   * @param pageNo 页码
   * @param x X 坐标
   * @param y Y 坐标
   */
  public setClientRects(pageNo: number, x: number, y: number) {
    const layout = (this.draw as any).getLayout?.()
    const pageHeight = layout?.pages?.[0]?.rect?.height
      ?? (this.draw as any).getOptions?.()?.pageHeight
      ?? 1123
    const pageGap = (this.draw as any).getOptions?.()?.pageGap ?? 24
    const preY = pageNo * (pageHeight + pageGap)
    // 尺寸
    const metrics = (this.element as IBlockElement).metrics
    if (metrics) {
      this.blockItem.style.width = `${metrics.width}px`
      this.blockItem.style.height = `${metrics.height}px`
    }
    // 位置
    this.blockItem.style.position = 'absolute'
    this.blockItem.style.left = `${x}px`
    this.blockItem.style.top = `${preY + y}px`
  }

  /** 销毁块实现资源并从 DOM 移除 */
  public remove() {
    // 销毁 block 资源
    if (this.block && 'destroy' in this.block) {
      this.block.destroy()
    }
    this.blockItem.remove()
  }
}
