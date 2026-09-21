<template>
  <div class="mobile-bottom-bar" @mousedown="preserveSelection">
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
      <button class="mobile-tool-btn" @click="$emit('showPopup', 'toc')">
        <span class="material-icons">format_list_bulleted</span>
        <span class="mobile-tool-label">目录</span>
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
            <select class="mobile-format-select" :value="formatState.font" @change="$emit('fontChange', ($event.target as HTMLSelectElement).value)">
              <option v-if="formatState.font && !fontValues.includes(formatState.font)" :value="formatState.font">{{ formatState.font }}</option>
              <option v-for="f in FONT_FAMILY_LIST" :key="f" :value="FONT_FAMILY_VALUE[f] ?? f">{{ f }}</option>
            </select>
            <select class="mobile-format-select mobile-format-select-sm" :value="formatState.size" @change="$emit('fontSizeChange', Number(($event.target as HTMLSelectElement).value))">
              <option v-if="formatState.size && !sizeValues.includes(formatState.size)" :value="formatState.size">{{ formatState.size }}</option>
              <option v-for="s in FONT_SIZE_LIST" :key="s" :value="FONT_SIZE[s] ?? Number(s)">{{ s }}</option>
            </select>
          </div>
        </div>

        <div class="mobile-format-section">
          <div class="mobile-format-section-label">文字样式</div>
          <div class="mobile-format-row mobile-format-btn-group">
            <button class="mobile-format-btn" :class="{ active: formatState.bold }" :aria-pressed="!!formatState.bold" @click="$emit('command', 'executeSetBold')"><span class="material-icons">format_bold</span></button>
            <button class="mobile-format-btn" :class="{ active: formatState.italic }" :aria-pressed="!!formatState.italic" @click="$emit('command', 'executeSetItalic')"><span class="material-icons">format_italic</span></button>
            <button class="mobile-format-btn" :class="{ active: formatState.underline }" :aria-pressed="!!formatState.underline" @click="$emit('command', 'executeSetUnderline')"><span class="material-icons">format_underlined</span></button>
            <button class="mobile-format-btn" :class="{ active: formatState.strikeout }" :aria-pressed="!!formatState.strikeout" @click="$emit('command', 'executeSetStrikeout')"><span class="material-icons">strikethrough_s</span></button>
          </div>
          <div class="mobile-format-row mobile-format-btn-group">
            <label class="mobile-color-label">
              <span class="material-icons">format_color_text</span>
              <input class="mobile-color-input" type="color" :value="formatState.color" @change="$emit('fontColorChange', ($event.target as HTMLInputElement).value)" />
            </label>
            <label class="mobile-color-label">
              <span class="material-icons">highlight</span>
              <input class="mobile-color-input" type="color" :value="formatState.highlight" @change="$emit('highlightChange', ($event.target as HTMLInputElement).value)" />
            </label>
            <button class="mobile-format-btn" :class="{ active: formatState.painter }" :aria-pressed="!!formatState.painter" @click="$emit('command', 'executePaintFormat')"><span class="material-icons">format_paint</span></button>
            <button class="mobile-format-btn" @click="$emit('command', 'executeClearFormat')"><span class="material-icons">format_clear</span></button>
          </div>
        </div>

        <div class="mobile-format-section">
          <div class="mobile-format-section-label">段落</div>
          <div class="mobile-format-row">
            <select class="mobile-format-select" :value="formatState.level" @change="$emit('titleLevelChange', ($event.target as HTMLSelectElement).value)">
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
            <button class="mobile-format-btn" :class="{ active: formatState.rowFlex === ROW_FLEX.LEFT }" :aria-pressed="formatState.rowFlex === ROW_FLEX.LEFT" @click="$emit('command', 'executeSetRowFlex', ROW_FLEX.LEFT)"><span class="material-icons">format_align_left</span></button>
            <button class="mobile-format-btn" :class="{ active: formatState.rowFlex === ROW_FLEX.CENTER }" :aria-pressed="formatState.rowFlex === ROW_FLEX.CENTER" @click="$emit('command', 'executeSetRowFlex', ROW_FLEX.CENTER)"><span class="material-icons">format_align_center</span></button>
            <button class="mobile-format-btn" :class="{ active: formatState.rowFlex === ROW_FLEX.RIGHT }" :aria-pressed="formatState.rowFlex === ROW_FLEX.RIGHT" @click="$emit('command', 'executeSetRowFlex', ROW_FLEX.RIGHT)"><span class="material-icons">format_align_right</span></button>
            <button class="mobile-format-btn" :class="{ active: formatState.rowFlex === ROW_FLEX.JUSTIFY }" :aria-pressed="formatState.rowFlex === ROW_FLEX.JUSTIFY" @click="$emit('command', 'executeSetRowFlex', ROW_FLEX.JUSTIFY)"><span class="material-icons">format_align_justify</span></button>
          </div>
          <div class="mobile-format-row mobile-format-btn-group">
            <button class="mobile-format-btn" @click="$emit('command', 'executeSetList', LIST_TYPE.UL, LIST_STYLE.DISC)"><span class="material-icons">format_list_bulleted</span></button>
            <button class="mobile-format-btn" @click="$emit('command', 'executeSetList', LIST_TYPE.OL, LIST_STYLE.DECIMAL)"><span class="material-icons">format_list_numbered</span></button>
            <button class="mobile-format-btn" :class="{ active: !isPixelLineHeight && formatState.lineHeight === 1 }" :aria-pressed="!isPixelLineHeight && formatState.lineHeight === 1" @click="$emit('lineHeightChange', 1)"><span class="material-icons">density_small</span></button>
            <button class="mobile-format-btn" :class="{ active: !isPixelLineHeight && formatState.lineHeight === 2 }" :aria-pressed="!isPixelLineHeight && formatState.lineHeight === 2" @click="$emit('lineHeightChange', 2)"><span class="material-icons">density_large</span></button>
          </div>
        </div>

        <div class="mobile-format-section">
          <div class="mobile-format-section-label">插入</div>
          <div class="mobile-format-row mobile-format-btn-group">
            <button class="mobile-format-btn" @click="$emit('command', 'executeSeparator')"><span class="material-icons">horizontal_rule</span></button>
            <button class="mobile-format-btn" @click="$emit('command', 'executePageBreak')"><span class="material-icons">insert_page_break</span></button>
            <button class="mobile-format-btn" @click="$emit('showPopup', 'search')"><span class="material-icons">find_replace</span></button>
            <button class="mobile-format-btn" :disabled="!formatState.undo" @click="$emit('command', 'executeUndo')"><span class="material-icons">undo</span></button>
            <button class="mobile-format-btn" :disabled="!formatState.redo" @click="$emit('command', 'executeRedo')"><span class="material-icons">redo</span></button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
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

<style scoped>
.mobile-format-btn.active {
  background: #e8f0fe;
  color: #1a73e8;
}
.mobile-format-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
</style>
