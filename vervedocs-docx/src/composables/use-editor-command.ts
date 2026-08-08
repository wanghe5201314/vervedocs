import { Ref, nextTick } from 'vue'
import { emitExternalEvent } from '@/composables/use-external-api'
import type { DocumentStats } from '@/types/document'

function generateDocId(): string {
  const hex = () =>
    Math.random().toString(16).slice(2).toUpperCase().padEnd(4, '0').slice(0, 4)
  return 'DEU' + hex() + hex() + hex() + hex()
}

function formatNow(): string {
  const now = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())} ${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`
}

function renderCommentsLater(getCommentComponent: () => any): void {
  nextTick(() => requestAnimationFrame(() => getCommentComponent()?.render()))
}

export function useEditorCommand(options: {
  cachedCatalog: Ref<any[]>
  catalogRef: Ref<any>
  footerRef: Ref<any>
  documentStats: DocumentStats
  getCommentComponent: () => any
  getRevisionComponent: () => any
  revisionList: Ref<any[]>
  isSuppressSaveOnce: () => boolean
  setSuppressSaveOnce: (value: boolean) => void
  getCollabPlugin: () => any
  saveNow: (opts?: { silent?: boolean }) => Promise<void>
  setMeta: (patch: any) => void
  importFileName: Ref<string>
  importFileSize: Ref<string>
  importParseProgress: Ref<number | undefined>
  setImportModeResolver: (resolver: ((value: string) => void) | null) => void
  showImportNotification: () => void
}) {
  const {
    cachedCatalog,
    catalogRef,
    footerRef,
    documentStats,
    getCommentComponent,
    getRevisionComponent,
    revisionList,
    isSuppressSaveOnce,
    setSuppressSaveOnce,
    getCollabPlugin,
    saveNow,
    setMeta,
    importFileName,
    importFileSize,
    importParseProgress,
    setImportModeResolver,
    showImportNotification
  } = options

  const syncRevisionList = () => {
    const revisionComp = getRevisionComponent()
    if (!revisionComp) return
    revisionList.value = revisionComp.getRevisions().map((r: any) => ({
      id: r.id,
      type: r.type,
      author: r.author,
      date: r.date,
      content: r.content
    }))
  }

  const commandHandlers: Record<string, (args: any[]) => void | boolean> = {
    catalogChange: args => {
      cachedCatalog.value = args[0] ?? []
      catalogRef.value?.updateCatalog?.(cachedCatalog.value)
    },
    thumbnailsChange: args => {
      catalogRef.value?.updateThumbnails?.(args[0] ?? [])
    },
    editorStatus: args => {
      const payload = (args[0] ?? {}) as Record<string, any>
      footerRef.value?.updateEditorStatus?.(payload)
      const numFields: Array<keyof DocumentStats> = [
        'totalPages',
        'wordCount',
        'paragraphCount',
        'charCount',
        'charCountWithSpaces'
      ]
      for (const field of numFields) {
        if (payload[field] !== undefined) {
          documentStats[field] = Number(payload[field]) || 0
        }
      }
    },
    editorAbilityChange: args => {
      emitExternalEvent('abilityChange', args[0] ?? null)
    },
    contentChange: args => {
      emitExternalEvent('contentChange', args[0] ?? null)
      nextTick(() => {
        getCommentComponent()?.render()
        getRevisionComponent()?.update()
      })
      const collab = getCollabPlugin()
      collab?.syncComments()
      syncRevisionList()
      if (isSuppressSaveOnce()) {
        setSuppressSaveOnce(false)
        return true
      }
      collab?.markPositionListDirty()
      collab?.refreshCursors()
    },
    commentsLoaded: args => {
      const metas: any[] = args[0] || []
      getCommentComponent()?.buildCommentsFromMetas(metas)
      renderCommentsLater(getCommentComponent)
    },
    importFinished: args => {
      const payload = (args[0] || {}) as {
        source?: string
        comments?: any[]
        onSaveComplete?: () => void
      }
      const { onSaveComplete, comments: importComments } = payload

      void (async () => {
        await nextTick()
        if (importComments?.length) {
          getCommentComponent()?.buildCommentsFromMetas(importComments)
          renderCommentsLater(getCommentComponent)
        }
        await saveNow({ silent: true })
        onSaveComplete?.()
      })()
    },
    importNewDoc: args => {
      const { fileName } = (args[0] || {}) as { fileName?: string }
      setMeta({
        id: generateDocId(),
        name: fileName || '新建文档',
        createdAt: formatNow(),
        submittedAt: ''
      })
    },
    importConfirm: args => {
      const { resolve, fileName, fileSize, parseProgress } = (args[0] ||
        {}) as {
        resolve?: (v: string) => void
        fileName?: string
        fileSize?: string
        parseProgress?: number
      }
      if (!resolve) return
      importFileName.value = fileName || ''
      importFileSize.value = fileSize || ''
      importParseProgress.value = parseProgress
      setImportModeResolver(resolve)
      showImportNotification()
    },
    importParseProgress: args => {
      importParseProgress.value = args[0] as number
    },
    importParseComplete: () => {
      importParseProgress.value = undefined
    }
  }

  const handleEditorCommand = (command: string, ...args: any[]) => {
    const handler = commandHandlers[command]
    if (handler) {
      handler(args)
      return
    }
    emitExternalEvent('statusChange', { command, args })
  }

  const handleEditorSaved = (_payload?: any) => {
    void saveNow({ silent: false })
  }

  return { handleEditorCommand, handleEditorSaved }
}
