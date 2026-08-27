# @vervedoc/for-node

VerveDocs Node 服务 — 桥接 `vervedocs-for-java` jar 包，对外暴露 HTTP API，支持 `.docx` ↔ JSON 双向转换与 JSON → PDF 导出。

## 架构

```
HTTP Client
    │
    ▼
Express (:1320)                       ← 本服务
    ├ GET  /health                      健康检查
    ├ POST /documents/translate/word    docx → json
    └ POST /documents/render            json → docx/pdf（?format=docx|pdf）
    │
    ▼
child_process.spawn('java', ['-jar', 'vervedocs-for-java.jar', ...])
    │
    ▼
vervedocs-for-java.jar                ← Java 端（Apache POI + docx4j）
```

底层通过 `child_process.spawn` 调用 `vervedocs-for-java.jar` 的 CLI，使用临时文件传递输入输出。  
服务已启用 CORS，便于本地 playground 等浏览器前端直连。

## 环境要求

- Node.js >= 18
- Java 8+（需在 PATH 中可用，或通过 `JAVA_BIN` 指定）
- pnpm >= 10（monorepo 开发时）

## 快速开始

### 1. 准备 jar 包

jar 包已内置在 `jars/vervedocs-for-java.jar`。如需更新：

```bash
# 在 vervedocs-for-java 目录下打包
mvn package
# 复制到本服务
cp vervedocs-for-java/target/vervedocs-for-java.jar apps/vervedocs-for-node/jars/
```

### 2. 安装依赖

```bash
# 在 monorepo 根目录
pnpm install
```

### 3. 启动开发服务

```bash
# 在 monorepo 根目录
pnpm --filter @vervedoc/for-node vervedocs-for-node:dev

# 或在 apps/vervedocs-for-node 目录下
pnpm vervedocs-for-node:dev
```

### 4. 构建与生产启动

```bash
pnpm --filter @vervedoc/for-node build
pnpm --filter @vervedoc/for-node start
```

## 配置

通过 `.env` 或环境变量配置（参考 `.env.example`）：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | `1320` |
| `JAVA_BIN` | Java 可执行文件路径 | `java` |
| `JAR_PATH` | jar 包路径（绝对或相对项目根） | `./jars/vervedocs-for-java.jar` |
| `JAVA_OPTS` | JVM 参数 | `-Xmx512m` |
| `TEMP_DIR` | 临时文件目录 | 系统临时目录 |
| `TEMP_TTL` | 临时文件保留时长（毫秒） | `300000` |

## API 文档

### `GET /health`

健康检查，返回服务状态与 jar 桥接就绪情况。

```bash
curl http://localhost:1320/health
```

### `POST /documents/translate/word`

解析 `.docx` 文件，返回与前端 `IDocxParseResult` 同构的 JSON。

**请求**：`multipart/form-data`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `file` | File | 是 | `.docx` 文件 |
| `defaultFont` | string | 否 | 默认字体 |
| `defaultSize` | number | 否 | 默认字号 px |
| `tableWidthMode` | `fit`\|`word` | 否 | 表格宽度模式 |
| `forceLineHeight` | number | 否 | 强制行高倍率 |
| `includeHeaderFooter` | boolean | 否 | 包含页眉页脚 |
| `includeFootnotes` | boolean | 否 | 包含脚注正文 |
| `chartStrategy` | `preview`\|`xml`\|`skip` | 否 | 图表策略 |
| `mathStrategy` | `text`\|`placeholder`\|`skip` | 否 | 公式策略 |

选项也可通过 query string 传递。

**响应**：`application/json`

```bash
curl -X POST http://localhost:1320/documents/translate/word \
  -F "file=@input.docx" \
  -F "includeHeaderFooter=true"
```

成功：

```json
{
  "success": true,
  "code": 200,
  "data": {
    "success": true,
    "elements": [...],
    "comments": [...],
    "pageWidth": 794.0,
    "pageHeight": 1123.0,
    "margins": [96.0, 96.0, 96.0, 96.0],
    "paperDirection": "vertical"
  }
}
```

失败：

```json
{
  "success": false,
  "error": "解析/导出失败: ...",
  "exitCode": 1,
  "stderr": "..."
}
```

### `POST /documents/render`

将 JSON 转换为 `.docx` 或 PDF。

**请求**：支持两种形式

1. `application/json` — 直接 POST 文档 JSON body，选项通过 query 传递
2. `multipart/form-data` — `file` 字段为 `.json` 文件，选项通过 form fields 传递

| 选项 | 类型 | 说明 |
|------|------|------|
| `format` | `docx`\|`pdf` | 输出格式（query，默认 `docx`） |
| `defaultFont` | string | 默认字体 |
| `defaultSize` | number | 默认字号 px |

**响应**：成功返回二进制流，失败返回 JSON。

```bash
# 导出 docx
curl -X POST "http://localhost:1320/documents/render?format=docx" \
  -H "Content-Type: application/json" \
  --data-binary @input.json \
  -o output.docx

# 导出 pdf
curl -X POST "http://localhost:1320/documents/render?format=pdf" \
  -H "Content-Type: application/json" \
  --data-binary @input.json \
  -o output.pdf

# 上传 .json 文件
curl -X POST "http://localhost:1320/documents/render?format=docx" \
  -F "file=@input.json" \
  -o output.docx
```

## 退出码契约

来自 `vervedocs-for-java` CLI：

| 退出码 | 含义 |
|--------|------|
| 0 | 成功 |
| 1 | 解析/导出失败 |
| 2 | 参数错误 |
| 3 | IO 错误 |

## 项目结构

```
apps/vervedocs-for-node/
├── package.json
├── tsconfig.json
├── .env.example
├── jars/                           # 内置 jar 包
│   └── vervedocs-for-java.jar
└── src/
    ├── index.ts                    # HTTP 服务入口
    ├── config.ts                   # 配置
    ├── routes/                     # 路由
    │   └── index.ts                # /translate/word、/render
    ├── services/
    │   └── jar-bridge.ts           # Java jar 调用桥接
    ├── types/
    │   └── api-types.ts
    └── utils/
        └── temp-files.ts           # 临时文件管理
```

## 与 monorepo 集成

本服务已纳入 pnpm workspace（`apps/*`），可在根目录通过 filter 调用：

```bash
pnpm --filter @vervedoc/for-node vervedocs-for-node:dev
pnpm --filter @vervedoc/for-node build
pnpm --filter @vervedoc/for-node start
```

## 许可证

MIT
