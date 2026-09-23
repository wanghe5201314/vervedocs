<template>
  <div class="top-header">
    <div class="left-actions">
      <button class="quick-btn" :title="t('topHeader.import')" @click="emit('command', 'import')">
        <VdIcon name="file-outline" />
      </button>
      <button class="quick-btn" :title="t('topHeader.save')" @click="emit('command', 'save')">
        <VdIcon name="content-save-outline" />
      </button>
      <button class="quick-btn" :title="t('topHeader.undo')" @click="emit('command', 'undo')">
        <VdIcon name="undo" />
      </button>
      <button class="quick-btn" :title="t('topHeader.redo')" @click="emit('command', 'redo')">
        <VdIcon name="redo" />
      </button>
    </div>
    <div class="center-title">
      <span class="doc-name" :title="title">{{ title }}</span>
      <div class="doc-status">
        <template v-if="isViewMode">
          <EyeOutlined class="status-icon" />
          <span>{{ t('topHeader.readonlyMode') }}</span>
        </template>
        <template v-else>
          <CheckCircleOutlined v-if="lastSaveTime" class="status-icon" />
          <CloudOutlined v-else class="status-icon" />
          <span>{{ lastSaveTime ? t('topHeader.saved', { time: lastSaveTime }) : t('topHeader.saving') }}</span>
        </template>
      </div>
    </div>
    <div class="right-actions">

      <a-avatar-group v-if="onlineUsers.length > 0" :max-count="5" :style="{ display: 'flex', alignItems: 'center' }">
        <a-tooltip v-for="user in onlineUsers" :key="user.userId" placement="bottom">
          <template #title>{{ user.userName || user.userId }}</template>
          <a-avatar :size="26" :style="{ backgroundColor: user.color }">
            {{ getAvatarText(user.userName || user.userId) }}
          </a-avatar>
        </a-tooltip>
      </a-avatar-group>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CheckCircleOutlined, CloudOutlined, EyeOutlined } from '@ant-design/icons-vue'
import { VdIcon } from '@vervedoc/ui'
import { getAvatarText } from '@/utils'
import type { CollabUser } from '@/types/collab'
import { t } from '@/i18n'

const emit = defineEmits<{
  (e: 'command', command: string): void
}>()

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

</script>

<style scoped>
.top-header {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  background: var(--vd-ribbon-topbar-bg, var(--tabs-bg-color, #1f57b8));
  color: var(--vd-ribbon-topbar-text, #fff);
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
  color: var(--vd-ribbon-topbar-text, #fff);
}
.doc-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--vd-ribbon-topbar-text-muted, rgba(255, 255, 255, 0.86));
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
  color: var(--vd-ribbon-topbar-text, #fff);
  cursor: pointer;
}
.quick-btn:hover {
  background: var(--vd-ribbon-topbar-hover, rgba(255, 255, 255, 0.16));
}
.quick-btn :deep(svg),
.quick-btn :deep(i) {
  font-size: 16px;
}
</style>
