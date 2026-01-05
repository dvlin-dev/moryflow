/**
 * [PROVIDES]: macOS OS 级沙盒实现
 * [DEPENDS]: sandbox-runtime (可选)
 * [POS]: 仅 macOS 使用，基于 Seatbelt 沙盒
 */

import type { PlatformAdapter, SandboxConfig } from '../types'
import { SandboxError } from '../errors/sandbox-errors'

/** 敏感文件列表（普通模式保护） */
const SENSITIVE_PATHS = [
  '~/.ssh',
  '~/.aws',
  '~/.bashrc',
  '~/.zshrc',
  '~/.bash_profile',
  '~/.zprofile',
  '~/.gitconfig',
  '~/.npmrc',
  '~/.config/gh',
]

/** 展开 ~ 为用户目录 */
function expandHome(path: string): string {
  if (path.startsWith('~/')) {
    return path.replace('~', process.env.HOME ?? '')
  }
  return path
}

export class MacOSSandbox implements PlatformAdapter {
  readonly type = 'macos-sandbox' as const

  private initialized = false
  private seatbeltProfile: string | null = null

  /**
   * 初始化 macOS 沙盒
   */
  async initialize(config: SandboxConfig): Promise<void> {
    if (this.initialized) return

    try {
      // 生成 Seatbelt 配置
      this.seatbeltProfile = this.generateSeatbeltProfile(config)
      this.initialized = true
    } catch (error) {
      throw new SandboxError(
        'SANDBOX_INIT_FAILED',
        'Failed to initialize macOS sandbox',
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * 包装命令，添加沙盒限制
   */
  async wrapCommand(command: string, config: SandboxConfig): Promise<string> {
    if (!this.initialized || !this.seatbeltProfile) {
      await this.initialize(config)
    }

    // 使用 sandbox-exec 包装命令
    // 将配置写入临时文件或直接内联
    const escapedProfile = this.seatbeltProfile!.replace(/'/g, "'\\''")
    return `sandbox-exec -p '${escapedProfile}' /bin/bash -c '${command.replace(/'/g, "'\\''")}'`
  }

  /**
   * 生成 Seatbelt 沙盒配置
   */
  private generateSeatbeltProfile(config: SandboxConfig): string {
    const vaultRoot = config.vaultRoot
    const deniedPaths =
      config.mode === 'normal'
        ? SENSITIVE_PATHS.map(expandHome)
        : []

    // Seatbelt 配置格式
    const lines = [
      '(version 1)',
      // 默认拒绝所有
      '(deny default)',
      // 允许基本系统调用
      '(allow process*)',
      '(allow signal)',
      '(allow sysctl-read)',
      // 允许执行
      '(allow process-exec)',
      // 允许网络
      '(allow network*)',
      // 允许读取系统目录
      '(allow file-read* (subpath "/usr"))',
      '(allow file-read* (subpath "/bin"))',
      '(allow file-read* (subpath "/sbin"))',
      '(allow file-read* (subpath "/System"))',
      '(allow file-read* (subpath "/Library"))',
      '(allow file-read* (subpath "/private/var"))',
      '(allow file-read* (subpath "/opt"))',
      // 允许 Vault 读写
      `(allow file-read* (subpath "${vaultRoot}"))`,
      `(allow file-write* (subpath "${vaultRoot}"))`,
      // 允许临时目录
      '(allow file-read* (subpath "/tmp"))',
      '(allow file-write* (subpath "/tmp"))',
      '(allow file-read* (subpath "/var/folders"))',
      '(allow file-write* (subpath "/var/folders"))',
    ]

    // 拒绝敏感路径
    for (const path of deniedPaths) {
      lines.push(`(deny file-read* (subpath "${path}"))`)
      lines.push(`(deny file-write* (subpath "${path}"))`)
    }

    return lines.join('\n')
  }
}
