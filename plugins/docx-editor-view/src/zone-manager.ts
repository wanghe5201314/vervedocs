/**
 * ZoneManager —— 编辑区域 Manager
 *
 * 管理正文/页眉/页脚编辑区域切换、活动文档获取与写回。
 */

import type { IDocxDocumentMeta, IElement, IPosition } from '@vervedoc/docx-editor-schema'
import type { RangeManager } from '@vervedoc/docx-editor-state'
import type { Zone } from './widgets/header-footer-widget'

/**
 * ZoneManager 的依赖注入接口
 *
 * 由外部宿主提供，用于获取/设置区域、文档、选区以及触发渲染等。
 */
export interface ZoneManagerDeps {
  /** 获取当前编辑区域 */
  getZone: () => Zone
  /** 直接设置区域状态（不触发副作用） */
  setZoneState: (zone: Zone) => void
  /** 获取当前文档元数据 */
  getDocument: () => IDocxDocumentMeta
  getPage: () => import('@vervedoc/docx-editor-schema').PageLayout | undefined
  /** 获取当前选区管理器，可能为 null */
  getRange: () => RangeManager | null
  /** 聚焦隐藏输入框 */
  focusInput: () => void
  /** zone 变化回调 */
  onZoneChange: (zone: Zone) => void
  /** 调度一帧渲染 */
  scheduleRender: () => void
  /** 重排版+重渲染 */
  reformatAndRender: () => void
}

/**
 * 编辑区域 Manager
 *
 * 封装区域切换、活动文档获取/写回、区域首文本位置查找等逻辑。
 */
export class ZoneManager {
  /**
   * 构造 ZoneManager 实例
   *
   * @param deps 依赖注入对象
   */
  constructor(private deps: ZoneManagerDeps) {}

  /** 切换编辑区域（main/header/footer） */
  setZone(zone: Zone): void {
    if (this.deps.getZone() === zone) return
    this.deps.setZoneState(zone)
    this.deps.onZoneChange(zone)
    this.deps.scheduleRender()
  }

  /**
   * 切换编辑区域并设置初始光标。
   * 切换到页眉/页脚时，将光标定位到对应区域的起始文本位置；
   * 切回正文时清空选区。
   * @param zone 目标区域
   */
  setZoneWithCaret(zone: Zone): void {
    const changed = this.deps.getZone() !== zone
    this.setZone(zone)
    if (!changed) return
    const range = this.deps.getRange()
    if (!range) return
    if (zone === 'header' || zone === 'footer') {
      const pos = this.findZoneFirstPosition()
      range.setCaret(pos)
      this.deps.focusInput()
    } else {
      range.clear()
    }
  }

  /**
   * 查找当前活动区域（页眉/页脚）的第一个文本位置，用于切换区域时设置初始光标。
   * 若区域为空则返回指向元素数组末尾的虚拟位置，便于后续插入。
   * @returns 起始文本位置
   */
  private findZoneFirstPosition(): IPosition {
    const doc = this.getActiveDocument()
    const pos = this.findFirstTextPositionInElements(doc.elements)
    if (pos) return pos
    return { path: [doc.elements.length], offset: 0 }
  }

  /**
   * 递归查找元素列表中的第一个文本元素位置。
   * @param elements 元素列表
   * @returns 第一个文本位置；未找到返回 null
   */
  private findFirstTextPositionInElements(elements: IElement[]): IPosition | null {
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i] as any
      if (el.type === 'text') {
        return { path: [i], offset: 0 }
      }
      if (el.type === 'title' || el.type === 'list') {
        const sub = el.valueList ?? el.elements ?? []
        const pos = this.findFirstTextPositionInElements(sub)
        if (pos) return { path: [i, 'valueList', ...pos.path], offset: pos.offset }
      }
      if (el.type === 'table') {
        const trList = el.trList ?? []
        for (let r = 0; r < trList.length; r++) {
          const tdList = trList[r].tdList ?? []
          for (let c = 0; c < tdList.length; c++) {
            const pos = this.findFirstTextPositionInElements(tdList[c].value ?? [])
            if (pos) return { path: [i, 'trList', r, 'tdList', c, 'value', ...pos.path], offset: pos.offset }
          }
        }
      }
    }
    return null
  }

  /** 获取当前活动区域的文档（zone=header/footer 时 elements 指向对应区域） */
  getActiveDocument(): IDocxDocumentMeta {
    const doc = this.deps.getDocument()
    const zone = this.deps.getZone()
    if (zone === 'header' || zone === 'footer') {
      if (doc.sections) {
        const page = this.deps.getPage()
        const partId = zone === 'header' ? page?.headerPartId : page?.footerPartId
        if (!partId || !doc.headerFooterParts?.[partId]) throw new TypeError('当前页没有 Java 页眉页脚 part 引用，不能隐式创建')
        return { ...doc, elements: doc.headerFooterParts[partId] }
      }
      return { ...doc, elements: doc[zone] ?? doc.contentZones?.[zone] ?? (doc[zone] = []) }
    }
    return doc
  }

  /** 将修改后的活动文档写回对应区域并触发重渲染 */
  applyActiveDocument(doc: IDocxDocumentMeta): void {
    const current = this.deps.getDocument()
    const zone = this.deps.getZone()
    if (zone === 'header' || zone === 'footer') {
      if (current.sections) {
        const page = this.deps.getPage()
        const partId = zone === 'header' ? page?.headerPartId : page?.footerPartId
        if (!partId || !current.headerFooterParts?.[partId]) throw new TypeError('当前页没有 Java 页眉页脚 part 引用，不能隐式创建')
        current.headerFooterParts[partId] = doc.elements
      } else if (current[zone] !== undefined || !current.contentZones?.[zone]) {
        current[zone] = doc.elements
      } else {
        current.contentZones[zone] = doc.elements
      }
    } else {
      current.elements = doc.elements
    }
    this.deps.reformatAndRender()
  }
}