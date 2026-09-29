import { computeControlDisplayValue, type IControlElement } from '@vervedoc/docx-editor-schema'

export interface ControlPresentation {
  text: string
  placeholder?: boolean
  mark?: { kind: 'checkbox' | 'radio'; checked: boolean }
  optionValue?: string
  /** 自动展示括号的字符偏移，不包含用户输入的真实括号。 */
  bracketOffsets?: number[]
}

// 用于测量矢量勾选标记的占位字符，不写入文档数据值。
export const CONTROL_MARK = '\uFFFC'

/**
 * 生成用于布局和绘制的控件展示片段，不修改控件定义或文档数据。
 * @param element 内容控件及其当前数据值
 * @param printing 是否生成打印展示，省略自动括号与空值占位提示
 * @returns 包含展示文本及可选勾选标记、选项值的片段数组
 */
export function getControlPresentation(element: IControlElement, printing = false): ControlPresentation[] {
  const { control, dataValue } = element
  // 仅编辑态为带 binding 的控件自动添加展示括号。
  const bracketed = !printing && !!element.extension?.binding
  if (control.kind === 'checkbox') {
    const text = CONTROL_MARK + (control.checkboxLabel ? ` ${control.checkboxLabel}` : '')
    return [{
      text: bracketed ? `[${text}]` : text,
      bracketOffsets: bracketed ? [0, text.length + 1] : undefined,
      mark: { kind: 'checkbox', checked: dataValue === true }
    }]
  }
  if (control.kind === 'radioGroup' && control.options?.length) {
    return control.options.map((option, index) => {
      const first = index === 0
      const last = index === control.options!.length - 1
      const text = `${first && bracketed ? '[' : ''}${CONTROL_MARK} ${option.label}${last && bracketed ? ']' : ''}${last ? '' : '  '}`
      return {
        text,
        bracketOffsets: bracketed ? [
          ...(first ? [0] : []),
          ...(last ? [text.length - 1] : [])
        ] : undefined,
        mark: { kind: 'radio' as const, checked: dataValue === option.value },
        optionValue: option.value
      }
    })
  }
  // 由控件数据值计算的实际展示文本，不包含空值占位提示或编辑态自动括号。
  const text = computeControlDisplayValue(control, dataValue)
  if (printing) return [{ text }]
  const displayText = text || control.placeholder || ''
  return [{
    text: bracketed ? `[${displayText}]` : displayText || '\u200B',
    bracketOffsets: bracketed ? [0, displayText.length + 1] : undefined,
    placeholder: !text
  }]
}
