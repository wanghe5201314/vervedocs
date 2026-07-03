import pkg from '../../package.json'

export const DOCX_EDITOR_DATA_VERSION = '1.0.0'

// 统一使用 package.json 的版本号，避免 Worker 和 fallback 链路版本不一致。
export const DOCX_EDITOR_SCHEMA_VERSION = String((pkg as any).version || '1.0.0')
