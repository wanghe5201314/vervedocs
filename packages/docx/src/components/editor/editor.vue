<template>
  <div class="editor" ref="editorContainer"></div>

</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import DocxEditor, { IElement } from '@vervedoc/core'
import { createCommentPlugin, createRevisionPlugin } from '@vervedoc/docx-editor-comment'
import { createChartPlugin } from '@vervedoc/docx-editor-chart'
import type { CommentPlugin } from '@vervedoc/docx-editor-comment'
import { debounce } from '@/utils'
import { editorStateStore } from '@/stores/editor-state'
import { useEditorImport } from '@/composables/use-editor-import'
import { useEditorMedia } from '@/composables/use-editor-media'

import { useEditorHeaderFooter } from '@/composables/use-editor-header-footer'
import { useEditorBreaks } from '@/composables/use-editor-breaks'
import { useEditorTable } from '@/composables/use-editor-table'
import { useEditorSearch } from '@/composables/use-editor-search'
import { useEditorToc } from '@/composables/use-editor-toc'
import { useEditorWatermark } from '@/composables/use-editor-watermark'
import { useEditorLatex } from '@/composables/use-editor-latex'
import { useEditorBarcode } from '@/composables/use-editor-barcode'
import { useEditorFormat } from '@/composables/use-editor-format'
import { useEditorPage } from '@/composables/use-editor-page'
import { t } from '@/i18n'

/** 编辑器初始元素数据 */
const data: IElement[] = []

/** 编辑器初始化选项 */
const options = {
  defaultFont: t('editor.defaultFont'),
  defaultSize: 14,
  showRuler: true,
  marginIndicatorDisabled: false,
  marginIndicatorSize: 25,
  marginIndicatorColor: '#CCCCCC',
  marginIndicatorLineWidth: 0.8,
  paragraphHighlightColor: '#F0F7FF',
  paragraphHighlightDisabled: false,
  showCommentBalloons: true,
  showRevisionBalloons: true,
  revisionDisplayMode: 'all' as const,
  lineBreak: {
    disabled: true,
    color: '#4A9EFF'
  }
}


// 事件触发
const emit = defineEmits(['command', 'ready', 'saved'])

// 编辑器容器和实例
/** 编辑器容器 DOM 引用 */
const editorContainer = ref<HTMLDivElement | null>(null)
/** 编辑器实例 */
let editorInstance: any = null
/** EventBus 订阅句柄集合，用于卸载时统一取消订阅 */
const eventBusSubscriptions: Array<{ unsubscribe: () => void }> = []

const {

  importJsonFile: importJsonFileFn,
} = useEditorImport({
  getEditorInstance: () => editorInstance,
})

const {
  image: imageFn,

} = useEditorMedia({
  getEditorInstance: () => editorInstance,
})

const {

  header: headerFn, footer: footerFn, mainZone: mainZoneFn,
  clearHeader: clearHeaderFn, clearFooter: clearFooterFn,
} = useEditorHeaderFooter({ getEditorInstance: () => editorInstance })

const {
  pageBreak: pageBreakFn, columnBreak: columnBreakFn, lineBreak: lineBreakFn,
  sectionBreakNextPage: sectionBreakNextPageFn, sectionBreakContinuous: sectionBreakContinuousFn,
  sectionBreakEvenPage: sectionBreakEvenPageFn, sectionBreakOddPage: sectionBreakOddPageFn,
  separator: separatorFn,
} = useEditorBreaks({ getEditorInstance: () => editorInstance })

const {
  insertTable: insertTableFn, tableBorderType: tableBorderTypeFn,
  tableBorderColor: tableBorderColorFn, tableBorderWidth: tableBorderWidthFn,
  tableBorderExternalWidth: tableBorderExternalWidthFn,
} = useEditorTable({ getEditorInstance: () => editorInstance })

const { searchAPI } = useEditorSearch({ getEditorInstance: () => editorInstance })

const {
  tocInsert: tocInsertFn, tocRemove: tocRemoveFn, locationToc: locationTocFn,
} = useEditorToc({ getEditorInstance: () => editorInstance })

