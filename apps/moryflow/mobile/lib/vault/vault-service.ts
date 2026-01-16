/**
 * Mobile Vault 服务
 *
 * 管理 Vault（知识库）的文件操作和状态。
 * 实现 VaultService 接口，提供文件树读取、文件 CRUD 等功能。
 *
 * 使用 expo-file-system v19 新 API (File/Directory/Paths)
 */

import { File, Directory, Paths } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLogger } from '@/lib/agent-runtime';
import type { VaultService, VaultInfo, ResolvedVaultPath } from '@anyhunt/agents-adapter';
import type { VaultTreeNode, VaultFileInfo, VaultChangeListener, VaultChangeEvent } from './types';
import { fileIndexManager } from './file-index';

// ============ 常量 ============

const VAULT_INFO_KEY = 'vault_info';
const logger = createLogger('[VaultService]');

// ============ 内部状态 ============

let currentVault: VaultInfo | null = null;
const changeListeners: Set<VaultChangeListener> = new Set();

// ============ 工具函数 ============

/**
 * 规范化路径
 */
function normalizePath(path: string): string {
  return Paths.normalize(path);
}

/**
 * 拼接路径
 */
function joinPath(...parts: string[]): string {
  return Paths.join(...parts);
}

/**
 * 获取相对路径
 */
function getRelativePath(fullPath: string, root: string): string {
  return Paths.relative(root, fullPath);
}

/**
 * 通知变更监听器（导出供 agent-runtime 使用）
 */
export function notifyVaultChange(event: VaultChangeEvent): void {
  changeListeners.forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      logger.error('Listener error:', error);
    }
  });
}

// ============ VaultService 接口实现 ============

/**
 * 获取当前 Vault 信息
 */
export async function getVault(): Promise<VaultInfo | null> {
  if (currentVault) {
    return currentVault;
  }

  const stored = await AsyncStorage.getItem(VAULT_INFO_KEY);
  if (stored) {
    try {
      currentVault = JSON.parse(stored) as VaultInfo;
      return currentVault;
    } catch (error) {
      logger.error('Failed to parse vault info:', error);
    }
  }

  return null;
}

/**
 * 设置 Vault
 */
export async function setVault(info: VaultInfo): Promise<void> {
  const dir = new Directory(info.path);
  if (!dir.exists) {
    dir.create({ intermediates: true });
    logger.info('Created vault directory:', info.path);
  }

  currentVault = info;
  await AsyncStorage.setItem(VAULT_INFO_KEY, JSON.stringify(info));
  logger.info('Vault set to:', info.path);

  // 初始化 fileIndex 并扫描
  await fileIndexManager.load(info.path);
  const created = await fileIndexManager.scanAndCreateIds(info.path);
  if (created > 0) {
    logger.info(`fileIndex created ${created} new entries`);
  }
}

/**
 * 解析路径（相对于 Vault）
 */
export async function resolvePath(targetPath: string): Promise<ResolvedVaultPath> {
  const vault = await getVault();
  if (!vault) {
    throw new Error('Vault 未初始化');
  }

  const root = normalizePath(vault.path);
  let absolute: string;
  let relative: string;

  if (targetPath.startsWith('/') || targetPath.startsWith('file://')) {
    absolute = normalizePath(targetPath);
    relative = getRelativePath(absolute, root);
  } else {
    relative = normalizePath(targetPath);
    absolute = joinPath(root, relative);
  }

  return { root, absolute, relative };
}

/**
 * 验证路径是否在 Vault 内
 */
export async function validatePath(targetPath: string): Promise<boolean> {
  const vault = await getVault();
  if (!vault) {
    return false;
  }

  const root = normalizePath(vault.path);
  const resolved = normalizePath(
    targetPath.startsWith('/') || targetPath.startsWith('file://')
      ? targetPath
      : joinPath(root, targetPath)
  );

  return resolved.startsWith(root + '/') || resolved === root;
}

/**
 * VaultService 接口实现
 */
export const vaultService: VaultService = {
  getVault,
  setVault,
  resolvePath,
  validatePath,
};

