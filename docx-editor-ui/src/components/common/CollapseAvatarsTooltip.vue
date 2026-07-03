<template>
  <div class="collapse-avatars" @mouseenter="showTooltip = true" @mouseleave="showTooltip = false">
    <div class="avatar-stack">
      <div
        v-for="(user, i) in visibleUsers"
        :key="user.userId"
        class="avatar-item"
        :style="{
          backgroundColor: user.color,
          zIndex: max - i,
          marginLeft: i === 0 ? '0' : '-8px'
        }"
      >
        {{ getAvatarText(user.userName || user.userId) }}
      </div>
      <div
        v-if="overflowCount > 0"
        class="avatar-item avatar-overflow"
        :style="{
          zIndex: 0,
          marginLeft: visibleUsers.length === 0 ? '0' : '-8px'
        }"
      >
        +{{ overflowCount }}
      </div>
    </div>
    <Transition name="tooltip-fade">
      <div v-if="showTooltip && users.length > 0" class="avatar-tooltip">
        <div class="tooltip-title">在线协作者 ({{ users.length }})</div>
        <div class="tooltip-list">
          <div v-for="user in users" :key="user.userId" class="tooltip-user">
            <div class="tooltip-avatar" :style="{ backgroundColor: user.color }">
              {{ getAvatarText(user.userName || user.userId) }}
            </div>
            <span class="tooltip-name">{{ user.userName || user.userId }}</span>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

export interface CollabUser {
  userId: string
  userName: string
  color: string
}

const props = withDefaults(defineProps<{
  users: CollabUser[]
  max?: number
}>(), {
  max: 5
})

const showTooltip = ref(false)

const visibleUsers = computed(() => props.users.slice(0, props.max))
const overflowCount = computed(() => Math.max(0, props.users.length - props.max))

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
.collapse-avatars {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: default;
}

.avatar-stack {
  display: flex;
  align-items: center;
}

.avatar-item {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  border: 2px solid #fff;
  flex-shrink: 0;
  position: relative;
  transition: transform 0.15s ease;
}

.avatar-stack:hover .avatar-item {
  transform: translateX(2px);
}

.avatar-overflow {
  background-color: #909399;
  font-size: 11px;
}

.avatar-tooltip {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: #fff;
  border: 1px solid #e4e7ed;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  padding: 8px 0;
  min-width: 180px;
  max-width: 260px;
  z-index: 999;
}

.tooltip-title {
  padding: 0 12px 6px;
  font-size: 12px;
  color: #909399;
  border-bottom: 1px solid #ebeef5;
  margin-bottom: 4px;
}

.tooltip-list {
  max-height: 240px;
  overflow-y: auto;
}

.tooltip-user {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
}

.tooltip-user:hover {
  background: #f5f7fa;
}

.tooltip-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  color: #fff;
  flex-shrink: 0;
}

.tooltip-name {
  font-size: 13px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tooltip-fade-enter-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.tooltip-fade-leave-active {
  transition: opacity 0.1s ease, transform 0.1s ease;
}

.tooltip-fade-enter-from {
  opacity: 0;
  transform: translateY(-4px);
}

.tooltip-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>