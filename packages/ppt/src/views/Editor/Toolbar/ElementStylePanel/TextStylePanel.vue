<template>
  <div class="text-style-panel">
    <div class="preset-style">
      <div 
        class="preset-style-item"
        v-for="item in presetStyles"
        :key="item.label"
        :style="item.style"
        @click="emitBatchRichTextCommand(item.cmd)"
      >{{item.label}}</div>
    </div>

    <a-divider />
    
    <div class="row input-group-compact">
      <a-select
        style="flex: 3;"
        :value="richTextAttrs.fontname"
        @change="(value: string) => emitRichTextCommand('fontname', value)"
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
        @change="(value: string) => emitRichTextCommand('fontsize', value)"
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

    <CheckboxButtonGroup class="row">
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
      <a-tooltip title="删除线" :mouseEnterDelay="0.5" :mouseLeaveDelay="0">
        <CheckboxButton 
          style="flex: 1;"
          :checked="richTextAttrs.strikethrough"
          @click="emitRichTextCommand('strikethrough')"
        ><IconStrikethrough /></CheckboxButton>
      </a-tooltip>
      <a-tooltip title="清除格式" :mouseEnterDelay="0.5" :mouseLeaveDelay="0">
        <CheckboxButton
          style="flex: 1;"
          @click="emitRichTextCommand('clear')"
        ><IconFormat /></CheckboxButton>
      </a-tooltip>
    </CheckboxButtonGroup>

    <CheckboxButtonGroup class="row">
      <a-tooltip title="上标" :mouseEnterDelay="0.5" :mouseLeaveDelay="0">
        <CheckboxButton
          style="flex: 1;"
          :checked="richTextAttrs.superscript"
          @click="emitRichTextCommand('superscript')"
        ><IconUpOne /></CheckboxButton>
      </a-tooltip>
      <a-tooltip title="下标" :mouseEnterDelay="0.5" :mouseLeaveDelay="0">
        <CheckboxButton
          style="flex: 1;"
          :checked="richTextAttrs.subscript"
          @click="emitRichTextCommand('subscript')"
        ><IconDownOne /></CheckboxButton>
      </a-tooltip>
      <a-tooltip title="行内代码" :mouseEnterDelay="0.5" :mouseLeaveDelay="0">
        <CheckboxButton
          style="flex: 1;"
          :checked="richTextAttrs.code"
          @click="emitRichTextCommand('code')"
        ><IconCode /></CheckboxButton>
      </a-tooltip>
      <a-tooltip title="引用" :mouseEnterDelay="0.5" :mouseLeaveDelay="0">
        <CheckboxButton
          style="flex: 1;"
          :checked="richTextAttrs.blockquote"
          @click="emitRichTextCommand('blockquote')"
        ><IconQuote /></CheckboxButton>
      </a-tooltip>
      <a-tooltip title="超链接" :mouseEnterDelay="0.5" :mouseLeaveDelay="0">
        <a-popover placement="bottom-end" trigger="click" :open="linkPopoverVisible">
          <template #content>
            <div class="link-popover">
              <a-input v-model:value="link" placeholder="请输入超链接" />
              <div class="btns">
                <a-button size="small" :disabled="!richTextAttrs.link" @click="updateLink()" style="margin-right: 5px;">移除</a-button>
                <a-button size="small" type="primary" @click="updateLink(link)">确认</a-button>
              </div>
            </div>
          </template>
          <CheckboxButton
            style="flex: 1;"
            :checked="!!richTextAttrs.link"
            @click="openLinkPopover()"
          ><IconLinkOne /></CheckboxButton>
        </a-popover>
      </a-tooltip>
    </CheckboxButtonGroup>

    <a-divider />

    <a-radio-group 
      class="row" 
      :value="richTextAttrs.align"
      @change="(value: string) => emitRichTextCommand('align', value)"
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

    <CheckboxButtonGroup class="row">
      <a-tooltip title="项目符号" :mouseEnterDelay="0.5" :mouseLeaveDelay="0">
        <CheckboxButton 
          style="flex: 1;" 
          :checked="richTextAttrs.bulletList"
          @click="emitRichTextCommand('bulletList')"
        ><IconList /></CheckboxButton>
      </a-tooltip>
      <a-tooltip title="编号" :mouseEnterDelay="0.5" :mouseLeaveDelay="0">
        <CheckboxButton 
          style="flex: 1;" 
          :checked="richTextAttrs.orderedList"
          @click="emitRichTextCommand('orderedList')"
        ><IconOrderedList /></CheckboxButton>
      </a-tooltip>
    </CheckboxButtonGroup>

    <a-button-group class="row">
      <a-tooltip title="减小缩进" :mouseEnterDelay="0.5" :mouseLeaveDelay="0">
        <a-button style="flex: 1;" @click="emitRichTextCommand('indent', '-1')"><IconIndentLeft /></a-button>
      </a-tooltip>
      <a-tooltip title="增大缩进" :mouseEnterDelay="0.5" :mouseLeaveDelay="0">
        <a-button style="flex: 1;" @click="emitRichTextCommand('indent', '+1')"><IconIndentRight /></a-button>
      </a-tooltip>
    </a-button-group>

    <a-divider />

    <div class="row">
      <div style="flex: 2;">行间距：</div>
      <a-select style="flex: 3;" :value="lineHeight" @change="(value: number) => updateLineHeight(value)">
        <a-select-option v-for="item in lineHeightOptions" :key="item" :value="item">{{item}}倍</a-select-option>
      </a-select>
    </div>
    <div class="row">
      <div style="flex: 2;">段间距：</div>
      <a-select style="flex: 3;" :value="paragraphSpace" @change="(value: number) => updateParagraphSpace(value)">
        <a-select-option v-for="item in paragraphSpaceOptions" :key="item" :value="item">{{item}}px</a-select-option>
      </a-select>
    </div>
    <div class="row">
      <div style="flex: 2;">字间距：</div>
      <a-select style="flex: 3;" :value="wordSpace" @change="(value: number) => updateWordSpace(value)">
        <a-select-option v-for="item in wordSpaceOptions" :key="item" :value="item">{{item}}px</a-select-option>
      </a-select>
    </div>
    <div class="row">
      <div style="flex: 2;">首行缩进：</div>
      <a-select style="flex: 3;" :value="textIndent" @change="(value: number) => updateTextIndent(value)">
        <a-select-option v-for="item in textIndentOptions" :key="item" :value="item">{{item}}px</a-select-option>
      </a-select>
    </div>
    <div class="row">
      <div style="flex: 2;">文本框填充：</div>
      <a-popover trigger="click">
        <template #content>
          <ColorPicker
            :modelValue="fill"
            @update:modelValue="(value: any) => updateFill(value)"
          />
        </template>
        <ColorButton :color="fill || ''" style="flex: 3;" />
      </a-popover>
    </div>

    <a-divider />
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
import { PPTTextElement } from '@/types/slides'
import emitter, { EmitterEvents, RichTextAction } from '@/utils/emitter'
import { WEB_FONTS } from '@/configs/font'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'
import { message } from 'ant-design-vue'

