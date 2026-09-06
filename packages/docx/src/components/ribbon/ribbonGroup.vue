<template>
  <div class="ribbon-group">
    <div class="ribbon-group-content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>

<style scoped>
.ribbon-group {
  display: flex;
  flex-direction: column;
  padding: 2px 8px;
  flex-shrink: 0;
  position: relative;
}
.ribbon-group:not(:last-child)::after {
  content: '';
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  height: 60%;
  border-right: 1px solid #C2C2C2;
}
.ribbon-group-content {
  display: flex;
  align-items: center;
  align-content: center;
  gap: 2px;
  flex: 1;
  flex-wrap: wrap;
}
</style>
