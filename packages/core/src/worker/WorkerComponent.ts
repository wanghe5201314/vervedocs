import { WorkerManager } from './WorkerManager'

type Draw = any

export class WorkerComponent {
  private workerManager: WorkerManager | null = null

  public install(draw: Draw): this {
    this.workerManager = new WorkerManager(draw)
    if (typeof draw.setWorkerManager === 'function') {
      draw.setWorkerManager(this.workerManager)
    }
    return this
  }

  public getWorkerManager(): WorkerManager | null {
    return this.workerManager
  }
}
