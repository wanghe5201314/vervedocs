import { EDITOR_PREFIX } from '../../constants'

import { walkTree } from '@vervedoc/docx-editor-schema'
import type { IElement } from '@vervedoc/docx-editor-schema'
import type { Draw } from '@vervedoc/docx-editor-view'
import { BaseBlock } from './modules/base-block'
import '../../assets/css/block/block.css'

export class BlockParticle {
  private draw: Draw
  private container: HTMLDivElement
  private blockContainer: HTMLDivElement
  private blockMap: Map<string, BaseBlock>

  constructor(draw: Draw) {
    this.draw = draw
    this.container = draw.getContainer()
    this.blockMap = new Map()
    this.blockContainer = this._createBlockContainer()
    this.container.append(this.blockContainer)
  }

  private _createBlockContainer(): HTMLDivElement {
    const blockContainer = document.createElement('div')
    blockContainer.classList.add(`${EDITOR_PREFIX}-block-container`)
    blockContainer.style.position = 'absolute'
    blockContainer.style.inset = '0'
    blockContainer.style.pointerEvents = 'auto'
    return blockContainer
  }

  public getDraw(): Draw {
    return this.draw
  }

  public getBlockContainer(): HTMLDivElement {
    return this.blockContainer
  }

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

  public destroy() {
    this.blockMap.forEach(block => block.remove())
    this.blockMap.clear()
    this.blockContainer.remove()
  }
}