const {
  addWatermark: addWatermarkFn, deleteWatermark: deleteWatermarkFn,
  setSystemWatermark: setSystemWatermarkFn, deleteSystemWatermark: deleteSystemWatermarkFn,
} = useEditorWatermark({ getEditorInstance: () => editorInstance })

const { insertLatex: insertLatexFn } = useEditorLatex({ getEditorInstance: () => editorInstance })

const { barcode: barcodeFn, qrcode: qrcodeFn } = useEditorBarcode({ getEditorInstance: () => editorInstance })

const {
  undo: undoFn, redo: redoFn, cut: cutFn, copy: copyFn, paste: pasteFn,
  pasteNoFormat: pasteNoFormatFn, selectAll: selectAllFn, deleteFn: deleteFnRef,
  painter: painterFn, format: formatFn,
  font: fontFn, size: sizeFn, characterScale: characterScaleFn, sizeAdd: sizeAddFn, sizeMinus: sizeMinusFn,
  bold: boldFn, italic: italicFn, underline: underlineFn, strikeout: strikeoutFn,
  superscript: superscriptFn, subscript: subscriptFn, color: colorFn, highlight: highlightFn,
  title: titleFn, rowFlex: rowFlexFn, rowMargin: rowMarginFn, indentStep: indentStepFn,
  list: listFn, lineHeight: lineHeightFn, firstLineIndent: firstLineIndentFn, getFirstLineIndent: getFirstLineIndentFn,
} = useEditorFormat({ getEditorInstance: () => editorInstance })

/**
 * 应用选项补丁，合并 background、group、lineBreak 等嵌套选项后更新编辑器
 * @param patch - 待合并的选项补丁
 */
const applyOptionsPatch = (patch: any) => {
  if (!editorInstance) return
  const currentOptions = editorInstance.command.getOptions?.()
  const merged = { ...(patch || {}) }
  for (const key of ['background', 'group', 'lineBreak']) {
    if (Object.prototype.hasOwnProperty.call(merged, key)) {
      merged[key] = { ...(currentOptions?.[key] || {}), ...(merged[key] || {}) }
    }
  }
  editorInstance.command.executeUpdateOptions(merged)
}

const {
  pageJump: pageJumpFn, pageMode: pageModeFn,
  pageScale: pageScaleFn, pageScaleRecovery: pageScaleRecoveryFn,
  pageScaleAdd: pageScaleAddFn, pageScaleMinus: pageScaleMinusFn,
  paperSize: paperSizeFn, paperDirection: paperDirectionFn,
  setPaperMargin: setPaperMarginFn, setPaperBackground: setPaperBackgroundFn,
  columns: columnsFn,
} = useEditorPage({
  getEditorInstance: () => editorInstance,
  getEditorContainer: () => editorContainer.value,
  applyOptionsPatch,
})

/**
 * 订阅 EventBus 事件，兼容 select 和 on/off 两种订阅模式
 * @param eventBus - 事件总线对象
 * @param event - 事件名称
 * @param handler - 事件处理函数
 * @returns 包含 unsubscribe 方法的订阅句柄
 */
const subscribeEventBus = (eventBus: any, event: string, handler: (...args: any[]) => void) => {
  if (!eventBus || typeof handler !== 'function') {
    return { unsubscribe: () => {} }
  }
  if (typeof eventBus.select === 'function') {
    return eventBus.select(event).subscribe(handler)
  }
  if (typeof eventBus.on === 'function') {
    eventBus.on(event, handler)
    return {
      unsubscribe: () => {
        if (typeof eventBus.off === 'function') {
          eventBus.off(event, handler)
        }
      }
    }
  }
  return { unsubscribe: () => {} }
}


/** 初始化编辑器：创建实例、挂载全局引用并设置事件监听 */
const initEditor = async () => {
  if (editorContainer.value) {
    editorInstance = new DocxEditor(
      editorContainer.value,
      {
        success: true,
        elements: data
      },
      options
    )

    // 注册可选功能插件（批注/修订/图表）
    editorInstance.use(createCommentPlugin())
    editorInstance.use(createRevisionPlugin())
    editorInstance.use(createChartPlugin())


    // 保存实例到全局，供cypress使用
    ;(window as any).editor = editorInstance

    // 监听编辑器事件
    setupEditorListeners()
  }
}

