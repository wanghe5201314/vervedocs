<template>
  <div class="multi-style-panel">
    <div class="row">
      <div style="flex: 2;">填充颜色：</div>
      <el-popover trigger="click">
        <ColorPicker
          :modelValue="fill"
          @update:modelValue="(value: any) => updateFill(value)"
        />
        <template #reference>
          <ColorButton :color="fill" style="flex: 3;" />
        </template>
      </el-popover>
    </div>

    <el-divider />

    <div class="row">
      <div style="flex: 2;">边框样式：</div>
      <el-select 
        style="flex: 3;" 
        :model-value="outline.style"
        @change="(value: any) => updateOutline({ style: value })"
      >
        <el-option value="solid" label="实线边框" />
        <el-option value="dashed" label="虚线边框" />
      </el-select>
    </div>
    <div class="row">
      <div style="flex: 2;">边框颜色：</div>
      <el-popover trigger="click">
        <ColorPicker
          :modelValue="outline.color"
          @update:modelValue="(value: any) => updateOutline({ color: value })"
        />
        <template #reference>
          <ColorButton :color="outline?.color || ''" style="flex: 3;" />
        </template>
      </el-popover>
    </div>
    <div class="row">
      <div style="flex: 2;">边框粗细：</div>
      <el-input-number 
        :model-value="outline.width"
        @change="(value: any) => updateOutline({ width: value })" 
        style="flex: 3;"
        controls-position="right"
      />
    </div>

    <el-divider />

    <div class="input-group-compact row">
      <el-select
        style="flex: 3;"
        :model-value="richTextAttrs.fontname"
        @change="(value: any) => updateFontStyle('fontname', value)"
      >
        <template #prefix><IconFontSize /></template>
        <el-option-group label="系统字体">
          <el-option v-for="font in availableFonts" :key="font.value" :value="font.value" :label="font.label">
            <span :style="{ fontFamily: font.value }">{{font.label}}</span>
          </el-option>
        </el-option-group>
        <el-option-group label="在线字体">
          <el-option v-for="font in webFonts" :key="font.value" :value="font.value" :label="font.label">
            <span>{{font.label}}</span>
          </el-option>
        </el-option-group>
      </el-select>
      <el-select
        style="flex: 2;"
        :model-value="richTextAttrs.fontsize"
        @change="(value: any) => updateFontStyle('fontsize', value)"
      >
        <template #prefix><IconAddText /></template>
        <el-option v-for="fontsize in fontSizeOptions" :key="fontsize" :value="fontsize" :label="fontsize" />
      </el-select>
    </div>
    <el-button-group class="row">
      <el-popover trigger="click">
        <ColorPicker
          :modelValue="richTextAttrs.color"
          @update:modelValue="(value: any) => updateFontStyle('color', value)"
        />
        <template #reference>
          <el-tooltip :hide-after="0" :show-after="500" content="文字颜色">
            <el-button class="text-color-btn" style="flex: 3;">
              <IconText />
              <div class="text-color-block" :style="{ backgroundColor: richTextAttrs.color }"></div>
            </el-button>
          </el-tooltip>
        </template>
      </el-popover>
      <el-popover trigger="click">
        <ColorPicker
          :modelValue="richTextAttrs.backcolor"
          @update:modelValue="(value: any) => updateFontStyle('backcolor', value)"
        />
        <template #reference>
          <el-tooltip :hide-after="0" :show-after="500" content="文字高亮">
            <el-button class="text-color-btn" style="flex: 3;">
              <IconHighLight />
              <div class="text-color-block" :style="{ backgroundColor: richTextAttrs.backcolor }"></div>
            </el-button>
          </el-tooltip>
        </template>
      </el-popover>
      <el-tooltip :hide-after="0" :show-after="500" content="增大字号">
        <el-button 
          class="font-size-btn"
          style="flex: 2;"
          @click="updateFontStyle('fontsize-add', '2')"
        ><IconFontSize />+</el-button>
      </el-tooltip>
      <el-tooltip :hide-after="0" :show-after="500" content="减小字号">
        <el-button 
          class="font-size-btn"
          style="flex: 2;"
          @click="updateFontStyle('fontsize-reduce', '2')"
        ><IconFontSize />-</el-button>
      </el-tooltip>
    </el-button-group>
    <el-radio-group 
      class="row" 
      :model-value="richTextAttrs.align"
      @change="(value: any) => updateFontStyle('align', value)"
    >
      <el-tooltip :hide-after="0" :show-after="500" content="左对齐">
        <el-radio-button value="left" style="flex: 1;"><IconAlignTextLeft /></el-radio-button>
      </el-tooltip>
      <el-tooltip :hide-after="0" :show-after="500" content="居中">
        <el-radio-button value="center" style="flex: 1;"><IconAlignTextCenter /></el-radio-button>
      </el-tooltip>
      <el-tooltip :hide-after="0" :show-after="500" content="右对齐">
        <el-radio-button value="right" style="flex: 1;"><IconAlignTextRight /></el-radio-button>
      </el-tooltip>
    </el-radio-group>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore } from '@/store'
