<template>
  <div class="mobile-catalog-overlay" :class="{ show: tocOpen }" @click="$emit('toggle')"></div>
  <div class="mobile-catalog-drawer" :class="{ open: tocOpen }">
    <div class="catalog-sidebar-inner">
      <div class="catalog-header">
        <h3>目录</h3>
        <button class="catalog-close" title="关闭目录" @click="$emit('toggle')">
          <span class="material-icons" style="font-size: 18px;">close</span>
        </button>
      </div>
      <div class="catalog-tree">
        <div v-if="!flatToc.length" class="catalog-empty">暂无目录</div>
        <div
          v-for="item in flatToc"
          :key="`${item.id || item.name}-${item.level}`"
          class="catalog-node"
          :class="`level-${item.level}`"
          :title="item.name"
          @click="$emit('tocClick', item.id)"
        >
          {{ item.name }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface FlatTocItem {
  id?: string
  name: string
  level: number
}

defineProps<{
  tocOpen: boolean
  flatToc: FlatTocItem[]
}>()

defineEmits<{
  toggle: []
  tocClick: [id?: string]
}>()
</script>