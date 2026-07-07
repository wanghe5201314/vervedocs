<template>
  <div class="line-style-panel">
    <div class="row">
      <div style="flex: 2;">线条样式：</div>
      <el-select 
        style="flex: 3;" 
        :model-value="(handleElement as any)?.style" 
        @change="(value: any) => updateLine({ style: value })"
      >
        <el-option value="solid" label="实线" />
        <el-option value="dashed" label="虚线" />
      </el-select>
    </div>
    <div class="row">
      <div style="flex: 2;">线条颜色：</div>
      <el-popover trigger="click">
        <ColorPicker
          :modelValue="(handleElement as any)?.color"
          @update:modelValue="(value: any) => updateLine({ color: value })"
        />
        <template #reference>
          <ColorButton :color="(handleElement as any)?.color || ''" style="flex: 3;" />
        </template>
      </el-popover>
    </div>
    <div class="row">
      <div style="flex: 2;">线条宽度：</div>
      <el-input-number 
        :model-value="(handleElement as any)?.width" 
        @change="(value: any) => updateLine({ width: value })" 
        style="flex: 3;"
        controls-position="right"
      />
    </div>
    
    <div class="row">
      <div style="flex: 2;">起点样式：</div>
      <el-select 
        style="flex: 3;" 
        :model-value="(handleElement as any)?.points?.[0]" 
        @change="(value: any) => updateLine({ points: [value, (handleElement as any)?.points?.[1]] })"
      >
        <el-option value="" label="无" />
        <el-option value="arrow" label="箭头" />
        <el-option value="dot" label="圆点" />
      </el-select>
    </div>
    <div class="row">
      <div style="flex: 2;">终点样式：</div>
      <el-select 
        style="flex: 3;" 
        :model-value="(handleElement as any)?.points?.[1]" 
        @change="(value: any) => updateLine({ points: [(handleElement as any)?.points?.[0], value] })"
      >
        <el-option value="" label="无" />
        <el-option value="arrow" label="箭头" />
        <el-option value="dot" label="圆点" />
      </el-select>
    </div>

    <el-divider />
    <ElementShadow />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore } from '@/store'
import { PPTLineElement } from '@/types/slides'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'

import ElementShadow from '../common/ElementShadow.vue'
import ColorButton from '../common/ColorButton.vue'

export default defineComponent({
  name: 'line-style-panel',
  components: {
    ElementShadow,
    ColorButton,
  },
  setup() {
    const slidesStore = useSlidesStore()
    const { handleElement } = storeToRefs(useMainStore())

    const { addHistorySnapshot } = useHistorySnapshot()

    const updateLine = (props: Partial<PPTLineElement>) => {
      if (!handleElement.value) return
      slidesStore.updateElement({ id: handleElement.value.id, props })
      addHistorySnapshot()
    }

    return {
      handleElement,
      updateLine,
    }
  }
})
</script>

<style  scoped>
.row {
  width: 100%;
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}
.line-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 !important;

  .line-wrapper {
    margin-left: 8px;
  }
}
.line-wrapper {
  overflow: visible;
}
.line-btn-icon {
  width: 30px;
  font-size: 12px;
  margin-top: 2px;
  color: #bfbfbf;
}
.preset-point-style {
  padding: 0 10px;

  & + .preset-point-style {
    margin-top: 10px;
  }
}
</style>