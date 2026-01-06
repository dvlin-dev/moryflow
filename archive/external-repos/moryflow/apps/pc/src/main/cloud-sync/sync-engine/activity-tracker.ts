/**
 * Cloud Sync - 同步活动追踪器
 * 单一职责：追踪和管理同步活动的状态，用于 UI 展示
 */

import path from 'node:path'
import type {
  SyncActivity,
  SyncDirection,
  PendingFile,
  SyncStatusDetail,
  SyncEngineStatus,
} from '../const.js'

// ── 常量 ────────────────────────────────────────────────────

/** 最近活动的最大保留数量 */
const MAX_RECENT_ACTIVITIES = 5

/** 活动过期时间（30 分钟后自动清理） */
const ACTIVITY_EXPIRE_TIME = 30 * 60 * 1000

/** 定时清理间隔（5 分钟） */
const CLEANUP_INTERVAL = 5 * 60 * 1000

/** 待同步文件最大数量（防止内存溢出） */
const MAX_PENDING_FILES = 1000

// ── 同步进度类型 ────────────────────────────────────────────

interface SyncProgress {
  total: number
  completed: number
  bytesTotal: number
  bytesTransferred: number
}

// ── 活动追踪器类 ────────────────────────────────────────────

export class ActivityTracker {
  /** 最近完成的活动列表 */
  private recentActivities: SyncActivity[] = []

  /** 当前正在同步的活动 */
  private currentActivity: SyncActivity | undefined

  /** 待同步文件映射 (relativePath -> PendingFile) */
  private pendingFilesMap = new Map<string, PendingFile>()

  /** 同步进度 */
  private syncProgress: SyncProgress = {
    total: 0,
    completed: 0,
    bytesTotal: 0,
    bytesTransferred: 0,
  }

  /** 定时清理器 */
  private cleanupTimer: ReturnType<typeof setInterval> | null = null

  // ── 工具方法 ────────────────────────────────────────────────

  /** 从相对路径提取文件名 */
  private extractFileName(relativePath: string): string {
    return path.basename(relativePath)
  }

  /** 清理过期的活动记录 */
  private cleanupExpiredActivities(): void {
    const now = Date.now()
    this.recentActivities = this.recentActivities.filter(
      (activity) =>
        activity.completedAt && now - activity.completedAt < ACTIVITY_EXPIRE_TIME
    )

    // P2-05: 如果活动列表和待同步列表都为空，停止定时器
    this.checkAndStopCleanupTimer()
  }

  /** 检查是否需要停止清理定时器 */
  private checkAndStopCleanupTimer(): void {
    if (
      this.recentActivities.length === 0 &&
      this.pendingFilesMap.size === 0 &&
      !this.currentActivity
    ) {
      this.stopCleanupTimer()
    }
  }

