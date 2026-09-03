# @vervedoc/excel-parser

本地 JS 实现的 `.xlsx` 导入 / 导出，基于 [exceljs](https://github.com/exceljs/exceljs)。

本包是契约的一种实现；服务端或其他自定义引擎只要满足同一接口即可替换。

## 安装

```bash
npm install @vervedoc/excel-parser
```

## 契约

| 方向 | 回调类型 | 形状 |
|------|----------|------|
| 导入 | `ExcelImportCallback` | `(ArrayBuffer \| File, options?: IExcelParseOptions) => Promise<IExcelImportResult>` |
| 导出 | `ExcelExportCallback` | `(IWorkbook, options?: IExcelExportOptions) => Promise<IExcelExportResult>` |

返回值：

- 导入：`{ success, workbook?, error? }`
- 导出：`{ success, data?: ArrayBuffer, error? }`

`IExcelParseOptions` 与 `IExcelExportOptions` 目前都只有 `defaultSheetName?: (index: number) => string`，用于空表名或空工作簿时的默认工作表名。

## 用法

单独转换：

```ts
import { parseExcel, writeExcel } from '@vervedoc/excel-parser'

const imported = await parseExcel(file)
if (!imported.success) throw new Error(imported.error)

const exported = await writeExcel(imported.workbook!)
if (!exported.success) throw new Error(exported.error)
```

注入编辑器（需同时安装 `@vervedoc/excel`）。工厂函数可传入默认 options，调用时再传入的 options 会覆盖默认值：

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

## 能力

导入 / 导出覆盖：

- 单元格值与公式（`=` 前缀）、公式缓存结果
- 富文本
- 字体、填充、边框、对齐、换行、旋转、数字格式
- 合并单元格、行高列宽、隐藏行列、冻结窗格
- 超链接、批注、浮动图片

本包不处理筛选、图表、透视表、条件格式、数据验证。`IUiSheet` 上的 filter 字段属于编辑器 UI 状态，parser 不读写。
