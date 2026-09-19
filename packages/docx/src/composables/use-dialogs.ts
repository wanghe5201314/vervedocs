import { ref } from 'vue'

/**
 * 对话框可见状态管理 composable
 * @param options 配置项
 * @returns 各对话框可见状态与确认处理函数
 */
export function useDialogs(options: {
  /** 执行编辑器命令 */
  executeCommand: (command: string, ...args: any[]) => void
}) {
  const { executeCommand } = options

  /** 快捷键对话框是否可见 */
  const shortcutsDialogVisible = ref(false)
  /** 超链接对话框是否可见 */
  const hyperlinkDialogVisible = ref(false)
  /** 书签对话框是否可见 */
  const bookmarkDialogVisible = ref(false)
  /** 插入表格对话框是否可见 */
  const insertTableDialogVisible = ref(false)
  /** 表格边框对话框是否可见 */
  const tableBordersDialogVisible = ref(false)

  /** LaTeX 公式对话框是否可见 */
  const latexDialogVisible = ref(false)
  /** 条形码对话框是否可见 */
  const barcodeDialogVisible = ref(false)
  /** 二维码对话框是否可见 */
  const qrcodeDialogVisible = ref(false)
  /** 签名对话框是否可见 */
  const signatureDialogVisible = ref(false)
  /** 水印对话框是否可见 */
  const watermarkDialogVisible = ref(false)
  /** 纸张大小对话框是否可见 */
  const paperSizeDialogVisible = ref(false)

  /** 日期对话框是否可见 */
  const dateDialogVisible = ref(false)
  /** 段落对话框是否可见 */
  const paragraphDialogVisible = ref(false)
  /** 目录对话框是否可见 */
  const tocDialogVisible = ref(false)
  /** AI 设置对话框是否可见 */
  const aiSettingsDialogVisible = ref(false)
  /** 版本历史对话框是否可见 */
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
    executeCommand('barcode', {
      value: data.imageDataUrl,
      width: data.width,
      height: data.height
    })
  }

  /**
   * 处理二维码确认
   * @param data 二维码图像数据
   */
  const handleQrcodeConfirm = (data: { imageDataUrl: string; width: number; height: number }) => {
    executeCommand('qrcode', {
      value: data.imageDataUrl,
      width: data.width,
      height: data.height
    })
  }

  /**
   * 处理签名确认
   * @param dataUrl 签名图像数据 URL
   */
  const handleSignatureConfirm = (dataUrl: string) => {
    executeCommand('signatureImage', dataUrl)
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

    latexDialogVisible,
    barcodeDialogVisible,
    qrcodeDialogVisible,
    signatureDialogVisible,
    watermarkDialogVisible,
    paperSizeDialogVisible,

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

    handleDateConfirm,
    handleTocConfirm,

    handleInsertTableDialogConfirm,
    handleTableBordersConfirm
  }
}
