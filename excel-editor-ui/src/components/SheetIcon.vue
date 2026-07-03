<script setup lang="ts">
import { computed } from 'vue'
import { resolveSheetIcon } from '../utils/sheet-icons'

const props = withDefaults(defineProps<{
  name: string
  size?: string | number
}>(), {
  size: undefined
})

const pathData = computed(() => resolveSheetIcon(props.name) ?? '')
const sizeStyle = computed(() => {
  if (props.size == null) return undefined
  const s = typeof props.size === 'number' ? `${props.size}px` : props.size
  return { width: s, height: s }
})
</script>

<template>
  <svg
    class="mdi-icon"
    viewBox="0 0 24 24"
    :style="sizeStyle"
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
  >
    <path :d="pathData" fill="currentColor" />
  </svg>
</template>
