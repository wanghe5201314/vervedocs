<template>
  <div class="ribbon-tab-panel">
    <!-- 页面 -->
    <VdRibbonGroup :title="t('ribbon.insert.page')">
      <VdRibbonButton icon="file-document-outline" :text="t('ribbon.insert.blankPage')" :title="t('ribbon.insert.insertBlankPage')" size="large" @click="emit('command', 'insertBlankPageBefore')" />
      <a-dropdown :trigger="['click']">
        <VdRibbonButton icon="format-page-break" :text="t('ribbon.insert.pageBreak')" :title="t('ribbon.insert.pageBreak')" size="large" has-arrow />
        <template #overlay>
          <a-menu @click="({ key }: any) => emit('command', key)">
            <a-menu-item key="pageBreak"><span class="mi"><VdIcon name="format-page-break" /><span>{{ t('ribbon.insert.pageBreakSymbol') }}</span></span></a-menu-item>
            <a-menu-item key="lineBreak"><span class="mi"><VdIcon name="separator-line-break" /><span>{{ t('ribbon.insert.lineBreakSymbol') }}</span></span></a-menu-item>
            <a-menu-divider />
            <a-menu-item key="sectionBreakNextPage"><span class="mi"><VdIcon name="file-document-outline" /><span>{{ t('ribbon.insert.nextPageSectionBreak') }}</span></span></a-menu-item>
            <a-menu-item key="sectionBreakContinuous"><span class="mi"><VdIcon name="format-section" /><span>{{ t('ribbon.insert.continuousSectionBreak') }}</span></span></a-menu-item>
            <a-menu-item key="sectionBreakEvenPage"><span class="mi"><VdIcon name="numeric-2-box-outline" /><span>{{ t('ribbon.insert.evenPageSectionBreak') }}</span></span></a-menu-item>
            <a-menu-item key="sectionBreakOddPage"><span class="mi"><VdIcon name="numeric-1-box-outline" /><span>{{ t('ribbon.insert.oddPageSectionBreak') }}</span></span></a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </VdRibbonGroup>

    <!-- 表格 -->
    <VdRibbonGroup :title="t('ribbon.insert.table')">
      <a-popover placement="bottom" :overlayStyle="{ width: '260px' }" trigger="click" v-model:open="tablePopoverVisible">
        <VdRibbonButton icon="table" :text="t('ribbon.insert.table')" :title="t('ribbon.insert.insertTable')" size="large" has-arrow />
        <template #content>
          <VdCard size="small" class="ribbon-popover-card" :bordered="false" :bodyStyle="{ padding: '8px' }">
            <div class="table-selector">
              <div class="table-title">{{ t('ribbon.insert.insertTable') }}</div>
              <div class="table-grid" @mouseleave="hoverCell = { r: -1, c: -1 }">
                <div v-for="r in 10" :key="r" class="tgrid-row">
                  <div v-for="c in 10" :key="c" class="tgrid-cell" :class="{ selected: r <= hoverCell.r + 1 && c <= hoverCell.c + 1 }" @mouseover="hoverCell = { r: r - 1, c: c - 1 }" @click="handleInsertTable(r, c)"></div>
                </div>
              </div>
              <div class="table-info">{{ hoverCell.r >= 0 ? `${hoverCell.r + 1} × ${hoverCell.c + 1}` : t('common.selectSize') }}</div>
              <button class="table-more-btn" @click="handleOpenInsertTableDialog">{{ t('ribbon.insert.moreOptions') }}</button>
            </div>
          </VdCard>
        </template>
      </a-popover>
    </VdRibbonGroup>

    <!-- 插图 -->
    <VdRibbonGroup :title="t('ribbon.insert.illustration')">
      <VdRibbonButton icon="image-outline" :text="t('ribbon.insert.image')" :title="t('ribbon.insert.insertImage')" size="large" @click="emit('command', 'image')" />

      <VdRibbonButton icon="stacked_bar_chart" :text="t('ribbon.insert.chart')" :title="t('ribbon.insert.insertChart')" size="large" @click="emit('command', 'insertChart')" />
    </VdRibbonGroup>

    <!-- 链接 -->
    <VdRibbonGroup :title="t('ribbon.insert.link')">
      <VdRibbonButton icon="link-variant" :text="t('ribbon.insert.hyperlink')" :title="t('ribbon.insert.insertHyperlink')" size="large" @click="emit('command', 'hyperlink')" />
      <a-dropdown :trigger="['click']">
        <VdRibbonButton icon="functions" :text="t('ribbon.insert.formula')" :title="t('ribbon.insert.formula')" size="large" has-arrow />
        <template #overlay>
          <a-menu @click="({ key }: any) => handleFormulaMenuClick(String(key))">
            <a-menu-item key="latex">
              <span class="mi"><VdIcon name="functions" /><span>{{ t('ribbon.insert.insertLatex') }}</span></span>
            </a-menu-item>
            <a-sub-menu v-for="cat in FORMULA_CATEGORIES" :key="'formula-' + cat.name">
              <template #title>
                <span class="mi"><VdIcon :name="cat.icon" /><span>{{ cat.name }}</span></span>
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
    </VdRibbonGroup>

    <!-- 分隔符 -->
    <VdRibbonGroup :title="t('ribbon.insert.separator')">

      <a-popover placement="bottom" :overlayStyle="{ width: '220px' }" trigger="click" v-model:open="separatorPopoverVisible">
        <VdRibbonButton icon="separator-horizontal-line" :text="t('ribbon.insert.splitLine')" :title="t('ribbon.insert.splitLine')" size="large" has-arrow />
        <template #content>
          <VdCard size="small" class="ribbon-popover-card" :bordered="false" :bodyStyle="{ padding: '8px' }">
            <div class="separator-list">
              <div class="separator-item" v-for="sep in SEPARATOR_STYLES" :key="sep.name" @click="handleInsertSeparator(sep)">
                <div class="separator-preview" :style="getSeparatorStyle(sep)"></div>
              </div>
            </div>
          </VdCard>
        </template>
      </a-popover>
    </VdRibbonGroup>


    <!-- 符号 -->
    <VdRibbonGroup :title="t('ribbon.insert.symbol')">
      <VdRibbonButton icon="calendar-clock" :text="t('ribbon.insert.dateAndTime')" :title="t('ribbon.insert.dateAndTime')" size="large" @click="emit('command', 'insertDate')" />
      <VdRibbonButton icon="barcode" :text="t('ribbon.insert.barcode')" :title="t('ribbon.insert.barcode')" size="large" @click="emit('command', 'barcode')" />
      <VdRibbonButton icon="qrcode" :text="t('ribbon.insert.qrcode')" :title="t('ribbon.insert.qrcode')" size="large" @click="emit('command', 'qrcode')" />
      <VdRibbonButton icon="draw" :text="t('ribbon.insert.signature')" :title="t('ribbon.insert.signature')" size="large" @click="emit('command', 'signature')" />
    </VdRibbonGroup>
  </div>
</template>

<script setup lang="ts">
import { VdRibbonButton, VdRibbonGroup, VdIcon, VdCard } from '@vervedoc/ui'
import { ref, computed } from 'vue'

import { SEPARATOR_STYLES } from '@vervedoc/core'
import { getFormulaCategories } from '@/config/constants'
import { t } from '@/i18n'



const emit = defineEmits<{
  (e: 'command', cmd: string, ...args: any[]): void
}>()

defineProps<{
  hasSelection?: boolean
}>()

const FORMULA_CATEGORIES = computed(() => getFormulaCategories())

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
  border: 1px solid var(--vd-ribbon-border-soft, #e3e8f2);
  border-radius: 4px;
  background: #fff;
  color: var(--vd-ribbon-text, #3c4043);
  font-size: 12px;
  cursor: pointer;
}
.table-more-btn:hover {
  border-color: var(--vd-ribbon-active-text, #1f57b8);
  background: var(--vd-ribbon-hover-bg, #edf2fb);
}
.formula-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 180px;
}
.formula-name {
  font-size: 12px;
  color: var(--vd-ribbon-text, #3c4043);
}
.formula-preview {
  font-size: 11px;
  color: var(--vd-ribbon-text-muted, #7a8191);
}
</style>
