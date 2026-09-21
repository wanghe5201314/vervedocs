<script setup lang="ts">
import { inject } from 'vue'
import { RIBBON_TAB_ITEM_CONTEXT_KEY } from './context'

const item = inject(RIBBON_TAB_ITEM_CONTEXT_KEY)
if (!item) {
  throw new Error('VdRibbonTabTitle must be used inside VdRibbonTabItem')
}
</script>

<template>
  <span class="vd-ribbon-tab__title">
    <slot />
  </span>
</template>

<style lang="scss">
.vd-ribbon-tab__title {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  line-height: 1;
  white-space: nowrap;
}
</style>
