<script setup lang="ts">
import VdIcon from '../icon/VdIcon.vue'

defineOptions({ inheritAttrs: false })
withDefaults(defineProps<{
  type?: 'default' | 'primary' | 'link' | 'text' | 'dashed'
  htmlType?: 'button' | 'submit' | 'reset'
  size?: 'small' | 'middle' | 'large'
  disabled?: boolean
  loading?: boolean
  icon?: string
  iconSize?: string | number
  iconWeight?: number
}>(), {
  type: 'default',
  htmlType: 'button',
  size: 'middle',
  disabled: false,
  loading: false
})
const emit = defineEmits<{ click: [event: MouseEvent] }>()
</script>

<template>
  <button
    v-bind="$attrs"
    class="vd-button"
    :class="[`vd-button--${type}`, `vd-button--${size}`]"
    :type="htmlType"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
    @click="!disabled && !loading && emit('click', $event)"
  >
    <svg v-if="loading" class="vd-button__spinner" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="28 10" />
    </svg>
    <template v-else-if="$slots.icon || icon">
      <slot name="icon">
        <VdIcon :name="icon" :size="iconSize" :weight="iconWeight" />
      </slot>
    </template>
    <slot />
  </button>
</template>

<style scoped>
.vd-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 28px;
  padding: 3px 12px;
  box-sizing: border-box;
  border: 1px solid #adadad;
  border-radius: 0;
  background: #fff;
  color: #222;
  font: inherit;
  font-size: 13px;
  line-height: 20px;
  cursor: pointer;
}
.vd-button:hover:not(:disabled) {
  border-color: #777;
  background: #dedede;
}
.vd-button:active:not(:disabled) {
  background: #ccc;
}
.vd-button--primary,
.vd-button--primary:hover:not(:disabled),
.vd-button--primary:active:not(:disabled) {
  border-color: #1f57b8;
  background: #1f57b8;
  color: #fff;
}
.vd-button--link,
.vd-button--text {
  border-color: transparent;
  background: transparent;
}
.vd-button--link {
  color: #1f57b8;
}
.vd-button--link:hover:not(:disabled) {
  border-color: transparent;
  background: transparent;
  text-decoration: underline;
}
.vd-button--dashed {
  border-style: dashed;
}
.vd-button--small {
  min-height: 24px;
  padding: 1px 8px;
  font-size: 12px;
}
.vd-button--large {
  min-height: 34px;
  padding: 6px 16px;
}
.vd-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.vd-button:focus-visible {
  outline: 2px solid #1f57b8;
  outline-offset: 2px;
}
.vd-button__spinner {
  flex-shrink: 0;
  animation: vd-button-spin 0.8s linear infinite;
}
@keyframes vd-button-spin {
  to { transform: rotate(360deg); }
}
</style>
