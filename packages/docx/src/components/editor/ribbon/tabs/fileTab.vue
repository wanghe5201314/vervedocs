<template>
  <div class="ribbon-tab-panel file-tab">
    <RibbonGroup title="文档操作">
      <RibbonButton
        icon="file-plus-outline"
        text="新建文档"
        title="新建文档"
        size="large"
        command="new"
      />
      <RibbonButton
        icon="file-import-outline"
        text="导入文档"
        title="导入文档 (Ctrl+Alt+O)"
        size="large"
        command="import"
      />
      <RibbonButton
        icon="content-save-outline"
        text="保存"
        title="保存 (Ctrl+S)"
        size="large"
        command="save"
      />
      <RibbonButton
        icon="download-outline"
        text="导出文档"
        title="导出文档"
        size="large"
        command="export"
        command-args="docx"
      />
      <RibbonButton
        icon="printer-outline"
        text="打印"
        title="打印 (Ctrl+P)"
        size="large"
        command="print"
      />
      <RibbonButton
        icon="eye-outline"
        text="预览"
        title="预览"
        size="large"
        command="preview"
      />
      <RibbonButton
        icon="rename-box"
        text="重命名"
        title="重命名"
        size="large"
        command="rename"
      />
    </RibbonGroup>

    <RibbonGroup title="文档保护">
      <RibbonButton
        icon="shield-lock-outline"
        text="保护文档"
        title="保护文档"
        size="large"
        command="protectDoc"
      />
      <RibbonButton
        icon="history"
        text="版本历史"
        title="版本历史"
        size="large"
        command="versionHistory"
      />

    </RibbonGroup>
  </div>
</template>

<script setup lang="ts">
import RibbonGroup from '../ribbonGroup.vue'
import RibbonButton from '../ribbonButton.vue'

defineEmits<{
  (e: 'command', cmd: string, ...args: any[]): void
}>()

defineProps<{
  isImporting?: boolean
}>()
</script>

<style scoped></style>
