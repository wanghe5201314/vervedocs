<script setup lang="ts">
import { computed, provide, ref, useId } from 'vue'
import { RIBBON_TAB_CONTEXT_KEY } from './context'

const props = defineProps<{
  activeKey?: string
}>()

const emit = defineEmits<{
  'update:activeKey': [key: string]
}>()

const navId = `vd-ribbon-tab-nav-${useId().replace(/:/g, '')}`
const navSelector = ref(`#${navId}`)

const setActiveKey = (key: string) => {
  emit('update:activeKey', key)
}

provide(RIBBON_TAB_CONTEXT_KEY, {
  activeKey: computed(() => props.activeKey),
  setActiveKey,
  navSelector
})
</script>

<template>
  <div class="vd-ribbon-tab">
    <div :id="navId" class="vd-ribbon-tab__nav" />
    <div class="vd-ribbon-tab__panel">
      <slot />
    </div>
  </div>
</template>

<style lang="scss">
.vd-ribbon-tab {
  background: var(--vd-ribbon-surface, #fff);
  border-bottom: 1px solid var(--vd-ribbon-border, #d8dce6);

  &__nav {
    display: flex;
    align-items: center;
    background: var(
      --vd-ribbon-topbar-bg,
      var(--tabs-bg-color, linear-gradient(180deg, #2a63c8 0%, #1f57b8 100%))
    );
    border-bottom: none;
    padding: 0 8px;
  }

  &__panel {
    background: #f1f1f1;
    min-height: 66px;
    overflow-x: auto;
    overflow-y: hidden;
    box-shadow: inset 0 -1px 0 var(--vd-ribbon-shadow, #e6eaf2);
  }
}
</style>