/**
 * 全局 mousedown 检测：点击编辑器外部时立即设置 inCanvas 为 false
 * @param e - 鼠标事件
 */
const handleGlobalMouseDown = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (editorContainer.value && !editorContainer.value.contains(target)) {
    editorStateStore.updateStyle({ inCanvas: false })
  }
}

/** 设置编辑器事件监听器：目录、内容、选区、页面、EventBus 等 */
const setupEditorListeners = () => {
  if (!editorInstance) return

  const syncAbility = () => {
    if (!editorInstance?.command?.getIsReadonly) return
    const range = editorInstance.command.getRange()
    const ability = {
      focused: !!range,
      readonly: editorInstance.command.getIsReadonly(),
      disabled: editorInstance.command.getIsDisabled(),
      canInput: editorInstance.command.getIsCanInput()
    }
    emit('command', 'editorAbilityChange', ability)
  }
  editorInstance.listener.on('abilityChange', syncAbility)

  // 监听容器焦点事件，更新inCanvas状态
  if (editorContainer.value) {
    editorContainer.value.addEventListener('focusin', () => {
      editorStateStore.updateStyle({ inCanvas: true })
    })
    editorContainer.value.addEventListener('focusout', (e: FocusEvent) => {
      const relatedTarget = e.relatedTarget as HTMLElement | null
      // 如果焦点移到容器外部，设置inCanvas为false
      if (!relatedTarget || !editorContainer.value?.contains(relatedTarget)) {
        editorStateStore.updateStyle({ inCanvas: false })
      }
    })

    document.addEventListener('mousedown', handleGlobalMouseDown)
  }

  const openTableProperties = () => emit('command', 'tablePropertiesDialog')
  editorInstance.listener.on('requestTableProperties', openTableProperties)
  eventBusSubscriptions.push({
    unsubscribe: () => editorInstance?.listener.off('requestTableProperties', openTableProperties)
  })

  // 目录变化
  editorInstance.listener.toc.tocListener((catalog: any[]) => {
    emit('command', 'tocChange', catalog)
  })

  // 缩略图变化
  editorInstance.listener.thumbnail.thumbnailListener((images: string[]) => {
    emit('command', 'thumbnailsChange', images)
  })

  // 内容变化（目录和缩略图已由核心 Worker + afterRender 自动推送，此处仅同步字数和状态）
  editorInstance.listener.content.contentListener(debounce(async () => {
    const wordCount = await editorInstance.command.getWordCount()
    emit('command', 'editorStatus', { wordCount })
    emit('command', 'contentChange')
  }, 1000))

  // 选区样式变化 - 同步到状态存储实现工具栏回显
  editorInstance.listener.range.formatListener((rangeStyle: any) => {
    editorStateStore.syncFromEditor(rangeStyle)
    syncAbility()

    // 同步首行缩进状态
    const range = editorInstance.command.getRange()
    if (range) {
      const elementList = editorInstance.command.getValue()?.data?.main
      if (elementList && elementList.length > 0) {
        const { startIndex } = range

        // 从 startIndex 开始向后查找，统计连续的全角空格数量
        let count = 0
        for (let i = startIndex; i < elementList.length; i++) {
          const element = elementList[i]
          if (element && element.value === '\u3000') {
            count++
          } else {
            break
          }
        }

        emit('command', 'indentChange', count)
      }
    }

    const rangeContext = editorInstance.command.getRangeContext()
    if (rangeContext) {
      emit('command', 'editorStatus', {
        currentRow: rangeContext.startRowNo + 1,
        currentCol: rangeContext.startColNo + 1
      })
    } else {
      emit('command', 'editorStatus', { currentRow: 0, currentCol: 0 })
    }
  })

  editorInstance.listener.range.positionListener(() => {
    const rangeContext = editorInstance.command.getRangeContext()
    if (rangeContext) {
      emit('command', 'editorStatus', {
        currentRow: rangeContext.startRowNo + 1,
        currentCol: rangeContext.startColNo + 1
      })
    } else {
      emit('command', 'editorStatus', { currentRow: 0, currentCol: 0 })
    }
  })

  editorInstance.listener.page.pageCountListener((pageCount: number) => {
    emit('command', 'editorStatus', { totalPages: pageCount })
  })

  editorInstance.listener.page.currentPageNoListener((pageNo: number) => {
    emit('command', 'editorStatus', { currentPage: pageNo + 1 })
  })

  // 页面缩放变化
  editorInstance.listener.page.pageScaleListener((scale: number) => {
    emit('command', 'scaleChange', Math.round(scale * 100))
  })

  editorInstance.listener.content.savedListener((result: any) => {
    emit('saved', result)
  })

  // 监听 EventBus 事件
  const eventBus = editorInstance.command.getEventBus?.() || editorInstance.eventBus
  if (eventBus) {
    // 右键菜单点击插入超链接
    eventBusSubscriptions.push(
      subscribeEventBus(eventBus, 'hyperlinkMenuClick', () => {
        emit('command', 'hyperlink')
      }),
      subscribeEventBus(eventBus, 'chartClick', (data: any) => {
        emit('command', 'chartClick', data)
      }),
      subscribeEventBus(eventBus, 'imageMousedown', (payload: any) => {
        emit('command', 'imageMousedown', payload)
      }),
      subscribeEventBus(eventBus, 'editorMousedown', (evt: MouseEvent) => {
        emit('command', 'mousedown', evt)
      }),
      subscribeEventBus(eventBus, 'commentCreate', (payload: any) => {
        emit('command', 'commentCreate', payload)
      }),
      subscribeEventBus(eventBus, 'commentDelete', (payload: any) => {
        emit('command', 'commentDelete', payload)
      })
    )
  }

    // 初始加载（缩略图和目录由核心 listener 自动推送，无需主动调用）
    setTimeout(async () => {
      syncAbility()
      const wordCount = await editorInstance.command.getWordCount()
      emit('command', 'editorStatus', { wordCount })
      const rangeContext = editorInstance.command.getRangeContext()
      if (rangeContext) {
        emit('command', 'editorStatus', {
          currentRow: rangeContext.startRowNo + 1,
          currentCol: rangeContext.startColNo + 1
        })
      }
      emit('ready')
    }, 1000)
}


