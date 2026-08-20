# VerveDocs - 玉衡云文档

一套基于 Vue 3 + TypeScript 的企业级在线文档编辑解决方案，支持 Word、Excel、PPT 等多种文档格式的在线编辑与协作。

## 特性

- 多格式支持：Word 文档、Excel 表格、PPT 演示文稿
- 富文本编辑：文本格式化、表格、图片、列表、页眉页脚、水印等
- 实时协作：多人在线协同编辑
- 插件系统：可扩展的功能插件机制
- TypeScript 支持：完整的类型定义
- 响应式设计：适配多种屏幕尺寸

## 技术栈

- Vue 3 - 渐进式 JavaScript 框架
- TypeScript - JavaScript 的超集
- Element Plus - Vue 3 UI 组件库
- ECharts - 数据可视化图表库
- Vite - 下一代前端构建工具
- docx - Word 文档生成库
- exceljs - Excel 文件处理库
- pptxgenjs - PPT 生成库

## 项目结构

```
vervedocs/
├── packages/
│   ├── core/                    # 核心编辑器库
│   ├── docx/                    # Word 文档编辑器完整版 UI
│   ├── docx-lite/               # Word 文档编辑器轻量版
│   ├── excel/                   # Excel 表格编辑器
│   ├── ppt/                     # PPT 演示文稿编辑器
│   └── icons/                   # 图标库
├── plugins/                     # 编辑器扩展库
│   ├── docx-editor-ai/          # AI 辅助功能
│   ├── docx-editor-chart/       # 图表插件
│   ├── docx-editor-collaboration/  # 协作功能
│   ├── docx-editor-commands/    # 命令系统
│   ├── docx-editor-comment/     # 批注功能
│   ├── docx-editor-history/     # 历史记录
│   ├── docx-editor-keymap/      # 快捷键映射
│   ├── docx-editor-schema/      # 文档模式定义
│   ├── docx-editor-state/       # 状态管理
│   ├── docx-editor-transform/   # 文档转换
│   └── docx-editor-view/        # 视图层
├── apps/
│   ├── collaboration-server/    # 协作服务器
│   └── collaboration-server-monitor/  # 协作服务器监控
├── package.json
├── pnpm-workspace.yaml
└── pnpm-lock.yaml
```

## 模块介绍

### @vervedoc/core

核心编辑器库，提供基础的富文本编辑功能。

```bash
npm install @vervedoc/core
```

主要功能：
- 富文本编辑（加粗、斜体、下划线、删除线、高亮等）
- 表格操作（插入、合并、拆分、边框设置）
- 图片处理（插入、缩放、拖拽）
- 列表功能（有序、无序、多级列表）
- 页面布局（页眉、页脚、页码、水印、页边距）
- 控件系统（文本控件、日期控件、下拉选择）
- 历史记录（撤销/重做）
- 搜索替换

### @vervedoc/docx

Word 文档编辑器完整版，提供完整的 UI 界面和交互。

```bash
npm install @vervedoc/docx
```

### @vervedoc/excel

Excel 表格编辑器，支持电子表格的在线编辑。

```bash
npm install @vervedoc/excel
```

### @vervedoc/ppt

PPT 演示文稿编辑器，支持幻灯片的在线制作。

```bash
npm install @vervedoc/ppt
```

## 快速开始

### 安装依赖

```bash
# 安装核心库
npm install @vervedoc/core

# 安装 Word 编辑器
npm install @vervedoc/docx

# 安装 Excel 编辑器
npm install @vervedoc/excel

# 安装 PPT 编辑器
npm install @vervedoc/ppt
```

### 使用示例

#### Word 文档编辑器

```typescript
import DocxEditor from '@vervedoc/core'

const container = document.getElementById('editor') as HTMLDivElement

const editor = new DocxEditor(container, {
  main: [
    { value: '欢迎使用 VerveDocs！' }
  ]
})

// 使用命令 API
editor.command.executeBold()  // 加粗
editor.command.executeUndo()  // 撤销
```

## 开发指南

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 9.0.0

### 本地开发

```bash
# 克隆项目
git clone https://gitee.com/wanghe520/vervedocs.git
cd vervedocs

# 安装全部依赖
pnpm install

# 启动各包开发服务器
pnpm dev:core
pnpm dev:docx
pnpm dev:docx-lite
pnpm dev:excel
pnpm dev:ppt

# 构建全部包（按 workspace 依赖拓扑顺序）
pnpm build

# 类型检查
pnpm typecheck
```

也可以用 filter 操作单个包：

```bash
pnpm --filter @vervedoc/core dev
pnpm --filter @vervedoc/core build
```

## 浏览器兼容性

- Chrome 80+
- Firefox 75+
- Safari 13.1+
- Edge 80+

## 相关链接

- [访问官网](https://www.fastword.com.cn/)

## 许可证

[MIT License](LICENSE)

Copyright (c) 2026 fastword