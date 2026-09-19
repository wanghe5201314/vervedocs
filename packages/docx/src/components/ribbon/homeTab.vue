<template>
  <div class="home-ribbon" role="toolbar" aria-label="开始" @mousedown="preserveToolbarFocus">
    <div class="home-group home-clipboard" role="group" aria-label="剪贴板">
      <VdRibbonButton icon="content-copy" title="复制 (Ctrl+C)" :disabled="!hasSelection" @click="emit('command', 'copy')" />
      <VdRibbonButton icon="content-cut" title="剪切 (Ctrl+X)" :disabled="!hasSelection" @click="emit('command', 'cut')" />
      <a-dropdown :trigger="['contextmenu']">
        <VdRibbonButton icon="content-paste" title="粘贴 (Ctrl+V)，右键选择粘贴方式" @click="emit('command', 'paste')" />
        <template #overlay>
          <a-menu @click="({ key }: any) => emit('command', String(key))">
            <a-menu-item key="paste">粘贴</a-menu-item>
            <a-menu-item key="pasteNoFormat">无格式粘贴</a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
      <VdRibbonButton icon="format-paint" title="格式刷" :active="isPainter" @click="emit('command', 'painter')" />
    </div>

    <div class="home-group home-font" role="group" aria-label="字体">
      <div class="home-row home-font-top">
        <a-select
          class="home-font-select"
          :value="currentFont"
          :options="fontOptions"
          size="small"
          aria-label="字体"
          show-search
          option-filter-prop="label"
          :dropdown-match-select-width="180"
          @change="(value: any) => emit('font', String(value))"
        >
          <template #suffixIcon><span class="home-chevron" /></template>
          <template #option="{ value, label }"><span :style="{ fontFamily: value }">{{ label }}</span></template>
        </a-select>
        <a-select
          class="home-size-select"
          :value="currentSize"
          :options="sizeOptions"
          size="small"
          aria-label="字号（磅）"
          :dropdown-match-select-width="90"
          @change="(value: any) => emit('size', Number(value))"
        >
          <template #suffixIcon><span class="home-chevron" /></template>
        </a-select>
        <VdRibbonButton icon="text_increase" title="增大字号" :width="19" @click="emit('command', 'sizeAdd')" />
        <VdRibbonButton icon="text_decrease" title="减小字号" :width="19" @click="emit('command', 'sizeMinus')" />
        <a-dropdown :trigger="['click']">
          <VdRibbonButton icon="format-letter-case" title="字体选项" has-arrow />
          <template #overlay>
            <a-menu>
              <a-menu-item disabled>更改大小写（暂未支持）</a-menu-item>
              <a-sub-menu key="scale" title="字符缩放">
                <a-menu-item v-for="scale in CHARACTER_SCALE_OPTIONS" :key="scale" @click="emit('characterScale', scale)">
                  <span class="scale-check">{{ currentCharacterScale === scale ? '✓' : '' }}</span>{{ scale }}%
                </a-menu-item>
                <a-menu-divider />
                <a-menu-item key="custom" @click="emit('command', 'characterScaleCustom')">自定义缩放...</a-menu-item>
              </a-sub-menu>
            </a-menu>
          </template>
        </a-dropdown>
      </div>
      <div class="home-row home-font-bottom">
        <VdRibbonButton icon="format-bold" title="加粗 (Ctrl+B)" :active="isBold" @click="emit('command', 'bold')" />
        <VdRibbonButton icon="format-italic" title="斜体 (Ctrl+I)" :active="isItalic" @click="emit('command', 'italic')" />
        <VdRibbonButton icon="format-underline" title="下划线 (Ctrl+U)" :active="isUnderline" @click="emit('command', 'underline')" />
        <VdRibbonButton icon="format-strikethrough" title="删除线" :active="isStrikeout" @click="emit('command', 'strikeout')" />
        <VdRibbonButton icon="format-superscript" title="上标" @click="emit('command', 'superscript')" />
        <VdRibbonButton icon="format-subscript" title="下标" @click="emit('command', 'subscript')" />
        <a-popover v-for="kind in colorKinds" :key="kind" trigger="click" placement="bottomLeft">
          <VdRibbonButton
            :icon="kind === 'highlight' ? 'ink_highlighter' : 'format_color_text'"
            :title="kind === 'highlight' ? '文本高亮颜色' : '字体颜色'"
            :color-bar="kind === 'highlight' ? highlightColor : fontColor"
            has-arrow
          />
          <template #content>
            <div class="color-panel">
              <div class="color-grid">
                <button
                  v-for="color in COLOR_PALETTE"
                  :key="color"
                  type="button"
                  class="color-cell"
                  :title="color"
                  :aria-label="color"
                  :style="{ backgroundColor: color }"
                  @mousedown.prevent
                  @click="applyColor(kind, color)"
                />
              </div>
              <label class="color-custom">
                <input
                  type="color"
                  :aria-label="kind === 'highlight' ? '自定义高亮颜色' : '自定义字体颜色'"
                  :value="kind === 'highlight' ? highlightColor : fontColor"
                  @input="applyColor(kind, ($event.target as HTMLInputElement).value)"
                />
                <span class="custom-label">更多颜色</span>
              </label>
            </div>
          </template>
        </a-popover>
      </div>
    </div>

    <div class="home-group home-paragraph" role="group" aria-label="段落">
      <div class="home-row home-paragraph-top">
        <a-popover v-for="kind in listKinds" :key="kind" trigger="click" placement="bottomLeft">
          <VdRibbonButton
            :icon="kind === 'bullet' ? 'format-list-bulleted' : 'format-list-numbered'"
            :title="kind === 'bullet' ? '项目符号' : '编号'"
            :active="listType === (kind === 'bullet' ? 'ul' : 'ol')"
            has-arrow
          />
          <template #content>
            <div class="list-panel home-list-panel">
              <div class="list-panel-title">{{ kind === 'bullet' ? '项目符号' : '编号' }}</div>
              <div class="list-grid">
                <button type="button" class="list-cell list-cell-none" @mousedown.prevent @click="applyList(kind, null)">无</button>
                <button
                  v-for="item in listOptions[kind]"
                  :key="item.style"
                  type="button"
                  class="list-cell"
                  :title="item.label"
                  @mousedown.prevent
                  @click="applyList(kind, item.style)"
                >
                  <span v-for="(sample, index) in item.samples" :key="index" class="list-preview-row">
                    <span class="list-symbol">{{ sample }}</span><span class="list-line" />
                  </span>
                </button>
              </div>
            </div>
          </template>
        </a-popover>
        <a-dropdown :trigger="['click']">
          <VdRibbonButton icon="format_list_numbered_rtl" title="多级列表与缩进" has-arrow />
          <template #overlay>
            <a-menu>
              <a-menu-item disabled>多级列表（暂未支持）</a-menu-item>
              <a-sub-menu key="firstLine" title="首行缩进">
                <a-menu-item
                  v-for="option in FIRST_LINE_INDENT_OPTIONS"
                  :key="option.value"
                  @click="emit('command', 'firstLineIndent', Number(option.value) * INDENT_PX_PER_CHAR)"
                >{{ option.label }}</a-menu-item>
              </a-sub-menu>
            </a-menu>
          </template>
        </a-dropdown>
        <VdRibbonButton icon="format-indent-decrease" title="减少缩进" @click="emit('command', 'indentStep', 'sub')" />
        <VdRibbonButton icon="format-indent-increase" title="增加缩进" @click="emit('command', 'indentStep', 'add')" />
        <a-dropdown :trigger="['click']">
          <VdRibbonButton icon="format-line-spacing" title="行距" has-arrow />
          <template #overlay>
            <a-menu @click="({ key }: any) => emit('lineHeight', Number(key))">
              <a-menu-item v-for="option in LINE_HEIGHT_OPTIONS" :key="option.value">{{ option.label }}</a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </div>
      <div class="home-row home-paragraph-bottom">
        <VdRibbonButton
          v-for="alignment in alignments"
          :key="alignment.value"
          :icon="alignment.icon"
          :title="alignment.label"
          :active="(rowFlex || 'left') === alignment.value"
          @click="emit('rowFlex', alignment.value)"
        />
        <a-dropdown :trigger="['click']">
          <VdRibbonButton icon="format_paragraph" title="显示或隐藏编辑标记" :active="showLineBreak" has-arrow />
          <template #overlay>
            <a-menu>
              <a-menu-item @click="emit('command', 'toggleLineBreak')">{{ showLineBreak ? '隐藏' : '显示' }}编辑标记</a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
        <VdRibbonButton icon="format-color-fill" title="段落底纹（暂未支持）" has-arrow disabled />
      </div>
    </div>

    <div class="home-group home-editing" role="group" aria-label="格式与编辑">
      <VdRibbonButton icon="format-clear" title="清除格式 (Ctrl+\)" @click="emit('command', 'format')" />
      <a-dropdown :trigger="['click']">
        <VdRibbonButton icon="border_all" :title="inTable ? '表格边框' : '边框（请先选中表格）'" :disabled="!inTable" has-arrow />
        <template #overlay>
          <a-menu @click="({ key }: any) => emit('command', 'tableBorderType', String(key))">
            <a-menu-item key="all">所有边框</a-menu-item>
            <a-menu-item key="external">外侧边框</a-menu-item>
            <a-menu-item key="none">无边框</a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
      <a-dropdown :trigger="['click']">
        <VdRibbonButton icon="select-all" title="选择与编辑" />
        <template #overlay>
          <a-menu @click="({ key }: any) => emit('command', String(key))">
            <a-menu-item key="selectAll">全选 <span class="home-shortcut">Ctrl+A</span></a-menu-item>
            <a-menu-item key="openSearchPanel">查找 <span class="home-shortcut">Ctrl+F</span></a-menu-item>
            <a-menu-item key="delete" :disabled="!hasSelection">删除</a-menu-item>
            <a-menu-divider />
            <a-menu-item key="pasteNoFormat">无格式粘贴</a-menu-item>
            <a-menu-item key="undo" :disabled="!canUndo">撤销 <span class="home-shortcut">Ctrl+Z</span></a-menu-item>
            <a-menu-item key="redo" :disabled="!canRedo">重做 <span class="home-shortcut">Ctrl+Y</span></a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </div>

    <div class="home-styles" role="group" aria-label="样式">
      <div ref="styleStrip" class="home-styles-strip" @wheel="scrollStyles">
        <button
          v-for="style in styles"
          :key="style.id"
          type="button"
          class="home-style"
          :class="[style.preview, { 'is-selected': selectedStyle === style.id }]"
          :title="style.label"
          :aria-label="style.label"
          :aria-pressed="selectedStyle === style.id"
          @mousedown.prevent
          @click="applyStyle(style)"
        >{{ style.label }}</button>
      </div>
      <a-popover v-model:open="stylesOpen" trigger="click" placement="bottomRight">
        <button type="button" class="home-styles-more" title="展开样式库" aria-label="展开样式库" :aria-expanded="stylesOpen" @mousedown.prevent>
          <span class="home-chevron" />
        </button>
        <template #content>
          <div class="home-style-gallery" role="group" aria-label="全部样式">
            <button
              v-for="style in styles"
              :key="style.id"
              type="button"
              class="home-style"
              :class="[style.preview, { 'is-selected': selectedStyle === style.id }]"
              :title="style.label"
              :aria-pressed="selectedStyle === style.id"
              @mousedown.prevent
              @click="applyStyle(style)"
            >{{ style.label }}</button>
          </div>
        </template>
      </a-popover>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  EDITOR_FONT_OPTIONS, EDITOR_SIZE_OPTIONS,
  BULLET_STYLES, NUMBER_STYLES, LINE_HEIGHT_OPTIONS
} from '@vervedoc/core'
import { COLOR_PALETTE, CHARACTER_SCALE_OPTIONS, FIRST_LINE_INDENT_OPTIONS } from '@/config/constants'
import { VdRibbonButton } from '@vervedoc/ui'