// ============ 扩展功能 ============

/**
 * 获取 Vault 根路径
 */
export async function getVaultRoot(): Promise<string> {
  const vault = await getVault();
  if (!vault) {
    throw new Error('Vault 未初始化');
  }
  return vault.path;
}

/**
 * 读取文件树
 */
export async function readTree(relativePath: string = ''): Promise<VaultTreeNode[]> {
  const vault = await getVault();
  if (!vault) return [];

  const fullPath = relativePath ? joinPath(vault.path, relativePath) : vault.path;
  const dir = new Directory(fullPath);

  if (!dir.exists) return [];

  try {
    const items = dir.list();
    const nodes: VaultTreeNode[] = [];

    for (const item of items) {
      // 跳过隐藏文件
      if (item.name.startsWith('.')) continue;

      const itemRelativePath = relativePath ? joinPath(relativePath, item.name) : item.name;

      if (item instanceof Directory) {
        const info = item.info();
        nodes.push({
          name: item.name,
          path: itemRelativePath,
          type: 'directory',
          size: info.size,
          mtime: info.modificationTime,
        });
      } else if (item instanceof File) {
        nodes.push({
          name: item.name,
          path: itemRelativePath,
          type: 'file',
          size: item.size,
          mtime: item.modificationTime ?? undefined,
        });
      }
    }

    // 排序：目录优先，然后按名称排序
    return nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    logger.error('Failed to read tree:', error);
    return [];
  }
}

/**
 * 递归读取文件树（包含子目录的 children）
 * 用于支持文件夹展开/收起功能
 */
export async function readTreeRecursive(
  relativePath: string = '',
  maxDepth: number = 10
): Promise<VaultTreeNode[]> {
  const vault = await getVault();
  if (!vault) return [];

  async function readDir(dirPath: string, currentDepth: number): Promise<VaultTreeNode[]> {
    if (currentDepth > maxDepth) return [];

    const fullPath = dirPath ? joinPath(vault!.path, dirPath) : vault!.path;
    const dir = new Directory(fullPath);

    if (!dir.exists) return [];

    try {
      const items = dir.list();
      const nodes: VaultTreeNode[] = [];

      for (const item of items) {
        // 跳过隐藏文件
        if (item.name.startsWith('.')) continue;

        const itemRelativePath = dirPath ? joinPath(dirPath, item.name) : item.name;

        if (item instanceof Directory) {
          const info = item.info();
          // 递归读取子目录
          const children = await readDir(itemRelativePath, currentDepth + 1);
          nodes.push({
            name: item.name,
            path: itemRelativePath,
            type: 'directory',
            size: info.size,
            mtime: info.modificationTime,
            children: children.length > 0 ? children : undefined,
          });
        } else if (item instanceof File) {
          nodes.push({
            name: item.name,
            path: itemRelativePath,
            type: 'file',
            size: item.size,
            mtime: item.modificationTime ?? undefined,
          });
        }
      }

      // 排序：目录优先，然后按名称排序
      return nodes.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      logger.error('Failed to read tree:', error);
      return [];
    }
  }

  return readDir(relativePath, 0);
}

/**
 * 读取文件内容
 */
export async function readFile(relativePath: string): Promise<string> {
  const vault = await getVault();
  if (!vault) throw new Error('Vault 未初始化');

  const fullPath = joinPath(vault.path, relativePath);
  const file = new File(fullPath);

  if (!file.exists) {
    throw new Error(`文件不存在: ${relativePath}`);
  }

  return file.text();
}

/**
 * 写入文件
 */
export async function writeFile(relativePath: string, content: string): Promise<void> {
  const vault = await getVault();
  if (!vault) throw new Error('Vault 未初始化');

  const fullPath = joinPath(vault.path, relativePath);
  const file = new File(fullPath);
  const exists = file.exists;

  // 确保父目录存在
  const parentDir = file.parentDirectory;
  if (!parentDir.exists) {
    parentDir.create({ intermediates: true });
  }

  file.write(content);

  // 新文件时注册 fileId
  if (!exists && relativePath.endsWith('.md')) {
    await fileIndexManager.getOrCreate(vault.path, relativePath);
  }

  notifyVaultChange({
    type: exists ? 'modified' : 'created',
    path: relativePath,
  });
}

