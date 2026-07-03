# @wanghe1995/docx-editor-core

DocxEditor 核心编辑器库，提供富文本编辑、表格、图片、列表等功能。

## 特性

- 富文本编辑（加粗、斜体、下划线、删除线、高亮等）
- 表格支持（插入、合并、拆分、边框设置等）
- 图片处理（插入、缩放、拖拽、显示模式等）
- 列表功能（有序列表、无序列表、多级列表）
- 页面布局（页眉、页脚、页码、水印、页边距）
- 控件系统（文本控件、日期控件、下拉选择等）
- 历史记录（撤销/重做）
- 搜索替换
- 插件系统（支持扩展功能）

## 安装

```bash
npm install @wanghe1995/docx-editor-core
```

## 快速开始

```typescript
import DocxEditor from '@wanghe1995/docx-editor-core'

// 获取容器元素
const container = document.getElementById('editor') as HTMLDivElement

// 初始化编辑器
const editor = new DocxEditor(container, {
  main: [
    { value: '欢迎使用 DocxEditor！' }
  ]
})

// 使用命令 API
editor.command.executeUndo()  // 撤销
editor.command.executeRedo()  // 重做
editor.command.executeBold()  // 加粗
```

## 配置选项

```typescript
interface IEditorOption {
  // 页面设置
  pageMode?: PageMode           // 页面模式：paging（分页）| continuous（连续）
  paperDirection?: PaperDirection // 纸张方向：vertical（纵向）| horizontal（横向）
  width?: number                // 页面宽度（毫米）
  height?: number               // 页面高度（毫米）
  scale?: number                // 缩放比例（0-1）
  
  // 边距设置
  margins?: [number, number, number, number]  // [上, 右, 下, 左]（毫米）
  
  // 页眉页脚
  header?: IHeader              // 页眉配置
  footer?: IFooter              // 页脚配置
  
  // 水印
  watermark?: IWatermark        // 水印配置
  
  // 字体
  defaultFont?: string          // 默认字体
  defaultSize?: number          // 默认字号
  
  // 模式
  mode?: EditorMode             // 编辑模式：edit | readonly | form | print
  
  // 其他
  placeholder?: IPlaceholder    // 占位符配置
  pageNumber?: IPageNumber      // 页码配置
  lineNumber?: ILineNumber      // 行号配置
}
```

## 数据结构

### IElement - 元素结构

```typescript
interface IElement {
  // 基础属性
  id?: string                   // 元素 ID
  type?: ElementType            // 元素类型
  value: string                 // 文本内容
  
  // 文本样式
  font?: string                 // 字体
  size?: number                 // 字号
  bold?: boolean                // 加粗
  italic?: boolean              // 斜体
  underline?: boolean           // 下划线
  strikeout?: boolean           // 删除线
  color?: string                // 文字颜色
  highlight?: string            // 高亮颜色
  
  // 段落样式
  rowFlex?: RowFlex             // 对齐方式
  rowMargin?: number            // 行距
  
  // 图片属性
  width?: number                // 图片宽度
  height?: number               // 图片高度
  imgDisplay?: ImageDisplay     // 图片显示模式
  
  // 表格属性（type: 'table'）
  trList?: ITr[]                // 表格行列表
  
  // 列表属性
  listType?: ListType           // 列表类型
  listStyle?: ListStyle         // 列表样式
  listId?: string               // 列表组 ID
  
  // 超链接
  url?: string                  // 链接地址
  
  // 控件属性
  control?: IControl            // 控件配置
}
```

### IEditorData - 编辑器数据

```typescript
interface IEditorData {
  header?: IElement[]           // 页眉元素
  main: IElement[]              // 主体内容
  footer?: IElement[]           // 页脚元素
}
```

## 命令 API

### 编辑命令

```typescript
// 撤销/重做
editor.command.executeUndo()
editor.command.executeRedo()

// 剪切/复制/粘贴
editor.command.executeCut()
editor.command.executeCopy()
editor.command.executePaste()

// 全选/删除
editor.command.executeSelectAll()
editor.command.executeBackspace()
```

### 文本格式

```typescript
// 字体样式
editor.command.executeBold()              // 加粗
editor.command.executeItalic()            // 斜体
editor.command.executeUnderline()         // 下划线
editor.command.executeStrikeout()         // 删除线
editor.command.executeSuperscript()       // 上标
editor.command.executeSubscript()         // 下标

// 字体设置
editor.command.executeFont('宋体')         // 设置字体
editor.command.executeSize(16)            // 设置字号
editor.command.executeColor('#ff0000')    // 设置颜色
editor.command.executeHighlight('#ffff00') // 设置高亮
```

### 段落格式

