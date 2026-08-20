<template>
  <div class="catalog" editor-component="catalog">
    <div class="catalog-header">
      <div class="catalog-title">
        <MenuFoldOutlined v-if="activeTab === 'catalog'" />
        <FolderOutlined v-else />
        <span>{{ activeTab === 'catalog' ? '目录' : '章节' }}</span>
      </div>
      <div class="catalog-close" @click="toggleVisibility" title="关闭">
        <CloseOutlined />
      </div>
    </div>

    <div class="catalog-content">
      <div v-if="activeTab === 'catalog'" class="tab-pane">
        <a-empty v-if="treeData.length === 0" description="暂无目录数据" />
        <a-tree
          ref="treeRef"
          v-else
          :tree-data="treeData"
          :field-names="{ children: 'children', title: 'label', key: 'id' }"
          :default-expand-all="true"
          v-model:expandedKeys="expandedKeys"
          class="catalog-tree"
          @select="handleNodeSelect"
        >
          <template #title="{ dataRef }">
            <div class="tree-node-content">
              <span :class="`tree-node-level-${dataRef.level}`">{{ dataRef.label }}</span>
            </div>
          </template>
        </a-tree>
      </div>
      <div v-else class="tab-pane">
        <div class="section-container">
          <div class="section-header">
            <CaretDownOutlined class="arrow-icon" />
            <span class="section-title">第 1 节：未命名</span>
            <MoreOutlined class="more-icon" />
          </div>
          <div class="page-list">
            <div v-for="(image, index) in pageThumbnails" :key="index" class="page-item" @click="handlePageClick(index)">
              <div class="page-thumbnail">
                <img :src="image" alt="page thumbnail" />
              </div>
              <div class="page-number">{{ index + 1 }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { MenuFoldOutlined, FolderOutlined, CloseOutlined, CaretDownOutlined, MoreOutlined } from '@ant-design/icons-vue'

type TitleLevel = 'first' | 'second' | 'third' | 'fourth' | 'fifth' | 'sixth'

interface CatalogItem {
  id?: string
  name?: string
  level?: TitleLevel | number
  subCatalog?: CatalogItem[]
}

interface TreeNode {
  id: string
  label: string
  level: number
  children?: TreeNode[]
}

const emit = defineEmits(['command'])

const activeTab = ref('catalog')
const pageThumbnails = ref<string[]>([])

const treeData = ref<any[]>([])

const treeRef = ref()

const expandedKeys = ref<string[]>([])

watch(activeTab, (newTab) => {
  if (newTab === 'section') {
    emit('command', 'refreshThumbnails')
  }
})

const handleNodeSelect = (selectedKeys: any[]) => {
  if (selectedKeys.length > 0) {
    emit('command', 'locationCatalog', String(selectedKeys[0]))
  }
}

const handlePageClick = (index: number) => {
  emit('command', 'pageJump', index)
}

const toggleVisibility = () => {
  emit('command', 'toggleCatalog')
}

const switchToCatalogTab = () => {
  activeTab.value = 'catalog'
}

const switchToSectionTab = () => {
  activeTab.value = 'section'
  emit('command', 'refreshThumbnails')
}

const levelMap: Record<TitleLevel, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6
}

const normalizeLevel = (level?: TitleLevel | number) => {
  if (typeof level === 'number' && Number.isFinite(level)) {
    return Math.min(Math.max(Math.trunc(level), 1), 6)
  }
  if (level && level in levelMap) {
    return levelMap[level]
  }
  return 1
}

const buildTree = (catalogItems: CatalogItem[]): TreeNode[] => {
  if (!Array.isArray(catalogItems) || catalogItems.length === 0) return []
  return catalogItems.flatMap(item => {
    if (!item?.id || !item?.name?.trim()) return []
    const children = buildTree(item.subCatalog || [])
    const node: TreeNode = {
      id: item.id,
      label: item.name.trim(),
      level: normalizeLevel(item.level),
      children
    }
    return [node]
  })
}

