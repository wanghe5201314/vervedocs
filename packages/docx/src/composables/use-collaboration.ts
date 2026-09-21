import { Ref, ref, computed, nextTick } from 'vue'
import { CollaborationPlugin, ConnectionState } from '@vervedoc/docx-editor-collaboration'
import type { SharedSyncState, EditorInterface } from '@vervedoc/docx-editor-collaboration'
import { emitExternalEvent } from '@/composables/use-external-events'
import type { DocumentMeta } from '@/types/document'

/**
 * 编辑器实例接口（协作所需的最小能力）。
 *
 * ⚠️ 仅暴露 core 公开的合法入口，避免协作层直接访问 `comment` / `revision` 内部对象
 * 从而覆盖 core 装配的 `CommentHost`。
 */
interface EditorInstance {
  command?: any
  listener?: any
  eventBus?: any
  /** 获取已注册插件实例（批注/修订等可选功能） */
  getPlugin?: <T>(name: string) => T | undefined
}

/**

 * 协作用户信息
 */
interface CollabUser {
  /** 用户 ID */
  userId: string
  /** 用户名称 */
  userName: string
  /** 用户光标颜色 */
  color: string
}

/**
 * 多人协作 composable
 * @param options 配置项
 * @returns 协作相关状态与方法
 */
export function useCollaboration(options: {
  /** 协作配置 */
  collaborationConfig: any
  /** 获取编辑器实例 */
  getEditorInstance: () => EditorInstance | null
  /** 执行编辑器命令 */
  executeCommand: (command: string, ...args: any[]) => void
  /** 文档元数据 */
  documentMeta: DocumentMeta
  /** 编辑器引用 */
  editorRef: Ref<any>
  /** 判断本次是否需要抑制一次保存 */
  isSuppressSaveOnce: () => boolean
  /** 触发延迟保存 */
  scheduleSave: () => void
}) {
  const {
    collaborationConfig,
    getEditorInstance,
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

  /**
   * 通过插件实例注入批注协作回调。
   *
   * 通过 `editor.getPlugin('comment')` 拿到 CommentPlugin 实例后调用 `setCallbacks`，
   * 避免接触 core 内部装配的 PluginHost。
   *
   * @param targetInstance 目标编辑器实例
   */
  const installCommentCallbacks = (targetInstance: EditorInstance | null) => {
    if (!targetInstance) return
    const commentPlugin = targetInstance.getPlugin?.<{
      setCallbacks(c: any): void
      getAll(): any[]
      setAll(c: any[]): void
      render(): void
    }>('comment')
    if (!commentPlugin) {
      console.warn('[useCollaboration] 未注册 comment 插件，协作回调本次不会安装。')
      return
    }

    commentPlugin.setCallbacks({
      onSave: () => { collabPlugin?.syncComments() },
      onDelete: () => { collabPlugin?.syncComments() },
      onReply: () => { collabPlugin?.syncComments() },
      onResolve: () => { collabPlugin?.syncComments() },
      onCancel: () => { collabPlugin?.syncComments() },
      onRequestSave: () => { if (!isSuppressSaveOnce()) scheduleSave() }
    })

    collabPlugin?.bindCommentComponent(commentPlugin as any)
  }

  /**
   * 检查协作服务器是否可用
   * @param serverUrl 协作服务器地址
   * @returns 服务器是否可用
   */
  const checkServerAvailable = (serverUrl: string): Promise<boolean> => {
    const httpUrl = serverUrl.replace(/^ws/, 'http')
    return fetch(httpUrl, { method: 'HEAD', mode: 'no-cors' })
      .then(() => true)
      .catch(() => false)
  }

  /**
   * 初始化协作插件，建立与服务器的连接并绑定事件监听
   */
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

  /**
   * 清理协作资源，移除事件监听并断开与服务器的连接
   */
  const cleanupCollaboration = () => {
    collabOffFns.forEach(fn => { try { fn() } catch { void 0 } })
    collabOffFns.length = 0
    if (collabPlugin) {
      collabPlugin.disconnect()
      collabPlugin.uninstall()
      collabPlugin = null
    }
  }

  /**
   * 获取当前协作插件实例
   * @returns 协作插件实例，未初始化时返回 null
   */
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