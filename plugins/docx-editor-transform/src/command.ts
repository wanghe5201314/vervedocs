/**
 * VerveDocs Transform —— Command 门面
 */

import type { CommandAdapt } from './command-adapt'
import type { IElement, Path, IAutoTocResult, IBookmark, IEditorOption, IRange, IDocxDocumentMeta } from '@vervedoc/docx-editor-schema'
import type { IRangeStyle, IEditorAbility } from '@vervedoc/docx-editor-state'

/**
 * Command 命令门面类。
 * 作为对外暴露的统一命令入口，将各类编辑操作委托给内部的 CommandAdapt 适配器执行。
 */
export class Command {
  /**
   * 创建 Command 实例。
   * @param adapt 命令适配器实例，负责实际执行各项编辑操作
   */
  constructor(public adapt: CommandAdapt) {}

  /**
   * 在当前光标位置插入文本。
   * @param text 待插入的文本内容
   */
  executeInsertText(text: string): void { this.adapt.insertText(text) }
  /**
   * 向后删除一个字符（Backspace 键行为）。
   */
  executeDeleteBackward(): void { this.adapt.deleteBackward() }
  /**
   * 向后删除一个字符（Backspace 键行为的别名）。
   */
  executeBackspace(): void { this.adapt.deleteBackward() }
  /**
   * 向前删除一个字符（Delete 键行为）。
   */
  executeDeleteForward(): void { this.adapt.deleteForward() }
  /**
   * 在当前光标处拆分段落。
   */
  executeSplitParagraph(): void { this.adapt.splitParagraph() }
  /**
   * 删除当前选区内容。
   * @returns 是否成功删除
   */
  executeDeleteSelection(): boolean { return this.adapt.deleteSelection() }
  /**
   * 提取当前选区的纯文本内容。
   * @returns 选区文本字符串
   */
  executeExtractSelectionText(): string { return this.adapt.extractSelectionText() }
  /**
   * 将光标向左移动一位。
   */
  executeMoveCaretLeft(): void { this.adapt.moveCaretLeft() }
  /**
   * 将光标向右移动一位。
   */
  executeMoveCaretRight(): void { this.adapt.moveCaretRight() }
  /**
   * 设置行弹性布局。
   * @param f 行弹性布局参数
   */
  executeSetRowFlex(f: Parameters<CommandAdapt['setRowFlex']>[0]): void { this.adapt.setRowFlex(f) }
  /**
   * 设置或切换加粗样式。
   * @param b 是否加粗，省略时为切换语义
   */
  executeSetBold(b?: boolean): void { this.adapt.setBold(b) }
  /**
   * 设置或切换斜体样式。
   * @param b 是否斜体，省略时为切换语义
   */
  executeSetItalic(b?: boolean): void { this.adapt.setItalic(b) }
  /**
   * 设置文字颜色。
   * @param c 颜色值字符串
   */
  executeSetColor(c: string): void { this.adapt.setColor(c) }
  /**
   * 设置字体。
   * @param f 字体名称
   */
  executeSetFont(f: string): void { this.adapt.setFont(f) }
  /**
   * 设置字号。
   * @param s 字号数值
   */
  executeSetSize(s: number): void { this.adapt.setSize(s) }
  /**
   * 增大字号。
   */
  executeSizeAdd(): void { this.adapt.setSizeAdd() }
  /**
   * 减小字号。
   */
  executeSizeMinus(): void { this.adapt.setSizeMinus() }
  /**
   * 设置文字高亮颜色。
   * @param c 高亮颜色值
   */
  executeSetHighlight(c: string): void { this.adapt.setHighlight(c) }
  /**
   * 设置或切换删除线。
   * @param v 是否显示删除线
   */
  executeSetStrikeout(v?: boolean): void { this.adapt.setStrikeout(v) }
  /** 设置双删除线 */
  executeSetDoubleStrikeout(v?: boolean): void { this.adapt.setDoubleStrikeout(v) }
  /** 设置隐藏 */
  executeSetHidden(v?: boolean): void { this.adapt.setHidden(v) }
  /**
   * 设置或切换下划线。
   * @param v 是否显示下划线
   */
  executeSetUnderline(v?: boolean): void { this.adapt.setUnderline(v) }
  /**
   * 清除当前选区的格式。
   */
  executeClearFormat(): void { this.adapt.clearFormat() }
  /**
   * 使用格式刷应用格式。
   */
  executePaintFormat(): void { this.adapt.paintFormat() }
  /**
   * 设置行高。
   * @param lh 行高数值
   * @param rule 行高规则：'auto' | 'exact' | 'atLeast'
   */
  executeSetLineHeight(lh: number, rule?: 'auto' | 'exact' | 'atLeast'): void { this.adapt.setLineHeight(lh, rule) }
  /**
   * 设置行间距。
   * @param m 行间距数值
   */
  executeSetRowMargin(m: number): void { this.adapt.setRowMargin(m) }
  /**
   * 设置标题级别。
   * @param l 标题级别，null 表示取消标题
   */
  executeSetTitle(l: 'first' | 'second' | 'third' | 'fourth' | 'fifth' | 'sixth' | null): void { this.adapt.setTitle(l) }
  /**
   * 设置列表。
   * @param type 列表类型
   * @param style 列表样式
   */
  executeSetList(type: Parameters<CommandAdapt['setList']>[0], style: Parameters<CommandAdapt['setList']>[1]): void { this.adapt.setList(type, style) }
  /**
   * 插入表格。
   * @param rows 行数
   * @param cols 列数
   * @param availableWidth 可用宽度，可选
   */
  executeInsertTable(rows: number, cols: number, availableWidth?: number): void { this.adapt.insertTable(rows, cols, availableWidth) }
  /**
   * 插入表格行。
   * @param position 插入位置：'above' | 'below'
   * @param count 插入行数，可选
   */
  executeInsertTableRow(position: 'above' | 'below', count?: number): void { this.adapt.insertTableRow(position, count) }
  /**
   * 插入表格列。
   * @param position 插入位置：'left' | 'right'
   * @param count 插入列数，可选
   */
  executeInsertTableCol(position: 'left' | 'right', count?: number): void { this.adapt.insertTableCol(position, count) }
  /**
   * 删除当前表格行。
   */
  executeDeleteTableRow(): void { this.adapt.deleteTableRow() }
  /**
   * 删除当前表格列。
   */
  executeDeleteTableCol(): void { this.adapt.deleteTableCol() }
  /**
   * 拆分当前表格单元格。
   */
  executeSplitTableCell(): void { this.adapt.splitTableCell() }
  /**
   * 合并选中的表格单元格。
   */
  executeMergeTableCells(): void { this.adapt.mergeTableCells() }
  /**
   * 删除整个表格。
   */
  executeDeleteTable(): void { this.adapt.deleteTable() }
  /**
   * 设置单元格垂直对齐方式。
   * @param align 对齐方式：'top' | 'middle' | 'bottom'
   */
  executeSetCellVerticalAlign(align: 'top' | 'middle' | 'bottom'): void { this.adapt.setCellVerticalAlign(align) }
  /**
   * 设置单元格背景色。
   * @param color 背景颜色值
   */
  executeSetCellBackground(color: string): void { this.adapt.setCellBackground(color) }
  /**
   * 切换表格重复表头状态。
   */
  executeToggleRepeatHeader(): void { this.adapt.toggleRepeatHeader() }
  /**
   * 设置表格列宽。
   * @param tableIndex 表格索引
   * @param colIndex 列索引
   * @param width 列宽
   */
  executeSetTableColWidth(tableIndex: number, colIndex: number, width: number): void { this.adapt.setTableColWidth(tableIndex, colIndex, width) }
  /**
   * 设置表格行高。
   * @param tableIndex 表格索引
   * @param rowIndex 行索引
   * @param height 行高
   */
  executeSetTableRowHeight(tableIndex: number, rowIndex: number, height: number): void { this.adapt.setTableRowHeight(tableIndex, rowIndex, height) }
  /**
   * 选中当前表格。
   */
  executeSelectTable(): void { this.adapt.selectTable() }
  /**
   * 插入图片。
   * @param src 图片源，可以是 URL 字符串或包含 value/width/height 的对象
   * @param w 宽度，可选
   * @param h 高度，可选
   */
  executeInsertImage(src: string | { value: string; width?: number; height?: number }, w?: number, h?: number): void { this.adapt.insertImage(src, w, h) }
  /**
   * 插入签名图片。
   * @param dataUrl 签名图片的 data URL
   */
  executeInsertSignature(dataUrl: string): void { this.adapt.signature(dataUrl) }
  /**
   * 插入条形码图片。
   * @param payload 条形码参数，包含 value/width/height
   */
  executeInsertBarcode(payload: { value: string; width: number; height: number }): void { this.adapt.insertImage(payload) }
  /**
   * 插入二维码图片。
   * @param payload 二维码参数，包含 value/width/height
   */
  executeInsertQrcode(payload: { value: string; width: number; height: number }): void { this.adapt.insertImage(payload) }
  /**
   * 更新图片尺寸。
   * @param path 图片路径
   * @param width 新宽度
   * @param height 新高度
   */
  executeUpdateImageSize(path: Path, width: number, height: number): void { this.adapt.updateImageSize(path, width, height) }
  /**
   * 删除图片。
   * @param path 图片路径
   */
  executeDeleteImage(path: Path): void { this.adapt.deleteImage(path) }
  /**
   * 重置图片为原始尺寸。
   * @param path 图片路径
   */
  executeResetImageSize(path: Path): void { this.adapt.resetImageSize(path) }
  /**
   * 设置图片对齐方式。
   * @param path 图片路径
   * @param align 对齐方式：'left' | 'center' | 'right'
   */
  executeImageAlign(path: Path, align: 'left' | 'center' | 'right'): void { this.adapt.imageAlign(path, align) }
  /**
   * 替换图片。
   * @param path 图片路径
   */
  executeReplaceImage(path: Path): void { this.adapt.replaceImage(path) }
  /**
   * 旋转图片。
   * @param path 图片路径
   */
  executeRotateImage(path: Path): void { this.adapt.rotateImage(path) }
  /**
   * 保存图片。
   * @param path 图片路径
   */
  executeSaveImage(path: Path): Promise<void> { return this.adapt.saveImage(path) }
  /**
   * 设置图片环绕方式。
   * @param path 图片路径
   * @param mode 环绕模式：'block' | 'surround' | 'floatTop' | 'floatBottom'
   */
  executeImageWrap(path: Path, mode: 'block' | 'surround' | 'float-top' | 'float-bottom'): void { this.adapt.imageWrap(path, mode) }
  /**
   * 插入分页符。
   */
  executePageBreak(): void { this.adapt.insertPageBreak() }
  executeInsertBlankPage(): void { this.adapt.insertBlankPage() }
  /**
   * 插入超链接。
   * @param payload 超链接参数，包含 url 和 valueList
   */
  executeHyperlink(payload: { url: string; valueList: IElement[] }): boolean { return this.adapt.insertHyperlink(payload) }
  /**
   * 插入 LaTeX 公式。
   * @param payload LaTeX 参数，包含 latex/svg/width/height
   */
  executeInsertLatex(payload: { latex: string; svg: string; width: number; height: number }): void { this.adapt.insertLatex(payload) }
  /**
   * 插入分隔线。
   * @param opts 分隔线选项，可选
   */
  executeSeparator(opts?: { lineType?: string; lineWidth?: number; dashArray?: number[]; color?: string } | any[]): void { this.adapt.insertSeparator(opts) }
  /**
   * 插入换行符。
   */
  executeLineBreak(): void { this.adapt.lineBreak() }
  /**
   * 插入分栏符。
   */
  executeColumnBreak(): void { this.adapt.columnBreak() }
  /**
   * 插入连续分节符。
   */
  executeSectionBreakContinuous(): void { this.adapt.sectionBreakContinuous() }
  executeSectionBreakNextPage(): void { this.adapt.sectionBreak('nextPage') }
  executeSectionBreakEvenPage(): void { this.adapt.sectionBreak('evenPage') }
  executeSectionBreakOddPage(): void { this.adapt.sectionBreak('oddPage') }
  /**
   * 搜索关键字。
   * @param keyword 搜索关键字
   * @returns 包含匹配数量 count 的结果对象
   */
  executeSearch(keyword: string): { count: number } { return this.adapt.search(keyword) }
  /**
   * 替换匹配内容。
   * @param text 替换文本
   * @param opts 替换选项，可指定 index
   * @returns 是否成功替换
   */
  executeReplace(text: string, opts?: { index?: number }): boolean { return this.adapt.replace(text, opts) }
  /**
   * 定位到指定索引的搜索结果。
   * @param idx 搜索结果索引
   */
  executeLocateSearchResult(idx: number): void { this.adapt.locateSearchResult(idx) }
  /**
   * 获取当前搜索命中列表。
   * @returns 匹配项数组，每项含 index、before、match、after
   */
  executeGetSearchMatches(): { index: number; before: string; match: string; after: string }[] { return this.adapt.getSearchMatches() }
  /**
   * 全部替换。
   * @param keyword 搜索关键字
   * @param replacement 替换文本
   * @returns 包含替换数量 count 的结果对象
   */
  executeReplaceAll(keyword: string, replacement: string): { count: number } { return this.adapt.replaceAll(keyword, replacement) }
  /**
   * 替换单个搜索结果。
   * @param result 搜索结果定位信息
   * @param replacement 替换文本
   * @returns 包含替换数量 count 的结果对象
   */
  executeReplaceOne(result: { resultIndex: number; keyword: string }, replacement: string): { count: number } { return this.adapt.replaceOne(result, replacement) }
  /**
   * 设置纸张尺寸。
   * @param w 宽度
   * @param h 高度
   */
  executeSetPaperSize(w: number, h: number): void { this.adapt.setPaperSize(w, h) }
  /**
   * 设置纸张方向。
   * @param d 方向：'vertical' | 'horizontal'
   */
  executeSetPaperDirection(d: 'vertical' | 'horizontal'): void { this.adapt.setPaperDirection(d) }
  /**
   * 放大页面缩放。
   */
  executePageScaleAdd(): void { this.adapt.pageScaleAdd() }
  /**
   * 缩小页面缩放。
   */
  executePageScaleMinus(): void { this.adapt.pageScaleMinus() }
  /**
   * 设置标尺可见性。
   * @param visible 是否可见
   */
  executeSetRulerVisible(visible: boolean): void { this.adapt.setRulerVisible(visible) }
  /**
   * 设置页边距。
   * @param margins 边距数组
   */
  executeSetPaperMargin(margins: number[]): void { this.adapt.setPaperMargin(margins) }
  /**
   * 打印文档。
   */
  executePrint(): void { this.adapt.print() }
  /**
   * 获取所有页面缩略图。
   * @returns 缩略图 data URL 数组
   */
  getPageThumbnails(): string[] { return this.adapt.getPageThumbnails() }
  /**
   * 获取纸张高度。
   * @returns 纸张高度数值
   */
  getPaperHeight(): number { return this.adapt.getPaperHeight() }
  /**
   * 获取编辑器选项。
   * @returns 当前编辑器配置选项
   */
  getOptions(): IEditorOption { return this.adapt.getOptions() }
  /**
   * 设置页面模式。
   * @param mode 页面模式字符串
   */
  executeSetPageMode(mode: string): void { this.adapt.setPageMode(mode) }
  /**
   * 设置页面缩放比例。
   * @param scale 缩放比例
   */
  executeSetPageScale(scale: number): void { this.adapt.setPageScale(scale) }
  /**
   * 恢复页面缩放至默认比例。
   */
  executePageScaleRecovery(): void { this.adapt.setPageScaleRecovery() }
  /**
   * 设置分栏数。
   * @param value 分栏数量
   */
  executeSetColumns(value: number): void { this.adapt.setColumns(value) }
  /**
   * 更新编辑器选项。
   * @param patch 选项补丁对象
   */
  executeUpdateOptions(patch: Partial<IEditorOption>): void { this.adapt.updateOptions(patch) }
  /**
   * 添加水印。
   * @param payload 水印参数，可包含 data/content/color/opacity/size/font/repeat
   */
  executeAddWatermark(payload: { data?: string; content?: string; color?: string; opacity?: number; size?: number; font?: string; repeat?: boolean } | any): void { this.adapt.addWatermark(payload) }
  /**
   * 删除水印。
   */
  executeDeleteWatermark(): void { this.adapt.deleteWatermark() }
  /**
   * 设置系统级水印（全页面 DOM 覆盖层）。
   * @param config 水印配置，null 表示移除
   */
  executeSetSystemWatermark(config: { data: string; color?: string; opacity?: number; size?: number; font?: string; repeat?: boolean; gapX?: number; gapY?: number } | null): void { this.adapt.setSystemWatermark(config) }
  /** 删除系统级水印 */
  executeDeleteSystemWatermark(): void { this.adapt.deleteSystemWatermark() }
  /**
   * 获取文档全部元素值。
   * @returns 文档元素数组
   */
  getValue(): IDocxDocumentMeta { return this.adapt.getValue() }
  /**
   * 设置文档内容。
   * @param payload 文档内容，包含 main 及可选的 header/footer/comments
   */
  executeSetValue(payload: Parameters<CommandAdapt['setValue']>[0]): void { this.adapt.setValue(payload) }
  /**
   * 获取字数统计。
   * @returns 字数数值
   */
  getWordCount(): number { return this.adapt.getWordCount() }
  /**
   * 获取文档目录。
   * @returns 目录项数组，每项包含 id/level/name
   */
  getToc(): { id: string; level: number; name: string }[] { return this.adapt.getToc() }
  /**
   * 定位到指定目录项。
   * @param id 目录项 ID
   */
  executeLocationToc(id: string): void { this.adapt.locationToc(id) }
  /**
   * 设置光标位置。
   * @param path 光标路径
   * @param offset 偏移量
   */
  executeSetCaret(path: Path, offset: number): void { this.adapt.setCaret(path, offset) }
  /**
   * 获取自动生成的目录结果。
   * @returns 自动目录结果
   */
  getAutoToc(): IAutoTocResult { return this.adapt.getAutoToc() }
  /**
   * 插入自动目录。
   * @param type Office 自动目录模板：1 | 2（均收录三级标题）
   */
  executeInsertAutoToc(type: 1 | 2): void { this.adapt.insertAutoToc(type) }
  /**
   * 撤销操作。
   */
  executeUndo(): void { this.adapt.undo() }
  /**
   * 重做操作。
   */
  executeRedo(): void { this.adapt.redo() }
  /**
   * 获取所有书签。
   * @returns 书签数组
   */
  getBookmarks(): IBookmark[] { return this.adapt.getBookmarks() }
  /**
   * 添加书签。
   * @param payload 书签参数，包含 name
   */
  executeAddBookmark(payload: { name: string }): void { this.adapt.addBookmark(payload) }
  /**
   * 删除书签。
   * @param payload 书签参数，包含 name
   */
  executeDeleteBookmark(payload: { name: string }): void { this.adapt.deleteBookmark(payload) }
  /**
   * 跳转到指定书签。
   * @param payload 书签参数，包含 name
   */
  executeGotoBookmark(payload: { name: string }): void { this.adapt.gotoBookmark(payload) }
  /**
   * 插入目录（TOC）。
   * @param payload 目录参数，可包含 type/mode 及其他自定义字段
   */
  executeInsertToc(payload: { type?: 1 | 2; mode?: string; [key: string]: unknown }): void { this.adapt.insertToc(payload) }
  /** 更新整个目录，包括标题文本、层级与页码。 */
  executeUpdateToc(): void { this.adapt.updateToc() }
  /**
   * 移除目录（TOC）。
   */
  executeRemoveToc(): void { this.adapt.removeToc() }
  /**
   * 设置当前编辑区域。
   * @param zone 区域：'main' | 'header' | 'footer'
   */
  executeSetZone(zone: 'main' | 'header' | 'footer'): void { this.adapt.setZone(zone) }
  /**
   * 清空页眉内容。
   */
  executeClearHeader(): void { this.adapt.clearHeader() }
  /**
   * 清空页脚内容。
   */
  executeClearFooter(): void { this.adapt.clearFooter() }
  /**
   * 设置页码。
   * @param payload 页码配置
   */
  executeSetPageNumber(payload: Record<string, unknown>): void { this.adapt.setPageNumber(payload) }


