/**
 * 编辑器实例接口
 */
interface EditorInstance {
  /** 编辑器命令对象 */
  command: any
}

/**
 * 页面相关 composable（缩放、纸张、页边距、分栏等）
 * @param options 配置项
 * @returns 页面操作方法集合
 */
export function useEditorPage(options: { getEditorInstance: () => EditorInstance | null
  /** 获取编辑器容器元素 */
  getEditorContainer: () => HTMLDivElement | null
  /** 应用编辑器选项补丁 */
  applyOptionsPatch: (patch: any) => void }) {
  const { getEditorInstance, getEditorContainer, applyOptionsPatch } = options

  /**
   * 跳转到指定页码
   * @param index 页码索引（从0开始）
   */
  function pageJump(index: number) {
    const instance = getEditorInstance()
    if (!instance) return
    const pageHeight = instance.command.getPaperHeight()
    const opts = instance.command.getOptions()
    const pageGap = opts.pageGap * (opts.scale || 1)
    const container = getEditorContainer()?.parentElement
    if (container) {
      const containerPadding = 40
      container.scrollTop = index * (pageHeight + pageGap) + containerPadding
    }
  }

  /**
   * 设置页面模式
   * @param mode 页面模式名称
   */
  function pageMode(mode: string) {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executePageMode(mode)
  }

  /**
   * 设置页面缩放比例
   * @param scale 缩放比例
   */
  function pageScale(scale: number) {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executePageScale(scale)
  }
  /** 恢复页面缩放至默认比例 */
  function pageScaleRecovery() {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executePageScaleRecovery()
  }
  /** 增加页面缩放比例 */
  function pageScaleAdd() {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executePageScaleAdd()
  }
  /** 减小页面缩放比例 */
  function pageScaleMinus() {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executePageScaleMinus()
  }

  /**
   * 设置纸张尺寸
   * @param width 纸张宽度
   * @param height 纸张高度
   */
  function paperSize(width: number, height: number) {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executePaperSize(width, height)
  }
  /**
   * 设置纸张方向（纵向/横向）
   * @param direction 纸张方向
   */
  function paperDirection(direction: string) {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executePaperDirection(direction)
  }
  /**
   * 设置页边距
   * @param margin 页边距数组
   */
  function setPaperMargin(margin: number[]) {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeSetPaperMargin(margin)
  }
  /**
   * 设置纸张背景颜色
   * @param color 背景颜色值
   */
  function setPaperBackground(color: string) {
    applyOptionsPatch({ background: { color } })
  }

  /**
   * 设置分栏
   * @param value 分栏配置
   */
  function columns(value: any) {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeColumns?.(value)
  }

  return {
    pageJump, pageMode,
    pageScale, pageScaleRecovery, pageScaleAdd, pageScaleMinus,
    paperSize, paperDirection, setPaperMargin, setPaperBackground,
    columns
  }
}