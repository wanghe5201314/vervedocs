<template>
  <div class="audio-style-panel">
    <div class="row">
      <div style="flex: 2;">图标颜色：</div>
      <a-popover trigger="click">
        <template #content>
          <ColorPicker
            :modelValue="(handleElement as any)?.color"
            @update:modelValue="(value: any) => updateAudio({ color: value })"
          />
        </template>
        <ColorButton :color="(handleElement as any)?.color || ''" style="flex: 3;" />
      </a-popover>
    </div>

    <div class="row switch-row">
      <div style="flex: 2;">自动播放：</div>
      <div class="switch-wrapper" style="flex: 3;">
        <a-switch 
          :checked="(handleElement as any)?.autoplay" 
          @change="(checked: any) => updateAudio({ autoplay: checked })" 
        />
      </div>
    </div>

    <div class="row switch-row">
      <div style="flex: 2;">循环播放：</div>
      <div class="switch-wrapper" style="flex: 3;">
        <a-switch 
          :checked="(handleElement as any)?.loop" 
          @change="(checked: any) => updateAudio({ loop: checked })" 
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore } from '@/store'
import { PPTAudioElement } from '@/types/slides'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'

import ColorButton from '../common/ColorButton.vue'

export default defineComponent({
  name: 'audio-style-panel',
  components: {
    ColorButton,
  },
  setup() {
    const slidesStore = useSlidesStore()
    const { handleElement } = storeToRefs(useMainStore())

    const { addHistorySnapshot } = useHistorySnapshot()

    const updateAudio = (props: Partial<PPTAudioElement>) => {
      if (!handleElement.value) return
      slidesStore.updateElement({ id: handleElement.value.id, props })
      addHistorySnapshot()
    }

    return {
      handleElement,
      updateAudio,
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
.switch-row {
  height: 32px;
}
.switch-wrapper {
  text-align: right;
}
</style>
