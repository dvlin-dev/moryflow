/**
 * [PROVIDES]: setupAgentTracing - Agent 日志收集设置
 * [DEPENDS]: agents-core/tracing, membership-bridge
 * [POS]: PC 主进程模块，负责收集 Agent 执行日志并上报到后端
 */

import {
  addTraceProcessor,
  setTracingDisabled,
  ServerTracingProcessor,
  type TraceBatchPayload,
} from '@moryflow/agents-core'
import { MEMBERSHIP_API_URL } from '@moryflow/shared-api'
import { membershipBridge } from '../membership-bridge.js'

const MAX_CACHED_TRACES = 100
let failedTraces: TraceBatchPayload[] = []

/**
 * 发送 traces 到后端（底层 API）
 */
async function postTraces(payload: TraceBatchPayload, token: string): Promise<void> {
  const response = await fetch(`${MEMBERSHIP_API_URL}/v1/agent-traces`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
  }
}

/**
 * 缓存失败的 traces
 */
function cacheFailedTraces(payload: TraceBatchPayload): void {
  failedTraces.push(payload)
  if (failedTraces.length > MAX_CACHED_TRACES) {
    failedTraces = failedTraces.slice(-MAX_CACHED_TRACES)
  }
}

/**
 * 尝试上报缓存的 traces
 */
async function flushCachedTraces(): Promise<void> {
  if (failedTraces.length === 0) return

  const token = membershipBridge.getConfig().token
  if (!token) return

  const toRetry = [...failedTraces]
  failedTraces = []

  for (const payload of toRetry) {
    try {
      await postTraces(payload, token)
    } catch {
      failedTraces.push(payload)
    }
  }
}

/**
 * 上报 Agent Traces 到后端
 */
async function uploadTraces(payload: TraceBatchPayload): Promise<void> {
  const token = membershipBridge.getConfig().token

  if (!token) {
    cacheFailedTraces(payload)
    return
  }

  try {
    await postTraces(payload, token)
    await flushCachedTraces()
  } catch (error) {
    console.error('[agent-tracing] Failed to upload traces:', error)
    cacheFailedTraces(payload)
  }
}

/**
 * 设置 Agent Tracing
 * 在 main 进程启动时调用
 */
export function setupAgentTracing(): void {
  // 启用 tracing
  setTracingDisabled(false)

  // 创建并注册 ServerTracingProcessor
  const processor = new ServerTracingProcessor({
    onBatchReady: uploadTraces,
    recordSuccessDetails: false, // 生产环境不记录成功详情
    recordErrorStack: process.env.NODE_ENV === 'development',
  })

  addTraceProcessor(processor)

  // 登录状态变更时尝试上报缓存
  membershipBridge.addListener(() => {
    const config = membershipBridge.getConfig()
    if (config.token) {
      flushCachedTraces().catch(console.error)
    }
  })

  console.log('[agent-tracing] Agent tracing initialized')
}
