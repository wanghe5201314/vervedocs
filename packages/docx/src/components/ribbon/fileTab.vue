<template>
  <div class="file-dropdown-menu">
    <a-menu @click="handleMenuClick">
      <a-menu-item key="new">
        <div class="file-item-row"><span class="file-mi"><VdIcon name="file-plus-outline" /><span>新建文档</span></span></div>
      </a-menu-item>
      <a-menu-item key="import">
        <div class="file-item-row"><span class="file-mi"><VdIcon name="file-import-outline" /><span>导入文档</span></span><span class="shortcut">Ctrl+Alt+O</span></div>
      </a-menu-item>
      <a-menu-item key="save">
        <div class="file-item-row"><span class="file-mi"><VdIcon name="content-save-outline" /><span>保存</span></span><span class="shortcut">Ctrl+S</span></div>
      </a-menu-item>
      <a-sub-menu key="export" popup-class-name="file-export-submenu">
        <template #title>
          <div class="file-item-row"><span class="file-mi"><VdIcon name="download-outline" /><span>下载为</span></span></div>
        </template>
        <a-menu-item key="export-docx">
          <div class="file-item-row"><span class="file-mi"><VdIcon name="file-document-outline" /><span>Word 文档 (.docx)</span></span></div>
        </a-menu-item>
      </a-sub-menu>
      <a-menu-item key="print">
        <div class="file-item-row"><span class="file-mi"><VdIcon name="printer-outline" /><span>打印</span></span><span class="shortcut">Ctrl+P</span></div>
      </a-menu-item>
      <a-menu-item key="preview">
        <div class="file-item-row"><span class="file-mi"><VdIcon name="eye-outline" /><span>预览</span></span></div>
      </a-menu-item>
      <a-menu-item key="rename">
        <div class="file-item-row"><span class="file-mi"><VdIcon name="rename-box" /><span>重命名</span></span></div>
      </a-menu-item>
      <a-menu-divider />
      <a-menu-item key="protectDoc">
        <div class="file-item-row"><span class="file-mi"><VdIcon name="shield-lock-outline" /><span>保护文档</span></span></div>
      </a-menu-item>
      <a-menu-item key="versionHistory">
        <div class="file-item-row"><span class="file-mi"><VdIcon name="history" /><span>版本历史</span></span></div>
      </a-menu-item>
    </a-menu>
  </div>
</template>

<script setup lang="ts">
import { VdIcon } from '@vervedoc/ui'


const emit = defineEmits<{
  (e: 'command', cmd: string, ...args: any[]): void
}>()

defineProps<{
  isImporting?: boolean
}>()

const handleMenuClick = ({ key }: { key: string }) => {
  if (key === 'export-docx') {
    emit('command', 'export', 'docx')
  } else {
    emit('command', key)
  }
}
</script>

<style scoped>
.file-dropdown-menu {
  min-width: 220px;
}
.file-dropdown-menu :deep(.ant-menu) {
  border: none;
}
.file-dropdown-menu :deep(.ant-menu-item),
.file-dropdown-menu :deep(.ant-menu-submenu-title) {
  height: 50px;
  line-height: 50px;
  margin: 0;
  padding: 0 16px;
}
.file-item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}
.file-mi {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}
.file-mi svg {
  width: 16px;
  height: 16px;
  opacity: 0.7;
  flex-shrink: 0;
}
.file-mi span {
  line-height: 16px;
  white-space: nowrap;
}
.shortcut {
  margin-left: 16px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  white-space: nowrap;
  flex-shrink: 0;
}
</style>
