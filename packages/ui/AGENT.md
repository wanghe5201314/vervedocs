# @vervedoc/ui

本包只放**无业务逻辑**的基础 / 复合 UI 组件（如 `VdIcon`、Ribbon 原语与 Tab 复合组件）。

## 边界

### 可以**

- 展示、插槽、`v-model` / 本地 UI 状态
- 仅 emit 交互事件（如 `click`、`update:activeKey`）
- 组件自身的 BEM 样式

### 不可以

- 产品业务
- 设计令牌、字体、图标映射等资源（归 `@vervedoc/design`；本包通过 CSS Variables 消费）

调用方负责注入 design、绑定业务与状态。

## 命名

| 用途              | 规范               | 示例                                             |
| ----------------- | ------------------ | ------------------------------------------------ |
| 文件 / 导出       | PascalCase `VdXxx` | `VdRibbonButton.vue` → `VdRibbonButton`          |
| 组件名 / 模板标签 | kebab `vd-xxx`     | `name: 'vd-ribbon-button'`、`<vd-ribbon-button>` |
| CSS BEM block     | `vd-xxx`           | `.vd-ribbon-button`、`&__icon`、`&--active`      |

三者必须对齐：`VdRibbonButton` ↔ `vd-ribbon-button` ↔ `.vd-ribbon-button`。

## 样式

- 使用组件内 `<style lang="scss">`
- **禁止** `scoped`
- 用 Sass 嵌套写 BEM；颜色 / 间距等取 design 的 CSS Variables
- 不提供单独的全局 `style.css` 入口
