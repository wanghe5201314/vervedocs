<template>
  <div class="top-header">
    <div class="left">
      <div class="doc-icon" :class="`doc-icon-${docType}`">
        <svg class="file-icon" aria-hidden="true">
          <use :xlink:href="iconSymbol"></use>
        </svg>
      </div>
      <div class="doc-info">
        <div class="title-row">
          <span class="doc-name" :title="title">{{ title }}</span>
          <div class="cloud-tip">
            <template v-if="isViewMode">
              <EyeOutlined class="cloud-icon" style="color:#909399" />
              <span class="cloud-text">{{ translate('common.readOnlyMode') }}</span>
            </template>
            <template v-else>
              <CheckCircleOutlined v-if="lastSaveTime" class="cloud-icon" />
              <CloudOutlined v-else class="cloud-icon" />
              <span class="cloud-text">{{ lastSaveTime ? translate('common.recentSaved', { time: lastSaveTime }) : translate('common.autoSaved') }}</span>
            </template>
          </div>
        </div>
      </div>
    </div>
    <div class="right">
      <a-avatar-group v-if="onlineUsers.length > 0" :maxCount="5" :style="{ display: 'flex', alignItems: 'center' }">
        <a-tooltip v-for="user in onlineUsers" :key="user.userId" :title="user.userName || user.userId" placement="bottom">
          <a-avatar :size="30" :style="{ backgroundColor: user.color }">
            {{ getAvatarText(user.userName || user.userId) }}
          </a-avatar>
        </a-tooltip>
      </a-avatar-group>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CheckCircleOutlined, CloudOutlined, EyeOutlined } from '@ant-design/icons-vue'

interface CollabUser {
  userId: string
  userName: string
  color: string
}

type Translate = (key: string, params?: Record<string, string | number>) => string

const props = withDefaults(defineProps<{
  docType: 'word' | 'excel' | 'ppt'
  title: string
  isViewMode?: boolean
  lastSaveTime?: string
  onlineUsers?: CollabUser[]
  t?: Translate
}>(), {
  isViewMode: false,
  lastSaveTime: '',
  onlineUsers: () => []
})

const translate: Translate = (key, params) => {
  if (typeof props.t === 'function') return props.t(key, params)
  if (key === 'common.readOnlyMode') return '只读模式'
  if (key === 'common.recentSaved') return `最近保存: ${params?.time ?? ''}`
  if (key === 'common.autoSaved') return '所有编辑内容将自动保存到云端'
  return key
}

const iconSymbol = computed(() => {
  if (props.docType === 'excel') return '#icon-excel'
  if (props.docType === 'ppt') return '#icon-ppt'
  return '#icon-word'
})

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
.top-header { height: 52px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; border-bottom: 1px solid #ebeef5; background: #fff; }
.left { min-width: 0; display: flex; align-items: center; gap: 12px; }
.doc-icon { display: inline-flex; align-items: center; justify-content: center; }
.file-icon { width: 30px; height: 30px; color: #606266; }
.doc-info { min-width: 0; }
.title-row { display: flex; align-items: center; gap: 8px; min-width: 0; }
.doc-name { max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 15px; font-weight: 600; color: #303133; }
.cloud-tip { display: inline-flex; align-items: center; gap: 6px; color: #909399; font-size: 12px; min-width: 0; }
.cloud-text { max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cloud-icon { font-size: 14px; }
.right { display: flex; align-items: center; justify-content: flex-end; min-width: 0; }
</style>
