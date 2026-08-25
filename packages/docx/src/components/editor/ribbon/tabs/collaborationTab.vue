<template>
  <div class="ribbon-tab-panel">
    <RibbonGroup title="协同">
      <RibbonButton icon="pencil" text="光标" title="显示他人光标" size="large" :active="cursorCollaborationEnabled" command="toggleCollaborationCursor" />
      <RibbonButton icon="select-all" text="选区" title="显示他人选区" size="large" :active="selectionCollaborationEnabled" command="toggleCollaborationSelection" />
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
  cursorCollaborationEnabled?: boolean
  selectionCollaborationEnabled?: boolean
}>()
</script>

<style scoped>
</style>