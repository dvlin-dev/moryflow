/**
 * Cloud Sync - 同步引擎入口
 * 职责：协调各模块，提供统一的同步引擎接口
 */

import { readSettings, readBinding } from '../store.js'
import { cloudSyncApi, CloudSyncApiError } from '../api/client.js'
import { fileIndexManager } from '../file-index/index.js'
import { membershipBridge } from '../../membership-bridge.js'
import { syncState } from './state.js'
import {
  detectLocalChanges,
  executeActionsWithTracking,
  applyChangesToFileIndex,
  getRelativePath,
} from './executor.js'
import {
  scheduleSync,
  cancelScheduledSync,
  scheduleVectorize,
  cancelAllVectorize,
  cancelVectorize,
} from './scheduler.js'
import { activityTracker } from './activity-tracker.js'
import { createLogger } from '../logger.js'
import { isNetworkError } from '../errors.js'
import { tryAutoBinding, resetAutoBindingState, setRetryCallback } from '../auto-binding.js'
import { checkAndResolveBindingConflict } from '../binding-conflict.js'
import type { SyncStatusSnapshot, SyncStatusDetail } from '../const.js'

const log = createLogger('sync-engine')

// ── 初始化依赖注入 ────────────────────────────────────────────

// 将 activityTracker 注入 syncState，避免循环依赖
syncState.setActivityTracker(activityTracker)

// 注册自动绑定重试回调（避免循环依赖）
setRetryCallback(() => {
  void cloudSyncEngine.reinit()
})

// ── 同步锁 ────────────────────────────────────────────────────

/** 同步锁超时时间（5 分钟） */
const SYNC_LOCK_TIMEOUT = 5 * 60 * 1000

/** 防止并发同步的锁 */
let syncLock = false

/** 锁获取时间（用于超时保护） */
let syncLockTime = 0

// ── 核心同步流程 ────────────────────────────────────────────

const performSync = async (): Promise<void> => {
  // 超时保护：如果锁超过 5 分钟未释放，强制释放
  if (syncLock && Date.now() - syncLockTime > SYNC_LOCK_TIMEOUT) {
    log.warn('sync lock timeout, force release')
    syncLock = false
  }

  // 使用锁防止并发
  if (syncLock) return
  syncLock = true
  syncLockTime = Date.now()

  try {
    await performSyncInternal()
  } finally {
    syncLock = false
  }
}

/** 实际的同步逻辑 */
const performSyncInternal = async (): Promise<void> => {
  const { vaultPath, vaultId, status } = syncState
  if (!vaultPath || !vaultId) return
  if (status === 'syncing') return
  if (status === 'disabled' || status === 'offline') return

  const settings = readSettings()
  if (!settings.syncEnabled) return

  try {
    syncState.setStatus('syncing')
    syncState.setError(undefined)
    syncState.broadcast()

    // 1. 检测本地变更（只读，不修改 FileIndex）
    const { dtos, pendingChanges } = await detectLocalChanges(vaultPath, settings.deviceId)

    // 2. 获取同步差异
    const { actions } = await cloudSyncApi.syncDiff({
      vaultId,
      deviceId: settings.deviceId,
      localFiles: dtos,
    })

    if (actions.length === 0 && pendingChanges.size === 0) {
      // 没有需要同步的内容
      activityTracker.endSync()
      syncState.setLastSync(Date.now())
      syncState.clearPending()
      activityTracker.clearPending()
      syncState.setStatus('idle')
      syncState.broadcast()
      return
    }

    // 3. 初始化活动追踪器
    activityTracker.startSync(actions.length)

    // 4. 执行同步操作（只做 I/O，不修改 FileIndex）
    const executeResult = await executeActionsWithTracking(
      actions,
      vaultPath,
      settings.deviceId,
      pendingChanges,
      () => syncState.broadcast()
    )

    // 记录错误
    if (executeResult.errors.length > 0) {
      log.warn(`${executeResult.errors.length} action(s) failed`)
    }

    // 5. 提交同步结果
    if (executeResult.completed.length > 0 || executeResult.deleted.length > 0) {
      const commitResult = await cloudSyncApi.syncCommit({
        vaultId,
        deviceId: settings.deviceId,
        completed: executeResult.completed,
        deleted: executeResult.deleted,
        vectorizeEnabled: settings.vectorizeEnabled,
      })

      if (!commitResult.success && commitResult.conflicts) {
        log.warn('commit has conflicts:', commitResult.conflicts)
        // 冲突会在下次同步时通过 conflict action 处理
      }

      // 6. commit 成功后更新 FileIndex
      if (commitResult.success) {
        const completedIds = new Set(executeResult.completed.map((c) => c.fileId))
        await applyChangesToFileIndex(vaultPath, pendingChanges, executeResult, completedIds)
      }
    }

    activityTracker.endSync()
    syncState.setLastSync(Date.now())
    syncState.clearPending()
    activityTracker.clearPending()
    syncState.setStatus('idle')
  } catch (error) {
    activityTracker.endSync()
    if (error instanceof CloudSyncApiError) {
      syncState.setError(error.message)
      if (error.isUnauthorized) {
        // token 失效，禁用同步
        syncState.setStatus('disabled')
      } else if (error.isServerError) {
        // 服务器错误，标记为离线
        syncState.setStatus('offline')
      } else {
        syncState.setStatus('idle')
      }
    } else {
      const errorMessage = error instanceof Error ? error.message : String(error)
      syncState.setError(errorMessage)
      syncState.setStatus(isNetworkError(error) ? 'offline' : 'idle')
    }
  } finally {
    syncState.broadcast()
  }
}

