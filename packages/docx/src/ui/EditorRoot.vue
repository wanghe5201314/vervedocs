<template>
  <EditorAsync ref="editorRef" />
</template>

<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue'

const editorRef = ref<any>(null)

const EditorAsync = defineAsyncComponent(() => import('../pages/EditorPage.vue'))

const executeCommand = (command: string, ...args: any[]) => {
  const fn = editorRef.value?.executeCommand
  if (typeof fn !== 'function') throw new Error('executeCommand is not available')
  return fn(command, ...args)
}

const getExternalAPI = () => {
  return editorRef.value?.getExternalAPI?.() ?? null
}

defineExpose({
  executeCommand,
  getExternalAPI
})
</script>
