<template>
  <div class="canvas-tool">
    <div class="left-handler">
      <a-tooltip :title="translate('canvasTool.undo')" :mouseEnterDelay="0.5" :mouseLeaveDelay="0">
        <IconBack class="handler-item" :class="{ 'disable': !canUndo }" @click="undo()" />
      </a-tooltip>
      <a-tooltip :title="translate('canvasTool.redo')" :mouseEnterDelay="0.5" :mouseLeaveDelay="0">
        <IconNext class="handler-item" :class="{ 'disable': !canRedo }" @click="redo()" />
      </a-tooltip>
    </div>

    <div class="add-element-handler">
      <a-tooltip :title="translate('canvasTool.insertText')" :mouseEnterDelay="0.5" :mouseLeaveDelay="0">
        <IconFontSize class="handler-item" :class="{ 'active': creatingElement?.type === 'text' }" @click="drawText()" />
      </a-tooltip>
      <FileInput @change="(files: any) => insertImageElement(files)">
        <a-tooltip :title="translate('canvasTool.insertImage')" :mouseEnterDelay="0.5" :mouseLeaveDelay="0">
          <IconPicture class="handler-item" />
        </a-tooltip>
      </FileInput>
      <a-popover trigger="click" :width="'auto'" placement="bottom-end" overlay-class-name="canvas-tool-popper">
        <template #content>
          <ShapePool @select="shape => drawShape(shape)" />
        </template>
        <template #default>
          <button class="handler-btn" type="button" :title="translate('canvasTool.insertShape')">
            <IconGraphicDesign class="handler-item" :class="{ 'active': creatingElement?.type === 'shape' }" />
          </button>
        </template>
      </a-popover>
      <a-popover trigger="click" :width="'auto'" placement="bottom-end" overlay-class-name="canvas-tool-popper">
        <template #content>
          <LinePool @select="line => drawLine(line)" />
        </template>
        <template #default>
          <button class="handler-btn" type="button" :title="translate('canvasTool.insertLine')">
            <IconConnection class="handler-item" :class="{ 'active': creatingElement?.type === 'line' }" />
          </button>
        </template>
      </a-popover>
      <a-popover trigger="click" :width="'auto'" placement="bottom-end" overlay-class-name="canvas-tool-popper">
        <template #content>
          <ChartPool @select="chart => { createChartElement(chart) }" />
        </template>
        <template #default>
          <button class="handler-btn" type="button" :title="translate('canvasTool.insertChart')">
            <IconChartProportion class="handler-item" />
          </button>
        </template>
      </a-popover>
      <a-popover trigger="click" :width="'auto'" placement="bottom-end" overlay-class-name="canvas-tool-popper">
        <template #content>
          <TableGenerator
            :t="translate"
            @insert="({ row, col }) => { createTableElement(row, col) }"
          />
        </template>
        <template #default>
          <button class="handler-btn" type="button" :title="translate('canvasTool.insertTable')">
            <IconInsertTable class="handler-item" />
          </button>
        </template>
      </a-popover>
      <a-tooltip :title="translate('canvasTool.insertFormula')" :mouseEnterDelay="0.5" :mouseLeaveDelay="0">
        <IconFormula class="handler-item" @click="latexEditorVisible = true" />
      </a-tooltip>
      <a-popover trigger="click" :width="'auto'" placement="bottom-end" overlay-class-name="canvas-tool-popper">
        <template #content>
          <MediaInput 
            @insertVideo="src => { createVideoElement(src) }"
            @insertAudio="src => { createAudioElement(src) }"
          />
        </template>
        <template #default>
          <button class="handler-btn" type="button" :title="translate('canvasTool.insertMedia')">
            <IconVideoTwo class="handler-item" />
          </button>
        </template>
      </a-popover>
    </div>

    <a-modal
      v-model:open="latexEditorVisible"
      :width="880"
      :title="translate('canvasTool.insertFormulaTitle')"
      destroyOnClose
      :maskClosable="false"
    >
      <LaTeXEditor 
        @close="latexEditorVisible = false"
        @update="data => { createLatexElement(data); latexEditorVisible = false }"
      />
    </a-modal>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSnapshotStore } from '@/store'
import { getImageDataURL } from '@/utils/image'
import { ShapePoolItem } from '@/configs/shapes'
import { LinePoolItem } from '@/configs/lines'
import useScaleCanvas from '@/hooks/useScaleCanvas'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'
import useCreateElement from '@/hooks/useCreateElement'

