<template>
  <button
    ref="buttonRef"
    class="ribbon-btn"
    :class="[
      size === 'large' ? 'ribbon-btn-lg' : 'ribbon-btn-sm',
      { active: active, disabled: disabled }
    ]"
    :disabled="disabled"
    :title="title"
    @click="handleClick"
  >
    <span class="ribbon-btn-icon" v-if="$slots.icon || icon">
      <slot name="icon">
        <VIcon :name="icon || ''" />
      </slot>
    </span>
    <span class="ribbon-btn-text" v-if="text || $slots.default">
      <slot>{{ text }}</slot>
    </span>
    <span class="ribbon-btn-arrow" v-if="hasArrow">
      <VIcon name="chevron-down" />
    </span>
    <span class="ribbon-btn-color-bar" v-if="colorBar" :style="{ backgroundColor: colorBar }"></span>
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { VIcon } from '@vervedoc/icons'

const props = withDefaults(defineProps<{
  icon?: string
  text?: string
  title?: string
  size?: 'small' | 'large'
  active?: boolean
  disabled?: boolean
  hasArrow?: boolean
  colorBar?: string
  command?: string
  commandArgs?: any
}>(), {
  size: 'small',
  active: false,
  disabled: false,
  hasArrow: false
})

const emit = defineEmits<{
  (e: 'command', cmd: string, ...args: any[]): void
  (e: 'click'): void
}>()

/** 按钮元素引用 */
const buttonRef = ref<any>(null)

/** 处理按钮点击：禁用时不触发，有 command 时触发 command 事件并派发 ribbon-command 自定义事件 */
const handleClick = () => {
  if (props.disabled) return
  if (props.command) {
    if (props.commandArgs !== undefined) {
      emit('command', props.command, props.commandArgs)
      buttonRef.value?.dispatchEvent(new window.CustomEvent('ribbon-command', {
        bubbles: true,
        detail: { cmd: props.command, args: [props.commandArgs] }
      }))
    } else {
      emit('command', props.command)
      buttonRef.value?.dispatchEvent(new window.CustomEvent('ribbon-command', {
        bubbles: true,
        detail: { cmd: props.command, args: [] }
      }))
    }
  }
  emit('click')
}
</script>

<style scoped>
.ribbon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: var(--app-ribbon-text, #3c4043);
  transition: background-color 0.15s, border-color 0.15s, color 0.15s;
  position: relative;
  padding: 0 5px;
  font-family: inherit;
  align-self: center;
}
.ribbon-btn:hover {
  background: var(--app-ribbon-hover-bg, #edf2fb);
  color: var(--app-ribbon-text, #202124);
}
.ribbon-btn.active {
  background: var(--app-ribbon-active-bg, #dce8ff);
  color: var(--app-ribbon-active-text, #1f57b8);
}
.ribbon-btn:active {
  background: var(--app-ribbon-active-bg, #dce8ff);
}
.ribbon-btn.disabled,
.ribbon-btn:disabled {
  color: #c0c4cc !important;
  cursor: not-allowed !important;
  opacity: 0.55;
}
.ribbon-btn.disabled:hover,
.ribbon-btn:disabled:hover {
  background: transparent !important;
}

/* 小按钮：横向排列，图标+文字 */
.ribbon-btn-sm {
  min-width: 24px;
  height: 24px;
  padding: 0 5px;
}
.ribbon-btn-sm .ribbon-btn-icon :deep(svg),
.ribbon-btn-sm .ribbon-btn-icon :deep(i) {
  font-size: 20px;
}
.ribbon-btn-sm .ribbon-btn-text {
  font-size: 11px;
}

/* 大按钮：纵向排列，图标在上文字在下 */
.ribbon-btn-lg {
  flex-direction: column;
  min-width: 42px;
  height: 50px;
  padding: 4px 3px;
  gap: 1px;
  justify-content: flex-start;
}
.ribbon-btn-lg .ribbon-btn-icon :deep(svg),
.ribbon-btn-lg .ribbon-btn-icon :deep(i) {
  font-size: 18px;
}
.ribbon-btn-lg .ribbon-btn-text {
  font-size: 11px;
  line-height: 1.2;
  text-align: center;
  min-height: 14px;
  display: inline-flex;
  align-items: flex-start;
}

/* 箭头 */
.ribbon-btn-arrow {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  color: #80868b;
  margin-left: -2px;
}

/* 颜色条（字体颜色/高亮按钮底部色条） */
.ribbon-btn-color-bar {
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 12px;
  height: 3px;
  border-radius: 1px;
}
</style>
