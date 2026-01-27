/**
 * [PROVIDES]: Workspace 工具函数（扁平化/路径处理）
 * [DEPENDS]: VaultTreeNode
 * [POS]: workspace 文件树与路径通用工具
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { VaultInfo, VaultTreeNode } from '@shared/ipc';

const ILLEGAL_NAME_PATTERN = /[\\/:*?"<>|]/g;

/** 扁平化文件信息 */
export type FlatFile = {
  path: string;
  name: string;
  extension: string;
  mtime?: number;
};

/**
 * 从文件名提取扩展名
 * @param name 文件名（非完整路径）
 * @returns 小写扩展名，无扩展名返回空字符串
 */
const getExtension = (name: string): string => {
  const lastDot = name.lastIndexOf('.');
  // 无点号或点号在开头（隐藏文件如 .gitignore）
  if (lastDot <= 0) return '';
  return name.slice(lastDot + 1).toLowerCase();
};

/**
 * 将目录树扁平化为文件列表
 * @param nodes 目录树节点
 * @returns 扁平化的文件列表
 */
export const flattenTreeToFiles = (nodes: VaultTreeNode[]): FlatFile[] => {
  const files: FlatFile[] = [];

  const traverse = (list: VaultTreeNode[]) => {
    for (const node of list) {
      if (node.type === 'file') {
        files.push({
          path: node.path,
          name: node.name,
          extension: getExtension(node.name),
          mtime: node.mtime,
        });
      }
      if (node.children?.length) {
        traverse(node.children);
      }
    }
  };

  traverse(nodes);
  return files;
};

export const sanitizeEntryName = (value: string) => value.trim().replace(ILLEGAL_NAME_PATTERN, '');

export const ensureMarkdownExtension = (value: string) =>
  value.toLowerCase().endsWith('.md') ? value : `${value}.md`;

export const getParentDirectoryPath = (fullPath: string) => {
  const normalized = fullPath.replace(/\\/g, '/');
  const index = normalized.lastIndexOf('/');
  if (index <= 0) {
    if (/^[A-Za-z]:/.test(fullPath)) {
      const drive = fullPath.slice(0, 2);
      return `${drive}\\`;
    }
    return '/';
  }
  const parentNormalized = normalized.slice(0, index);
  if (fullPath.includes('\\')) {
    if (/^[A-Za-z]:$/.test(parentNormalized)) {
      return `${parentNormalized}\\`;
    }
    return parentNormalized.replace(/\//g, '\\');
  }
  return parentNormalized || '/';
};

export const findNodeByPath = (
  nodes: VaultTreeNode[],
  targetPath: string
): VaultTreeNode | null => {
  for (const node of nodes) {
    if (node.path === targetPath) {
      return node;
    }
    if (node.children?.length) {
      const found = findNodeByPath(node.children, targetPath);
      if (found) {
        return found;
      }
    }
  }
  return null;
};

export const resolveParentPath = (
  vault: VaultInfo | null,
  selectedEntry: VaultTreeNode | null
): string => {
  if (selectedEntry?.type === 'folder') {
    return selectedEntry.path;
  }
  if (selectedEntry?.type === 'file') {
    return getParentDirectoryPath(selectedEntry.path);
  }
  return vault?.path ?? '';
};

export const mergeChildrenIntoTree = (
  nodes: VaultTreeNode[],
  targetPath: string,
  children: VaultTreeNode[]
): VaultTreeNode[] => {
  return nodes.map((node) => {
    if (node.path === targetPath) {
      return { ...node, children, hasChildren: children.length > 0 };
    }
    if (node.children?.length) {
      return { ...node, children: mergeChildrenIntoTree(node.children, targetPath, children) };
    }
    return node;
  });
};
