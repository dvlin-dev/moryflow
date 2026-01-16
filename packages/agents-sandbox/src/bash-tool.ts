/**
 * [PROVIDES]: 沙盒化的 bash 工具
 * [DEPENDS]: sandbox-manager, /agents
 * [POS]: 替代原有的 bash 工具，添加沙盒保护
 */

import { tool, type RunContext } from '@anyhunt/agents'
import { z } from 'zod'
import type { SandboxManager } from './sandbox-manager'
import type { AuthChoice } from './types'
import { createSubLogger } from './logger'

const logger = createSubLogger('bash-tool')

/** Agent 上下文类型（兼容 agents-runtime 的 AgentContext） */
interface AgentContext {
  vaultRoot: string
  chatId: string
  userId?: string
  buildModel?: unknown
}

/** 工具摘要 schema（用于 UI 显示） */
const toolSummarySchema = z
  .string()
  .min(1)
  .max(80)
  .describe('A very brief, human-readable summary of what this tool call is doing')

const DEFAULT_TIMEOUT = 120_000 // 2 分钟
const MAX_TIMEOUT = 180_000 // 3 分钟

/** 工具参数 schema */
const bashParams = z.object({
  summary: toolSummarySchema.default('bash'),
  command: z.string().min(1).describe('要执行的完整命令（包括参数）'),
  cwd: z.string().optional().describe('工作目录（相对于 Vault，默认为 Vault 根目录）'),
  timeout: z
    .number()
    .int()
    .min(1000)
    .max(MAX_TIMEOUT)
    .default(DEFAULT_TIMEOUT)
    .describe('超时时间（毫秒），默认 2 分钟，最大 3 分钟'),
})

/** 输出截断配置 */
const MAX_OUTPUT_LENGTH = 10000
const TRUNCATE_MARKER = '\n... [output truncated] ...\n'

/** 截断输出 */
function trimPreview(text: string): { text: string; truncated: boolean } {
  if (text.length <= MAX_OUTPUT_LENGTH) {
    return { text, truncated: false }
  }
  const half = Math.floor((MAX_OUTPUT_LENGTH - TRUNCATE_MARKER.length) / 2)
  return {
    text: text.slice(0, half) + TRUNCATE_MARKER + text.slice(-half),
    truncated: true,
  }
}

/** 沙盒 bash 工具选项 */
export interface SandboxBashToolOptions {
  /** 获取 SandboxManager 的函数（根据 vaultRoot 动态获取） */
  getSandbox: (vaultRoot: string) => SandboxManager
  /** 路径解析工具（可选） */
  resolvePath?: (
    relativePath: string,
    vaultRoot: string
  ) => Promise<{ absolute: string; relative: string }>
  /** 授权请求回调 */
  onAuthRequest: (path: string) => Promise<AuthChoice>
  /**
   * 命令确认回调（用于非白名单命令）
   * 如果不提供，非白名单命令将自动允许（危险命令仍会被拦截）
   */
  onCommandConfirm?: (command: string, reason: string) => Promise<boolean>
}

/**
 * 创建沙盒化的 bash 工具
 */
export function createSandboxBashTool(options: SandboxBashToolOptions) {
  const { getSandbox, resolvePath, onAuthRequest, onCommandConfirm } = options

  // 默认命令确认回调：自动允许非白名单命令
  // 危险命令仍会被 SandboxManager 硬性拦截
  const defaultCommandConfirm = async () => true

  return tool({
    name: 'bash',
    description: '在 Vault 目录下执行 shell 命令。可用于运行脚本、文档转换、Git 操作等。',
    parameters: bashParams,
    async execute({ command, cwd, timeout }, runContext?: RunContext<AgentContext>) {
      logger.debug('execute', { command: command.slice(0, 80), cwd, timeout })

      const vaultRoot = runContext?.context?.vaultRoot
      if (!vaultRoot) {
        throw new Error('Cannot determine working directory')
      }

      // 获取对应 vault 的沙盒管理器
      const sandbox = getSandbox(vaultRoot)

      // 确定工作目录
      let workDir: string
      let relativeCwd: string

      if (cwd && resolvePath) {
        const resolved = await resolvePath(cwd, vaultRoot)
        workDir = resolved.absolute
        relativeCwd = resolved.relative
      } else if (cwd) {
        // 简单路径拼接
        workDir = cwd.startsWith('/') ? cwd : `${vaultRoot}/${cwd}`
        relativeCwd = cwd
      } else {
        workDir = vaultRoot
        relativeCwd = '.'
      }

      const startedAt = Date.now()

      try {
        // 使用沙盒执行命令
        const result = await sandbox.execute(
          command,
          { cwd: workDir, timeout },
          onAuthRequest,
          onCommandConfirm ?? defaultCommandConfirm
        )

        const durationMs = Date.now() - startedAt
        const stdoutPreview = trimPreview(result.stdout)
        const stderrPreview = trimPreview(result.stderr)

        return {
          command,
          cwd: relativeCwd,
          exitCode: result.exitCode,
          durationMs,
          stdout: stdoutPreview.text,
          stdoutTruncated: stdoutPreview.truncated,
          stderr: stderrPreview.text,
          stderrTruncated: stderrPreview.truncated,
        }
      } catch (error) {
        logger.error('command failed', error)
        throw error
      }
    },
  })
}
