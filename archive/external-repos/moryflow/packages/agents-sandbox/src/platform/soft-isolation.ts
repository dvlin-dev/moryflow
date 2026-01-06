/**
 * [PROVIDES]: 软隔离实现（Linux/Windows）
 * [DEPENDS]: 无
 * [POS]: 无 OS 沙盒时的降级方案，不包装命令
 */

import type { PlatformAdapter, SandboxConfig } from '../types'

export class SoftIsolation implements PlatformAdapter {
  readonly type = 'soft-isolation' as const

  /**
   * 软隔离不需要初始化
   */
  async initialize(_config: SandboxConfig): Promise<void> {
    // 软隔离不需要特殊初始化
  }

  /**
   * 软隔离不包装命令，直接返回原命令
   * 安全检查在 PathDetector 层处理
   */
  async wrapCommand(command: string, _config: SandboxConfig): Promise<string> {
    return command
  }
}
