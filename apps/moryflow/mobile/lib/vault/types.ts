/**
 * Vault 服务类型定义
 */

import type { VaultInfo, ResolvedVaultPath } from '@moryflow/agents-adapter';

// 重新导出类型
export type { VaultInfo, ResolvedVaultPath };

/**
 * Vault 树节点
 */
export interface VaultTreeNode {
  /** 节点名称 */
  name: string;
  /** 相对于 Vault 的路径 */
  path: string;
  /** 节点类型 */
  type: 'file' | 'directory';
  /** 子节点（仅目录有） */
  children?: VaultTreeNode[];
  /** 文件大小（仅文件有） */
  size?: number;
  /** 修改时间（毫秒时间戳） */
  mtime?: number;
}

/**
 * 文件信息
 */
export interface VaultFileInfo {
  /** 相对路径 */
  path: string;
  /** 文件名 */
  name: string;
  /** 文件大小 */
  size: number;
  /** 修改时间 */
  mtime: number;
  /** 是否为目录 */
  isDirectory: boolean;
}

/**
 * Vault 变更事件
 */
export interface VaultChangeEvent {
  type: 'created' | 'modified' | 'deleted' | 'renamed';
  path: string;
  oldPath?: string; // 仅 renamed 事件
}

/**
 * Vault 变更监听器
 */
export type VaultChangeListener = (event: VaultChangeEvent) => void;
