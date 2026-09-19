<script setup lang="ts">
import { computed } from 'vue'
import { resolveMaterialIcon } from '@vervedoc/design'

const props = withDefaults(defineProps<{
  /** Icon name for class (font) mode */
  name?: string
  size?: string | number
  /** Material Symbols variable-font weight (100-700). */
  weight?: number
  /** Material Symbols optical size (20-48), independent of rendered size. */
  opticalSize?: number
  /**
   * Presentation mode. `svg` is reserved for a later SVG pipeline;
   * current implementation uses class/font icons.
   */
  mode?: 'class' | 'svg'
  /** Extra CSS class(es) applied to the icon element */
  iconClass?: string
}>(), {
  name: '',
  size: undefined,
  mode: 'class',
  iconClass: undefined
})

const iconName = computed(() => resolveMaterialIcon(props.name) ?? props.name)
const iconStyle = computed(() => ({
  fontSize: typeof props.size === 'number' ? `${props.size}px` : props.size,
  fontWeight: props.weight,
  // Leave unspecified axes at their font defaults.
  fontVariationSettings: [
    props.weight !== undefined ? `'wght' ${props.weight}` : '',
    props.opticalSize !== undefined ? `'opsz' ${props.opticalSize}` : ''
  ].filter(Boolean).join(', ') || undefined
}))
</script>

<template>
  <!-- Default: class/font icon. Slot allows custom SVG markup later. -->
  <slot>
    <i
      class="material-symbols-outlined vd-icon"
      :class="[iconClass, { 'vd-icon--auto': !size }]"
      :style="iconStyle"
    >{{ iconName }}</i>
  </slot>
</template>

<style lang="scss">
.vd-icon {
  display: inline-block;
  vertical-align: middle;
  line-height: 1;

  &--auto {
    font-size: 1.2em;
  }
}
</style>
