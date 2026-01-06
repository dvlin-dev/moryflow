/**
 * [PROVIDES]: 平台检测与适配器选择
 * [DEPENDS]: macos-sandbox, soft-isolation
 * [POS]: 根据运行平台返回对应的沙盒实现
 */

import type { PlatformAdapter } from '../types'
import { MacOSSandbox } from './macos-sandbox'
import { SoftIsolation } from './soft-isolation'

/**
 * 检测当前平台并返回对应的沙盒适配器
 */
export function detectPlatform(): PlatformAdapter {
  switch (process.platform) {
    case 'darwin':
      return new MacOSSandbox()
    case 'linux':
    case 'win32':
    default:
      return new SoftIsolation()
  }
}

/**
 * 获取当前平台名称
 */
export function getPlatformName(): string {
  switch (process.platform) {
    case 'darwin':
      return 'macOS'
    case 'linux':
      return 'Linux'
    case 'win32':
      return 'Windows'
    default:
      return process.platform
  }
}
