import { NS_A } from './constants'

export function parseXml(xmlString: string): Document {
  const parser = new DOMParser()
  return parser.parseFromString(xmlString, 'application/xml')
}

export function getFirstChildByTag(parent: Element | Document, ns: string, localName: string): Element | null {
  const nodes = parent.childNodes
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (node.nodeType === 1) {
      const el = node as Element
      if (el.localName === localName && el.namespaceURI === ns) {
        return el
      }
    }
  }
  return null
}

export function getChildrenByTag(parent: Element, ns: string, localName: string): Element[] {
  const result: Element[] = []
  for (let i = 0; i < parent.childNodes.length; i++) {
    const node = parent.childNodes[i]
    if (node.nodeType === 1) {
      const el = node as Element
      if (el.localName === localName && el.namespaceURI === ns) {
        result.push(el)
      }
    }
  }
  return result
}

export function getAllDescendantsByTag(parent: Element | Document, ns: string, localName: string): Element[] {
  const elements = parent.getElementsByTagNameNS(ns, localName)
  return Array.from(elements)
}

export function forEachChild(parent: Element, callback: (child: Element) => void): void {
  for (let i = 0; i < parent.childNodes.length; i++) {
    const node = parent.childNodes[i]
    if (node.nodeType === 1) {
      callback(node as Element)
    }
  }
}

export function getAttr(el: Element, name: string): string | null {
  return el.getAttribute(name)
}

export function getAttrNS(el: Element, ns: string, name: string): string | null {
  return el.getAttributeNS(ns, name)
}

export function getTextContent(el: Element): string {
  return el.textContent || ''
}

export function findFirstDescendant(parent: Element, ns: string, localName: string): Element | null {
  const elements = parent.getElementsByTagNameNS(ns, localName)
  return elements.length > 0 ? elements[0] : null
}

/**
 * Get color child element from a fill or run properties element.
 * Looks for a:srgbClr, a:schemeClr, a:sysClr, a:prstClr
 */
export function getColorElement(parent: Element): Element | null {
  for (let i = 0; i < parent.childNodes.length; i++) {
    const node = parent.childNodes[i]
    if (node.nodeType !== 1) continue
    const el = node as Element
    if (el.namespaceURI === NS_A) {
      const name = el.localName
      if (name === 'srgbClr' || name === 'schemeClr' || name === 'sysClr' || name === 'prstClr' || name === 'scrgbClr') {
        return el
      }
    }
    // Recurse into solidFill if present
    if (el.localName === 'solidFill' && el.namespaceURI === NS_A) {
      return getColorElement(el)
    }
  }
  return null
}
