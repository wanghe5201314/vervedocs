# 配置文件使用说明

## 配置文件位置
`src/config/app.config.ts`

## 配置右侧流程按钮可见性

### 1. 直接修改配置文件

编辑 `src/config/app.config.ts`：

```typescript
export const appConfig: AppConfig = {
  flowButtons: {
    documentVisible: true,   // 文档流按钮是否可见
    workflowVisible: true    // 工作流按钮是否可见
  }
}
```

### 2. 运行时动态修改

在代码中使用 `updateAppConfig` 函数：

```typescript
import { updateAppConfig } from '@/config/app.config'

updateAppConfig({
  flowButtons: {
    documentVisible: true,
    workflowVisible: true
  }
})
```

### 3. 从后端或 localStorage 读取

在 `app.config.ts` 中修改：

```typescript
// 从 localStorage 读取配置
const savedConfig = localStorage.getItem('appConfig')
export const appConfig: AppConfig = savedConfig 
  ? JSON.parse(savedConfig) 
  : { ...defaultAppConfig }

// 从后端 API 读取配置
export async function loadConfigFromServer() {
  const response = await fetch('/api/config')
  const config = await response.json()
  updateAppConfig(config)
}
```

## 配置项说明

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `flowButtons.documentVisible` | boolean | true | 控制"文档流"按钮是否显示 |
| `flowButtons.workflowVisible` | boolean | true | 控制"工作流"按钮是否显示 |

## 注意事项

1. 至少保留一个按钮可见，避免右侧栏完全隐藏
2. 修改配置后需要重新加载页面生效（除非使用动态更新方式）
3. 配置文件支持 TypeScript 类型检查
