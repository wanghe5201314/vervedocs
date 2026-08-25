<template>
  <div class="ribbon-tab-panel">
    <!-- AI 助手 -->
    <RibbonGroup title="AI 助手">
      <RibbonButton icon="dock-right" text="AI 面板" title="打开 AI 面板" size="large" command="openAIPanel" />
      <RibbonButton icon="auto-fix" text="润色" title="AI 润色" size="large" :disabled="!hasSelection" command="aiPolish" />
      <RibbonButton icon="text-box-check-outline" text="总结" title="AI 总结" size="large" :disabled="!hasSelection" command="aiSummarize" />
      <RibbonButton icon="pen-plus" text="续写" title="AI 续写" size="large" command="aiContinue" />
      <RibbonButton icon="spellcheck" text="语法" title="修正语法" size="large" :disabled="!hasSelection" command="aiFixGrammar" />
      <a-dropdown :trigger="['click']">
        <RibbonButton icon="translate" text="翻译" title="AI 翻译" size="large" has-arrow :disabled="!hasSelection" />
        <template #overlay>
          <a-menu @click="({ key }: any) => emit('command', 'aiTranslate', key)">
            <a-menu-item key="en">翻译为英文</a-menu-item>
            <a-menu-item key="zh">翻译为中文</a-menu-item>
            <a-menu-item key="ja">翻译为日文</a-menu-item>
            <a-menu-item key="ko">翻译为韩文</a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
      <RibbonButton icon="file-search-outline" text="分析" title="全文分析" size="large" command="aiDocAnalysis" />
      <RibbonButton icon="page-layout-body" text="排版" title="排版建议" size="large" command="aiLayout" />
      <RibbonButton icon="cog-outline" text="设置" title="AI 设置" size="large" command="aiSettings" />
    </RibbonGroup>

  </div>
</template>

<script setup lang="ts">
import RibbonGroup from '../ribbonGroup.vue'
import RibbonButton from '../ribbonButton.vue'

const emit = defineEmits<{
  (e: 'command', cmd: string, ...args: any[]): void
}>()

defineProps<{
  hasSelection?: boolean
}>()
</script>

<style scoped>
</style>