```typescript
// 对齐方式
editor.command.executeRowFlex(RowFlex.LEFT)    // 左对齐
editor.command.executeRowFlex(RowFlex.CENTER)  // 居中
editor.command.executeRowFlex(RowFlex.RIGHT)   // 右对齐
editor.command.executeRowFlex(RowFlex.JUSTIFY) // 两端对齐

// 行距
editor.command.executeRowMargin(1.5)           // 设置行距

// 标题
editor.command.executeTitle(TitleLevel.FIRST)  // 一级标题
editor.command.executeTitle(TitleLevel.SECOND) // 二级标题
editor.command.executeTitle(null)              // 取消标题
```

### 列表

```typescript
// 有序列表
editor.command.executeList(ListType.OL, ListStyle.DECIMAL)

// 无序列表
editor.command.executeList(ListType.UL, ListStyle.DISC)

// 取消列表
editor.command.executeList(null, null)
```

### 插入内容

```typescript
// 插入文本
editor.command.executeInsertElementList([
  { value: '插入的文本' }
])

// 插入图片
editor.command.executeImage({
  value: 'base64...', // 或图片 URL
  width: 200,
  height: 150
})

// 插入表格
editor.command.executeInsertTable(3, 4)  // 3行4列

// 插入分页符
editor.command.executePageBreak()

// 插入水印
editor.command.executeWatermark({
  data: '机密文件',
  color: '#cccccc',
  size: 60
})
```

### 表格操作

```typescript
// 插入行/列
editor.command.executeInsertTableTopRow()    // 上方插入行
editor.command.executeInsertTableBottomRow() // 下方插入行
editor.command.executeInsertTableLeftCol()   // 左侧插入列
editor.command.executeInsertTableRightCol()  // 右侧插入列

// 删除行/列
editor.command.executeDeleteTableRow()       // 删除行
editor.command.executeDeleteTableCol()       // 删除列

// 合并/拆分单元格
editor.command.executeMergeTableCell()       // 合并选中单元格
editor.command.executeCancelMergeTableCell() // 取消合并

// 表格边框
editor.command.executeTableBorderType(TableBorder.ALL)     // 所有边框
editor.command.executeTableBorderType(TableBorder.NONE)    // 无边框
editor.command.executeTableBorderType(TableBorder.OUTSIDE) // 外边框
```

### 搜索替换

```typescript
// 搜索
const result = editor.command.executeSearch('关键词')

// 替换
editor.command.executeReplace('新文本')

// 全部替换
editor.command.executeReplaceAll('旧文本', '新文本')
```

### 获取数据

```typescript
// 获取编辑器数据
const data = editor.command.getValue()

// 获取纯文本
const text = editor.command.getText()

// 获取 HTML
const html = editor.command.getHTML()

// 获取图片（导出为图片）
const images = await editor.command.getImage()
```

## 事件监听

```typescript
// 内容变化
editor.listener.contentChange = () => {
  console.log('内容已变化')
}

// 选区变化
editor.listener.rangeStyleChange = (style) => {
  console.log('当前样式:', style)
}

// 保存事件
editor.listener.saved = () => {
  console.log('已保存')
}

// 页面变化
editor.listener.pageSizeChange = (pageNo) => {
  console.log('当前页数:', pageNo)
}
```

## 插件系统

### 使用插件

```typescript
// 使用图表插件（需要额外安装 @docuflow/docx-editor-chart）
import { createChartPlugin } from '@docuflow/docx-editor-chart'
import * as echarts from 'echarts'

editor.use(createChartPlugin({ echarts }))
```

### 自定义右键菜单

```typescript
editor.register.registerContextMenuList([
  {
    key: 'myMenu',
    name: '自定义菜单',
    when: (context) => true,  // 显示条件
    callback: (command, context) => {
      console.log('点击了自定义菜单')
    }
  }
])
```

### 自定义快捷键

```typescript
editor.register.registerShortcutList([
  {
    key: 'mod+shift+c',
    callback: (command) => {
      command.executeCopy()
    }
  }
])
```

## 销毁

```typescript
// 销毁编辑器实例
editor.destroy()
```

## 类型导出

```typescript
import {
  // 编辑器类
  DocxEditor,
  Editor,       // DocxEditor 别名
  Command,
  
  // 枚举
  RowFlex,
  VerticalAlign,
  EditorZone,
  EditorMode,
  ElementType,
  ControlType,
  PageMode,
  ImageDisplay,
  KeyMap,
  BlockType,
  PaperDirection,
  TableBorder,
  TitleLevel,
  ListType,
  ListStyle,
  
  // 类型
  IElement,
  IEditorData,
  IEditorOption,
  IEditorResult,
  IWatermark,
  IRange,
  
  // 工具函数
  splitText,
  getElementListByHTML,
  getTextFromElementList
} from '@docuflow/docx-editor-core'
```

## 浏览器兼容性

- Chrome 80+
- Firefox 75+
- Safari 13.1+
- Edge 80+

## License

MIT
