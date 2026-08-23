import { ref } from 'vue'
import type { DocumentMeta } from '@/types/document'

/**
 * 对话框可见状态管理 composable
 * @param options 配置项
 * @returns 各对话框可见状态与确认处理函数
 */
export function useDialogs(options: {
  /** 执行编辑器命令 */
  executeCommand: (command: string, ...args: any[]) => void
  /** 文档元数据 */
  documentMeta: DocumentMeta
  /** 触发元数据变更事件 */
  emitMetaChange: () => void
}) {
  const { executeCommand } = options

  const shortcutsDialogVisible = ref(false)
  const hyperlinkDialogVisible = ref(false)
  const bookmarkDialogVisible = ref(false)
  const insertTableDialogVisible = ref(false)
  const tableBordersDialogVisible = ref(false)
  const chartDialogVisible = ref(false)
  const latexDialogVisible = ref(false)
  const barcodeDialogVisible = ref(false)
  const qrcodeDialogVisible = ref(false)
  const signatureDialogVisible = ref(false)
  const watermarkDialogVisible = ref(false)
  const paperSizeDialogVisible = ref(false)
  const pageNumberDialogVisible = ref(false)
  const dateDialogVisible = ref(false)
  const paragraphDialogVisible = ref(false)
  const tocDialogVisible = ref(false)
  const aiSettingsDialogVisible = ref(false)
  const versionHistoryDialogVisible = ref(false)

  /** 打开快捷键对话框 */
  const openShortcuts = () => {
    shortcutsDialogVisible.value = true
  }


  /**
   * 处理超链接确认
   * @param data 超链接文本与地址
   */
  const handleHyperlinkConfirm = (data: { text: string; url: string }) => {
    executeCommand('hyperlink', data)
  }

  /**
   * 处理 LaTeX 公式确认
   * @param latex LaTeX 公式字符串
   */
  const handleLatexConfirm = (latex: string) => {
    executeCommand('insertLatex', latex)
  }

  /**
   * 处理条形码确认
   * @param data 条形码图像数据
   */
  const handleBarcodeConfirm = (data: { imageDataUrl: string; width: number; height: number }) => {
    executeCommand('image', {
      value: data.imageDataUrl,
      width: data.width,
      height: data.height
    })
  }

  /**
   * 处理二维码确认
   * @param content 二维码内容
   */
  const handleQrcodeConfirm = (content: string) => {
    executeCommand('qrcode', content)
  }

  /**
   * 处理签名确认
   * @param dataUrl 签名图像数据 URL
   */
  const handleSignatureConfirm = (dataUrl: string) => {
    executeCommand('image', dataUrl)
  }

  /**
   * 处理水印确认
   * @param data 水印配置数据
   */
  const handleWatermarkConfirm = (data: any) => {
    executeCommand('addWatermark', data)
  }

  /**
   * 处理纸张大小确认
   * @param data 纸张宽高数据
   */
  const handlePaperSizeConfirm = (data: { widthPx: number; heightPx: number }) => {
    executeCommand('paperSize', data.widthPx, data.heightPx)
  }

  /**
   * 处理页码确认
   * @param data 页码配置数据
   */
  const handlePageNumberConfirm = (data: any) => {
    executeCommand('setPageNumber', data)
  }

  /**
   * 处理日期插入确认
   * @param data 日期格式与值
   */
  const handleDateConfirm = (data: { format: string; value: string }) => {
    executeCommand('insertDate', data)
  }

  /**
   * 处理目录插入确认
   * @param data 目录配置数据
   */
  const handleTocConfirm = (data: any) => {
    executeCommand('tocInsert', { mode: 'custom', ...data })
  }

  /**
   * 处理插入图表确认
   * @param payload 图表配置数据
   */
  const handleInsertChartConfirm = (payload: any) => {
    const p = payload && typeof payload === 'object' ? payload : {}
    executeCommand('insertChartCore', {
      chartType: p.chartType,
      subtype: p.subtype,
      tableData: p.tableData
    })
  }

  /**
   * 处理插入表格确认
   * @param payload 表格行列与边框配置
   */
  const handleInsertTableDialogConfirm = (payload: { rows: number; cols: number; border?: any }) => {
    executeCommand('insertTable', { rows: payload.rows, cols: payload.cols })
    const border = payload.border || {}
    const opt = String(border.option || '').trim().toLowerCase()
    const type = opt === 'none' ? 'none' : opt === 'box' ? 'outside' : 'all'
    executeCommand('tableBorderType', type)
    if (border.color) executeCommand('tableBorderColor', String(border.color))
    if (border.width !== undefined) executeCommand('tableBorderWidth', Number(border.width))
  }

  /**
   * 处理表格边框确认
   * @param payload 边框类型、颜色与宽度配置
   */
  const handleTableBordersConfirm = (payload: { type: 'all' | 'outside' | 'none'; color: string; width: number; externalWidth: number }) => {
    executeCommand('tableBorderType', payload.type)
    executeCommand('tableBorderColor', payload.color)
    executeCommand('tableBorderWidth', payload.width)
    executeCommand('tableBorderExternalWidth', payload.externalWidth)
  }

  return {
    shortcutsDialogVisible,

    hyperlinkDialogVisible,
    bookmarkDialogVisible,
    insertTableDialogVisible,
    tableBordersDialogVisible,
    chartDialogVisible,
    latexDialogVisible,
    barcodeDialogVisible,
    qrcodeDialogVisible,
    signatureDialogVisible,
    watermarkDialogVisible,
    paperSizeDialogVisible,
    pageNumberDialogVisible,
    dateDialogVisible,
    paragraphDialogVisible,
    tocDialogVisible,
    aiSettingsDialogVisible,
    versionHistoryDialogVisible,
    openShortcuts,

    handleHyperlinkConfirm,
    handleLatexConfirm,
    handleBarcodeConfirm,
    handleQrcodeConfirm,
    handleSignatureConfirm,
    handleWatermarkConfirm,
    handlePaperSizeConfirm,
    handlePageNumberConfirm,
    handleDateConfirm,
    handleTocConfirm,
    handleInsertChartConfirm,
    handleInsertTableDialogConfirm,
    handleTableBordersConfirm
  }
}