  /**
   * 获取当前编辑区域。
   * @returns 区域：'main' | 'header' | 'footer'
   */
  getZone(): 'main' | 'header' | 'footer' { return this.adapt.getZone() }
  /**
   * 全选文档内容。
   */
  executeSelectAll(): void { this.adapt.selectAll() }
  /**
   * 设置选区范围。
   * @param startIndex 起始索引
   * @param endIndex 结束索引
   */
  executeSetRange(startIndex: number, endIndex: number): void { this.adapt.setRange(startIndex, endIndex) }
  /**
   * 插入元素列表。
   * @param elements 元素数组
   */
  executeInsertElementList(elements: IElement[]): void { this.adapt.insertElementList(elements) }
  /**
   * 复制选区内容并返回可粘贴字符串。
   * @returns 复制得到的数据字符串
   */
  executeCopy(): string { return this.adapt.copy() }
  /**
   * 剪切选区内容并返回可粘贴字符串。
   * @returns 剪切得到的数据字符串
   */
  executeCut(): string { return this.adapt.cut() }
  /**
   * 粘贴内容。
   * @param text 待粘贴的数据字符串
   */
  executePaste(text: string): void { this.adapt.paste(text) }
  /**
   * 粘贴纯文本。
   * @param text 待粘贴的纯文本
   */
  executePastePlain(text: string): void { this.adapt.pastePlain(text) }
  /**
   * 粘贴时不保留格式（等同于粘贴纯文本）。
   * @param text 待粘贴的文本
   */
  executePasteNoFormat(text: string): void { this.adapt.pastePlain(text) }
  /**
   * 设置上标。
   */
  executeSetSuperscript(): void { this.adapt.setSuperscript() }
  /**
   * 设置下标。
   */
  executeSetSubscript(): void { this.adapt.setSubscript() }
  /**
   * 设置字符缩放比例。
   * @param value 缩放比例
   */
  executeSetCharacterScale(value: number): void { this.adapt.setCharacterScale(value) }
  /**
   * 设置段落首行缩进。
   * @param indentPx 缩进像素值
   */
  executeSetFirstLineIndent(indentPx: number): void { this.adapt.setParagraphFirstLineIndent(indentPx) }
  /** Apply ruler handle positions as one paragraph-format transaction. */
  executeSetRulerIndent(first: number, left: number, right: number): void {
    this.adapt.setRulerIndent(first, left, right)
  }
  /**
   * 获取首行缩进值。
   * @returns 首行缩进像素值
   */
  getFirstLineIndent(): number { return this.adapt.getFirstLineIndent() }
  /**
   * 按方向执行缩进步进。
   * @param direction 方向：'add' | 'sub'
   */
  executeIndentStep(direction: 'add' | 'sub'): void { this.adapt.indentStep(direction) }
  /** 设置左缩进（px） */
  executeSetParagraphIndentLeft(px: number): void { this.adapt.setParagraphIndentLeft(px) }
  /** 获取左缩进（px） */
  getParagraphIndentLeft(): number { return this.adapt.getParagraphIndentLeft() }
  /** 设置右缩进（px） */
  executeSetParagraphIndentRight(px: number): void { this.adapt.setParagraphIndentRight(px) }
  /** 获取右缩进（px） */
  getParagraphIndentRight(): number { return this.adapt.getParagraphIndentRight() }
  /** 设置段前间距（px） */
  executeSetParagraphSpacingBefore(px: number): void { this.adapt.setParagraphSpacingBefore(px) }
  /** 获取段前间距（px） */
  getParagraphSpacingBefore(): number { return this.adapt.getParagraphSpacingBefore() }
  /** 设置段后间距（px） */
  executeSetParagraphSpacingAfter(px: number): void { this.adapt.setParagraphSpacingAfter(px) }
  /** 获取段后间距（px） */
  getParagraphSpacingAfter(): number { return this.adapt.getParagraphSpacingAfter() }
  /**
   * 获取当前选区范围。
   * @returns 选区范围对象，无选区时返回 null
   */
  getRange(): IRange | null { return this.adapt.getRange() }
  /**
   * 获取是否只读状态。
   * @returns 是否只读
   */
  getIsReadonly(): boolean { return this.adapt.getIsReadonly() }
  /**
   * 获取是否禁用状态。
   * @returns 是否禁用
   */
  getIsDisabled(): boolean { return this.adapt.getIsDisabled() }
  /**
   * 获取是否可输入状态。
   * @returns 是否可输入
   */
  getIsCanInput(): boolean { return this.adapt.getIsCanInput() }
  /**
   * 获取当前选区样式。
   * @returns 选区样式对象
   */
  getRangeStyle(): IRangeStyle { return this.adapt.getRangeStyle() }
  /**
   * 获取选区上下文信息。
   * @returns 包含起始行号和列号的对象
   */
  getRangeContext(): { startRowNo: number; startColNo: number } { return this.adapt.getRangeContext() }
  /**
   * 获取编辑器能力描述。
   * @returns 编辑器能力对象
   */
  getAbility(): IEditorAbility { return this.adapt.getAbility() }
  /**
   * 设置编辑器模式。
   * @param mode 模式字符串
   */
  executeSetMode(mode: string): void { this.adapt.setMode(mode) }
  /**
   * 导出为 docx 文档。
   * @param payload 导出参数
   * @returns 完成时 resolve 的 Promise
   */
  async executeExportDocx(payload: any): Promise<void> { await this.adapt.exportDocx(payload) }
  /**
   * 预览 HTML 内容。
   * @param payload 预览参数
   */
  executePreviewHtml(payload: any): void { this.adapt.previewHtml(payload) }
  /**
   * 替换指定范围的内容。
   * @param range 范围对象
   */
  executeReplaceRange(range: any): void { this.adapt.replaceRange(range) }
  /**
   * 设置群组，返回 groupId 或 null。
   */
  executeSetGroup(update?: Parameters<CommandAdapt['setGroup']>[0]): string | null { return this.adapt.setGroup(update) }
  /**
   * 定位到指定群组。
   * @param id 群组 ID
   */
  executeLocationGroup(id: string): void { this.adapt.locationGroup(id) }
  /**
   * 设置表格边框类型。
   * @param type 边框类型字符串
   */
  executeSetTableBorderType(type: string): void { this.adapt.setTableBorderType(type) }
  getCellProperties() { return this.adapt.getCellProperties() }
  getTableBorders() { return this.adapt.getTableBorders() }
  executeSetTableBorders(patch: Parameters<CommandAdapt['setTableBorders']>[0]): void { this.adapt.setTableBorders(patch) }
  /**
   * 设置表格边框颜色。
   * @param color 颜色值
   */
  executeSetTableBorderColor(color: string): void { this.adapt.setTableBorderColor(color) }
  /**
   * 设置表格边框宽度。
   * @param width 宽度数值
   */
  executeSetTableBorderWidth(width: number): void { this.adapt.setTableBorderWidth(width) }
  /**
   * 设置表格外部边框宽度。
   * @param width 宽度数值
   */
  executeSetTableBorderExternalWidth(width: number): void { this.adapt.setTableBorderExternalWidth(width) }
  /**

   * 插入图表。
   * @param payload 图表参数：chartType/subtype/dataSource/config/width/height
   */
  executeInsertChart(payload: { chartType: string; subtype?: string; dataSource: any; config?: any; width?: number; height?: number }): void { this.adapt.insertChart(payload) }
  /**
   * 更新图表属性。
   * @param id 图表 ID
   * @param patch 属性补丁对象
   */
  executeUpdateChart(id: string, patch: Record<string, unknown>): void { this.adapt.updateChart(id, patch) }
  /**
   * 更新图表尺寸。
   * @param path 图表路径
   * @param width 新宽度
   * @param height 新高度
   */
  executeUpdateChartSize(path: Path, width: number, height: number): void { this.adapt.updateChartSize(path, width, height) }
  /**
   * 删除块元素（图表等）。
   * @param path 块路径
   */
  executeDeleteBlock(path: Path): void { this.adapt.deleteBlock(path) }
  /**
   * 删除指定群组。
   * @param groupId 群组 ID
   */
  executeDeleteGroup(groupId: string): void { this.adapt.deleteGroup(groupId) }
  /**
   * 获取文档全文纯文本（所有 text run 的 value 拼接）。
   * @returns 文档全文字符串
   */
  executeGetFullText(): string { return this.adapt.getFullText() }
  /**
   * 跳转到指定页码（通过设置滚动位置）。
   * @param pageNo 页码索引（从 0 开始）
   */
  executeJumpToPage(pageNo: number): void { this.adapt.jumpToPage(pageNo) }
  /**
   * 定位到指定修订 ID 的首个元素位置。
   * @param id 修订唯一标识
   * @returns 是否找到并定位成功
   */
  executeLocateRevision(id: string): boolean { return this.adapt.locateRevision(id) }
}