// ── 导出 API ────────────────────────────────────────────────

export const cloudSyncEngine = {
  /**
   * 初始化同步引擎（在 vault 打开时调用）
   * 登录后会自动绑定 Vault 并开始同步
   */
  async init(vaultPath: string): Promise<void> {
    const settings = readSettings()
    const config = membershipBridge.getConfig()

    if (!settings.syncEnabled) {
      syncState.setStatus('disabled')
      syncState.setVault(vaultPath, null)
      syncState.broadcast()
      return
    }

    if (!config.token) {
      syncState.setStatus('disabled')
      syncState.setVault(vaultPath, null)
      syncState.broadcast()
      return
    }

    // 检查绑定冲突（用户切换账号时）
    const conflictResult = await checkAndResolveBindingConflict(vaultPath)
    if (conflictResult.hasConflict) {
      if (conflictResult.choice === 'stay_offline') {
        log.info('user chose to stay offline due to binding conflict')
        syncState.setStatus('offline')
        syncState.setVault(vaultPath, null)
        syncState.setError('Workspace bound to different account')
        syncState.broadcast()
        return
      }
      // choice === 'sync_to_current': 旧绑定已在 checkAndResolveBindingConflict 中删除
      log.info('user chose to sync to current account, will create new binding')
    }

    // 加载 fileIndex 并扫描创建
    await fileIndexManager.load(vaultPath)
    const created = await fileIndexManager.scanAndCreateIds(vaultPath)
    if (created > 0) {
      log.info(`fileIndex created ${created} new entries`)
    }

    // 自动绑定：如果没有绑定，尝试自动绑定
    let binding = readBinding(vaultPath)
    if (!binding) {
      log.info('no binding found, trying auto binding...')
      binding = await tryAutoBinding(vaultPath)
      if (!binding) {
        // 绑定失败，进入降级模式
        log.warn('auto binding failed, entering degraded mode')
        syncState.setStatus('offline')
        syncState.setVault(vaultPath, null)
        syncState.setError('Auto binding failed, will retry later')
        syncState.broadcast()
        return
      }
    }

    syncState.setVault(vaultPath, binding.vaultId)
    syncState.setStatus('idle')
    syncState.broadcast()

    // 立即触发首次同步（双向合并）
    void performSync()
  },

  /**
   * 停止同步引擎
   */
  stop(): void {
    cancelScheduledSync()
    cancelAllVectorize()

    const prevPath = syncState.vaultPath
    if (prevPath) {
      fileIndexManager.clearCache(prevPath)
    }

    // 重置同步锁
    syncLock = false

    // 重置自动绑定状态
    resetAutoBindingState()

    syncState.reset()
    syncState.broadcast()
  },

  /**
   * 处理文件变化（由 vault-watcher 触发）
   */
  handleFileChange(
    type: 'add' | 'change' | 'unlink' | 'rename',
    absolutePath: string,
    oldAbsolutePath?: string
  ): void {
    const { vaultPath, status } = syncState
    if (!vaultPath || status === 'disabled') return

    const relativePath = getRelativePath(vaultPath, absolutePath)

    switch (type) {
      case 'add':
      case 'change':
        syncState.addPending(relativePath)
        activityTracker.addPending(relativePath, 'upload')
        scheduleSync(performSync)
        scheduleVectorize(vaultPath, relativePath)
        break

      case 'unlink':
        syncState.addPending(relativePath)
        activityTracker.addPending(relativePath, 'delete')
        scheduleSync(performSync)
        cancelVectorize(vaultPath, relativePath)
        // 删除向量
        fileIndexManager
          .delete(vaultPath, relativePath)
          .then((fileId) => {
            if (fileId) {
              return cloudSyncApi.deleteVector(fileId)
            }
          })
          .catch((error) => {
            log.error('delete vector failed:', relativePath, error)
          })
        break

      case 'rename':
        if (oldAbsolutePath) {
          const oldRelativePath = getRelativePath(vaultPath, oldAbsolutePath)
          void fileIndexManager.move(vaultPath, oldRelativePath, relativePath)
          cancelVectorize(vaultPath, oldRelativePath)
          activityTracker.removePending(oldRelativePath)
        }
        syncState.addPending(relativePath)
        activityTracker.addPending(relativePath, 'upload')
        scheduleSync(performSync)
        scheduleVectorize(vaultPath, relativePath)
        break
    }

    syncState.broadcast()
  },

  /**
   * 手动触发同步
   */
  triggerSync(): void {
    void performSync()
  },

  /**
   * 获取状态快照
   */
  getStatus(): SyncStatusSnapshot {
    return syncState.getSnapshot()
  },

  /**
   * 获取包含活动详情的状态快照
   */
  getStatusDetail(): SyncStatusDetail {
    return syncState.getStatusDetail()
  },

  /**
   * 订阅状态变化
   */
  onStatusChange(listener: (snapshot: SyncStatusSnapshot) => void): () => void {
    return syncState.subscribe(listener)
  },

  /**
   * 更新绑定后重新初始化
   */
  async reinit(): Promise<void> {
    const { vaultPath } = syncState
    if (vaultPath) {
      await this.init(vaultPath)
    }
  },
} as const
