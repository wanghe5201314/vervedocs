import { Command } from './command'

const RESTRICTED_METHODS = new Set([
  'executeSetValue',
  'executeSetHTML',
  'executeForceUpdate',
  'executeMode',
  'executeUpdateOptions',
  'executeSetZone',
  'executePaste',
  'executeTranslate',
  'executeSetLocale',
  'executeSetControlValue',
  'executeSetControlValueList',
  'executeSetControlExtension',
  'executeSetControlExtensionList',
  'executeSetControlProperties',
  'executeSetControlPropertiesList',
  'executeSetControlHighlight',
  'executeInsertControl',
  'executeRemoveControl',
  'executeSetRange',
  'executeReplaceRange',
  'executeSetPositionContext',
  'executeSetPaperMargin',
  'executePaperSize',
  'executePaperDirection',
  'executeAddWatermark',
  'executeDeleteWatermark',
  'executeSetMainBadge',
  'executeSetAreaBadge',
  'executeInsertArea',
  'executeSetAreaProperties',
  'executeUpdateElementById',
  'executeDeleteElementById',
  'executeInsertElementList',
  'executeAppendElementList',
  'executeImage',
  'executeInsertAudio',
  'executeInsertVideo',
  'executeInsertChart',
  'executeUpdateChart',
  'executeHyperlink',
  'executeEditHyperlink',
  'executeAddBookmark',
  'executeDeleteBookmark',
  'executeInsertColumn',
  'executeRemoveColumn',
  'executeColumnBreak',
  'executeInsertTable',
  'executeInsertTableTopRow',
  'executeInsertTableBottomRow',
  'executeInsertTableLeftCol',
  'executeInsertTableRightCol',
  'executeDeleteTableRow',
  'executeDeleteTableCol',
  'executeDeleteTable',
  'executeMergeTableCell',
  'executeCancelMergeTableCell',
  'executeSplitVerticalTableCell',
  'executeSplitHorizontalTableCell',
  'executeInsertTitle',
  'executeInsertFootnote',
  'executeDeleteFootnote',
  'executeSetGroup',
  'executeDeleteGroup',
  'executeReplaceImageElement',
  'executeSaveAsImageElement',
  'executeSeparator',
  'executePageBreak',
  'executePrint'
] as const)

type RestrictedMethodName = typeof RESTRICTED_METHODS extends Set<infer T> ? T : never

const DENY_MESSAGE = (method: string) =>
  `[SafeCommand] "${method}" is restricted for third-party plugins. Use the full Command instance from editor.command for privileged operations.`

export function createSafeCommand(command: Command): Command {
  const safeCommand = Object.create(null) as Record<string, any>

  for (const key of Object.getOwnPropertyNames(Command.prototype)) {
    if (key === 'constructor') continue

    const value = (command as any)[key]
    if (typeof value !== 'function') continue

    if (RESTRICTED_METHODS.has(key as RestrictedMethodName)) {
      safeCommand[key] = () => {
        throw new Error(DENY_MESSAGE(key))
      }
    } else {
      safeCommand[key] = value.bind(command)
    }
  }

  for (const key of Object.keys(command)) {
    if (key in safeCommand) continue
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue

    if (RESTRICTED_METHODS.has(key as RestrictedMethodName)) {
      safeCommand[key] = () => {
        throw new Error(DENY_MESSAGE(key))
      }
    } else {
      const value = (command as any)[key]
      if (typeof value === 'function') {
        safeCommand[key] = value.bind(command)
      }
    }
  }

  return Object.freeze(safeCommand) as Command
}
