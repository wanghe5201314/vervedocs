<template>
  <div class="catalog" editor-component="catalog">
    <div class="catalog-header">
      <div class="catalog-title">
        <el-icon v-if="activeTab === 'catalog'"><Fold /></el-icon>
        <el-icon v-else><Files /></el-icon>
        <span>{{ activeTab === 'catalog' ? '目录' : '章节' }}</span>
      </div>
      <div class="catalog-close" @click="toggleVisibility" title="关闭">
        <el-icon><Close /></el-icon>
      </div>
    </div>

    <div class="catalog-content">
      <div v-if="activeTab === 'catalog'" class="tab-pane">
        <el-empty v-if="treeData.length === 0" description="暂无目录数据" :image-size="100" />
        <el-tree
          ref="treeRef"
          v-else
          :data="treeData"
          :props="treeProps"
          :default-expand-all="true"
          :expand-on-click-node="false"
          :expanded-keys="expandedKeys"
          node-key="id"
          class="catalog-tree"
          @node-click="handleNodeClick"
        >
          <template #default="{ node, data }">
            <div class="tree-node-content">
              <span :class="`tree-node-level-${data.level}`">{{ node.label }}</span>
            </div>
          </template>
        </el-tree>
      </div>
      <div v-else class="tab-pane">
        <div class="section-container">
          <div class="section-header">
            <el-icon class="arrow-icon"><CaretBottom /></el-icon>
            <span class="section-title">第 1 节：未命名</span>
            <el-icon class="more-icon"><MoreFilled /></el-icon>
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
import { Fold, Files, Close, CaretBottom, MoreFilled } from '@element-plus/icons-vue'

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

// 事件触发
const emit = defineEmits(['command'])

const activeTab = ref('catalog')
const pageThumbnails = ref<string[]>([])

// 树形数据配置
const treeProps = {
  children: 'children',
  label: 'label'
}

// 树形目录数据
const treeData = ref<TreeNode[]>([])

// el-tree 组件引用
const treeRef = ref()

// 展开的节点 keys
const expandedKeys = ref<string[]>([])

// 监听选项卡切换，切换到章节时刷新缩略图
watch(activeTab, (newTab) => {
  if (newTab === 'section') {
    // 请求刷新缩略图
    emit('command', 'refreshThumbnails')
  }
})
// 处理树节点点击
const handleNodeClick = (data: TreeNode) => {
  emit('command', 'locationCatalog', data.id)
}

// 处理页面点击
const handlePageClick = (index: number) => {
  emit('command', 'pageJump', index)
}

// 切换目录可见性
const toggleVisibility = () => {
  emit('command', 'toggleCatalog')
}

const switchToCatalogTab = () => {
  activeTab.value = 'catalog'
}

// 切换到章节选项卡
const switchToSectionTab = () => {
  activeTab.value = 'section'
  // 直接触发刷新，因为watch可能在已经是section时不触发
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

// 目录数据本身已经是树结构，这里只做清洗与映射，避免再次重建层级导致错位
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

// 更新目录数据
defineExpose({
  updateCatalog: (newCatalog: CatalogItem[] | null | undefined) => {
    treeData.value = buildTree(newCatalog || [])
    // 确保所有节点都展开
    nextTick(() => {
      // 收集所有节点的 key
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
  color: #f56c6c;
}

.catalog-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
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
  color: #409eff;
}

/* 树形目录样式 */
.catalog-tree {
  :deep(.el-tree-node__content) {
    height: 32px;
  }

  :deep(.el-tree-node__label) {
    width: 100%;
    display: inline-block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  background-color: #f2f4f7;
}

.tree-node-content {
  width: 100%;
  display: flex;
  align-items: center;
  min-width: 0; /* 允许内容收缩 */
  overflow-x: auto; /* 启用横向滚动 */
  overflow-y: hidden; /* 隐藏纵向滚动 */
  padding-bottom: 4px;
}

/* 自定义横向滚动条样式 */
.tree-node-content::-webkit-scrollbar {
  height: 6px; /* 滚动条高度 */
}

.tree-node-content::-webkit-scrollbar-track {
  background: #f1f1f1; /* 滚动条轨道颜色 */
}

.tree-node-content::-webkit-scrollbar-thumb {
  background: #c1c1c1; /* 滚动条滑块颜色 */
  border-radius: 3px;
}

.tree-node-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8; /* 滚动条滑块悬停颜色 */
}

.tree-node-content span {
  white-space: nowrap;
  flex-shrink: 0; /* 防止文本被压缩 */
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

/* 章节缩略图样式 */
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
  color: #409eff;
  margin-right: 4px;
}

.section-title {
  flex: 1;
  font-size: 14px;
  font-weight: bold;
  color: #409eff;
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
  border: 1px solid #dcdfe6;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  padding: 4px;
  transition: transform 0.2s;
}

.page-item:hover .page-thumbnail {
  transform: translateY(-2px);
  border-color: #409eff;
}

.page-thumbnail img {
  width: 100%;
  height: auto;
  display: block;
}

.page-number {
  margin-top: 8px;
  font-size: 12px;
  color: #606266;
}
</style>
