<template>
  <VdDialog v-model:open="visible" :title="t('dialog.hyperlink.title')" width="550px" :maskClosable="false" class="app-dialog">
    <a-form :model="hyperlinkForm" :label-col="{ style: { width: '80px' } }">
      <a-form-item :label="t('dialog.hyperlink.text')">
        <a-input v-model:value="hyperlinkForm.text" :placeholder="t('dialog.hyperlink.textPlaceholder')" />
      </a-form-item>
      <a-form-item :label="t('dialog.hyperlink.address')">
        <a-input v-model:value="hyperlinkForm.urlBody" :placeholder="t('dialog.hyperlink.addressPlaceholder')">
          <template #addonBefore>
            <a-select v-model:value="hyperlinkForm.protocol" style="width: 100px">
              <a-select-option label="http://" value="http://" />
              <a-select-option label="https://" value="https://" />
              <a-select-option label="ftp://" value="ftp://" />
              <a-select-option label="mailto:" value="mailto:" />
              <a-select-option label="tel:" value="tel:" />
            </a-select>
          </template>
        </a-input>
      </a-form-item>
    </a-form>
    <template #footer>
      <VdButton type="primary" icon="check" @click="confirmHyperlink">{{ t('common.ok') }}</VdButton>
      <VdButton icon="close" @click="visible = false">{{ t('common.cancel') }}</VdButton>
    </template>
  </VdDialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { VdDialog, VdButton } from '@vervedoc/ui'
import { t } from '@/i18n'


/** 组件 props 定义 */
const props = defineProps<{
  modelValue: boolean
}>()

/** 组件 emits 定义 */
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', data: { text: string; url: string }): void
}>()

/** 弹窗可见性，双向绑定到 modelValue */
const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

/** 超链接表单数据（显示文字、协议、地址） */
const hyperlinkForm = ref({
  text: '',
  protocol: 'https://',
  urlBody: ''
})

/** 弹窗打开时重置表单 */
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    hyperlinkForm.value = {
      text: '',
      protocol: 'https://',
      urlBody: ''
    }
  }
})

/** 确认超链接，拼接完整 URL 并触发 confirm 事件 */
const confirmHyperlink = () => {
  if (!hyperlinkForm.value.urlBody.trim()) {
    return
  }

  const fullUrl = hyperlinkForm.value.protocol + hyperlinkForm.value.urlBody

  emit('confirm', {
    text: hyperlinkForm.value.text,
    url: fullUrl
  })
  visible.value = false
}
</script>
