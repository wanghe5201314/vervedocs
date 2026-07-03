<template>
  <div class="checkbox-button-group">
    <slot></slot>
  </div>
</template>

<script lang="ts">
export default {
  name: 'checkbox-button-group',
}
</script>

<style  scoped>
.checkbox-button-group {
  display: flex;
  align-items: center;

  ::v-deep(.checkbox-button) {
    border-radius: 0;
    border-left-width: 0;
    border-right-width: 0;
    display: inline-block;

    & + .checkbox-button {
      border-left-width: 1px;
    }

    &:first-child {
      border-top-left-radius: 2px;
      border-bottom-left-radius: 2px;
      border-left-width: 1px;
    }

    &:last-child {
      border-top-right-radius: 2px;
      border-bottom-right-radius: 2px;
      border-right-width: 1px;
    }
  }
}
</style>