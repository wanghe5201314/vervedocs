import type { IBlockElement } from './constants'

/** 允许作为 iframe src 的协议白名单 */
const ALLOWED_SRC_PROTOCOLS = ['https:', 'http:']

/**
 * 判断给定 URL 是否使用了允许的协议
 * @param url 待校验 URL
 * @returns 是否允许加载
 */
function isAllowedSrc(url: string): boolean {
  try {
    const { protocol } = new URL(url, location.href)
    return ALLOWED_SRC_PROTOCOLS.includes(protocol)
  } catch {
    return false
  }
}

/** iframe 块组件，用于在文档中嵌入外部页面 */
export class IFrameBlock {
  /** iframe sandbox 允许的能力，仅允许脚本执行 */
  public static readonly sandbox = ['allow-scripts']
  /** 关联的块元素 */
  private element: IBlockElement

  /**
   * 创建 iframe 块实例
   * @param element 块元素
   */
  constructor(element: IBlockElement) {
    this.element = element
  }

  /**
   * 在 iframe 的 window 上定义隔离属性，阻断 parent/top 访问
   * @param iframeWindow iframe 的 contentWindow
   */
  private _defineIframeProperties(iframeWindow: Window) {
    try {
      Object.defineProperties(iframeWindow, {
        parent: { get: () => null },
        top: { get: () => null },
        __POWERED_BY_CANVAS_EDITOR__: { get: () => true }
      })
    } catch {}
  }

  /**
   * 渲染 iframe 到指定容器
   * @param blockItemContainer 块项容器
   */
  public render(blockItemContainer: HTMLDivElement) {
    const iframeBlock = this.element.block?.iframeBlock
    const iframe = document.createElement('iframe')
    iframe.setAttribute('data-id', this.element.id ?? '')
    iframe.sandbox.add(...IFrameBlock.sandbox)
    iframe.style.border = 'none'
    iframe.style.width = '100%'
    iframe.style.height = '100%'
    if (iframeBlock?.src) {
      if (!isAllowedSrc(iframeBlock.src)) return
      iframe.src = iframeBlock.src
    } else if (iframeBlock?.srcdoc) {
      iframe.srcdoc = iframeBlock.srcdoc
    }
    iframe.addEventListener('load', () => {
      const contentWindow = iframe.contentWindow
      if (contentWindow) {
        this._defineIframeProperties(contentWindow)
      }
    })
    blockItemContainer.append(iframe)
  }
}
