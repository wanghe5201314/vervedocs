import {
  IContentChange,
  IControlChange,
  IControlContentChange,
  IImageMousedown,
  IImageSizeChange,
  IInputEventChange,
  IIntersectionPageNoChange,
  IMouseEventChange,
  IPageModeChange,
  IPageScaleChange,
  IPageSizeChange,
  IPositionContextChange,
  IRangeStyleChange,
  ISaved,
  IVisiblePageNoListChange,
  IZoneChange
} from './Listener'

// 批注相关事件
export interface ICommentCreate {
  (payload: { groupId: string; rangeText: string }): void
}

export interface ICommentDelete {
  (payload: { groupId: string }): void
}

// 右键菜单相关事件
export interface IHyperlinkMenuClick {
  (): void
}

export interface EventBusMap {
  rangeStyleChange: IRangeStyleChange
  visiblePageNoListChange: IVisiblePageNoListChange
  intersectionPageNoChange: IIntersectionPageNoChange
  pageSizeChange: IPageSizeChange
  pageScaleChange: IPageScaleChange
  saved: ISaved
  contentChange: IContentChange
  controlChange: IControlChange
  controlContentChange: IControlContentChange
  pageModeChange: IPageModeChange
  zoneChange: IZoneChange
  mousemove: IMouseEventChange
  mouseleave: IMouseEventChange
  mouseenter: IMouseEventChange
  mousedown: IMouseEventChange
  mouseup: IMouseEventChange
  click: IMouseEventChange
  input: IInputEventChange
  positionContextChange: IPositionContextChange
  imageSizeChange: IImageSizeChange
  imageMousedown: IImageMousedown
  commentCreate: ICommentCreate
  commentDelete: ICommentDelete
}
