<template>
  <a-button class="color-btn">
    <div class="color-block">
      <div class="content" :style="{ backgroundColor: color }"></div>
    </div>
    <IconPlatte class="color-btn-icon" />
  </a-button>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'color-button',
  props: {
    color: {
      type: String,
      required: true,
    },
  },
})
</script>

<style scoped>
.color-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px !important;
  height: 32px;
  border-radius: 4px;
  border: 1px solid #dadce0;
  background: #fff;
  transition: all 0.2s;
}
.color-btn:hover {
  border-color: #1a73e8;
  background: #f8f9fa;
}
.color-block {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAAXNSR0IArs4c6QAAAEBJREFUOE9jfPbs2X8GIoCkpCQRqhgYGEcNxBlOo2GIM2iGQLL5//8/UTnl+fPnxOWUUQNxhtNoGOLOKYM+2QAAh2Nq10DwkukAAAAASUVORK5CYII=);
  background-size: 8px 8px;
}
.content {
  width: 100%;
  height: 100%;
}
.color-btn-icon {
  width: 20px;
  font-size: 14px;
  margin-left: 6px;
  color: #5f6368;
}
</style>