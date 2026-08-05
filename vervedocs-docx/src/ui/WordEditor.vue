<template>
  <Editor ref="editorViewRef" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, provide, ref, watch } from 'vue'
import Editor from '@/views/Editor.vue'
import { applyUiConstants } from '@/config/ui-constants'
import { uiThemeStore } from '@/stores/ui-theme'
import { externalApi, onExternalEvent, type ExternalEventName } from '@/composables/use-external-api'
import type { CollaborationOptions, DocxEditorUiInitialDocument } from './index'

const props = defineProps<{
  initialDocument?: DocxEditorUiInitialDocument | null
  collaboration?: CollaborationOptions | null
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

const initDocument = ref<DocxEditorUiInitialDocument | null>(props.initialDocument ?? null)
const collaboration = ref<CollaborationOptions | null>(normalizeCollaborationOptions(props.collaboration ?? null, props.initialDocument?.meta?.id))

watch(() => props.initialDocument, (value) => {
  initDocument.value = value ?? null
}, { immediate: true, deep: true })

watch(() => [props.collaboration, props.initialDocument?.meta?.id] as const, ([collab, id]) => {
  collaboration.value = normalizeCollaborationOptions(collab ?? null, id)
}, { immediate: true, deep: true })

provide('docx-editor-ui:initDocument', initDocument.value)
provide('docx-editor-ui:collaboration', collaboration.value)

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

const offFns: Array<() => void> = []
const buildChangePayload = (payload: any) => {
  const meta = externalApi.document?.getMeta?.()
  return {
    content: payload,
    meta: meta || null,
    raw: payload
  }
}
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

const editorViewRef = ref<any>(null)
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
