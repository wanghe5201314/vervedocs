/**
 * VerveDocs View —— TextMeasure
 *
 * 字形宽度 LRU 缓存 + 段落级 memoization。
 * 采用一个隐藏 canvas 的 ctx 做 measureText，主线程即可用。
 */

import { FONT_FAMILY_CSS, type ITextElement } from '@vervedoc/docx-editor-schema'

/**
 * 按字符范围选择 DOCX 字体。与导出端一样，用户改过 font 后停用原始映射。
 * 字体选择与占宽分开：东亚兼容规则可能调整空格占宽，不能直接用西文字体宽度代替。
 */
export function resolveTextFont(
  run: Pick<ITextElement, 'font' | 'fontFamilies' | 'sourceFont'>,
  ch: string,
  defaultFont: string
): string {
  const base = run.font ?? defaultFont
  const fallback = FONT_FAMILY_CSS[base] ?? base
  const families = run.sourceFont === run.font ? run.fontFamilies : undefined
  if (!families || !ch) return fallback
  const code = ch.codePointAt(0)!
  const eastAsia = (code >= 0x1100 && code <= 0x11ff) ||
    (code >= 0x2e80 && code <= 0xa4cf) ||
    (code >= 0xac00 && code <= 0xd7af) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe10 && code <= 0xfe6f) ||
    (code >= 0xff00 && code <= 0xffef) ||
    (code >= 0x20000 && code <= 0x323af)
  const complex = (code >= 0x0590 && code <= 0x08ff) ||
    (code >= 0xfb1d && code <= 0xfdff) || (code >= 0xfe70 && code <= 0xfeff)
  const family = code <= 0x7f ? families.ascii :
    eastAsia ? families.eastAsia : complex ? families.cs : families.hAnsi
  // 原始字体（如仿宋_GB2312）未安装时，继续使用已归一化字体的回退栈。
  return family ? (FONT_FAMILY_CSS[family] ?? `${JSON.stringify(family)}, ${fallback}`) : fallback
}

/**
 * LRU 双向链表节点。
 */
interface LruNode<K, V> {
  /** 节点键 */
  key: K
  /** 节点值 */
  value: V
  /** 前驱节点 */
  prev: LruNode<K, V> | null
  /** 后继节点 */
  next: LruNode<K, V> | null
}

/**
 * LRU 缓存：基于双向链表 + Map 实现，最近访问的节点置于链表头部。
 */
class LRU<K, V> {
  /** 节点查找表 */
  private map = new Map<K, LruNode<K, V>>()
  /** 链表头（最近访问） */
  private head: LruNode<K, V> | null = null
  /** 链表尾（最久未访问，淘汰端） */
  private tail: LruNode<K, V> | null = null
  /**
   * 创建容量为 limit 的 LRU 缓存。
   * @param limit 缓存容量上限
   */
  constructor(private limit: number) {}

  /**
   * 读取键对应的值，并将其置为最近访问。
   * @param key 键
   * @returns 命中返回值，未命中返回 undefined
   */
  get(key: K): V | undefined {
    const node = this.map.get(key)
    if (!node) return undefined
    this.touch(node)
    return node.value
  }

  /**
   * 写入键值对，已存在则更新值并置为最近访问；超出容量时淘汰尾部。
   * @param key 键
   * @param value 值
   */
  set(key: K, value: V): void {
    let node = this.map.get(key)
    if (node) { node.value = value; this.touch(node); return }
    node = { key, value, prev: null, next: this.head }
    if (this.head) this.head.prev = node
    this.head = node
    if (!this.tail) this.tail = node
    this.map.set(key, node)
    if (this.map.size > this.limit) this.evict()
  }

  /**
   * 将节点移动到链表头部，标记为最近访问。
   * @param node 待移动节点
   */
  private touch(node: LruNode<K, V>): void {
    if (node === this.head) return
    if (node.prev) node.prev.next = node.next
    if (node.next) node.next.prev = node.prev
    if (node === this.tail) this.tail = node.prev
    node.prev = null
    node.next = this.head
    if (this.head) this.head.prev = node
    this.head = node
  }

  /**
   * 淘汰链表尾部节点（最久未访问）。
   */
  private evict(): void {
    if (!this.tail) return
    this.map.delete(this.tail.key)
    this.tail = this.tail.prev
    if (this.tail) this.tail.next = null
    else this.head = null
  }
}

/**
 * 字形度量器：基于隐藏 canvas 的 measureText 计算字符宽度，带 LRU 缓存。
 */
export class TextMeasure {
  /** canvas 2d 上下文，用于 measureText */
  private ctx: CanvasRenderingContext2D
  /** 字形宽度 LRU 缓存 */
  private glyphCache = new LRU<string, number>(10000)
  private inkCache = new LRU<string, { left: number; right: number }>(2000)

  /**
   * 创建度量器，初始化隐藏 canvas 及其 2d 上下文。
   */
  constructor() {
    const c = typeof document !== 'undefined'
      ? document.createElement('canvas')
      : ({ getContext: () => null } as unknown as HTMLCanvasElement)
    const ctx = c.getContext('2d')
    if (!ctx) throw new Error('[TextMeasure] canvas 2d context unavailable')
    this.ctx = ctx
  }

  /** 生成 canvas font 字符串 */
  static font(family: string, size: number, bold?: boolean, italic?: boolean): string {
    const w = bold ? '700' : '400'
    const s = italic ? 'italic ' : ''
    return `${s}${w} ${size}px ${family}`
  }

  /** 单字符宽度 */
  charWidth(ch: string, family: string, size: number, bold?: boolean, italic?: boolean): number {
    const key = `${ch}|${family}|${size}|${bold ? 1 : 0}|${italic ? 1 : 0}`
    const hit = this.glyphCache.get(key)
    if (hit != null) return hit
    this.ctx.font = TextMeasure.font(family, size, bold, italic)
    const w = this.ctx.measureText(ch).width
    this.glyphCache.set(key, w)
    return w
  }

  /** 整串宽度 */
  textWidth(text: string, family: string, size: number, bold?: boolean, italic?: boolean): number {
    let w = 0
    for (const ch of text) w += this.charWidth(ch, family, size, bold, italic)
    return w
  }

  /** 字形左右墨迹边界，用于压缩留白而不压缩或重叠字形。 */
  inkBounds(ch: string, family: string, size: number, bold?: boolean, italic?: boolean): { left: number; right: number } {
    const key = `${ch}|${family}|${size}|${bold ? 1 : 0}|${italic ? 1 : 0}`
    const hit = this.inkCache.get(key)
    if (hit) return hit
    this.ctx.font = TextMeasure.font(family, size, bold, italic)
    const metrics = this.ctx.measureText(ch)
    const bounds = {
      left: Number.isFinite(metrics.actualBoundingBoxLeft) ? -metrics.actualBoundingBoxLeft : 0,
      right: Number.isFinite(metrics.actualBoundingBoxRight) ? metrics.actualBoundingBoxRight : metrics.width
    }
    this.inkCache.set(key, bounds)
    return bounds
  }
}

/** 全局共享度量器（浏览器环境） */
let _sharedMeasure: TextMeasure | null = null
/**
 * 获取全局共享的 TextMeasure 实例，首次调用时惰性创建。
 * @returns 共享度量器实例
 */
export function getSharedMeasure(): TextMeasure {
  if (!_sharedMeasure) _sharedMeasure = new TextMeasure()
  return _sharedMeasure
}
