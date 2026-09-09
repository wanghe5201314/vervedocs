<template>
  <div class="ribbon-tab-panel">
    <VdRibbonGroup title="帮助">
      <VdRibbonButton icon="keyboard-outline" text="快捷键" title="键盘快捷键 (Ctrl+/)" size="large" @click="emit('command', 'openShortcuts')" />
      <VdRibbonButton icon="message-outline" text="反馈" title="提出功能建议" size="large" @click="emit('command', 'feedback')" />
    </VdRibbonGroup>
  </div>
</template>

<script setup lang="ts">
import { VdRibbonButton, VdRibbonGroup } from '@vervedoc/ui'


const emit = defineEmits<{
  (e: 'command', cmd: string, ...args: any[]): void
}>()
</script>

<style scoped>
</style>
