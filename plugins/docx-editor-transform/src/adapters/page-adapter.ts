import { EditorZone, PageMode, PaperDirection } from '@vervedoc/docx-editor-schema'
import { IMargin } from '@vervedoc/docx-editor-schema'
import { IAreaBadge, IBadge } from '@vervedoc/docx-editor-schema'
import { BaseCommandAdapter, IAdapterContext } from './types'

export class PageAdapter extends BaseCommandAdapter {
  constructor(context: IAdapterContext) {
    super(context)
  }

  public pageMode(payload: PageMode): void {
    this.draw.setPageMode(payload)
  }

  public pageScale(scale: number): void {
    if (scale === this.options.scale) return
    this.draw.setPageScale(scale)
  }

  public pageScaleRecovery(): void {
    const { scale } = this.options
    if (scale !== 1) {
      this.draw.setPageScale(1)
    }
  }

  public pageScaleMinus(): void {
    const { scale } = this.options
    const nextScale = Math.round(scale * 10 - 1) / 10
    if (nextScale >= 0.5) {
      this.draw.setPageScale(nextScale)
    }
  }

  public pageScaleAdd(): void {
    const { scale } = this.options
    const nextScale = Math.round(scale * 10 + 1) / 10
    if (nextScale <= 3.0) {
      this.draw.setPageScale(nextScale)
    }
  }

  public paperSize(width: number, height: number): void {
    this.draw.setPaperSize(width, height)
  }

  public paperDirection(payload: PaperDirection): void {
    this.draw.setPaperDirection(payload)
  }

  public getPaperMargin(): number[] {
    return this.options.margins
  }

  public setPaperMargin(payload: IMargin): void {
    this.draw.setPaperMargin(payload)
  }

  public setMainBadge(payload: IBadge | null): void {
    this.draw.getBadge().setMainBadge(payload)
    this.draw.render({ isCompute: false, isSubmitHistory: false })
  }

  public setAreaBadge(payload: IAreaBadge[]): void {
    this.draw.getBadge().setAreaBadgeMap(payload)
    this.draw.render({ isCompute: false, isSubmitHistory: false })
  }

  public setZone(zone: EditorZone): void {
    this.draw.getZone().setZone(zone)
  }

  public getPaperWidth(): number {
    return this.draw.getWidth()
  }

  public getPaperHeight(): number {
    return this.draw.getHeight()
  }
}