import { PPTElement, PPTElementOutline, TableCell } from '@/types/slides'
import emitter, { EmitterEvents } from '@/utils/emitter'
import { WEB_FONTS } from '@/configs/font'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'

import ColorButton from '../common/ColorButton.vue'

const webFonts = WEB_FONTS

export default defineComponent({
  name: 'multi-style-panel',
  components: {
    ColorButton,
  },
  setup() {
    const slidesStore = useSlidesStore()
    const { richTextAttrs, availableFonts, activeElementList } = storeToRefs(useMainStore())

    const { addHistorySnapshot } = useHistorySnapshot()

    const updateElement = (id: string, props: Partial<PPTElement>) => {
      slidesStore.updateElement({ id, props })
      addHistorySnapshot()
    }

    const fontSizeOptions = [
      '12px', '14px', '16px', '18px', '20px', '22px', '24px', '28px', '32px',
      '36px', '40px', '44px', '48px', '54px', '60px', '66px', '72px', '76px',
      '80px', '88px', '96px', '104px', '112px', '120px',
    ]

    const fill = ref('#fff')
    const outline = ref<PPTElementOutline>({
      width: 0,
      color: '#fff',
      style: 'solid',
    })

    // 批量修改填充色（表格元素为单元格填充、音频元素为图标颜色）
    const updateFill = (value: string) => {
      for (const el of activeElementList.value) {
        if (
          el.type === 'text' ||
          el.type === 'shape' ||
          el.type === 'chart'
        ) updateElement(el.id, { fill: value })

        if (el.type === 'table') {
          const data: TableCell[][] = JSON.parse(JSON.stringify(el.data))
          for (let i = 0; i < data.length; i++) {
            for (let j = 0; j < data[i].length; j++) {
              const style = data[i][j].style || {}
              data[i][j].style = { ...style, backcolor: value }
            }
          }
          updateElement(el.id, { data })
        }

        if (el.type === 'audio') updateElement(el.id, { color: value })
      }
      fill.value = value
    }

    // 修改边框/线条样式
    const updateOutline = (outlineProps: Partial<PPTElementOutline>) => {

      for (const el of activeElementList.value) {
        if (
          el.type === 'text' ||
          el.type === 'image' ||
          el.type === 'shape' ||
          el.type === 'table' ||
          el.type === 'chart'
        ) {
          const outline = el.outline || { width: 2, color: '#000', style: 'solid' }
          const props = { outline: { ...outline, ...outlineProps } }
          updateElement(el.id, props)
        }

        if (el.type === 'line') updateElement(el.id, outlineProps)
      }
      outline.value = { ...outline.value, ...outlineProps }
    }

    // 修改文字样式
    const updateFontStyle = (command: string, value: string) => {
      for (const el of activeElementList.value) {
        if (el.type === 'text' || (el.type === 'shape' && el.text?.content)) {
          emitter.emit(EmitterEvents.RICH_TEXT_COMMAND, { target: el.id, action: { command, value } })
        }
        if (el.type === 'table') {
          const data: TableCell[][] = JSON.parse(JSON.stringify(el.data))
          for (let i = 0; i < data.length; i++) {
            for (let j = 0; j < data[i].length; j++) {
              const style = data[i][j].style || {}
              data[i][j].style = { ...style, [command]: value }
            }
          }
          updateElement(el.id, { data })
        }
        if (el.type === 'latex' && command === 'color') {
          updateElement(el.id, { color: value })
        }
      }
    }

    return {
      webFonts,
      richTextAttrs,
      availableFonts,
      fontSizeOptions,
      fill,
      outline,
      updateFill,
      updateOutline,
      updateFontStyle,
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
.text-color-btn {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 0;
}
.text-color-block {
  width: 16px;
  height: 3px;
  margin-top: 1px;
}
.font-size-btn {
  padding: 0;
}
</style>