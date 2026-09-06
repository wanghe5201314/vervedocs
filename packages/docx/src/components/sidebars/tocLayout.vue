<template>
  <div class="catalog" editor-component="catalog">
    <div class="catalog-header">
      <div class="catalog-title">
        <MenuFoldOutlined v-if="activeTab === 'toc'" />
        <FolderOutlined v-else />
        <span>{{ activeTab === 'toc' ? '目录' : '章节' }}</span>
      </div>
      <div class="catalog-close" @click="toggleVisibility" title="关闭">
        <CloseOutlined />
      </div>
    </div>

    <div class="catalog-content">
      <div v-if="activeTab === 'toc'" class="tab-pane">
        <a-empty v-if="treeData.length === 0" description="暂无目录数据" />
        <a-tree
          v-else
          :tree-data="treeData"
          :field-names="{ children: 'children', title: 'label', key: 'id' }"
          :default-expand-all="true"
          :expandedKeys="expandedKeys"
          :selectedKeys="selectedKeys"
          class="catalog-tree"
          @select="handleNodeSelect"
        >
          <template #title="{ dataRef }">
            <div
              class="tree-node-content"
              :class="{ active: selectedKeys.includes(dataRef.id) }"
              :title="dataRef.label"
            >
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
import { computed } from 'vue'
import { MenuFoldOutlined, FolderOutlined, CloseOutlined, CaretDownOutlined, MoreOutlined } from '@ant-design/icons-vue'
import { TITLE_LEVEL } from '@vervedoc/core'
import type { TitleLevel, IAutoTocItem } from '@vervedoc/core'
import type { IEditorTocNavApi } from '@/composables/use-editor-toc-nav'

interface TreeNode {
  key: string
  id: string
  label: string
  level: number
  children?: TreeNode[]
}

const props = defineProps<{
  tocNavAPI: IEditorTocNavApi
}>()

/** 当前激活的标签页（目录或章节） */
const activeTab = computed(() => props.tocNavAPI.activeTab.value)
/** 页面缩略图列表 */
const pageThumbnails = computed(() => props.tocNavAPI.thumbnails.value)
/** 标题级别到数字层级的映射 */
const levelMap: Record<TitleLevel, number> = {
  [TITLE_LEVEL.FIRST]: 1,
  [TITLE_LEVEL.SECOND]: 2,
  [TITLE_LEVEL.THIRD]: 3,
  [TITLE_LEVEL.FOURTH]: 4,
  [TITLE_LEVEL.FIFTH]: 5,
  [TITLE_LEVEL.SIXTH]: 6
}
/**
 * 规范化标题层级为 1-6 的数字
 * @param level - 原始层级，可为数字或字符串
 * @returns 规范化后的层级数字
 */
const normalizeLevel = (level?: TitleLevel | number) => {
  if (typeof level === 'number' && Number.isFinite(level)) {
    return Math.min(Math.max(Math.trunc(level), 1), 6)
  }
  if (typeof level === 'string' && level in levelMap) {
    return levelMap[level as TitleLevel]
  }
  return 1
}
/**
 * 将扁平目录项列表基于 level 构建为树形结构，编号作为标签前缀
 * @param tocItems - 目录项数组（扁平列表）
 * @returns 树形节点数组
 */
const buildTree = (tocItems: IAutoTocItem[]): TreeNode[] => {
  if (!Array.isArray(tocItems) || tocItems.length === 0) return []
  const roots: TreeNode[] = []
  const stack: TreeNode[] = []
  for (const item of tocItems) {
    if (!item?.id || !item?.name?.trim()) continue
    const level = normalizeLevel(item.level)
    const trimmedName = item.name.trim()
    const trimmedNumber = item.number?.trim()
    const label = trimmedNumber ? `${trimmedNumber} ${trimmedName}` : trimmedName
    const node: TreeNode = { key: item.id, id: item.id, label, level, children: [] }
    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop()
    }
    if (stack.length === 0) {
      roots.push(node)
    } else {
      stack[stack.length - 1].children!.push(node)
    }
    stack.push(node)
  }
  return roots
}
/** 树形数据，由目录列表构建而来 */
const treeData = computed(() => buildTree(props.tocNavAPI.tocList.value))
/**
 * 递归收集所有树节点的 ID
 * @param nodes - 树节点数组
 * @returns 所有节点 ID 的一维数组
 */
