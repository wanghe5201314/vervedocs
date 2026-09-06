/**
 * 批注 / 修订组件宿主契约（Host Contract）
 *
 * 该契约由 core（DocxEditor）内部实现并注入到 CommentComponent / RevisionComponent。
 *
 * ⚠️ **禁止**：packages/docx、协作层、业务层等任何"外部消费者"直接构造或替换该宿主对象。
 * 外部若要影响批注 / 修订行为，只能通过 core 暴露的 `setCommentCallbacks` /
 * `setRevisionCallbacks` 注入回调，或通过 `getCommentView` / `getRevisionView`
 * 拿到只读视图。
 *
 * 违反该约定会导致 `getContainer` / `getGroupContext` 等能力丢失，
 * 从而出现「气泡不显示」这类回归问题。
 */

/** 分组锚点坐标（由布局引擎产出） */
export interface GroupAnchor {
  startX: number
  startY: number
  endX: number
  endY: number
  lineHeight: number
  glyphHeight: number
  startGlyphTop: number
  endGlyphTop: number
}

/** 分组上下文，`_anchor` 由新架构直接返回，避免依赖 positionList */
export interface GroupContext {
  isTable: boolean
  index: number
  startIndex: number
  endIndex: number
  _anchor?: GroupAnchor
}

/**
 * 批注 / 修订组件宿主契约
 *
 * 组件通过该契约与 core 单向通信，避免直接依赖 Draw / Command 具体实现。
 * 所有方法必须由 core 内部代理实现，外部不得替换。
 */
export interface CommentHost {
  /** 获取气泡挂载容器（Draw 的 scroller） */
  getContainer(): HTMLDivElement | null
  /** 兼容旧架构的 positionList，新架构固定返回 null */
  getPositionList(): any[] | null
  /** 通过 revisionId 获取修订锚点；找不到返回 null */
  getRevisionAnchor(revisionId: string): GroupAnchor | null
  /** 页面宽度（px） */
  getDrawWidth(): number
  /** 页面高度（px） */
  getDrawHeight(): number
  /** 页间距（px） */
  getPageGap(): number
  /** 编辑器选项（只读引用） */
  getOptions(): Record<string, any>
  /** 主区文档元素列表 */
  getElementList(): any[]
  /** 通过 groupId 获取锚点上下文；找不到返回 null */
  getGroupContext(groupId: string): GroupContext | null
  /** 创建新分组（返回 groupId 或 null） */
  executeSetGroup(): string | null
  /** 删除分组 */
  executeDeleteGroup(groupId: string): void
  /** 定位到分组 */
  executeLocationGroup(groupId: string): void
  /** 更新编辑器选项 */
  executeUpdateOptions(patch: Record<string, any>): void
  /** 从元素数组中 splice */
  spliceElementList(list: any[], index: number, deleteCount: number, insert?: any[], options?: any): void
  /** 触发重绘 */
  renderDraw(options?: any): void
  /** 设置激活分组（联动锚点竖线高亮） */
  setActiveGroup(groupId: string | null): void
}