/**
 * 删除文件或目录
 */
export async function deleteFile(relativePath: string): Promise<void> {
  const vault = await getVault();
  if (!vault) throw new Error('Vault 未初始化');

  const fullPath = joinPath(vault.path, relativePath);
  const pathInfo = Paths.info(fullPath);

  if (!pathInfo.exists) return;

  if (pathInfo.isDirectory) {
    new Directory(fullPath).delete();
  } else {
    new File(fullPath).delete();
    // 移除 fileId 映射
    if (relativePath.endsWith('.md')) {
      await fileIndexManager.delete(vault.path, relativePath);
    }
  }

  notifyVaultChange({
    type: 'deleted',
    path: relativePath,
  });
}

/**
 * 移动/重命名文件
 */
export async function moveFile(fromPath: string, toPath: string): Promise<void> {
  const vault = await getVault();
  if (!vault) throw new Error('Vault 未初始化');

  const fromFull = joinPath(vault.path, fromPath);
  const toFull = joinPath(vault.path, toPath);

  const pathInfo = Paths.info(fromFull);
  if (!pathInfo.exists) {
    throw new Error(`源文件不存在: ${fromPath}`);
  }

  // 确保目标父目录存在
  const toFile = new File(toFull);
  const toParentDir = toFile.parentDirectory;
  if (!toParentDir.exists) {
    toParentDir.create({ intermediates: true });
  }

  if (pathInfo.isDirectory) {
    new Directory(fromFull).move(new Directory(toFull));
  } else {
    new File(fromFull).move(toFile);
    // 更新 fileId 映射
    if (fromPath.endsWith('.md')) {
      await fileIndexManager.move(vault.path, fromPath, toPath);
    }
  }

  notifyVaultChange({
    type: 'renamed',
    path: toPath,
    oldPath: fromPath,
  });
}

/**
 * 创建目录
 */
export async function createDirectory(relativePath: string): Promise<void> {
  const vault = await getVault();
  if (!vault) throw new Error('Vault 未初始化');

  const fullPath = joinPath(vault.path, relativePath);
  new Directory(fullPath).create({ intermediates: true });

  notifyVaultChange({
    type: 'created',
    path: relativePath,
  });
}

/**
 * 检查文件是否存在
 */
export async function fileExists(relativePath: string): Promise<boolean> {
  const vault = await getVault();
  if (!vault) return false;

  const fullPath = joinPath(vault.path, relativePath);
  return Paths.info(fullPath).exists;
}

/**
 * 获取文件信息
 */
export async function getFileInfo(relativePath: string): Promise<VaultFileInfo | null> {
  const vault = await getVault();
  if (!vault) return null;

  const fullPath = joinPath(vault.path, relativePath);
  const pathInfo = Paths.info(fullPath);

  if (!pathInfo.exists) return null;

  const name = Paths.basename(relativePath);

  if (pathInfo.isDirectory) {
    const dir = new Directory(fullPath);
    const info = dir.info();
    return {
      path: relativePath,
      name,
      size: info.size ?? 0,
      mtime: info.modificationTime ?? Date.now(),
      isDirectory: true,
    };
  } else {
    const file = new File(fullPath);
    return {
      path: relativePath,
      name,
      size: file.size,
      mtime: file.modificationTime ?? Date.now(),
      isDirectory: false,
    };
  }
}

/**
 * 添加变更监听器
 */
export function onVaultChange(listener: VaultChangeListener): () => void {
  changeListeners.add(listener);
  return () => {
    changeListeners.delete(listener);
  };
}

/**
 * 重置 Vault（清除当前设置）
 */
export async function resetVault(): Promise<void> {
  currentVault = null;
  await AsyncStorage.removeItem(VAULT_INFO_KEY);
}
