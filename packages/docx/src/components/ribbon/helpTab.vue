<template>
  <div class="ribbon-tab-panel">
    <VdRibbonGroup :title="t('ribbon.help.label')">
      <VdRibbonButton icon="keyboard-outline" :text="t('common.shortcut')" :title="t('common.shortcutKeys')" size="large" @click="emit('command', 'openShortcuts')" />
      <VdRibbonButton icon="message-outline" :text="t('common.feedback')" :title="t('common.feedbackSuggestion')" size="large" @click="emit('command', 'feedback')" />
    </VdRibbonGroup>
  </div>
</template>

<script setup lang="ts">
import { VdRibbonButton, VdRibbonGroup } from '@vervedoc/ui'
import { t } from '@/i18n'


const emit = defineEmits<{
  (e: 'command', cmd: string, ...args: any[]): void
}>()
</script>

<style scoped>
</style>
