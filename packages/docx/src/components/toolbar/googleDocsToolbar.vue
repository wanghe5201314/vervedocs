<template>
  <div class="gdocs-toolbar" :class="{ 'is-readonly': isLocked }">
    <MenuBar
      :is-locked="isLocked"
      :document-name="documentName"
      :document-stats="documentStats"
      :revision-count="revisionCount"
      :toc-visible="tocVisible"

      :toolbar-visible="toolbarVisible"
      :bottom-nav-visible="bottomNavVisible"
      :show-collaboration-menu="showCollaborationMenu"
      :cursor-collaboration-enabled="cursorCollaborationEnabled"
      :selection-collaboration-enabled="selectionCollaborationEnabled"
      @command="handleRibbonCommand"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import MenuBar from './menuBar.vue'

const emit = defineEmits(['command'])

const props = defineProps<{
  isLocked?: boolean
  documentName?: string
  documentStats?: {
    totalPages: number
    wordCount: number
    paragraphCount: number
    charCount: number
    charCountWithSpaces: number
  }
  revisionCount?: number
  tocVisible?: boolean

  toolbarVisible?: boolean
  bottomNavVisible?: boolean
  showCollaborationMenu?: boolean
  cursorCollaborationEnabled?: boolean
  selectionCollaborationEnabled?: boolean
}>()

/** 是否正在导入文档 */
const isImporting = ref(false)

/** 为工具栏弹出层节点标记 editor-component 属性，便于测试与样式隔离 */
const markToolbarOverlayNodes = () => {
  if (typeof document === 'undefined') return
  const overlaySelector = [
    '.gdocs-menu-popper',
    '.ant-menu-submenu-popup',
    '.ant-dropdown',
    '.ant-select-dropdown',
    '.ant-popover',
    '.ant-tooltip'
  ].join(', ')
  document.querySelectorAll<HTMLElement>(overlaySelector).forEach(node => {
    node.setAttribute('editor-component', 'toolbar-popup')
  })
}

/**
 * 判断快捷键目标是否为可编辑元素
 * @param target - 事件目标
 * @returns 是否为可编辑元素
 */
const isEditableShortcutTarget = (target: EventTarget | null) => {
  const el = target as HTMLElement | null
  if (!el) return false
  const tagName = el.tagName?.toLowerCase()
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true
  }
  if ((el as HTMLElement).isContentEditable) {
    return true
  }
  return !!el.closest?.('[contenteditable="true"], input, textarea, select')
}

/**
 * 处理全局快捷键：Ctrl+Alt+O 触发导入
 * @param evt - 键盘事件
 */
const handleGlobalShortcut = (evt: KeyboardEvent) => {
  if (props.isLocked || isImporting.value) return
  if (!(evt.ctrlKey || evt.metaKey) || evt.shiftKey || !evt.altKey) return
  if (isEditableShortcutTarget(evt.target)) return
  if (evt.key.toLowerCase() !== 'o') return
  evt.preventDefault()
  emit('command', 'import')
}

/** DOM 变更观察者，用于监听弹出层节点出现并标记属性 */
let toolbarOverlayObserver: MutationObserver | null = null

/** 挂载时标记弹出层节点、注册快捷键监听并启动 DOM 观察 */
onMounted(() => {
  markToolbarOverlayNodes()
  document.addEventListener('keydown', handleGlobalShortcut)
  if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return
  toolbarOverlayObserver = new MutationObserver(() => {
    markToolbarOverlayNodes()
  })
  toolbarOverlayObserver.observe(document.body, {
    childList: true,
    subtree: true
  })
})

/** 卸载前移除快捷键监听并断开 DOM 观察 */
onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleGlobalShortcut)
  toolbarOverlayObserver?.disconnect()
  toolbarOverlayObserver = null
})

/**
 * 处理 Ribbon 命令并转发
 * @param cmd - 命令名称
 * @param args - 命令参数
 */
const handleRibbonCommand = (cmd: string, ...args: any[]) => {
  if (args.length > 0) emit('command', cmd, ...args)
  else emit('command', cmd)
}
</script>

<style scoped>
.gdocs-toolbar { background: #fff; }
.gdocs-toolbar.is-readonly { pointer-events: none; opacity: 0.6; }
</style>
