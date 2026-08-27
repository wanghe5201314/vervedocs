import { NS } from '../constants'

/**
 * 解析 XML 字符串为 Document
 */
export function parseXml(xmlString: string): Document {
  const parser = new DOMParser()
  return parser.parseFromString(xmlString, 'application/xml')
}

/**
 * 获取指定命名空间下的子元素（直接子元素）
 */
export function getChildrenByTag(parent: Element, ns: string, localName: string): Element[] {
  const result: Element[] = []
  for (let i = 0; i < parent.childNodes.length; i++) {
    const child = parent.childNodes[i]
    if (
      child.nodeType === 1 &&
      (child as Element).localName === localName &&
      (child as Element).namespaceURI === ns
    ) {
      result.push(child as Element)
    }
  }
  return result
}

/**
 * 获取第一个指定命名空间下的子元素
 */
export function getFirstChildByTag(parent: Element, ns: string, localName: string): Element | null {
  for (let i = 0; i < parent.childNodes.length; i++) {
    const child = parent.childNodes[i]
    if (
      child.nodeType === 1 &&
      (child as Element).localName === localName &&
      (child as Element).namespaceURI === ns
    ) {
      return child as Element
    }
  }
  return null
}

/**
 * 获取 w:val 属性值
 */
export function getWVal(el: Element | null): string | null {
  if (!el) return null
  return el.getAttributeNS(NS.w, 'val') || el.getAttribute('w:val') || null
}

/**
 * 获取指定命名空间的属性值
 */
export function getAttr(el: Element, ns: string, name: string): string | null {
  return el.getAttributeNS(ns, name) || el.getAttribute(getPrefixedName(ns, name)) || null
}

/**
 * 获取属性（兼容带前缀和不带前缀的写法）
 */
export function getAttrVal(el: Element, attrName: string): string | null {
  // 尝试 w:val, r:embed 等带前缀的写法
  return el.getAttribute(attrName) || null
}

/**
 * 遍历直接子元素（所有命名空间）
 */
export function forEachChild(parent: Element, callback: (child: Element) => void): void {
  for (let i = 0; i < parent.childNodes.length; i++) {
    const child = parent.childNodes[i]
    if (child.nodeType === 1) {
      callback(child as Element)
    }
  }
}

/**
 * 获取所有后代元素（指定命名空间和标签名）
 */
export function getElementsByTag(parent: Element, ns: string, localName: string): Element[] {
  const result: Element[] = []
  const all = parent.getElementsByTagNameNS(ns, localName)
  for (let i = 0; i < all.length; i++) {
    result.push(all[i])
  }
  return result
}

/**
 * 检查元素是否存在（用于 boolean 属性如 <w:b/>）
 */
export function hasChild(parent: Element, ns: string, localName: string): boolean {
  return getFirstChildByTag(parent, ns, localName) !== null
}

/**
 * 从命名空间 URI 获取前缀名称
 */
function getPrefixedName(ns: string, name: string): string {
  for (const [prefix, uri] of Object.entries(NS)) {
    if (uri === ns) return `${prefix}:${name}`
  }
  return name
}
