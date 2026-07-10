<template>
  <div class="editor-header">
    <div class="left">
      <a-dropdown :trigger="['click']">
        <div class="menu-item"><IconFolderClose /> <span class="text">文件</span></div>
        <template #overlay>
          <a-menu>
            <FileInput accept=".pptist"  @change="importSpecificFile">
              <a-menu-item>导入 pptist 文件</a-menu-item>
            </FileInput>
            <a-menu-item @click="setDialogForExport('pptist')">导出 pptist 文件</a-menu-item>
            <a-menu-item @click="setDialogForExport('pptx')">导出 PPTX</a-menu-item>
            <a-menu-item @click="setDialogForExport('image')">导出图片</a-menu-item>
            <a-menu-item @click="setDialogForExport('json')">导出 JSON</a-menu-item>
            <a-menu-item @click="setDialogForExport('pdf')">打印 / 导出 PDF</a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
      <a-dropdown :trigger="['click']">
        <div class="menu-item"><IconEdit /> <span class="text">编辑</span></div>
        <template #overlay>
          <a-menu>
            <a-menu-item @click="undo()">撤销</a-menu-item>
            <a-menu-item @click="redo()">重做</a-menu-item>
            <a-menu-item @click="createSlide()">添加页面</a-menu-item>
            <a-menu-item @click="deleteSlide()">删除页面</a-menu-item>
            <a-menu-item @click="toggleGridLines()">{{ showGridLines ? '关闭网格线' : '打开网格线' }}</a-menu-item>
            <a-menu-item @click="toggleRuler()">{{ showRuler ? '关闭标尺' : '打开标尺' }}</a-menu-item>
            <a-menu-item @click="resetSlides()">重置幻灯片</a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
      <a-dropdown :trigger="['click']">
        <div class="menu-item"><IconPpt /> <span class="text">演示</span></div>
        <template #overlay>
          <a-menu>
            <a-menu-item @click="enterScreeningFromStart()">从头开始</a-menu-item>
            <a-menu-item @click="enterScreening()">从当前页开始</a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
      <a-dropdown :trigger="['click']">
        <div class="menu-item"><IconHelpcenter /> <span class="text">帮助</span></div>
        <template #overlay>
          <a-menu>
            <a-menu-item @click="goIssues()">意见反馈</a-menu-item>
            <a-menu-item @click="hotkeyDrawerVisible = true">快捷键</a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </div>

    <div class="right">
      <a-tooltip title="导出">
        <div class="menu-item" @click="setDialogForExport('pptx')">
          <IconShare size="18" fill="#666" />
        </div>
      </a-tooltip>
      <a-tooltip title="幻灯片放映">
        <div class="menu-item" @click="enterScreening()">
          <IconPpt size="19" fill="#666" style="margin-top: 1px;" />
        </div>
      </a-tooltip>
      <a href="https://github.com/pipipi-pikachu/PPTist" target="_blank">
        <div class="menu-item"><IconGithub size="18" fill="#666" /></div>
      </a>
    </div>

    <a-drawer
      :width="320"
      placement="right"
      v-model:open="hotkeyDrawerVisible"
    >
      <HotkeyDoc />
    </a-drawer>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore } from '@/store'
import useScreening from '@/hooks/useScreening'
import useSlideHandler from '@/hooks/useSlideHandler'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'
import useExport from '@/hooks/useExport'

import HotkeyDoc from './HotkeyDoc.vue'

export default defineComponent({
  name: 'editor-header',
  components: {
    HotkeyDoc,
  },
  setup() {
    const mainStore = useMainStore()
    const { showGridLines, showRuler } = storeToRefs(mainStore)

    const { enterScreening, enterScreeningFromStart } = useScreening()
    const { createSlide, deleteSlide, resetSlides } = useSlideHandler()
    const { redo, undo } = useHistorySnapshot()
    const { importSpecificFile } = useExport()

    const setDialogForExport = mainStore.setDialogForExport

    const toggleGridLines = () => {
      mainStore.setGridLinesState(!showGridLines.value)
    }

    const toggleRuler = () => {
      mainStore.setRulerState(!showRuler.value)
    }

    const hotkeyDrawerVisible = ref(false)

    const goIssues = () => {
      window.open('https://github.com/pipipi-pikachu/PPTist/issues')
    }

    return {
      redo,
      undo,
      showGridLines,
      showRuler,
      hotkeyDrawerVisible,
      importSpecificFile,
      setDialogForExport,
      enterScreening,
      enterScreeningFromStart,
      createSlide,
      deleteSlide,
      toggleGridLines,
      toggleRuler,
      resetSlides,
      goIssues,
    }
  },
})
</script>

<style lang="scss" scoped>
.editor-header {
  background-color: #fff;
  user-select: none;
  border-bottom: 1px solid #e2e6ed;
  display: flex;
  justify-content: space-between;
  padding: 0 10px;
}
.left, .right {
  display: flex;
  justify-content: center;
  align-items: center;
}
.menu-item {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 14px;
  padding: 0 10px;
  transition: background-color $transitionDelay;
  cursor: pointer;

  .text {
    margin-left: 4px;
  }
}

.left .menu-item:hover {
  background-color: #f1f3f4;
}
</style>
