<template>
  <el-dialog v-model="visible" title="日期和时间" width="500px" :close-on-click-modal="false" class="app-dialog">
    <div class="date-body">
      <div class="date-left">
        <div class="form-label">可用格式(A):</div>
        <el-scrollbar height="200px">
          <div
            v-for="f in dateFormats"
            :key="f"
            class="format-item"
            :class="{ active: selectedDateFormat === f }"
            @click="selectedDateFormat = f"
          >
            {{ f }}
          </div>
        </el-scrollbar>
      </div>
      <div class="date-right">
        <div class="form-label">语言(国家/地区)(L):</div>
        <el-select v-model="dateLanguage" style="width: 100%; margin-top: 8px;">
          <el-option label="中文(中国)" value="zh-CN" />
        </el-select>
        <div style="margin-top: 20px;">
          <el-checkbox>使用全角字符(W)</el-checkbox>
        </div>
        <div style="margin-top: 10px;">
          <el-checkbox>自动更新(U)</el-checkbox>
        </div>
      </div>
    </div>
    <template #footer>
      <el-button type="primary" @click="confirmDate">
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
import { ref, computed } from 'vue'
import { Check, Close } from '@element-plus/icons-vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', data: { format: string; value: string }): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

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
const selectedDateFormat = ref(dateFormats[0])
const dateLanguage = ref('zh-CN')

const confirmDate = () => {
  const now = new Date()
  let value = selectedDateFormat.value
    .replace('yyyy', now.getFullYear().toString())
    .replace('MM', (now.getMonth() + 1).toString().padStart(2, '0'))
    .replace('dd', now.getDate().toString().padStart(2, '0'))
    .replace('HH', now.getHours().toString().padStart(2, '0'))
    .replace('mm', now.getMinutes().toString().padStart(2, '0'))
    .replace('ss', now.getSeconds().toString().padStart(2, '0'))

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
  background: #ecf5ff;
  color: #409eff;
}
</style>
