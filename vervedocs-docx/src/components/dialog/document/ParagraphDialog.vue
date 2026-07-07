<template>
  <el-dialog
    v-model="visible"
    class="app-dialog"
    title="段落与符号"
    width="720px"
    :close-on-click-modal="false"
    append-to-body
    destroy-on-close
    @open="handleOpen"
  >
    <el-tabs v-model="activeTab" type="border-card">
      <el-tab-pane label="段落" name="paragraph">
        <el-card shadow="never" class="dialog-card">
          <template #header>
            <span>缩进</span>
          </template>
          <div class="dialog-grid-2">
            <div class="dialog-field">
              <div class="dialog-label">首行缩进（字符）</div>
              <el-input-number v-model="indentChars" :size="UI_EL_SIZE" :min="0" :max="10" :step="1" style="width: 100%" />
            </div>
            <div class="dialog-field">
              <div class="dialog-label">快捷</div>
              <div class="dialog-row">
                <el-button :size="UI_EL_SIZE" @click="indentChars = 0">无</el-button>
                <el-button :size="UI_EL_SIZE" @click="indentChars = 2">2 字符</el-button>
                <el-button :size="UI_EL_SIZE" @click="indentChars = 4">4 字符</el-button>
              </div>
            </div>
          </div>
          <div class="dialog-tip">当前缩进为插入全角空格实现（与工具栏一致）。</div>
        </el-card>

        <el-card shadow="never" class="dialog-card" style="margin-top: 12px">
          <template #header>段落</template>
          <div class="dialog-grid-2">
            <div class="dialog-field">
              <div class="dialog-label">行距</div>
              <el-select v-model="lineHeightValue" :size="UI_EL_SIZE" style="width: 100%">
                <el-option v-for="v in lineHeightOptions" :key="v" :label="`${v}`" :value="v" />
              </el-select>
            </div>
            <div class="dialog-field">
              <div class="dialog-label">段间距</div>
              <el-input-number v-model="rowMarginValue" :size="UI_EL_SIZE" :min="0" :max="10" :step="0.5" style="width: 100%" />
            </div>
          </div>
        </el-card>

        <el-card shadow="never" class="dialog-card" style="margin-top: 12px">
          <template #header>文字样式</template>
          <div class="dialog-row">
            <el-checkbox :model-value="boldActive" :size="UI_EL_SIZE" @change="toggleBold">加粗</el-checkbox>
            <el-checkbox :model-value="italicActive" :size="UI_EL_SIZE" @change="toggleItalic">斜体</el-checkbox>
            <el-checkbox :model-value="underlineActive" :size="UI_EL_SIZE" @change="toggleUnderline">下划线</el-checkbox>
            <el-checkbox :model-value="strikeoutActive" :size="UI_EL_SIZE" @change="toggleStrikeout">删除线</el-checkbox>
          </div>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="项目符号与编号" name="symbol">
        <el-card shadow="never" class="dialog-card">
          <template #header>项目符号与编号</template>
          <div class="dialog-grid-2">
            <div class="dialog-field">
              <div class="dialog-label">项目符号</div>
                <el-select v-model="bulletStyleValue" :size="UI_EL_SIZE" clearable style="width: 100%" placeholder="选择项目符号">
                  <el-option v-for="o in bulletOptions" :key="o.value" :label="o.label" :value="o.value" />
                </el-select>
            </div>
            <div class="dialog-field">
              <div class="dialog-label">编号</div>
                <el-select v-model="numberStyleValue" :size="UI_EL_SIZE" clearable style="width: 100%" placeholder="选择编号样式">
                  <el-option v-for="o in numberOptions" :key="o.value" :label="o.label" :value="o.value" />
                </el-select>
            </div>
          </div>
          <div class="dialog-row" style="margin-top: 10px">
              <el-button :size="UI_EL_SIZE" @click="handleClearList">清除列表</el-button>
              <div class="dialog-tip">项目符号与编号互斥，选择其一将覆盖另一种。</div>
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <el-button :size="UI_EL_SIZE" @click="visible = false">取消</el-button>
      <el-button :size="UI_EL_SIZE" type="primary" @click="handleApply">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { editorStateStore } from '@/stores/editor-state'
import { UI_EL_SIZE } from '@/config/ui-constants'

const INDENT_PX_PER_CHAR = 14

const props = defineProps<{
  modelValue: boolean
  editor: any
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const activeTab = ref<'paragraph' | 'symbol'>('paragraph')

import { lineHeightOptions } from '@/components/editor/toolbar'
const lineHeightValue = ref<number>(editorStateStore.state.lineHeight || 1.5)
const rowMarginValue = ref<number>(editorStateStore.state.rowMargin || 1)
const indentChars = ref<number>(0)

const bulletStyleValue = ref<string | null>(null)
const numberStyleValue = ref<string | null>(null)

const boldActive = computed(() => !!editorStateStore.state.bold)
const italicActive = computed(() => !!editorStateStore.state.italic)
const underlineActive = computed(() => !!editorStateStore.state.underline)
const strikeoutActive = computed(() => !!editorStateStore.state.strikeout)

const bulletOptions = [
  { label: '● 实心圆点', value: 'disc' },
  { label: '○ 空心圆点', value: 'circle' },
  { label: '■ 方块', value: 'square' },
  { label: '✔ 打勾', value: 'check' }
]

const numberOptions = [
  { label: '1. 2. 3.', value: 'decimal-dot' },
  { label: '1) 2) 3)', value: 'decimal-bracket' },
  { label: '一、二、三、', value: 'chinese' },
  { label: 'A. B. C.', value: 'upper-alpha' }
]

watch(
  () => editorStateStore.state.lineHeight,
  (val) => {
    if (typeof val === 'number') lineHeightValue.value = val
  }
)

watch(
  () => editorStateStore.state.rowMargin,
  (val) => {
    if (typeof val === 'number') rowMarginValue.value = val
  }
)

watch(
  () => [editorStateStore.state.listType, editorStateStore.state.listStyle] as const,
  ([type, style]) => {
    if (type === 'ul') {
      bulletStyleValue.value = style || null
      numberStyleValue.value = null
    } else if (type === 'ol') {
      numberStyleValue.value = style || null
      bulletStyleValue.value = null
    } else {
      bulletStyleValue.value = null
      numberStyleValue.value = null
    }
  },
  { immediate: true }
)

watch(bulletStyleValue, (val) => {
  if (!val) return
  numberStyleValue.value = null
})

watch(numberStyleValue, (val) => {
  if (!val) return
  bulletStyleValue.value = null
})

const toggleBold = () => props.editor?.executeCommand?.('bold')
const toggleItalic = () => props.editor?.executeCommand?.('italic')
const toggleUnderline = () => props.editor?.executeCommand?.('underline')
const toggleStrikeout = () => props.editor?.executeCommand?.('strikeout')

const handleOpen = () => {
  try {
    const count = props.editor?.executeCommand?.('getFirstLineIndent')
    indentChars.value = typeof count === 'number' ? count : 0
  } catch {
    indentChars.value = 0
  }
}

const handleClearList = () => {
  bulletStyleValue.value = null
  numberStyleValue.value = null
}

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
