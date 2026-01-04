/**
 * Node.js Glob 实现
 *
 * 使用 fast-glob 库实现 glob 功能。
 * 仅在 Node.js 环境中使用。
 */

import fg from 'fast-glob'
import type { GlobImpl, GlobEntry } from './glob-interface'
import { setGlobImpl } from './glob-interface'

/**
 * Node.js glob 实现
 */
export const nodeGlobImpl: GlobImpl = {
  async glob({ cwd, patterns, onlyFiles = true, dot = false, limit }): Promise<string[]> {
    const results = await fg(patterns, {
      cwd,
      onlyFiles,
      dot,
      unique: true,
    })

    if (limit && results.length > limit) {
      return results.slice(0, limit)
    }

    return results
  },

  async globWithDetails({
    cwd,
    patterns,
    onlyFiles = true,
    dot = false,
    limit,
  }): Promise<GlobEntry[]> {
    const results = await fg(patterns, {
      cwd,
      onlyFiles,
      dot,
      unique: true,
      stats: true,
      objectMode: true,
    })

    const entries: GlobEntry[] = results.map((entry) => ({
      path: typeof entry === 'string' ? entry : entry.path,
      isDirectory: typeof entry === 'string' ? false : entry.dirent?.isDirectory() ?? false,
    }))

    if (limit && entries.length > limit) {
      return entries.slice(0, limit)
    }

    return entries
  },
}

/**
 * 初始化 Node.js glob 实现
 * 在 Node.js 环境中调用此函数来设置全局 glob 实现
 */
export function initNodeGlob(): void {
  setGlobImpl(nodeGlobImpl)
}

// 导出接口类型
export type { GlobImpl, GlobOptions, GlobEntry } from './glob-interface'
export { setGlobImpl, getGlobImpl, isGlobImplInitialized } from './glob-interface'
