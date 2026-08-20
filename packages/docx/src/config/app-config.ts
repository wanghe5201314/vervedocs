/**
 * 应用配置文件
 */

export interface FlowButtonConfig {
  /** 文档流按钮是否可见 */
  documentVisible: boolean
  /** 工作流按钮是否可见 */
  workflowVisible: boolean
}

export interface AppConfig {
  /** 右侧流程按钮配置 */
  flowButtons: FlowButtonConfig
  autoSave: boolean
  'auto-save': boolean
}

/**
 * 默认配置
 */
export const defaultAppConfig: AppConfig = {
  flowButtons: {
    documentVisible: false,
    workflowVisible: false
  },
  autoSave: false,
  'auto-save': false
}

/**
 * 当前应用配置
 * 可根据需要从后端接口或 localStorage 读取
 */
export const appConfig: AppConfig = {
  ...defaultAppConfig
}

/**
 * 更新配置
 */
export function updateAppConfig(config: Partial<AppConfig>) {
  Object.assign(appConfig, config)
  if (config.autoSave !== undefined) appConfig['auto-save'] = config.autoSave
  if ((config as any)['auto-save'] !== undefined) appConfig.autoSave = Boolean((config as any)['auto-save'])
}
