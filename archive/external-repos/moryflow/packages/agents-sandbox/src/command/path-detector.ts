/**
 * [PROVIDES]: 命令中的路径检测
 * [DEPENDS]: 无
 * [POS]: 检测命令中引用的外部路径
 */

import { resolve, isAbsolute, normalize } from 'path'

export class PathDetector {
  constructor(private vaultRoot: string) {
    // 规范化 vault 路径
    this.vaultRoot = normalize(resolve(vaultRoot))
  }

  /**
   * 检测命令中的外部路径
   * @returns 外部路径列表（Vault 外的路径）
   */
  detect(command: string, cwd?: string): string[] {
    const workDir = cwd ?? this.vaultRoot
    const paths = this.extractPaths(command, workDir)
    return paths.filter((p) => !this.isInsideVault(p))
  }

  /**
   * 从命令中提取路径
   */
  private extractPaths(command: string, workDir: string): string[] {
    const paths: string[] = []

    // 匹配各种路径模式
    const patterns = [
      // 绝对路径: /xxx 或 ~/xxx
      /(?:^|\s)(\/[^\s;|&><]+)/g,
      /(?:^|\s)(~\/[^\s;|&><]+)/g,
      // 相对路径: ./xxx 或 ../xxx
      /(?:^|\s)(\.\.?\/[^\s;|&><]+)/g,
      // 引号内的路径
      /"([^"]+)"/g,
      /'([^']+)'/g,
    ]

    for (const pattern of patterns) {
      let match: RegExpExecArray | null
      while ((match = pattern.exec(command)) !== null) {
        const path = match[1].trim()
        if (this.looksLikePath(path)) {
          const resolved = this.resolvePath(path, workDir)
          if (resolved) {
            paths.push(resolved)
          }
        }
      }
    }

    // 去重
    return [...new Set(paths)]
  }

  /**
   * 判断字符串是否看起来像路径
   */
  private looksLikePath(str: string): boolean {
    if (!str || str.length < 2) return false
    // 以 / . ~ 开头，或包含 /
    return (
      str.startsWith('/') ||
      str.startsWith('./') ||
      str.startsWith('../') ||
      str.startsWith('~/') ||
      (str.includes('/') && !str.includes('://')) // 排除 URL
    )
  }

  /**
   * 解析路径为绝对路径
   */
  private resolvePath(path: string, workDir: string): string | null {
    try {
      // 展开 ~
      if (path.startsWith('~/')) {
        const home = process.env.HOME
        if (!home) return null
        path = path.replace('~', home)
      }

      // 解析为绝对路径
      if (isAbsolute(path)) {
        return normalize(path)
      } else {
        return normalize(resolve(workDir, path))
      }
    } catch {
      return null
    }
  }

  /**
   * 判断路径是否在 Vault 内
   */
  private isInsideVault(path: string): boolean {
    const normalizedPath = normalize(path)
    return (
      normalizedPath === this.vaultRoot ||
      normalizedPath.startsWith(this.vaultRoot + '/')
    )
  }
}
