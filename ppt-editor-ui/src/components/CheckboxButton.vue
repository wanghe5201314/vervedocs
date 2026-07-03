<template>
  <button class="checkbox-button" :class="{ 'checked': checked }">
    <slot></slot>
  </button>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'checkbox-button',
  props: {
    checked: {
      type: Boolean,
      default: false,
    },
  },
})
</script>

<style  scoped>
.checkbox-button {
  outline: 0;
  background-color: #fff;
  border: 1px solid #d9d9d9;
  font-size: 13px;
  padding: 0 15px;
  height: 32px;
  text-align: center;
  cursor: pointer;

  &:hover {
    color: #1a73e8;
  }

  &.checked {
    color: #fff;
    background-color: #1a73e8;
    border-color: #1a73e8;

    &:hover {
      background: rgba($color: #1a73e8, $alpha: .9);
      border-color: rgba($color: #1a73e8, $alpha: .9);
    }
  }
}
</style>