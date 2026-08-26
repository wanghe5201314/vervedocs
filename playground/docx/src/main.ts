import {
  WordEditor,
  createDefaultDocumentApi,
  setDocumentApi
} from '@vervedoc/docx'
import {
  buildCollaborationFromLocation,
  buildInitialDocumentFromLocation
} from './resolve-from-location'

setDocumentApi(createDefaultDocumentApi())

new WordEditor({
  container: '#app',
  initialDocument: buildInitialDocumentFromLocation(),
  collaboration: buildCollaborationFromLocation(),
  onReady: () => {
    console.info('[playground] WordEditor ready')
  }
})
