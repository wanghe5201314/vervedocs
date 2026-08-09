<script setup lang="ts">
import VIcon from './VIcon.vue'

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
  <span class="v-icon-text">
    <span class="v-icon-text__main" :style="{ gap }">
      <VIcon :name="name" :size="size" />
      <span v-if="text" class="v-icon-text__label">{{ text }}</span>
    </span>
    <slot />
  </span>
</template>

<style scoped>
.v-icon-text {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.v-icon-text__main {
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  font-weight: 400;
}

.v-icon-text__label {
  white-space: nowrap;
}
</style>