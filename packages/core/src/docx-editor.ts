import './assets/css/index.css'
import { formatElementList, deepClone, mergeOption } from '@vervedoc/docx-editor-schema'
import type { IComment, IEditorData, IEditorOption, IElement, EventBusMap, UsePlugin } from '@vervedoc/docx-editor-schema'

import { Draw, pasteByApi } from '@vervedoc/docx-editor-view'
import { Command } from '@vervedoc/docx-editor-transform'
import { CommandAdapt } from '@vervedoc/docx-editor-transform'
import type {
  ICommandSearchApi,
  ICommandBookmarkApi,
  ICommandRevisionApi,
  ICommandCatalogApi
} from '@vervedoc/docx-editor-transform'
import { Listener } from '@vervedoc/docx-editor-state'
import { Register } from '@vervedoc/docx-editor-view'
import { FloatingBar } from '@vervedoc/docx-editor-view'
import { Plugin } from '@vervedoc/docx-editor-view'
import { EventBus } from '@vervedoc/docx-editor-state'
import { Override } from '@vervedoc/docx-editor-view'
import { HistoryComponent } from '@vervedoc/docx-editor-history'
import { KeymapComponent, Shortcut } from '@vervedoc/docx-editor-keymap'
import { BlockParticle, ControlComponent, GadgetComponent, LaTexParticle, DateParticle } from '@vervedoc/docx-editor-commands'
import { CommentComponent, RevisionComponent } from '@vervedoc/docx-editor-comment'
import { WorkerComponent } from './worker/worker-component'
import { ExportComponent } from './export/export-component'
import { TableContextMenuComponent } from './table-contextmenu/table-context-menu-component'
import { printImageBase64 } from './utils/print'
import { I18n } from './i18n/i18n'

export interface IDocxEditorApi {
  search: ICommandSearchApi
  bookmark: ICommandBookmarkApi
  revision: ICommandRevisionApi
  catalog: ICommandCatalogApi
  comment: IDocxCommentApi
}

export interface IDocxCommentState {
  list: IComment[]
  activeGroupId: string
}

export interface IDocxCommentApi {
  getState(): IDocxCommentState
  create(userName?: string): IComment | null
  remove(id: string): void
  removeCurrent(groupId?: string): void
  locate(id: string): void
  refresh(): void
}

export default class DocxEditor {
  public command: Command
  public api: IDocxEditorApi
  public listener: Listener
  public eventBus: EventBus<EventBusMap>
  public override: Override
  public register: Register
  public comment: CommentComponent
  public revision: RevisionComponent
  public destroy: () => void
  public use: UsePlugin
  public setLoading: (visible: boolean, text?: string) => void

  constructor(
    container: HTMLDivElement,
    data: IEditorData | IElement[],
    options: IEditorOption = {}
  ) {
    const editorOptions = mergeOption(options)
    data = deepClone(data)
    let headerElementList: IElement[] = []
    let mainElementList: IElement[] = []
    let footerElementList: IElement[] = []
    if (Array.isArray(data)) {
      mainElementList = data
    } else {
      headerElementList = data.header || []
      mainElementList = data.main
      footerElementList = data.footer || []
    }
    const pageComponentData = [
      headerElementList,
      mainElementList,
      footerElementList
    ]
    pageComponentData.forEach(elementList => {
      formatElementList(elementList, {
        editorOptions,
        isForceCompensation: true,
        laTexToSVG: LaTexParticle.convertLaTextToSVG
      })
    })
    this.listener = new Listener()
    this.eventBus = new EventBus<EventBusMap>()
    this.override = new Override()
    const draw = new Draw(
      container,
      editorOptions,
      {
        header: headerElementList,
        main: mainElementList,
        footer: footerElementList
      },
      this.listener,
      this.eventBus,
      this.override
    )
    // Replace the view-layer stub with the real block particle renderer
    // so audio/video/chart block elements can mount their DOM overlays.
    const i18n = new I18n(editorOptions.locale)
    ;(draw as any).i18n = i18n

    draw.setBlockParticle(new BlockParticle(draw as any) as any)
    draw.setLaTexParticle(new LaTexParticle(draw as any) as any)
    draw.setDateParticle(new DateParticle(draw as any) as any)

    const laTexToSVG = LaTexParticle.convertLaTextToSVG
    const patchFormatElementListArgs = (elements: IElement[]) => {
      for (const el of elements) {
        if (el.type === 'latex' && el.value && !el.laTexSVG) {
          const result = laTexToSVG(el.value)
          el.laTexSVG = result.svg
          el.width = el.width || result.width
          el.height = el.height || result.height
          el.id = el.id || `latex_${Date.now()}_${Math.random().toString(36).slice(2)}`
        }
      }
    }
    const origInsertElementList = draw.insertElementList.bind(draw)
    ;(draw as any).insertElementList = (elements: IElement[], options?: any) => {
      patchFormatElementListArgs(elements)
      return origInsertElementList(elements, options)
    }
    const origAppendElementList = draw.appendElementList.bind(draw)
    ;(draw as any).appendElementList = (elements: IElement[], options?: any) => {
      patchFormatElementListArgs(elements)
      return origAppendElementList(elements, options)
    }
    new HistoryComponent().install(draw)
    new ControlComponent().install(draw)
    const workerComponent = new WorkerComponent().install(draw)

    const commandAdapt = new CommandAdapt(draw as any, {
      pasteByApi,
      printImageBase64
    })
    this.command = new Command(commandAdapt)

    ;(draw as any).__structureAdapter = commandAdapt._structure
    this.api = {
      search: this.command.search,
      bookmark: this.command.bookmark,
      revision: this.command.revision,
      catalog: this.command.catalog,
      comment: {
        getState: () => ({
          list: [...this.comment.getComments()],
          activeGroupId: ''
        }),
        create: (userName?: string) => {
          const comment = this.comment.addComment(userName)
          this.comment.render()
          return comment
        },
        remove: (id: string) => {
          this.comment.deleteComment(id)
          this.comment.render()
        },
        removeCurrent: (groupId?: string) => {
          const targetGroupId = groupId || ''
          if (!targetGroupId) return
          const currentComment = this.comment
            .getComments()
            .find(item => item.groupId === targetGroupId)
          if (currentComment) {
            this.comment.deleteComment(currentComment.id)
          } else {
            this.command.executeDeleteGroup(targetGroupId)
          }
          this.comment.render()
        },
        locate: (id: string) => {
          this.comment.locateComment(id)
        },
        refresh: () => {
          this.comment.render()
        }
      }
    }

    new GadgetComponent().install(draw, this.command)
    new ExportComponent().install(draw, this.command)
    new TableContextMenuComponent().install(draw)
    this.comment = new CommentComponent().install(this.command)
    this.revision = new RevisionComponent()

    const keymapComponent = new KeymapComponent().install(draw, this.command)

    const floatingBarEnabled = editorOptions.floatingBar?.enabled !== false
    const floatingBar = floatingBarEnabled
      ? new FloatingBar(draw, this.command)
      : null

    const shortcut = keymapComponent.getShortcut()! as Shortcut
    this.register = new Register({
      shortcut,
      i18n: draw.getI18n()
    })
    draw.setRegister(this.register)
    this.setLoading = (visible: boolean, text?: string) => draw.setLoading(visible, text)
    this.destroy = () => {
      draw.destroy()
      shortcut.removeEvent()
      floatingBar?.destroy()
      workerComponent.getWorkerManager()?.terminate()
    }
    const plugin = new Plugin(this as any)
    this.use = plugin.use.bind(plugin)
  }
}
