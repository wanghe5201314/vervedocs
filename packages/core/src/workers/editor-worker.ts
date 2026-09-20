/// <reference lib="webworker" />
import { cloneTree } from '@vervedoc/docx-editor-schema'
import type { IElement } from '@vervedoc/docx-editor-schema'
import { computeToc, computeSearch } from './compute'

type WorkerRequest =
  | { type: 'update'; elements: IElement[] }
  | { type: 'search'; keyword: string }
  | { type: 'clone'; data: unknown }

let currentElements: IElement[] = []
self.onmessage = (e: MessageEvent<WorkerRequest>): void => {
  try {
    const req = e.data
    switch (req.type) {
      case 'update':
        currentElements = req.elements
        self.postMessage({ type: 'toc-result', ...computeToc(currentElements) })
        break
      case 'search':
        self.postMessage({ type: 'search-result', ...computeSearch(currentElements, req.keyword) })
        break
      case 'clone':
        self.postMessage({ type: 'clone-result', data: cloneTree(req.data) })
        break
    }
  } catch (error: any) {
    self.postMessage({ type: 'error', message: error?.message || String(error) })
  }
}
