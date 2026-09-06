<template>
  <div class="ribbon-tab-panel">
    <!-- 页面 -->
    <RibbonGroup title="页面">
      <RibbonButton icon="file-document-outline" text="空白页" title="插入空白页" size="large" command="insertBlankPageBefore" />
      <a-dropdown :trigger="['click']">
        <RibbonButton icon="format-page-break" text="分页" title="分页" size="large" has-arrow />
        <template #overlay>
          <a-menu @click="({ key }: any) => emit('command', key)">
            <a-menu-item key="pageBreak"><span class="mi"><VIcon name="format-page-break" /><span>分页符</span></span></a-menu-item>
            <a-menu-item key="lineBreak"><span class="mi"><VIcon name="separator-line-break" /><span>换行符</span></span></a-menu-item>
            <a-menu-divider />
            <a-menu-item key="sectionBreakNextPage"><span class="mi"><VIcon name="file-document-outline" /><span>下一页分节符</span></span></a-menu-item>
            <a-menu-item key="sectionBreakContinuous"><span class="mi"><VIcon name="format-section" /><span>连续分节符</span></span></a-menu-item>
            <a-menu-item key="sectionBreakEvenPage"><span class="mi"><VIcon name="numeric-2-box-outline" /><span>偶数页分节符</span></span></a-menu-item>
            <a-menu-item key="sectionBreakOddPage"><span class="mi"><VIcon name="numeric-1-box-outline" /><span>奇数页分节符</span></span></a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </RibbonGroup>

    <!-- 表格 -->
    <RibbonGroup title="表格">
      <a-popover placement="bottom" :overlayStyle="{ width: '260px' }" trigger="click" v-model:open="tablePopoverVisible">
        <RibbonButton icon="table" text="表格" title="插入表格" size="large" has-arrow />
        <template #content>
          <a-card size="small" class="ribbon-popover-card" :bordered="false" :bodyStyle="{ padding: '8px' }">
            <div class="table-selector">
              <div class="table-title">插入表格</div>
              <div class="table-grid" @mouseleave="hoverCell = { r: -1, c: -1 }">
                <div v-for="r in 10" :key="r" class="tgrid-row">
                  <div v-for="c in 10" :key="c" class="tgrid-cell" :class="{ selected: r <= hoverCell.r + 1 && c <= hoverCell.c + 1 }" @mouseover="hoverCell = { r: r - 1, c: c - 1 }" @click="handleInsertTable(r, c)"></div>
                </div>
              </div>
              <div class="table-info">{{ hoverCell.r >= 0 ? `${hoverCell.r + 1} × ${hoverCell.c + 1}` : '选择大小' }}</div>
              <button class="table-more-btn" @click="handleOpenInsertTableDialog">更多选项...</button>
            </div>
          </a-card>
        </template>
      </a-popover>
    </RibbonGroup>

    <!-- 插图 -->
    <RibbonGroup title="插图">
      <RibbonButton icon="image-outline" text="图片" title="插入图片" size="large" command="image" />
      <RibbonButton icon="video-outline" text="视频" title="插入视频" size="large" command="video" />
      <RibbonButton icon="music-note" text="音频" title="插入音频" size="large" command="audio" />
      <RibbonButton icon="stacked_bar_chart" text="图表" title="插入图表" size="large" command="insertChart" />
    </RibbonGroup>

    <!-- 链接 -->
    <RibbonGroup title="链接">
      <RibbonButton icon="link-variant" text="超链接" title="插入超链接 (Ctrl+K)" size="large" command="hyperlink" />
      <a-dropdown :trigger="['click']">
        <RibbonButton icon="functions" text="公式" title="公式" size="large" has-arrow />
        <template #overlay>
          <a-menu @click="({ key }: any) => handleFormulaMenuClick(String(key))">
            <a-menu-item key="latex">
              <span class="mi"><VIcon name="functions" /><span>插入LaTeX公式</span></span>
            </a-menu-item>
            <a-sub-menu v-for="cat in FORMULA_CATEGORIES" :key="'formula-' + cat.name">
              <template #title>
                <span class="mi"><VIcon :name="cat.icon" /><span>{{ cat.name }}</span></span>
              </template>
              <a-menu-item v-for="f in cat.formulas" :key="'f-' + f.name" @click.stop="handleInsertFormula(f.latex)">
                <div class="formula-item">
                  <span class="formula-name">{{ f.name }}</span>
                  <span class="formula-preview">{{ f.preview }}</span>
                </div>
              </a-menu-item>
            </a-sub-menu>
          </a-menu>
        </template>
      </a-dropdown>
    </RibbonGroup>

    <!-- 分隔符 -->
    <RibbonGroup title="分隔符">

      <a-popover placement="bottom" :overlayStyle="{ width: '220px' }" trigger="click" v-model:open="separatorPopoverVisible">
        <RibbonButton icon="separator-horizontal-line" text="分割线" title="分割线" size="large" has-arrow />
        <template #content>
          <a-card size="small" class="ribbon-popover-card" :bordered="false" :bodyStyle="{ padding: '8px' }">
            <div class="separator-list">
              <div class="separator-item" v-for="sep in SEPARATOR_STYLES" :key="sep.name" @click="handleInsertSeparator(sep)">
                <div class="separator-preview" :style="getSeparatorStyle(sep)"></div>
              </div>
            </div>
          </a-card>
        </template>
      </a-popover>
    </RibbonGroup>


    <!-- 符号 -->
    <RibbonGroup title="符号">
      <RibbonButton icon="calendar-clock" text="日期和时间" title="日期和时间" size="large" command="insertDate" />
      <RibbonButton icon="barcode" text="条形码" title="条形码" size="large" command="barcode" />
      <RibbonButton icon="qrcode" text="二维码" title="二维码" size="large" command="qrcode" />
      <RibbonButton icon="draw" text="电子签名" title="电子签名" size="large" command="signature" />
    </RibbonGroup>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { VIcon } from '@vervedoc/icons'
