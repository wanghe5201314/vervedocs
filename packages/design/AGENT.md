# @vervedoc/design

本包只放**设计资源**：CSS Variables（令牌）、图标字体与名称映射。不含 Vue 组件，不含组件交互样式。

## 边界

### 可以

- `--vd-*` 设计令牌（颜色、字体、间距、圆角、阴影等）
- class 图标阶段的字体 CSS 与 `iconMap` / `resolveMaterialIcon`
- 供产品包显式注入的样式入口（`styles.css` / `tokens.css` / `icons.css`）

### 不可以

- Vue 组件、组件 BEM / 交互样式（归 `@vervedoc/ui`）
- 编辑器业务、command、产品业务 Tab
- 把图标资源或映射塞回 ui，或恢复已废弃的 `@vervedoc/icons` 职责

产品包负责显式注入 design；ui 组件通过 CSS Variables 消费令牌，不在本包维护组件样式。

## 约定

| 用途 | 规范 | 示例 |
|------|------|------|
| CSS Variables | `--vd-*` | `--vd-ribbon-brand`、`--vd-space-4` |
| 样式入口 | 包 exports | `@vervedoc/design/styles.css`（tokens + icons） |
| JS 导出 | 映射 API only | `resolveMaterialIcon`、`iconMap` |

