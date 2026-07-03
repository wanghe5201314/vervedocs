<template>
  <div class="compact-toolbar" :class="{ 'simple-mode': simpleMode }">
    <!-- 第一行：文字处理 -->
    <div class="toolbar-row">
      <button class="tb" @click="emit('cmd', 'undo')" title="撤销"><MdiIcon name="undo" /></button>
      <button class="tb" @click="emit('cmd', 'redo')" title="重做"><MdiIcon name="redo" /></button>
      <button class="tb" @click="emit('cmd', 'painter')" title="格式刷"><MdiIcon name="format-paint" /></button>
      <el-divider direction="vertical" />
      <el-select :model-value="currentFont" size="small" style="width: 120px" @change="(v: string) => emit('font', v)">
        <el-option v-for="f in fontList" :key="f.value" :label="f.label" :value="f.value"><span :style="{ fontFamily: f.value }">{{ f.label }}</span></el-option>
      </el-select>
      <el-select :model-value="currentSize" size="small" style="width: 65px" @change="(v: number) => emit('size', v)">
        <el-option v-for="s in sizeList" :key="s.value" :label="s.label" :value="s.value" />
      </el-select>
      <button class="tb" @click="emit('cmd', 'sizeAdd')" title="增大"><MdiIcon name="plus" /></button>
      <button class="tb" @click="emit('cmd', 'sizeMinus')" title="减小"><MdiIcon name="minus" /></button>
      <el-divider direction="vertical" />
      <button class="tb" :class="{ active: isBold }" @click="emit('cmd', 'bold')" title="加粗"><MdiIcon name="format-bold" /></button>
      <button class="tb" :class="{ active: isItalic }" @click="emit('cmd', 'italic')" title="斜体"><MdiIcon name="format-italic" /></button>
      <button class="tb" :class="{ active: isUnderline }" @click="emit('cmd', 'underline')" title="下划线"><MdiIcon name="format-underline" /></button>
      <button class="tb" :class="{ active: isStrikeout }" @click="emit('cmd', 'strikeout')" title="删除线"><MdiIcon name="format-strikethrough" /></button>
      <button class="tb" @click="emit('cmd', 'superscript')" title="上标"><MdiIcon name="format-superscript" /></button>
      <button class="tb" @click="emit('cmd', 'subscript')" title="下标"><MdiIcon name="format-subscript" /></button>
      <el-popover placement="bottom" :width="260" trigger="click">
        <template #reference><button class="tb color-btn" title="字体颜色"><MdiIcon name="format-color-text" /><span class="color-bar" :style="{ backgroundColor: fontColor }"></span></button></template>
        <div class="color-panel">
          <div class="color-grid"><button v-for="c in colorPalette" :key="c" class="color-cell" :style="{ backgroundColor: c }" @click="emit('fontColor', c)"></button></div>
          <div class="color-custom">
            <el-color-picker :model-value="fontColor" @change="(c: string | null) => c && emit('fontColor', c)" show-alpha />
            <span class="custom-label">更多颜色</span>
          </div>
        </div>
      </el-popover>
      <el-popover placement="bottom" :width="260" trigger="click">
        <template #reference><button class="tb color-btn" title="高亮"><MdiIcon name="format-color-highlight" /><span class="color-bar" :style="{ backgroundColor: highlightColor }"></span></button></template>
        <div class="color-panel">
          <div class="color-grid"><button v-for="c in colorPalette" :key="c" class="color-cell" :style="{ backgroundColor: c }" @click="emit('highlight', c)"></button></div>
          <div class="color-custom">
            <el-color-picker :model-value="highlightColor" @change="(c: string | null) => c && emit('highlight', c)" show-alpha />
            <span class="custom-label">更多颜色</span>
          </div>
        </div>
      </el-popover>
      <el-divider direction="vertical" />
      <el-dropdown trigger="click" @command="(v: number) => emit('cmd', 'firstLineIndent', v * INDENT_PX_PER_CHAR)">
        <button class="tb has-text style-btn"><span class="btn-text">{{ firstLineIndentLabel }}</span><MdiIcon name="chevron-down" class="arrow" /></button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item v-for="o in firstLineIndentOptions" :key="o.value" :command="o.value">{{ o.label }}</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <el-dropdown trigger="click" @command="(v: string | null) => emit('title', v)">
        <button class="tb has-text style-btn"><span class="btn-text">{{ currentTitleLabel }}</span><MdiIcon name="chevron-down" class="arrow" /></button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item :command="null">正文</el-dropdown-item>
            <el-dropdown-item command="first">标题1</el-dropdown-item>
            <el-dropdown-item command="second">标题2</el-dropdown-item>
            <el-dropdown-item command="third">标题3</el-dropdown-item>
            <el-dropdown-item command="fourth">标题4</el-dropdown-item>
            <el-dropdown-item command="fifth">标题5</el-dropdown-item>
            <el-dropdown-item command="sixth">标题6</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <button class="tb" :class="{ active: rowFlex === 'left' || !rowFlex }" @click="emit('rowFlex', 'left')" title="左对齐"><MdiIcon name="format-align-left" /></button>
      <button class="tb" :class="{ active: rowFlex === 'center' }" @click="emit('rowFlex', 'center')" title="居中"><MdiIcon name="format-align-center" /></button>
      <button class="tb" :class="{ active: rowFlex === 'right' }" @click="emit('rowFlex', 'right')" title="右对齐"><MdiIcon name="format-align-right" /></button>
      <button class="tb" :class="{ active: rowFlex === 'alignment' }" @click="emit('rowFlex', 'alignment')" title="两端对齐"><MdiIcon name="format-align-justify" /></button>
      <el-divider direction="vertical" />
      <el-dropdown trigger="click" @command="(v: number) => emit('lineHeight', v)">
        <button class="tb" title="行距"><MdiIcon name="format-line-spacing" /><MdiIcon name="chevron-down" class="arrow" /></button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item v-for="lh in lineHeightOptions" :key="lh.value" :command="lh.value">{{ lh.label }}</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <el-popover placement="bottom" :width="400" trigger="click" v-model:visible="bulletPopoverVisible">
        <template #reference><button class="tb" title="项目符号"><MdiIcon name="format-list-bulleted" /><MdiIcon name="chevron-down" class="arrow" /></button></template>
        <div class="list-panel">
          <div class="list-panel-title">预设样式</div>
          <div class="list-grid bullet-grid">
            <button class="list-cell list-cell-none" @click="emit('bullet', null)">无</button>
            <button v-for="b in bulletStyles" :key="b.style" class="list-cell" :title="b.label" @click="emit('bullet', b.style)">
              <div class="list-preview">
                <div class="list-preview-row"><span class="list-symbol">{{ b.icon }}</span><span class="list-line"></span></div>
                <div class="list-preview-row"><span class="list-symbol">{{ b.icon }}</span><span class="list-line"></span></div>
                <div class="list-preview-row"><span class="list-symbol">{{ b.icon }}</span><span class="list-line"></span></div>
              </div>
            </button>
          </div>
          <div class="list-custom-entry" @click="handleCustomBullet">
            <span class="custom-bullet-text">自定义符号...</span>
          </div>
        </div>
      </el-popover>
      <el-popover placement="bottom" :width="335" trigger="click">
        <template #reference><button class="tb" title="编号"><MdiIcon name="format-list-numbered" /><MdiIcon name="chevron-down" class="arrow" /></button></template>
        <div class="list-panel">
          <div class="list-panel-title">编号</div>
          <div class="list-grid number-grid">
            <button class="list-cell list-cell-none" @click="emit('number', null)">无</button>
            <button v-for="n in numberStyles" :key="n.style" class="list-cell" :title="n.label" @click="emit('number', n.style)">
              <div class="list-preview">
                <div class="list-preview-row"><span class="list-num">{{ n.samples[0] }}</span><span class="list-line"></span></div>
                <div class="list-preview-row"><span class="list-num">{{ n.samples[1] }}</span><span class="list-line"></span></div>
                <div class="list-preview-row"><span class="list-num">{{ n.samples[2] }}</span><span class="list-line"></span></div>
              </div>
            </button>
          </div>
        </div>
      </el-popover>
      <button class="tb" @click="emit('cmd', 'indentStep', 'sub')" title="减少缩进"><MdiIcon name="format-indent-decrease" /></button>
      <button class="tb" @click="emit('cmd', 'indentStep', 'add')" title="增加缩进"><MdiIcon name="format-indent-increase" /></button>
      <button class="tb" @click="emit('cmd', 'format')" title="清除格式"><MdiIcon name="format-clear" /></button>
    </div>

    <!-- 第二行：插入与工具 -->
    <div class="toolbar-row">
      <el-popover placement="bottom" :width="260" trigger="click" v-model:visible="tablePopoverVisible">
        <template #reference><button class="tb" title="表格"><MdiIcon name="table" /><MdiIcon name="chevron-down" class="arrow" /></button></template>
        <div class="table-selector">
          <div class="table-title">插入表格</div>
          <div class="table-grid" @mouseleave="hoverCell = { r: -1, c: -1 }">
            <div v-for="r in 10" :key="r" class="tgrid-row">
              <div v-for="c in 10" :key="c" class="tgrid-cell" :class="{ selected: r <= hoverCell.r + 1 && c <= hoverCell.c + 1 }" @mouseover="hoverCell = { r: r - 1, c: c - 1 }" @click="handleInsertTable(r, c)"></div>
            </div>
          </div>
          <div class="table-info">{{ hoverCell.r >= 0 ? `${hoverCell.r + 1} × ${hoverCell.c + 1}` : '选择大小' }}</div>
        </div>
      </el-popover>
      <button class="tb" @click="emit('cmd', 'image')" title="图片"><MdiIcon name="image-outline" /></button>
      <button class="tb" @click="emit('cmd', 'video')" title="视频"><MdiIcon name="video-outline" /></button>
      <button class="tb" @click="emit('cmd', 'audio')" title="音频"><MdiIcon name="music-note" /></button>
      <button class="tb" @click="emit('cmd', 'insertChart')" title="图表"><MdiIcon name="chart-bar" /></button>
      <el-popover placement="bottom" :width="470" trigger="click" v-model:visible="shapesPopoverVisible">
        <template #reference>
          <button class="tb" title="形状"><MdiIcon name="shape-outline" /><MdiIcon name="chevron-down" class="arrow" /></button>
        </template>
        <div class="shapes-selector">
          <div class="shapes-header">
            <div class="shapes-title">插入形状</div>
          </div>
          <div class="shapes-sections">
            <div v-for="cat in shapeCategories" :key="cat.name" class="shape-section">
              <div class="shape-section-title">
                <MdiIcon :name="cat.icon" />
                <span class="shape-section-name">{{ cat.name }}</span>
              </div>
              <div class="shape-grid">
                <button
                  v-for="shape in cat.shapes"
                  :key="shape.type"
                  class="shape-cell"
                  :title="shape.name"
                  @click="handleInsertShape(shape.type)"
                >
                  <MdiIcon :name="shape.icon" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </el-popover>
      <el-divider direction="vertical" />
      <button class="tb" @click="emit('cmd', 'hyperlink')" title="链接"><MdiIcon name="link-variant" /></button>
      <button class="tb" @click="emit('cmd', 'bookmark')" title="书签"><MdiIcon name="bookmark-outline" /></button>
      <button class="tb" @click="emit('cmd', 'latex')" title="公式"><MdiIcon name="function-variant" /></button>
      <el-popover placement="bottom" :width="520" trigger="click" v-model:visible="symbolPopoverVisible">
        <template #reference>
          <button class="tb" title="符号"><MdiIcon name="omega" /><MdiIcon name="chevron-down" class="arrow" /></button>
        </template>
        <div class="symbol-selector">
          <div class="symbol-title">插入符号</div>
          <div class="symbol-categories">
            <div v-for="category in symbolCategories" :key="category.name" class="symbol-category">
              <div class="category-name">{{ category.name }}</div>
              <div class="symbol-grid">
                <button v-for="s in category.symbols" :key="s" class="symbol-item" @click="handleInsertSymbol(s)">{{ s }}</button>
              </div>
            </div>
          </div>
        </div>
      </el-popover>
      <el-divider direction="vertical" />
      <el-popover placement="bottom" :width="220" trigger="click" v-model:visible="separatorPopoverVisible">
        <template #reference>
          <button class="tb" title="分割线"><MdiIcon name="minus" /><MdiIcon name="chevron-down" class="arrow" /></button>
        </template>
        <div class="separator-selector">
          <div class="separator-title">分割线样式</div>
          <div class="separator-list">
            <button
              v-for="sep in separatorStyles"
              :key="sep.name"
              class="separator-item"
              @click="handleInsertSeparator(sep)"
            >
              <div class="separator-preview" :class="getSeparatorClass(sep)" :style="getSeparatorStyle(sep)"></div>
              <span class="separator-name">{{ sep.name }}</span>
            </button>
          </div>
        </div>
      </el-popover>
      <el-divider direction="vertical" />
      <button class="tb" @click="emit('cmd', 'pageBreak')" title="分页"><MdiIcon name="format-page-break" /></button>
      <el-divider direction="vertical" />
      <button class="tb" @click="emit('cmd', 'barcode')" title="条形码"><MdiIcon name="barcode" /></button>
      <button class="tb" @click="emit('cmd', 'qrcode')" title="二维码"><MdiIcon name="qrcode" /></button>
      <button class="tb" @click="emit('cmd', 'addWatermark')" title="水印"><MdiIcon name="watermark" /></button>
      <button class="tb" @click="emit('cmd', 'signature')" title="签名"><MdiIcon name="draw" /></button>
      <button class="tb" @click="emit('cmd', 'insertDate')" title="日期"><MdiIcon name="calendar-clock" /></button>
      <el-dropdown trigger="click" @command="(cmd: string) => emit('cmd', cmd)">
        <button class="tb" title="页眉页脚"><MdiIcon name="page-layout-header-footer" /><MdiIcon name="chevron-down" class="arrow" /></button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="header">编辑页眉</el-dropdown-item>
            <el-dropdown-item command="footer">编辑页脚</el-dropdown-item>
            <el-dropdown-item command="pageNumberDialog">插入页码</el-dropdown-item>
            <el-dropdown-item command="clearHeader">移除页眉</el-dropdown-item>
            <el-dropdown-item command="clearFooter">移除页脚</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <el-divider direction="vertical" />
      <button class="tb" @click="emit('cmd', 'openSearchPanel')" title="搜索与替换"><MdiIcon name="magnify" /></button>
      <button class="tb" @click="emit('cmd', 'comment')" title="新建批注"><MdiIcon name="comment-plus-outline" /></button>

      <button class="tb" @click="emit('cmd', 'spellcheck')" title="拼写检查"><MdiIcon name="spellcheck" /></button>
      <el-popover placement="bottom" :width="280" trigger="click" v-model:visible="wordCountVisible">
        <template #reference><button class="tb" title="字数统计"><MdiIcon name="counter" /></button></template>
        <div class="wordcount-panel">
          <div class="wc-header">字数统计</div>
          <div class="wc-grid">
            <div class="wc-row"><span class="wc-label">字数</span><span class="wc-value">{{ documentStats?.wordCount || 0 }}</span></div>
            <div class="wc-row"><span class="wc-label">字符（不含空格）</span><span class="wc-value">{{ documentStats?.charCount || 0 }}</span></div>
            <div class="wc-row"><span class="wc-label">字符（含空格）</span><span class="wc-value">{{ documentStats?.charCountWithSpaces || 0 }}</span></div>
            <div class="wc-row"><span class="wc-label">段落</span><span class="wc-value">{{ documentStats?.paragraphCount || 0 }}</span></div>
            <div class="wc-row"><span class="wc-label">页数</span><span class="wc-value">{{ documentStats?.totalPages || 0 }}</span></div>
          </div>
          <div class="wc-tip">选中文本后查看可显示选中内容的统计</div>
        </div>
      </el-popover>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { UI_FONT_OPTIONS, UI_SIZE_OPTIONS } from '@/config/ui-constants'
