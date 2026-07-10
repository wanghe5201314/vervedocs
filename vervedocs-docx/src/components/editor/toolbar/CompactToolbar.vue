00<template>
  <div class="compact-toolbar" :class="{ 'simple-mode': simpleMode }">
    <!-- 第一行：文字处理 -->
    <div class="toolbar-row">
      <button class="tb" @click="emit('cmd', 'undo')" title="撤销"><MdiIcon name="undo" /></button>
      <button class="tb" @click="emit('cmd', 'redo')" title="重做"><MdiIcon name="redo" /></button>
      <button class="tb" @click="emit('cmd', 'painter')" title="格式刷"><MdiIcon name="format-paint" /></button>
      <a-divider type="vertical" />
      <a-select :value="currentFont" size="small" style="width: 120px" @change="(v: any) => emit('font', String(v))">
        <a-select-option v-for="f in fontList" :key="f.value" :label="f.label" :value="f.value"><span :style="{ fontFamily: f.value }">{{ f.label }}</span></a-select-option>
      </a-select>
      <a-select :value="sizeValueToLabel(currentSize)" size="small" style="width: 65px" @change="(v: any) => emit('size', sizeLabelToValue(String(v)))">
        <a-select-option v-for="s in sizeList" :key="s.label" :label="s.label" :value="s.label" />
      </a-select>
      <button class="tb" @click="emit('cmd', 'sizeAdd')" title="增大"><MdiIcon name="plus" /></button>
      <button class="tb" @click="emit('cmd', 'sizeMinus')" title="减小"><MdiIcon name="minus" /></button>
      <a-divider type="vertical" />
      <button class="tb" :class="{ active: isBold }" @click="emit('cmd', 'bold')" title="加粗"><MdiIcon name="format-bold" /></button>
      <button class="tb" :class="{ active: isItalic }" @click="emit('cmd', 'italic')" title="斜体"><MdiIcon name="format-italic" /></button>
      <button class="tb" :class="{ active: isUnderline }" @click="emit('cmd', 'underline')" title="下划线"><MdiIcon name="format-underline" /></button>
      <button class="tb" :class="{ active: isStrikeout }" @click="emit('cmd', 'strikeout')" title="删除线"><MdiIcon name="format-strikethrough" /></button>
      <button class="tb" @click="emit('cmd', 'superscript')" title="上标"><MdiIcon name="format-superscript" /></button>
      <button class="tb" @click="emit('cmd', 'subscript')" title="下标"><MdiIcon name="format-subscript" /></button>
      <a-popover placement="bottom" :overlayStyle="{ width: '260px' }" trigger="click">
        <button class="tb color-btn" title="字体颜色"><MdiIcon name="format-color-text" /><span class="color-bar" :style="{ backgroundColor: fontColor }"></span></button>
        <template #content>
          <div class="color-panel">
            <div class="color-grid"><button v-for="c in colorPalette" :key="c" class="color-cell" :style="{ backgroundColor: c }" @click="emit('fontColor', c)"></button></div>
            <div class="color-custom">
              <input type="color" :value="fontColor" @change="(e: Event) => { const c = (e.target as HTMLInputElement).value; c && emit('fontColor', c) }" style="width:28px;height:28px;border:1px solid #d9d9d9;border-radius:4px;cursor:pointer;padding:2px;" />
              <span class="custom-label">更多颜色</span>
            </div>
          </div>
        </template>
      </a-popover>
      <a-popover placement="bottom" :overlayStyle="{ width: '260px' }" trigger="click">
        <button class="tb color-btn" title="高亮"><MdiIcon name="format-color-highlight" /><span class="color-bar" :style="{ backgroundColor: highlightColor }"></span></button>
        <template #content>
          <div class="color-panel">
            <div class="color-grid"><button v-for="c in colorPalette" :key="c" class="color-cell" :style="{ backgroundColor: c }" @click="emit('highlight', c)"></button></div>
            <div class="color-custom">
              <input type="color" :value="highlightColor" @change="(e: Event) => { const c = (e.target as HTMLInputElement).value; c && emit('highlight', c) }" style="width:28px;height:28px;border:1px solid #d9d9d9;border-radius:4px;cursor:pointer;padding:2px;" />
              <span class="custom-label">更多颜色</span>
            </div>
          </div>
        </template>
      </a-popover>
      <a-divider type="vertical" />
      <a-dropdown :trigger="['click']">
        <button class="tb has-text style-btn"><span class="btn-text">{{ firstLineIndentLabel }}</span><MdiIcon name="chevron-down" class="arrow" /></button>
        <template #overlay>
          <a-menu @click="({ key }: any) => emit('cmd', 'firstLineIndent', Number(key) * INDENT_PX_PER_CHAR)">
            <a-menu-item v-for="o in firstLineIndentOptions" :key="o.value">{{ o.label }}</a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
      <a-dropdown :trigger="['click']">
        <button class="tb has-text style-btn"><span class="btn-text">{{ currentTitleLabel }}</span><MdiIcon name="chevron-down" class="arrow" /></button>
        <template #overlay>
          <a-menu @click="({ key }: any) => emit('title', key === 'null' ? null : key)">
            <a-menu-item key="null">正文</a-menu-item>
            <a-menu-item key="first">标题1</a-menu-item>
            <a-menu-item key="second">标题2</a-menu-item>
            <a-menu-item key="third">标题3</a-menu-item>
            <a-menu-item key="fourth">标题4</a-menu-item>
            <a-menu-item key="fifth">标题5</a-menu-item>
            <a-menu-item key="sixth">标题6</a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
      <button class="tb" :class="{ active: rowFlex === 'left' || !rowFlex }" @click="emit('rowFlex', 'left')" title="左对齐"><MdiIcon name="format-align-left" /></button>
      <button class="tb" :class="{ active: rowFlex === 'center' }" @click="emit('rowFlex', 'center')" title="居中"><MdiIcon name="format-align-center" /></button>
      <button class="tb" :class="{ active: rowFlex === 'right' }" @click="emit('rowFlex', 'right')" title="右对齐"><MdiIcon name="format-align-right" /></button>
      <button class="tb" :class="{ active: rowFlex === 'alignment' }" @click="emit('rowFlex', 'alignment')" title="两端对齐"><MdiIcon name="format-align-justify" /></button>
      <a-divider type="vertical" />
      <a-dropdown :trigger="['click']">
        <button class="tb" title="行距"><MdiIcon name="format-line-spacing" /><MdiIcon name="chevron-down" class="arrow" /></button>
        <template #overlay>
          <a-menu @click="({ key }: any) => emit('lineHeight', Number(key))">
            <a-menu-item v-for="lh in lineHeightOptions" :key="lh.value">{{ lh.label }}</a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
      <a-popover placement="bottom" :overlayStyle="{ width: '400px' }" trigger="click" v-model:open="bulletPopoverVisible">
        <button class="tb" title="项目符号"><MdiIcon name="format-list-bulleted" /><MdiIcon name="chevron-down" class="arrow" /></button>
        <template #content>
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
        </template>
      </a-popover>
      <a-popover placement="bottom" :overlayStyle="{ width: '335px' }" trigger="click">
        <button class="tb" title="编号"><MdiIcon name="format-list-numbered" /><MdiIcon name="chevron-down" class="arrow" /></button>
        <template #content>
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
        </template>
      </a-popover>
      <button class="tb" @click="emit('cmd', 'indentStep', 'sub')" title="减少缩进"><MdiIcon name="format-indent-decrease" /></button>
      <button class="tb" @click="emit('cmd', 'indentStep', 'add')" title="增加缩进"><MdiIcon name="format-indent-increase" /></button>
      <button class="tb" @click="emit('cmd', 'format')" title="清除格式"><MdiIcon name="format-clear" /></button>
    </div>

    <!-- 第二行：插入与工具 -->
    <div class="toolbar-row">
      <a-popover placement="bottom" :overlayStyle="{ width: '260px' }" trigger="click" v-model:open="tablePopoverVisible">
        <button class="tb" title="表格"><MdiIcon name="table" /><MdiIcon name="chevron-down" class="arrow" /></button>
        <template #content>
          <div class="table-selector">
            <div class="table-title">插入表格</div>
            <div class="table-grid" @mouseleave="hoverCell = { r: -1, c: -1 }">
              <div v-for="r in 10" :key="r" class="tgrid-row">
                <div v-for="c in 10" :key="c" class="tgrid-cell" :class="{ selected: r <= hoverCell.r + 1 && c <= hoverCell.c + 1 }" @mouseover="hoverCell = { r: r - 1, c: c - 1 }" @click="handleInsertTable(r, c)"></div>
              </div>
            </div>
            <div class="table-info">{{ hoverCell.r >= 0 ? `${hoverCell.r + 1} × ${hoverCell.c + 1}` : '选择大小' }}</div>
          </div>
        </template>
      </a-popover>
      <button class="tb" @click="emit('cmd', 'image')" title="图片"><MdiIcon name="image-outline" /></button>
      <button class="tb" @click="emit('cmd', 'video')" title="视频"><MdiIcon name="video-outline" /></button>
      <button class="tb" @click="emit('cmd', 'audio')" title="音频"><MdiIcon name="music-note" /></button>
      <button class="tb" @click="emit('cmd', 'insertChart')" title="图表"><MdiIcon name="chart-bar" /></button>
      <a-popover placement="bottom" overlayClassName="compact-popover" :overlayStyle="{ width: '470px' }" trigger="click" v-model:open="shapesPopoverVisible">
        <button class="tb" title="形状"><MdiIcon name="shape-outline" /><MdiIcon name="chevron-down" class="arrow" /></button>
        <template #content>
          <a-card size="small" title="插入形状" :bordered="true" class="shapes-card">
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
          </a-card>
        </template>
      </a-popover>
      <a-divider type="vertical" />
      <button class="tb" @click="emit('cmd', 'hyperlink')" title="链接"><MdiIcon name="link-variant" /></button>
      <button class="tb" @click="emit('cmd', 'bookmark')" title="书签"><MdiIcon name="bookmark-outline" /></button>
      <button class="tb" @click="emit('cmd', 'latex')" title="公式"><MdiIcon name="function-variant" /></button>
      <a-popover placement="bottom" overlayClassName="compact-popover" :overlayStyle="{ width: '520px' }" trigger="click" v-model:open="symbolPopoverVisible">
        <button class="tb" title="符号"><MdiIcon name="omega" /><MdiIcon name="chevron-down" class="arrow" /></button>
        <template #content>
          <a-card size="small" title="插入符号" :bordered="true" class="symbol-categories">
            <div v-for="category in symbolCategories" :key="category.name" class="symbol-category">
              <div class="symbol-section-title">{{ category.name }}</div>
              <div class="symbol-grid">
                <div class="symbol-item" v-for="s in category.symbols" :key="s" @click="handleInsertSymbol(s)">{{ s }}</div>
              </div>
            </div>
          </a-card>
        </template>
      </a-popover>
      <a-divider type="vertical" />
      <a-popover placement="bottom" overlayClassName="compact-popover" :overlayStyle="{ width: '220px' }" trigger="click" v-model:open="separatorPopoverVisible">
        <button class="tb" title="分割线"><MdiIcon name="minus" /><MdiIcon name="chevron-down" class="arrow" /></button>
        <template #content>
          <a-card size="small" title="分割线类型" :bordered="true" class="separator-card">
            <div class="separator-list">
              <div
                class="separator-item"
                v-for="sep in separatorStyles"
                :key="sep.name"
                @click="handleInsertSeparator(sep)"
              >
                <div class="separator-preview"
                  :class="{ 'wavy': sep.type === 'wavy' }"
                  :style="getSeparatorStyle(sep)"
                ></div>
              </div>
            </div>
          </a-card>
        </template>
      </a-popover>
      <a-divider type="vertical" />
      <button class="tb" @click="emit('cmd', 'pageBreak')" title="分页"><MdiIcon name="format-page-break" /></button>
      <a-divider type="vertical" />
      <button class="tb" @click="emit('cmd', 'barcode')" title="条形码"><MdiIcon name="barcode" /></button>
      <button class="tb" @click="emit('cmd', 'qrcode')" title="二维码"><MdiIcon name="qrcode" /></button>
      <button class="tb" @click="emit('cmd', 'addWatermark')" title="水印"><MdiIcon name="watermark" /></button>
      <button class="tb" @click="emit('cmd', 'signature')" title="签名"><MdiIcon name="draw" /></button>
      <button class="tb" @click="emit('cmd', 'insertDate')" title="日期"><MdiIcon name="calendar-clock" /></button>
      <a-dropdown :trigger="['click']">
        <button class="tb" title="页眉页脚"><MdiIcon name="page-layout-header-footer" /><MdiIcon name="chevron-down" class="arrow" /></button>
        <template #overlay>
          <a-menu @click="({ key }: any) => emit('cmd', key)">
            <a-menu-item key="header">编辑页眉</a-menu-item>
            <a-menu-item key="footer">编辑页脚</a-menu-item>
            <a-menu-item key="pageNumberDialog">插入页码</a-menu-item>
            <a-menu-item key="clearHeader">移除页眉</a-menu-item>
            <a-menu-item key="clearFooter">移除页脚</a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
      <a-divider type="vertical" />
      <button class="tb" @click="emit('cmd', 'openSearchPanel')" title="搜索与替换"><MdiIcon name="magnify" /></button>
      <button class="tb" @click="emit('cmd', 'comment')" title="新建批注"><MdiIcon name="comment-plus-outline" /></button>

      <button class="tb" @click="emit('cmd', 'spellcheck')" title="拼写检查"><MdiIcon name="spellcheck" /></button>
      <a-popover placement="bottom" :overlayStyle="{ width: '280px' }" trigger="click" v-model:open="wordCountVisible">
        <button class="tb" title="字数统计"><MdiIcon name="counter" /></button>
        <template #content>
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
        </template>
      </a-popover>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { UI_FONT_OPTIONS, UI_SIZE_OPTIONS, sizeValueToLabel, sizeLabelToValue } from '@/config/ui-constants'
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

/* Ant Design Vue 覆盖 */
:deep(.ant-select) { border-color: #dadce0; }
:deep(.ant-select .ant-select-selector) { border: 1px solid #dadce0 !important; border-radius: 4px !important; height: 26px !important; }
:deep(.ant-select .ant-select-selector:hover) { border-color: #1a73e8 !important; }

/* 禁用按钮 */
.tb.tb-disabled { color: #c0c4cc !important; cursor: not-allowed !important; }
.tb.tb-disabled:hover { background: transparent !important; }
.tb.tb-disabled i { color: #c0c4cc !important; }
</style>
