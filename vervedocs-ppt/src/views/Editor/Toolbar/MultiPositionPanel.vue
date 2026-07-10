<template>
  <div class="multi-position-panel">
    <a-button-group class="row">
      <a-tooltip title="左对齐">
        <a-button style="flex: 1;" @click="alignElement('left')"><IconAlignLeft /></a-button>
      </a-tooltip>
      <a-tooltip title="水平居中">
        <a-button style="flex: 1;" @click="alignElement('horizontal')"><IconAlignHorizontally /></a-button>
      </a-tooltip>
      <a-tooltip title="右对齐">
        <a-button style="flex: 1;" @click="alignElement('right')"><IconAlignRight /></a-button>
      </a-tooltip>
    </a-button-group>
    <a-button-group class="row">
      <a-tooltip title="上对齐">
        <a-button style="flex: 1;" @click="alignElement('top')"><IconAlignTop /></a-button>
      </a-tooltip>
      <a-tooltip title="垂直居中">
        <a-button style="flex: 1;" @click="alignElement('vertical')"><IconAlignVertically /></a-button>
      </a-tooltip>
      <a-tooltip title="下对齐">
        <a-button style="flex: 1;" @click="alignElement('bottom')"><IconAlignBottom /></a-button>
      </a-tooltip>
    </a-button-group>
    <a-button-group class="row" v-if="displayItemCount > 2">
      <a-button style="flex: 1;" @click="uniformHorizontalDisplay()">水平均匀分布</a-button>
      <a-button style="flex: 1;" @click="uniformVerticalDisplay()">垂直均匀分布</a-button>
    </a-button-group>

    <a-divider />

    <a-button-group class="row">
      <a-button :disabled="!canCombine" @click="combineElements()" style="flex: 1;"><IconGroup style="margin-right: 3px;" />组合</a-button>
      <a-button :disabled="canCombine" @click="uncombineElements()" style="flex: 1;"><IconUngroup style="margin-right: 3px;" />取消组合</a-button>
    </a-button-group>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { ElementAlignCommands } from '@/types/edit'
import useCombineElement from '@/hooks/useCombineElement'
import useAlignActiveElement from '@/hooks/useAlignActiveElement'
import useAlignElementToCanvas from '@/hooks/useAlignElementToCanvas'
import useUniformDisplayElement from '@/hooks/useUniformDisplayElement'

export default defineComponent({
  name: 'multi-position-panel',
  setup() {
    const { canCombine, combineElements, uncombineElements } = useCombineElement()
    const { alignActiveElement } = useAlignActiveElement()
    const { alignElementToCanvas } = useAlignElementToCanvas()
    const { displayItemCount, uniformHorizontalDisplay, uniformVerticalDisplay } = useUniformDisplayElement()

    const alignElement = (command: 'top' | 'bottom' | 'left' | 'right' | 'vertical' | 'horizontal' | 'center') => {
      if (canCombine.value) alignActiveElement(command as ElementAlignCommands)
      else alignElementToCanvas(command as ElementAlignCommands)
    }

    return {
      canCombine,
      displayItemCount,
      combineElements,
      uncombineElements,
      uniformHorizontalDisplay,
      uniformVerticalDisplay,
      alignElement,
    }
  },
})
</script>

<style  scoped>
.row {
  width: 100%;
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}
</style>
