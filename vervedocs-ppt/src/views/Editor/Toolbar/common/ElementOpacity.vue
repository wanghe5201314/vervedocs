<template>
  <div class="element-opacity">
    <div class="row">
      <div style="flex: 2;">不透明度：</div>
      <el-slider
        class="slider"
        :min="0"
        :max="1"
        :step="0.1"
        :model-value="opacity"
        @change="(value: number) => updateOpacity(value)" 
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore } from '@/store'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'

export default defineComponent({
  name: 'element-opacity',
  setup() {
    const slidesStore = useSlidesStore()
    const { handleElement } = storeToRefs(useMainStore())

    const opacity = ref<number>(1)

    watch(handleElement, () => {
      if (!handleElement.value) return
      opacity.value = 'opacity' in handleElement.value && handleElement.value.opacity !== undefined ? handleElement.value.opacity : 1
    }, { deep: true, immediate: true })

    const { addHistorySnapshot } = useHistorySnapshot()

    const updateOpacity = (value: number) => {
      if (!handleElement.value) return
      const props = { opacity: value }
      slidesStore.updateElement({ id: handleElement.value.id, props })
      addHistorySnapshot()
    }

    return {
      opacity,
      updateOpacity,
    }
  },
})
</script>

<style scoped>
.element-opacity {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
}
.row {
  width: 100%;
  display: flex;
  align-items: center;
  font-size: 12px;
  padding-top: 10px;
  color: #5f6368;
}
.slider {
  flex: 3;
}
</style>
