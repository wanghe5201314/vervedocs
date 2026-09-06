/**
 * 编辑器实例接口
 */
interface EditorInstance {
  /** 编辑器命令对象 */
  command: any
}

/**
 * 编辑器格式化命令 composable
 * @param options 配置项
 * @returns 包含撤销/重做、剪贴板、字体、段落等格式化方法的对象
 */
export function useEditorFormat(options: {
  /** 获取编辑器实例 */
  getEditorInstance: () => EditorInstance | null
}) {
  const { getEditorInstance } = options

  /** 撤销上一步操作 */
  function undo() {
    const i = getEditorInstance()
    i?.command.executeUndo()
  }
  /** 重做上一步撤销的操作 */
  function redo() {
    const i = getEditorInstance()
    i?.command.executeRedo()
  }
  /** 剪切选中的内容 */
  function cut() {
    const i = getEditorInstance()
    i?.command.executeCut?.()
  }
  /** 复制选中的内容 */
  function copy() {
    const i = getEditorInstance()
    i?.command.executeCopy?.()
  }
  /** 粘贴剪贴板内容 */
  function paste() {
    const i = getEditorInstance()
    i?.command.executePaste?.()
  }
  /** 无格式粘贴剪贴板内容 */
  function pasteNoFormat() {
    const i = getEditorInstance()
    if (!i) return
    i.command.executePasteNoFormat()
  }
  /** 全选文档内容 */
  function selectAll() {
    const i = getEditorInstance()
    i?.command.executeSelectAll?.()
  }
  /** 删除选中的内容 */
  function deleteFn() {
    const i = getEditorInstance()
    i?.command.executeBackspace?.()
  }
  /**
   * 应用格式刷
   * @param args 格式刷参数
   * @returns 无返回值
   */
  function painter(args: any) {
    const i = getEditorInstance()
    i?.command.executePaintFormat(args)
  }
  /** 清除选中内容的格式 */
  function format() {
    const i = getEditorInstance()
    i?.command.executeClearFormat()
  }

  /**
   * 设置字体族
   * @param family 字体名称
   * @returns 无返回值
   */
  function font(family: string) {
    const i = getEditorInstance()
    i?.command.executeSetFont(family)
  }
  /**
   * 设置字号
   * @param size 字号数值
   * @returns 无返回值
   */
  function size(size: number) {
    const i = getEditorInstance()
    i?.command.executeSetSize(size)
  }
  /**
   * 设置字符缩放比例
   * @param value 缩放比例
   * @returns 无返回值
   */
  function characterScale(value: number) {
    const i = getEditorInstance()
    i?.command.executeSetCharacterScale(value)
  }
  /** 增大字号 */
  function sizeAdd() {
    const i = getEditorInstance()
    i?.command.executeSizeAdd()
  }
  /** 减小字号 */
  function sizeMinus() {
    const i = getEditorInstance()
    i?.command.executeSizeMinus()
  }

  /** 切换加粗 */
  function bold() {
    const i = getEditorInstance()
    i?.command.executeSetBold()
  }
  /** 切换斜体 */
  function italic() {
    const i = getEditorInstance()
    i?.command.executeSetItalic()
  }
  /**
   * 设置下划线
   * @param args 下划线参数
   * @returns 无返回值
   */
  function underline(args?: any) {
    const i = getEditorInstance()
    i?.command.executeSetUnderline(args)
  }
  /** 切换删除线 */
  function strikeout() {
    const i = getEditorInstance()
    i?.command.executeSetStrikeout()
  }
  /** 切换上标 */
  function superscript() {
    const i = getEditorInstance()
    i?.command.executeSetSuperscript()
  }
  /** 切换下标 */
  function subscript() {
    const i = getEditorInstance()
    i?.command.executeSetSubscript()
  }
  /**
   * 设置字体颜色
   * @param color 颜色值
   * @returns 无返回值
   */
  function color(color: string) {
    const i = getEditorInstance()
    i?.command.executeSetColor(color)
  }
  /**
   * 设置高亮颜色
   * @param color 颜色值
   * @returns 无返回值
   */
  function highlight(color: string) {
    const i = getEditorInstance()
    i?.command.executeSetHighlight(color)
  }

  /**
   * 设置标题级别
   * @param level 标题级别
   * @returns 无返回值
   */
  function title(level: any) {
    const i = getEditorInstance()
    i?.command.executeSetTitle(level)
  }
  /**
   * 设置行对齐方式
   * @param flex 对齐方式
   * @returns 无返回值
   */
  function rowFlex(flex: any) {
    const i = getEditorInstance()
    i?.command.executeSetRowFlex(flex)
  }
  /**
   * 设置行间距
   * @param margin 行间距数值
   * @returns 无返回值
   */
  function rowMargin(margin: any) {
    const i = getEditorInstance()
    if (!i) return
    i.command.executeSetRowMargin(margin)
  }
  /**
   * 调整缩进步进
   * @param direction 缩进方向
   * @returns 无返回值
   */
  function indentStep(direction: any) {
    const i = getEditorInstance()
    i?.command.executeIndentStep(direction)
  }
  /**
   * 设置列表
   * @param type 列表类型
   * @param style 列表样式
   * @returns 无返回值
   */
  function list(type: any, style: any) {
    const i = getEditorInstance()
    i?.command.executeSetList(type, style)
  }
  /**
   * 设置行高
   * @param height 行高数值
   * @returns 无返回值
   */
  function lineHeight(height: number) {
    const i = getEditorInstance()
    i?.command.executeSetLineHeight(height)
  }
  /**
   * 设置首行缩进
   * @param indentPx 缩进像素值
   * @returns 无返回值
   */
  function firstLineIndent(indentPx: number) {
    const i = getEditorInstance()
    if (!i) return
    i.command.executeSetFirstLineIndent(indentPx)
  }
  /**
   * 获取首行缩进值
   * @returns 首行缩进像素值
   */
  function getFirstLineIndent() {
    const i = getEditorInstance()
    return i?.command.getFirstLineIndent()
  }

  return {
    undo, redo, cut, copy, paste, pasteNoFormat, selectAll, deleteFn, painter, format,
    font, size, characterScale, sizeAdd, sizeMinus,
    bold, italic, underline, strikeout, superscript, subscript, color, highlight,
    title, rowFlex, rowMargin, indentStep, list, lineHeight, firstLineIndent, getFirstLineIndent
  }
}