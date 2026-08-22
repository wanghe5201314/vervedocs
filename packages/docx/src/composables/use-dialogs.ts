import { ref } from 'vue'
import type { DocumentMeta } from '@/types/document'

export function useDialogs(options: {
  executeCommand: (command: string, ...args: any[]) => void
  documentMeta: DocumentMeta
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

  const openShortcuts = () => {
    shortcutsDialogVisible.value = true
  }


  const handleHyperlinkConfirm = (data: { text: string; url: string }) => {
    executeCommand('hyperlink', data)
  }

  const handleLatexConfirm = (latex: string) => {
    executeCommand('insertLatex', latex)
  }

  const handleBarcodeConfirm = (data: { imageDataUrl: string; width: number; height: number }) => {
    executeCommand('image', {
      value: data.imageDataUrl,
      width: data.width,
      height: data.height
    })
  }

  const handleQrcodeConfirm = (content: string) => {
    executeCommand('qrcode', content)
  }

  const handleSignatureConfirm = (dataUrl: string) => {
    executeCommand('image', dataUrl)
  }

  const handleWatermarkConfirm = (data: any) => {
    executeCommand('addWatermark', data)
  }

  const handlePaperSizeConfirm = (data: { widthPx: number; heightPx: number }) => {
    executeCommand('paperSize', data.widthPx, data.heightPx)
  }

  const handlePageNumberConfirm = (data: any) => {
    executeCommand('setPageNumber', data)
  }

  const handleDateConfirm = (data: { format: string; value: string }) => {
    executeCommand('insertDate', data)
  }

  const handleTocConfirm = (data: any) => {
    executeCommand('tocInsert', { mode: 'custom', ...data })
  }

  const handleInsertChartConfirm = (payload: any) => {
    const p = payload && typeof payload === 'object' ? payload : {}
    executeCommand('insertChartCore', {
      chartType: p.chartType,
      subtype: p.subtype,
      tableData: p.tableData
    })
  }

  const handleInsertTableDialogConfirm = (payload: { rows: number; cols: number; border?: any }) => {
    executeCommand('insertTable', { rows: payload.rows, cols: payload.cols })
    const border = payload.border || {}
    const opt = String(border.option || '').trim().toLowerCase()
    const type = opt === 'none' ? 'none' : opt === 'box' ? 'outside' : 'all'
    executeCommand('tableBorderType', type)
    if (border.color) executeCommand('tableBorderColor', String(border.color))
    if (border.width !== undefined) executeCommand('tableBorderWidth', Number(border.width))
  }

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