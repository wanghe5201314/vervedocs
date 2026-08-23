// @ts-ignore
import { getChartSampleManualData } from '@/utils/chartSampleData'

/**
 * 编辑器命令接口（图表相关能力）
 */
interface EditorCommand {
  /** 获取选区上下文 */
  getRangeContext?: () => any
  /** 插入图表 */
  executeInsertChart: (payload: any) => void
  /** 更新指定图表 */
  executeUpdateChart: (id: string, patch: any) => void
}

/**
 * 编辑器实例接口
 */
interface EditorInstance {
  /** 编辑器命令对象 */
  command: EditorCommand
}

/**
 * 图表 composable
 * @param options 配置项
 * @returns 图表插入与更新方法
 */
export function useEditorChart(options: {
  /** 获取编辑器实例 */
  getEditorInstance: () => EditorInstance | null
}) {
  const { getEditorInstance } = options

  /**
   * 插入图表核心逻辑
   * @param data 图表配置数据
   */
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

  /**
   * 更新指定图表
   * @param id 图表标识
   * @param patch 图表属性补丁
   */
  function updateChartCore(id: string, patch: any) {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeUpdateChart(id, patch)
  }

  return { insertChartCore, updateChartCore }
}