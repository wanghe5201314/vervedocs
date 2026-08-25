<template>
  <div class="gdocs-toolbar" :class="{ 'is-readonly': isLocked }">
    <MenuBar
      :is-locked="isLocked"
      :document-name="documentName"
      :document-stats="documentStats"
      :show-collaboration-menu="showCollaborationMenu"
      :cursor-collaboration-enabled="cursorCollaborationEnabled"
      :selection-collaboration-enabled="selectionCollaborationEnabled"
      @command="handleRibbonCommand"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import MenuBar from './MenuBar.vue'

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
  showCollaborationMenu?: boolean
  cursorCollaborationEnabled?: boolean
  selectionCollaborationEnabled?: boolean
}>()

const isImporting = ref(false)

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

const handleGlobalShortcut = (evt: KeyboardEvent) => {
  if (props.isLocked || isImporting.value) return
  if (!(evt.ctrlKey || evt.metaKey) || evt.shiftKey || !evt.altKey) return
  if (isEditableShortcutTarget(evt.target)) return
  if (evt.key.toLowerCase() !== 'o') return
  evt.preventDefault()
  emit('command', 'import')
}

let toolbarOverlayObserver: MutationObserver | null = null

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

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleGlobalShortcut)
  toolbarOverlayObserver?.disconnect()
  toolbarOverlayObserver = null
})

const handleRibbonCommand = (cmd: string, ...args: any[]) => {
  if (args.length > 0) emit('command', cmd, ...args)
  else emit('command', cmd)
}
</script>

<style scoped>
.gdocs-toolbar { background: #fff; }
.gdocs-toolbar.is-readonly { pointer-events: none; opacity: 0.6; }
</style>
