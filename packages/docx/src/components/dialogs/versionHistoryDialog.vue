<template>
  <VdDialog v-model:open="visible" title="版本历史" width="640px" :maskClosable="false" class="app-dialog">
    <div class="version-wrap">
      <div class="version-header">
        <VdButton type="primary" size="small" @click="handleCreateVersion" :loading="creating">
          创建版本快照
        </VdButton>
      </div>

      <div v-if="loading" class="version-loading">
        <LoadingOutlined :size="24" />
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
            <VdButton size="small" type="link" @click="handlePreview(version)">预览</VdButton>
            <VdButton size="small" type="link" @click="handleRestore(version)">恢复</VdButton>
          </div>
        </div>
      </div>
    </div>
  </VdDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { VdDialog, VdButton, useDialogConfirm } from '@vervedoc/ui'
import { LoadingOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import type { IVersion } from '@/types/comment'
import {
  fetchDocumentVersions,
  createDocumentVersion,
  nameDocumentVersion,
  restoreDocumentVersion
} from '@/api/document.api'

const confirm = useDialogConfirm()

/** 组件 props 定义 */
const props = defineProps<{
  modelValue: boolean
  docId?: string
}>()

/** 组件 emits 定义 */
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'restore', content: any): void
  (e: 'preview', version: IVersion): void
}>()

/** 弹窗可见性，双向绑定到 modelValue */
const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

/** 是否正在加载版本列表 */
const loading = ref(false)
/** 是否正在创建版本快照 */
const creating = ref(false)
/** 版本历史列表 */
const versions = ref<IVersion[]>([])
/** 正在编辑名称的版本 id */
const editingId = ref<number | null>(null)
/** 正在编辑的版本名称 */
const editingName = ref('')

/** 弹窗打开时加载版本列表 */
watch(() => props.modelValue, async (val) => {
  if (val && props.docId) {
    await loadVersions()
  }
})

/** 加载文档版本历史列表 */
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

/** 创建版本快照 */
const handleCreateVersion = async () => {
  if (!props.docId) return
  creating.value = true
  try {
    await createDocumentVersion(props.docId)
    message.success('版本快照已创建')
    await loadVersions()
  } catch (e) {
    const msg = e instanceof Error ? e.message : '创建版本失败'
    message.error(msg)
  } finally {
    creating.value = false
  }
}

/**
 * 进入版本名称编辑状态
 * @param version 版本对象
 * @returns {void}
 */
const handleNameEdit = (version: IVersion) => {
  editingId.value = version.id
  editingName.value = version.name || ''
}

/**
 * 保存版本名称
 * @param version 版本对象
 * @returns {Promise<void>}
 */
const handleNameSave = async (version: IVersion) => {
  const name = editingName.value.trim()
  editingId.value = null
  if (!name || name === version.name) return
  try {
    await nameDocumentVersion(version.id, name)
    version.name = name
  } catch (e) {
    const msg = e instanceof Error ? e.message : '重命名失败'
    message.error(msg)
  }
}

/**
 * 触发版本预览事件
 * @param version 版本对象
 * @returns {void}
 */
const handlePreview = (version: IVersion) => {
  emit('preview', version)
}

/**
 * 恢复到指定版本（确认后调用恢复接口并触发 restore 事件）
 * @param version 版本对象
 * @returns {Promise<void>}
 */
const handleRestore = async (version: IVersion) => {
  if (!props.docId) return
  try {
    const accepted = await confirm({
      content: `确定要恢复到"${version.name || '版本 ' + version.versionNumber}"吗？当前内容将自动保存为新版本。`,
      title: '恢复版本',
      okText: '确定恢复',
      cancelText: '取消'
    })
    if (!accepted) return
    const content = await restoreDocumentVersion(props.docId, version.versionNumber)
    message.success('版本已恢复')
    emit('restore', content)
    await loadVersions()
  } catch (e) {
    if (e === 'cancel' || (e as any)?.toString?.()?.includes('cancel')) return
    const msg = e instanceof Error ? e.message : '恢复失败'
    message.error(msg)
  }
}

/**
 * 格式化时间字符串为本地化展示
 * @param dateStr 时间字符串
 * @returns {string} 格式化后的时间字符串
 */
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
  background: #1890ff;
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
  color: #1890ff;
}

.name-input {
  border: 1px solid #1890ff;
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
