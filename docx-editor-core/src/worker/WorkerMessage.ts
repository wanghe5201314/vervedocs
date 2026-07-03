import type { IEditorData, IEditorOption, IEditorResult, IGetValueOption } from '@wanghe1995/docx-editor-schema'

export type WorkerRequestType =
  | 'getValue'
  | 'getWordCount'
  | 'getGroupIds'

export interface IWorkerTaskPayload {
  dataVersion: string
  schemaVersion?: string
  editorOptions?: IEditorOption
  valueOptions?: IGetValueOption
  originData?: Required<IEditorData>
  mainElementList?: any[]
}

export interface IWorkerRequest {
  id: string
  type: WorkerRequestType
  payload: IWorkerTaskPayload
}

export interface IWorkerResponse {
  id: string
  success: boolean
  data?: IEditorResult | number | string[]
  error?: string
}
