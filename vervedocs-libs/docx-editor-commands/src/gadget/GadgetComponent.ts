import { generateShapeSvg, svgToDataUrl, getShapeDefinition } from './shape/ShapeGenerator'

type Command = any

export class GadgetComponent {
  private _command: Command | null = null

  public install(_draw: any, command: Command): this {
    this._command = command

    const structureAdapter = (_draw as any).__structureAdapter
    if (structureAdapter) {
      structureAdapter.insertShape = this.insertShape.bind(this)
      structureAdapter.qrcode = this.qrcode.bind(this)
      structureAdapter.barcode = this.barcode.bind(this)
    }

    return this
  }

  public insertShape(type: string): void {
    if (!this._command) return
    
    const shapeDef = getShapeDefinition(type)
    if (shapeDef) {
      this._command.executeInsertElementList([{
        type: 'shape',
        value: '',
        shapeType: type,
        viewBox: shapeDef.viewBox,
        path: shapeDef.path,
        pathFormula: shapeDef.pathFormula,
        width: shapeDef.viewBox[0],
        height: shapeDef.viewBox[1],
        fillColor: 'none',
        strokeColor: '#000',
        strokeWidth: 2
      }])
    } else {
      const generatedDef = generateShapeSvg(String(type || '').trim())
      const dataUrl = svgToDataUrl(generatedDef.svg)
      this._command.executeImage({
        value: dataUrl,
        width: 260,
        height: Math.round(260 * generatedDef.height / generatedDef.width)
      })
    }
  }

  public async qrcode(content: string): Promise<void> {
    if (!this._command || !content) return
    const size = 160
    try {
      const QRCode = (await import('qrcode')).default
      const dataUrl = await QRCode.toDataURL(content, {
        width: size,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: { dark: '#000000', light: '#ffffff' }
      })
      this._command.executeImage({
        value: dataUrl,
        width: size,
        height: size
      })
    } catch (error) {
      console.error('[GadgetComponent] 二维码生成失败:', error)
    }
  }

  public barcode(content: string): void {
    if (!this._command || !content) return
    this._command.executeInsertElementList([{
      type: 'barcode',
      value: content,
      width: 150,
      height: 50
    }])
  }
}
