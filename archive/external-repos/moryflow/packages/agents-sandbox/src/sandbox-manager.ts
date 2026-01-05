/**
 * [PROVIDES]: 沙盒管理器，统一入口
 * [DEPENDS]: platform/, command/, authorization/
 * [POS]: 外部只需调用此模块
 */

import type {
  SandboxConfig,
  ExecuteResult,
  AuthRequestCallback,
  PlatformAdapter,
  CommandConfirmCallback,
} from './types'
import { detectPlatform, getPlatformName } from './platform'
import { CommandExecutor, type ExecuteOptions, filterCommand } from './command'
import { PathAuthorization } from './authorization'
import { SandboxError, CommandNotAllowedError } from './errors/sandbox-errors'
import { logger } from './logger'

export class SandboxManager {
  private platform: PlatformAdapter
  private executor: CommandExecutor
  private pathAuth: PathAuthorization
  private initialized = false

  constructor(private config: SandboxConfig) {
    this.platform = detectPlatform()
    this.executor = new CommandExecutor(this.platform, config)
    this.pathAuth = new PathAuthorization(config.storage)
  }

  /**
   * 初始化沙盒（需要在执行命令前调用）
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    if (this.platform.initialize) {
      await this.platform.initialize(this.config)
    }
    this.initialized = true
  }

  /**
   * 获取当前平台信息
   */
  getPlatformInfo(): { type: string; name: string } {
    return {
      type: this.platform.type,
      name: getPlatformName(),
    }
  }

  /**
   * 执行命令
   * @param command 要执行的命令
   * @param options 执行选项
   * @param onAuthRequest 授权请求回调（当访问外部路径时调用）
   * @param onCommandConfirm 命令确认回调（当执行非白名单命令时调用）
   * @throws SandboxError 执行失败时抛出
   */
  async execute(
    command: string,
    options?: ExecuteOptions,
    onAuthRequest?: AuthRequestCallback,
    onCommandConfirm?: CommandConfirmCallback
  ): Promise<ExecuteResult> {
    // 确保已初始化
    if (!this.initialized) {
      await this.initialize()
    }

    const cwd = options?.cwd ?? this.config.vaultRoot

    try {
      logger.debug('execute: checking command filter', { command: command.slice(0, 100) })

      // 1. 命令过滤检查
      const filterResult = filterCommand(command)

      // 1a. 危险命令直接拦截（不可绕过）
      if (!filterResult.allowed) {
        logger.warn('execute: command blocked', { reason: filterResult.reason })
        throw new CommandNotAllowedError(
          filterResult.reason ?? 'Command not allowed'
        )
      }

      // 1b. 非白名单命令需要确认
      if (filterResult.requiresConfirmation) {
        logger.debug('execute: command requires confirmation', { reason: filterResult.reason })
        if (!onCommandConfirm) {
          throw new CommandNotAllowedError(
            filterResult.reason ?? 'Command requires confirmation'
          )
        }

        const confirmed = await onCommandConfirm(command, filterResult.reason ?? '')
        if (!confirmed) {
          logger.debug('execute: user rejected command')
          throw new CommandNotAllowedError('User rejected command execution')
        }
        logger.debug('execute: command confirmed by user')
      }

      // 2. 检测外部路径
      const externalPaths = this.executor.detectExternalPaths(command, cwd)
      if (externalPaths.length > 0) {
        logger.debug('execute: detected external paths', { paths: externalPaths })
      }

      // 3. 如有外部路径，检查授权
      for (const path of externalPaths) {
        if (!this.pathAuth.isAuthorized(path)) {
          if (!onAuthRequest) {
            logger.warn('execute: external path denied (no callback)', { path })
            throw new SandboxError(
              'ACCESS_DENIED',
              `Access to external path denied: ${path}`
            )
          }

          // 请求用户授权
          logger.debug('execute: requesting auth for path', { path })
          const choice = await onAuthRequest(path)
          const authorized = this.pathAuth.handleChoice(path, choice)

          if (!authorized) {
            logger.debug('execute: user denied path access', { path, choice })
            throw new SandboxError(
              'ACCESS_DENIED',
              `User denied access to: ${path}`
            )
          }
          logger.debug('execute: path authorized', { path, choice })
        }
      }

      // 4. 执行命令
      logger.debug('execute: running command', { cwd })
      const result = await this.executor.run(command, options)
      logger.debug('execute: command completed', { exitCode: result.exitCode, duration: result.duration })

      // 5. 清除临时授权
      this.pathAuth.clearTemp()

      return result
    } catch (error) {
      // 确保清除临时授权
      this.pathAuth.clearTemp()
      logger.error('execute: command failed', error)
      throw SandboxError.wrap(error)
    }
  }

  /**
   * 获取已授权的外部路径列表
   */
  getAuthorizedPaths(): string[] {
    return this.pathAuth.getPersistentPaths()
  }

  /**
   * 移除某个路径的授权
   */
  removeAuthorizedPath(path: string): void {
    this.pathAuth.removePersistent(path)
  }

  /**
   * 清除所有已授权的外部路径
   */
  clearAllAuthorizedPaths(): void {
    this.pathAuth.clearAllPersistent()
  }
}
