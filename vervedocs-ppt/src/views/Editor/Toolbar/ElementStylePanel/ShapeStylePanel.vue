<template>
  <div class="shape-style-panel">
    <div class="row">
      <a-select 
        style="flex: 10;" 
        :value="fillType" 
        @change="(value: any) => updateFillType(value)"
      >
        <a-select-option value="fill">纯色填充</a-select-option>
        <a-select-option value="gradient">渐变填充</a-select-option>
      </a-select>
      <div style="flex: 1;"></div>
      <a-popover trigger="click" v-if="fillType === 'fill'">
        <template #content>
          <ColorPicker
            :modelValue="fill"
            @update:modelValue="(value: any) => updateFill(value)"
          />
        </template>
        <ColorButton :color="fill || ''" style="flex: 10;" />
      </a-popover>
      <a-select 
        style="flex: 10;" 
        :value="gradient?.type" 
        @change="(value: any) => updateGradient({ type: value })"
        v-else
      >
        <a-select-option value="linear">线性渐变</a-select-option>
        <a-select-option value="radial">径向渐变</a-select-option>
      </a-select>
    </div>
    
    <template v-if="fillType === 'gradient'">
      <div class="row">
        <div style="flex: 2;">起点颜色：</div>
        <a-popover trigger="click">
          <template #content>
            <ColorPicker
              :modelValue="gradient?.color[0]"
              @update:modelValue="(value: any) => updateGradient({ color: [value, gradient?.color[1] || ''] })"
            />
          </template>
          <ColorButton :color="gradient?.color[0] || ''" style="flex: 3;" />
        </a-popover>
      </div>
      <div class="row">
        <div style="flex: 2;">终点颜色：</div>
        <a-popover trigger="click">
          <template #content>
            <ColorPicker
              :modelValue="gradient?.color[1]"
              @update:modelValue="(value: any) => updateGradient({ color: [gradient?.color[0] || '', value] })"
            />
          </template>
          <ColorButton :color="gradient?.color[1] || ''" style="flex: 3;" />
        </a-popover>
      </div>
      <div class="row" v-if="gradient?.type === 'linear'">
        <div style="flex: 2;">渐变角度：</div>
        <a-slider
          class="slider"
          :min="0"
          :max="360"
          :step="15"
          :value="gradient?.rotate"
          @change="(value: any) => updateGradient({ rotate: value })" 
        />
      </div>
    </template>

    <ElementFlip />
    <a-divider />

    <template v-if="(handleElement as any)?.text?.content">
      <div class="input-group-compact row">
        <a-select
          style="flex: 3;"
          :value="richTextAttrs.fontname"
          @change="(value: any) => emitRichTextCommand('fontname', value)"
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
          @change="(value: any) => emitRichTextCommand('fontsize', value)"
        >
          <a-select-option v-for="fontsize in fontSizeOptions" :key="fontsize" :value="fontsize">{{fontsize}}</a-select-option>
        </a-select>
      </div>

      <a-button-group class="row">
        <a-popover trigger="click">
          <template #content>
            <ColorPicker
              :modelValue="richTextAttrs.color"
              @update:modelValue="(value: any) => emitRichTextCommand('color', value)"
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
              @update:modelValue="(value: any) => emitRichTextCommand('backcolor', value)"
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
            @click="emitRichTextCommand('fontsize-add')"
          ><IconFontSize />+</a-button>
        </a-tooltip>
        <a-tooltip title="减小字号" :mouseEnterDelay="0.5" :mouseLeaveDelay="0">
          <a-button 
            class="font-size-btn"
            style="flex: 2;"
            @click="emitRichTextCommand('fontsize-reduce')"
          ><IconFontSize />-</a-button>
        </a-tooltip>
      </a-button-group>

      <div class="checkbox-button-group row">
        <a-tooltip title="加粗" :mouseEnterDelay="0.5" :mouseLeaveDelay="0">
          <CheckboxButton 
            style="flex: 1;"
            :checked="richTextAttrs.bold"
            @click="emitRichTextCommand('bold')"
          ><IconTextBold /></CheckboxButton>
        </a-tooltip>
        <a-tooltip title="斜体" :mouseEnterDelay="0.5" :mouseLeaveDelay="0">
          <CheckboxButton 
            style="flex: 1;"
            :checked="richTextAttrs.em"
            @click="emitRichTextCommand('em')"
          ><IconTextItalic /></CheckboxButton>
        </a-tooltip>
        <a-tooltip title="下划线" :mouseEnterDelay="0.5" :mouseLeaveDelay="0">
          <CheckboxButton 
            style="flex: 1;"
            :checked="richTextAttrs.underline"
            @click="emitRichTextCommand('underline')"
          ><IconTextUnderline /></CheckboxButton>
        </a-tooltip>
        <a-tooltip title="清除格式" :mouseEnterDelay="0.5" :mouseLeaveDelay="0">
          <CheckboxButton
            style="flex: 1;"
            @click="emitRichTextCommand('clear')"
          ><IconFormat /></CheckboxButton>
        </a-tooltip>
      </div>

      <a-radio-group 
        class="row" 
        :value="richTextAttrs.align"
        @change="(value: any) => emitRichTextCommand('align', value)"
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

      <a-radio-group 
        class="row" 
        :value="textAlign"
        @change="(value: any) => updateTextAlign(value)"
      >
        <a-tooltip title="顶对齐" :mouseEnterDelay="0.5" :mouseLeaveDelay="0">
          <a-radio-button value="top" style="flex: 1;"><IconAlignTextTopOne /></a-radio-button>
        </a-tooltip>
        <a-tooltip title="居中" :mouseEnterDelay="0.5" :mouseLeaveDelay="0">
          <a-radio-button value="middle" style="flex: 1;"><IconAlignTextMiddleOne /></a-radio-button>
        </a-tooltip>
        <a-tooltip title="底对齐" :mouseEnterDelay="0.5" :mouseLeaveDelay="0">
          <a-radio-button value="bottom" style="flex: 1;"><IconAlignTextBottomOne /></a-radio-button>
        </a-tooltip>
      </a-radio-group>

      <a-divider />
    </template>

    <ElementOutline />
    <a-divider />
    <ElementShadow />
    <a-divider />
    <ElementOpacity />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore } from '@/store'
