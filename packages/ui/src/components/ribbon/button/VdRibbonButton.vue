<template>
  <button
    type="button"
    class="vd-ribbon-button"
    :class="[
      `vd-ribbon-button--${appearance.size}`,
      `vd-ribbon-button--${appearance.variant}`,
      {
        'vd-ribbon-button--active': active,
        'vd-ribbon-button--disabled': disabled,
        'vd-ribbon-button--has-arrow': hasArrow
      }
    ]"
    :style="buttonStyle"
    :disabled="disabled"
    :title="title"
    :aria-label="title || text"
    :aria-pressed="active"
    @click="handleClick"
  >
    <span v-if="$slots.icon || icon" class="vd-ribbon-button__icon" :style="{ fontSize: cssSize(resolvedIconSize) }">
      <slot name="icon" :size="resolvedIconSize" :weight="resolvedIconWeight" :optical-size="resolvedOpticalSize">
        <VdIcon :name="icon || ''" :size="resolvedIconSize" :weight="resolvedIconWeight" :optical-size="resolvedOpticalSize" />
      </slot>
    </span>
    <span v-if="text || $slots.default" class="vd-ribbon-button__text">
      <slot>{{ text }}</slot>
    </span>
    <span v-if="hasArrow" class="vd-ribbon-button__arrow">
      <VdIcon v-if="!flatLarge" name="chevron-down" :size="appearance.size === 'compact' ? 12 : undefined" />
    </span>
    <span
      v-if="colorBar"
      class="vd-ribbon-button__color-bar"
      :style="{ backgroundColor: colorBar }"
    />
  </button>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import VdIcon from '../../icon/VdIcon.vue'
import { RIBBON_BUTTON_DEFAULTS_KEY, type RibbonButtonAppearance } from './context'

const props = withDefaults(defineProps<RibbonButtonAppearance & {
  icon?: string
  text?: string
  title?: string
  active?: boolean
  disabled?: boolean
  hasArrow?: boolean
  colorBar?: string
}>(), {
  disabled: false,
  hasArrow: false
})

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const defaults = inject(RIBBON_BUTTON_DEFAULTS_KEY, undefined)
const appearance = computed(() => {
  const inherited = defaults?.value
  return {
    size: props.size ?? inherited?.size ?? 'small',
    variant: props.variant ?? inherited?.variant ?? 'default',
    width: props.width ?? inherited?.width,
    height: props.height ?? inherited?.height,
    iconSize: props.iconSize ?? inherited?.iconSize,
    iconWeight: props.iconWeight ?? inherited?.iconWeight,
    iconOpticalSize: props.iconOpticalSize ?? inherited?.iconOpticalSize,
    textSize: props.textSize ?? inherited?.textSize
  }
})
const flatLarge = computed(() => appearance.value.variant === 'flat' && appearance.value.size === 'large')
const resolvedIconSize = computed(() => appearance.value.iconSize ?? (
  appearance.value.size === 'compact' ? 16 :
    appearance.value.variant === 'flat' ? (flatLarge.value ? 24 : 16) :
      appearance.value.size === 'large' ? 18 : 20
))
const resolvedIconWeight = computed(() => appearance.value.iconWeight ?? (flatLarge.value ? 300 : undefined))
const resolvedOpticalSize = computed(() => appearance.value.iconOpticalSize ?? (flatLarge.value ? 24 : undefined))
const cssSize = (value: string | number | undefined) => typeof value === 'number' ? `${value}px` : value
const buttonStyle = computed(() => ({
  width: cssSize(appearance.value.width),
  height: cssSize(appearance.value.height),
  '--vd-ribbon-button-text-size': cssSize(appearance.value.textSize)
}))

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

    .vd-ribbon-button__text {
      font-size: var(--vd-ribbon-button-text-size, 11px);
    }
  }

  &--large {
    flex-direction: column;
    min-width: 42px;
    height: 50px;
    padding: 4px 3px;
    gap: 1px;
    justify-content: flex-start;

    .vd-ribbon-button__text {
      font-size: var(--vd-ribbon-button-text-size, 11px);
      line-height: 1.2;
      text-align: center;
      min-height: 14px;
      display: inline-flex;
      align-items: flex-start;
    }
  }

  &__icon :is(svg, i) {
    font-size: inherit;
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

  &--flat {
    flex-shrink: 0;
    box-sizing: border-box;
    border-radius: 0;
    --vd-ribbon-text: #333;
    --vd-ribbon-hover-bg: #dedede;
    --vd-ribbon-active-bg: #d0d0d0;
    --vd-ribbon-active-text: #222;

    &.vd-ribbon-button--small {
      padding: 0 4px;
    }

    .vd-ribbon-button__text {
      font-size: var(--vd-ribbon-button-text-size, 12px);
      line-height: 16px;
      white-space: nowrap;
    }

    &.vd-ribbon-button--large {
      display: grid;
      grid-template-rows: 28px 16px 6px;
      justify-items: center;
      align-items: center;
      align-content: start;
      gap: 2px;
      min-width: 44px;
      height: 62px;
      padding: 3px 6px;

      .vd-ribbon-button__icon {
        grid-row: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
      }

      .vd-ribbon-button__text {
        grid-row: 2;
        display: block;
        min-height: 0;
        font-weight: 400;
      }

      .vd-ribbon-button__arrow {
        grid-row: 3;
        width: 5px;
        height: 5px;
        margin: -2px 0 0;
        border-right: 1px solid currentColor;
        border-bottom: 1px solid currentColor;
        transform: rotate(45deg);
        color: inherit;
      }
    }

    &.vd-ribbon-button--compact {
      --vd-ribbon-active-bg: #7f878c;
      --vd-ribbon-active-text: #fff;
    }
  }

  &--compact {
    flex: 0 0 auto;
    box-sizing: border-box;
    min-width: 0;
    width: 22px;
    height: 22px;
    padding: 2px;
    gap: 0;

    &:focus-visible {
      outline: 1px solid #666;
      outline-offset: 1px;
    }

    &.vd-ribbon-button--has-arrow {
      width: 32px;
      padding-right: 10px;
    }

    .vd-ribbon-button__icon {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .vd-ribbon-button__arrow {
      position: absolute;
      right: 0;
      top: 5px;
      margin: 0;
      color: inherit;
    }

    .vd-ribbon-button__color-bar {
      bottom: 1px;
      left: 3px;
      width: 14px;
      height: 3px;
      border-radius: 0;
      transform: none;
    }
  }
}
</style>
