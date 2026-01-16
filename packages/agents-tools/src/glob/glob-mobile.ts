/**
 * React Native / Mobile Glob 实现
 *
 * 使用 PlatformCapabilities 的文件系统 API 实现简化的 glob 功能。
 * 支持常见的 glob 模式：**、*、?
 */

import type { PlatformCapabilities } from '@anyhunt/agents-adapter'
import type { GlobImpl, GlobEntry } from './glob-interface'
import { setGlobImpl } from './glob-interface'

/**
 * 将 glob 模式转换为正则表达式
 */
function globPatternToRegex(pattern: string): RegExp {
  // 转义正则特殊字符，但保留 glob 字符
  let regex = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // 转义正则特殊字符
    .replace(/\*\*/g, '<<<GLOBSTAR>>>') // 临时替换 **
    .replace(/\*/g, '[^/]*') // * 匹配非 / 的任意字符
    .replace(/\?/g, '[^/]') // ? 匹配单个非 / 字符
    .replace(/<<<GLOBSTAR>>>/g, '.*') // ** 匹配任意字符（包括 /）

  return new RegExp(`^${regex}$`)
}

/**
 * 检查路径是否匹配任一模式
 */
function matchesAnyPattern(path: string, patterns: RegExp[]): boolean {
  return patterns.some((regex) => regex.test(path))
}

/**
 * 创建 Mobile glob 实现
 */
export function createMobileGlobImpl(capabilities: PlatformCapabilities): GlobImpl {
  const { fs, path: pathUtils } = capabilities

  /**
   * 递归遍历目录
   */
  async function walkDirectory(
    baseDir: string,
    relativePath: string,
    patterns: RegExp[],
    options: {
      onlyFiles: boolean
      dot: boolean
      limit: number
    },
    results: GlobEntry[]
  ): Promise<void> {
    if (results.length >= options.limit) {
      return
    }

    const currentDir = relativePath
      ? pathUtils.join(baseDir, relativePath)
      : baseDir

    let entries: string[]
    try {
      entries = await fs.readdir(currentDir)
    } catch {
      return // 目录不存在或无法读取
    }

    for (const entry of entries) {
      if (results.length >= options.limit) {
        break
      }

      // 跳过隐藏文件（除非 dot 为 true）
      if (!options.dot && entry.startsWith('.')) {
        continue
      }

      const entryRelativePath = relativePath
        ? `${relativePath}/${entry}`
        : entry
      const entryAbsolutePath = pathUtils.join(baseDir, entryRelativePath)

      let isDirectory: boolean
      try {
        const stat = await fs.stat(entryAbsolutePath)
        isDirectory = stat.isDirectory
      } catch {
        continue // 无法获取文件信息
      }

      // 检查是否匹配模式
      const matchesPattern = matchesAnyPattern(entryRelativePath, patterns)

      if (matchesPattern) {
        if (isDirectory) {
          if (!options.onlyFiles) {
            results.push({ path: entryRelativePath, isDirectory: true })
          }
        } else {
          results.push({ path: entryRelativePath, isDirectory: false })
        }
      }

      // 递归遍历子目录
      if (isDirectory) {
        await walkDirectory(baseDir, entryRelativePath, patterns, options, results)
      }
    }
  }

  return {
    async glob({ cwd, patterns, onlyFiles = true, dot = false, limit = 1000 }): Promise<string[]> {
      const regexPatterns = patterns.map(globPatternToRegex)
      const results: GlobEntry[] = []

      await walkDirectory(cwd, '', regexPatterns, { onlyFiles, dot, limit }, results)

      return results.map((entry) => entry.path)
    },

    async globWithDetails({
      cwd,
      patterns,
      onlyFiles = true,
      dot = false,
      limit = 1000,
    }): Promise<GlobEntry[]> {
      const regexPatterns = patterns.map(globPatternToRegex)
      const results: GlobEntry[] = []

      await walkDirectory(cwd, '', regexPatterns, { onlyFiles, dot, limit }, results)

      return results
    },
  }
}

/**
 * 初始化 Mobile glob 实现
 * 在 React Native 环境中调用此函数来设置全局 glob 实现
 */
export function initMobileGlob(capabilities: PlatformCapabilities): void {
  const impl = createMobileGlobImpl(capabilities)
  setGlobImpl(impl)
}

// 导出接口类型
export type { GlobImpl, GlobOptions, GlobEntry } from './glob-interface'
export { setGlobImpl, getGlobImpl, isGlobImplInitialized } from './glob-interface'