import { colorPalette, bulletStyles, numberStyles, lineHeightOptions, shapeCategories, symbolCategories, separatorStyles } from './index'
import MdiIcon from '@/components/common/MdiIcon.vue'

const INDENT_PX_PER_CHAR = 14

const emit = defineEmits<{
  (e: 'cmd', cmd: string, ...args: any[]): void
  (e: 'zoom', v: number): void
  (e: 'font', v: string): void
  (e: 'size', v: number): void
  (e: 'fontColor', c: string): void
  (e: 'highlight', c: string): void
  (e: 'rowFlex', v: string): void
  (e: 'lineHeight', v: number): void
  (e: 'bullet', s: string | null): void
  (e: 'number', s: string | null): void
  (e: 'customBullet'): void
  (e: 'title', v: string | null): void
  (e: 'insertTable', r: number, c: number): void
}>()

const props = defineProps<{
  zoomPercent: number
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
  firstLineIndentChars?: number
  inCanvas?: boolean
  simpleMode?: boolean

  documentStats?: {
    totalPages: number
    wordCount: number
    paragraphCount: number
    charCount: number
    charCountWithSpaces: number
  }
}>()

const fontList = UI_FONT_OPTIONS
const sizeList = UI_SIZE_OPTIONS
const tablePopoverVisible = ref(false)
const wordCountVisible = ref(false)
const hoverCell = ref({ r: -1, c: -1 })
const shapesPopoverVisible = ref(false)
const symbolPopoverVisible = ref(false)
const separatorPopoverVisible = ref(false)
const bulletPopoverVisible = ref(false)
const firstLineIndentOptions = [
  { label: '无缩进', value: 0 },
  { label: '2字符', value: 2 },
  { label: '3字符', value: 3 },
  { label: '4字符', value: 4 }
]
const firstLineIndentLabel = computed(() => {
  const v = Number(props.firstLineIndentChars || 0)
  const hit = firstLineIndentOptions.find(o => o.value === v)
  return hit ? hit.label : '无缩进'
})