import ElementOpacity from '../common/ElementOpacity.vue'
import ElementOutline from '../common/ElementOutline.vue'
import ElementShadow from '../common/ElementShadow.vue'
import ColorButton from '../common/ColorButton.vue'
import ColorPicker from "@/components/ColorPicker/index.vue";

const presetStyles = [
  {
    label: '大标题',
    style: {
      fontSize: '26px',
      fontWeight: 700,
    },
    cmd: [
      { command: 'clear' },
      { command: 'fontsize', value: '48px' },
      { command: 'align', value: 'center' },
      { command: 'bold' },
    ],
  },
  {
    label: '小标题',
    style: {
      fontSize: '22px',
      fontWeight: 700,
    },
    cmd: [
      { command: 'clear' },
      { command: 'fontsize', value: '36px' },
      { command: 'align', value: 'center' },
      { command: 'bold' },
    ],
  },
  {
    label: '正文',
    style: {
      fontSize: '20px',
    },
    cmd: [
      { command: 'clear' },
      { command: 'fontsize', value: '20px' },
    ],
  },
  {
    label: '正文[小]',
    style: {
      fontSize: '18px',
    },
    cmd: [
      { command: 'clear' },
      { command: 'fontsize', value: '18px' },
    ],
  },
  {
    label: '注释 1',
    style: {
      fontSize: '16px',
      fontStyle: 'italic',
    },
    cmd: [
      { command: 'clear' },
      { command: 'fontsize', value: '16px' },
      { command: 'em' },
    ],
  },
  {
    label: '注释 2',
    style: {
      fontSize: '16px',
      textDecoration: 'underline',
    },
    cmd: [
      { command: 'clear' },
      { command: 'fontsize', value: '16px' },
      { command: 'underline' },
    ],
  },
]

const webFonts = WEB_FONTS

