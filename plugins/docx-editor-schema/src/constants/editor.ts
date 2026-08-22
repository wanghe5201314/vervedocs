import { DeepRequired } from '../interface/common'
import { IModeRule } from '../interface/editor'

export const EDITOR_COMPONENT = 'editor-component'
export const EDITOR_PREFIX = 'ce'
export const EDITOR_CLIPBOARD = `${EDITOR_PREFIX}-clipboard`

export const defaultModeRuleOption: Readonly<DeepRequired<IModeRule>> = {
  print: {
    imagePreviewerDisabled: false
  },
  readonly: {
    imagePreviewerDisabled: false
  },
  form: {
    controlDeletableDisabled: false
  }
}
