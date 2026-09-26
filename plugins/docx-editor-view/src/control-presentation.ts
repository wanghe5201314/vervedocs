import { computeControlDisplayValue, type IControlElement } from '@vervedoc/docx-editor-schema'

export interface ControlPresentation {
  text: string
  placeholder?: boolean
  mark?: { kind: 'checkbox' | 'radio'; checked: boolean }
  optionValue?: string
}

// A measured slot for a vector mark, never persisted in the document value.
export const CONTROL_MARK = '\uFFFC'

export function getControlPresentation(element: IControlElement): ControlPresentation[] {
  const { control, dataValue } = element
  if (control.kind === 'checkbox') {
    return [{
      text: CONTROL_MARK + (control.checkboxLabel ? ` ${control.checkboxLabel}` : ''),
      mark: { kind: 'checkbox', checked: dataValue === true }
    }]
  }
  if (control.kind === 'radioGroup' && control.options?.length) {
    return control.options.map((option, index) => ({
      text: `${CONTROL_MARK} ${option.label}${index < control.options!.length - 1 ? '  ' : ''}`,
      mark: { kind: 'radio', checked: dataValue === option.value },
      optionValue: option.value
    }))
  }
  const text = computeControlDisplayValue(control, dataValue)
  return [{ text: text || control.placeholder || '\u200B', placeholder: !text }]
}
