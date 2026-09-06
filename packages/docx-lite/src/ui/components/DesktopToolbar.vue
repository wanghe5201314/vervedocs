<template>
  <div class="toolbar">
    <button class="toolbar-btn" title="撤销 (Ctrl+Z)" @click="$emit('command', 'executeUndo')"><span class="material-icons">undo</span></button>
    <button class="toolbar-btn" title="重做 (Ctrl+Y)" @click="$emit('command', 'executeRedo')"><span class="material-icons">redo</span></button>
    <button class="toolbar-btn" title="打印 (Ctrl+P)" @click="$emit('command', 'executePrint')"><span class="material-icons">print</span></button>
    <button class="toolbar-btn" title="格式刷" @click="$emit('command', 'executePainter')"><span class="material-icons">format_paint</span></button>
    <div class="toolbar-divider"></div>
    <div class="zoom-control">
      <button class="toolbar-btn" title="缩小" @click="$emit('command', 'executePageScaleMinus')"><span class="material-icons">remove</span></button>
      <span class="zoom-value">{{ zoomText }}</span>
      <button class="toolbar-btn" title="放大" @click="$emit('command', 'executePageScaleAdd')"><span class="material-icons">add</span></button>
    </div>
    <div class="toolbar-divider"></div>
    <select class="toolbar-select" style="width: 120px;" title="字体" @change="$emit('fontChange', ($event.target as HTMLSelectElement).value)">
      <option v-for="f in FONT_FAMILY_LIST" :key="f" :value="FONT_FAMILY_VALUE[f] ?? f" :selected="(FONT_FAMILY_VALUE[f] ?? f) === 'Microsoft YaHei'">{{ f }}</option>
    </select>
    <button class="toolbar-btn" title="减小字号" @click="$emit('command', 'executeSizeMinus')"><span class="material-icons">remove_circle_outline</span></button>
    <select class="toolbar-select" style="width: 68px;" title="字号" @change="$emit('fontSizeChange', Number(($event.target as HTMLSelectElement).value))">
      <option v-for="s in FONT_SIZE_LIST" :key="s" :value="FONT_SIZE[s] ?? Number(s)" :selected="(FONT_SIZE[s] ?? Number(s)) === 14">{{ s }}</option>
    </select>
    <button class="toolbar-btn" title="增大字号" @click="$emit('command', 'executeSizeAdd')"><span class="material-icons">add_circle_outline</span></button>
    <div class="toolbar-divider"></div>
    <button class="toolbar-btn" title="加粗 (Ctrl+B)" @click="$emit('command', 'executeBold')"><span class="material-icons">format_bold</span></button>
    <button class="toolbar-btn" title="斜体 (Ctrl+I)" @click="$emit('command', 'executeItalic')"><span class="material-icons">format_italic</span></button>
    <button class="toolbar-btn" title="下划线 (Ctrl+U)" @click="$emit('command', 'executeUnderline')"><span class="material-icons">format_underlined</span></button>
    <button class="toolbar-btn" title="删除线" @click="$emit('command', 'executeStrikeout')"><span class="material-icons">strikethrough_s</span></button>
    <input class="color-picker" type="color" value="#000000" title="文字颜色" @change="$emit('fontColorChange', ($event.target as HTMLInputElement).value)" />
    <input class="color-picker" type="color" value="#ffff00" title="高亮颜色" @change="$emit('highlightChange', ($event.target as HTMLInputElement).value)" />
    <div class="toolbar-divider"></div>
    <button class="toolbar-btn" title="插入链接 (Ctrl+K)" @click="$emit('showPopup', 'link')"><span class="material-icons">link</span></button>
    <div class="toolbar-divider"></div>
    <select class="toolbar-select" style="width: 100px;" title="标题样式" @change="$emit('titleLevelChange', ($event.target as HTMLSelectElement).value)">
      <option value="">正文</option>
      <option value="1">标题 1</option>
      <option value="2">标题 2</option>
      <option value="3">标题 3</option>
      <option value="4">标题 4</option>
      <option value="5">标题 5</option>
      <option value="6">标题 6</option>
    </select>
    <div class="toolbar-divider"></div>
    <button class="toolbar-btn" title="左对齐" @click="$emit('command', 'executeRowFlex', ROW_FLEX.LEFT)"><span class="material-icons">format_align_left</span></button>
    <button class="toolbar-btn" title="居中对齐" @click="$emit('command', 'executeRowFlex', ROW_FLEX.CENTER)"><span class="material-icons">format_align_center</span></button>
    <button class="toolbar-btn" title="右对齐" @click="$emit('command', 'executeRowFlex', ROW_FLEX.RIGHT)"><span class="material-icons">format_align_right</span></button>
    <button class="toolbar-btn" title="两端对齐" @click="$emit('command', 'executeRowFlex', ROW_FLEX.JUSTIFY)"><span class="material-icons">format_align_justify</span></button>
    <div class="toolbar-divider"></div>
    <select class="toolbar-select" title="行间距" @change="$emit('lineHeightChange', Number(($event.target as HTMLSelectElement).value))">
      <option value="1">单倍行距</option>
      <option value="1.15">1.15 倍行距</option>
      <option value="1.5">1.5 倍行距</option>
      <option value="2">双倍行距</option>
    </select>
    <div class="toolbar-divider"></div>
    <button class="toolbar-btn" title="项目符号列表" @click="$emit('command', 'executeList', LIST_TYPE.UL, LIST_STYLE.DISC)"><span class="material-icons">format_list_bulleted</span></button>
    <button class="toolbar-btn" title="编号列表" @click="$emit('command', 'executeList', LIST_TYPE.OL, LIST_STYLE.DECIMAL)"><span class="material-icons">format_list_numbered</span></button>
    <button class="toolbar-btn" title="清除格式" @click="$emit('command', 'executeFormat')"><span class="material-icons">format_clear</span></button>
  </div>

  <div class="toolbar toolbar-secondary">
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
import { ROW_FLEX, LIST_TYPE, LIST_STYLE, FONT_FAMILY_LIST, FONT_FAMILY_VALUE, FONT_SIZE, FONT_SIZE_LIST } from '@vervedoc/core'

defineProps<{
  zoomText: string
}>()

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