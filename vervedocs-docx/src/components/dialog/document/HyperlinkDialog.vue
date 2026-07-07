<template>
  <el-dialog v-model="visible" title="插入超链接" width="550px" :close-on-click-modal="false" class="app-dialog">
    <el-form :model="hyperlinkForm" label-width="80px">
      <el-form-item label="超链接文字">
        <el-input v-model="hyperlinkForm.text" placeholder="请输入链接显示文字" />
      </el-form-item>
      <el-form-item label="超链接地址">
        <el-input v-model="hyperlinkForm.urlBody" placeholder="请输入链接地址">
          <template #prepend>
            <el-select v-model="hyperlinkForm.protocol" style="width: 100px">
              <el-option label="http://" value="http://" />
              <el-option label="https://" value="https://" />
              <el-option label="ftp://" value="ftp://" />
              <el-option label="mailto:" value="mailto:" />
              <el-option label="tel:" value="tel:" />
            </el-select>
          </template>
        </el-input>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button type="primary" @click="confirmHyperlink">
        <el-icon><Check /></el-icon>
        确定
      </el-button>
      <el-button @click="visible = false">
        <el-icon><Close /></el-icon>
        取消
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Check, Close } from '@element-plus/icons-vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', data: { text: string; url: string }): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const hyperlinkForm = ref({
  text: '',
  protocol: 'https://',
  urlBody: ''
})

// 当对话框打开时，重置表单
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    hyperlinkForm.value = {
      text: '',
      protocol: 'https://',
      urlBody: ''
    }
  }
})

const confirmHyperlink = () => {
  // 验证URL是否为空
  if (!hyperlinkForm.value.urlBody.trim()) {
    return
  }

  // 组合完整的URL
  const fullUrl = hyperlinkForm.value.protocol + hyperlinkForm.value.urlBody

  emit('confirm', {
    text: hyperlinkForm.value.text,
    url: fullUrl
  })
  visible.value = false
}
</script>
