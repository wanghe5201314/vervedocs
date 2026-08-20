<template>
  <div class="mobile-bottom-bar">
    <div class="mobile-toolbar-primary">
      <button class="mobile-tool-btn" :class="{ active: showFormatPanel }" @click="togglePanel('format')">
        <span class="material-icons">text_format</span>
        <span class="mobile-tool-label">格式</span>
      </button>
      <button class="mobile-tool-btn" @click="$emit('insertImage')">
        <span class="material-icons">image</span>
        <span class="mobile-tool-label">图片</span>
      </button>
      <button class="mobile-tool-btn" @click="$emit('showPopup', 'table')">
        <span class="material-icons">table_chart</span>
        <span class="mobile-tool-label">表格</span>
      </button>
      <button class="mobile-tool-btn" @click="$emit('showPopup', 'link')">
        <span class="material-icons">link</span>
        <span class="mobile-tool-label">链接</span>
      </button>
      <button class="mobile-tool-btn" :class="{ active: showZoomPanel }" @click="togglePanel('zoom')">
        <span class="material-icons">zoom_in</span>
        <span class="mobile-tool-label">缩放</span>
      </button>
    </div>

    <div v-if="showZoomPanel" class="mobile-panel">
      <div class="mobile-panel-header">
        <span>缩放</span>
        <button class="mobile-panel-close" @click="showZoomPanel = false">
          <span class="material-icons">close</span>
        </button>
      </div>
      <div class="mobile-zoom-controls">
        <button class="mobile-zoom-btn" @click="$emit('command', 'executePageScaleMinus')">
          <span class="material-icons">remove</span>
        </button>
        <div class="mobile-zoom-track">
          <span class="mobile-zoom-value">{{ zoomText }}</span>
        </div>
        <button class="mobile-zoom-btn" @click="$emit('command', 'executePageScaleAdd')">
          <span class="material-icons">add</span>
        </button>
      </div>
    </div>

    <div v-if="showFormatPanel" class="mobile-panel">
      <div class="mobile-panel-header">
        <span>文字格式</span>
        <button class="mobile-panel-close" @click="showFormatPanel = false">
          <span class="material-icons">close</span>
        </button>
      </div>
      <div class="mobile-format-content">
        <div class="mobile-format-section">
          <div class="mobile-format-section-label">字体与字号</div>
          <div class="mobile-format-row">
            <select class="mobile-format-select" @change="$emit('fontChange', ($event.target as HTMLSelectElement).value)">
              <option value="">字体</option>
              <option value="宋体">宋体</option>
              <option value="黑体">黑体</option>
              <option value="微软雅黑" selected>微软雅黑</option>
              <option value="楷体">楷体</option>
              <option value="仿宋">仿宋</option>
              <option value="Arial">Arial</option>
              <option value="Times New Roman">Times New Roman</option>
            </select>
            <select class="mobile-format-select mobile-format-select-sm" @change="$emit('fontSizeChange', Number(($event.target as HTMLSelectElement).value))">
              <option value="10">10</option>
              <option value="12">12</option>
              <option value="14" selected>14</option>
              <option value="16">16</option>
              <option value="18">18</option>
              <option value="20">20</option>
              <option value="24">24</option>
              <option value="28">28</option>
              <option value="32">32</option>
              <option value="36">36</option>
              <option value="48">48</option>
              <option value="72">72</option>
            </select>
          </div>
        </div>

        <div class="mobile-format-section">
          <div class="mobile-format-section-label">文字样式</div>
          <div class="mobile-format-row mobile-format-btn-group">
            <button class="mobile-format-btn" @click="$emit('command', 'executeBold')"><span class="material-icons">format_bold</span></button>
            <button class="mobile-format-btn" @click="$emit('command', 'executeItalic')"><span class="material-icons">format_italic</span></button>
            <button class="mobile-format-btn" @click="$emit('command', 'executeUnderline')"><span class="material-icons">format_underlined</span></button>
            <button class="mobile-format-btn" @click="$emit('command', 'executeStrikeout')"><span class="material-icons">strikethrough_s</span></button>
          </div>
          <div class="mobile-format-row mobile-format-btn-group">
            <label class="mobile-color-label">
              <span class="material-icons">format_color_text</span>
              <input class="mobile-color-input" type="color" value="#000000" @change="$emit('fontColorChange', ($event.target as HTMLInputElement).value)" />
            </label>
            <label class="mobile-color-label">
              <span class="material-icons">highlight</span>
              <input class="mobile-color-input" type="color" value="#ffff00" @change="$emit('highlightChange', ($event.target as HTMLInputElement).value)" />
            </label>
            <button class="mobile-format-btn" @click="$emit('command', 'executePainter')"><span class="material-icons">format_paint</span></button>
            <button class="mobile-format-btn" @click="$emit('command', 'executeFormat')"><span class="material-icons">format_clear</span></button>
          </div>
        </div>

        <div class="mobile-format-section">
          <div class="mobile-format-section-label">段落</div>
          <div class="mobile-format-row">
            <select class="mobile-format-select" @change="$emit('titleLevelChange', ($event.target as HTMLSelectElement).value)">
              <option value="">正文</option>
              <option value="1">标题 1</option>
              <option value="2">标题 2</option>
              <option value="3">标题 3</option>
              <option value="4">标题 4</option>
              <option value="5">标题 5</option>
              <option value="6">标题 6</option>
            </select>
          </div>
          <div class="mobile-format-row mobile-format-btn-group">
            <button class="mobile-format-btn" @click="$emit('command', 'executeRowFlex', RowFlex.LEFT)"><span class="material-icons">format_align_left</span></button>
            <button class="mobile-format-btn" @click="$emit('command', 'executeRowFlex', RowFlex.CENTER)"><span class="material-icons">format_align_center</span></button>
            <button class="mobile-format-btn" @click="$emit('command', 'executeRowFlex', RowFlex.RIGHT)"><span class="material-icons">format_align_right</span></button>
            <button class="mobile-format-btn" @click="$emit('command', 'executeRowFlex', RowFlex.JUSTIFY)"><span class="material-icons">format_align_justify</span></button>
          </div>
          <div class="mobile-format-row mobile-format-btn-group">
            <button class="mobile-format-btn" @click="$emit('command', 'executeList', ListType.UL, ListStyle.DISC)"><span class="material-icons">format_list_bulleted</span></button>
            <button class="mobile-format-btn" @click="$emit('command', 'executeList', ListType.OL, ListStyle.DECIMAL)"><span class="material-icons">format_list_numbered</span></button>
            <button class="mobile-format-btn" @click="$emit('command', 'executeLineHeight', 1)"><span class="material-icons">density_small</span></button>
            <button class="mobile-format-btn" @click="$emit('command', 'executeLineHeight', 2)"><span class="material-icons">density_large</span></button>
          </div>
        </div>

        <div class="mobile-format-section">
          <div class="mobile-format-section-label">插入</div>
          <div class="mobile-format-row mobile-format-btn-group">
            <button class="mobile-format-btn" @click="$emit('command', 'executeSeparator')"><span class="material-icons">horizontal_rule</span></button>
            <button class="mobile-format-btn" @click="$emit('command', 'executePageBreak')"><span class="material-icons">insert_page_break</span></button>
            <button class="mobile-format-btn" @click="$emit('showPopup', 'search')"><span class="material-icons">find_replace</span></button>
            <button class="mobile-format-btn" @click="$emit('command', 'executeUndo')"><span class="material-icons">undo</span></button>
            <button class="mobile-format-btn" @click="$emit('command', 'executeRedo')"><span class="material-icons">redo</span></button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ListStyle, ListType, RowFlex } from '@vervedoc/core'

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
  showPopup: [name: 'table' | 'link' | 'search' | 'shortcuts']
  insertImage: []
}>()

const showFormatPanel = ref(false)
const showZoomPanel = ref(false)

const togglePanel = (panel: 'format' | 'zoom') => {
  if (panel === 'format') {
    showFormatPanel.value = !showFormatPanel.value
    showZoomPanel.value = false
  } else {
    showZoomPanel.value = !showZoomPanel.value
    showFormatPanel.value = false
  }
}
</script>
