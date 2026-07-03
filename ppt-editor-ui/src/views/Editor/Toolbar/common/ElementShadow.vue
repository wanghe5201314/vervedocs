<template>
  <div class="element-shadow">
    <div class="row">
      <div style="flex: 2;">启用阴影：</div>
      <div class="switch-wrapper" style="flex: 3;">
        <el-switch :model-value="hasShadow" @change="(checked: boolean) => toggleShadow(checked)" />
      </div>
    </div>
    <template v-if="hasShadow && shadow">
      <div class="row">
        <div style="flex: 2;">水平阴影：</div>
        <el-slider 
          class="slider"
          :min="-10" 
          :max="10" 
          :step="1" 
          :model-value="shadow.h" 
          @change="(value: number) => updateShadow({ h: value })"
        />
      </div>
      <div class="row">
        <div style="flex: 2;">垂直阴影：</div>
        <el-slider
          class="slider"
          :min="-10"
          :max="10"
          :step="1"
          :model-value="shadow.v"
          @change="(value: number) => updateShadow({ v: value })"
        />
      </div>
      <div class="row">
        <div style="flex: 2;">模糊距离：</div>
        <el-slider
          class="slider"
          :min="1"
          :max="20"
          :step="1"
          :model-value="shadow.blur"
          @change="(value: number) => updateShadow({ blur: value })"
        />
      </div>
      <div class="row">
        <div style="flex: 2;">阴影颜色：</div>
        <el-popover trigger="click" :width="'auto'">
          <ColorPicker
            :modelValue="shadow.color"
            @update:modelValue="(value: any) => updateShadow({ color: value })"
          />
          <template #reference>
            <ColorButton :color="shadow.color" style="flex: 3;" />
          </template>
        </el-popover>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore } from '@/store'
import { PPTElementShadow } from '@/types/slides'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'

import ColorButton from './ColorButton.vue'

export default defineComponent({
  name: 'element-shadow',
  components: {
    ColorButton,
  },
  setup() {
    const slidesStore = useSlidesStore()
    const { handleElement } = storeToRefs(useMainStore())

    const shadow = ref<PPTElementShadow>()
    const hasShadow = ref(false)

    watch(handleElement, () => {
      if (!handleElement.value) return
      shadow.value = 'shadow' in handleElement.value ? handleElement.value.shadow : undefined
      hasShadow.value = !!shadow.value
    }, { deep: true, immediate: true })

    const { addHistorySnapshot } = useHistorySnapshot()

    const updateShadow = (shadowProps: Partial<PPTElementShadow>) => {
      if (!handleElement.value || !shadow.value) return
      const _shadow = { ...shadow.value, ...shadowProps }
      slidesStore.updateElement({ id: handleElement.value.id, props: { shadow: _shadow } })
      addHistorySnapshot()
    }

    const toggleShadow = (checked: boolean) => {
      if (!handleElement.value) return
      if (checked) {
        const _shadow: PPTElementShadow = { h: 1, v: 1, blur: 2, color: '#000' }
        slidesStore.updateElement({ id: handleElement.value.id, props: { shadow: _shadow } })
      }
      else {
        slidesStore.removeElementProps({ id: handleElement.value.id, propName: 'shadow' })
      }
      addHistorySnapshot()
    }

    return {
      shadow,
      hasShadow,
      toggleShadow,
      updateShadow,
    }
  },
})
</script>

<style scoped>
.element-shadow {
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
.slider {
  flex: 3;
}
</style>
