/**
 * 文件系统适配器
 * 使用 expo-file-system v19 新 API (File/Directory/Paths)
 *
 * 关键点：
 * - 使用 Directory 实例 + 路径片段的方式创建 File/Directory，内部会正确处理 Unicode
 * - write() 方法是同步的，不需要 await
 * - Paths.document 是 Directory 实例，不是字符串
 */

import { File, Directory, Paths } from 'expo-file-system';
import type { FileSystem as IFileSystem, FileInfo } from '@moryflow/agents-adapter';
import { pathUtils } from './path-utils';

// ============ 文件变更事件类型 ============

/**
 * 文件变更事件
 */
export interface FileChangeEvent {
  type: 'created' | 'modified' | 'deleted' | 'renamed';
  path: string;
  oldPath?: string;
}

/**
 * 文件变更回调函数类型
 */
export type FileChangeCallback = (event: FileChangeEvent) => void;

// ============ 路径处理工具 ============

/**
 * 将路径分割为片段数组
 * @example "北京/北京的冬.md" -> ["北京", "北京的冬.md"]
 */
function splitPathSegments(filePath: string): string[] {
  let path = filePath;
  if (path.startsWith('file://')) path = path.slice(7);
  if (path.startsWith('/')) path = path.slice(1);
  return path.split('/').filter(Boolean);
}

/**
 * 从完整路径中提取相对于 vault 的路径
 */