  /** 启动定时清理（如果尚未启动） */
  private ensureCleanupTimer(): void {
    if (this.cleanupTimer) return
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredActivities()
    }, CLEANUP_INTERVAL)
  }

  /** 停止定时清理 */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  // ── 公开 API ────────────────────────────────────────────────

  /**
   * 开始一轮新的同步，初始化进度
   */
  startSync(totalActions: number, totalBytes: number = 0): void {
    // 启动定时清理
    this.ensureCleanupTimer()

    this.syncProgress = {
      total: totalActions,
      completed: 0,
      bytesTotal: totalBytes,
      bytesTransferred: 0,
    }
    this.currentActivity = undefined
  }

  /**
   * 添加待同步文件
   */
  addPending(relativePath: string, direction: SyncDirection): void {
    // 启动定时清理（首次添加时）
    this.ensureCleanupTimer()

    // 防止待同步列表无限增长
    if (this.pendingFilesMap.size >= MAX_PENDING_FILES) {
      // 删除最早添加的一个（Map 保持插入顺序）
      const firstKey = this.pendingFilesMap.keys().next().value
      if (firstKey) this.pendingFilesMap.delete(firstKey)
    }

    this.pendingFilesMap.set(relativePath, {
      fileName: this.extractFileName(relativePath),
      relativePath,
      direction,
    })
  }

  /**
   * 移除待同步文件
   */
  removePending(relativePath: string): void {
    this.pendingFilesMap.delete(relativePath)
    this.checkAndStopCleanupTimer()
  }

  /**
   * 清空所有待同步文件
   */
  clearPending(): void {
    this.pendingFilesMap.clear()
    this.checkAndStopCleanupTimer()
  }

  /**
   * 开始同步某个文件
   */
  startActivity(
    fileId: string,
    relativePath: string,
    direction: SyncDirection,
    size?: number
  ): void {
    this.currentActivity = {
      fileId,
      fileName: this.extractFileName(relativePath),
      relativePath,
      direction,
      status: 'syncing',
      size,
      progress: 0,
    }

    // 从待同步列表移除
    this.pendingFilesMap.delete(relativePath)
  }

  /**
   * 更新当前活动的进度
   */
  updateProgress(progress: number, bytesTransferred?: number): void {
    if (this.currentActivity) {
      this.currentActivity.progress = Math.min(100, Math.max(0, progress))
    }
    if (bytesTransferred !== undefined) {
      this.syncProgress.bytesTransferred = bytesTransferred
    }
  }

  /**
   * 完成当前活动
   */
  completeActivity(size?: number): void {
    if (!this.currentActivity) return

    const completedActivity: SyncActivity = {
      ...this.currentActivity,
      status: 'completed',
      completedAt: Date.now(),
      progress: 100,
      size: size ?? this.currentActivity.size,
    }

    // 添加到最近活动列表（最新的在前面）
    this.recentActivities.unshift(completedActivity)

    // 保持列表长度限制
    if (this.recentActivities.length > MAX_RECENT_ACTIVITIES) {
      this.recentActivities = this.recentActivities.slice(0, MAX_RECENT_ACTIVITIES)
    }

    // 更新进度
    this.syncProgress.completed++
    if (completedActivity.size) {
      this.syncProgress.bytesTransferred += completedActivity.size
    }

    this.currentActivity = undefined
  }

  /**
   * 当前活动失败
   */
  failActivity(error: string): void {
    if (!this.currentActivity) return

    const failedActivity: SyncActivity = {
      ...this.currentActivity,
      status: 'failed',
      completedAt: Date.now(),
      error,
    }

    // 失败的活动也添加到最近活动
    this.recentActivities.unshift(failedActivity)
    if (this.recentActivities.length > MAX_RECENT_ACTIVITIES) {
      this.recentActivities = this.recentActivities.slice(0, MAX_RECENT_ACTIVITIES)
    }

    // 更新进度（失败也算完成一个）
    this.syncProgress.completed++

    this.currentActivity = undefined
  }

  /**
   * 结束同步
   */
  endSync(): void {
    this.currentActivity = undefined
    this.syncProgress = { total: 0, completed: 0, bytesTotal: 0, bytesTransferred: 0 }
    this.checkAndStopCleanupTimer()
  }

  /**
   * 重置所有状态
   */
  reset(): void {
    // 停止定时清理
    this.stopCleanupTimer()

    this.recentActivities = []
    this.currentActivity = undefined
    this.pendingFilesMap.clear()
    this.syncProgress = { total: 0, completed: 0, bytesTotal: 0, bytesTransferred: 0 }
  }

  /**
   * 获取同步状态详情快照
   */
  getStatusDetail(
    engineStatus: SyncEngineStatus,
    lastSyncAt: number | null,
    error?: string
  ): SyncStatusDetail {
    // 清理过期活动
    this.cleanupExpiredActivities()

    const detail: SyncStatusDetail = {
      engineStatus,
      recentActivities: [...this.recentActivities],
      currentActivity: this.currentActivity ? { ...this.currentActivity } : undefined,
      pendingFiles: Array.from(this.pendingFilesMap.values()),
      lastSyncAt,
      error,
    }

    // 同步中时添加进度信息
    if (engineStatus === 'syncing' && this.syncProgress.total > 0) {
      detail.overallProgress = {
        completed: this.syncProgress.completed,
        total: this.syncProgress.total,
        bytesTransferred: this.syncProgress.bytesTransferred || undefined,
        bytesTotal: this.syncProgress.bytesTotal || undefined,
      }
    }

    return detail
  }

  /**
   * 获取最近活动列表
   */
  getRecentActivities(): SyncActivity[] {
    this.cleanupExpiredActivities()
    return [...this.recentActivities]
  }

  /**
   * 获取待同步文件列表
   */
  getPendingFiles(): PendingFile[] {
    return Array.from(this.pendingFilesMap.values())
  }
}

// ── 导出默认实例 ────────────────────────────────────────────

export const activityTracker = new ActivityTracker()
