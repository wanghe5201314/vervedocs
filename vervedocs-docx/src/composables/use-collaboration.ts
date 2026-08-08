import { Ref, ref, computed, nextTick } from 'vue'
import { CollaborationPlugin, ConnectionState } from '@vervedoc/docx-editor-collaboration'
import type { SharedSyncState, EditorInterface } from '@vervedoc/docx-editor-collaboration'
import { emitExternalEvent } from '@/composables/use-external-api'
import type { DocumentMeta } from '@/types/document'

interface EditorInstance {
  command?: any
  listener?: any
  comment?: any
  revision?: any
  eventBus?: any
}

interface CommentComponent {
  install: (command: any, callbacks: any) => void
  getComments: () => any[]
  setComments: (comments: any[]) => void
  render: () => void
}

interface CollabUser {
  userId: string
  userName: string
  color: string
}

export function useCollaboration(options: {
  collaborationConfig: any
  getEditorInstance: () => EditorInstance | null
  getCommentComponent: () => CommentComponent | null
  executeCommand: (command: string, ...args: any[]) => void
  documentMeta: DocumentMeta
  editorRef: Ref<any>
  isSuppressSaveOnce: () => boolean
  scheduleSave: () => void
}) {
  const {
    collaborationConfig,
    getEditorInstance,
    getCommentComponent,
    executeCommand,
    documentMeta,
    editorRef,
    isSuppressSaveOnce,
    scheduleSave
  } = options

  const collabOnlineUsers = ref<CollabUser[]>([])
  const collabConnectionState = ref<ConnectionState>(ConnectionState.DISCONNECTED)
  const collabSharedSyncState = ref<SharedSyncState>({ cursor: true, selection: true })
  const showCollaborationMenu = computed(() => collabConnectionState.value === ConnectionState.CONNECTED)

  let collabPlugin: CollaborationPlugin | null = null
  const collabOffFns: (() => void)[] = []

  const installCommentCallbacks = (targetInstance: any) => {
    if (!targetInstance?.command) return
    const commentComp = getCommentComponent()
    if (!commentComp) return

    commentComp.install(targetInstance.command, {
      onSave: () => { collabPlugin?.syncComments() },
      onDelete: () => { collabPlugin?.syncComments() },
      onReply: () => { collabPlugin?.syncComments() },
      onResolve: () => { collabPlugin?.syncComments() },
      onCancel: () => { collabPlugin?.syncComments() },
      onRequestSave: () => { if (!isSuppressSaveOnce()) scheduleSave() }
    })

    collabPlugin?.bindCommentComponent(commentComp)
  }

  const checkServerAvailable = (serverUrl: string): Promise<boolean> => {
    const httpUrl = serverUrl.replace(/^ws/, 'http')
    return fetch(httpUrl, { method: 'HEAD', mode: 'no-cors' })
      .then(() => true)
      .catch(() => false)
  }

  const initCollaboration = () => {
    if (documentMeta.status === 'view') {
      nextTick(() => executeCommand('mode', 'readonly'))
    }

    if (!collaborationConfig || collabPlugin) return
    const editorInstance = getEditorInstance()
    if (!editorInstance) return

    void (async () => {
      const available = await checkServerAvailable(collaborationConfig.serverUrl)
      if (!available) {
        console.info('[连接模式]: 单机模式')
        return
      }

      collabPlugin = new CollaborationPlugin({
        collaboration: {
          serverUrl: collaborationConfig.serverUrl,
          docId: collaborationConfig.docId,
          user: collaborationConfig.user,
          token: collaborationConfig.token
        }
      })

      collabPlugin.install(editorInstance as EditorInterface)
      installCommentCallbacks(editorInstance)
      collabConnectionState.value = collabPlugin.getConnectionState()
      collabSharedSyncState.value = collabPlugin.getSharedSyncState()

      collabOffFns.push(
        collabPlugin.on('connectionChange', (state: any) => {
          collabConnectionState.value = state
          emitExternalEvent('collabConnectionChange', { state })
        }),
        collabPlugin.on('syncStateChange', (state: any) => {
          emitExternalEvent('collabSyncStateChange', { state })
        }),
        collabPlugin.on('sharedSyncStateChange', (state: any) => {
          collabSharedSyncState.value = state
          emitExternalEvent('collabSharedSyncStateChange', { state })
        }),
        collabPlugin.on('usersChange', (users: any) => {
          collabOnlineUsers.value = users
          emitExternalEvent('collabUsersChange', { users })
        }),
        collabPlugin.on('error', (err: any) => {
          emitExternalEvent('collabError', err)
        })
      )

      collabPlugin.connect().catch(() => {})

      nextTick(() => {
        const editorEl = editorRef.value?.$el as HTMLElement
        if (!editorEl) return
        const editorArea = editorEl.closest('.editor-area') as HTMLElement
        if (!editorArea) return
        if (!collabPlugin) return
        collabPlugin.initializeCursorsWithEditor(editorArea)
      })

      const onBeforeUnload = () => {
        if (collabPlugin) {
          collabPlugin.disconnect()
        }
      }
      window.addEventListener('beforeunload', onBeforeUnload)
      collabOffFns.push(() => window.removeEventListener('beforeunload', onBeforeUnload))
    })()
  }

  const cleanupCollaboration = () => {
    collabOffFns.forEach(fn => { try { fn() } catch { void 0 } })
    collabOffFns.length = 0
    if (collabPlugin) {
      collabPlugin.disconnect()
      collabPlugin.uninstall()
      collabPlugin = null
    }
  }

  const getCollabPlugin = () => collabPlugin

  return {
    collabOnlineUsers,
    collabConnectionState,
    collabSharedSyncState,
    showCollaborationMenu,
    initCollaboration,
    installCommentCallbacks,
    cleanupCollaboration,
    getCollabPlugin
  }
}