defineExpose({
  updateCatalog: (newCatalog: CatalogItem[] | null | undefined) => {
    treeData.value = buildTree(newCatalog || [])
    nextTick(() => {
      const getAllNodeIds = (nodes: TreeNode[]): string[] => {
        let ids: string[] = []
        nodes.forEach(node => {
          ids.push(node.id)
          if (node.children && node.children.length > 0) {
            ids = ids.concat(getAllNodeIds(node.children))
          }
        })
        return ids
      }

      expandedKeys.value = getAllNodeIds(treeData.value)
    })
  },
  updateThumbnails: (images: string[]) => {
    pageThumbnails.value = images
  },
  switchToCatalogTab,
  switchToSectionTab
})
</script>

<style scoped>
.catalog {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  padding: 0 10px 10px 10px;
  background-color: #f2f4f7;
  border-right: 1px solid gainsboro;
}

.catalog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0;
  height: 40px;
  border-bottom: 1px solid #e2e6ed;
}

.catalog-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  height: 40px;
  flex: 1;
}

.catalog-close {
  color: #909399;
  cursor: pointer;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
  margin-left: 8px;
}

.catalog-close:hover {
  background-color: #f5f7fa;
  color: #ff4d4f;
}

.catalog-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 4px;
}

.catalog-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.catalog-item {
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: #303133;
  transition: all 0.2s;
}

.catalog-item:hover {
  background-color: #f0f2f5;
  color: #1890ff;
}

.catalog-tree {
  background: #f2f4f7 !important;
}
.catalog-tree :deep(.ant-tree-treenode) {
  background: #f2f4f7 !important;
}
.catalog-tree :deep(.ant-tree-node-content-wrapper) {
  height: 32px;
  background: #f2f4f7 !important;
}
.catalog-tree :deep(.ant-tree-node-content-wrapper:hover) {
  background: #f0f2f5 !important;
}
.catalog-tree :deep(.ant-tree-node-content-wrapper.ant-tree-node-selected) {
  background: #e6f7ff !important;
}

.catalog-tree :deep(.ant-tree-title) {
  width: 100%;
  display: inline-block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tree-node-content {
  width: 100%;
  display: flex;
  align-items: center;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 4px;
}

.tree-node-content::-webkit-scrollbar {
  height: 6px;
}

.tree-node-content::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.tree-node-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.tree-node-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.tree-node-content span {
  white-space: nowrap;
  flex-shrink: 0;
}

.tree-node-level-1 {
  font-weight: 500;
  font-size: 13px;
  color: #303133;
  white-space: nowrap;
}

.tree-node-level-2 {
  font-weight: 500;
  font-size: 13px;
  margin-left: 10px;
  white-space: nowrap;
}

.tree-node-level-3 {
  font-weight: 500;
  font-size: 13px;
  margin-left: 20px;
  white-space: nowrap;
}

.tree-node-level-4 {
  font-weight: 500;
  font-size: 13px;
  margin-left: 30px;
  white-space: nowrap;
}

.tree-node-level-5 {
  font-weight: 500;
  font-size: 13px;
  margin-left: 40px;
  white-space: nowrap;
}

.tree-node-level-6 {
  font-weight: 500;
  font-size: 13px;
  margin-left: 50px;
  white-space: nowrap;
}

.section-container {
  display: flex;
  flex-direction: column;
}

.section-header {
  display: flex;
  align-items: center;
  padding: 8px 0;
  cursor: pointer;
}

.arrow-icon {
  color: #1890ff;
  margin-right: 4px;
}

.section-title {
  flex: 1;
  font-size: 14px;
  font-weight: bold;
  color: #1890ff;
}

.more-icon {
  color: #909399;
  font-size: 12px;
}

.page-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 16px 0;
}

.page-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  width: 100%;
}

.page-thumbnail {
  width: 180px;
  background-color: #fff;
  border: 1px solid #d9d9d9;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  padding: 4px;
  transition: transform 0.2s;
}

.page-item:hover .page-thumbnail {
  transform: translateY(-2px);
  border-color: #1890ff;
}

.page-thumbnail img {
  width: 100%;
  height: auto;
  display: block;
}

.page-number {
  margin-top: 8px;
  font-size: 12px;
  color: #595959;
}
</style>

<style>
.catalog-tree,
.catalog-tree .ant-tree-list,
.catalog-tree .ant-tree-list-holder,
.catalog-tree .ant-tree-list-holder-inner,
.catalog-tree .ant-tree-treenode,
.catalog-tree .ant-tree-node-content-wrapper {
  background: #f2f4f7 !important;
}
</style>
