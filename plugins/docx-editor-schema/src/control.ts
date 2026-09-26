/**
 * VerveDocs Schema —— 内置内容控件工具函数
 *
 * 提供控件显示文本计算、实例 ID 生成、值校验与元素工厂，
 * 供命令层、布局层和序列化层共享调用。
 */

import type { IControlConfig, IControlElement, ControlDataValue, ControlKind } from './types'

/* -------------------- 显示文本计算 -------------------- */

/**
 * 根据控件配置和实际业务值计算显示文本。
 * 空值返回空字符串（占位提示由布局层作为视图装饰渲染，不存入 value）。
 */
export function computeControlDisplayValue(control: IControlConfig, dataValue: ControlDataValue): string {
  const { kind } = control
  if (dataValue === null || dataValue === undefined) {
    return ''
  }
  switch (kind) {
    case 'text':
      return String(dataValue)
    case 'number':
      return formatNumberDisplay(dataValue, control)
    case 'date':
      return String(dataValue)
    case 'select': {
      if (dataValue === '') return ''
      const opt = control.options?.find(o => o.value === dataValue)
      return opt?.label ?? String(dataValue)
    }
    case 'multiSelect': {
      const values = Array.isArray(dataValue) ? dataValue : []
      if (values.length === 0) return ''
      const delimiter = control.delimiter ?? ','
      const options = control.options ?? []
      const selected = new Set(values)
      const ordered = options.filter(option => selected.has(option.value)).map(option => option.value)
      return [...new Set([...ordered, ...values])]
        .map(v => control.options?.find(o => o.value === v)?.label ?? v)
        .join(delimiter)
    }
    case 'checkbox':
      return control.checkboxLabel ?? ''
    case 'radioGroup': {
      if (dataValue === '') return ''
      const opt = control.options?.find(o => o.value === dataValue)
      return opt?.label ?? String(dataValue)
    }
    default:
      return String(dataValue)
  }
}

/** 数字显示格式化：分离显示格式与实际值 */
function formatNumberDisplay(dataValue: ControlDataValue, control: IControlConfig): string {
  if (typeof dataValue !== 'number') return String(dataValue)
  if (control.format) {
    try {
      return control.format.replace(/\{0\}/g, String(dataValue))
    } catch {
      return String(dataValue)
    }
  }
  return String(dataValue)
}

/* -------------------- 实例 ID 生成 -------------------- */

let controlIdCounter = 0

/**
 * 生成控件实例唯一 ID。
 * 格式：ctrl-<时间戳36进制>-<递增计数36进制>，保证文档内唯一。
 */
export function generateControlId(): string {
  const ts = Date.now().toString(36)
  const counter = (controlIdCounter++).toString(36)
  return `ctrl-${ts}-${counter}`
}

/* -------------------- 值校验 -------------------- */

/** 控件校验结果 */
export interface ControlValidationResult {
  valid: boolean
  /** 校验失败原因（国际化键名或空） */
  reason?: string
}

/**
 * 校验控件值是否满足配置约束。
 * 不修改传入值，仅返回校验结果。
 */
export function validateControlValue(control: IControlConfig, dataValue: ControlDataValue): ControlValidationResult {
  const { kind, required } = control

  if (required) {
    if (isEmptyValue(kind, dataValue)) {
      return { valid: false, reason: 'control.required' }
    }
  }

  switch (kind) {
    case 'number':
      return validateNumber(control, dataValue)
    case 'text':
      if (control.maxLength != null && typeof dataValue === 'string' && dataValue.length > control.maxLength) {
        return { valid: false, reason: 'control.maxLength' }
      }
      return { valid: true }
    case 'select':
    case 'radioGroup': {
      if (dataValue === null || dataValue === '' ) return { valid: true }
      const options = control.options ?? []
      if (!options.some(o => o.value === dataValue)) {
        return { valid: false, reason: 'control.invalidOption' }
      }
      return { valid: true }
    }
    case 'multiSelect': {
      const values = Array.isArray(dataValue) ? dataValue : []
      const options = control.options ?? []
      for (const v of values) {
        if (!options.some(o => o.value === v)) {
          return { valid: false, reason: 'control.invalidOption' }
        }
      }
      return { valid: true }
    }
    default:
      return { valid: true }
  }
}

/** 判断控件值是否为空（区分空值、零、false） */
export function isEmptyValue(kind: ControlKind, dataValue: ControlDataValue): boolean {
  if (dataValue === null || dataValue === undefined) return true
  if (kind === 'multiSelect') {
    return Array.isArray(dataValue) && dataValue.length === 0
  }
  if (kind === 'checkbox') {
    return false
  }
  if (typeof dataValue === 'string') return dataValue === ''
  return false
}

/** 数字校验：最小值、最大值、精度 */
function validateNumber(control: IControlConfig, dataValue: ControlDataValue): ControlValidationResult {
  if (dataValue === null || dataValue === '' || dataValue === undefined) {
    return { valid: true }
  }
  const num = typeof dataValue === 'number' ? dataValue : Number(dataValue)
  if (!Number.isFinite(num)) {
    return { valid: false, reason: 'control.notNumber' }
  }
  if (control.min != null && num < control.min) {
    return { valid: false, reason: 'control.belowMin' }
  }
  if (control.max != null && num > control.max) {
    return { valid: false, reason: 'control.aboveMax' }
  }
  return { valid: true }
}

/* -------------------- 元素工厂 -------------------- */

/**
 * 创建控件元素。
 * 自动生成 ID、计算初始显示文本。
 */
export function createControlElement(
  config: IControlConfig,
  dataValue: ControlDataValue = null,
  id?: string
): IControlElement {
  const controlId = id ?? generateControlId()
  const displayValue = computeControlDisplayValue(config, dataValue)
  return {
    type: 'control',
    id: controlId,
    control: config,
    dataValue,
    value: displayValue,
  }
}

/**
 * 更新控件元素的值，同步刷新显示文本。
 * 返回新对象，不修改原元素。
 */
export function updateControlElementValue(
  element: IControlElement,
  newDataValue: ControlDataValue
): IControlElement {
  const displayValue = computeControlDisplayValue(element.control, newDataValue)
  return {
    ...element,
    dataValue: newDataValue,
    value: displayValue,
  }
}

/**
 * 校验控件配置本身是否合法（options 的 value 唯一、min <= max 等）。
 */
export function validateControlConfig(config: IControlConfig): ControlValidationResult {
  if (config.kind === 'number') {
    if (config.min != null && config.max != null && config.min > config.max) {
      return { valid: false, reason: 'control.minGreaterThanMax' }
    }
  }
  if (config.options) {
    const seen = new Set<string>()
    for (const opt of config.options) {
      if (seen.has(opt.value)) {
        return { valid: false, reason: 'control.duplicateOptionValue' }
      }
      seen.add(opt.value)
    }
  }
  return { valid: true }
}
