<template>
  <div class="ribbon-tab-panel">
    <VdRibbonGroup :title="t('ribbon.collaboration.label')">
      <VdRibbonButton icon="pencil" :text="t('ribbon.collaboration.cursor')" :title="t('ribbon.collaboration.showCursor')" size="large" :active="cursorCollaborationEnabled" @click="emit('command', 'toggleCollaborationCursor')" />
      <VdRibbonButton icon="select-all" :text="t('ribbon.collaboration.selection')" :title="t('ribbon.collaboration.showSelection')" size="large" :active="selectionCollaborationEnabled" @click="emit('command', 'toggleCollaborationSelection')" />
    </VdRibbonGroup>
  </div>
</template>

<script setup lang="ts">
import { VdRibbonButton, VdRibbonGroup } from '@vervedoc/ui'
import { t } from '@/i18n'


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