/**
 * 执行编辑器命令，根据命令名映射到对应编辑器操作
 * @param command - 命令名称
 * @param args - 命令参数
 * @returns 命令执行结果
 */
const executeCommand = (command: string, ...args: any[]) => {
  if (!editorInstance) return

  const commandMap: Record<string, Function> = {
    updateOptions: (patch: any) => applyOptionsPatch(patch),
    setRulerVisible: (visible: boolean) => editorInstance.command.executeSetRulerVisible(visible),
    setZone: (zone: string) => editorInstance.command.executeSetZone(zone),
    setValue: (value: any, options?: any) => editorInstance.command.executeSetValue(value, options),
    replaceRange: (range: any) => editorInstance.command.executeReplaceRange(range),
    insertElementList: (elements: any[]) => editorInstance.command.executeInsertElementList(elements),
    requestInsertChart: () => editorInstance.dispatchCommand('requestInsertChart'),
    setGroup: () => editorInstance.command.executeSetGroup(),
    deleteGroup: (id: string) => editorInstance.command.executeDeleteGroup(id),
    locationGroup: (id: string) => editorInstance.command.executeLocationGroup(id),
    // 撤销/重做/格式刷/清除格式
    undo: undoFn,
    redo: redoFn,
    cut: cutFn,
    copy: copyFn,
    paste: pasteFn,
    pasteNoFormat: pasteNoFormatFn,
    selectAll: selectAllFn,
    delete: deleteFnRef,
    painter: painterFn,
    format: formatFn,

    // 字体相关
    font: fontFn,
    size: sizeFn,
    characterScale: characterScaleFn,
    sizeAdd: sizeAddFn,
    sizeMinus: sizeMinusFn,

    // 文本样式
    bold: boldFn,
    italic: italicFn,
    underline: underlineFn,
    strikeout: strikeoutFn,
    superscript: superscriptFn,
    subscript: subscriptFn,
    color: colorFn,
    highlight: highlightFn,

    // 段落样式
    title: titleFn,
    rowFlex: rowFlexFn,
    rowMargin: rowMarginFn,
    indentStep: indentStepFn,
    list: listFn,
    lineHeight: lineHeightFn,
    firstLineIndent: firstLineIndentFn,
    getFirstLineIndent: getFirstLineIndentFn,

    // 插入元素
    insertCheckbox: () => editorInstance.command.executeInsertElementList([{
      type: 'checkbox',
      checkbox: {
        value: false
      },
      value: ''
    }]),
    insertRadio: () => editorInstance.command.executeInsertElementList([{
      type: 'radio',
      checkbox: {
        value: false
      },
      value: ''
    }]),

    // 分隔符
    pageBreak: pageBreakFn,
    columnBreak: columnBreakFn,
    lineBreak: lineBreakFn,
    sectionBreakNextPage: sectionBreakNextPageFn,
    sectionBreakContinuous: sectionBreakContinuousFn,
    sectionBreakEvenPage: sectionBreakEvenPageFn,
    sectionBreakOddPage: sectionBreakOddPageFn,

    // 表格
    insertTable: insertTableFn,
    tableBorderType: tableBorderTypeFn,
    tableBorderColor: tableBorderColorFn,
    tableBorderWidth: tableBorderWidthFn,
    tableBorderExternalWidth: tableBorderExternalWidthFn,
    getTableBorders: () => editorInstance.command.getTableBorders(),
    tableBorders: (patch: any) => editorInstance.command.executeSetTableBorders(patch),
    getTableDialogContext: () => ({ range: structuredClone(editorInstance.command.getRange()), zone: editorInstance.command.getZone() }),
    restoreTableDialogContext: (context: any) => {
      editorInstance.command.executeSetZone(context.zone)
      editorInstance.command.executeReplaceRange(context.range)
    },
    focusEditor: () => editorContainer.value?.querySelector('textarea')?.focus(),

    // 图片
    image: imageFn,


    // 超链接
    hyperlink: (payload: { text: string, url: string }) => {
      if (payload && payload.url) {
        const text = payload.text || payload.url
        const valueList = text.split('').map(char => ({ value: char }))
        editorInstance.command.executeHyperlink({
          url: payload.url,
          valueList
        })
      }
    },

    // 分隔符
    separator: separatorFn,

    // 水印
    addWatermark: addWatermarkFn,
    deleteWatermark: deleteWatermarkFn,
    setSystemWatermark: setSystemWatermarkFn,
    deleteSystemWatermark: deleteSystemWatermarkFn,

    // LaTeX
    latex: () => {
      // 由App.vue处理弹出对话框
    },
    insertLatex: insertLatexFn,

    // 日期
    insertDate: (payload: { format: string, value: string }) => {
      editorInstance.command.executeInsertElementList([{
        type: 'date',
        value: '',
        dateFormat: payload.format,
        valueList: [{
          value: payload.value.trim()
        }]
      }])
    },

    // 内容块
    block: () => {
      // 实现内容块对话框逻辑
    },

    tocInsert: tocInsertFn,
    tocRemove: tocRemoveFn,

    // 打印
    print: () => editorInstance.command.executePrint(),

    locationToc: locationTocFn,

    pageJump: pageJumpFn,

    // 页面模式
    pageMode: pageModeFn,

    // 页面缩放
    pageScale: pageScaleFn,
    pageScaleRecovery: pageScaleRecoveryFn,
    pageScaleAdd: pageScaleAddFn,
    pageScaleMinus: pageScaleMinusFn,

    // 纸张设置
    paperSize: paperSizeFn,
    paperDirection: paperDirectionFn,
    setPaperMargin: setPaperMarginFn,
    setPaperBackground: setPaperBackgroundFn,

    insertBlankPageBefore: (direction?: string) => insertBlankPageBefore(direction),

    columns: columnsFn,

    // 模式切换
    mode: (mode: string) => editorInstance.command.executeSetMode(mode),

    // 签名 - 打开对话框由上层处理
    signature: () => {
      emit('command', 'signature')
    },
    // 签名确认后插入图片
    signatureImage: (dataUrl: string) => {
      editorInstance.command.executeInsertSignature(dataUrl)
    },

    // 条形码
    barcode: barcodeFn,
    qrcode: qrcodeFn,

    // 插入元素 (形状等)
    insertElement: (payload: any) => {
      editorInstance.command.executeInsertElementList([{
        type: payload.type || 'text',
        value: payload.value
      }])
    },


    // 页眉页脚
    header: headerFn,
    footer: footerFn,
    mainZone: mainZoneFn,
    clearHeader: clearHeaderFn,
    clearFooter: clearFooterFn,


    // 导入 JSON
    importJsonFile: importJsonFileFn,

    exportDocx: async (payload: any) => {
      await editorInstance.command.execute('exportDocx', payload)
    },

    previewHtml: (payload: any) => {
      editorInstance.command.execute('previewHtml', payload)
    },

    comment: () => {
      const c = editorInstance.getPlugin('comment') as CommentPlugin | undefined
      c?.add()
      c?.render()
    }
  }

  const fn = commandMap[command]
  if (fn) {
    const result = fn(...args)
    if (command === 'mode') {
      const mode = args[0]
      const ability = editorInstance?.command?.getIsReadonly
        ? {
            focused: !!editorInstance.command.getRange(),
            readonly: editorInstance.command.getIsReadonly(),
            disabled: editorInstance.command.getIsDisabled(),
            canInput: editorInstance.command.getIsCanInput()
          }
        : undefined
      emit('command', 'modeChange', { mode, ability })
      if (ability) emit('command', 'editorAbilityChange', ability)
    }
    return result
  }
}

