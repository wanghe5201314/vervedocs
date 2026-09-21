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
editor.command.executeSetBold()  // 加粗
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
editor.command.executeSetBold()              // 加粗
editor.command.executeSetItalic()            // 斜体
editor.command.executeSetUnderline()         // 下划线
editor.command.executeSetStrikeout()         // 删除线
editor.command.executeSetSuperscript()       // 上标
editor.command.executeSetSubscript()         // 下标

// 字体设置
editor.command.executeSetFont('宋体')         // 设置字体
editor.command.executeSetSize(16)            // 设置字号
editor.command.executeSetColor('#ff0000')    // 设置颜色
editor.command.executeSetHighlight('#ffff00') // 设置高亮
```

### 段落格式

```typescript
// 对齐方式
editor.command.executeSetRowFlex(RowFlex.LEFT)    // 左对齐
editor.command.executeSetRowFlex(RowFlex.CENTER)  // 居中
editor.command.executeSetRowFlex(RowFlex.RIGHT)   // 右对齐
editor.command.executeSetRowFlex(RowFlex.JUSTIFY) // 两端对齐

// 行距
editor.command.executeSetRowMargin(1.5)           // 设置行距

// 标题
editor.command.executeSetTitle(TitleLevel.FIRST)  // 一级标题
editor.command.executeSetTitle(TitleLevel.SECOND) // 二级标题
editor.command.executeSetTitle(null)              // 取消标题
```

### 列表

```typescript
// 有序列表
editor.command.executeSetList(ListType.OL, ListStyle.DECIMAL)

// 无序列表
editor.command.executeSetList(ListType.UL, ListStyle.DISC)

// 取消列表
editor.command.executeSetList(null, null)
```

### 插入内容

```typescript
// 插入文本
editor.command.executeInsertElementList([
  { value: '插入的文本' }
])

// 插入图片
editor.command.executeInsertImage({
  value: 'base64...', // 或图片 URL
  width: 200,
  height: 150
})

// 插入表格
editor.command.executeInsertTable(3, 4)  // 3行4列

// 插入分页符
editor.command.executePageBreak()

// 插入水印
editor.command.executeAddWatermark({
  data: '机密文件',
  color: '#cccccc',
  size: 60
})
```

### 表格操作

```typescript
// 插入行/列
editor.command.executeInsertTableRow('above')  // 上方插入行
editor.command.executeInsertTableRow('below')  // 下方插入行
editor.command.executeInsertTableCol('left')    // 左侧插入列
editor.command.executeInsertTableCol('right')   // 右侧插入列

// 删除行/列
editor.command.executeDeleteTableRow()       // 删除行
editor.command.executeDeleteTableCol()       // 删除列

// 合并单元格
editor.command.executeMergeTableCells()       // 合并选中单元格

// 表格边框
editor.command.executeSetTableBorderType(TableBorder.ALL)     // 所有边框
editor.command.executeSetTableBorderType(TableBorder.NONE)    // 无边框
editor.command.executeSetTableBorderType(TableBorder.OUTSIDE) // 外边框
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

// 获取字数统计
const wordCount = editor.command.getWordCount()

// 获取页面缩略图
const images = editor.command.getPageThumbnails()
```

## 事件监听

编辑器通过 `listener` 提供分组事件订阅 API，每个分组返回取消订阅函数。所有事件名使用 camelCase，命名空间方法不带 on 前缀、不带 Change 后缀，以 Listener 结尾。

### 内容事件

```typescript
// 内容变更（文本增删/格式修改等）
const off = editor.listener.content.contentListener(() => {
  console.log('内容已变化')
})

// 文档保存完成
editor.listener.content.savedListener(() => {
  console.log('已保存')
})

// 取消订阅
off()
```

### 选区事件

```typescript
// 选区变更（光标移动/选区改变）
editor.listener.range.rangeListener((range) => {
  console.log('当前选区:', range)
})

// 格式变更（bold/italic 等回显状态）
editor.listener.range.formatListener((style) => {
  console.log('当前样式:', style)
})

// 光标位置变更
editor.listener.range.positionListener((pos) => {
  console.log('光标位置:', pos)
})
```

### 页面事件

```typescript
// 缩放比例变更
editor.listener.page.pageScaleListener((scale) => {
  console.log('缩放比例:', scale)
})

// 页面尺寸变更（宽高）
editor.listener.page.pageSizeListener((size) => {
  console.log('页面尺寸:', size)
})

// 总页数变更
editor.listener.page.pageCountListener((count) => {
  console.log('总页数:', count)
})

// 当前页码变更
editor.listener.page.currentPageNoListener((pageNo) => {
  console.log('当前页码:', pageNo)
})
```

### 目录事件

```typescript
// 目录变更（由核心 Worker 后台计算后自动推送）
editor.listener.toc.tocListener((toc) => {
  console.log('目录已更新:', toc)
})
```

### 缩略图事件

```typescript
// 缩略图变更（由核心 afterRender 自动生成并推送）
editor.listener.thumbnail.thumbnailListener((images) => {
  console.log('缩略图数量:', images.length)
})
```

### 能力事件

```typescript
// 编辑器能力变更（readonly/disabled/canUndo/canRedo）
editor.listener.ability.abilityListener((ability) => {
  console.log('编辑器能力:', ability)
})
```

### 区域事件

```typescript
// 编辑区域切换（正文/页眉/页脚）
editor.listener.zone.zoneListener((zone) => {
  console.log('当前区域:', zone)  // 'main' | 'header' | 'footer'
})
```

### 生命周期事件

```typescript
// 编辑器获得焦点
editor.listener.lifecycle.focusListener(() => {
  console.log('获得焦点')
})

// 编辑器失去焦点
editor.listener.lifecycle.blurListener(() => {
  console.log('失去焦点')
})
```

### 请求事件

```typescript
// 请求插入图片（右键菜单触发）
editor.listener.request.requestInsertImageListener(() => {
  console.log('请求插入图片')
})

// 请求插入超链接
editor.listener.request.requestInsertHyperlinkListener(() => {
  console.log('请求插入超链接')
})

// 请求插入公式
editor.listener.request.requestInsertFormulaListener(() => {
  console.log('请求插入公式')
})
```

### 底层事件 API

```typescript
// 直接通过事件名订阅（camelCase）
const off = editor.listener.on('contentChange', () => {
  console.log('内容已变化')
})

// 取消订阅
editor.listener.off('contentChange', handler)

// 所有可用事件名：
// 'contentChange' | 'saved' | 'rangeChange' | 'formatChange' | 'positionChange'
// 'pageScaleChange' | 'pageSizeChange' | 'pageCountChange' | 'currentPageNoChange'
// 'tocChange' | 'thumbnailChange' | 'abilityChange' | 'zoneChange'
// 'focus' | 'blur' | 'requestInsertImage' | 'requestInsertHyperlink' | 'requestInsertFormula'
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