import ShapePool from './ShapePool.vue'
import LinePool from './LinePool.vue'
import ChartPool from './ChartPool.vue'
import TableGenerator from './TableGenerator.vue'
import MediaInput from './MediaInput.vue'
import LaTeXEditor from '@/components/LaTeXEditor/index.vue'

export default defineComponent({
  name: 'canvas-tool',
  props: {
    t: Function,
  },
  components: {
    ShapePool,
    LinePool,
    ChartPool,
    TableGenerator,
    MediaInput,
    LaTeXEditor,
  },
  setup(props) {
    const mainStore = useMainStore()
    const { creatingElement } = storeToRefs(mainStore)
    const { canUndo, canRedo } = storeToRefs(useSnapshotStore())

    const { redo, undo } = useHistorySnapshot()

    const {
      scaleCanvas,
      setCanvasScalePercentage,
      resetCanvas,
      canvasScalePercentage,
    } = useScaleCanvas()
    
    const canvasScalePresetList = [200, 150, 100, 80, 50]
    const canvasScaleVisible = ref(false)

    const applyCanvasPresetScale = (value: number) => {
      setCanvasScalePercentage(value)
      canvasScaleVisible.value = false
    }

    const {
      createImageElement,
      createChartElement,
      createTableElement,
      createLatexElement,
      createVideoElement,
      createAudioElement,
    } = useCreateElement()

    const insertImageElement = (files: File[]) => {
      const imageFile = files[0]
      if (!imageFile) return
      getImageDataURL(imageFile).then(dataURL => createImageElement(dataURL))
    }

    const latexEditorVisible = ref(false)

    const translate = (key: string, params?: Record<string, string | number>) => {
      if (typeof props.t === 'function') return props.t(key, params)
      const defaults: Record<string, string> = {
        'canvasTool.undo': '撤销',
        'canvasTool.redo': '重做',
        'canvasTool.insertText': '插入文字',
        'canvasTool.insertImage': '插入图片',
        'canvasTool.insertShape': '插入形状',
        'canvasTool.insertLine': '插入线条',
        'canvasTool.insertChart': '插入图表',
        'canvasTool.insertTable': '插入表格',
        'canvasTool.insertFormula': '插入公式',
        'canvasTool.insertMedia': '插入音视频',
        'canvasTool.insertFormulaTitle': '插入公式',
      }
      return defaults[key] || key
    }

    const drawText = () => {
      mainStore.setCreatingElement({
        type: 'text',
      })
    }

    const drawShape = (shape: ShapePoolItem) => {
      mainStore.setCreatingElement({
        type: 'shape',
        data: shape,
      })
    }

    const drawLine = (line: LinePoolItem) => {
      mainStore.setCreatingElement({
        type: 'line',
        data: line,
      })
    }

    return {
      scaleCanvas,
      resetCanvas,
      canvasScalePercentage,
      canvasScaleVisible,
      canvasScalePresetList,
      applyCanvasPresetScale,
      canUndo,
      canRedo,
      redo,
      undo,
      insertImageElement,
      latexEditorVisible,
      creatingElement,
      drawText,
      drawShape,
      drawLine,
      createChartElement,
      createTableElement,
      createLatexElement,
      createVideoElement,
      createAudioElement,
      translate,
    }
  },
})
</script>

<style scoped>
.canvas-tool {
  position: relative;
  border-bottom: 1px solid #e2e6ed;
  background-color: #fff;
  display: flex;
  align-items: center;
  padding: 0 10px;
  font-size: 13px;
  user-select: none;
}
.left-handler {
  display: flex;
  align-items: center;
}
.add-element-handler {
  display: flex;
  align-items: center;
}
.handler-btn {
  border: none;
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
}
.handler-btn:hover {
  background: #f1f3f4;
}
.handler-item {
  margin: 0 10px;
  font-size: 14px;
  cursor: pointer;
}

.handler-item.disable {
  opacity: .5;
}

.handler-item.active {
  color: #1a73e8;
}
.preset-item {
  padding: 8px 20px;
  text-align: center;
  cursor: pointer;
}

.preset-item:hover {
  color: #1a73e8;
}
</style>

<style lang="scss">
/* Popover 样式 - 必须是非 scoped 的全局样式，因为 popover 被 teleport 到 body */
.canvas-tool-popper {
  padding: 8px;

  &.ant-popover {
    border: 1px solid #dfe1e5;
    box-shadow: 0 4px 14px rgba(60, 64, 67, 0.16);
    border-radius: 8px;
  }

  .ant-popover-inner-content {
    max-width: 600px;
  }
}
</style>
