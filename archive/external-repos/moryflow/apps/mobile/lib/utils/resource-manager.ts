/**
 * 移动端资源管理器（对齐 Web 的 API 形态）
 * 统一管理可关闭的流、定时器等，避免内存泄漏
 */

export interface DisposableResource { dispose(): void }

export interface StreamResource extends DisposableResource {
  readonly id: string
  readonly isActive: boolean
}

class CloseableStreamResource implements StreamResource {
  public readonly id: string
  private closeFn: () => void
  private _isActive: boolean = true

  constructor(closeFn: () => void) {
    this.id = `stream_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    this.closeFn = closeFn
  }

  get isActive(): boolean {
    return this._isActive
  }

  dispose(): void {
    if (!this._isActive) return
    this._isActive = false
    try {
      this.closeFn()
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      if (!msg.includes('aborted')) {
        console.warn('关闭流资源时出错:', error)
      }
    }
  }
}

type TimerId = ReturnType<typeof setTimeout>

class TimerResource implements DisposableResource {
  public readonly id: string
  private timerId: TimerId | null

  constructor(timerId: TimerId) {
    this.id = `timer_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    this.timerId = timerId
  }

  dispose(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId)
      this.timerId = null
    }
  }
}

class IntervalResource implements DisposableResource {
  public readonly id: string
  private intervalId: TimerId | null

  constructor(intervalId: TimerId) {
    this.id = `interval_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    this.intervalId = intervalId
  }

  dispose(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }
}

class AbortControllerResource implements DisposableResource {
  public readonly id: string
  private controller: AbortController | null

  constructor(controller: AbortController) {
    this.id = `abort_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    this.controller = controller
  }

  dispose(): void {
    if (!this.controller) return
    try {
      this.controller.abort()
    } catch {
      // ignore
    }
    this.controller = null
  }
}

export class ResourceManager {
  private resources: Map<string, DisposableResource> = new Map()
  private disposed = false

  registerCloseableStream(close: () => void): StreamResource {
    this.checkDisposed()
    const resource = new CloseableStreamResource(close)
    this.resources.set(resource.id, resource)
    return resource
  }

  registerTimer(callback: () => void, delay: number): DisposableResource {
    this.checkDisposed()
    const timerId = setTimeout(callback, delay)
    const resource = new TimerResource(timerId)
    this.resources.set(resource.id, resource)
    return resource
  }

  registerInterval(callback: () => void, interval: number): DisposableResource {
    this.checkDisposed()
    const intervalId = setInterval(callback, interval)
    const resource = new IntervalResource(intervalId)
    this.resources.set(resource.id, resource)
    return resource
  }

  /**
   * 注册订阅资源（形如 { remove() } 的订阅对象）
   */
  registerSubscription(subscription: { remove: () => void }): DisposableResource {
    this.checkDisposed()
    const resource = new SubscriptionResource(subscription)
    this.resources.set(resource.id, resource)
    return resource
  }

  /**
   * 注册 AbortController，纳入统一清理
   */
  registerAbortController(controller: AbortController): DisposableResource {
    this.checkDisposed()
    const resource = new AbortControllerResource(controller)
    this.resources.set(resource.id, resource)
    return resource
  }

  disposeResource(resource: DisposableResource): void {
    const id = (resource as { id?: string }).id
    if (id && this.resources.has(id)) {
      resource.dispose()
      this.resources.delete(id)
    }
  }

  disposeAll(): void {
    for (const resource of this.resources.values()) {
      try {
        resource.dispose()
      } catch (error) {
        console.warn('释放资源时出错:', error)
      }
    }
    this.resources.clear()
    this.disposed = true
  }

  private isStreamResource(x: DisposableResource): x is StreamResource {
    return typeof x === 'object' && x !== null && 'isActive' in x
  }

  getActiveStreamCount(): number {
    let count = 0
    for (const resource of this.resources.values()) {
      if (this.isStreamResource(resource) && resource.isActive) count++
    }
    return count
  }

  getResourceCount(): number {
    return this.resources.size
  }

  cleanupInactiveResources(): void {
    const inactiveIds: string[] = []
    for (const [id, resource] of this.resources.entries()) {
      if (this.isStreamResource(resource) && !resource.isActive) inactiveIds.push(id)
    }
    for (const id of inactiveIds) {
      const resource = this.resources.get(id)
      if (resource) {
        resource.dispose()
        this.resources.delete(id)
      }
    }
  }

  private checkDisposed(): void {
    if (this.disposed) {
      throw new Error('ResourceManager 已被释放，不能继续使用')
    }
  }
}

export class HookResourceManager extends ResourceManager {
  private cleanupTimer: TimerId | null = null
  private hookDisposed = false

  constructor() {
    super()
    this.cleanupTimer = setInterval(() => {
      if (!this.hookDisposed) this.cleanupInactiveResources()
    }, 30000)
  }

  disposeAll(): void {
    if (this.hookDisposed) return
    this.hookDisposed = true
    if (this.cleanupTimer !== null) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    setTimeout(() => super.disposeAll(), 100)
  }

  async gracefulShutdown(timeout: number = 5000): Promise<void> {
    if (this.hookDisposed) return
    const start = Date.now()
    while (this.getActiveStreamCount() > 0 && Date.now() - start < timeout) {
      await new Promise((r) => setTimeout(r, 100))
    }
    this.disposeAll()
  }
}

// 订阅资源（兼容 React Native 的 Subscription { remove() } 模式）
class SubscriptionResource implements DisposableResource {
  public readonly id: string
  private subscription: { remove: () => void } | null

  constructor(subscription: { remove: () => void }) {
    this.id = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    this.subscription = subscription
  }

  dispose(): void {
    if (!this.subscription) return
    try {
      this.subscription.remove()
    } catch (error) {
      console.warn('取消订阅时出错:', error)
    }
    this.subscription = null
  }
}

// 不导出 SubscriptionResource
