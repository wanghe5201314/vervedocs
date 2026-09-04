<template>
  <div class="mobile-header">
    <button class="mobile-header-btn" @click="$emit('toggleCatalog')">
      <span class="material-icons">menu</span>
    </button>
    <div class="mobile-header-center">
      <input
        v-model="documentMeta.name"
        class="mobile-doc-title"
        :title="documentMeta.name"
      />
      <span class="mobile-header-info">{{ statusPageText }} · {{ statusWordsText }}</span>
    </div>
    <button class="mobile-header-btn" @click="$emit('save')">
      <span class="material-icons">done</span>
    </button>
    <button class="mobile-header-btn" @click="$emit('toggleMore')">
      <span class="material-icons">more_vert</span>
    </button>
  </div>

  <div v-if="moreMenuOpen" class="mobile-more-menu">
    <div class="mobile-more-item" @click="$emit('importDoc')">
      <span class="material-icons">folder_open</span>
      <span>导入文档</span>
    </div>
    <div class="mobile-more-item" @click="$emit('exportDoc')">
      <span class="material-icons">file_download</span>
      <span>导出文档</span>
    </div>
    <div class="mobile-more-item" @click="$emit('command', 'executePrint')">
      <span class="material-icons">print</span>
      <span>打印</span>
    </div>
    <div class="mobile-more-item" @click="$emit('showPopup', 'shortcuts')">
      <span class="material-icons">keyboard</span>
      <span>快捷键</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SaveSnapshot } from '../../object/word-editor.types'

defineProps<{
  documentMeta: SaveSnapshot['meta']
  moreMenuOpen: boolean
  statusPageText: string
  statusWordsText: string
}>()

defineEmits<{
  toggleCatalog: []
  save: []
  toggleMore: []
  importDoc: []
  exportDoc: []
  command: [command: string, ...args: any[]]
  showPopup: [name: 'table' | 'link' | 'search' | 'shortcuts']
}>()
</script>
