<template>
  <div class="ribbon-group">
    <div class="ribbon-group-content">
      <slot />
    </div>
    <div class="ribbon-group-title">{{ title }}</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<style scoped>
.ribbon-group {
  display: flex;
  flex-direction: column;
  padding: 2px 8px;
  border-right: 1px solid var(--app-ribbon-border-soft, #e3e8f2);
  flex-shrink: 0;
}
.ribbon-group:last-child {
  border-right: none;
}
.ribbon-group-content {
  display: flex;
  align-items: center;
  align-content: center;
  gap: 2px;
  flex: 1;
  flex-wrap: wrap;
}
.ribbon-group-title {
  font-size: 10px;
  color: var(--app-ribbon-text-muted, #7a8191);
  text-align: center;
  margin-top: 2px;
  line-height: 1.2;
  user-select: none;
}
</style>
