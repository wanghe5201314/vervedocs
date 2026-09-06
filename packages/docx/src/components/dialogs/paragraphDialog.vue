<template>
  <a-modal
    v-model:open="visible"
    class="app-dialog"
    title="段落与符号"
    width="720px"
    :maskClosable="false"
    :destroyOnClose="true"
    @afterOpenChange="(open: boolean) => { if (open) handleOpen() }"
  >
    <a-tabs v-model:activeKey="activeTab" type="card">
      <a-tab-pane tab="段落" key="paragraph">
        <a-card :bordered="true" class="dialog-card">
          <template #title>
            <span>缩进</span>
          </template>
          <div class="dialog-grid-2">
            <div class="dialog-field">
              <div class="dialog-label">首行缩进（字符）</div>
              <a-input-number v-model:value="indentChars" :size="UI_EL_SIZE" :min="0" :max="10" :step="1" style="width: 100%" />
            </div>
            <div class="dialog-field">
              <div class="dialog-label">快捷</div>
              <div class="dialog-row">
                <a-button :size="UI_EL_SIZE" @click="indentChars = 0">无</a-button>
                <a-button :size="UI_EL_SIZE" @click="indentChars = 2">2 字符</a-button>
                <a-button :size="UI_EL_SIZE" @click="indentChars = 4">4 字符</a-button>
              </div>
            </div>
          </div>
          <div class="dialog-tip">当前缩进为插入全角空格实现（与工具栏一致）。</div>
        </a-card>

        <a-card :bordered="true" class="dialog-card" style="margin-top: 12px">
          <template #title>段落</template>
          <div class="dialog-grid-2">
            <div class="dialog-field">
              <div class="dialog-label">行距</div>
              <a-select v-model:value="lineHeightValue" :size="UI_EL_SIZE" style="width: 100%">
                <a-select-option v-for="v in LINE_HEIGHT_OPTIONS" :key="v.value" :label="v.label" :value="v.value" />
              </a-select>
            </div>
            <div class="dialog-field">
              <div class="dialog-label">段间距</div>
              <a-input-number v-model:value="rowMarginValue" :size="UI_EL_SIZE" :min="0" :max="10" :step="0.5" style="width: 100%" />
            </div>
          </div>
        </a-card>

        <a-card :bordered="true" class="dialog-card" style="margin-top: 12px">
          <template #title>文字样式</template>
          <div class="dialog-row">
            <a-checkbox :checked="boldActive" :size="UI_EL_SIZE" @change="toggleBold">加粗</a-checkbox>
            <a-checkbox :checked="italicActive" :size="UI_EL_SIZE" @change="toggleItalic">斜体</a-checkbox>
            <a-checkbox :checked="underlineActive" :size="UI_EL_SIZE" @change="toggleUnderline">下划线</a-checkbox>
            <a-checkbox :checked="strikeoutActive" :size="UI_EL_SIZE" @change="toggleStrikeout">删除线</a-checkbox>
          </div>
        </a-card>
      </a-tab-pane>

      <a-tab-pane tab="项目符号与编号" key="symbol">
        <a-card :bordered="true" class="dialog-card">
          <template #title>项目符号与编号</template>
          <div class="dialog-grid-2">
            <div class="dialog-field">
              <div class="dialog-label">项目符号</div>
                <a-select v-model:value="bulletStyleValue" :size="UI_EL_SIZE" allowClear style="width: 100%" placeholder="选择项目符号">
                  <a-select-option v-for="o in bulletOptions" :key="o.value" :label="o.label" :value="o.value" />
                </a-select>
            </div>
            <div class="dialog-field">
              <div class="dialog-label">编号</div>
                <a-select v-model:value="numberStyleValue" :size="UI_EL_SIZE" allowClear style="width: 100%" placeholder="选择编号样式">
                  <a-select-option v-for="o in numberOptions" :key="o.value" :label="o.label" :value="o.value" />
                </a-select>
            </div>
          </div>
          <div class="dialog-row" style="margin-top: 10px">
              <a-button :size="UI_EL_SIZE" @click="handleClearList">清除列表</a-button>
              <div class="dialog-tip">项目符号与编号互斥，选择其一将覆盖另一种。</div>
          </div>
        </a-card>
      </a-tab-pane>
    </a-tabs>

    <template #footer>
      <a-button :size="UI_EL_SIZE" @click="visible = false">取消</a-button>
      <a-button :size="UI_EL_SIZE" type="primary" @click="handleApply">确定</a-button>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { editorStateStore } from '@/stores/editor-state'
import { UI_EL_SIZE } from '@/config/constants'

/** 每个缩进字符对应的像素数 */
const INDENT_PX_PER_CHAR = 14

/** 组件 props 定义 */
const props = defineProps<{
  modelValue: boolean
  editor: any
}>()

