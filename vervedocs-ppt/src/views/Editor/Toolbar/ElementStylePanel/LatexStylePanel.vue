<template>
  <div class="latex-style-panel">
    <div class="row"><a-button style="flex: 1;" @click="latexEditorVisible = true">编辑 LaTeX</a-button></div>

    <a-divider />

    <div class="row">
      <div style="flex: 2;">颜色：</div>
      <a-popover trigger="click">
        <template #content>
          <ColorPicker
            :modelValue="(handleElement as any)?.color"
            @update:modelValue="(value: any) => updateLatex({ color: value })"
          />
        </template>
        <ColorButton :color="(handleElement as any)?.color || ''" style="flex: 3;" />
      </a-popover>
    </div>
    <div class="row">
      <div style="flex: 2;">粗细：</div>
      <a-input-number 
        :min="1"
        :max="3"
        :value="(handleElement as any)?.strokeWidth" 
        @change="(value: any) => updateLatex({ strokeWidth: value })" 
        style="flex: 3;"
      />
    </div>

    <a-modal
      v-model:open="latexEditorVisible" 
      :closable="true"
      :maskClosable="true"
      width="880px"
      :destroyOnClose="true"
      centered
    >
      <LaTeXEditor 
        :value="(handleElement as any)?.latex"
        @close="latexEditorVisible = false"
        @update="data => { updateLatexData(data); latexEditorVisible = false }"
      />
    </a-modal>
  </div>
</template>

<script lang="ts">
import { defineComponent, onUnmounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore } from '@/store'
import { PPTLatexElement } from '@/types/slides'
import emitter, { EmitterEvents } from '@/utils/emitter'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'

import ColorButton from '../common/ColorButton.vue'
import LaTeXEditor from '@/components/LaTeXEditor/index.vue'

export default defineComponent({
  name: 'latex-style-panel',
  components: {
    ColorButton,
    LaTeXEditor,
  },
  setup() {
    const slidesStore = useSlidesStore()
    const { handleElement } = storeToRefs(useMainStore())

    const latexEditorVisible = ref(false)

    const { addHistorySnapshot } = useHistorySnapshot()

    const updateLatex = (props: Partial<PPTLatexElement>) => {
      if (!handleElement.value) return
      slidesStore.updateElement({ id: handleElement.value.id, props })
      addHistorySnapshot()
    }

    const updateLatexData = (data: { path: string; latex: string; w: number; h: number; }) => {
      updateLatex({
        path: data.path,
        latex: data.latex,
        width: data.w,
        height: data.h,
        viewBox: [data.w, data.h],
      })
    }

    const openLatexEditor = () => latexEditorVisible.value = true

    emitter.on(EmitterEvents.OPEN_LATEX_EDITOR, openLatexEditor)
    onUnmounted(() => {
      emitter.off(EmitterEvents.OPEN_LATEX_EDITOR, openLatexEditor)
    })

    return {
      handleElement,
      latexEditorVisible,
      updateLatex,
      updateLatexData,
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
</style>
