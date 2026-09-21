<template>
  <div class="vd-ribbon-group">
    <div class="vd-ribbon-group__content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>

<style lang="scss">
.vd-ribbon-group {
  display: flex;
  flex-direction: column;
  padding: 2px 8px;
  flex-shrink: 0;
  position: relative;

  &:not(:last-child)::after {
    content: '';
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    height: 60%;
    border-right: 1px solid #c2c2c2;
  }

  &__content {
    display: flex;
    align-items: center;
    align-content: center;
    gap: 2px;
    flex: 1;
    flex-wrap: wrap;
  }
}
</style>