const collectNodeIds = (nodes: TreeNode[]): string[] => {
  return nodes.flatMap(node => [
    node.id,
    ...(node.children?.length ? collectNodeIds(node.children) : [])
  ])
}
/** 展开键集合，默认展开全部节点 */
const expandedKeys = computed(() => collectNodeIds(treeData.value))
/** 选中键集合，由当前选中目录 ID 派生 */
const selectedKeys = computed(() =>
  props.tocNavAPI.selectedId.value ? [props.tocNavAPI.selectedId.value] : []
)

/**
 * 处理树节点选择，定位到对应目录
 * @param keys - 选中的节点键数组
 */
const handleNodeSelect = (keys: any[]) => {

  if (keys.length > 0) {
    props.tocNavAPI.locate(String(keys[0]))
  }
}

/**
 * 处理页面缩略图点击，跳转到对应页
 * @param index - 页面索引
 */
const handlePageClick = (index: number) => {
  props.tocNavAPI.pageJump(index)
}

/** 切换面板可见性，关闭目录面板 */
const toggleVisibility = () => {
  props.tocNavAPI.close()
}
</script>

<style scoped>
.catalog {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  padding: 0 8px 8px;
  background-color: #f1f1f1;
  border-right: 1px solid #f1f1f1;
}

.catalog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0;
  height: 34px;
  border-bottom: 1px solid #f1f1f1;
}

.catalog-title {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  height: 34px;
  flex: 1;
}

.catalog-close {
  color: #909399;
  cursor: pointer;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
  margin-left: 6px;
}

.catalog-close:hover {
  background-color: #f5f7fa;
  color: #ff4d4f;
}

.catalog-content {
  flex: 1;
  overflow-y: auto;
  padding: 6px 2px 2px;
}


.catalog-tree {
  background: #f1f1f1 !important;
  font-size: 12px;
}
.catalog-tree :deep(.ant-tree-treenode) {
  background: #f1f1f1 !important;
  min-height: 24px;
  padding: 0;
}
.catalog-tree :deep(.ant-tree-indent-unit) {
  width: 12px;
}
.catalog-tree :deep(.ant-tree-switcher) {
  width: 0 !important;
  min-width: 0 !important;
  line-height: 24px;
  overflow: hidden;
}
.catalog-tree :deep(.ant-tree-node-content-wrapper) {
  height: 24px;
  line-height: 24px;
  padding: 0 4px 0 2px !important;
  border-radius: 4px;
  background: #f1f1f1 !important;
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
}

.tree-node-content {
  width: 100%;
  display: flex;
  align-items: center;
  min-width: 0;
  overflow: hidden;
  border-radius: 4px;
  padding: 0 4px 0 2px;
  transition: background-color 0.15s ease;
}

.tree-node-content.active {
  background: #dceeff;
}

.tree-node-content span {
  display: inline-block;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-node-level-1 {
  font-weight: 500;
  font-size: 12px;
  color: #303133;
}

.tree-node-level-2 {
  font-weight: 500;
  font-size: 12px;
}

.tree-node-level-3 {
  font-weight: 500;
  font-size: 12px;
}

.tree-node-level-4 {
  font-weight: 500;
  font-size: 12px;
}

.tree-node-level-5 {
  font-weight: 500;
  font-size: 12px;
}

.tree-node-level-6 {
  font-weight: 500;
  font-size: 12px;
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
  background: #f1f1f1 !important;
}
</style>
