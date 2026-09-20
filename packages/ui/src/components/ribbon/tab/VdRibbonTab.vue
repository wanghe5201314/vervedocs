<script setup lang="ts">
import { computed, provide, ref, useId, watch } from 'vue'
import { ConfigProvider as AConfigProvider } from 'ant-design-vue'
import { RIBBON_TAB_CONTEXT_KEY } from './context'
import { provideRibbonButtonDefaults, type RibbonButtonAppearance } from '../button/context'

const props = defineProps<{
  activeKey?: string
  /** Shared appearance defaults for buttons in this ribbon. */
  buttonDefaults?: RibbonButtonAppearance
  /** Keep the panel in layout; otherwise reveal it temporarily on tab hover. */
  pinned?: boolean
}>()

provideRibbonButtonDefaults(() => props.buttonDefaults)

const emit = defineEmits<{
  'update:activeKey': [key: string]
}>()

const navId = `vd-ribbon-tab-nav-${useId().replace(/:/g, '')}`
const navSelector = ref(`#${navId}`)
const root = ref<HTMLDivElement>()
const pinned = computed(() => props.pinned !== false)
const previewOpen = ref(false)
const panelVisible = computed(() => pinned.value || previewOpen.value)
watch(pinned, () => { previewOpen.value = false })

const setActiveKey = (key: string) => {
  if (!pinned.value) previewOpen.value = true
  emit('update:activeKey', key)
}

const previewTab = (key: string) => {
  if (!pinned.value) setActiveKey(key)
}

const onMouseLeave = (event: MouseEvent) => {
  if (event.relatedTarget instanceof Node && root.value?.contains(event.relatedTarget)) return
  previewOpen.value = false
}

// Keep portalled dropdowns within the hover boundary, outside panel overflow.
const getPopupContainer = (trigger?: HTMLElement): HTMLElement =>
  root.value ?? trigger?.parentElement ?? document.body

provide(RIBBON_TAB_CONTEXT_KEY, {
  activeKey: computed(() => props.activeKey),
  setActiveKey,
  navSelector,
  previewTab
})
</script>

<template>
  <div
    ref="root"
    class="vd-ribbon-tab"
    :class="{ 'vd-ribbon-tab--floating': !pinned }"
    @mouseleave="onMouseLeave"
    @keydown.esc="previewOpen = false"
  >
    <AConfigProvider :get-popup-container="getPopupContainer">
      <div :id="navId" class="vd-ribbon-tab__nav" role="tablist" />
      <div v-show="panelVisible" class="vd-ribbon-tab__panel">
        <slot />
      </div>
    </AConfigProvider>
  </div>
</template>

<style lang="scss">
.vd-ribbon-tab {
  position: relative;
  background: var(--vd-ribbon-surface, #fff);
  border-bottom: 1px solid var(--vd-ribbon-border, #d8dce6);

  &--floating {
    z-index: 100;

    > .vd-ribbon-tab__panel {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16);
    }
  }

  &__nav {
    display: flex;
    align-items: center;
    background: var(
      --vd-ribbon-topbar-bg,
      var(--tabs-bg-color, linear-gradient(180deg, #2a63c8 0%, #1f57b8 100%))
    );
    border-bottom: none;
    padding: 0 8px;
  }

  &__panel {
    background: #f1f1f1;
    min-height: 66px;
    overflow-x: auto;
    overflow-y: hidden;
    box-shadow: inset 0 -1px 0 var(--vd-ribbon-shadow, #e6eaf2);
  }
}
</style>