export default defineComponent({
  name: 'text-style-panel',
  components: {
    ColorPicker,
    ElementOpacity,
    ElementOutline,
    ElementShadow,
    ColorButton,
  },
  setup() {
    const slidesStore = useSlidesStore()
    const { handleElement, handleElementId, richTextAttrs, availableFonts } = storeToRefs(useMainStore())

    const { addHistorySnapshot } = useHistorySnapshot()

    const updateElement = (props: Partial<PPTTextElement>) => {
      slidesStore.updateElement({ id: handleElementId.value, props })
      addHistorySnapshot()
    }

    const fill = ref<string>()
    const lineHeight = ref<number>()
    const wordSpace = ref<number>()
    const textIndent = ref<number>()
    const paragraphSpace = ref<number>()

    watch(handleElement, () => {
      if (!handleElement.value || handleElement.value.type !== 'text') return

      fill.value = handleElement.value.fill || '#fff'
      lineHeight.value = handleElement.value.lineHeight || 1.5
      wordSpace.value = handleElement.value.wordSpace || 0
      textIndent.value = handleElement.value.textIndent || 0
      paragraphSpace.value = handleElement.value.paragraphSpace === undefined ? 5 : handleElement.value.paragraphSpace
    }, { deep: true, immediate: true })

    const fontSizeOptions = [
      '12px', '14px', '16px', '18px', '20px', '22px', '24px', '28px', '32px',
      '36px', '40px', '44px', '48px', '54px', '60px', '66px', '72px', '76px',
      '80px', '88px', '96px', '104px', '112px', '120px',
    ]
    const lineHeightOptions = [0.9, 1.0, 1.15, 1.2, 1.4, 1.5, 1.8, 2.0, 2.5, 3.0]
    const wordSpaceOptions = [0, 1, 2, 3, 4, 5, 6, 8, 10]
    const textIndentOptions = [0, 48, 96, 144, 192, 240, 288, 336]
    const paragraphSpaceOptions = [0, 5, 10, 15, 20, 25, 30, 40, 50, 80]

    const updateLineHeight = (value: number) => {
      updateElement({ lineHeight: value })
    }
    const updateParagraphSpace = (value: number) => {
      updateElement({ paragraphSpace: value })
    }
    const updateWordSpace = (value: number) => {
      updateElement({ wordSpace: value })
    }
    const updateTextIndent = (value: number) => {
      updateElement({ textIndent: value })
    }
    const updateFill = (value: string) => {
      updateElement({ fill: value })
    }

    const emitRichTextCommand = (command: string, value?: string) => {
      emitter.emit(EmitterEvents.RICH_TEXT_COMMAND, { action: { command, value } })
    }

    const emitBatchRichTextCommand = (action: RichTextAction[]) => {
      emitter.emit(EmitterEvents.RICH_TEXT_COMMAND, { action })
    }

    const link = ref('')
    const linkPopoverVisible = ref(false)

    watch(richTextAttrs, () => linkPopoverVisible.value = false)

    const openLinkPopover = () => {
      link.value = richTextAttrs.value.link
      linkPopoverVisible.value = true
    }
    const updateLink = (link?: string) => {
      if (link) {
        const linkRegExp = /^(https?):\/\/[\w\-]+(\.[\w\-]+)+([\w\-.,@?^=%&:\/~+#]*[\w\-@?^=%&\/~+#])?$/
        if (!linkRegExp.test(link)) return message.error('不是正确的网页链接地址')
      }
      emitRichTextCommand('link', link)
      linkPopoverVisible.value = false
    }

    return {
      fill,
      lineHeight,
      wordSpace,
      textIndent,
      paragraphSpace,
      richTextAttrs,
      availableFonts,
      webFonts,
      fontSizeOptions,
      lineHeightOptions,
      wordSpaceOptions,
      textIndentOptions,
      paragraphSpaceOptions,
      updateLineHeight,
      updateParagraphSpace,
      updateWordSpace,
      updateTextIndent,
      updateFill,
      emitRichTextCommand,
      emitBatchRichTextCommand,
      presetStyles,
      link,
      linkPopoverVisible,
      openLinkPopover,
      updateLink,
    }
  },
})
</script>

<style lang="scss" scoped>
.text-style-panel {
  user-select: none;
}

.section-title {
  font-size: 11px;
  color: #5f6368;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 12px;
}

.row {
  width: 100%;
  display: flex;
  align-items: center;
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }
}

.input-group-compact {
  gap: 8px;
}

.preset-style {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.preset-style-item {
  height: 44px;
  border: 1px solid #e8eaed;
  border-radius: 6px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s;
  background: #f8f9fa;
  font-weight: 500;

  &:hover {
    border-color: #1a73e8;
    background: rgba(26, 115, 232, 0.04);
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0,0,0,0.08);
  }
}

.text-color-btn {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 4px 8px;
  height: 36px;
}

.text-color-block {
  width: 16px;
  height: 3px;
  margin-top: 2px;
  border-radius: 2px;
}

.font-size-btn {
  padding: 0 8px;
  height: 36px;
}

.link-popover {
  width: 240px;

  .btns {
    margin-top: 10px;
    text-align: right;
  }
}

:deep(.ant-divider) {
  margin: 16px 0;
}

:deep(.ant-btn-group) {
  display: flex;
  width: 100%;

  .ant-btn {
    flex: 1;
    height: 36px;
    padding: 0;
  }
}

:deep(.ant-radio-group) {
  display: flex;
  width: 100%;

  .ant-radio-button-wrapper {
    flex: 1;
    width: 100%;
    height: 36px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
</style>
