<template>
  <el-dialog v-model="visible" title="版本历史" width="640px" :close-on-click-modal="false" class="app-dialog">
    <div class="version-wrap">
      <div class="version-header">
        <el-button type="primary" size="small" @click="handleCreateVersion" :loading="creating">
          创建版本快照
        </el-button>
      </div>

      <div v-if="loading" class="version-loading">
        <el-icon class="is-loading" :size="24"><Loading /></el-icon>
        <span>加载版本历史...</span>
      </div>

      <div v-else-if="versions.length === 0" class="version-empty">
        <span>暂无版本记录</span>
      </div>

      <div v-else class="version-list">
        <div
          v-for="version in versions"
          :key="version.id"
          class="version-item"
          :class="{ 'is-auto': version.isAutoSave }"
        >
          <div class="version-left">
            <div class="version-dot" :class="version.isAutoSave ? 'dot-auto' : 'dot-manual'" />
            <div class="version-info">
              <div class="version-name">
                <span v-if="editingId === version.id">
                  <input
                    v-model="editingName"
                    class="name-input"
                    @keydown.enter="handleNameSave(version)"
                    @keydown.escape="editingId = null"
                    @blur="handleNameSave(version)"
                  />
                </span>
                <span v-else class="name-text" @dblclick="handleNameEdit(version)">
                  {{ version.name || (version.isAutoSave ? '自动保存' : `版本 ${version.versionNumber}`) }}
                </span>
                <span v-if="version.isAutoSave" class="auto-tag">自动</span>
              </div>
              <div class="version-meta">
                <span class="version-creator">{{ version.creatorName || '未知用户' }}</span>
                <span class="version-time">{{ formatTime(version.createdAt) }}</span>
                <span v-if="version.changeSummary" class="version-summary">{{ version.changeSummary }}</span>
              </div>
            </div>
          </div>
          <div class="version-actions">
            <el-button size="small" text @click="handlePreview(version)">预览</el-button>
            <el-button size="small" text type="primary" @click="handleRestore(version)">恢复</el-button>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { IVersion } from '@/types/comment'
import {
  fetchDocumentVersions,
  createDocumentVersion,
  nameDocumentVersion,
  restoreDocumentVersion
} from '@/api/document.api'

const props = defineProps<{
  modelValue: boolean
  docId?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'restore', content: any): void
  (e: 'preview', version: IVersion): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const loading = ref(false)
const creating = ref(false)
const versions = ref<IVersion[]>([])
const editingId = ref<number | null>(null)
const editingName = ref('')

watch(() => props.modelValue, async (val) => {
  if (val && props.docId) {
    await loadVersions()
  }
})

const loadVersions = async () => {
  if (!props.docId) return
  loading.value = true
  try {
    const data = await fetchDocumentVersions(props.docId)
    versions.value = data as IVersion[]
  } catch {
    versions.value = []
  } finally {
    loading.value = false
  }
}

const handleCreateVersion = async () => {
  if (!props.docId) return
  creating.value = true
  try {
    await createDocumentVersion(props.docId)
    ElMessage.success('版本快照已创建')
    await loadVersions()
  } catch (e) {
    const msg = e instanceof Error ? e.message : '创建版本失败'
    ElMessage.error(msg)
  } finally {
    creating.value = false
  }
}

const handleNameEdit = (version: IVersion) => {
  editingId.value = version.id
  editingName.value = version.name || ''
}

const handleNameSave = async (version: IVersion) => {
  const name = editingName.value.trim()
  editingId.value = null
  if (!name || name === version.name) return
  try {
    await nameDocumentVersion(version.id, name)
    version.name = name
  } catch (e) {
    const msg = e instanceof Error ? e.message : '重命名失败'
    ElMessage.error(msg)
  }
}

const handlePreview = (version: IVersion) => {
  emit('preview', version)
}

const handleRestore = async (version: IVersion) => {
  if (!props.docId) return
  try {
    await ElMessageBox.confirm(
      `确定要恢复到"${version.name || '版本 ' + version.versionNumber}"吗？当前内容将自动保存为新版本。`,
      '恢复版本',
      { confirmButtonText: '确定恢复', cancelButtonText: '取消', type: 'warning' }
    )
    const content = await restoreDocumentVersion(props.docId, version.versionNumber)
    ElMessage.success('版本已恢复')
    emit('restore', content)
    await loadVersions()
  } catch (e) {
    if (e === 'cancel' || (e as any)?.toString?.()?.includes('cancel')) return
    const msg = e instanceof Error ? e.message : '恢复失败'
    ElMessage.error(msg)
  }
}

const formatTime = (dateStr: string) => {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch {
    return dateStr
  }
}
</script>

<style scoped>
.version-wrap {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 500px;
}

.version-header {
  display: flex;
  justify-content: flex-end;
}

.version-loading,
.version-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 0;
  color: #909399;
  font-size: 14px;
}

.version-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
  max-height: 420px;
}

.version-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 8px;
  transition: background 0.2s;
}

.version-item:hover {
  background: #f5f7fa;
}

.version-item.is-auto {
  opacity: 0.8;
}

.version-left {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.version-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-top: 5px;
  flex-shrink: 0;
}

.dot-manual {
  background: #409eff;
}

.dot-auto {
  background: #c0c4cc;
}

.version-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.version-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.name-text {
  cursor: pointer;
}

.name-text:hover {
  color: #409eff;
}

.name-input {
  border: 1px solid #409eff;
  border-radius: 3px;
  padding: 2px 6px;
  font-size: 13px;
  outline: none;
  width: 200px;
}

.auto-tag {
  font-size: 11px;
  color: #909399;
  background: #f2f3f5;
  padding: 1px 6px;
  border-radius: 3px;
  font-weight: 400;
}

.version-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #909399;
  flex-wrap: wrap;
}

.version-creator {
  color: #606266;
}

.version-summary {
  color: #c0c4cc;
}

.version-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
</style>
