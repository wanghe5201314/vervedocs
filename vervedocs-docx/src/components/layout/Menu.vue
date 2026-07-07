<template>
  <div class="toolbar" :class="{ 'is-doc-readonly': isLocked }" editor-component="menu">
    <GoogleDocsToolbar
      :is-locked="isLocked"
      :document-stats="documentStats"
      @command="handleTabCommand"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DocumentMeta, DocumentStats } from '@/types/document'
import GoogleDocsToolbar from '@/components/editor/toolbar/GoogleDocsToolbar.vue'

const emit = defineEmits(['command'])

const props = defineProps<{
  appNameWithVersion: string
  documentMeta: DocumentMeta
  documentStats: DocumentStats
}>()

const isLocked = computed(() => props.documentMeta?.status === 'lock' || props.documentMeta?.status === 'view')

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
