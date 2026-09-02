export function readExcelFontSize(font: { sz?: number; size?: number } | null | undefined): number | undefined {
  const size = font?.sz ?? font?.size
  const numeric = Number(size)
  return Number.isFinite(numeric) ? numeric : undefined
}
