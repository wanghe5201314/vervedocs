<template>
  <div class="multi-position-panel">
    <el-button-group class="row">
      <el-tooltip content="左对齐" :show-after="500" :hide-after="0">
        <el-button style="flex: 1;" @click="alignElement('left')"><IconAlignLeft /></el-button>
      </el-tooltip>
      <el-tooltip content="水平居中" :show-after="500" :hide-after="0">
        <el-button style="flex: 1;" @click="alignElement('horizontal')"><IconAlignHorizontally /></el-button>
      </el-tooltip>
      <el-tooltip content="右对齐" :show-after="500" :hide-after="0">
        <el-button style="flex: 1;" @click="alignElement('right')"><IconAlignRight /></el-button>
      </el-tooltip>
    </el-button-group>
    <el-button-group class="row">
      <el-tooltip content="上对齐" :show-after="500" :hide-after="0">
        <el-button style="flex: 1;" @click="alignElement('top')"><IconAlignTop /></el-button>
      </el-tooltip>
      <el-tooltip content="垂直居中" :show-after="500" :hide-after="0">
        <el-button style="flex: 1;" @click="alignElement('vertical')"><IconAlignVertically /></el-button>
      </el-tooltip>
      <el-tooltip content="下对齐" :show-after="500" :hide-after="0">
        <el-button style="flex: 1;" @click="alignElement('bottom')"><IconAlignBottom /></el-button>
      </el-tooltip>
    </el-button-group>
    <el-button-group class="row" v-if="displayItemCount > 2">
      <el-button style="flex: 1;" @click="uniformHorizontalDisplay()">水平均匀分布</el-button>
      <el-button style="flex: 1;" @click="uniformVerticalDisplay()">垂直均匀分布</el-button>
    </el-button-group>

    <el-divider />

    <el-button-group class="row">
      <el-button :disabled="!canCombine" @click="combineElements()" style="flex: 1;"><IconGroup style="margin-right: 3px;" />组合</el-button>
      <el-button :disabled="canCombine" @click="uncombineElements()" style="flex: 1;"><IconUngroup style="margin-right: 3px;" />取消组合</el-button>
    </el-button-group>
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
