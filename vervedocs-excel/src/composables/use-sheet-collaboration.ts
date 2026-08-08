import { nextTick, ref, watch, type Ref } from 'vue'
import { ExcelCollaborationPlugin, ConnectionState, SyncState } from '@vervedoc/docx-editor-collaboration'
import type { ExcelCollaborationConfig, UserInfo } from '@vervedoc/docx-editor-collaboration'
import type { FUniver } from '@univerjs/core/facade'

interface SheetCollaborationProps {
  collaboration?: ExcelCollaborationConfig
}

interface SheetCollaborationEmits {
  (e: 'collabConnectionChange', payload: { state: ConnectionState | string }): void
  (e: 'collabSyncStateChange', payload: { state: SyncState | string }): void
  (e: 'collabUsersChange', payload: UserInfo[]): void
  (e: 'collabError', payload: { code: string; message: string }): void
}

export function useSheetCollaboration(options: {
  props: SheetCollaborationProps
  emit: SheetCollaborationEmits
  getUniverAPI: () => FUniver | null
  sheetEditorRef: Ref<HTMLElement | null>
}) {
  const { props, emit, getUniverAPI, sheetEditorRef } = options

  let collabPlugin: ExcelCollaborationPlugin | null = null
  const collabConnectionState = ref<string>('disconnected')
  const collabSyncState = ref<string>('syncing')
  const collabOnlineUsers = ref<UserInfo[]>([])
  const collabOffFns: Array<() => void> = []
  let collabBeforeUnloadHandler: (() => void) | null = null

  const syncSelectionEnabled = ref(true)
  const syncFilterEnabled = ref(true)
  const syncSortEnabled = ref(true)

  function toggleSyncSelection() {
    syncSelectionEnabled.value = !syncSelectionEnabled.value
    collabPlugin?.setSyncSelection(syncSelectionEnabled.value)
  }

  function toggleSyncFilter() {
    syncFilterEnabled.value = !syncFilterEnabled.value
    collabPlugin?.setSyncFilter(syncFilterEnabled.value)
    collabPlugin?.forceSyncWorkbook(true)
  }

  function toggleSyncSort() {
    syncSortEnabled.value = !syncSortEnabled.value
    collabPlugin?.setSyncSort(syncSortEnabled.value)
    collabPlugin?.forceSyncWorkbook(true)
  }

  function setCollabConnectionState(state: ConnectionState | string) {
    collabConnectionState.value = state
    emit('collabConnectionChange', { state })
  }

  function setCollabSyncState(state: SyncState | string) {
    collabSyncState.value = state
    emit('collabSyncStateChange', { state })
  }

  function setCollabOnlineUsers(users: UserInfo[]) {
    collabOnlineUsers.value = users
    emit('collabUsersChange', users)
  }

  async function initCollaboration() {
    if (!props.collaboration || collabPlugin) return
    const api = getUniverAPI()
    if (!api) return

    collabPlugin = new ExcelCollaborationPlugin({
      collaboration: {
        serverUrl: props.collaboration.serverUrl,
        docId: props.collaboration.docId,
        user: props.collaboration.user,
        token: props.collaboration.token
      }
    })

    collabPlugin.install(api)
    setCollabConnectionState(collabPlugin.getConnectionState())
    setCollabSyncState(collabPlugin.getSyncState())
    setCollabOnlineUsers([props.collaboration.user])

    collabOffFns.push(
      collabPlugin.on('connectionChange', (state) => {
        setCollabConnectionState(state)
      }),
      collabPlugin.on('syncStateChange', (state) => {
        setCollabSyncState(state)
      }),
      collabPlugin.on('usersChange', (users) => {
        setCollabOnlineUsers(users)
      }),
      collabPlugin.on('error', (err) => {
        emit('collabError', err)
      })
    )

    await collabPlugin.connect()

    nextTick(() => {
      const editorEl = sheetEditorRef.value
      if (!editorEl) return
      collabPlugin!.initializeSelections(editorEl)
    })

    collabBeforeUnloadHandler = () => {
      collabPlugin?.disconnect()
    }
    window.addEventListener('beforeunload', collabBeforeUnloadHandler)
  }

  function destroyCollaboration() {
    collabOffFns.forEach(fn => fn())
    collabOffFns.length = 0
    if (collabBeforeUnloadHandler) {
      window.removeEventListener('beforeunload', collabBeforeUnloadHandler)
      collabBeforeUnloadHandler = null
    }
    if (collabPlugin) {
      collabPlugin.disconnect()
      collabPlugin.uninstall()
      collabPlugin = null
    }
    setCollabConnectionState(ConnectionState.DISCONNECTED)
    setCollabSyncState(SyncState.SYNCING)
    setCollabOnlineUsers([])
  }

  function forceCollabSync() {
    if (collabPlugin) {
      collabPlugin.forceSyncWorkbook(true)
    }
  }

  watch(
    () => {
      const collab = props.collaboration
      if (!collab) return ''
      return JSON.stringify({
        serverUrl: collab.serverUrl,
        docId: collab.docId,
        token: collab.token,
        userId: collab.user?.userId,
        userName: collab.user?.userName,
        color: collab.user?.color,
      })
    },
    async (next, prev) => {
      if (next === prev) return
      if (!getUniverAPI()) return
      destroyCollaboration()
      if (next) {
        await nextTick()
        await initCollaboration()
      }
    }
  )

  return {
    collabConnectionState,
    collabSyncState,
    collabOnlineUsers,
    syncSelectionEnabled,
    syncFilterEnabled,
    syncSortEnabled,
    toggleSyncSelection,
    toggleSyncFilter,
    toggleSyncSort,
    initCollaboration,
    destroyCollaboration,
    forceCollabSync,
  }
}