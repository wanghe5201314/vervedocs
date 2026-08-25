<template>
  <div class="ribbon-tab-panel">
    <!-- 剪贴板 -->
    <RibbonGroup title="剪贴板">
      <RibbonButton icon="undo" title="撤销 (Ctrl+Z)" command="undo" />
      <RibbonButton icon="redo" title="重做 (Ctrl+Y)" command="redo" />
      <a-dropdown :trigger="['click']">
        <RibbonButton icon="content-paste" text="粘贴" title="粘贴" size="large" has-arrow />
        <template #overlay>
          <a-menu @click="({ key }: any) => emit('command', key)">
            <a-menu-item key="paste"><span class="mi"><VIcon name="content-paste" /><span>粘贴</span></span></a-menu-item>
            <a-menu-item key="pasteNoFormat"><span class="mi"><VIcon name="clipboard-text-outline" /><span>无格式粘贴</span></span></a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
      <RibbonButton icon="content-cut" title="剪切 (Ctrl+X)" :disabled="!hasSelection" command="cut" />
      <RibbonButton icon="content-copy" title="复制 (Ctrl+C)" :disabled="!hasSelection" command="copy" />
      <RibbonButton icon="format-paint" title="格式刷" command="painter" />
    </RibbonGroup>

    <!-- 字体 -->
    <RibbonGroup title="字体">
      <a-select :value="currentFont" size="small" style="width: 120px" @change="(v: any) => emit('font', String(v))">
        <a-select-option v-for="f in fontList" :key="f.value" :label="f.label" :value="f.value">
          <span :style="{ fontFamily: f.value }">{{ f.label }}</span>
        </a-select-option>
      </a-select>
      <a-select :value="sizeValueToLabel(currentSize)" size="small" style="width: 60px" @change="(v: any) => emit('size', sizeLabelToValue(String(v)))">
        <a-select-option v-for="s in sizeList" :key="s.label" :label="s.label" :value="s.label" />
      </a-select>
      <RibbonButton icon="plus" title="增大字号" command="sizeAdd" />
      <RibbonButton icon="minus" title="减小字号" command="sizeMinus" />
      <RibbonButton icon="format-bold" title="加粗 (Ctrl+B)" :active="isBold" command="bold" />
      <RibbonButton icon="format-italic" title="斜体 (Ctrl+I)" :active="isItalic" command="italic" />
      <RibbonButton icon="format-underline" title="下划线 (Ctrl+U)" :active="isUnderline" command="underline" />
      <RibbonButton icon="format-strikethrough" title="删除线" :active="isStrikeout" command="strikeout" />
      <RibbonButton icon="format-superscript" title="上标" command="superscript" />
      <RibbonButton icon="format-subscript" title="下标" command="subscript" />
      <a-popover placement="bottom" :overlayStyle="{ width: '260px' }" trigger="click">
        <RibbonButton icon="format-color-text" title="字体颜色" :color-bar="fontColor" />
        <template #content>
          <a-card size="small" class="ribbon-popover-card" :bordered="false" :bodyStyle="{ padding: '4px' }">
            <div class="color-panel">
              <div class="color-grid">
                <button v-for="c in colorPalette" :key="c" class="color-cell" :style="{ backgroundColor: c }" @click="emit('fontColor', c)"></button>
              </div>
              <div class="color-custom">
                <input type="color" :value="fontColor" @change="(e: Event) => { const c = (e.target as HTMLInputElement).value; c && emit('fontColor', c) }" />
                <span class="custom-label">更多颜色</span>
              </div>
            </div>
          </a-card>
        </template>
      </a-popover>
      <a-popover placement="bottom" :overlayStyle="{ width: '260px' }" trigger="click">
        <RibbonButton icon="format-color-highlight" title="高亮" :color-bar="highlightColor" />
        <template #content>
          <a-card size="small" class="ribbon-popover-card" :bordered="false" :bodyStyle="{ padding: '4px' }">
            <div class="color-panel">
              <div class="color-grid">
                <button v-for="c in colorPalette" :key="c" class="color-cell" :style="{ backgroundColor: c }" @click="emit('highlight', c)"></button>
              </div>
              <div class="color-custom">
                <input type="color" :value="highlightColor" @change="(e: Event) => { const c = (e.target as HTMLInputElement).value; c && emit('highlight', c) }" />
                <span class="custom-label">更多颜色</span>
              </div>
            </div>
          </a-card>
        </template>
      </a-popover>
      <a-dropdown :trigger="['click']">
        <RibbonButton icon="format-letter-case" title="字符缩放" has-arrow />
        <template #overlay>
          <a-menu @click="({ key }: any) => handleCharacterScale(key)">
            <a-menu-item v-for="scale in characterScaleOptions" :key="'scale' + scale">
              <span class="scale-check" :class="{ active: currentCharacterScale === scale }">{{ currentCharacterScale === scale ? '✓' : '' }}</span>{{ scale }}%
            </a-menu-item>
            <a-menu-divider />
            <a-menu-item key="scaleCustom"><span class="scale-check"></span>其他(M)...</a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </RibbonGroup>

    <!-- 段落 -->
    <RibbonGroup title="段落">
      <a-dropdown :trigger="['click']">
        <RibbonButton icon="format-align-left" title="对齐方式" has-arrow />
        <template #overlay>
          <a-menu @click="({ key }: any) => emit('rowFlex', key)">
            <a-menu-item key="left"><span class="mi"><VIcon name="format-align-left" /><span>左对齐</span></span></a-menu-item>
            <a-menu-item key="center"><span class="mi"><VIcon name="format-align-center" /><span>居中对齐</span></span></a-menu-item>
            <a-menu-item key="right"><span class="mi"><VIcon name="format-align-right" /><span>右对齐</span></span></a-menu-item>
            <a-menu-item key="alignment"><span class="mi"><VIcon name="format-align-justify" /><span>两端对齐</span></span></a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
      <RibbonButton icon="format-align-left" title="左对齐" :active="rowFlex === 'left' || !rowFlex" command="rowFlex" command-args="left" />
      <RibbonButton icon="format-align-center" title="居中" :active="rowFlex === 'center'" command="rowFlex" command-args="center" />
      <RibbonButton icon="format-align-right" title="右对齐" :active="rowFlex === 'right'" command="rowFlex" command-args="right" />
      <RibbonButton icon="format-align-justify" title="两端对齐" :active="rowFlex === 'alignment'" command="rowFlex" command-args="alignment" />
      <a-dropdown :trigger="['click']">
        <RibbonButton icon="format-line-spacing" title="行距" has-arrow />
        <template #overlay>
          <a-menu @click="({ key }: any) => emit('lineHeight', Number(key))">
            <a-menu-item v-for="lh in lineHeightOptions" :key="lh.value">{{ lh.label }}</a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
      <a-popover placement="bottom" :overlayStyle="{ width: '400px' }" trigger="click">
        <RibbonButton icon="format-list-bulleted" title="项目符号" has-arrow />
        <template #content>
          <a-card size="small" class="ribbon-popover-card" :bordered="false" :bodyStyle="{ padding: '4px' }">
            <div class="list-panel">
              <div class="list-panel-title">预设样式</div>
              <div class="list-grid bullet-grid">
                <button class="list-cell list-cell-none" @click="emit('bullet', null)">无</button>
                <button v-for="b in bulletStyles" :key="b.style" class="list-cell" :title="b.label" @click="emit('bullet', b.style)">
                  <div class="list-preview">
                    <div class="list-preview-row" v-for="i in 3" :key="i"><span class="list-symbol">{{ b.icon }}</span><span class="list-line"></span></div>
                  </div>
                </button>
              </div>
            </div>
          </a-card>
        </template>
      </a-popover>
      <a-popover placement="bottom" :overlayStyle="{ width: '335px' }" trigger="click">
        <RibbonButton icon="format-list-numbered" title="编号" has-arrow />
        <template #content>
          <a-card size="small" class="ribbon-popover-card" :bordered="false" :bodyStyle="{ padding: '4px' }">
            <div class="list-panel">
              <div class="list-panel-title">编号</div>
              <div class="list-grid number-grid">
                <button class="list-cell list-cell-none" @click="emit('number', null)">无</button>
                <button v-for="n in numberStyles" :key="n.style" class="list-cell" :title="n.label" @click="emit('number', n.style)">
                  <div class="list-preview">
                    <div class="list-preview-row" v-for="i in 3" :key="i"><span class="list-num">{{ n.samples[i - 1] }}</span><span class="list-line"></span></div>
                  </div>
                </button>
              </div>
            </div>
          </a-card>
        </template>
      </a-popover>
      <RibbonButton icon="format-indent-decrease" title="减少缩进" command="indentStep" command-args="sub" />
      <RibbonButton icon="format-indent-increase" title="增加缩进" command="indentStep" command-args="add" />
      <a-dropdown :trigger="['click']">
        <RibbonButton text="首行缩进" title="首行缩进" has-arrow />
        <template #overlay>
          <a-menu @click="({ key }: any) => emit('command', 'firstLineIndent', Number(key) * INDENT_PX_PER_CHAR)">
            <a-menu-item v-for="o in firstLineIndentOptions" :key="o.value">{{ o.label }}</a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </RibbonGroup>

    <!-- 样式 -->
    <RibbonGroup title="样式">
      <a-dropdown :trigger="['click']">
        <RibbonButton :text="currentTitleLabel" title="标题级别" has-arrow />
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
      <RibbonButton icon="format-clear" title="清除格式 (Ctrl+\)" command="format" />
    </RibbonGroup>

    <!-- 编辑 -->
    <RibbonGroup title="编辑">
      <RibbonButton icon="magnify" title="查找 (Ctrl+F)" command="openSearchPanel" />
      <RibbonButton icon="select-all" title="全选 (Ctrl+A)" command="selectAll" />
      <RibbonButton icon="delete-outline" title="删除" :disabled="!hasSelection" command="delete" />
    </RibbonGroup>
  </div>
