<template>
  <div class="shape-style-panel">
    <div class="row">
      <el-select 
        style="flex: 10;" 
        :model-value="fillType" 
        @change="(value: any) => updateFillType(value)"
      >
        <el-option value="fill" label="纯色填充" />
        <el-option value="gradient" label="渐变填充" />
      </el-select>
      <div style="flex: 1;"></div>
      <el-popover trigger="click" v-if="fillType === 'fill'">
        <ColorPicker
          :modelValue="fill"
          @update:modelValue="(value: any) => updateFill(value)"
        />
        <template #reference>
          <ColorButton :color="fill || ''" style="flex: 10;" />
        </template>
      </el-popover>
      <el-select 
        style="flex: 10;" 
        :model-value="gradient?.type" 
        @change="(value: any) => updateGradient({ type: value })"
        v-else
      >
        <el-option value="linear" label="线性渐变" />
        <el-option value="radial" label="径向渐变" />
      </el-select>
    </div>
    
    <template v-if="fillType === 'gradient'">
      <div class="row">
        <div style="flex: 2;">起点颜色：</div>
        <el-popover trigger="click">
          <ColorPicker
            :modelValue="gradient?.color[0]"
            @update:modelValue="(value: any) => updateGradient({ color: [value, gradient?.color[1] || ''] })"
          />
          <template #reference>
            <ColorButton :color="gradient?.color[0] || ''" style="flex: 3;" />
          </template>
        </el-popover>
      </div>
      <div class="row">
        <div style="flex: 2;">终点颜色：</div>
        <el-popover trigger="click">
          <ColorPicker
            :modelValue="gradient?.color[1]"
            @update:modelValue="(value: any) => updateGradient({ color: [gradient?.color[0] || '', value] })"
          />
          <template #reference>
            <ColorButton :color="gradient?.color[1] || ''" style="flex: 3;" />
          </template>
        </el-popover>
      </div>
      <div class="row" v-if="gradient?.type === 'linear'">
        <div style="flex: 2;">渐变角度：</div>
        <el-slider
          class="slider"
          :min="0"
          :max="360"
          :step="15"
          :model-value="gradient?.rotate"
          @change="(value: any) => updateGradient({ rotate: value })" 
        />
      </div>
    </template>

    <ElementFlip />
    <el-divider />

    <template v-if="(handleElement as any)?.text?.content">
      <div class="input-group-compact row">
        <el-select
          style="flex: 3;"
          :model-value="richTextAttrs.fontname"
          @change="(value: any) => emitRichTextCommand('fontname', value)"
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
          @change="(value: any) => emitRichTextCommand('fontsize', value)"
        >
          <template #prefix><IconAddText /></template>
          <el-option v-for="fontsize in fontSizeOptions" :key="fontsize" :value="fontsize" :label="fontsize" />
        </el-select>
      </div>

      <el-button-group class="row">
        <el-popover trigger="click">
          <ColorPicker
            :modelValue="richTextAttrs.color"
            @update:modelValue="(value: any) => emitRichTextCommand('color', value)"
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
            @update:modelValue="(value: any) => emitRichTextCommand('backcolor', value)"
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
            @click="emitRichTextCommand('fontsize-add')"
          ><IconFontSize />+</el-button>
        </el-tooltip>
        <el-tooltip :hide-after="0" :show-after="500" content="减小字号">
          <el-button 
            class="font-size-btn"
            style="flex: 2;"
            @click="emitRichTextCommand('fontsize-reduce')"
          ><IconFontSize />-</el-button>
        </el-tooltip>
      </el-button-group>

      <div class="checkbox-button-group row">
        <el-tooltip :hide-after="0" :show-after="500" content="加粗">
          <CheckboxButton 
            style="flex: 1;"
            :checked="richTextAttrs.bold"
            @click="emitRichTextCommand('bold')"
          ><IconTextBold /></CheckboxButton>
        </el-tooltip>
        <el-tooltip :hide-after="0" :show-after="500" content="斜体">
          <CheckboxButton 
            style="flex: 1;"
            :checked="richTextAttrs.em"
            @click="emitRichTextCommand('em')"
          ><IconTextItalic /></CheckboxButton>
        </el-tooltip>
        <el-tooltip :hide-after="0" :show-after="500" content="下划线">
          <CheckboxButton 
            style="flex: 1;"
            :checked="richTextAttrs.underline"
            @click="emitRichTextCommand('underline')"
          ><IconTextUnderline /></CheckboxButton>
        </el-tooltip>
        <el-tooltip :hide-after="0" :show-after="500" content="清除格式">
          <CheckboxButton
            style="flex: 1;"
            @click="emitRichTextCommand('clear')"
          ><IconFormat /></CheckboxButton>
        </el-tooltip>
      </div>

      <el-radio-group 
        class="row" 
        :model-value="richTextAttrs.align"
        @change="(value: any) => emitRichTextCommand('align', value)"
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

      <el-radio-group 
        class="row" 
        :model-value="textAlign"
        @change="(value: any) => updateTextAlign(value)"
      >
        <el-tooltip :hide-after="0" :show-after="500" content="顶对齐">
          <el-radio-button value="top" style="flex: 1;"><IconAlignTextTopOne /></el-radio-button>
        </el-tooltip>
        <el-tooltip :hide-after="0" :show-after="500" content="居中">
          <el-radio-button value="middle" style="flex: 1;"><IconAlignTextMiddleOne /></el-radio-button>
        </el-tooltip>
        <el-tooltip :hide-after="0" :show-after="500" content="底对齐">
          <el-radio-button value="bottom" style="flex: 1;"><IconAlignTextBottomOne /></el-radio-button>
        </el-tooltip>
      </el-radio-group>

      <el-divider />
    </template>

    <ElementOutline />
    <el-divider />
    <ElementShadow />
    <el-divider />
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