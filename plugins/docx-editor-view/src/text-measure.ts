/**
 * VerveDocs View —— TextMeasure
 *
 * 字形宽度 LRU 缓存 + 段落级 memoization。
 * 采用一个隐藏 canvas 的 ctx 做 measureText，主线程即可用。
 */

interface LruNode<K, V> {
  key: K
  value: V
  prev: LruNode<K, V> | null
  next: LruNode<K, V> | null
}

class LRU<K, V> {
  private map = new Map<K, LruNode<K, V>>()
  private head: LruNode<K, V> | null = null
  private tail: LruNode<K, V> | null = null
  constructor(private limit: number) {}

  get(key: K): V | undefined {
    const node = this.map.get(key)
    if (!node) return undefined
    this.touch(node)
    return node.value
  }

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

  private evict(): void {
    if (!this.tail) return
    this.map.delete(this.tail.key)
    this.tail = this.tail.prev
    if (this.tail) this.tail.next = null
    else this.head = null
  }
}

export class TextMeasure {
  private ctx: CanvasRenderingContext2D
  private glyphCache = new LRU<string, number>(10000)

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
export function getSharedMeasure(): TextMeasure {
  if (!_sharedMeasure) _sharedMeasure = new TextMeasure()
  return _sharedMeasure
}
