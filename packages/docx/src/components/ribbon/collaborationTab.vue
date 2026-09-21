<template>
  <div class="ribbon-tab-panel">
    <VdRibbonGroup title="协同">
      <VdRibbonButton icon="pencil" text="光标" title="显示他人光标" size="large" :active="cursorCollaborationEnabled" @click="emit('command', 'toggleCollaborationCursor')" />
      <VdRibbonButton icon="select-all" text="选区" title="显示他人选区" size="large" :active="selectionCollaborationEnabled" @click="emit('command', 'toggleCollaborationSelection')" />
    </VdRibbonGroup>
  </div>
</template>

<script setup lang="ts">
import { VdRibbonButton, VdRibbonGroup } from '@vervedoc/ui'


const emit = defineEmits<{
  (e: 'command', cmd: string, ...args: any[]): void
}>()

defineProps<{
  cursorCollaborationEnabled?: boolean
  selectionCollaborationEnabled?: boolean
}>()
</script>

<style scoped>
</style>
