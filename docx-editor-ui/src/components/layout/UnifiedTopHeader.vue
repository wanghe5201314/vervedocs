<template>
  <div class="top-header">
    <div class="left">
      <div class="doc-icon">
        <svg class="file-icon" aria-hidden="true">
          <use xlink:href="#icon-word"></use>
        </svg>
      </div>
      <div class="doc-info">
        <div class="title-row">
          <span class="doc-name" :title="title">{{ title }}</span>
          <div class="cloud-tip">
            <template v-if="isViewMode">
              <el-icon class="cloud-icon" style="color:#909399"><View /></el-icon>
              <span class="cloud-text">只读模式</span>
            </template>
            <template v-else>
              <el-icon class="cloud-icon">
                <CircleCheck v-if="lastSaveTime" />
                <Cloudy v-else />
              </el-icon>
              <span class="cloud-text">{{ lastSaveTime ? `最近保存: ${lastSaveTime}` : '所有编辑内容将自动保存到云端' }}</span>
            </template>
          </div>
        </div>
      </div>
    </div>
    <div class="right">
      <el-avatar-group v-if="onlineUsers.length > 0" :max="5" :style="{ display: 'flex', alignItems: 'center' }">
        <el-tooltip v-for="user in onlineUsers" :key="user.userId" :content="user.userName || user.userId" placement="bottom" effect="light">
          <el-avatar :size="30" :style="{ backgroundColor: user.color }">
            {{ getAvatarText(user.userName || user.userId) }}
          </el-avatar>
        </el-tooltip>
      </el-avatar-group>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CircleCheck, Cloudy, View } from '@element-plus/icons-vue'

interface CollabUser {
  userId: string
  userName: string
  color: string
}

withDefaults(defineProps<{
  title: string
  isViewMode?: boolean
  lastSaveTime?: string
  onlineUsers?: CollabUser[]
}>(), {
  isViewMode: false,
  lastSaveTime: '',
  onlineUsers: () => []
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
.doc-name { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 15px; font-weight: 600; color: #303133; }
.cloud-tip { display: inline-flex; align-items: center; gap: 6px; color: #909399; font-size: 12px; min-width: 0; }
.cloud-text { max-width: 360px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cloud-icon { font-size: 14px; }
.right { display: flex; align-items: center; justify-content: flex-end; min-width: 0; }
</style>
