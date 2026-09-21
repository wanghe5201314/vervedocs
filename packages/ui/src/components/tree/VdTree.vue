<script setup lang="ts">
import { computed, ref } from 'vue'
import { ConfigProvider, Tree } from 'ant-design-vue'
import type { VdTreeNode } from './model'

const props = withDefaults(defineProps<{
  nodes: VdTreeNode[]
  selectedKey?: string
  emptyText?: string
  background?: string
  fontSize?: number
}>(), { emptyText: '', background: '#f1f1f1', fontSize: 12 })
const emit = defineEmits<{ select: [key: string] }>()
const collapsedKeys = ref(new Set<string>())
interface TreeDataNode extends VdTreeNode {
  key: string
  children?: TreeDataNode[]
}
function toTreeData(nodes: VdTreeNode[]): TreeDataNode[] {
  return nodes.map(node => ({
    ...node,
    key: node.id,
    children: node.children ? toTreeData(node.children) : undefined
  }))
}
const treeData = computed(() => toTreeData(props.nodes))
const branchKeys = computed(() => {
  const keys: string[] = []
  const visit = (nodes: VdTreeNode[]) => {
    for (const node of nodes) {
      if (node.children?.length) {
        keys.push(node.id)
        visit(node.children)
      }
    }
  }
  visit(props.nodes)
  return keys
})
const expandedKeys = computed(() => branchKeys.value.filter(key => !collapsedKeys.value.has(key)))

function expand(keys: (string | number)[]) {
  const expanded = new Set(keys)
  collapsedKeys.value = new Set(branchKeys.value.filter(key => !expanded.has(key)))
}

function select(keys: (string | number)[]) {
  if (keys.length) emit('select', String(keys[0]))
}
</script>

<template>
  <ConfigProvider :theme="{ components: { Tree: { controlItemBgActive: '#7D858C' } } }">
  <Tree
    v-if="nodes.length"
    class="vd-tree"
    :root-style="{ backgroundColor: background, fontSize: `${fontSize}px` }"
    :tree-data="treeData"
    :field-names="{ key: 'key', title: 'name', children: 'children' }"
    :selected-keys="selectedKey === undefined ? [] : [selectedKey]"
    :expanded-keys="expandedKeys"
    :auto-expand-parent="false"
    block-node
    @expand="expand"
    @select="select"
  >
    <template #title="{ id, name, number }">
      <span :title="name" :style="{ color: id === selectedKey ? '#fff' : undefined }">{{ number ? `${number} ${name}` : name }}</span>
    </template>
  </Tree>
  <div v-else class="vd-tree__empty" :style="{ backgroundColor: background, fontSize: `${fontSize}px` }">{{ emptyText }}</div>
  </ConfigProvider>
</template>

<style scoped>
.vd-tree :deep(.ant-tree-node-content-wrapper) {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.vd-tree__empty {
  padding: 24px 8px;
  color: #909399;
  text-align: center;
}
</style>
