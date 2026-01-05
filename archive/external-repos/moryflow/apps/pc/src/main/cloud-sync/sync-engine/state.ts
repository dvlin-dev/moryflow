/**
 * Cloud Sync - 同步状态管理
 * 单一职责：管理同步引擎的内存状态和事件广播
 */

import { BrowserWindow } from 'electron'
import type { SyncStatusSnapshot, SyncStatusDetail, SyncEngineStatus } from '../const.js'
import { createLogger } from '../logger.js'

const log = createLogger('state')

// ── 常量 ────────────────────────────────────────────────────

/** 广播节流间隔（100ms） */
const BROADCAST_THROTTLE_MS = 100

// ── 状态管理类 ────────────────────────────────────────────────

export class SyncStateManager {
  private engineStatus: SyncEngineStatus = 'disabled'
  private currentVaultPath: string | null = null
  private currentVaultId: string | null = null
  private pendingFilesSet = new Set<string>()
  private lastSyncAt: number | null = null
  private lastError: string | undefined

  // 监听器
  private readonly listeners = new Set<(snapshot: SyncStatusSnapshot) => void>()

  // 广播节流
  private lastBroadcastTime = 0
  private broadcastTimer: ReturnType<typeof setTimeout> | null = null

  // 活动追踪器引用（延迟注入避免循环依赖）
  private activityTrackerRef: { reset: () => void; getStatusDetail: (status: SyncEngineStatus, lastSyncAt: number | null, error?: string) => SyncStatusDetail } | null = null

  // ── Getters ───────────────────────────────────────────────

  get status(): SyncEngineStatus {
    return this.engineStatus
  }

  get vaultPath(): string | null {
    return this.currentVaultPath
  }

  get vaultId(): string | null {
    return this.currentVaultId
  }

  get pendingFiles(): Set<string> {
    return this.pendingFilesSet
  }

  // ── Setters ───────────────────────────────────────────────

  setStatus(status: SyncEngineStatus): void {
    this.engineStatus = status
  }

  setVault(vaultPath: string | null, vaultId: string | null): void {
    this.currentVaultPath = vaultPath
    this.currentVaultId = vaultId
  }

  setLastSync(time: number): void {
    this.lastSyncAt = time
  }

  setError(error: string | undefined): void {
    this.lastError = error
  }

  addPending(relativePath: string): void {
    this.pendingFilesSet.add(relativePath)
  }

  removePending(relativePath: string): void {
    this.pendingFilesSet.delete(relativePath)
  }

  /** 清空待同步列表（使用 clear() 保持引用不变） */
  clearPending(): void {
    this.pendingFilesSet.clear()
  }

  // ── 活动追踪器注入 ────────────────────────────────────────

  setActivityTracker(tracker: typeof this.activityTrackerRef): void {
    this.activityTrackerRef = tracker
  }

  // ── 状态快照 ────────────────────────────────────────────────

  getSnapshot(): SyncStatusSnapshot {
    return {
      engineStatus: this.engineStatus,
      vaultPath: this.currentVaultPath,
      vaultId: this.currentVaultId,
      pendingCount: this.pendingFilesSet.size,
      lastSyncAt: this.lastSyncAt,
      error: this.lastError,
    }
  }

  /** 获取包含活动详情的状态快照 */
  getStatusDetail(): SyncStatusDetail {
    if (!this.activityTrackerRef) {
      // 返回基础状态（无活动追踪器时的兜底）
      return {
        engineStatus: this.engineStatus,
        recentActivities: [],
        pendingFiles: [],
        lastSyncAt: this.lastSyncAt,
        error: this.lastError,
      }
    }
    return this.activityTrackerRef.getStatusDetail(
      this.engineStatus,
      this.lastSyncAt,
      this.lastError
    )
  }

  // ── 广播状态变更 ────────────────────────────────────────────

  /** 实际执行广播 */
  private doBroadcast(): void {
    this.lastBroadcastTime = Date.now()
    const snapshot = this.getSnapshot()

    // 通知内部监听器
    for (const listener of this.listeners) {
      try {
        listener(snapshot)
      } catch (e) {
        log.error('listener error:', e)
      }
    }

    // 广播到所有渲染进程窗口
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('cloud-sync:status-changed', { status: snapshot })
    }
  }

  /** 带节流的广播（防止过于频繁的 IPC 消息） */
  broadcast(): void {
    const now = Date.now()
    const elapsed = now - this.lastBroadcastTime

    // 清理之前的定时器
    if (this.broadcastTimer) {
      clearTimeout(this.broadcastTimer)
      this.broadcastTimer = null
    }

    // 如果距上次广播已超过节流间隔，立即广播
    if (elapsed >= BROADCAST_THROTTLE_MS) {
      this.doBroadcast()
      return
    }

    // 否则延迟广播
    this.broadcastTimer = setTimeout(() => {
      this.broadcastTimer = null
      this.doBroadcast()
    }, BROADCAST_THROTTLE_MS - elapsed)
  }

  // ── 重置 ──────────────────────────────────────────────────

  reset(): void {
    this.engineStatus = 'disabled'
    this.currentVaultPath = null
    this.currentVaultId = null
    this.pendingFilesSet.clear()
    this.lastError = undefined

    // 清理广播定时器
    if (this.broadcastTimer) {
      clearTimeout(this.broadcastTimer)
      this.broadcastTimer = null
    }
    this.lastBroadcastTime = 0

    // 重置活动追踪器
    this.activityTrackerRef?.reset()
  }

  // ── 订阅状态变化 ──────────────────────────────────────────

  subscribe(listener: (snapshot: SyncStatusSnapshot) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}

// ── 导出默认实例 ────────────────────────────────────────────

export const syncState = new SyncStateManager()
