import { IRowElement } from '@vervedoc/docx-editor-schema'

const ALLOWED_SRC_PROTOCOLS = ['https:', 'http:']

function isAllowedSrc(url: string): boolean {
  try {
    const { protocol } = new URL(url, location.href)
    return ALLOWED_SRC_PROTOCOLS.includes(protocol)
  } catch {
    return false
  }
}

export class IFrameBlock {
  public static readonly sandbox = ['allow-scripts']
  private element: IRowElement

  constructor(element: IRowElement) {
    this.element = element
  }

  private _defineIframeProperties(iframeWindow: Window) {
    try {
      Object.defineProperties(iframeWindow, {
        parent: {
          get: () => null
        },
        top: {
          get: () => null
        },
        __POWERED_BY_CANVAS_EDITOR__: {
          get: () => true
        }
      })
    } catch {}
  }

  public render(blockItemContainer: HTMLDivElement) {
    const block = this.element.block!
    const iframe = document.createElement('iframe')
    iframe.setAttribute('data-id', this.element.id!)
    iframe.sandbox.add(...IFrameBlock.sandbox)
    iframe.style.border = 'none'
    iframe.style.width = '100%'
    iframe.style.height = '100%'
    if (block.iframeBlock?.src) {
      if (!isAllowedSrc(block.iframeBlock.src)) return
      iframe.src = block.iframeBlock.src
    } else if (block.iframeBlock?.srcdoc) {
      iframe.srcdoc = block.iframeBlock.srcdoc
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