import { SEPARATOR_STYLES } from '@vervedoc/core'
import { FORMULA_CATEGORIES } from '@/config/constants'
import RibbonGroup from './ribbonGroup.vue'
import RibbonButton from './ribbonButton.vue'

const emit = defineEmits<{
  (e: 'command', cmd: string, ...args: any[]): void
}>()

defineProps<{
  hasSelection?: boolean
}>()

/** 表格插入弹窗可见状态 */
const tablePopoverVisible = ref(false)
/** 分割线弹窗可见状态 */
const separatorPopoverVisible = ref(false)
/** 表格选择器悬停单元格 */
const hoverCell = ref({ r: -1, c: -1 })

/**
 * 处理表格插入：关闭弹窗并触发 insertTable 命令
 * @param r - 行数
 * @param c - 列数
 */
const handleInsertTable = (r: number, c: number) => {
  tablePopoverVisible.value = false
  setTimeout(() => emit('command', 'insertTable', { rows: r, cols: c }), 10)
}

/** 处理打开插入表格对话框 */
const handleOpenInsertTableDialog = () => {
  tablePopoverVisible.value = false
  setTimeout(() => emit('command', 'insertTableDialog'), 10)
}

/**
 * 处理公式菜单点击，latex 项触发 latex 命令
 * @param key - 菜单项键值
 */
const handleFormulaMenuClick = (key: string) => {
  if (key === 'latex') {
    emit('command', 'latex')
  }
}


/**
 * 处理插入公式，触发 insertLatex 命令
 * @param latex - LaTeX 表达式
 */
const handleInsertFormula = (latex: string) => {
  emit('command', 'insertLatex', latex)
}

/**
 * 处理分割线插入：关闭弹窗并触发 separator 命令
 * @param sep - 分割线配置
 */
const handleInsertSeparator = (sep: any) => {
  separatorPopoverVisible.value = false
  setTimeout(() => emit('command', 'separator', [sep.type, sep.width, sep.dashArray]), 10)
}

/**
 * 根据分割线配置生成预览样式
 * @param sep - 分割线配置
 * @returns 样式对象
 */
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
  } else if (sep.type === 'wavy') {
    style.height = `${sep.width * 3}px`
  }
  return style
}
</script>

<style scoped>
@import '@/styles/ribbon-popover.css';
.mi { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; }
.table-more-btn {
  width: 100%;
  margin-top: 6px;
  padding: 5px 8px;
  border: 1px solid var(--app-ribbon-border-soft, #e3e8f2);
  border-radius: 4px;
  background: #fff;
  color: var(--app-ribbon-text, #3c4043);
  font-size: 12px;
  cursor: pointer;
}
.table-more-btn:hover {
  border-color: var(--app-ribbon-active-text, #1f57b8);
  background: var(--app-ribbon-hover-bg, #edf2fb);
}
.formula-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 180px;
}
.formula-name {
  font-size: 12px;
  color: var(--app-ribbon-text, #3c4043);
}
.formula-preview {
  font-size: 11px;
  color: var(--app-ribbon-text-muted, #7a8191);
}
</style>
