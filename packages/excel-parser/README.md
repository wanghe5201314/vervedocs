# @vervedoc/excel-parser

本地 JS 实现的 `.xlsx` 导入 / 导出。

## 契约

| 方向 | 回调类型 | 形状 |
|------|----------|------|
| 导入 | `ExcelImportCallback` | `(ArrayBuffer \| File) => Promise<IExcelImportResult>` |
| 导出 | `ExcelExportCallback` | `(IWorkbook) => Promise<IExcelExportResult>` |

本包是契约的一种实现；服务端或其他自定义引擎只要满足同一接口即可替换。

## 用法

```ts
import { ExcelEditor } from '@vervedoc/excel'
import {
  createExcelImportCallback,
  createExcelExportCallback
} from '@vervedoc/excel-parser'

new ExcelEditor({
  container: '#app',
  importCallback: createExcelImportCallback(),
  exportCallback: createExcelExportCallback()
})
```

也可直接使用底层 API：

```ts
import { parseExcel, writeExcel } from '@vervedoc/excel-parser'

const imported = await parseExcel(file)
const exported = await writeExcel(workbook)
```
