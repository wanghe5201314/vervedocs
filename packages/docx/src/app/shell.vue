<template>
  <Editor ref="editorViewRef" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, provide, ref, watch } from 'vue'
import Editor from '@/app/page.vue'
import { applyUiConstants } from '@/config/helpers'
import { uiThemeStore } from '@/stores/ui-theme'
import { externalApi, onExternalEvent, type ExternalEventName } from '@/composables/use-external-events'
import type { CollaborationOptions, DocxEditorUiInitialDocument } from '@/editor/types'
import type { DocxImportCallback, DocxExportCallback } from '@vervedoc/core'

const props = defineProps<{
  initialDocument?: DocxEditorUiInitialDocument | null
  collaboration?: CollaborationOptions | null
  importCallback?: DocxImportCallback
  exportCallback?: DocxExportCallback
}>()

const emit = defineEmits<{
  (e: 'ready', payload: any): void
  (e: 'change', payload: any): void
  (e: 'metaChange', payload: any): void
  (e: 'meta-change', payload: any): void
  (e: 'statusChange', payload: any): void
  (e: 'status-change', payload: any): void
  (e: 'modeChange', payload: any): void
  (e: 'mode-change', payload: any): void
  (e: 'abilityChange', payload: any): void
  (e: 'ability-change', payload: any): void
  (e: 'contentChange', payload: any): void
  (e: 'content-change', payload: any): void
  (e: 'collabConnectionChange', payload: any): void
  (e: 'collab-connection-change', payload: any): void
  (e: 'collabSyncStateChange', payload: any): void
  (e: 'collab-sync-state-change', payload: any): void
  (e: 'collabSharedSyncStateChange', payload: any): void
  (e: 'collab-shared-sync-state-change', payload: any): void
  (e: 'collabUsersChange', payload: any): void
  (e: 'collab-users-change', payload: any): void
  (e: 'collabError', payload: any): void
  (e: 'collab-error', payload: any): void
}>()

/**
 * 规范化协同配置，补全缺失的服务地址、文档 ID 与用户信息
 * @param input - 原始协同配置，可为空
 * @param fallbackDocId - 备用文档 ID，当 input 中未指定 docId 时使用
 * @returns 规范化后的协同配置对象，当 input 为空时返回 null
 */
const normalizeCollaborationOptions = (input?: CollaborationOptions | null, fallbackDocId?: string): CollaborationOptions | null => {
  if (!input) return null
  const source = (input || {}) as Partial<CollaborationOptions>
  const serverUrl = String(source.serverUrl || '').trim() || 'ws://127.0.0.1:1234'
  const docId = String(source.docId || '').trim() || String(fallbackDocId || '').trim() || 'local'
  const user = (source.user || {}) as any
  const userId = String(user.userId || '').trim() || `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const userName = String(user.userName || '').trim() || '当前用户'
  const color = String(user.color || '').trim() || `hsl(${Math.floor(Math.random() * 360)}, 70%, 55%)`
  return {
    ...source,
    serverUrl,
    docId,
    user: { userId, userName, color }
  }
}

applyUiConstants()
uiThemeStore.init()

/** 初始文档响应式引用，来源于 props.initialDocument */
const initDocument = ref<DocxEditorUiInitialDocument | null>(props.initialDocument ?? null)
/** 协同配置响应式引用，由 props.collaboration 规范化而来 */
const collaboration = ref<CollaborationOptions | null>(normalizeCollaborationOptions(props.collaboration ?? null, props.initialDocument?.meta?.id))

/** 监听 props.initialDocument 变化，同步更新 initDocument */
watch(() => props.initialDocument, (value) => {
  initDocument.value = value ?? null
}, { immediate: true, deep: true })

/** 监听协同配置与文档 ID 变化，重新规范化协同配置 */
watch(() => [props.collaboration, props.initialDocument?.meta?.id] as const, ([collab, id]) => {
  collaboration.value = normalizeCollaborationOptions(collab ?? null, id)
}, { immediate: true, deep: true })

provide('docx-editor-ui:initDocument', initDocument.value)
provide('docx-editor-ui:collaboration', collaboration.value)
provide('docx-editor-ui:importCallback', props.importCallback)
provide('docx-editor-ui:exportCallback', props.exportCallback)

/** 需要对外暴露的外部事件名称列表 */
const events: ExternalEventName[] = [
  'ready',
  'metaChange',
  'statusChange',
  'modeChange',
  'abilityChange',
  'contentChange',
  'collabConnectionChange',
  'collabSyncStateChange',
  'collabSharedSyncStateChange',
  'collabUsersChange',
  'collabError'
]

/** 已注册的事件取消函数集合，组件卸载时统一调用 */
const offFns: Array<() => void> = []
/**
 * 构建内容变更事件载荷，附带当前文档元信息
 * @param payload - 原始内容载荷
 * @returns 包含 format、content、meta、raw 字段的事件载荷对象
 */
const buildChangePayload = (payload: any) => {
  const meta = externalApi.document?.getMeta?.()
  return {
    format: 'docx',
    content: payload,
    meta: meta || null,
    raw: payload
  }
}
/**
 * 对外触发指定事件，同时派发对应的 kebab-case 事件名；contentChange 额外触发 change 事件
 * @param event - 事件名称
 * @param payload - 事件载荷
 */
const emitEvent = (event: ExternalEventName, payload: any) => {
  emit(event as any, payload)
  if (event === 'contentChange') emit('change', buildChangePayload(payload))
  const kebab = event.replace(/[A-Z]/g, (s) => `-${s.toLowerCase()}`)
  if (kebab !== event) emit(kebab as any, payload)
}
for (const event of events) {
  offFns.push(onExternalEvent(event, (payload) => emitEvent(event, payload)))
}

onBeforeUnmount(() => {
  offFns.forEach((off) => off())
  offFns.length = 0
})

/** 编辑器视图组件引用 */
const editorViewRef = ref<any>(null)
/**
 * 执行编辑器命令，转发至内部编辑器实例的 executeCommand 方法
 * @param command - 命令名称
 * @param args - 命令参数
 * @returns 编辑器命令执行结果
 */
const executeCommand = (command: string, ...args: any[]) => {
  const fn = editorViewRef.value?.executeCommand
  if (typeof fn !== 'function') return
  return fn(command, ...args)
}

defineExpose({
  executeCommand,
  api: externalApi
})
</script>
