<template>
  <div class="catalog" editor-component="catalog">
    <div class="catalog-header">
      <div class="catalog-title">
        <MenuFoldOutlined v-if="activeTab === 'toc'" />
        <FolderOutlined v-else />
        <span>{{ activeTab === 'toc' ? t('sidebar.toc.toc') : t('sidebar.toc.section') }}</span>
      </div>
      <div class="catalog-close" @click="toggleVisibility" :title="t('common.close')">
        <CloseOutlined />
      </div>
    </div>

    <div class="catalog-content">
      <div v-if="activeTab === 'toc'" class="tab-pane">
        <VdTree
          :nodes="treeNodes"
          :selected-key="selectedKey"
          :empty-text="t('sidebar.toc.noData')"
          @select="handleNodeSelect"
        />
      </div>
      <div v-else class="tab-pane">
        <div class="section-container">
          <div class="section-header">
            <CaretDownOutlined class="arrow-icon" />
            <span class="section-title">{{ t('sidebar.toc.sectionN', { n: 1 }) }}</span>
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
import { VdTree, buildTreeFromFlat, type VdTreeNode } from '@vervedoc/ui'
import { TITLE_LEVEL } from '@vervedoc/core'
import type { TitleLevel, IAutoTocItem } from '@vervedoc/core'
import type { IEditorTocNavApi } from '@/composables/use-editor-toc-nav'
import { t } from '@/i18n'

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
 * 将扁平目录项转换为 buildTreeFromFlat 输入格式
 * @param item - 目录项
 * @returns 扁平节点
 */
const toFlatNode = (item: IAutoTocItem) => ({
  id: item.id,
  name: item.name,
  level: normalizeLevel(item.level),
  number: item.number
})

/** 树形节点数据，由扁平目录列表构建而来 */
const treeNodes = computed<VdTreeNode[]>(() =>
  buildTreeFromFlat(props.tocNavAPI.tocList.value.map(toFlatNode))
)

/** 当前选中节点 key，由目录选中 ID 派生 */
const selectedKey = computed(() => props.tocNavAPI.selectedId.value || undefined)

/**
 * 处理树节点选择，定位到对应目录
 * @param key - 选中的节点 key
 */
const handleNodeSelect = (key: string) => {
  props.tocNavAPI.locate(key)
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

.tab-pane {
  height: 100%;
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
