<template>
  <div class="editor" ref="editorContainer"></div>

</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import DocxEditor, { ICatalogItem, IElement } from '@vervedoc/core'
import { debounce } from '@/utils'
import { editorStateStore } from '@/stores/editor-state'
import { useEditorImport } from '@/composables/use-editor-import'
import { useEditorMedia } from '@/composables/use-editor-media'
import { useEditorChart } from '@/composables/use-editor-chart'
import { useEditorRevisions } from '@/composables/use-editor-revisions'
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

const data: IElement[] = []

const options = {
  defaultFont: '微软雅黑',
  defaultSize: 14,
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
const editorContainer = ref<HTMLDivElement | null>(null)
let editorInstance: any = null
const eventBusSubscriptions: Array<{ unsubscribe: () => void }> = []

const refreshCatalog = async () => {
  if (!editorInstance) return null
  const catalog = await editorInstance.command.getCatalog()
  editorInstance.listener.catalogChange?.(Array.isArray(catalog) ? catalog : [])
  return catalog
}

const {

  importJsonFile: importJsonFileFn,
} = useEditorImport({
  emit: emit as (event: string, ...args: any[]) => void,
  getEditorInstance: () => editorInstance,
  refreshCatalog,
})

const {
  image: imageFn,
  audio: audioFn,
  video: videoFn,
} = useEditorMedia({
  getEditorInstance: () => editorInstance,
})

const {
  insertChartCore: insertChartCoreFn,
  updateChartCore: updateChartCoreFn,
} = useEditorChart({
  getEditorInstance: () => editorInstance,
})

const {
  acceptAllRevisions, rejectAllRevisions, acceptRevisionById, rejectRevisionById, locateRevision,
} = useEditorRevisions({ getEditorInstance: () => editorInstance })

const {
  header: headerFn, footer: footerFn, mainZone: mainZoneFn,
  clearHeader: clearHeaderFn, clearFooter: clearFooterFn, setPageNumber: setPageNumberFn,
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

const {
  search: searchFn, searchNavigatePre: searchNavigatePreFn,
  searchNavigateNext: searchNavigateNextFn, replace: replaceFn, replaceAll: replaceAllFn,
} = useEditorSearch({ getEditorInstance: () => editorInstance })

const {
  tocInsert: tocInsertFn, tocRemove: tocRemoveFn, locationCatalog: locationCatalogFn,
} = useEditorToc({ getEditorInstance: () => editorInstance })

const {
  addWatermark: addWatermarkFn, deleteWatermark: deleteWatermarkFn,
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

const applyOptionsPatch = (patch: any) => {
  if (!editorInstance) return
  const currentOptions = editorInstance.command.getOptions?.()
  editorInstance.command.executeUpdateOptions({
    ...(currentOptions || {}),
    ...(patch || {}),
    background: { ...(currentOptions?.background || {}), ...(patch?.background || {}) },
    group: { ...(currentOptions?.group || {}), ...(patch?.group || {}) },
    lineBreak: { ...(currentOptions?.lineBreak || {}), ...(patch?.lineBreak || {}) }
  })
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


// 初始化编辑器
const initEditor = async () => {
  if (editorContainer.value) {
    editorInstance = new DocxEditor(
      editorContainer.value,
      {
        main: data as IElement[]
      },
      options
    )

    // 注册图表插件
    const { createChartPlugin } = await import('@vervedoc/docx-editor-chart')
    const echarts = await import('echarts')
    editorInstance.use(createChartPlugin({ echarts }))

    // 注册 AI 插件
    const { createAIPlugin } = await import('@vervedoc/docx-editor-ai')
    const aiEndpoint = import.meta.env.VITE_AI_API_ENDPOINT || '/api/ai'
    editorInstance.use(createAIPlugin({
      service: {
        apiEndpoint: aiEndpoint,
        streaming: import.meta.env.VITE_AI_STREAMING !== 'false',
        timeout: Number(import.meta.env.VITE_AI_TIMEOUT) || 60000
      },
      floatingToolbar: false
    }))

    // 保存实例到全局，供cypress使用
    ;(window as any).editor = editorInstance

    // 监听编辑器事件
    setupEditorListeners()
  }
}

// 全局mousedown检测：点击编辑器外部时立即设置inCanvas为false
const handleGlobalMouseDown = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (editorContainer.value && !editorContainer.value.contains(target)) {
    editorStateStore.updateStyle({ inCanvas: false })
  }
}

// 设置编辑器事件监听器
const setupEditorListeners = () => {
  if (!editorInstance) return

  const syncAbility = () => {
    if (!editorInstance?.command?.getIsReadonly) return
    const { startIndex, endIndex } = editorInstance.command.getRange()
    const focused = !!(~startIndex || ~endIndex)
    const ability = {
      focused,
      readonly: editorInstance.command.getIsReadonly(),
      disabled: editorInstance.command.getIsDisabled(),
      canInput: editorInstance.command.getIsCanInput()
    }
    emit('command', 'editorAbilityChange', ability)
  }

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

  // 目录变化
  editorInstance.listener.catalogChange = (catalog: ICatalogItem[]) => {
    emit('command', 'catalogChange', catalog)
  }

  // 内容变化
  editorInstance.listener.contentChange = debounce(async () => {
    updateThumbnails()
    await refreshCatalog()
    const wordCount = await editorInstance.command.getWordCount()
    emit('command', 'editorStatus', { wordCount })
    emit('command', 'contentChange')
  }, 1000)

  // 选区样式变化 - 同步到状态存储实现工具栏回显
  editorInstance.listener.rangeStyleChange = (rangeStyle: any) => {
    editorStateStore.syncFromEditor(rangeStyle)
    syncAbility()

    // 同步首行缩进状态
    const range = editorInstance.command.getRange()
    if (range) {
      const elementList = editorInstance.command.getValue().data.main
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

    const rangeContext = editorInstance.command.getRangeContext?.()
    if (rangeContext) {
      emit('command', 'editorStatus', {
        currentRow: rangeContext.startRowNo + 1,
        currentCol: rangeContext.startColNo + 1
      })
    } else {
      emit('command', 'editorStatus', { currentRow: 0, currentCol: 0 })
    }
  }

  editorInstance.listener.pageSizeChange = (pageCount: number) => {
    emit('command', 'editorStatus', { totalPages: pageCount })
  }

  editorInstance.listener.intersectionPageNoChange = (pageNo: number) => {
    emit('command', 'editorStatus', { currentPage: pageNo + 1 })
  }

  editorInstance.listener.visiblePageNoListChange = (pageNoList: number[]) => {
    emit('command', 'editorStatus', {
      visiblePages: pageNoList.map(p => p + 1).join(',')
    })
  }

  // 页面缩放变化
  editorInstance.listener.pageScaleChange = (scale: number) => {
    emit('command', 'scaleChange', Math.round(scale * 100))
  }

  editorInstance.listener.saved = (result: any) => {
    emit('saved', result)
  }

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
      subscribeEventBus(eventBus, 'mousedown', (evt: MouseEvent) => {
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

    // 初始加载
    setTimeout(async () => {
      syncAbility()
      updateThumbnails()
      const wordCount = await editorInstance.command.getWordCount()
      emit('command', 'editorStatus', { wordCount })
      const rangeContext = editorInstance.command.getRangeContext?.()
      if (rangeContext) {
        emit('command', 'editorStatus', {
          currentRow: rangeContext.startRowNo + 1,
          currentCol: rangeContext.startColNo + 1
        })
      }
      emit('ready')
    }, 1000)
}

// 更新缩略图（防抖 + 延迟执行，避免阻塞 UI）
let thumbnailTimer: ReturnType<typeof setTimeout> | null = null
const updateThumbnails = async () => {
  if (!editorInstance) return
  if (thumbnailTimer) clearTimeout(thumbnailTimer)
  thumbnailTimer = setTimeout(async () => {
    try {
      const images = await editorInstance.command.getImage()
      emit('command', 'thumbnailsChange', images)
    } catch {
      // 忽略缩略图生成失败
    }
  }, 300)
}

// 刷新缩略图（从外部调用）
const refreshThumbnails = () => {
  updateThumbnails()
}


// 执行命令
const executeCommand = (command: string, ...args: any[]) => {
  if (!editorInstance) return

  const commandMap: Record<string, Function> = {
    updateOptions: (patch: any) => applyOptionsPatch(patch),
    setZone: (zone: string) => editorInstance.command.executeSetZone(zone),
    setValue: (value: any, options?: any) => editorInstance.command.executeSetValue(value, options),
    refreshCatalog: async () => refreshCatalog(),
    replaceRange: (range: any) => editorInstance.command.executeReplaceRange(range),
    insertElementList: (elements: any[]) => editorInstance.command.executeInsertElementList(elements),
    insertChartCore: (data: any) => insertChartCoreFn(data),
    updateChartCore: (id: string, patch: any) => updateChartCoreFn(id, patch),
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

    // 图片/音频/视频
    image: imageFn,
    audio: audioFn,
    video: videoFn,


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

    addBookmark: (payload: { name: string }) => {
      if (payload?.name) {
        editorInstance.command.executeAddBookmark({ name: payload.name })
      }
    },

    deleteBookmark: (payload: { name: string }) => {
      if (payload?.name) {
        editorInstance.command.executeDeleteBookmark({ name: payload.name })
      }
    },

    gotoBookmark: (payload: { name: string }) => {
      if (payload?.name) {
        editorInstance.command.executeGotoBookmark({ name: payload.name })
      }
    },

    // 分隔符
    separator: separatorFn,

    // 水印
    addWatermark: addWatermarkFn,
    deleteWatermark: deleteWatermarkFn,

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

    // 搜索替换
    search: searchFn,
    searchNavigatePre: searchNavigatePreFn,
    searchNavigateNext: searchNavigateNextFn,
    replace: replaceFn,
    replaceAll: replaceAllFn,

    tocInsert: tocInsertFn,
    tocRemove: tocRemoveFn,

    // 打印
    print: () => editorInstance.command.executePrint(),

    locationCatalog: locationCatalogFn,

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

    refreshThumbnails: () => refreshThumbnails(),
    insertBlankPageBefore: (direction?: string) => insertBlankPageBefore(direction),

    columns: columnsFn,

    // 模式切换
    mode: (mode: string) => editorInstance.command.executeMode(mode),

    // 签名 - 现在由 App.vue 处理
    signature: () => {
      emit('command', 'signature')
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

    // 设置页码
    setPageNumber: setPageNumberFn,

    // 导入 JSON
    importJsonFile: importJsonFileFn,

    exportDocx: async (payload: any) => {
      await editorInstance.command.execute('exportDocx', payload)
    },

    previewHtml: (payload: any) => {
      editorInstance.command.execute('previewHtml', payload)
    },

    acceptAllRevisions,
    rejectAllRevisions,
    acceptRevisionById,
    rejectRevisionById,
    locateRevision,

    comment: () => {
      const c = editorInstance.comment
      c.addComment()
      c.render()
    }
  }

  const fn = commandMap[command]
  if (fn) {
    const result = fn(...args)
    if (command === 'mode') {
      const mode = args[0]
      const ability = editorInstance?.command?.getIsReadonly
        ? {
            focused: (() => {
              const { startIndex, endIndex } = editorInstance.command.getRange()
              return !!(~startIndex || ~endIndex)
            })(),
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

// 获取编辑器实例
const getEditorInstance = () => {
  return editorInstance
}

// 更新目录
const updateCatalog = async () => {
  if (!editorInstance) return
  return refreshCatalog()
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

// 在当前页面之前插入空白页
const insertBlankPageBefore = (direction?: string) => {
  if (!editorInstance) return

  if (direction === 'horizontal') {
    editorInstance.command.executePaperDirection('horizontal')
  } else if (direction === 'vertical') {
    editorInstance.command.executePaperDirection('vertical')
  }

  const range = editorInstance.command.getRange()
  if (!range) return

  const currentPageNo = range.pageNo || 0

  const result = editorInstance.command.getValue()
  const mainData = result.data.main
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
  updateCatalog,
  refreshThumbnails,
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
