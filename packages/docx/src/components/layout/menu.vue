<template>
  <div class="toolbar" :class="{ 'is-doc-readonly': isLocked }" editor-component="menu">
    <GoogleDocsToolbar
      :is-locked="isLocked"
      :document-stats="documentStats"
      :revision-count="revisionCount"
      :toc-visible="tocVisible"

      :toolbar-visible="toolbarVisible"
      :bottom-nav-visible="bottomNavVisible"
      :show-collaboration-menu="showCollaborationMenu"
      :cursor-collaboration-enabled="cursorCollaborationEnabled"
      :selection-collaboration-enabled="selectionCollaborationEnabled"
      @command="handleTabCommand"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DocumentMeta, DocumentStats } from '@/types/document'
import GoogleDocsToolbar from '@/components/toolbar/googleDocsToolbar.vue'

const emit = defineEmits(['command'])

const props = defineProps<{
  appNameWithVersion: string
  documentMeta: DocumentMeta
  documentStats: DocumentStats
  revisionCount?: number
  tocVisible?: boolean

  toolbarVisible?: boolean
  bottomNavVisible?: boolean
  showCollaborationMenu?: boolean
  cursorCollaborationEnabled?: boolean
  selectionCollaborationEnabled?: boolean
}>()

/** 文档是否处于锁定/只读状态 */
const isLocked = computed(() => props.documentMeta?.status === 'lock' || props.documentMeta?.status === 'view')

/**
 * 处理工具栏命令并向上转发
 * @param command - 命令名称
 * @param args - 命令参数
 */
const handleTabCommand = (command: string, ...args: any[]) => {
  emit('command', command, ...args)
}
</script>

<style scoped>
.toolbar {
  width: 100%;
  background-color: #fff;
}

.is-doc-readonly {
  pointer-events: none;
  opacity: 0.7;
}
</style>
