import { getTextFromElementList, zipElementList } from '@vervedoc/docx-editor-schema'
import type { IEditorResult, IElement } from '@vervedoc/docx-editor-schema'
import { ElementType } from '@vervedoc/docx-editor-schema'
import type { IWorkerRequest, IWorkerResponse } from './worker-message'

function collectGroupIds(elementList: IElement[], groupIdSet = new Set<string>(), result: string[] = []) {
  for (const element of elementList) {
    if (Array.isArray(element?.groupIds)) {
      for (const groupId of element.groupIds) {
        if (groupId && !groupIdSet.has(groupId)) {
          groupIdSet.add(groupId)
          result.push(groupId)
        }
      }
    }
    if (element?.type === ElementType.TABLE) {
      for (const tr of element.trList || []) {
        for (const td of tr.tdList || []) {
          collectGroupIds(td.value || [], groupIdSet, result)
        }
      }
      continue
    }
    if (Array.isArray(element?.valueList)) {
      collectGroupIds(element.valueList, groupIdSet, result)
    }
  }
  return result
}

function getWordCount(mainElementList: IElement[]) {
  const text = getTextFromElementList(mainElementList).replace(/\u200B/g, '')
  return text.replace(/\s/g, '').length
}

function getValue(payload: IWorkerRequest['payload']): IEditorResult {
  const originData = payload.originData!
  const extraPickAttrs = payload.valueOptions?.extraPickAttrs
  return {
    dataVersion: payload.dataVersion,
    schemaVersion: payload.schemaVersion || '',
    data: {
      header: zipElementList(originData.header, { extraPickAttrs }),
      main: zipElementList(originData.main, { extraPickAttrs, isClassifyArea: true }),
      footer: zipElementList(originData.footer, { extraPickAttrs })
    },
    options: payload.editorOptions || {}
  }
}

const workerScope = self as typeof globalThis & {
  onmessage: ((event: MessageEvent<IWorkerRequest>) => void) | null
  postMessage: (message: IWorkerResponse) => void
}

workerScope.onmessage = (event: MessageEvent<IWorkerRequest>) => {
  const { id, type, payload } = event.data
  try {
    let data: IWorkerResponse['data']
    switch (type) {
      case 'getValue':
        data = getValue(payload)
        break
      case 'getWordCount':
        data = getWordCount(payload.mainElementList || [])
        break
      case 'getGroupIds':
        data = collectGroupIds(payload.mainElementList || [])
        break
      default:
        throw new Error(`Unsupported worker task: ${type}`)
    }
    const response: IWorkerResponse = { id, success: true, data }
    workerScope.postMessage(response)
  } catch (error) {
    const response: IWorkerResponse = {
      id,
      success: false,
      error: error instanceof Error ? error.message : 'Worker execution failed'
    }
    workerScope.postMessage(response)
  }
}
