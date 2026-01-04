import { HookResourceManager } from './resource-manager'

// StreamCleanup 类型定义（原本从 conversation-mobile 导入）
interface StreamCleanup {
  cleanup: () => void
  isActive: () => boolean
}

class GlobalStreamManager {
  private static instance: GlobalStreamManager | null = null
  private activeStreams: Map<string, StreamCleanup> = new Map()
  private globalResourceManager: HookResourceManager

  private constructor() {
    this.globalResourceManager = new HookResourceManager()
  }

  static getInstance(): GlobalStreamManager {
    if (!GlobalStreamManager.instance) {
      GlobalStreamManager.instance = new GlobalStreamManager()
    }
    return GlobalStreamManager.instance
  }

  registerStream(streamId: string, cleanup: StreamCleanup): void {
    this.cleanupStream(streamId)
    this.activeStreams.set(streamId, cleanup)
  }

  cleanupStream(streamId: string): void {
    const cleanup = this.activeStreams.get(streamId)
    if (cleanup) {
      try {
        cleanup.cleanup()
      } catch (error) {
        console.warn(`清理流 ${streamId} 时出错:`, error)
      }
      this.activeStreams.delete(streamId)
    }
  }

  isStreamActive(streamId: string): boolean {
    const cleanup = this.activeStreams.get(streamId)
    return cleanup ? cleanup.isActive() : false
  }

  getResourceManager(): HookResourceManager {
    return this.globalResourceManager
  }

  cleanupAll(): void {
    for (const [streamId, cleanup] of this.activeStreams.entries()) {
      try {
        cleanup.cleanup()
      } catch (error) {
        console.warn(`清理流 ${streamId} 时出错:`, error)
      }
    }
    this.activeStreams.clear()
  }

  getActiveStreamCount(): number {
    return this.activeStreams.size
  }
}

export const globalStreamManager = GlobalStreamManager.getInstance()
