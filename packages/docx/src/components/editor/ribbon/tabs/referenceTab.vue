<template>
  <div class="ribbon-tab-panel">
    <!-- 目录 -->
    <RibbonGroup title="目录">
      <RibbonButton icon="table-of-contents" text="自动目录" title="插入自动目录" size="large" command="tocInsert" command-args="{ mode: 'auto', maxLevel: 3 }" />
      <a-dropdown :trigger="['click']">
        <RibbonButton icon="format-list-numbered" text="目录级别" title="目录级别" size="large" has-arrow />
        <template #overlay>
          <a-menu @click="({ key }: any) => handleTocInsert(Number(key))">
            <a-menu-item key="1">1 级</a-menu-item>
            <a-menu-item key="2">2 级</a-menu-item>
            <a-menu-item key="3">3 级</a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
      <RibbonButton icon="delete-outline" text="删除目录" title="删除目录" size="large" command="tocRemove" />
    </RibbonGroup>

    <!-- 书签与脚注 -->
    <RibbonGroup title="书签与脚注">
      <RibbonButton icon="bookmark-outline" text="书签" title="书签" size="large" command="bookmark" />
      <RibbonButton icon="format-annotation-plus" text="脚注" title="脚注" size="large" command="footnote" />
    </RibbonGroup>
  </div>
</template>

<script setup lang="ts">
import RibbonGroup from '../ribbonGroup.vue'
import RibbonButton from '../ribbonButton.vue'

const emit = defineEmits<{
  (e: 'command', cmd: string, ...args: any[]): void
}>()

const handleTocInsert = (maxLevel: number) => {
  emit('command', 'tocInsert', { mode: 'auto', maxLevel })
}
</script>

<style scoped>
</style>