const INDENT_PX_PER_CHAR = 14
const colorKinds = ['highlight', 'fontColor'] as const
const listKinds = ['bullet', 'number'] as const
const styleStrip = ref<HTMLElement | null>(null)
const stylesOpen = ref(false)

const props = defineProps<{
  currentFont: string
  currentSize: number
  isBold: boolean
  isItalic: boolean
  isUnderline: boolean
  isStrikeout: boolean
  fontColor: string
  highlightColor: string
  rowFlex?: string
  currentTitleLabel: string
  hasSelection?: boolean
  currentCharacterScale?: number
  isPainter?: boolean
  canUndo?: boolean
  canRedo?: boolean
  inTable?: boolean
  showLineBreak?: boolean
  listType?: string | null
}>()

const emit = defineEmits<{
  (e: 'command', cmd: string, ...args: any[]): void
  (e: 'font', value: string): void
  (e: 'size', value: number): void
  (e: 'fontColor', color: string): void
  (e: 'highlight', color: string): void
  (e: 'rowFlex', value: string): void
  (e: 'lineHeight', value: number): void
  (e: 'bullet', style: string | null): void
  (e: 'number', style: string | null): void
  (e: 'title', value: string | null): void
  (e: 'characterScale', value: number): void
}>()

const fontOptions = computed(() => {
  const options = EDITOR_FONT_OPTIONS.map(font => ({ ...font }))
  if (!options.some(font => font.value === props.currentFont)) {
    options.unshift({ value: props.currentFont, label: props.currentFont.split(',')[0] })
  }
  return options
})
// Keep the selection in points, including fractional sizes from imported documents.
const sizeOptions = computed(() =>
  [...new Set([...EDITOR_SIZE_OPTIONS.map(size => size.value), props.currentSize])]
    .sort((a, b) => a - b)
    .map(value => ({ value, label: String(value) }))
)
const listOptions = {
  bullet: BULLET_STYLES.map(item => ({ ...item, samples: [item.icon, item.icon, item.icon] })),
  number: NUMBER_STYLES
}
const alignments = [
  { value: 'left', icon: 'format-align-left', label: '左对齐' },
  { value: 'center', icon: 'format-align-center', label: '居中' },
  { value: 'right', icon: 'format-align-right', label: '右对齐' },
  { value: 'alignment', icon: 'format-align-justify', label: '两端对齐' }
]