import { PPTShapeElement, ShapeGradient, ShapeText } from '@/types/slides'
import { WEB_FONTS } from '@/configs/font'
import emitter, { EmitterEvents } from '@/utils/emitter'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'

import ElementOpacity from '../common/ElementOpacity.vue'
import ElementOutline from '../common/ElementOutline.vue'
import ElementShadow from '../common/ElementShadow.vue'
import ElementFlip from '../common/ElementFlip.vue'
import ColorButton from '../common/ColorButton.vue'

const webFonts = WEB_FONTS

export default defineComponent({
  name: 'shape-style-panel',
  components: {
    ElementOpacity,
    ElementOutline,
    ElementShadow,
    ElementFlip,
    ColorButton,
  },
  setup() {
    const mainStore = useMainStore()
    const slidesStore = useSlidesStore()
    const { handleElement, handleElementId, richTextAttrs, availableFonts } = storeToRefs(mainStore)

    const fill = ref<string>()
    const gradient = ref<ShapeGradient>()
    const fillType = ref('fill')
    const textAlign = ref('middle')

    watch(handleElement, () => {
      if (!handleElement.value || handleElement.value.type !== 'shape') return

      fill.value = handleElement.value.fill || '#fff'
      gradient.value = handleElement.value.gradient || { type: 'linear', rotate: 0, color: [fill.value, '#fff'] }
      fillType.value = handleElement.value.gradient ? 'gradient' : 'fill'
      textAlign.value = handleElement.value?.text?.align || 'middle'
    }, { deep: true, immediate: true })

    const { addHistorySnapshot } = useHistorySnapshot()

    const updateElement = (props: Partial<PPTShapeElement>) => {
      slidesStore.updateElement({ id: handleElementId.value, props })
      addHistorySnapshot()
    }

    // 设置填充类型：渐变、纯色
    const updateFillType = (type: 'gradient' | 'fill') => {
      if (type === 'fill') {
        slidesStore.removeElementProps({ id: handleElementId.value, propName: 'gradient' })
        addHistorySnapshot()
      }
      else updateElement({ gradient: gradient.value })
    }

    // 设置渐变填充
    const updateGradient = (gradientProps: Partial<ShapeGradient>) => {
      if (!gradient.value) return
      const _gradient: ShapeGradient = { ...gradient.value, ...gradientProps }
      updateElement({ gradient: _gradient })
    }

    // 设置填充色
    const updateFill = (value: string) => {
      updateElement({ fill: value })
    }

    const updateTextAlign = (align: 'top' | 'middle' | 'bottom') => {
      const _handleElement = handleElement.value as PPTShapeElement
      
      const defaultText: ShapeText = {
        content: '',
        defaultFontName: '微软雅黑',
        defaultColor: '#000',
        align: 'middle',
      }
      const _text = _handleElement.text || defaultText
      updateElement({ text: { ..._text, align } })
    }

    const fontSizeOptions = [
      '12px', '14px', '16px', '18px', '20px', '22px', '24px', '28px', '32px',
      '36px', '40px', '44px', '48px', '54px', '60px', '66px', '72px', '76px',
      '80px', '88px', '96px', '104px', '112px', '120px',
    ]

    const emitRichTextCommand = (command: string, value?: string) => {
      emitter.emit(EmitterEvents.RICH_TEXT_COMMAND, { action: { command, value } })
    }

    return {
      fill,
      gradient,
      fillType,
      textAlign,
      richTextAttrs,
      availableFonts,
      fontSizeOptions,
      webFonts,
      handleElement,
      emitRichTextCommand,
      updateFillType,
      updateFill,
      updateGradient,
      updateTextAlign,
    }
  },
})
</script>

<style  scoped>
.shape-style-panel {
  user-select: none;
}
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
.slider {
  flex: 3;
}
</style>
