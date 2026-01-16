/**
 * MCP 相关类型定义
 * 平台无关，供 PC 和 Mobile 复用
 */

import type { Tool } from '@anyhunt/agents'

/**
 * MCP 服务器连接状态
 */
export type McpServerStatus = 'idle' | 'connecting' | 'connected' | 'failed'

/**
 * MCP 服务器类型
 */
export type McpServerType = 'stdio' | 'http'

/**
 * 单个 MCP 服务器的状态信息
 */
export interface McpServerState {
  /** 服务器 ID */
  id: string
  /** 服务器名称 */
  name: string
  /** 服务器类型 */
  type: McpServerType
  /** 连接状态 */
  status: McpServerStatus
  /** 失败时的错误信息 */
  error?: string
  /** 成功时的工具数量 */
  toolCount?: number
  /** 成功时的工具名称列表 */
  toolNames?: string[]
  /** 连接成功时间戳 */
  connectedAt?: number
}

/**
 * MCP 状态快照
 */
export interface McpStatusSnapshot {
  /** 所有服务器状态 */
  servers: McpServerState[]
  /** 是否正在重载 */
  isReloading: boolean
}

/**
 * MCP 状态变更事件
 */
export type McpStatusEvent =
  | { type: 'reloading' }
  | { type: 'server-updated'; server: McpServerState }
  | { type: 'reload-complete'; snapshot: McpStatusSnapshot }

/**
 * Stdio 服务器配置
 */
export interface McpStdioServerConfig {
  id: string
  enabled: boolean
  name: string
  command: string
  args: string[]
  cwd?: string
  env?: Record<string, string>
  autoApprove?: boolean
}

/**
 * HTTP (StreamableHttp) 服务器配置
 */
export interface McpHttpServerConfig {
  id: string
  enabled: boolean
  name: string
  url: string
  authorizationHeader?: string
  headers?: Record<string, string>
  autoApprove?: boolean
}

/**
 * MCP 设置
 */
export interface McpSettings {
  stdio: McpStdioServerConfig[]
  streamableHttp: McpHttpServerConfig[]
}

/**
 * 测试 MCP 服务器连接的输入
 */
export type McpTestInput =
  | {
      type: 'stdio'
      config: {
        name: string
        command: string
        args?: string[]
        cwd?: string
        env?: Record<string, string>
      }
    }
  | {
      type: 'http'
      config: {
        name: string
        url: string
        authorizationHeader?: string
        headers?: Record<string, string>
      }
    }

/**
 * 测试 MCP 服务器连接的结果
 */
export interface McpTestResult {
  success: boolean
  toolCount?: number
  toolNames?: string[]
  error?: string
}

/**
 * 服务器连接结果
 */
export interface ServerConnectionResult {
  status: 'connected' | 'failed'
  error?: Error
}

/**
 * MCP Manager 接口
 * PC 和 Mobile 各自实现
 */
export interface McpManager<TContext = unknown> {
  /**
   * 获取当前已加载的 MCP 工具
   */
  getTools(): Tool<TContext>[]

  /**
   * 调度 MCP 服务器重载（异步执行）
   */
  scheduleReload(settings: McpSettings): void

  /**
   * 等待当前重载完成
   */
  ensureReady(): Promise<void>

  /**
   * 设置重载完成后的回调
   */
  setOnReload(callback: () => void): void

  /**
   * 获取当前 MCP 状态快照
   */
  getStatus(): McpStatusSnapshot

  /**
   * 添加状态变更监听器
   */
  addStatusListener(listener: (event: McpStatusEvent) => void): () => void

  /**
   * 测试单个 MCP 服务器连接
   */
  testServer(input: McpTestInput): Promise<McpTestResult>
}
