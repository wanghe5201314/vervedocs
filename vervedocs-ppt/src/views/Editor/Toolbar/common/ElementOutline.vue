<template>
  <div class="element-outline">
    <div class="row" v-if="!fixed">
      <div style="flex: 2;">启用边框：</div>
      <div class="switch-wrapper" style="flex: 3;">
        <a-switch 
          :checked="hasOutline" 
          @change="(checked: boolean) => toggleOutline(checked)" 
        />
      </div>
    </div>
    <template v-if="hasOutline">
      <div class="row">
        <div style="flex: 2;">边框样式：</div>
        <a-select 
          style="flex: 3;" 
          :value="outline?.style" 
          @change="(value: any) => updateOutline({ style: value as 'dashed' | 'solid' })"
        >
          <a-select-option value="solid">实线边框</a-select-option>
          <a-select-option value="dashed">虚线边框</a-select-option>
        </a-select>
      </div>
      <div class="row">
        <div style="flex: 2;">边框颜色：</div>
        <a-popover trigger="click" :width="'auto'">
          <template #content>
            <ColorPicker
              :modelValue="outline?.color"
              @update:modelValue="(value: any) => updateOutline({ color: value })"
            />
          </template>
          <ColorButton :color="outline?.color || ''" style="flex: 3;" />
        </a-popover>
      </div>
      <div class="row">
        <div style="flex: 2;">边框粗细：</div>
        <a-input-number 
          :value="outline?.width" 
          @change="(value: number) => updateOutline({ width: value })" 
          style="flex: 3;"
        />
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore } from '@/store'
import { PPTElementOutline } from '@/types/slides'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'

import ColorButton from './ColorButton.vue'

export default defineComponent({
  name: 'element-outline',
  components: {
    ColorButton,
  },
  props: {
    fixed: {
      type: Boolean,
      default: false,
    },
  },
  setup() {
    const slidesStore = useSlidesStore()
    const { handleElement } = storeToRefs(useMainStore())

    const outline = ref<PPTElementOutline>()
    const hasOutline = ref(false)

    watch(handleElement, () => {
      if (!handleElement.value) return
      outline.value = 'outline' in handleElement.value ? handleElement.value.outline : undefined
      hasOutline.value = !!outline.value
    }, { deep: true, immediate: true })

    const { addHistorySnapshot } = useHistorySnapshot()

    const updateOutline = (outlineProps: Partial<PPTElementOutline>) => {
      if (!handleElement.value) return
      const props = { outline: { ...outline.value, ...outlineProps } }
      slidesStore.updateElement({ id: handleElement.value.id, props })
      addHistorySnapshot()
    }

    const toggleOutline = (checked: boolean) => {
      if (!handleElement.value) return
      if (checked) {
        const _outline: PPTElementOutline = { width: 2, color: '#000', style: 'solid' }
        slidesStore.updateElement({ id: handleElement.value.id, props: { outline: _outline } })
      }
      else {
        slidesStore.removeElementProps({ id: handleElement.value.id, propName: 'outline' })
      }
      addHistorySnapshot()
    }

    return {
      outline,
      hasOutline,
      toggleOutline,
      updateOutline,
    }
  },
})
</script>

<style scoped>
.element-outline {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
}
.row {
  width: 100%;
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  font-size: 12px;
  color: #5f6368;
}
.row:last-child {
  margin-bottom: 0;
}
.switch-wrapper {
  text-align: right;
}
</style>