/**
 * 获取编辑器实例
 * @returns 当前编辑器实例
 */
const getEditorInstance = () => {
  return editorInstance
}

// 生命周期钩子
onMounted(() => {
  initEditor()
  requestAnimationFrame(() => {
    editorInstance?.command?.executeFocus?.()
  })
})

onBeforeUnmount(() => {
  // 清理全局事件监听
  document.removeEventListener('mousedown', handleGlobalMouseDown)
  eventBusSubscriptions.forEach(subscription => subscription.unsubscribe())
  eventBusSubscriptions.length = 0
  if (editorInstance) {
    editorInstance.destroy()
  }
})

/**
 * 在当前页之前插入空白页，可选切换纸张方向
 * @param direction - 纸张方向，'horizontal' 或 'vertical'
 */
const insertBlankPageBefore = (direction?: string) => {
  if (!editorInstance) return

  if (direction === 'horizontal') {
    editorInstance.command.executeSetPaperDirection('horizontal')
  } else if (direction === 'vertical') {
    editorInstance.command.executeSetPaperDirection('vertical')
  }

  const range = editorInstance.command.getRange()
  if (!range) return

  const currentPageNo = range.pageNo || 0

  const result = editorInstance.command.getValue()
  const mainData = result?.data?.main
  if (!mainData) return

  let currentPage = 0
  let insertIndex = 0

  for (let i = 0; i < mainData.length; i++) {
    if (currentPage === currentPageNo) {
      insertIndex = i
      break
    }

    if (mainData[i].type === 'pageBreak') {
      currentPage++
    }
  }

  editorInstance.command.executeSetRange(insertIndex, insertIndex)
  editorInstance.command.executePageBreak()
}

// 暴露方法给父组件
defineExpose({
  executeCommand,
  getEditorInstance,
  getSearchAPI: () => searchAPI,
  insertBlankPageBefore
})
</script>

<style scoped>
.editor {
  width: 100%;
  height: 100%;
  overflow: visible;
  display: flex;
  flex-direction: column;
  align-items: center;
}

:deep(.ce-container) {

  margin: 40px 0;
}
</style>
