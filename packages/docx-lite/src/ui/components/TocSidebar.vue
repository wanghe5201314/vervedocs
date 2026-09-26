<template>
  <div class="catalog-sidebar" :class="{ open: tocOpen }">
    <div class="catalog-sidebar-inner">
      <div class="catalog-header">
        <h3>目录</h3>
        <button class="catalog-close" title="关闭目录" @click="$emit('toggle')">
          <span class="material-icons" style="font-size: 18px;">close</span>
        </button>
      </div>
      <div class="catalog-tree">
        <VdTree
          :nodes="treeNodes"
          :selected-key="selectedKey"
          background="#fff"
          empty-text="暂无目录"
          @select="handleSelect"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { VdTree, buildTreeFromFlat, type VdTreeNode } from '@vervedoc/ui'

interface FlatTocItem {
  id?: string
  name: string
  level: number
}

const props = defineProps<{
  tocOpen: boolean
  flatToc: FlatTocItem[]
}>()

const emit = defineEmits<{
  toggle: []
  tocClick: [id?: string]
}>()

/** 由扁平目录构建树形节点，无 id 时用 name 兜底作 key */
const treeNodes = computed<VdTreeNode[]>(() =>
  buildTreeFromFlat(
    props.flatToc.map(item => ({
      id: item.id || item.name,
      name: item.name,
      level: item.level
    }))
  )
)

/** 处理节点选中，抛出 tocClick 事件 */
const selectedKey = ref<string | undefined>()
const handleSelect = (key: string) => {
  selectedKey.value = key
  emit('tocClick', key)
}
</script>
