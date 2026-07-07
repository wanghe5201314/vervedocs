<template>
  <div class="catalog-sidebar" :class="{ open: catalogOpen }">
    <div class="catalog-sidebar-inner">
      <div class="catalog-header">
        <h3>目录</h3>
        <button class="catalog-close" title="关闭目录" @click="$emit('toggle')">
          <span class="material-icons" style="font-size: 18px;">close</span>
        </button>
      </div>
      <div class="catalog-tree">
        <div v-if="!flatCatalog.length" class="catalog-empty">暂无目录</div>
        <div
          v-for="item in flatCatalog"
          :key="`${item.id || item.name}-${item.level}`"
          class="catalog-node"
          :class="`level-${item.level}`"
          :title="item.name"
          @click="$emit('catalogClick', item.id)"
        >
          {{ item.name }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface FlatCatalogItem {
  id?: string
  name: string
  level: number
}

defineProps<{
  catalogOpen: boolean
  flatCatalog: FlatCatalogItem[]
}>()

defineEmits<{
  toggle: []
  catalogClick: [id?: string]
}>()
</script>