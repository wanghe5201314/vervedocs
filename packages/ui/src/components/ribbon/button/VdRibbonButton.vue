<template>
  <button
    type="button"
    class="vd-ribbon-button"
    :class="[
      size === 'large' ? 'vd-ribbon-button--large' : 'vd-ribbon-button--small',
      {
        'vd-ribbon-button--active': active,
        'vd-ribbon-button--disabled': disabled
      }
    ]"
    :disabled="disabled"
    :title="title"
    @click="handleClick"
  >
    <span v-if="$slots.icon || icon" class="vd-ribbon-button__icon">
      <slot name="icon">
        <VdIcon :name="icon || ''" />
      </slot>
    </span>
    <span v-if="text || $slots.default" class="vd-ribbon-button__text">
      <slot>{{ text }}</slot>
    </span>
    <span v-if="hasArrow" class="vd-ribbon-button__arrow">
      <VdIcon name="chevron-down" />
    </span>
    <span
      v-if="colorBar"
      class="vd-ribbon-button__color-bar"
      :style="{ backgroundColor: colorBar }"
    />
  </button>
</template>

<script setup lang="ts">
import VdIcon from './VdIcon.vue'

const props = withDefaults(defineProps<{
  icon?: string
  text?: string
  title?: string
  size?: 'small' | 'large'
  active?: boolean
  disabled?: boolean
  hasArrow?: boolean
  colorBar?: string
}>(), {
  size: 'small',
  active: false,
  disabled: false,
  hasArrow: false
})

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const handleClick = (event: MouseEvent) => {
  if (props.disabled) return
  emit('click', event)
}
</script>

<style lang="scss">
.vd-ribbon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: var(--vd-radius-sm, 4px);
  cursor: pointer;
  color: var(--vd-ribbon-text, #3c4043);
  transition: background-color 0.15s, border-color 0.15s, color 0.15s;
  position: relative;
  padding: 0 5px;
  font-family: inherit;
  align-self: center;

  &:hover {
    background: var(--vd-ribbon-hover-bg, #edf2fb);
    color: var(--vd-ribbon-text, #202124);
  }

  &--active,
  &:active {
    background: var(--vd-ribbon-active-bg, #dce8ff);
  }

  &--active {
    color: var(--vd-ribbon-active-text, #1f57b8);
  }

  &--disabled,
  &:disabled {
    color: #c0c4cc !important;
    cursor: not-allowed !important;
    opacity: 0.55;

    &:hover {
      background: transparent !important;
    }
  }

  &--small {
    min-width: 24px;
    height: 24px;
    padding: 0 5px;

    .vd-ribbon-button__icon {
      :is(svg, i) {
        font-size: 20px;
      }
    }

    .vd-ribbon-button__text {
      font-size: 11px;
    }
  }

  &--large {
    flex-direction: column;
    min-width: 42px;
    height: 50px;
    padding: 4px 3px;
    gap: 1px;
    justify-content: flex-start;

    .vd-ribbon-button__icon {
      :is(svg, i) {
        font-size: 18px;
      }
    }

    .vd-ribbon-button__text {
      font-size: 11px;
      line-height: 1.2;
      text-align: center;
      min-height: 14px;
      display: inline-flex;
      align-items: flex-start;
    }
  }

  &__arrow {
    display: inline-flex;
    align-items: center;
    font-size: 11px;
    color: #80868b;
    margin-left: -2px;
  }

  &__color-bar {
    position: absolute;
    bottom: 2px;
    left: 50%;
    transform: translateX(-50%);
    width: 12px;
    height: 3px;
    border-radius: 1px;
  }
}
</style>
