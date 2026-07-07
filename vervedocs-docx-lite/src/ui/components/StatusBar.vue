<template>
  <div class="status-bar">
    <div class="status-left">
      <label class="catalog-toggle-label">
        <input
          type="checkbox"
          :checked="catalogOpen"
          @change="$emit('catalogToggle', ($event.target as HTMLInputElement).checked)"
        />
        <span>显示导航窗格</span>
      </label>
      <span class="status-divider"></span>
      <span>{{ statusWordsText }}</span>
      <span class="status-divider"></span>
      <span>{{ statusPageText }}</span>
      <span class="status-divider"></span>
      <button class="status-btn" @click="$emit('togglePaperDirection')">{{ paperDirectionText }}</button>
      <span class="status-divider"></span>
      <div class="paper-size-wrap">
        <button class="status-btn" @click.stop="$emit('togglePaperSizeMenu')">{{ selectedPaperSizeLabel }}</button>
        <div class="paper-size-dropdown" :class="{ show: paperSizeMenuOpen }">
          <div
            v-for="(paperSize, index) in paperSizes"
            :key="paperSize.label"
            class="paper-size-item"
            :class="{ active: index === selectedPaperSizeIndex }"
            @click.stop="$emit('setPaperSize', index)"
          >
            {{ paperSize.label }}
          </div>
        </div>
      </div>
    </div>
    <div class="status-right">
      <button class="toolbar-btn status-btn status-icon-btn" title="缩小" @click="$emit('command', 'executePageScaleMinus')"><span class="material-icons">remove</span></button>
      <span class="zoom-display">{{ zoomText }}</span>
      <button class="toolbar-btn status-btn status-icon-btn" title="放大" @click="$emit('command', 'executePageScaleAdd')"><span class="material-icons">add</span></button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface PaperSizePreset {
  label: string
  width: number
  height: number
}

defineProps<{
  catalogOpen: boolean
  statusWordsText: string
  statusPageText: string
  paperDirectionText: string
  selectedPaperSizeLabel: string
  selectedPaperSizeIndex: number
  paperSizeMenuOpen: boolean
  paperSizes: PaperSizePreset[]
  zoomText: string
}>()

defineEmits<{
  catalogToggle: [checked: boolean]
  togglePaperDirection: []
  togglePaperSizeMenu: []
  setPaperSize: [index: number]
  command: [command: string, ...args: any[]]
}>()
</script>