<template>
  <span class="control-field-label">
    <span>{{ label }}</span>
    <Tooltip :title="help" :trigger="['hover', 'focus']" :mouse-enter-delay="0.15">
      <button type="button" class="control-field-help" :aria-label="label" @click.prevent>
        <VdIcon name="help_outline" :size="15" aria-hidden="true" />
      </button>
    </Tooltip>
  </span>
</template>

<script setup lang="ts">
import { Tooltip } from 'ant-design-vue'
import { VdIcon } from '@vervedoc/ui'

defineProps<{ label: string; help: string }>()
</script>

<style scoped>
.control-field-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.control-field-help {
  display: inline-flex;
  align-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: #8c8c8c;
  cursor: help;
  flex-shrink: 0;
}
.control-field-help:hover,
.control-field-help:focus-visible {
  color: #1677ff;
}
</style>
