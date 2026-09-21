/**
 * VerveDocs View —— TextMeasure
 *
 * 字形宽度 LRU 缓存 + 段落级 memoization。
 * 采用一个隐藏 canvas 的 ctx 做 measureText，主线程即可用。
 */

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
