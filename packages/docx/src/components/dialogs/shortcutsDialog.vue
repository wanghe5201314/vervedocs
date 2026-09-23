<template>
  <VdDialog v-model:open="visible" :title="t('dialog.shortcuts.title')" width="600px" :maskClosable="false" class="shortcuts-dialog">
    <div class="shortcuts-content">
      <div class="shortcut-group">
        <h3>{{ t('dialog.shortcuts.fileOperations') }}</h3>
        <div class="shortcut-row">
          <span>{{ t('dialog.shortcuts.importDocument') }}</span>
          <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>O</kbd>
        </div>
        <div class="shortcut-row">
          <span>{{ t('dialog.shortcuts.save') }}</span>
          <kbd>Ctrl</kbd> + <kbd>S</kbd>
        </div>
        <div class="shortcut-row">
          <span>{{ t('dialog.shortcuts.print') }}</span>
          <kbd>Ctrl</kbd> + <kbd>P</kbd>
        </div>
      </div>

      <div class="shortcut-group">
        <h3>{{ t('dialog.shortcuts.editOperations') }}</h3>
        <div class="shortcut-row">
          <span>{{ t('dialog.shortcuts.undo') }}</span>
          <kbd>Ctrl</kbd> + <kbd>Z</kbd>
        </div>
        <div class="shortcut-row">
          <span>{{ t('dialog.shortcuts.redo') }}</span>
          <kbd>Ctrl</kbd> + <kbd>Y</kbd>
        </div>
        <div class="shortcut-row">
          <span>{{ t('dialog.shortcuts.cut') }}</span>
          <kbd>Ctrl</kbd> + <kbd>X</kbd>
        </div>
        <div class="shortcut-row">
          <span>{{ t('dialog.shortcuts.copy') }}</span>
          <kbd>Ctrl</kbd> + <kbd>C</kbd>
        </div>
        <div class="shortcut-row">
          <span>{{ t('dialog.shortcuts.paste') }}</span>
          <kbd>Ctrl</kbd> + <kbd>V</kbd>
        </div>
        <div class="shortcut-row">
          <span>{{ t('dialog.shortcuts.pasteNoFormat') }}</span>
          <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>V</kbd>
        </div>
        <div class="shortcut-row">
          <span>{{ t('dialog.shortcuts.selectAll') }}</span>
          <kbd>Ctrl</kbd> + <kbd>A</kbd>
        </div>
        <div class="shortcut-row">
          <span>{{ t('dialog.shortcuts.find') }}</span>
          <kbd>Ctrl</kbd> + <kbd>F</kbd>
        </div>
        <div class="shortcut-row">
          <span>{{ t('dialog.shortcuts.findAndReplace') }}</span>
          <kbd>Ctrl</kbd> + <kbd>H</kbd>
        </div>
      </div>

      <div class="shortcut-group">
        <h3>{{ t('dialog.shortcuts.textFormat') }}</h3>
        <div class="shortcut-row">
          <span>{{ t('dialog.shortcuts.bold') }}</span>
          <kbd>Ctrl</kbd> + <kbd>B</kbd>
        </div>
        <div class="shortcut-row">
          <span>{{ t('dialog.shortcuts.italic') }}</span>
          <kbd>Ctrl</kbd> + <kbd>I</kbd>
        </div>
        <div class="shortcut-row">
          <span>{{ t('dialog.shortcuts.underline') }}</span>
          <kbd>Ctrl</kbd> + <kbd>U</kbd>
        </div>
        <div class="shortcut-row">
          <span>{{ t('dialog.shortcuts.clearFormat') }}</span>
          <kbd>Ctrl</kbd> + <kbd>\</kbd>
        </div>
      </div>

      <div class="shortcut-group">
        <h3>{{ t('dialog.shortcuts.insertOperations') }}</h3>
        <div class="shortcut-row">
          <span>{{ t('dialog.shortcuts.pageBreak') }}</span>
          <kbd>Ctrl</kbd> + <kbd>Enter</kbd>
        </div>
        <div class="shortcut-row">
          <span>{{ t('dialog.shortcuts.lineBreak') }}</span>
          <kbd>Shift</kbd> + <kbd>Enter</kbd>
        </div>
        <div class="shortcut-row">
          <span>{{ t('dialog.shortcuts.addComment') }}</span>
          <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>M</kbd>
        </div>
      </div>
    </div>
    <template #footer>
      <VdButton type="primary" @click="visible = false">{{ t('common.close') }}</VdButton>
    </template>
  </VdDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { VdDialog, VdButton } from '@vervedoc/ui'
import { t } from '@/i18n'

/** 组件 props 定义 */
const props = defineProps<{
  modelValue: boolean
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
</script>

<style scoped>
.shortcuts-content {
  max-height: 60vh;
  overflow-y: auto;
  padding: 0 8px;
}

.shortcut-group {
  margin-bottom: 24px;
}

.shortcut-group h3 {
  margin: 0 0 12px 0;
  font-size: 15px;
  font-weight: 600;
  color: #202124;
  padding-bottom: 8px;
  border-bottom: 1px solid #e8eaed;
}

.shortcut-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: #5f6368;
}

.shortcut-row span:first-child {
  flex: 1;
}

.shortcut-row kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  background: #f1f3f4;
  border: 1px solid #dadce0;
  border-radius: 4px;
  font-size: 12px;
  font-family: inherit;
  color: #202124;
  margin: 0 2px;
}

</style>
