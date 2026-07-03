<template>
  <div class="editor-header">
    <div class="left">
      <el-dropdown trigger="click">
        <div class="menu-item"><IconFolderClose /> <span class="text">文件</span></div>
        <template #dropdown>
          <el-dropdown-menu>
            <FileInput accept=".pptist"  @change="importSpecificFile">
              <el-dropdown-item>导入 pptist 文件</el-dropdown-item>
            </FileInput>
            <el-dropdown-item @click="setDialogForExport('pptist')">导出 pptist 文件</el-dropdown-item>
            <el-dropdown-item @click="setDialogForExport('pptx')">导出 PPTX</el-dropdown-item>
            <el-dropdown-item @click="setDialogForExport('image')">导出图片</el-dropdown-item>
            <el-dropdown-item @click="setDialogForExport('json')">导出 JSON</el-dropdown-item>
            <el-dropdown-item @click="setDialogForExport('pdf')">打印 / 导出 PDF</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <el-dropdown trigger="click">
        <div class="menu-item"><IconEdit /> <span class="text">编辑</span></div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="undo()">撤销</el-dropdown-item>
            <el-dropdown-item @click="redo()">重做</el-dropdown-item>
            <el-dropdown-item @click="createSlide()">添加页面</el-dropdown-item>
            <el-dropdown-item @click="deleteSlide()">删除页面</el-dropdown-item>
            <el-dropdown-item @click="toggleGridLines()">{{ showGridLines ? '关闭网格线' : '打开网格线' }}</el-dropdown-item>
            <el-dropdown-item @click="toggleRuler()">{{ showRuler ? '关闭标尺' : '打开标尺' }}</el-dropdown-item>
            <el-dropdown-item @click="resetSlides()">重置幻灯片</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <el-dropdown trigger="click">
        <div class="menu-item"><IconPpt /> <span class="text">演示</span></div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="enterScreeningFromStart()">从头开始</el-dropdown-item>
            <el-dropdown-item @click="enterScreening()">从当前页开始</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <el-dropdown trigger="click">
        <div class="menu-item"><IconHelpcenter /> <span class="text">帮助</span></div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="goIssues()">意见反馈</el-dropdown-item>
            <el-dropdown-item @click="hotkeyDrawerVisible = true">快捷键</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <div class="right">
      <el-tooltip :hide-after="0" content="导出">
        <div class="menu-item" @click="setDialogForExport('pptx')">
          <IconShare size="18" fill="#666" />
        </div>
      </el-tooltip>
      <el-tooltip :hide-after="0" content="幻灯片放映">
        <div class="menu-item" @click="enterScreening()">
          <IconPpt size="19" fill="#666" style="margin-top: 1px;" />
        </div>
      </el-tooltip>
      <a href="https://github.com/pipipi-pikachu/PPTist" target="_blank">
        <div class="menu-item"><IconGithub size="18" fill="#666" /></div>
      </a>
    </div>

    <el-drawer
      size="320"
      direction="rtl"
      v-model="hotkeyDrawerVisible"
    >
      <HotkeyDoc />
    </el-drawer>
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