const handleInsertTable = (r: number, c: number) => {
  tablePopoverVisible.value = false
  setTimeout(() => emit('insertTable', r, c), 10)
}

const handleInsertShape = (type: string) => {
  shapesPopoverVisible.value = false
  setTimeout(() => emit('cmd', 'insertShape', type), 10)
}

const handleInsertSymbol = (value: string) => {
  symbolPopoverVisible.value = false
  setTimeout(() => emit('cmd', 'insertElement', { value }), 10)
}

const handleCustomBullet = () => {
  bulletPopoverVisible.value = false
  emit('customBullet')
}

const handleInsertSeparator = (sep: any) => {
  separatorPopoverVisible.value = false
  setTimeout(() => emit('cmd', 'separator', [sep.type, sep.width, sep.dashArray]), 10)
}

const getSeparatorClass = (sep: any) => {
  return {
    'wavy': sep.type === 'wavy',
    'dotted': sep.type === 'dotted',
    'dashed': sep.type === 'dashed',
    'double': sep.type === 'double',
    'triple': sep.type === 'triple',
    'gradient': sep.type === 'gradient',
    'shadow': sep.type === 'shadow',
    'emboss': sep.type === 'emboss'
  }
}

const getSeparatorStyle = (sep: any) => {
  const style: any = {}

  if (sep.type === 'solid') {
    style.height = `${sep.width}px`
    style.background = '#000'
  } else if (sep.type === 'dotted') {
    style.height = `${sep.width}px`
    style.borderTop = `${sep.width}px dotted #000`
    style.background = 'transparent'
  } else if (sep.type === 'dashed') {
    style.height = `${sep.width}px`
    style.borderTop = `${sep.width}px dashed #000`
    style.background = 'transparent'
  } else if (sep.type === 'double') {
    style.height = `${sep.width + 2}px`
    style.borderTop = `${Math.floor(sep.width / 2)}px double #000`
    style.background = 'transparent'
  } else if (sep.type === 'triple') {
    style.height = `${sep.width + 4}px`
    style.background = 'transparent'
  } else if (sep.type === 'wavy') {
    style.height = `${sep.width * 3}px`
  }

  return style
}
</script>

