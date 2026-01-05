/**
 * [PROVIDES]: checkAndResolveBindingConflict, handleBindingConflictResponse, resetBindingConflictState
 * [DEPENDS]: BrowserWindow, store.ts, user-info.ts
 * [POS]: 处理登录账号切换时的绑定冲突检测和用户提示
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { BrowserWindow } from 'electron'
import { readBinding, deleteBinding } from './store.js'
import { fetchCurrentUserId, clearUserIdCache } from './user-info.js'
import { createLogger } from './logger.js'
import type {
  BindingConflictChoice,
  BindingConflictRequest,
} from '../../shared/ipc/cloud-sync.js'

// 重导出类型供外部使用
export type { BindingConflictChoice, BindingConflictRequest }

const log = createLogger('binding-conflict')

// ── 类型定义 ────────────────────────────────────────────────

/** 绑定冲突检查结果 */
export interface BindingConflictResult {
  hasConflict: boolean
  choice?: BindingConflictChoice
}

// ── 状态管理 ────────────────────────────────────────────────

const pendingResolvers = new Map<string, (choice: BindingConflictChoice) => void>()

// ── 公共 API ────────────────────────────────────────────────

/**
 * 检查并解决绑定冲突
 * 在用户登录后、同步初始化前调用
 */
export async function checkAndResolveBindingConflict(
  vaultPath: string
): Promise<BindingConflictResult> {
  const binding = readBinding(vaultPath)

  // 没有绑定 → 无冲突
  if (!binding) {
    log.info('no binding found, no conflict')
    return { hasConflict: false }
  }

  // 旧绑定没有 userId → 视为迁移数据，无冲突（后续会更新 userId）
  if (!binding.userId) {
    log.info('binding has no userId (legacy data), treating as no conflict')
    return { hasConflict: false }
  }

  // 获取当前用户 ID
  const currentUserId = await fetchCurrentUserId()
  if (!currentUserId) {
    // 无法获取用户 ID → 保持离线模式
    log.warn('cannot fetch current user ID, staying offline')
    return { hasConflict: true, choice: 'stay_offline' }
  }

  // 相同用户 → 无冲突
  if (binding.userId === currentUserId) {
    log.info('binding belongs to current user, no conflict')
    return { hasConflict: false }
  }

  // 不同用户 → 有冲突，需要用户决策
  log.info('binding conflict detected:', {
    boundUserId: binding.userId,
    currentUserId,
    vaultName: binding.vaultName,
  })

  const choice = await requestBindingConflictResolution(
    vaultPath,
    binding.vaultName,
    binding.userId
  )

  // 如果用户选择同步到当前账号，删除旧绑定
  if (choice === 'sync_to_current') {
    deleteBinding(vaultPath)
    log.info('old binding deleted, will create new binding')
  }

  return { hasConflict: true, choice }
}

/**
 * 处理来自 Renderer 的冲突解决响应
 * 由 IPC handler 调用
 */
export function handleBindingConflictResponse(
  requestId: string,
  choice: BindingConflictChoice
): void {
  const resolver = pendingResolvers.get(requestId)
  if (resolver) {
    resolver(choice)
    pendingResolvers.delete(requestId)
    log.info('conflict resolved:', { requestId, choice })
  } else {
    log.warn('no pending resolver for requestId:', requestId)
  }
}

/**
 * 重置绑定冲突状态
 * 在用户登出时调用
 */
export function resetBindingConflictState(): void {
  // 清除用户 ID 缓存
  clearUserIdCache()

  // 取消所有待处理的请求（默认保持离线）
  for (const [requestId, resolver] of pendingResolvers) {
    resolver('stay_offline')
    log.info('cancelled pending conflict request:', requestId)
  }
  pendingResolvers.clear()

  log.info('binding conflict state reset')
}

// ── 内部函数 ────────────────────────────────────────────────

/**
 * 请求用户解决绑定冲突（显示弹窗）
 */
async function requestBindingConflictResolution(
  vaultPath: string,
  vaultName: string,
  boundUserId: string
): Promise<BindingConflictChoice> {
  const window = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
  if (!window) {
    log.warn('no window available for conflict dialog, staying offline')
    return 'stay_offline'
  }

  const requestId = `binding-conflict-${Date.now()}-${Math.random().toString(36).slice(2)}`

  return new Promise<BindingConflictChoice>((resolve) => {
    // 超时处理（60 秒）
    const timeout = setTimeout(() => {
      pendingResolvers.delete(requestId)
      log.warn('conflict dialog timed out, staying offline')
      resolve('stay_offline')
    }, 60000)

    pendingResolvers.set(requestId, (choice) => {
      clearTimeout(timeout)
      resolve(choice)
    })

    // 发送请求到 Renderer
    const request: BindingConflictRequest = {
      requestId,
      vaultPath,
      vaultName,
      boundUserId,
    }
    window.webContents.send('cloud-sync:binding-conflict-request', request)
    log.info('sent binding conflict request to renderer:', requestId)
  })
}
