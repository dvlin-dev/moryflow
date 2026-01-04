/**
 * [PROVIDES]: 命令执行与监控
 * [DEPENDS]: platform/, path-detector
 * [POS]: 统一的命令执行入口
 */

import { spawn } from 'child_process'
import type { PlatformAdapter, SandboxConfig, ExecuteResult } from '../types'
import { SandboxError } from '../errors/sandbox-errors'
import { PathDetector } from './path-detector'

/** 命令执行选项 */
export interface ExecuteOptions {
  /** 工作目录 */
  cwd?: string
  /** 超时时间（毫秒），默认 2 分钟 */
  timeout?: number
  /** 最大输出大小（字节），默认 10MB */
  maxBuffer?: number
}

/** 默认超时：2 分钟 */
const DEFAULT_TIMEOUT = 120_000
/** 默认最大输出：10MB */
const DEFAULT_MAX_BUFFER = 10 * 1024 * 1024

export class CommandExecutor {
  private pathDetector: PathDetector

  constructor(
    private platform: PlatformAdapter,
    private config: SandboxConfig
  ) {
    this.pathDetector = new PathDetector(config.vaultRoot)
  }

  /**
   * 检测命令中的外部路径
   */
  detectExternalPaths(command: string, cwd?: string): string[] {
    return this.pathDetector.detect(command, cwd)
  }

  /**
   * 执行命令
   */
  async run(command: string, options: ExecuteOptions = {}): Promise<ExecuteResult> {
    const {
      cwd = this.config.vaultRoot,
      timeout = DEFAULT_TIMEOUT,
      maxBuffer = DEFAULT_MAX_BUFFER,
    } = options

    // 包装命令（添加沙盒限制）
    const wrappedCommand = await this.platform.wrapCommand(command, this.config)

    return new Promise((resolve, reject) => {
      const startTime = Date.now()
      let stdout = ''
      let stderr = ''
      let killed = false

      const child = spawn(wrappedCommand, {
        shell: true,
        cwd,
        env: {
          ...process.env,
          // 确保一些基本环境变量
          PATH: process.env.PATH,
          HOME: process.env.HOME,
          USER: process.env.USER,
        },
      })

      // 超时处理
      const timeoutId = setTimeout(() => {
        killed = true
        child.kill('SIGKILL')
      }, timeout)

      // 输出大小检查
      let totalSize = 0
      const checkSize = (chunk: Buffer | string) => {
        totalSize += Buffer.byteLength(chunk)
        if (totalSize > maxBuffer) {
          killed = true
          child.kill('SIGKILL')
        }
      }

      child.stdout?.on('data', (data) => {
        checkSize(data)
        if (!killed) {
          stdout += data.toString()
        }
      })

      child.stderr?.on('data', (data) => {
        checkSize(data)
        if (!killed) {
          stderr += data.toString()
        }
      })

      child.on('close', (code) => {
        clearTimeout(timeoutId)
        const duration = Date.now() - startTime

        if (killed && totalSize > maxBuffer) {
          reject(
            new SandboxError(
              'EXECUTION_FAILED',
              `Output exceeded maximum buffer size (${maxBuffer} bytes)`
            )
          )
          return
        }

        if (killed) {
          reject(
            new SandboxError(
              'TIMEOUT',
              `Command timed out after ${timeout}ms`
            )
          )
          return
        }

        resolve({
          exitCode: code ?? 0,
          stdout,
          stderr,
          duration,
        })
      })

      child.on('error', (error) => {
        clearTimeout(timeoutId)
        reject(new SandboxError('EXECUTION_FAILED', error.message, error))
      })
    })
  }
}
