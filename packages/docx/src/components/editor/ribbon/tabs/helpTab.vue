<template>
  <div class="ribbon-tab-panel">
    <RibbonGroup title="帮助">
      <RibbonButton icon="keyboard-outline" text="快捷键" title="键盘快捷键 (Ctrl+/)" size="large" command="openShortcuts" />
      <RibbonButton icon="message-outline" text="反馈" title="提出功能建议" size="large" command="feedback" />
    </RibbonGroup>
  </div>
</template>

<script setup lang="ts">
import RibbonGroup from '../ribbonGroup.vue'
import RibbonButton from '../ribbonButton.vue'

defineEmits<{
  (e: 'command', cmd: string, ...args: any[]): void
}>()
</script>

<style scoped>
</style>
