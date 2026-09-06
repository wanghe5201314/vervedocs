<script setup lang="ts">
import { computed } from 'vue'
import { resolveMaterialIcon } from './material-icons-map'

const props = withDefaults(defineProps<{
  name: string
  size?: string | number
}>(), {
  size: undefined
})

const iconName = computed(() => resolveMaterialIcon(props.name) ?? props.name)
const sizeStyle = computed(() => {
  if (!props.size) return {}
  const s = typeof props.size === 'number' ? `${props.size}px` : props.size
  return { fontSize: s }
})
</script>

<template>
  <i class="material-symbols-outlined v-icon" :class="{ 'v-icon-auto': !props.size }" :style="sizeStyle">{{ iconName }}</i>
</template>

<style scoped>
.v-icon {
  display: inline-block;
  vertical-align: middle;
  line-height: 1;
}

.v-icon-auto {
  font-size: 1.2em;
}
</style>