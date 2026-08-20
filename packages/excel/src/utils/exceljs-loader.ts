type ExcelJsWorkbookModule = {
  Workbook?: new () => any
}

function resolveWorkbookCtor(source: unknown): ExcelJsWorkbookModule['Workbook'] | undefined {
  if (!source || typeof source !== 'object') return
  const module = source as ExcelJsWorkbookModule
  if (typeof module.Workbook === 'function') {
    return module.Workbook
  }
  return
}

export async function createExcelJsWorkbook() {
  const imported: any = await import('exceljs')
  const directCtor = resolveWorkbookCtor(imported)
    || resolveWorkbookCtor(imported?.default)
    || resolveWorkbookCtor(imported?.ExcelJS)
    || resolveWorkbookCtor(imported?.default?.default)

  if (directCtor) {
    return new directCtor()
  }

  for (const value of Object.values(imported || {})) {
    const nestedCtor = resolveWorkbookCtor(value)
    if (nestedCtor) {
      return new nestedCtor()
    }
  }

  throw new Error('ExcelJS 加载失败，未找到 Workbook 构造函数')
}
