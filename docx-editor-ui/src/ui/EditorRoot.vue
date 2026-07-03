<template>
  <EditorAsync ref="editorRef" />
</template>

<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue'

const editorRef = ref<any>(null)

const EditorAsync = defineAsyncComponent(() => import('../views/Editor.vue'))

const executeCommand = (command: string, ...args: any[]) => {
  const fn = editorRef.value?.executeCommand
  if (typeof fn !== 'function') throw new Error('executeCommand is not available')
  return fn(command, ...args)
}

const getExternalApi = () => {
  return editorRef.value?.getExternalApi?.() ?? null
}

defineExpose({
  executeCommand,
  getExternalApi
})
</script>
