<template>
  <div class="toolbar">
    <div class="tabs">
      <div 
        v-for="tab in currentTabs" 
        :key="tab.value"
        class="tab"
        :class="{ 'active': tab.value === toolbarState }"
        @click="setToolbarState(tab.value)"
      >{{ tab.label }}</div>
    </div>
    <div class="content">
      <component :is="currentPanelComponent"></component>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore } from '@/store'
import { ToolbarStates } from '@/types/toolbar'

import ElementStylePanel from './ElementStylePanel/index.vue'
import ElementPositionPanel from './ElementPositionPanel.vue'
import ElementAnimationPanel from './ElementAnimationPanel.vue'
import SlideDesignPanel from './SlideDesignPanel.vue'
import SlideAnimationPanel from './SlideAnimationPanel.vue'
import MultiPositionPanel from './MultiPositionPanel.vue'
import SymbolPanel from './SymbolPanel.vue'

export interface ElementTabs {
  label: string;
  value: ToolbarStates;
}

export default defineComponent({
  name: 'toolbar',
  setup() {
    const mainStore = useMainStore()
    const { activeElementIdList, handleElement, toolbarState } = storeToRefs(mainStore)

    const elementTabs = computed<ElementTabs[]>(() => {
      if (handleElement.value?.type === 'text') {
        return [
          { label: '样式', value: ToolbarStates.EL_STYLE },
          { label: '符号', value: ToolbarStates.SYMBOL },
          { label: '位置', value: ToolbarStates.EL_POSITION },
          { label: '动画', value: ToolbarStates.EL_ANIMATION },
        ]
      }
      return [
        { label: '样式', value: ToolbarStates.EL_STYLE },
        { label: '位置', value: ToolbarStates.EL_POSITION },
        { label: '动画', value: ToolbarStates.EL_ANIMATION },
      ]
    })
    const slideTabs = [
      { label: '设计', value: ToolbarStates.SLIDE_DESIGN },
      { label: '切换', value: ToolbarStates.SLIDE_ANIMATION },
      { label: '动画', value: ToolbarStates.EL_ANIMATION },
    ]
    const multiSelectTabs = [
      { label: '样式', value: ToolbarStates.EL_STYLE },
      { label: '位置', value: ToolbarStates.MULTI_POSITION },
    ]

    const setToolbarState = (value: ToolbarStates) => {
      mainStore.setToolbarState(value)
    }

    const currentTabs = computed(() => {
      if (!activeElementIdList.value.length) return slideTabs
      else if (activeElementIdList.value.length > 1) return multiSelectTabs
      return elementTabs.value
    })

    watch(currentTabs, () => {
      const currentTabsValue: ToolbarStates[] = currentTabs.value.map(tab => tab.value)
      if (!currentTabsValue.includes(toolbarState.value)) {
        mainStore.setToolbarState(currentTabsValue[0])
      }
    })

    const currentPanelComponent = computed(() => {
      const panelMap = {
        [ToolbarStates.EL_STYLE]: ElementStylePanel,
        [ToolbarStates.EL_POSITION]: ElementPositionPanel,
        [ToolbarStates.EL_ANIMATION]: ElementAnimationPanel,
        [ToolbarStates.SLIDE_DESIGN]: SlideDesignPanel,
        [ToolbarStates.SLIDE_ANIMATION]: SlideAnimationPanel,
        [ToolbarStates.MULTI_POSITION]: MultiPositionPanel,
        [ToolbarStates.SYMBOL]: SymbolPanel,
      }
      return panelMap[toolbarState.value] || null
    })

    return {
      toolbarState,
      currentTabs,
      setToolbarState,
      currentPanelComponent,
    }
  },
})
</script>

<style scoped>
.toolbar {
  border-left: solid 1px #e2e6ed;
  background-color: #fff;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.tabs {
  display: flex;
  align-items: stretch;
  padding: 0 8px;
  height: 44px;
  border-bottom: 1px solid #e2e6ed;
  background: #f8f9fa;
  flex-shrink: 0;
  gap: 4px;
}

.tab {
  flex: 1;
  border: none;
  background: transparent;
  color: #5f6368;
  font-size: 12px;
  font-weight: 500;
  padding: 0 12px;
  cursor: pointer;
  position: relative;
  transition: background-color 0.2s, color 0.2s;
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px 4px 0 0;
  letter-spacing: 0.3px;
  user-select: none;
}

.tab:hover {
  background: rgba(26, 115, 232, 0.1);
  color: #1a73e8;
}

.tab.active {
  color: #1a73e8;
  background: #fff;
}

.tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: #1a73e8;
  pointer-events: none;
}

.content {
  flex: 1;
  padding: 20px 16px;
  font-size: 13px;
  overflow-y: auto;
  min-height: 0;
  background: #fff;
}

.content::-webkit-scrollbar {
  width: 4px;
}

.content::-webkit-scrollbar-thumb {
  background: #d9d9d9;
  border-radius: 4px;
}

.content::-webkit-scrollbar-thumb:hover {
  background: #bbb;
}

.content::-webkit-scrollbar-track {
  background: transparent;
}
</style>