<style scoped>
.compact-toolbar {
  padding: 4px 12px;
  background: #fff;
  border-bottom: 1px solid #ffff;
}
.toolbar-row {
  display: flex;
  align-items: center;
  gap: 3px;
  height: auto;
  padding: 1px 0;
}
.toolbar-row + .toolbar-row { margin-top: 2px; }

/* 工具按钮 */
.tb {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 6px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 3px;
  cursor: pointer;
  color: #3c4043;
  transition: background-color 0.15s, border-color 0.15s, color 0.15s;
  position: relative;
}
.tb:hover {
  background: #e8eaed;
  border-color: transparent;
  color: #202124;
}
.tb.active {
  background: #d3e3fd;
  color: #1a73e8;
  border-color: transparent;
}
.tb:active {
  background: #d3e3fd;
}
.tb.has-text { padding: 0 6px; }
.tb .btn-text { font-size: 12px; margin-right: 4px; font-weight: 400; }
.tb .arrow { font-size: 12px; color: #80868b; margin-left: -2px; }
.tb.style-btn { min-width: 90px; }
.tb.style-btn .btn-text { min-width: 40px; text-align: left; }


/* 简约模式 - 隐藏第二行 */
.compact-toolbar.simple-mode .toolbar-row:nth-child(2) {
  display: none;
}

/* 颜色按钮 */
.color-btn { position: relative; }
.color-bar { position: absolute; bottom: 2px; left: 50%; transform: translateX(-50%); width: 14px; height: 3px; border-radius: 1px; }

/* 颜色面板 */
.color-panel { padding: 8px; }
.color-grid { display: grid; grid-template-columns: repeat(10, 1fr); gap: 4px; }
.color-cell { width: 18px; height: 18px; border: 1px solid #dadce0; border-radius: 2px; cursor: pointer; padding: 0; }
.color-cell:hover { transform: scale(1.1); }
.color-custom { margin-top: 8px; padding-top: 8px; border-top: 1px solid #e8eaed; display: flex; align-items: center; gap: 8px; }
.custom-label { font-size: 12px; color: #5f6368; }

/* 列表面板 */
.list-panel { padding: 8px 10px; }
.list-panel-title { font-size: 12px; color: #5f6368; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #e8eaed; font-weight: 500; }
.list-grid { display: grid; gap: 6px; }
.bullet-grid { grid-template-columns: repeat(5, 1fr); }
.number-grid { grid-template-columns: repeat(4, 1fr); }
.list-cell { border: 1px solid #dadce0; border-radius: 4px;width:67px; background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 6px 4px; transition: background 0.15s, border-color 0.15s; }
.list-cell:hover { background: #f1f3f4; border-color: #1a73e8; }
.list-cell-none { height: 52.6px; font-size: 13px; color: #5f6368; }
.list-custom-entry { margin-top: 8px; padding: 8px 0; border-top: 1px solid #e8eaed; text-align: center; cursor: pointer; border-radius: 4px; transition: background 0.15s; }
.list-custom-entry:hover { background: #f1f3f4; }
.custom-bullet-text { font-size: 13px; color: #1a73e8; }
.list-preview { display: flex; flex-direction: column; gap: 3px; width: 100%; }
.list-preview-row { display: flex; align-items: center; gap: 4px; }
.list-symbol { font-size: 12px; line-height: 1; flex-shrink: 0; }
.list-num { font-size: 11px; line-height: 1; flex-shrink: 0; white-space: nowrap; }
.list-line { flex: 1; height: 1px; background: #999; min-width: 12px; }

/* 表格选择器 */
.table-selector { padding: 8px; }
.table-title { font-size: 12px; color: #5f6368; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #e8eaed; }
.table-grid { display: flex; flex-direction: column; gap: 2px; }
.tgrid-row { display: flex; gap: 2px; }
.tgrid-cell { width: 20px; height: 20px; border: 1px solid #dadce0; cursor: pointer; transition: all 0.1s; }
.tgrid-cell.selected { background: #e8f0fe; border-color: #1a73e8; }
.table-info { margin-top: 6px; font-size: 11px; color: #5f6368; text-align: center; }

.shapes-selector { padding: 10px 10px 8px; }
.shapes-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-bottom: 8px; border-bottom: 1px solid #e8eaed; }
.shapes-title { font-size: 12px; color: #5f6368; }
.shapes-sections { margin-top: 10px; max-height: 320px; overflow: auto; padding-right: 2px; }
.shape-section + .shape-section { margin-top: 12px; }
.shape-section-title { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; color: #202124; }
.shape-section-title .material-icons { width: 16px; height: 16px; color: #5f6368; }
.shape-section-name { font-size: 12px; font-weight: 500; }
.shape-grid { display: grid; grid-template-columns: repeat(10, 1fr); gap: 6px; }
.shape-cell { width: 34px; height: 34px; border: 1px solid #dadce0; border-radius: 8px; background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #5f6368; transition: background 0.15s, border-color 0.15s, color 0.15s, transform 0.05s; }
.shape-cell .material-icons { width: 18px; height: 18px; }
.shape-cell:hover { background: #f1f3f4; border-color: #1a73e8; color: #1a73e8; }
.shape-cell:active { transform: translateY(1px); }

.symbol-selector { padding: 8px; }
.symbol-title { font-size: 12px; color: #5f6368; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #e8eaed; }
.symbol-categories { max-height: 450px; overflow-y: auto; }
.symbol-category { margin-bottom: 12px; }
.symbol-category:last-child { margin-bottom: 0; }
.category-name { font-size: 11px; color: #5f6368; font-weight: 500; margin-bottom: 6px; padding-left: 2px; }
.symbol-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 4px; }
.symbol-item { height: 32px; border: 1px solid #dadce0; border-radius: 4px; background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; color: #202124; transition: all 0.15s; }
.symbol-item:hover { background: #f1f3f4; border-color: #1a73e8; transform: scale(1.05); }

/* 分割线选择器 */
.separator-selector { padding: 8px 0; }
.separator-title { font-size: 12px; color: #5f6368; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #e8eaed; }
.separator-list { display: flex; flex-direction: column; gap: 4px; max-height: 400px; overflow-y: auto; }
.separator-item { display: flex; align-items: center; gap: 12px; padding: 8px 12px; border: 1px solid transparent; border-radius: 4px; background: #fff; cursor: pointer; transition: all 0.15s; }
.separator-item:hover { background: #f1f3f4; border-color: #1a73e8; }
.separator-preview { flex: 0 0 80px; height: 3px; background: #000; border-radius: 1px; position: relative; }
.separator-preview.wavy { background: transparent; height: 8px; }
.separator-preview.wavy::before { content: ''; position: absolute; top: 50%; left: 0; right: 0; height: 2px; background: repeating-linear-gradient(90deg, #000 0px, #000 4px, transparent 4px, transparent 8px); transform: translateY(-50%); }
.separator-preview.dotted { background: transparent; }
.separator-preview.dashed { background: transparent; }
.separator-preview.double { background: transparent; }
.separator-preview.triple { background: transparent; height: 8px; border-top: 2px solid #000; border-bottom: 2px solid #000; }
.separator-preview.gradient { background: linear-gradient(90deg, transparent, #000, transparent); }
.separator-preview.shadow { background: #000; box-shadow: 0 2px 4px rgba(0,0,0,0.3); }
.separator-preview.emboss { background: linear-gradient(180deg, #666 0%, #000 50%, #666 100%); box-shadow: 0 1px 0 #fff, 0 -1px 0 #fff; }
.separator-name { font-size: 13px; color: #202124; }

/* Element Plus 覆盖 */
:deep(.el-select) { --el-select-border-color-hover: #dadce0; }
:deep(.el-select .el-input__wrapper) { box-shadow: none; border: 1px solid #dadce0; border-radius: 4px; height: 26px; }
:deep(.el-select .el-input__wrapper:hover) { border-color: #1a73e8; }
:deep(.el-dropdown-menu__item) { font-size: 13px; padding: 8px 16px; }

/* 字数统计面板 */
.wordcount-panel { padding: 12px; }
.wc-header { font-size: 14px; font-weight: 500; color: #202124; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e8eaed; }
.wc-grid { display: flex; flex-direction: column; gap: 8px; }
.wc-row { display: flex; justify-content: space-between; align-items: center; }
.wc-label { font-size: 13px; color: #5f6368; }
.wc-value { font-size: 13px; color: #202124; font-weight: 500; }
.wc-tip { margin-top: 12px; padding-top: 8px; border-top: 1px solid #e8eaed; font-size: 11px; color: #9aa0a6; }

/* 禁用按钮 */
.tb.tb-disabled { color: #c0c4cc !important; cursor: not-allowed !important; }
.tb.tb-disabled:hover { background: transparent !important; }
.tb.tb-disabled i { color: #c0c4cc !important; }
</style>