interface GalleryStyle {
  id: string
  label: string
  preview: string
  level: string
}

const styles: GalleryStyle[] = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth']
  .map((level, index) => ({
    id: level, label: `标题${index + 1}`, level, preview: `home-style-heading-${index + 1}`
  }))
const selectedStyle = computed(() =>
  styles.find(style => style.label === props.currentTitleLabel)?.id ?? null
)

function preserveToolbarFocus(event: MouseEvent) {
  // Keep the editor selection when pressing a tool, but allow selects to receive focus.
  if (event.target instanceof HTMLElement && event.target.closest('.vd-ribbon-button')) {
    event.preventDefault()
  }
}

function applyColor(kind: typeof colorKinds[number], color: string) {
  if (kind === 'highlight') emit('highlight', color)
  else emit('fontColor', color)
}

function applyList(kind: typeof listKinds[number], style: string | null) {
  if (kind === 'bullet') emit('bullet', style)
  else emit('number', style)
}

function applyStyle(style: GalleryStyle) {
  emit('title', style.level)
  stylesOpen.value = false
}

function scrollStyles(event: globalThis.WheelEvent) {
  const strip = styleStrip.value
  if (!strip || strip.scrollWidth <= strip.clientWidth) return
  event.preventDefault()
  strip.scrollLeft += event.deltaY || event.deltaX
}