</template>

<script setup lang="ts">
import { VIcon } from '@vervedoc/icons'
import { UI_FONT_OPTIONS, UI_SIZE_OPTIONS, sizeValueToLabel, sizeLabelToValue } from '@/config/ui-constants'
import { colorPalette, bulletStyles, numberStyles, lineHeightOptions } from '../../toolbar/index'
import { characterScaleOptions, firstLineIndentOptions } from '../../toolbar/ribbon-tabs'
import RibbonGroup from '../ribbonGroup.vue'
import RibbonButton from '../ribbonButton.vue'

const INDENT_PX_PER_CHAR = 14

const emit = defineEmits<{
  (e: 'command', cmd: string, ...args: any[]): void
  (e: 'font', v: string): void
  (e: 'size', v: number): void
  (e: 'fontColor', c: string): void
  (e: 'highlight', c: string): void
  (e: 'rowFlex', v: string): void
  (e: 'lineHeight', v: number): void
  (e: 'bullet', s: string | null): void
  (e: 'number', s: string | null): void
  (e: 'title', v: string | null): void
  (e: 'characterScale', v: number): void
}>()

defineProps<{
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
}>()

const fontList = UI_FONT_OPTIONS
const sizeList = UI_SIZE_OPTIONS

const handleCharacterScale = (key: string) => {
  if (key === 'scaleCustom') {
    emit('command', 'characterScaleCustom')
    return
  }
  const scale = parseInt(key.replace('scale', ''))
  if (!isNaN(scale)) emit('characterScale', scale)
}
</script>

<style scoped>
@import '../../toolbar/ribbon-popover.css';
.mi { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; }
.scale-check { display: inline-block; width: 16px; color: #1677ff; }
.scale-check.active { font-weight: bold; }
</style>
