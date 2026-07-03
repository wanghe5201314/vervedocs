import EventEmitter from 'eventemitter3'

type EventName<EventMap> = Extract<keyof EventMap, string | symbol>
type EventCallback<EventMap, K extends keyof EventMap> = Extract<
  EventMap[K],
  (...args: any[]) => void
>
type EventArgs<T> = T extends (...args: infer Args) => void ? Args : never

const DEFAULT_MAX_LISTENERS = 50

export class EventBus<EventMap> {
  private emitter: EventEmitter
  private _maxListeners: number

  constructor(maxListeners: number = DEFAULT_MAX_LISTENERS) {
    this.emitter = new EventEmitter()
    this._maxListeners = maxListeners
  }

  public on<K extends EventName<EventMap>>(
    eventName: K,
    callback: EventCallback<EventMap, K>
  ) {
    if (!eventName || typeof callback !== 'function') return
    if (
      this._maxListeners > 0 &&
      this.emitter.listeners(eventName).length >= this._maxListeners
    ) {
      console.warn(
        `[EventBus] Max listeners (${this._maxListeners}) reached for event "${String(eventName)}". Subsequent listeners are ignored.`
      )
      return
    }
    this.emitter.on(eventName, callback)
  }

  public emit<K extends EventName<EventMap>>(
    eventName: K,
    ...args: EventArgs<EventMap[K]>
  ) {
    if (!eventName) return
    this.emitter.emit(eventName, ...args)
  }

  public off<K extends EventName<EventMap>>(
    eventName: K,
    callback: EventCallback<EventMap, K>
  ) {
    if (!eventName || typeof callback !== 'function') return
    this.emitter.off(eventName, callback)
  }

  public hasSubscribers<K extends EventName<EventMap>>(eventName: K): boolean {
    return this.emitter.listeners(eventName).length > 0
  }

  public destroy() {
    this.emitter.removeAllListeners()
  }
}
