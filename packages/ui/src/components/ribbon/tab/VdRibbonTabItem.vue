<script setup lang="ts">
import { computed, inject, provide, toRef, ref } from 'vue'
import { Dropdown as ADropdown } from 'ant-design-vue'
import { provideRibbonButtonDefaults, type RibbonButtonAppearance } from '../button/context'
import {
  RIBBON_TAB_CONTEXT_KEY,
  RIBBON_TAB_ITEM_CONTEXT_KEY,
  type RibbonTabMode
} from './context'

const props = withDefaults(
  defineProps<{
    /** Tab identity (Vue reserved `key` cannot be used as a prop). */
    itemKey: string
    title?: string
    mode?: RibbonTabMode
    disabled?: boolean
    /** Overrides ribbon defaults for buttons in this tab only. */
    buttonDefaults?: RibbonButtonAppearance
  }>(),
  {
    title: undefined,
    mode: 'panel',
    disabled: false
  }
)

provideRibbonButtonDefaults(() => props.buttonDefaults)

const tab = inject(RIBBON_TAB_CONTEXT_KEY)
if (!tab) {
  throw new Error('VdRibbonTabItem must be used inside VdRibbonTab')
}

const dropdownOpen = ref(false)
const navTo = computed(() => tab.navSelector.value)

const isActive = computed(() => {
  if (props.mode === 'dropdown') return dropdownOpen.value
  return tab.activeKey.value === props.itemKey
})

const activate = () => {
  if (props.disabled) return
  if (props.mode === 'dropdown') return
  tab.setActiveKey(props.itemKey)
}

const onTabClick = () => {
  activate()
}

const onTabHover = () => {
  if (!props.disabled && props.mode === 'panel') tab.previewTab(props.itemKey)
}

const onDropdownOpenChange = (open: boolean) => {
  if (props.disabled) {
    dropdownOpen.value = false
    return
  }
  dropdownOpen.value = open
}

provide(RIBBON_TAB_ITEM_CONTEXT_KEY, {
  itemKey: props.itemKey,
  disabled: toRef(props, 'disabled'),
  mode: toRef(props, 'mode'),
  isActive,
  activate
})
</script>

<template>
  <Teleport defer :to="navTo">
    <ADropdown
      v-if="mode === 'dropdown'"
      :trigger="['click']"
      :disabled="disabled"
      placement="bottomLeft"
      @openChange="onDropdownOpenChange"
    >
      <div
        class="vd-ribbon-tab__tab vd-ribbon-tab__tab--dropdown"
        :class="{
          'vd-ribbon-tab__tab--active': isActive,
          'vd-ribbon-tab__tab--disabled': disabled
        }"
        role="button"
        :aria-disabled="disabled || undefined"
      >
        <slot name="title">
          <span class="vd-ribbon-tab__tab-label">{{ title }}</span>
        </slot>
      </div>
      <template #overlay>
        <slot />
      </template>
    </ADropdown>

    <div
      v-else
      class="vd-ribbon-tab__tab"
      :class="{
        'vd-ribbon-tab__tab--active': isActive,
        'vd-ribbon-tab__tab--disabled': disabled
      }"
      role="tab"
      :aria-selected="isActive"
      :aria-disabled="disabled || undefined"
      tabindex="0"
      @mouseenter="onTabHover"
      @click="onTabClick"
      @keydown.enter.prevent="onTabClick"
      @keydown.space.prevent="onTabClick"
    >
      <slot name="title">
        <span class="vd-ribbon-tab__tab-label">{{ title }}</span>
      </slot>
    </div>
  </Teleport>

  <div v-if="mode === 'panel' && isActive" class="vd-ribbon-tab__item-panel">
    <slot />
  </div>
</template>

<style lang="scss">
.vd-ribbon-tab__tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  min-width: 52px;
  padding: 0 12px;
  cursor: pointer;
  font-size: 13px;
  color: var(--vd-ribbon-topbar-text, rgba(255, 255, 255, 0.94));
  border-radius: 4px 4px 0 0;
  position: relative;
  user-select: none;
  transition: background-color 0.15s, color 0.15s, opacity 0.15s;

  &:hover:not(.vd-ribbon-tab__tab--disabled) {
    background: var(--vd-ribbon-topbar-hover, rgba(255, 255, 255, 0.12));
    color: var(--vd-ribbon-topbar-text, #fff);
  }

  &--active {
    background: var(--vd-ribbon-surface, #fff);
    color: var(--vd-ribbon-active-text, #1f57b8);

    &:hover:not(.vd-ribbon-tab__tab--disabled) {
      background: var(--vd-ribbon-surface, #fff);
      color: var(--vd-ribbon-active-text, #1f57b8);
    }
  }

  &--disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  &--dropdown {
    min-width: 48px;
    margin-right: 4px;
    background: var(--vd-ribbon-file-tab-bg, rgba(0, 0, 0, 0.16));
    border-radius: 3px 3px 0 0;

    &:hover:not(.vd-ribbon-tab__tab--disabled) {
      background: var(--vd-ribbon-file-tab-hover, rgba(0, 0, 0, 0.22));
    }

    &.vd-ribbon-tab__tab--active {
      background: var(--vd-ribbon-surface, #fff);
      color: var(--vd-ribbon-active-text, #1f57b8);
    }
  }
}

.vd-ribbon-tab__tab-label {
  line-height: 1;
  white-space: nowrap;
}

.vd-ribbon-tab__item-panel {
  display: contents;
}
</style>
