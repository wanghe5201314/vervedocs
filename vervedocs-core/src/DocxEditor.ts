import './assets/css/index.css'
import { formatElementList, deepClone, mergeOption } from '@vervedoc/docx-editor-schema'
import type { IEditorData, IEditorOption, IElement, EventBusMap, UsePlugin } from '@vervedoc/docx-editor-schema'

import { Draw, pasteByApi } from '@vervedoc/docx-editor-view'
import { Command } from '@vervedoc/docx-editor-transform'
import { CommandAdapt } from '@vervedoc/docx-editor-transform'
import { Listener } from '@vervedoc/docx-editor-state'
import { Register } from '@vervedoc/docx-editor-view'
import { FloatingBar } from '@vervedoc/docx-editor-view'
import { Plugin } from '@vervedoc/docx-editor-view'
import { EventBus } from '@vervedoc/docx-editor-state'
import { Override } from '@vervedoc/docx-editor-view'
import { HistoryComponent } from '@vervedoc/docx-editor-history'
import { KeymapComponent, Shortcut } from '@vervedoc/docx-editor-keymap'
import { BlockParticle, ControlComponent, GadgetComponent } from '@vervedoc/docx-editor-commands'
import { CommentComponent, RevisionComponent } from '@vervedoc/docx-editor-comment'
import { WorkerComponent } from './worker/WorkerComponent'
import { ExportComponent } from './export/ExportComponent'
import { TableContextMenuComponent } from './table-contextmenu/TableContextMenuComponent'
import { printImageBase64 } from './utils/print'

export default class DocxEditor {
  public command: Command
  public listener: Listener
  public eventBus: EventBus<EventBusMap>
  public override: Override
  public register: Register
  public comment: CommentComponent
  public revision: RevisionComponent
  public destroy: () => void
  public use: UsePlugin

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
        isForceCompensation: true
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
    draw.setBlockParticle(new BlockParticle(draw as any) as any)
    new HistoryComponent().install(draw)
    new ControlComponent().install(draw)
    const workerComponent = new WorkerComponent().install(draw)

    const commandAdapt = new CommandAdapt(draw as any, {
      pasteByApi,
      printImageBase64
    })
    this.command = new Command(commandAdapt)

    ;(draw as any).__structureAdapter = commandAdapt._structure

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