/** 组件 emits 定义 */
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

/** 弹窗可见性，双向绑定到 modelValue */
const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

/** 当前激活的标签页：段落 或 项目符号与编号 */
const activeTab = ref<'paragraph' | 'symbol'>('paragraph')

import { LINE_HEIGHT_OPTIONS } from '@vervedoc/core'
/** 行距值 */
const lineHeightValue = ref<number>(editorStateStore.state.lineHeight || 1.5)
/** 段间距值 */
const rowMarginValue = ref<number>(editorStateStore.state.rowMargin || 1)
/** 首行缩进字符数 */
const indentChars = ref<number>(0)

/** 项目符号样式值 */
const bulletStyleValue = ref<string | undefined>(undefined)
/** 编号样式值 */
const numberStyleValue = ref<string | undefined>(undefined)

/** 加粗是否激活 */
const boldActive = computed(() => !!editorStateStore.state.bold)
/** 斜体是否激活 */
const italicActive = computed(() => !!editorStateStore.state.italic)
/** 下划线是否激活 */
const underlineActive = computed(() => !!editorStateStore.state.underline)
/** 删除线是否激活 */
const strikeoutActive = computed(() => !!editorStateStore.state.strikeout)

/** 项目符号选项列表 */
const bulletOptions = [
  { label: '● 实心圆点', value: 'disc' },
  { label: '○ 空心圆点', value: 'circle' },
  { label: '■ 方块', value: 'square' },
  { label: '✔ 打勾', value: 'check' }
]

/** 编号样式选项列表 */
const numberOptions = [
  { label: '1. 2. 3.', value: 'decimal-dot' },
  { label: '1) 2) 3)', value: 'decimal-bracket' },
  { label: '一、二、三、', value: 'chinese' },
  { label: 'A. B. C.', value: 'upper-alpha' }
]

/** 监听全局行距变化，同步到本地行距值 */
watch(
  () => editorStateStore.state.lineHeight,
  (val) => {
    if (typeof val === 'number') lineHeightValue.value = val
  }
)

/** 监听全局段间距变化，同步到本地段间距值 */
watch(
  () => editorStateStore.state.rowMargin,
  (val) => {
    if (typeof val === 'number') rowMarginValue.value = val
  }
)

/** 监听全局列表类型与样式变化，同步到本地项目符号/编号值 */
watch(
  () => [editorStateStore.state.listType, editorStateStore.state.listStyle] as const,
  ([type, style]) => {
    if (type === 'ul') {
      bulletStyleValue.value = style || undefined
      numberStyleValue.value = undefined
    } else if (type === 'ol') {
      numberStyleValue.value = style || undefined
      bulletStyleValue.value = undefined
    } else {
      bulletStyleValue.value = undefined
      numberStyleValue.value = undefined
    }
  },
  { immediate: true }
)

/** 选择项目符号时清空编号样式，保证互斥 */
watch(bulletStyleValue, (val) => {
  if (!val) return
  numberStyleValue.value = undefined
})

/** 选择编号样式时清空项目符号，保证互斥 */
watch(numberStyleValue, (val) => {
  if (!val) return
  bulletStyleValue.value = undefined
})

/** 切换加粗状态 */
const toggleBold = () => props.editor?.executeCommand?.('bold')
/** 切换斜体状态 */
const toggleItalic = () => props.editor?.executeCommand?.('italic')
/** 切换下划线状态 */
const toggleUnderline = () => props.editor?.executeCommand?.('underline')
/** 切换删除线状态 */
const toggleStrikeout = () => props.editor?.executeCommand?.('strikeout')

/** 弹窗打开时初始化首行缩进字符数 */
const handleOpen = () => {
  try {
    const count = props.editor?.executeCommand?.('getFirstLineIndent')
    indentChars.value = typeof count === 'number' ? count : 0
  } catch {
    indentChars.value = 0
  }
}

/** 清除列表（项目符号与编号） */
const handleClearList = () => {
  bulletStyleValue.value = undefined
  numberStyleValue.value = undefined
}

/** 应用段落设置并关闭弹窗 */
const handleApply = () => {
  props.editor?.executeCommand?.('lineHeight', lineHeightValue.value)
  props.editor?.executeCommand?.('rowMargin', rowMarginValue.value)
  props.editor?.executeCommand?.('firstLineIndent', indentChars.value * INDENT_PX_PER_CHAR)

  if (bulletStyleValue.value) {
    props.editor?.executeCommand?.('list', 'ul', bulletStyleValue.value)
  } else if (numberStyleValue.value) {
    props.editor?.executeCommand?.('list', 'ol', numberStyleValue.value)
  } else {
    props.editor?.executeCommand?.('list', null)
  }
  visible.value = false
}
</script>
