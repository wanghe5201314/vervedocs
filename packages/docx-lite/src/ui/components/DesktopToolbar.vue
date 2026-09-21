<template>
  <div class="toolbar" @mousedown="preserveSelection">
    <button class="toolbar-btn" :disabled="!formatState.undo" title="撤销 (Ctrl+Z)" @click="$emit('command', 'executeUndo')"><span class="material-icons">undo</span></button>
    <button class="toolbar-btn" :disabled="!formatState.redo" title="重做 (Ctrl+Y)" @click="$emit('command', 'executeRedo')"><span class="material-icons">redo</span></button>
    <button class="toolbar-btn" title="打印 (Ctrl+P)" @click="$emit('command', 'executePrint')"><span class="material-icons">print</span></button>
    <button class="toolbar-btn" :class="{ active: formatState.painter }" :aria-pressed="!!formatState.painter" title="格式刷" @click="$emit('command', 'executePaintFormat')"><span class="material-icons">format_paint</span></button>
    <div class="toolbar-divider"></div>
    <div class="zoom-control">
      <button class="toolbar-btn" title="缩小" @click="$emit('command', 'executePageScaleMinus')"><span class="material-icons">remove</span></button>
      <span class="zoom-value">{{ zoomText }}</span>
      <button class="toolbar-btn" title="放大" @click="$emit('command', 'executePageScaleAdd')"><span class="material-icons">add</span></button>
    </div>
    <div class="toolbar-divider"></div>
    <select class="toolbar-select" style="width: 120px;" title="字体" :value="formatState.font" @change="$emit('fontChange', ($event.target as HTMLSelectElement).value)">
      <option v-if="formatState.font && !fontValues.includes(formatState.font)" :value="formatState.font">{{ formatState.font }}</option>
      <option v-for="f in FONT_FAMILY_LIST" :key="f" :value="FONT_FAMILY_VALUE[f] ?? f">{{ f }}</option>
    </select>
    <button class="toolbar-btn" title="减小字号" @click="$emit('command', 'executeSizeMinus')"><span class="material-icons">remove_circle_outline</span></button>
    <select class="toolbar-select" style="width: 68px;" title="字号" :value="formatState.size" @change="$emit('fontSizeChange', Number(($event.target as HTMLSelectElement).value))">
      <option v-if="formatState.size && !sizeValues.includes(formatState.size)" :value="formatState.size">{{ formatState.size }}</option>
      <option v-for="s in FONT_SIZE_LIST" :key="s" :value="FONT_SIZE[s] ?? Number(s)">{{ s }}</option>
    </select>
    <button class="toolbar-btn" title="增大字号" @click="$emit('command', 'executeSizeAdd')"><span class="material-icons">add_circle_outline</span></button>
    <div class="toolbar-divider"></div>
    <button class="toolbar-btn" :class="{ active: formatState.bold }" :aria-pressed="!!formatState.bold" title="加粗 (Ctrl+B)" @click="$emit('command', 'executeSetBold')"><span class="material-icons">format_bold</span></button>
    <button class="toolbar-btn" :class="{ active: formatState.italic }" :aria-pressed="!!formatState.italic" title="斜体 (Ctrl+I)" @click="$emit('command', 'executeSetItalic')"><span class="material-icons">format_italic</span></button>
    <button class="toolbar-btn" :class="{ active: formatState.underline }" :aria-pressed="!!formatState.underline" title="下划线 (Ctrl+U)" @click="$emit('command', 'executeSetUnderline')"><span class="material-icons">format_underlined</span></button>
    <button class="toolbar-btn" :class="{ active: formatState.strikeout }" :aria-pressed="!!formatState.strikeout" title="删除线" @click="$emit('command', 'executeSetStrikeout')"><span class="material-icons">strikethrough_s</span></button>
    <input class="color-picker" type="color" :value="formatState.color" title="文字颜色" @change="$emit('fontColorChange', ($event.target as HTMLInputElement).value)" />
    <input class="color-picker" type="color" :value="formatState.highlight" title="高亮颜色" @change="$emit('highlightChange', ($event.target as HTMLInputElement).value)" />
    <div class="toolbar-divider"></div>
    <button class="toolbar-btn" title="插入链接 (Ctrl+K)" @click="$emit('showPopup', 'link')"><span class="material-icons">link</span></button>
    <div class="toolbar-divider"></div>
    <select class="toolbar-select" style="width: 100px;" title="标题样式" :value="formatState.level" @change="$emit('titleLevelChange', ($event.target as HTMLSelectElement).value)">
      <option value="">正文</option>
      <option value="1">标题 1</option>
      <option value="2">标题 2</option>
      <option value="3">标题 3</option>
      <option value="4">标题 4</option>
      <option value="5">标题 5</option>
      <option value="6">标题 6</option>
    </select>
    <div class="toolbar-divider"></div>
    <button class="toolbar-btn" :class="{ active: formatState.rowFlex === ROW_FLEX.LEFT }" :aria-pressed="formatState.rowFlex === ROW_FLEX.LEFT" title="左对齐" @click="$emit('command', 'executeSetRowFlex', ROW_FLEX.LEFT)"><span class="material-icons">format_align_left</span></button>
    <button class="toolbar-btn" :class="{ active: formatState.rowFlex === ROW_FLEX.CENTER }" :aria-pressed="formatState.rowFlex === ROW_FLEX.CENTER" title="居中对齐" @click="$emit('command', 'executeSetRowFlex', ROW_FLEX.CENTER)"><span class="material-icons">format_align_center</span></button>
    <button class="toolbar-btn" :class="{ active: formatState.rowFlex === ROW_FLEX.RIGHT }" :aria-pressed="formatState.rowFlex === ROW_FLEX.RIGHT" title="右对齐" @click="$emit('command', 'executeSetRowFlex', ROW_FLEX.RIGHT)"><span class="material-icons">format_align_right</span></button>
    <button class="toolbar-btn" :class="{ active: formatState.rowFlex === ROW_FLEX.JUSTIFY }" :aria-pressed="formatState.rowFlex === ROW_FLEX.JUSTIFY" title="两端对齐" @click="$emit('command', 'executeSetRowFlex', ROW_FLEX.JUSTIFY)"><span class="material-icons">format_align_justify</span></button>
    <div class="toolbar-divider"></div>
    <select class="toolbar-select" title="行间距" :value="isPixelLineHeight ? '' : formatState.lineHeight" @change="$emit('lineHeightChange', Number(($event.target as HTMLSelectElement).value))">
      <option v-if="isPixelLineHeight" value="" disabled>{{ formatState.lineHeightRule === 'exact' ? '固定值' : '最小值' }} {{ formatState.lineHeight }}px</option>
      <option v-else-if="formatState.lineHeight && ![1, 1.15, 1.5, 2].includes(formatState.lineHeight)" :value="formatState.lineHeight">{{ formatState.lineHeight }}</option>
      <option value="1">单倍行距</option>
      <option value="1.15">1.15 倍行距</option>
      <option value="1.5">1.5 倍行距</option>
      <option value="2">双倍行距</option>
    </select>
    <div class="toolbar-divider"></div>
    <button class="toolbar-btn" title="项目符号列表" @click="$emit('command', 'executeSetList', LIST_TYPE.UL, LIST_STYLE.DISC)"><span class="material-icons">format_list_bulleted</span></button>
    <button class="toolbar-btn" title="编号列表" @click="$emit('command', 'executeSetList', LIST_TYPE.OL, LIST_STYLE.DECIMAL)"><span class="material-icons">format_list_numbered</span></button>
    <button class="toolbar-btn" title="清除格式" @click="$emit('command', 'executeClearFormat')"><span class="material-icons">format_clear</span></button>
  </div>

  <div class="toolbar toolbar-secondary" @mousedown="preserveSelection">
    <button class="toolbar-btn" title="插入图片" @click="$emit('insertImage')"><span class="material-icons">image</span></button>
    <button class="toolbar-btn" title="插入表格" @click="$emit('showPopup', 'table')"><span class="material-icons">table_chart</span></button>
    <button class="toolbar-btn" title="插入目录" @click="$emit('showPopup', 'toc')"><span class="material-icons">format_list_bulleted</span></button>
    <div class="toolbar-divider"></div>
    <button class="toolbar-btn" title="插入分隔线" @click="$emit('command', 'executeSeparator')"><span class="material-icons">horizontal_rule</span></button>
    <button class="toolbar-btn" title="插入分页符" @click="$emit('command', 'executePageBreak')"><span class="material-icons">insert_page_break</span></button>
    <div class="toolbar-divider"></div>
    <button class="toolbar-btn" title="查找和替换 (Ctrl+H)" @click="$emit('showPopup', 'search')"><span class="material-icons">find_replace</span></button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { IRangeStyle } from '@vervedoc/core'