watch(selectedStyle, () => {
  const strip = styleStrip.value
  const selected = strip?.querySelector<HTMLElement>('.is-selected')
  if (!strip || !selected) return
  if (selected.offsetLeft < strip.scrollLeft) strip.scrollLeft = selected.offsetLeft
  else if (selected.offsetLeft + selected.offsetWidth > strip.scrollLeft + strip.clientWidth) {
    strip.scrollLeft = selected.offsetLeft + selected.offsetWidth - strip.clientWidth
  }
}, { flush: 'post' })
</script>

<style scoped>
@import '@/styles/ribbon-popover.css';

.home-ribbon {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  height: 70px;
  min-width: 720px;
  padding: 0 17px 0 0;
  background: #f1f1f1;
  color: #333;
  font: 12px Arial, 'Microsoft YaHei', sans-serif;
}
.home-group {
  position: relative;
  flex: 0 0 auto;
  display: grid;
  grid-template-rows: repeat(2, 22px);
  align-content: center;
  row-gap: 6px;
  height: 54px;
  box-sizing: border-box;
}
.home-group:not(.home-editing)::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  width: 1px;
  background: #cbcbcb;
}
.home-clipboard { width: 70px; padding: 0 8px; grid-template-columns: repeat(2, 22px); column-gap: 8px; }
.home-font { width: 230px; padding: 0 8px 0 9px; }
.home-row { display: flex; align-items: center; height: 22px; }
.home-font-top { gap: 3px; }
.home-font-bottom { justify-content: space-between; }
.home-font-select { width: 85px; flex: 0 0 85px; }
.home-size-select { width: 45px; flex: 0 0 45px; }
.home-ribbon :deep(.ant-select-single.ant-select-sm) { height: 22px; font-size: 12px; }
.home-ribbon :deep(.ant-select-single.ant-select-sm .ant-select-selector) {
  height: 22px;
  min-height: 22px;
  padding: 0 5px;
  border: 1px solid #c8c8c8;
  border-radius: 0;
  box-shadow: none;
  background: #fff;
}
.home-ribbon :deep(.ant-select-single.ant-select-sm .ant-select-selection-item),
.home-ribbon :deep(.ant-select-single.ant-select-sm .ant-select-selection-placeholder) {
  padding-right: 10px;
  font: 12px Arial, 'Microsoft YaHei', sans-serif;
  line-height: 20px;
}
.home-ribbon :deep(.ant-select-arrow) { right: 5px; width: 6px; color: #555; }
.home-chevron { display: inline-block; width: 5px; height: 5px; border-right: 1px solid currentColor; border-bottom: 1px solid currentColor; transform: translateY(-2px) rotate(45deg); }
.home-paragraph { width: 208px; padding: 0 7px; }
.home-paragraph-top, .home-paragraph-bottom { justify-content: space-between; }
.home-editing { width: 82px; padding: 0 9px; grid-template-columns: 22px 32px; column-gap: 10px; }
.home-styles { display: flex; flex: 0 1 678px; min-width: 0; height: 46px; box-sizing: border-box; border: 1px solid #d8d8d8; background: #fff; }
.home-styles-strip { position: relative; display: flex; flex: 1 1 0; min-width: 0; overflow-x: auto; scrollbar-width: none; }
.home-styles-strip::-webkit-scrollbar { display: none; }
.home-style {
  box-sizing: border-box;
  flex: 0 0 108px;
  width: 108px;
  height: 44px;
  padding: 0 10px;
  border: 0;
  border-right: 1px solid #dedede;
  border-radius: 0;
  background: #fff;
  color: #111;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  font: 14px Arial, 'Microsoft YaHei', sans-serif;
  line-height: 44px;
  cursor: pointer;
}
.home-style:hover { background: #eee; }
.home-style.is-selected { box-shadow: inset 0 0 0 2px #888; }
.home-style:focus-visible, .home-styles-more:focus-visible { outline: 1px solid #666; outline-offset: -3px; }
.home-style-heading-1 { font-size: 18px; }
.home-style-heading-2 { font-size: 17px; }
.home-style-heading-3 { font-size: 16px; }
.home-style-heading-4 { font-size: 15px; font-weight: 700; }
.home-style-heading-5 { font-size: 14px; font-weight: 700; }
.home-style-heading-6 { font-size: 13px; font-weight: 700; }
.home-styles-more { flex: 0 0 28px; display: flex; align-items: center; justify-content: center; padding: 0; border: 0; border-left: 1px solid #dedede; background: #fff; color: #555; cursor: pointer; }
.home-styles-more:hover { background: #eee; }
.home-style-gallery { display: grid; grid-template-columns: repeat(3, 108px); gap: 4px; max-height: 300px; overflow-y: auto; }
.home-style-gallery .home-style { border: 1px solid #dedede; }
.home-list-panel { width: 280px; }
.home-list-panel .list-grid { grid-template-columns: repeat(4, 1fr); }
.home-list-panel .list-preview-row { height: 10px; }
.home-list-panel .list-symbol { min-width: 16px; }
.scale-check { display: inline-block; width: 18px; color: #555; }
.home-shortcut { float: right; margin-left: 28px; color: #888; font-size: 12px; }
</style>
