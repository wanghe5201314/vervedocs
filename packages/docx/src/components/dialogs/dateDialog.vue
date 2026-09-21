<template>
  <VdDialog v-model:open="visible" title="日期和时间" width="500px" :maskClosable="false" class="app-dialog">
    <div class="date-body">
      <div class="date-left">
        <div class="form-label">可用格式(A):</div>
        <div style="overflow-y:auto;height:200px">
          <div
            v-for="f in dateFormats"
            :key="f"
            class="format-item"
            :class="{ active: selectedDateFormat === f }"
            @click="selectedDateFormat = f"
          >
            {{ f }}
          </div>
        </div>
      </div>
      <div class="date-right">
        <div class="form-label">语言(国家/地区)(L):</div>
        <a-select v-model:value="dateLanguage" style="width: 100%; margin-top: 8px;">
          <a-select-option label="中文(中国)" value="zh-CN" />
        </a-select>
        <div style="margin-top: 20px;">
          <a-checkbox>使用全角字符(W)</a-checkbox>
        </div>
        <div style="margin-top: 10px;">
          <a-checkbox>自动更新(U)</a-checkbox>
        </div>
      </div>
    </div>
    <template #footer>
      <VdButton type="primary" icon="check" @click="confirmDate">确定</VdButton>
      <VdButton icon="close" @click="visible = false">取消</VdButton>
    </template>
  </VdDialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { VdDialog, VdButton } from '@vervedoc/ui'


/** 组件 props 定义 */
const props = defineProps<{
  modelValue: boolean
}>()

/** 组件 emits 定义 */
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', data: { format: string; value: string }): void
}>()

/** 弹窗可见性，双向绑定到 modelValue */
const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

/** 可用的日期格式列表 */
const dateFormats = [
  'yyyy-MM-dd',
  'yyyy年MM月dd日',
  'yyyy年MM月dd日星期E',
  'yyyy/MM/dd',
  'yy.MM.dd',
  'yyyy年MM月',
  'HH时mm分ss秒',
  'HH时mm分',
  'HH:mm:ss',
  '下午h时mm分'
]
/** 当前选中的日期格式 */
const selectedDateFormat = ref(dateFormats[0])
/** 日期语言/地区 */
const dateLanguage = ref('zh-CN')

/** 确认日期，根据格式生成当前时间字符串并触发 confirm 事件 */
const confirmDate = () => {
  const now = new Date()
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  const year = now.getFullYear().toString()
  const yy = year.slice(-2)
  let value = selectedDateFormat.value
    .replace('yyyy', year)
    .replace('yy', yy)
    .replace('MM', (now.getMonth() + 1).toString().padStart(2, '0'))
    .replace('dd', now.getDate().toString().padStart(2, '0'))
    .replace('HH', now.getHours().toString().padStart(2, '0'))
    .replace('mm', now.getMinutes().toString().padStart(2, '0'))
    .replace('ss', now.getSeconds().toString().padStart(2, '0'))
    .replace('E', weekDays[now.getDay()])

  emit('confirm', { format: selectedDateFormat.value, value })
  visible.value = false
}
</script>

<style scoped>
.date-body {
  display: flex;
  gap: 20px;
}

.date-left {
  flex: 1;
}

.date-right {
  width: 180px;
}

.form-label {
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
}

.format-item {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  border-radius: 4px;
}

.format-item:hover {
  background: #f5f7fa;
}

.format-item.active {
  background: #e6f7ff;
  color: #1890ff;
}
</style>