import { ROW_FLEX, LIST_TYPE, LIST_STYLE, FONT_FAMILY_LIST, FONT_FAMILY_VALUE, FONT_SIZE, FONT_SIZE_LIST } from '@vervedoc/core'

const fontValues = FONT_FAMILY_LIST.map(font => FONT_FAMILY_VALUE[font] ?? font)
const sizeValues = FONT_SIZE_LIST.map(size => FONT_SIZE[size] ?? Number(size))
const preserveSelection = (event: MouseEvent) => {
  if ((event.target as HTMLElement).closest('button')) event.preventDefault()
}

const props = defineProps<{
  zoomText: string
  formatState: Partial<IRangeStyle>
}>()
const isPixelLineHeight = computed(() =>
  props.formatState.lineHeightRule === 'exact' || props.formatState.lineHeightRule === 'atLeast'
)

defineEmits<{
  command: [command: string, ...args: any[]]
  fontChange: [value: string]
  fontSizeChange: [value: number]
  fontColorChange: [value: string]
  highlightChange: [value: string]
  titleLevelChange: [value: string]
  lineHeightChange: [value: number]
  showPopup: [name: 'table' | 'link' | 'search' | 'shortcuts' | 'toc']
  insertImage: []
}>()
</script>

<style scoped>
.toolbar-btn.active {
  background: #e8f0fe;
  color: #1a73e8;
}
.toolbar-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
</style>
