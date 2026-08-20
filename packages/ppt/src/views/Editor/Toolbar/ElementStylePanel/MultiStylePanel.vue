<template>
  <div class="multi-style-panel">
    <div class="row">
      <div style="flex: 2;">填充颜色：</div>
      <a-popover trigger="click">
        <template #content>
          <ColorPicker
            :modelValue="fill"
            @update:modelValue="(value: any) => updateFill(value)"
          />
        </template>
        <ColorButton :color="fill" style="flex: 3;" />
      </a-popover>
    </div>

    <a-divider />

    <div class="row">
      <div style="flex: 2;">边框样式：</div>
      <a-select 
        style="flex: 3;" 
        :value="outline.style"
        @change="(value: any) => updateOutline({ style: value })"
      >
        <a-select-option value="solid">实线边框</a-select-option>
        <a-select-option value="dashed">虚线边框</a-select-option>
      </a-select>
    </div>
    <div class="row">
      <div style="flex: 2;">边框颜色：</div>
      <a-popover trigger="click">
        <template #content>
          <ColorPicker
            :modelValue="outline.color"
            @update:modelValue="(value: any) => updateOutline({ color: value })"
          />
        </template>
        <ColorButton :color="outline?.color || ''" style="flex: 3;" />
      </a-popover>
    </div>
    <div class="row">
      <div style="flex: 2;">边框粗细：</div>
      <a-input-number 
        :value="outline.width"
        @change="(value: any) => updateOutline({ width: value })" 
        style="flex: 3;"
      />
    </div>

    <a-divider />

    <div class="input-group-compact row">
      <a-select
        style="flex: 3;"
        :value="richTextAttrs.fontname"
        @change="(value: any) => updateFontStyle('fontname', value)"
      >
        <a-select-opt-group label="系统字体">
          <a-select-option v-for="font in availableFonts" :key="font.value" :value="font.value">
            <span :style="{ fontFamily: font.value }">{{font.label}}</span>
          </a-select-option>
        </a-select-opt-group>
        <a-select-opt-group label="在线字体">
          <a-select-option v-for="font in webFonts" :key="font.value" :value="font.value">
            <span>{{font.label}}</span>
          </a-select-option>
        </a-select-opt-group>
      </a-select>
      <a-select
        style="flex: 2;"
        :value="richTextAttrs.fontsize"
        @change="(value: any) => updateFontStyle('fontsize', value)"
      >
        <a-select-option v-for="fontsize in fontSizeOptions" :key="fontsize" :value="fontsize">{{fontsize}}</a-select-option>
      </a-select>
    </div>
    <a-button-group class="row">
      <a-popover trigger="click">
        <template #content>
          <ColorPicker
            :modelValue="richTextAttrs.color"
            @update:modelValue="(value: any) => updateFontStyle('color', value)"
          />
        </template>
        <a-tooltip title="文字颜色" :mouseEnterDelay="0.5" :mouseLeaveDelay="0">
          <a-button class="text-color-btn" style="flex: 3;">
            <IconText />
            <div class="text-color-block" :style="{ backgroundColor: richTextAttrs.color }"></div>
          </a-button>
        </a-tooltip>
      </a-popover>
      <a-popover trigger="click">
        <template #content>
          <ColorPicker
            :modelValue="richTextAttrs.backcolor"
            @update:modelValue="(value: any) => updateFontStyle('backcolor', value)"
          />
        </template>
        <a-tooltip title="文字高亮" :mouseEnterDelay="0.5" :mouseLeaveDelay="0">
          <a-button class="text-color-btn" style="flex: 3;">
            <IconHighLight />
            <div class="text-color-block" :style="{ backgroundColor: richTextAttrs.backcolor }"></div>
          </a-button>
        </a-tooltip>
      </a-popover>
      <a-tooltip title="增大字号" :mouseEnterDelay="0.5" :mouseLeaveDelay="0">
        <a-button 
          class="font-size-btn"
          style="flex: 2;"
          @click="updateFontStyle('fontsize-add', '2')"
        ><IconFontSize />+</a-button>
      </a-tooltip>
      <a-tooltip title="减小字号" :mouseEnterDelay="0.5" :mouseLeaveDelay="0">
        <a-button 
          class="font-size-btn"
          style="flex: 2;"
          @click="updateFontStyle('fontsize-reduce', '2')"
        ><IconFontSize />-</a-button>
      </a-tooltip>
    </a-button-group>
    <a-radio-group 
      class="row" 
      :value="richTextAttrs.align"
      @change="(value: any) => updateFontStyle('align', value)"
    >
      <a-tooltip title="左对齐" :mouseEnterDelay="0.5" :mouseLeaveDelay="0">
        <a-radio-button value="left" style="flex: 1;"><IconAlignTextLeft /></a-radio-button>
      </a-tooltip>
      <a-tooltip title="居中" :mouseEnterDelay="0.5" :mouseLeaveDelay="0">
        <a-radio-button value="center" style="flex: 1;"><IconAlignTextCenter /></a-radio-button>
      </a-tooltip>
      <a-tooltip title="右对齐" :mouseEnterDelay="0.5" :mouseLeaveDelay="0">
        <a-radio-button value="right" style="flex: 1;"><IconAlignTextRight /></a-radio-button>
      </a-tooltip>
    </a-radio-group>
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
