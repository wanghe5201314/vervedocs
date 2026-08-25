<template>
  <div class="top-header">
    <div class="left-actions">
      <button class="quick-btn" :title="translate('common.import')" @click="emit('command', 'import')">
        <VIcon name="file-excel-box" />
      </button>
      <button class="quick-btn" :title="translate('common.save') + ' (Ctrl+S)'" @click="emit('command', 'save')">
        <VIcon name="content-save-outline" />
      </button>
      <button class="quick-btn" :title="translate('common.undo') + ' (Ctrl+Z)'" @click="emit('command', 'undo')">
        <VIcon name="undo" />
      </button>
      <button class="quick-btn" :title="translate('common.redo') + ' (Ctrl+Y)'" @click="emit('command', 'redo')">
        <VIcon name="redo" />
      </button>
    </div>
    <div class="center-title">
      <span class="doc-name" :title="title">{{ title }}</span>
      <div class="doc-status">
        <template v-if="isViewMode">
          <EyeOutlined class="status-icon" />
          <span>{{ translate('common.readOnlyMode') }}</span>
        </template>
        <template v-else>
          <CheckCircleOutlined v-if="lastSaveTime" class="status-icon" />
          <CloudOutlined v-else class="status-icon" />
          <span>{{ lastSaveTime ? translate('common.recentSaved', { time: lastSaveTime }) : translate('common.autoSaved') }}</span>
        </template>
      </div>
    </div>
    <div class="right-actions">
      <a-avatar-group v-if="onlineUsers.length > 0" :maxCount="5" :style="{ display: 'flex', alignItems: 'center' }">
        <a-tooltip v-for="user in onlineUsers" :key="user.userId" :title="user.userName || user.userId" placement="bottom">
          <a-avatar :size="26" :style="{ backgroundColor: user.color }">
            {{ getAvatarText(user.userName || user.userId) }}
          </a-avatar>
        </a-tooltip>
      </a-avatar-group>
    </div>
  </div>
</template>

<script setup lang="ts">
import { EyeOutlined, CheckCircleOutlined, CloudOutlined } from '@ant-design/icons-vue'
import { VIcon } from '@vervedoc/icons'

interface CollabUser {
  userId: string
  userName: string
  color: string
}

type Translate = (key: string, params?: Record<string, string | number>) => string

const emit = defineEmits<{
  (e: 'command', command: string): void
}>()

const props = withDefaults(defineProps<{
  docType?: 'word' | 'excel' | 'ppt'
  title: string
  isViewMode?: boolean
  lastSaveTime?: string
  onlineUsers?: CollabUser[]
  t?: Translate
}>(), {
  docType: 'excel',
  isViewMode: false,
  lastSaveTime: '',
  onlineUsers: () => []
})

const translate: Translate = (key, params) => {
  if (typeof props.t === 'function') return props.t(key, params)
  if (key === 'common.readOnlyMode') return '只读模式'
  if (key === 'common.recentSaved') return `已保存 ${params?.time ?? ''}`
  if (key === 'common.autoSaved') return '自动保存中'
  if (key === 'common.import') return '导入表格'
  if (key === 'common.save') return '保存'
  if (key === 'common.undo') return '撤销'
  if (key === 'common.redo') return '重做'
  return key
}

const getAvatarText = (name: string) => {
  const s = String(name || '').trim()
  if (!s) return '?'
  if (/[\u4e00-\u9fa5]/.test(s)) return s.slice(-2)
  const parts = s.split(/[\s_-]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return s.slice(0, 2).toUpperCase()
}
</script>

<style scoped>
.top-header {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  background: var(--app-ribbon-topbar-bg, #217346);
  color: var(--app-ribbon-topbar-text, #fff);
}

.left-actions,
.right-actions {
  min-width: 200px;
  display: flex;
  align-items: center;
  gap: 2px;
}

.right-actions {
  justify-content: flex-end;
}

.center-title {
  min-width: 0;
  max-width: 60%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.doc-name {
  max-width: 540px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 600;
  color: var(--app-ribbon-topbar-text, #fff);
}

.doc-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--app-ribbon-topbar-text-muted, rgba(255, 255, 255, 0.86));
  white-space: nowrap;
}

.status-icon {
  font-size: 12px;
}

.quick-btn {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--app-ribbon-topbar-text, #fff);
  cursor: pointer;
}

.quick-btn:hover {
  background: var(--app-ribbon-topbar-hover, rgba(255, 255, 255, 0.16));
}

.quick-btn :deep(svg),
.quick-btn :deep(i) {
  font-size: 16px;
}
</style>