function extractRelativePath(fullPath: string, vaultRoot: string): string {
  const normalizedFull = pathUtils.normalize(fullPath);
  const normalizedRoot = pathUtils.normalize(vaultRoot);

  if (normalizedFull.startsWith(normalizedRoot)) {
    const relative = normalizedFull.slice(normalizedRoot.length).replace(/^\//, '');
    return relative || '.';
  }
  return fullPath;
}

// ============ File/Directory 工厂函数 ============

/**
 * 根据路径创建 File 实例
 */
function createFile(basePath: string, relativePath: string): File {
  const segments = splitPathSegments(relativePath);
  if (segments.length === 0) {
    throw new Error('Invalid file path: empty path');
  }
  return new File(new Directory(basePath), ...segments);
}

/**
 * 根据路径创建 Directory 实例
 */
function createDirectory(basePath: string, relativePath?: string): Directory {
  if (!relativePath) {
    return new Directory(basePath);
  }
  const segments = splitPathSegments(relativePath);
  return segments.length === 0
    ? new Directory(basePath)
    : new Directory(new Directory(basePath), ...segments);
}

// ============ 路径检查工具 ============

type PathType = 'file' | 'directory' | 'none';

/**
 * 检查路径是文件、目录还是不存在
 */
function checkPathType(basePath: string, relativePath: string): PathType {
  const dir = createDirectory(basePath, relativePath);
  if (dir.exists) return 'directory';

  try {
    const file = createFile(basePath, relativePath);
    return file.exists ? 'file' : 'none';
  } catch {
    return 'none';
  }
}

// ============ 文件系统工厂 ============

/**
 * 创建文件系统实例
 * @param getVaultRoot 获取 vault 根目录的函数
 * @param onFileChange 可选的文件变更回调，用于通知 UI 刷新
 */
export function createFileSystem(
  getVaultRoot: () => string,
  onFileChange?: FileChangeCallback
): IFileSystem {
  /** 获取相对路径的辅助函数 */
  const getRelative = (path: string) => extractRelativePath(path, getVaultRoot());

  return {
    async readFile(filePath: string): Promise<string> {
      const root = getVaultRoot();
      const file = createFile(root, getRelative(filePath));

      if (!file.exists) {
        throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
      }
      return file.text();
    },

    async writeFile(filePath: string, content: string): Promise<void> {
      const root = getVaultRoot();
      const relativePath = getRelative(filePath);

      // 确保父目录存在
      const dirPath = pathUtils.dirname(relativePath);
      if (dirPath && dirPath !== '.') {
        const dir = createDirectory(root, dirPath);
        if (!dir.exists) {
          dir.create({ intermediates: true });
        }
      }

      // 检查文件是否已存在，用于区分 created 和 modified
      const file = createFile(root, relativePath);
      const existed = file.exists;

      file.write(content);

      // 触发变更事件
      onFileChange?.({
        type: existed ? 'modified' : 'created',
        path: relativePath,
      });
    },

    async delete(targetPath: string): Promise<void> {
      const root = getVaultRoot();
      const relativePath = getRelative(targetPath);
      const pathType = checkPathType(root, relativePath);

      if (pathType === 'none') {
        throw new Error(`ENOENT: no such file or directory, unlink '${targetPath}'`);
      }

      if (pathType === 'directory') {
        createDirectory(root, relativePath).delete();
      } else {
        createFile(root, relativePath).delete();
      }

      // 触发变更事件
      onFileChange?.({
        type: 'deleted',
        path: relativePath,
      });
    },

    async move(from: string, to: string): Promise<void> {
      const root = getVaultRoot();
      const fromRelative = getRelative(from);
      const toRelative = getRelative(to);
      const pathType = checkPathType(root, fromRelative);

      if (pathType === 'none') {
        throw new Error(`ENOENT: no such file or directory, rename '${from}'`);
      }

      if (pathType === 'directory') {
        createDirectory(root, fromRelative).move(createDirectory(root, toRelative));
      } else {
        createFile(root, fromRelative).move(createFile(root, toRelative));
      }

      // 触发变更事件
      onFileChange?.({
        type: 'renamed',
        path: toRelative,
        oldPath: fromRelative,
      });
    },

    async mkdir(dirPath: string, options?: { recursive?: boolean }): Promise<void> {
      const relativePath = getRelative(dirPath);
      const dir = createDirectory(getVaultRoot(), relativePath);
      const existed = dir.exists;

      if (!existed) {
        dir.create({ intermediates: options?.recursive ?? false, idempotent: true });

        // 触发变更事件（只在新创建时触发）
        onFileChange?.({
          type: 'created',
          path: relativePath,
        });
      }
    },

    async readdir(dirPath: string): Promise<string[]> {
      const dir = createDirectory(getVaultRoot(), getRelative(dirPath));
      if (!dir.exists) {
        throw new Error(`ENOENT: no such file or directory, scandir '${dirPath}'`);
      }
      return dir.list().map((item) => item.name);
    },

    async exists(targetPath: string): Promise<boolean> {
      return checkPathType(getVaultRoot(), getRelative(targetPath)) !== 'none';
    },

    async stat(targetPath: string): Promise<FileInfo> {
      const root = getVaultRoot();
      const relativePath = getRelative(targetPath);
      const pathType = checkPathType(root, relativePath);

      if (pathType === 'none') {
        throw new Error(`ENOENT: no such file or directory, stat '${targetPath}'`);
      }

      if (pathType === 'directory') {
        const info = createDirectory(root, relativePath).info();
        return {
          isDirectory: true,
          isFile: false,
          size: info.size ?? 0,
          mtime: info.modificationTime ?? Date.now(),
        };
      }

      const file = createFile(root, relativePath);
      return {
        isDirectory: false,
        isFile: true,
        size: file.size,
        mtime: file.modificationTime ?? Date.now(),
      };
    },

    // 在移动端 access 等同于 exists，因为 expo-file-system 不提供单独的权限检查
    async access(targetPath: string): Promise<boolean> {
      return checkPathType(getVaultRoot(), getRelative(targetPath)) !== 'none';
    },
  };
}

/**
 * 获取默认的 Vault 根目录
 */
export function getDefaultVaultRoot(): string {
  return new Directory(Paths.document, 'vault').uri;
}

/**
 * 确保 Vault 目录存在
 */
export function ensureVaultExists(vaultRoot?: string): string {
  const root = vaultRoot || getDefaultVaultRoot();
  const dir = new Directory(root);

  if (!dir.exists) {
    dir.create({ intermediates: true });
  }

  return root;
}
