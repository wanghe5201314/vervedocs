<template>
  <div class="menu-bar">
    <div class="logo" aria-hidden="true">
      <svg viewBox="0 0 1024 1024" width="40" height="40">
        <path d="M205.5 64H674l223 225.5V935c0 13.807-11.193 25-25 25H205.5c-13.807 0-25-11.193-25-25V89c0-13.807 11.193-25 25-25z" fill="#FFFFFF" />
        <path d="M674 64v200.5c0 13.807 11.193 25 25 25h198L674 64z" fill="#E5E5E5" />
        <path d="M67 193m16 0l287 0q16 0 16 16l0 287q0 16-16 16l-287 0q-16 0-16-16l0-287q0-16 16-16Z" fill="#4297FC" />
        <path d="M255 571m10 0l556 0q10 0 10 10l0 0q0 10-10 10l-556 0q-10 0-10-10l0 0q0-10 10-10Z" fill="#D8D8D8" />
        <path d="M255 707m10 0l556 0q10 0 10 10l0 0q0 10-10 10l-556 0q-10 0-10-10l0 0q0-10 10-10Z" fill="#D8D8D8" />
        <path d="M255 639m10 0l556 0q10 0 10 10l0 0q0 10-10 10l-556 0q-10 0-10-10l0 0q0-10 10-10Z" fill="#D8D8D8" />
        <path d="M255 774m10 0l556 0q10 0 10 10l0 0q0 10-10 10l-556 0q-10 0-10-10l0 0q0-10 10-10Z" fill="#D8D8D8" />
        <path d="M255 842m10 0l556 0q10 0 10 10l0 0q0 10-10 10l-556 0q-10 0-10-10l0 0q0-10 10-10Z" fill="#D8D8D8" />
        <path d="M315.269 451.314c7.015 7.61 19.731 2.651 19.731-7.693V271h-22.737v143.524l-76.9-83.418c-4.503-4.885-12.223-4.885-16.726 0l-76.9 83.418V271H119v172.62c0 10.345 12.716 15.303 19.731 7.694L227 355.564l88.269 95.75z" fill="#FFFFFF" />
      </svg>
    </div>
    <div class="doc-info">
      <div class="doc-title-row">
        <input
          v-model="documentMeta.name"
          class="doc-title"
          :title="documentMeta.name"
        />
        <span class="save-indicator" :class="{ saving: saveIndicatorSaving }">{{ saveIndicatorText }}</span>
      </div>
      <div class="menu-items">
        <div class="menu-item" @click.stop="$emit('toggleDropdown', 'file')">
          文件
          <div class="dropdown-menu" :class="{ show: activeDropdown === 'file' }">
            <div class="dropdown-item" @click.stop="$emit('save')">
              <span class="dropdown-item-inner"><span class="material-icons">done</span>保存</span>
              <span class="shortcut-hint">Ctrl+S</span>
            </div>
            <div class="dropdown-item" @click.stop="$emit('importDoc')">
              <span class="dropdown-item-inner"><span class="material-icons">folder_open</span>导入文档</span>
            </div>
            <div class="dropdown-item" @click.stop="$emit('exportDoc')">
              <span class="dropdown-item-inner"><span class="material-icons">download</span>导出文档</span>
            </div>
            <div class="dropdown-separator"></div>
            <div class="dropdown-item" @click.stop="$emit('command', 'executePrint')">
              <span class="dropdown-item-inner"><span class="material-icons">print</span>打印</span>
              <span class="shortcut-hint">Ctrl+P</span>
            </div>
          </div>
        </div>
        <div class="menu-item" @click.stop="$emit('toggleDropdown', 'help')">
          帮助
          <div class="dropdown-menu" :class="{ show: activeDropdown === 'help' }">
            <div class="dropdown-item" @click.stop="$emit('showPopup', 'shortcuts')">
              <span class="dropdown-item-inner"><span class="material-icons">keyboard</span>快捷键</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SaveSnapshot } from '../../object/word-editor.types'

defineProps<{
  documentMeta: SaveSnapshot['meta']
  saveIndicatorText: string
  saveIndicatorSaving: boolean
  activeDropdown: string | null
}>()

defineEmits<{
  toggleDropdown: [name: string]
  save: []
  importDoc: []
  exportDoc: []
  command: [command: string, ...args: any[]]
  showPopup: [name: 'table' | 'link' | 'search' | 'shortcuts' | 'toc']
}>()
</script>