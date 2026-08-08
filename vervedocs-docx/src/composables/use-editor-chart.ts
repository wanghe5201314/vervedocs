// @ts-ignore
import { getChartSampleManualData } from '@/utils/chartSampleData'

interface EditorCommand {
  getRangeContext?: () => any
  executeInsertChart: (payload: any) => void
  executeUpdateChart: (id: string, patch: any) => void
}

interface EditorInstance {
  command: EditorCommand
}

export function useEditorChart(options: {
  getEditorInstance: () => EditorInstance | null
}) {
  const { getEditorInstance } = options

  function insertChartCore(data: any) {
    const instance = getEditorInstance()
    if (!instance) return
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

    const ctx = instance.command.getRangeContext?.()
    const currentTableId =
      ctx?.isTable && ctx.tableElement && (ctx.tableElement as any).id
        ? String((ctx.tableElement as any).id)
        : ''

    const tableDataFromDialog = (p as any).tableData
    const dataSource =
      tableDataFromDialog
        ? { type: 'manual', manualData: tableDataFromDialog }
        : (ds as any).type === 'manual' && (ds as any).manualData
          ? { type: 'manual', manualData: (ds as any).manualData }
          : (ds as any).type === 'table' && (ds as any).tableId
            ? { type: 'table', tableId: (ds as any).tableId, range: (ds as any).range }
            : currentTableId
              ? { type: 'table', tableId: currentTableId, range: (ds as any).range }
              : { type: 'manual', manualData: getChartSampleManualData(chartType, subtype) }
    const width = Number.isFinite(Number((p as any).width)) ? Number((p as any).width) : 420
    const height = Number.isFinite(Number((p as any).height)) ? Number((p as any).height) : 320
    instance.command.executeInsertChart({
      ...(p as any),
      chartType,
      subtype,
      dataSource,
      config,
      width,
      height
    })
  }

  function updateChartCore(id: string, patch: any) {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeUpdateChart(id, patch)
  }

  return { insertChartCore, updateChartCore }
}