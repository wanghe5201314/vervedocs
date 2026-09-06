<template>
  <EditorAsync ref="editorRef" />
</template>

<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue'

/** 异步编辑器组件实例引用 */
const editorRef = ref<any>(null)

/** 异步加载的编辑器组件，按需导入 page.vue */
const EditorAsync = defineAsyncComponent(() => import('./page.vue'))

/**
 * 执行编辑器命令，转发至内部编辑器实例
 * @param command - 命令名称
 * @param args - 命令参数
 * @returns 编辑器命令执行结果
 * @throws 当编辑器实例不可用时抛出错误
 */
const executeCommand = (command: string, ...args: any[]) => {
  const fn = editorRef.value?.executeCommand
  if (typeof fn !== 'function') throw new Error('executeCommand is not available')
  return fn(command, ...args)
}

/**
 * 获取外部 API 对象
 * @returns 外部 API 对象，若不可用则返回 null
 */
const getExternalAPI = () => {
  return editorRef.value?.getExternalAPI?.() ?? null
}

defineExpose({
  executeCommand,
  getExternalAPI
})
</script>
