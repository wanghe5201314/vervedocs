<template>
  <div class="editor" ref="editorContainer"></div>

</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import DocxEditor, { ICatalogItem, IElement, PaperDirection, TableBorder, parseDocx } from '@vervedoc/core'
import { debounce } from '@/utils'
// @ts-ignore
import { getChartSampleManualData } from '@/utils/chartSampleData'
import { editorStateStore } from '@/stores/editor-state'
import { getAuthToken } from '@/api/document.api'

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
    disabled: false,
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

const resolveFetchInit = (payload: any): RequestInit => {
  const token = String(getAuthToken() || '').trim()
  const headers: Record<string, string> = {
    ...(payload?.headers || {})
  }
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`
  }
  return {
    ...(payload?.fetchInit || {}),
    headers
  }
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

  const applyOptionsPatch = (patch: any) => {
    const currentOptions = editorInstance.command.getOptions?.()
    editorInstance.command.executeUpdateOptions({
      ...(currentOptions || {}),
      ...(patch || {}),
      background: { ...(currentOptions?.background || {}), ...(patch?.background || {}) },
      group: { ...(currentOptions?.group || {}), ...(patch?.group || {}) },
      lineBreak: { ...(currentOptions?.lineBreak || {}), ...(patch?.lineBreak || {}) }
    })
  }

  const commandMap: Record<string, Function> = {
    updateOptions: (patch: any) => applyOptionsPatch(patch),
    setZone: (zone: string) => editorInstance.command.executeSetZone(zone),
    setValue: (value: any, options?: any) => editorInstance.command.executeSetValue(value, options),
    refreshCatalog: async () => refreshCatalog(),
    replaceRange: (range: any) => editorInstance.command.executeReplaceRange(range),
    insertElementList: (elements: any[]) => editorInstance.command.executeInsertElementList(elements),
    insertChartCore: (data: any) => {
      const p = data && typeof data === 'object' ? data : {}
      const chartType = String((p as any).chartType || '').trim() || 'bar'
      const subtypeRaw = String((p as any).subtype || '').trim()
      const subtype = subtypeRaw || `${chartType}-basic`
      const configRaw = (p as any).config && typeof (p as any).config === 'object' ? (p as any).config : {}
      const config = {
        title: configRaw.title ?? '示例数据',
        showLegend: configRaw.showLegend ?? true,
        ...configRaw
      }
      const ds = (p as any).dataSource && typeof (p as any).dataSource === 'object' ? (p as any).dataSource : {}

      const ctx = editorInstance.command.getRangeContext?.()
      const currentTableId =
        ctx?.isTable && ctx.tableElement && (ctx.tableElement as any).id
          ? String((ctx.tableElement as any).id)
          : ''

      // 优先使用从ChartDialog传递的tableData
      const tableDataFromDialog = (p as any).tableData
      const dataSource =
        tableDataFromDialog
          ? {
              type: 'manual',
              manualData: tableDataFromDialog
            }
          : (ds as any).type === 'manual' && (ds as any).manualData
            ? {
                type: 'manual',
                manualData: (ds as any).manualData
              }
            : (ds as any).type === 'table' && (ds as any).tableId
              ? {
                  type: 'table',
                  tableId: (ds as any).tableId,
                  range: (ds as any).range
                }
              : currentTableId
                ? {
                    type: 'table',
                    tableId: currentTableId,
                    range: (ds as any).range
                  }
                : {
                    type: 'manual',
                    manualData: getChartSampleManualData(chartType, subtype)
                  }
      const width = Number.isFinite(Number((p as any).width)) ? Number((p as any).width) : 420
      const height = Number.isFinite(Number((p as any).height)) ? Number((p as any).height) : 320
      editorInstance.command.executeInsertChart({
        ...(p as any),
        chartType,
        subtype,
        dataSource,
        config,
        width,
        height
      })
    },
    updateChartCore: (id: string, patch: any) => editorInstance.command.executeUpdateChart(id, patch),
    setGroup: () => editorInstance.command.executeSetGroup(),
    deleteGroup: (id: string) => editorInstance.command.executeDeleteGroup(id),
    locationGroup: (id: string) => editorInstance.command.executeLocationGroup(id),
    // 撤销/重做/格式刷/清除格式
    undo: () => editorInstance.command.executeUndo(),
    redo: () => editorInstance.command.executeRedo(),
    cut: () => editorInstance.command.executeCut?.(),
    copy: () => editorInstance.command.executeCopy?.(),
    paste: () => editorInstance.command.executePaste?.(),
    pasteNoFormat: () => (editorInstance.command.executePasteNoFormat ? editorInstance.command.executePasteNoFormat() : editorInstance.command.executePaste?.()),
    selectAll: () => editorInstance.command.executeSelectAll?.(),
    delete: () => editorInstance.command.executeBackspace?.(),
    painter: (args: any) => editorInstance.command.executePainter(args),
    format: () => editorInstance.command.executeFormat(),

    // 字体相关
    font: (family: string) => editorInstance.command.executeFont(family),
    size: (size: number) => editorInstance.command.executeSize(size),
    characterScale: (value: number) =>
      editorInstance.command.executeCharacterScale(value),
    sizeAdd: () => editorInstance.command.executeSizeAdd(),
    sizeMinus: () => editorInstance.command.executeSizeMinus(),

    // 文本样式
    bold: () => editorInstance.command.executeBold(),
    italic: () => editorInstance.command.executeItalic(),
    underline: (args?: any) => editorInstance.command.executeUnderline(args),
    strikeout: () => editorInstance.command.executeStrikeout(),
    superscript: () => editorInstance.command.executeSuperscript(),
    subscript: () => editorInstance.command.executeSubscript(),
    color: (color: string) => editorInstance.command.executeColor(color),
    highlight: (color: string) => editorInstance.command.executeHighlight(color),

    // 段落样式
    title: (level: any) => editorInstance.command.executeTitle(level),
    rowFlex: (flex: any) => editorInstance.command.executeRowFlex(flex),
    rowMargin: (margin: any) => {
      const v = Number(margin)
      if (!Number.isFinite(v)) return
      editorInstance.command.executeRowMargin(v)
    },
    indentStep: (direction: any) => editorInstance.command.execute('indentStep', direction),
    list: (type: any, style: any) => editorInstance.command.executeList(type, style),
    lineHeight: (height: number) => editorInstance.command.executeLineHeight(height),

    firstLineIndent: (indentPx: number) => {
      const v = typeof indentPx === 'number' && Number.isFinite(indentPx) ? indentPx : 0
      editorInstance.command.executeParagraphFirstLineIndent(v)
    },

    getFirstLineIndent: () => editorInstance.command.execute('getFirstLineIndent'),

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
    pageBreak: () => editorInstance.command.executePageBreak(),
    columnBreak: () => {
      // 分栏符：在分栏布局中插入分栏中断
      // 当前编辑器核心暂不支持，使用换行符替代
      editorInstance.command.executeInsertElementList([{
        value: '\n'
      }])
    },
    lineBreak: () => {
      // 换行符：插入软换行（不产生新段落）
      editorInstance.command.executeInsertElementList([{
        value: '\n'
      }])
    },
    sectionBreakNextPage: () => {
      // 下一页分节符：使下一节从新页面开始
      editorInstance.command.executePageBreak()
    },
    sectionBreakContinuous: () => {
      // 连续分节符：不换页的分节
      // 当前编辑器核心暂不支持，插入分隔线作为视觉标记
      editorInstance.command.executeSeparator([0, 0])
    },
    sectionBreakEvenPage: () => {
      // 偶数页分节符：使下一节从偶数页开始
      editorInstance.command.executePageBreak()
    },
    sectionBreakOddPage: () => {
      // 奇数页分节符：使下一节从奇数页开始
      editorInstance.command.executePageBreak()
    },

    // 表格
    insertTable: (payload: {
      rows: number,
      cols: number
    }) => editorInstance.command.executeInsertTable(payload.rows, payload.cols),
    tableBorderType: (borderType: any) => {
      const t = String(borderType || '').trim().toLowerCase()
      const resolved =
        t === 'none' || t === 'empty' || t === 'no'
          ? (TableBorder as any).NONE ?? borderType
          : t === 'outside' || t === 'external' || t === 'box'
            ? (TableBorder as any).OUTSIDE ?? borderType
            : (TableBorder as any).ALL ?? borderType
      editorInstance.command.executeTableBorderType(resolved)
    },
    tableBorderColor: (color: string) =>
      editorInstance.command.executeTableBorderColor(color),
    tableBorderWidth: (width: number) =>
      editorInstance.command.executeTableBorderWidth(width),
    tableBorderExternalWidth: (width: number) =>
      editorInstance.command.executeTableBorderExternalWidth(width),

    // 图片
    image: (args: any) => {
      if (args) {
        // 如果是字符串（dataUrl），需要先加载获取尺寸
        if (typeof args === 'string') {
          const img = new Image()
          img.onload = () => {
            editorInstance.command.executeImage({
              value: args,
              width: img.width,
              height: img.height
            })
          }
          img.src = args
        } else {
          editorInstance.command.executeImage(args)
        }
      } else {
        // 弹出文件选择逻辑
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.onchange = (e: any) => {
          const file = e.target.files[0]
          if (file) {
            const reader = new FileReader()
            reader.onload = (evt) => {
              const dataUrl = evt.target?.result as string
              const img = new Image()
              img.onload = () => {
                editorInstance.command.executeImage({
                  value: dataUrl,
                  width: img.width,
                  height: img.height
                })
              }
              img.src = dataUrl
            }
            reader.readAsDataURL(file)
          }
        }
        input.click()
      }
    },

    // 音频
    audio: (args?: any) => {
      if (args && typeof args === 'string') {
        // 直接提供 URL
        editorInstance.command.executeInsertAudio(args, {
          name: '音频文件'
        })
      } else if (args && args.src) {
        // 提供完整配置
        editorInstance.command.executeInsertAudio(args.src, {
          name: args.name,
          width: args.width,
          height: args.height,
          poster: args.poster
        })
      } else {
        // 弹出文件选择
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'audio/*'
        input.onchange = (e: any) => {
          const file = e.target.files[0]
          if (file) {
            const reader = new FileReader()
            reader.onload = (evt) => {
              const dataUrl = evt.target?.result as string
              editorInstance.command.executeInsertAudio(dataUrl, {
                name: file.name
              })
            }
            reader.readAsDataURL(file)
          }
        }
        input.click()
      }
    },

    // 视频
    video: (args?: any) => {
      if (args && typeof args === 'string') {
        // 直接提供 URL
        editorInstance.command.executeInsertVideo(args)
      } else if (args && args.src) {
        // 提供完整配置
        editorInstance.command.executeInsertVideo(args.src, {
          width: args.width,
          height: args.height,
          poster: args.poster
        })
      } else {
        // 弹出文件选择
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'video/*'
        input.onchange = (e: any) => {
          const file = e.target.files[0]
          if (file) {
            const reader = new FileReader()
            reader.onload = (evt) => {
              const dataUrl = evt.target?.result as string
              editorInstance.command.executeInsertVideo(dataUrl)
            }
            reader.readAsDataURL(file)
          }
        }
        input.click()
      }
    },

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
    separator: (payload: any) => {
      // 支持多种参数格式
      // 格式1: [type, width, dashArray] - 从工具栏传递
      // 格式2: { type, width, dashArray } - 对象格式
      // 格式3: dashArray - 旧格式兼容

      let separatorOptions: any = {
        lineType: 'solid',
        lineWidth: 1,
        dashArray: [0, 0]
      }

      if (Array.isArray(payload)) {
        if (payload.length === 3) {
          // [type, width, dashArray]
          separatorOptions.lineType = payload[0]
          separatorOptions.lineWidth = payload[1]
          separatorOptions.dashArray = payload[2]
        } else {
          // 旧格式：dashArray
          separatorOptions.dashArray = payload
        }
      } else if (typeof payload === 'object' && payload !== null) {
        // 对象格式
        separatorOptions.lineType = payload.type || 'solid'
        separatorOptions.lineWidth = payload.width || 1
        separatorOptions.dashArray = payload.dashArray || [0, 0]
      }

      // 调用底层的分割线插入方法
      // 注意：这里需要根据不同的类型生成不同的分割线
      editorInstance.command.executeSeparator(separatorOptions)
    },

    // 水印
    addWatermark: (payload?: any) => {
      if (payload) {
        editorInstance.command.executeAddWatermark({
          data: payload.data || payload.content || '',
          color: payload.color,
          opacity: payload.opacity,
          size: payload.size,
          font: payload.font,
          repeat: payload.repeat
        })
      }
    },
    deleteWatermark: () => editorInstance.command.executeDeleteWatermark(),

    // LaTeX
    latex: () => {
      // 由App.vue处理弹出对话框
    },
    insertLatex: (latex: string) => {
      if (latex) {
        editorInstance.command.executeInsertElementList([{
          type: 'latex',
          value: latex
        }])
      }
    },

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
    search: (text: string | null) => editorInstance.command.executeSearch(text),
    searchNavigatePre: () => editorInstance.command.executeSearchNavigatePre(),
    searchNavigateNext: () => editorInstance.command.executeSearchNavigateNext(),
    replace: (text: string) => editorInstance.command.executeReplace(text),
    replaceAll: (searchText: string, replaceText: string) => editorInstance.command.executeReplaceAll?.(searchText, replaceText),

    tocInsert: async (payload: any) => {
      await editorInstance.command.execute('tocInsert', payload)
    },

    tocRemove: () => {
      editorInstance.command.execute('tocRemove')
    },

    // 打印
    print: () => editorInstance.command.executePrint(),

    locationCatalog: (id: string) => {
      editorInstance.command.executeLocationCatalog(id)
    },

    pageJump: (index: number) => {
      const pageHeight = editorInstance.command.getPaperHeight()
      const options = editorInstance.command.getOptions()
      const pageGap = options.pageGap * (options.scale || 1)
      const container = editorContainer.value?.parentElement
      if (container) {
        // 加上容器的顶部外边距 (40px)
        const containerPadding = 40
        container.scrollTop = index * (pageHeight + pageGap) + containerPadding
      }
    },

    // 页面模式
    pageMode: (mode: string) => editorInstance.command.executePageMode(mode),

    // 页面缩放
    pageScale: (scale: number) => editorInstance.command.executePageScale(scale),
    pageScaleRecovery: () => editorInstance.command.executePageScaleRecovery(),
    pageScaleAdd: () => editorInstance.command.executePageScaleAdd(),
    pageScaleMinus: () => editorInstance.command.executePageScaleMinus(),

    // 纸张设置
    paperSize: (width: number, height: number) => editorInstance.command.executePaperSize(width, height),
    paperDirection: (direction: string) => editorInstance.command.executePaperDirection(direction),
    setPaperMargin: (margin: number[]) => editorInstance.command.executeSetPaperMargin(margin),
    setPaperBackground: (color: string) => {
      applyOptionsPatch({ background: { color } })
    },

    refreshThumbnails: () => refreshThumbnails(),
    insertBlankPageBefore: (direction?: string) => insertBlankPageBefore(direction),

    columns: (value: any) => editorInstance.command.executeColumns?.(value),

    // 模式切换
    mode: (mode: string) => editorInstance.command.executeMode(mode),

    // 签名 - 现在由 App.vue 处理
    signature: () => {
      emit('command', 'signature')
    },

    // 条形码
    barcode: (content: string) => {
      editorInstance.command.execute('barcode', content)
    },

    qrcode: async (content: string) => {
      await editorInstance.command.execute('qrcode', content)
    },

    // 插入元素 (形状等)
    insertElement: (payload: any) => {
      editorInstance.command.executeInsertElementList([{
        type: payload.type || 'text',
        value: payload.value
      }])
    },


    // 页眉页脚
    header: () => {
      // 切换到页眉编辑模式
      editorInstance.command.executeSetZone('header')
    },
    footer: () => {
      // 切换到页脚编辑模式
      editorInstance.command.executeSetZone('footer')
    },
    mainZone: () => {
      // 切换到主体编辑模式
      editorInstance.command.executeSetZone('main')
    },
    clearHeader: () => {
      editorInstance.command.executeSetZone('header')
      editorInstance.command.executeSelectAll()
      editorInstance.command.executeBackspace()
      editorInstance.command.executeSetZone('main')
    },
    clearFooter: () => {
      editorInstance.command.executeSetZone('footer')
      editorInstance.command.executeSelectAll()
      editorInstance.command.executeBackspace()
      editorInstance.command.executeSetZone('main')
    },

    // 设置页码
    setPageNumber: (payload: any) => {
      const currentOptions = editorInstance.command.getOptions?.() || {}
      editorInstance.command.executeUpdateOptions({
        ...currentOptions,
        pageNumber: {
          ...(currentOptions.pageNumber || {}),
          ...payload
        }
      })
    },

    // 导入 Word 文档
    importWord: async (payload: any) => {
      // 支持旧的直接传入 File/ArrayBuffer 方式
      let file: File | ArrayBuffer
      let onProgress: ((progress: number, status: string) => void) | undefined
      let onComplete: ((success: boolean, message?: string) => void) | undefined

      if (payload instanceof File || payload instanceof ArrayBuffer) {
        file = payload
      } else if (payload && payload.file) {
        file = payload.file
        onProgress = payload.onProgress
        onComplete = payload.onComplete
      } else {
        console.error('[Editor] importWord: 无效的参数')
        onComplete?.(false, '无效的文件')
        return
      }

      try {

        // 更新进度: 读取文件
        onProgress?.(10, '正在读取文件...')

        // 如果是 File，先转换为 ArrayBuffer
        let arrayBuffer: ArrayBuffer
        let fileName = ''
        let fileSize = ''
        if (file instanceof File) {
          arrayBuffer = await file.arrayBuffer()
          fileName = file.name
          // 格式化文件大小
          const size = file.size
          if (size < 1024) {
            fileSize = size + ' B'
          } else if (size < 1024 * 1024) {
            fileSize = (size / 1024).toFixed(1) + ' KB'
          } else {
            fileSize = (size / (1024 * 1024)).toFixed(1) + ' MB'
          }
        } else {
          arrayBuffer = file
        }

        // 立即显示通知，显示解析进度
        const action = await new Promise<string>((resolve) => {
          // 发送解析进度 0%
          emit('command', 'importConfirm', {
            resolve,
            fileName,
            fileSize,
            parseProgress: 0
          })

          // 异步执行解析
          ;(async () => {
            try {
              // 更新进度: 解析文档
              emit('command', 'importParseProgress', 30)

              const editorOptions = editorInstance?.command?.getOptions?.()
              const margins =
                editorOptions?.paperDirection === PaperDirection.HORIZONTAL
                  ? [
                      editorOptions.margins[1],
                      editorOptions.margins[2],
                      editorOptions.margins[3],
                      editorOptions.margins[0]
                    ]
                  : editorOptions?.margins
              const targetInnerWidth =
                editorOptions?.width && margins
                  ? editorOptions.width - margins[1] - margins[3]
                  : undefined

              emit('command', 'importParseProgress', 50)

              const { EchartsChartRenderer } = await import('@vervedoc/docx-editor-chart')
              const echartsMod = await import('echarts')
              const result = await parseDocx(arrayBuffer, {
                targetInnerWidth,
                tableWidthMode: 'word',
                defaultTableRowHeight: editorOptions?.table?.defaultTrHeight,
                defaultTableTdPadding: editorOptions?.table?.tdPadding,
                forceDefaultLineHeight: editorOptions?.defaultLineHeight,
                chartRenderer: new EchartsChartRenderer(echartsMod)
              })

              emit('command', 'importParseProgress', 90)

              if (!result.success || result.elements.length === 0) {
                console.error('[Editor] Word 文档解析失败:', result.error)
                // 解析失败，关闭通知
                emit('command', 'importParseComplete')
                onComplete?.(false, result.error || '解析失败')
                return
              }

              // 解析完成，更新状态
              emit('command', 'importParseComplete')

              // 存储解析结果，等待用户选择
              ;(window as any).__importWordResult = result

            } catch (err) {
              console.error('[Editor] Word 解析出错:', err)
              emit('command', 'importParseComplete')
              onComplete?.(false, '解析失败')
            }
          })()
        })

        if (action === 'cancel') {
          onComplete?.(false, '已取消导入')
          return
        }


        // 获取解析结果
        const result = (window as any).__importWordResult
        delete (window as any).__importWordResult

        if (!result) {
          onComplete?.(false, '解析结果丢失')
          return
        }

        // 更新进度: 渲染内容
        onProgress?.(70, '正在渲染内容...')

        // 根据用户选择处理内容
        if (action === 'append') {
          // 追加模式：获取当前内容并追加新内容
          const currentValue = editorInstance.command.getValue()
          const currentElements = currentValue?.data?.main || []
          const combinedElements = [...currentElements, ...result.elements]
          editorInstance.command.executeSetValue({
            main: combinedElements
          })
        } else {
          // 新文档导入模式：更新文档 meta，然后设置新内容
          const docName = fileName.replace(/\.docx?$/i, '') || '新建文档'
          emit('command', 'importNewDoc', { fileName: docName })
          editorInstance.command.executeSetValue({
            main: result.elements
          })
        }

        // 立即触发保存，并等待保存+重新加载完成
        onProgress?.(80, '正在保存...')
        await new Promise<void>((resolve) => {
          emit('command', 'importFinished', {
            source: 'word',
            comments: result.comments,
            onSaveComplete: resolve
          })
        })

        // 导入后触发目录提取，使右侧目录 dialog 显示标题
        nextTick(() => {
          void refreshCatalog()
        })

        // 更新进度: 完成
        onProgress?.(100, '导入完成!')
        onComplete?.(true)

      } catch (error) {
        console.error('[Editor] Word 导入出错:', error)
        const errorMessage = error instanceof Error ? error.message : '导入失败'
        onComplete?.(false, errorMessage)
      }
    },

    importWordFromUrl: async (payload: any) => {
      const url = payload?.url
      const onProgress: ((progress: number, status: string) => void) | undefined = payload?.onProgress
      const onComplete: ((success: boolean, message?: string) => void) | undefined = payload?.onComplete
      if (!url || typeof url !== 'string') {
        onComplete?.(false, '无效的地址')
        return
      }
      try {
        onProgress?.(10, '正在请求文档...')
        const resp = await fetch(url, resolveFetchInit(payload))
        if (!resp.ok) {
          onComplete?.(false, `请求失败: ${resp.status}`)
          return
        }
        onProgress?.(25, '正在读取内容...')
        const arrayBuffer = await resp.arrayBuffer()
        onProgress?.(35, '正在解析文档结构...')

        const editorOptions = editorInstance?.command?.getOptions?.()
        const margins =
          editorOptions?.paperDirection === PaperDirection.HORIZONTAL
            ? [
                editorOptions.margins[1],
                editorOptions.margins[2],
                editorOptions.margins[3],
                editorOptions.margins[0]
              ]
            : editorOptions?.margins
        const targetInnerWidth =
          editorOptions?.width && margins
            ? editorOptions.width - margins[1] - margins[3]
            : undefined

        const { EchartsChartRenderer } = await import('@vervedoc/docx-editor-chart')
        const echartsMod = await import('echarts')
        const result = await parseDocx(arrayBuffer, {
          targetInnerWidth,
          tableWidthMode: 'word',
          defaultTableRowHeight: editorOptions?.table?.defaultTrHeight,
          defaultTableTdPadding: editorOptions?.table?.tdPadding,
          forceDefaultLineHeight: editorOptions?.defaultLineHeight,
          chartRenderer: new EchartsChartRenderer(echartsMod)
        })


        if (!result.success || result.elements.length === 0) {
          onComplete?.(false, result.error || '解析失败')
          return
        }

        onProgress?.(75, '正在渲染内容...')
        editorInstance.command.executeSetValue({ main: result.elements })
        // 导入后触发目录提取 + 传递批注数据
        nextTick(() => {
          void refreshCatalog()
          if (result.comments?.length) {
            emit('command', 'commentsLoaded', result.comments)
          }
        })
        onProgress?.(100, '加载完成!')
        onComplete?.(true)
      } catch (e) {
        const msg = e instanceof Error ? e.message : '加载失败'
        onComplete?.(false, msg)
      }
    },

    importCanvasFromUrl: async (payload: any) => {
      const url = payload?.url
      const onProgress: ((progress: number, status: string) => void) | undefined = payload?.onProgress
      const onComplete: ((success: boolean, message?: string) => void) | undefined = payload?.onComplete
      if (!url || typeof url !== 'string') {
        onComplete?.(false, '无效的地址')
        return
      }
      try {
        onProgress?.(10, '正在请求文档...')
        const fetchInit = resolveFetchInit(payload)
        const resp = await fetch(url, { ...fetchInit, cache: 'no-store' })
        if (!resp.ok) {
          onComplete?.(false, `请求失败: ${resp.status}`)
          return
        }
        onProgress?.(40, '正在解析数据...')
        const json = await resp.json()
        const main = Array.isArray(json) ? json : Array.isArray(json?.main) ? json.main : Array.isArray(json?.data?.main) ? json.data.main : null
        if (!Array.isArray(main) || main.length === 0) {
          onComplete?.(false, '数据为空或格式不正确')
          return
        }
        onProgress?.(80, '正在渲染内容...')
        editorInstance.command.executeSetValue({ main })
        // 导入后触发目录提取
        nextTick(() => {
          void refreshCatalog()
        })
        onProgress?.(100, '加载完成!')
        onComplete?.(true)
      } catch (e) {
        const msg = e instanceof Error ? e.message : '加载失败'
        onComplete?.(false, msg)
      }
    },

    exportDocx: async (payload: any) => {
      await editorInstance.command.execute('exportDocx', payload)
    },

    previewHtml: (payload: any) => {
      editorInstance.command.execute('previewHtml', payload)
    },

    acceptAllRevisions: () => {
      const overlay = editorInstance.command.getRevisionOverlay?.()
      if (overlay) overlay.acceptAllRevisions()
    },
    rejectAllRevisions: () => {
      const overlay = editorInstance.command.getRevisionOverlay?.()
      if (overlay) overlay.rejectAllRevisions()
    },
    acceptRevisionById: (id: string) => {
      const overlay = editorInstance.command.getRevisionOverlay?.()
      if (overlay) overlay.acceptRevision(id)
    },
    rejectRevisionById: (id: string) => {
      const overlay = editorInstance.command.getRevisionOverlay?.()
      if (overlay) overlay.rejectRevision(id)
    },
    locateRevision: (id: string) => {
      const overlay = editorInstance.command.getRevisionOverlay?.()
      if (overlay) {
        const _revisions = overlay.getRevisions?.() ?? []
        const elementList = editorInstance.command.getElementList?.() ?? []
        let firstIndex = -1
        for (let i = 0; i < elementList.length; i++) {
          if (elementList[i].revisionId === id) {
            firstIndex = i
            break
          }
        }
        if (firstIndex >= 0) {
          editorInstance.command.executeSetRange({ startIndex: firstIndex, endIndex: firstIndex })
        }
      }
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
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  margin: 40px 0;
}
</style>
