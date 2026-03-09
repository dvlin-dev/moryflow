/**
 * [PROVIDES]: 命令中的路径检测
 * [DEPENDS]: 无
 * [POS]: 检测命令中引用的外部路径
 */

import { existsSync, realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, normalize, parse, relative, resolve } from 'node:path';

export class PathDetector {
  private readonly vaultRootCanonical: string;

  constructor(private vaultRoot: string) {
    // 规范化 vault 路径
    this.vaultRoot = normalize(resolve(vaultRoot));
    this.vaultRootCanonical = this.toComparablePath(this.vaultRoot);
  }

  /**
   * 检测命令中的外部路径
   * @returns 外部路径列表（Vault 外的路径）
   */
  detect(command: string, cwd?: string): string[] {
    const workDir = cwd ?? this.vaultRoot;
    const paths = this.extractPaths(command, workDir);
    return paths.filter((p) => !this.isInsideVault(p));
  }

  /**
   * 从命令中提取路径
   */
  private extractPaths(command: string, workDir: string): string[] {
    const paths: string[] = [];

    // 匹配各种路径模式
    const patterns = [
      // 绝对路径: /xxx 或 ~/xxx
      /(?:^|\s)(\/[^\s;|&><]+)/g,
      /(?:^|\s)(~[\\/][^\s;|&><]+)/g,
      // 相对路径: ./xxx 或 ../xxx
      /(?:^|\s)(\.\.?\/[^\s;|&><]+)/g,
      /(?:^|\s)(\.\.?\\[^\s;|&><]+)/g,
      // Windows 盘符路径: C:\xxx 或 C:/xxx
      /(?:^|\s)([a-zA-Z]:\\[^\s;|&><]+)/g,
      /(?:^|\s)([a-zA-Z]:\/[^\s;|&><]+)/g,
      // UNC 路径: \\server\share
      /(?:^|\s)(\\\\[^\s;|&><]+)/g,
      // 引号内的路径
      /"([^"]+)"/g,
      /'([^']+)'/g,
    ];

    for (const pattern of patterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(command)) !== null) {
        const path = match[1].trim();
        if (this.looksLikePath(path)) {
          const resolved = this.resolvePath(path, workDir);
          if (resolved) {
            paths.push(resolved);
          }
        }
      }
    }

    // 去重
    return [...new Set(paths)];
  }

  /**
   * 判断字符串是否看起来像路径
   */
  private looksLikePath(str: string): boolean {
    if (!str || str.length < 2) return false;
    // 以 / . ~ 开头，或包含 /
    return (
      str.startsWith('/') ||
      str.startsWith('./') ||
      str.startsWith('../') ||
      str.startsWith('~/') ||
      str.startsWith('~\\') ||
      /^[a-zA-Z]:[\\/]/.test(str) ||
      str.startsWith('\\\\') ||
      ((str.includes('/') || str.includes('\\')) && !str.includes('://')) // 排除 URL
    );
  }

  /**
   * 解析路径为绝对路径
   */
  private resolvePath(path: string, workDir: string): string | null {
    try {
      // 展开 ~
      if (path.startsWith('~/') || path.startsWith('~\\')) {
        const home = process.env.HOME ?? process.env.USERPROFILE;
        if (!home) return null;
        path = path.replace(/^~[\\/]/, `${home}${path[1]}`);
      }

      // 解析为绝对路径
      if (isAbsolute(path)) {
        return normalize(path);
      } else {
        return normalize(resolve(workDir, path));
      }
    } catch {
      return null;
    }
  }

  /**
   * 判断路径是否在 Vault 内
   */
  private isInsideVault(path: string): boolean {
    const comparablePath = this.toComparablePath(path);
    const relativePath = relative(this.vaultRootCanonical, comparablePath);
    return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath));
  }

  /**
   * 归一化成用于比较的路径：
   * 1) 绝对化 + normalize
   * 2) 优先 realpath（消除 symlink 别名）
   * 3) 若目标不存在，回退到最近存在父级的 realpath，再拼接剩余段
   */
  private toComparablePath(inputPath: string): string {
    const normalized = normalize(resolve(inputPath));
    const canonical = this.resolveRealpathWithFallback(normalized);
    return process.platform === 'win32' ? canonical.toLowerCase() : canonical;
  }

  private resolveRealpathWithFallback(targetPath: string): string {
    try {
      return normalize(realpathSync.native(targetPath));
    } catch {
      // path may not exist yet (e.g. create/write). Fallback to nearest existing ancestor.
    }

    const unresolvedSegments: string[] = [];
    let current = targetPath;
    const root = parse(targetPath).root;
    while (current !== root && !existsSync(current)) {
      unresolvedSegments.unshift(basename(current));
      current = dirname(current);
    }

    if (!existsSync(current)) {
      return targetPath;
    }

    try {
      const canonicalParent = normalize(realpathSync.native(current));
      return normalize(
        unresolvedSegments.length === 0
          ? canonicalParent
          : resolve(canonicalParent, ...unresolvedSegments)
      );
    } catch {
      return targetPath;
    }
  }
}
