<script setup lang="ts">
import VdIcon from './VdIcon.vue'

withDefaults(defineProps<{
  name: string
  text?: string
  size?: string | number
  gap?: string
}>(), {
  text: '',
  size: undefined,
  gap: '6px'
})
</script>

<template>
  <span class="vd-icon-text">
    <span class="vd-icon-text__main" :style="{ gap }">
      <VdIcon :name="name" :size="size" />
      <span v-if="text" class="vd-icon-text__label">{{ text }}</span>
    </span>
    <slot />
  </span>
</template>

<style lang="scss">
.vd-icon-text {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;

  &__main {
    display: inline-flex;
    align-items: center;
    font-size: 13px;
    font-weight: 400;
  }

  &__label {
    white-space: nowrap;
  }
}
</style>
