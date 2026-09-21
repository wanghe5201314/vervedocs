<script setup lang="ts">
import type { CSSProperties } from 'vue'

withDefaults(defineProps<{
  title?: string
  extra?: string
  size?: 'default' | 'small'
  bordered?: boolean
  bodyStyle?: CSSProperties
  headStyle?: CSSProperties
}>(), {
  size: 'default',
  bordered: true
})
</script>

<template>
  <section class="vd-card" :class="[`vd-card--${size}`, { 'vd-card--bordered': bordered }]">
    <header v-if="title || extra || $slots.title || $slots.extra" class="vd-card__header" :style="headStyle">
      <div class="vd-card__title"><slot name="title">{{ title }}</slot></div>
      <div v-if="extra || $slots.extra" class="vd-card__extra"><slot name="extra">{{ extra }}</slot></div>
    </header>
    <div v-if="$slots.cover" class="vd-card__cover"><slot name="cover" /></div>
    <div class="vd-card__body" :style="bodyStyle"><slot /></div>
    <footer v-if="$slots.footer" class="vd-card__footer"><slot name="footer" /></footer>
  </section>
</template>

<style scoped>
.vd-card {
  min-width: 0;
  box-sizing: border-box;
  border-radius: 0;
  background: var(--vd-card-bg, #fff);
  color: #303133;
  font-size: 13px;
  overflow: hidden;
}
.vd-card--bordered {
  border: 1px solid var(--vd-card-border, #d9d9d9);
}
.vd-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: var(--vd-card-header-padding, 10px 14px);
  border-bottom: 1px solid var(--vd-card-border, #e5e5e5);
  background: var(--vd-card-header-bg, #f7f7f7);
}
.vd-card__title {
  min-width: 0;
  font-size: var(--vd-card-title-size, 13px);
  font-weight: 600;
}
.vd-card__extra {
  flex-shrink: 0;
}
.vd-card__body {
  padding: var(--vd-card-body-padding, 16px);
}
.vd-card--small .vd-card__body {
  padding: var(--vd-card-body-padding, 12px);
}
.vd-card__footer {
  padding: 10px 14px;
  border-top: 1px solid var(--vd-card-border, #e5e5e5);
}
</style>
