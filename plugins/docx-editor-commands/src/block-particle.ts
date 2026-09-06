import { EDITOR_PREFIX } from './constants'

import { walkTree } from '@vervedoc/docx-editor-schema'
import type { IElement } from '@vervedoc/docx-editor-schema'
import type { Draw } from '@vervedoc/docx-editor-view'
import { BaseBlock } from './block-base'
import './assets/css/block.css'

/** 块粒子管理器，负责嵌入块元素的创建、缓存与清理 */
export class BlockParticle {
  /** 编辑器绘制实例 */
  private draw: Draw
  /** 编辑器容器 */
  private container: HTMLDivElement
  /** 块容器 */
  private blockContainer: HTMLDivElement
  /** 块实例缓存，按元素 id 索引 */
  private blockMap: Map<string, BaseBlock>

  /**
   * 创建块粒子管理器
   * @param draw 编辑器绘制实例
   */
  constructor(draw: Draw) {
    this.draw = draw
    this.container = draw.getContainer()
    this.blockMap = new Map()
    this.blockContainer = this._createBlockContainer()
    this.container.append(this.blockContainer)
  }

  /** 创建块容器 DOM 并设置基础样式 */
  private _createBlockContainer(): HTMLDivElement {
    const blockContainer = document.createElement('div')
    blockContainer.classList.add(`${EDITOR_PREFIX}-block-container`)
    blockContainer.style.position = 'absolute'
    blockContainer.style.inset = '0'
    blockContainer.style.pointerEvents = 'auto'
    return blockContainer
  }

  /**
   * 获取编辑器绘制实例
   * @returns 绘制实例
   */
  public getDraw(): Draw {
    return this.draw
  }

  /**
   * 获取块容器
   * @returns 块容器 DOM
   */
  public getBlockContainer(): HTMLDivElement {
    return this.blockContainer
  }

  /**
   * 渲染指定页的块元素，复用已存在实例
   * @param pageNo 页码
   * @param element 元素
   * @param x X 坐标
   * @param y Y 坐标
   */
  public render(pageNo: number, element: IElement, x: number, y: number) {
    const id = (element as any).id
    if (!id) return
    const cacheBlock = this.blockMap.get(id)
    if (cacheBlock) {
      cacheBlock.setClientRects(pageNo, x, y)
    } else {
      const newBlock = new BaseBlock(this, element)
      newBlock.render()
      newBlock.setClientRects(pageNo, x, y)
      this.blockMap.set(id, newBlock)
    }
  }

  /** 清理已从文档中删除的块实例 */
  public clear() {
    if (!this.blockMap.size) return
    const elementList = this.draw.getElementList()
    const blockElementIds: string[] = []
    walkTree(elementList, (node) => {
      if (node.type === 'block') {
        const id = (node as any).id
        if (id) blockElementIds.push(id)
      }
    })
    this.blockMap.forEach(block => {
      const id = (block.getBlockElement() as any).id
      if (id && !blockElementIds.includes(id)) {
        block.remove()
        this.blockMap.delete(id)
      }
    })
  }

  /** 销毁所有块实例并移除块容器 */
  public destroy() {
    this.blockMap.forEach(block => block.remove())
    this.blockMap.clear()
    this.blockContainer.remove()
  }
}
