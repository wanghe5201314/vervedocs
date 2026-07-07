<template>
  <div class="export-dialog">
    <div class="tabs">
      <div 
        class="tab" 
        :class="{ 'active': tab.key === dialogForExport }"
        v-for="tab in tabs" 
        :key="tab.key"
        @click="setDialogForExport(tab.key)"
      >{{tab.label}}</div>
    </div>
    <div class="content">
      <component :is="currentDialogComponent" @close="setDialogForExport('')"></component>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore } from '@/store'
import { DialogForExportTypes } from '@/types/export'

import ExportImage from './ExportImage.vue'
import ExportJSON from './ExportJSON.vue'
import ExportPDF from './ExportPDF.vue'
import ExportPPTX from './ExportPPTX.vue'
import ExportSpecificFile from './ExportSpecificFile.vue'

interface TabItem {
  key: DialogForExportTypes;
  label: string;
}

export default defineComponent({
  name: 'export-dialog',
  setup() {
    const mainStore = useMainStore()
    const { dialogForExport } = storeToRefs(mainStore)

    const setDialogForExport = mainStore.setDialogForExport

    const tabs: TabItem[] = [
      { key: 'pptist', label: '导出 pptist 文件' },
      { key: 'pptx', label: '导出 PPTX' },
      { key: 'image', label: '导出图片' },
      { key: 'json', label: '导出 JSON' },
      { key: 'pdf', label: '打印 / 导出 PDF' },
    ]

    const currentDialogComponent = computed(() => {
      const dialogMap = {
        'image': ExportImage,
        'json': ExportJSON,
        'pdf': ExportPDF,
        'pptx': ExportPPTX,
        'pptist': ExportSpecificFile,
      }
      return (dialogMap as Record<string, any>)[dialogForExport.value] || null
    })

    return {
      currentDialogComponent,
      tabs,
      dialogForExport,
      setDialogForExport,
    }
  },
})
</script>

<style scoped>
.export-dialog {
  margin: -24px;
}
.tabs {
  height: 50px;
  font-size: 12px;
  flex-shrink: 0;
  display: flex;
  user-select: none;
  border-top-left-radius: 2px;
  border-top-right-radius: 2px;
  overflow: hidden;
}
.tab {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f1f3f4;
  border-bottom: 1px solid #e2e6ed;
  cursor: pointer;
}

.tab.active {
  background-color: #fff;
  border-bottom-color: #fff;
}

.tab + .tab {
  border-left: 1px solid #e2e6ed;
}
.content {
  height: 460px;
  padding: 12px;
  font-size: 13px;
  overflow: auto;
  overflow: overlay;
}
</style>