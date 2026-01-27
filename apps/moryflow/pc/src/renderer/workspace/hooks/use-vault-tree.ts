/**
 * [PROVIDES]: useVaultTreeState - Vault 文件树加载与同步
 * [DEPENDS]: desktopAPI.vault, desktopAPI.workspace
 * [POS]: Workspace 文件树数据层
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { VaultInfo, VaultTreeNode, VaultFsEvent } from '@shared/ipc';
import { useTranslation } from '@/lib/i18n';
import { mergeChildrenIntoTree } from '../utils';
import { findNodeByPath, getParentDirectoryPath } from '../utils';

type TreeState = 'idle' | 'loading' | 'error';

export type VaultTreeState = {
  tree: VaultTreeNode[];
  treeState: TreeState;
  treeError: string | null;
  expandedPaths: string[];
  selectedEntry: VaultTreeNode | null;
  setSelectedEntry: (node: VaultTreeNode | null) => void;
  fetchTree: (targetPath: string) => Promise<void>;
  refreshSubtree: (targetPath: string) => Promise<void>;
  handleExpandedPathsChange: (newPaths: string[]) => void;
  handleSelectTreeNode: (node: VaultTreeNode) => void;
  handleRefreshTree: () => void;
};

export const useVaultTreeState = (vault: VaultInfo | null): VaultTreeState => {
  const { t } = useTranslation('workspace');
  const [tree, setTree] = useState<VaultTreeNode[]>([]);
  const [treeState, setTreeState] = useState<TreeState>('idle');
  const [treeError, setTreeError] = useState<string | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<string[]>([]);
  const expandedPathsRef = useRef<Set<string>>(new Set());
  const [selectedEntry, setSelectedEntry] = useState<VaultTreeNode | null>(null);
  const [fsEventTick, setFsEventTick] = useState(0);
  // 追踪上一次的 vault path，用于检测工作区切换
  const prevVaultPathRef = useRef<string | null>(null);

  const persistExpandedPaths = useCallback(
    (paths: string[]) => {
      if (!vault) return;
      void window.desktopAPI.workspace.setExpandedPaths(vault.path, paths);
    },
    [vault]
  );

  const updateExpandedPaths = useCallback(
    (updater: (prev: string[]) => string[]) => {
      setExpandedPaths((prev) => {
        const next = updater(prev);
        expandedPathsRef.current = new Set(next);
        persistExpandedPaths(next);
        void window.desktopAPI.vault.updateWatchPaths(next);
        return next;
      });
    },
    [persistExpandedPaths]
  );

  const fetchTree = useCallback(
    async (targetPath: string) => {
      setTreeState((prev) => (prev === 'idle' && tree.length ? prev : 'loading'));
      setTreeError(null);
      try {
        const rootNodes = await window.desktopAPI.vault.readTreeRoot(targetPath);
        let merged = rootNodes;
        const invalidPaths: string[] = [];
        const expandedPaths = Array.from(expandedPathsRef.current);
        if (expandedPaths.length > 0) {
          const results = await Promise.allSettled(
            expandedPaths.map(async (expandedPath) => ({
              path: expandedPath,
              children: await window.desktopAPI.vault.readTreeChildren(expandedPath),
            }))
          );
          results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
              merged = mergeChildrenIntoTree(merged, result.value.path, result.value.children);
              return;
            }
            const targetPath = expandedPaths[index];
            console.warn('[workspace] readTreeChildren failed, removing invalid path:', targetPath);
            invalidPaths.push(targetPath);
          });
        }
        // 清理无效的展开路径
        if (invalidPaths.length > 0) {
          updateExpandedPaths((prev) =>
            prev.filter(
              (p) => !invalidPaths.some((invalid) => p === invalid || p.startsWith(invalid + '/'))
            )
          );
        }
        setTree(merged);
        setTreeState('idle');
        void window.desktopAPI.vault.setTreeCache({ vaultPath: targetPath, nodes: merged });
      } catch (error) {
        setTreeState('error');
        setTreeError(error instanceof Error ? error.message : t('loadFileTreeFailed'));
      }
    },
    [tree.length, updateExpandedPaths]
  );

  const resetTreeState = useCallback(() => {
    setTree([]);
    setExpandedPaths([]);
    expandedPathsRef.current = new Set();
    setTreeState('idle');
    setSelectedEntry(null);
    setTreeError(null);
  }, []);

  useEffect(() => {
    if (!vault) {
      resetTreeState();
      prevVaultPathRef.current = null;
      return;
    }

    // 检测工作区切换：vault path 变化时立即清空状态
    const isVaultSwitch =
      prevVaultPathRef.current !== null && prevVaultPathRef.current !== vault.path;
    if (isVaultSwitch) {
      // 工作区切换，立即清空旧状态避免显示错误数据
      setTree([]);
      setExpandedPaths([]);
      expandedPathsRef.current = new Set();
      setTreeState('loading');
      setSelectedEntry(null);
      setTreeError(null);
    }
    prevVaultPathRef.current = vault.path;

    void window.desktopAPI.workspace
      .getExpandedPaths(vault.path)
      .then((paths) => {
        if (Array.isArray(paths)) {
          setExpandedPaths(paths);
          expandedPathsRef.current = new Set(paths);
        } else {
          setExpandedPaths([]);
          expandedPathsRef.current = new Set();
        }
      })
      .catch(() => {
        setExpandedPaths([]);
        expandedPathsRef.current = new Set();
      });

    // 工作区切换时跳过缓存，直接获取最新数据
    if (!isVaultSwitch) {
      void window.desktopAPI.vault
        .getTreeCache(vault.path)
        .then((cache) => {
          if (cache?.nodes?.length) {
            setTree(cache.nodes);
            setTreeState('idle');
          }
        })
        .catch(() => {});
    }

    void fetchTree(vault.path);
    void window.desktopAPI.vault.updateWatchPaths(Array.from(expandedPathsRef.current));
  }, [vault, fetchTree, resetTreeState]);

  const refreshSubtree = useCallback(
    async (targetPath: string) => {
      if (!vault) return;
      if (targetPath === vault.path || !findNodeByPath(tree, targetPath)) {
        void fetchTree(vault.path);
        return;
      }
      try {
        const children = await window.desktopAPI.vault.readTreeChildren(targetPath);
        setTree((prev) => mergeChildrenIntoTree(prev, targetPath, children));
      } catch (error) {
        console.warn('[workspace] refreshSubtree failed', error);
        void fetchTree(vault.path);
      }
    },
    [vault, tree, fetchTree]
  );

  useEffect(() => {
    if (!window.desktopAPI.events?.onVaultFsEvent) {
      return;
    }
    const dispose = window.desktopAPI.events.onVaultFsEvent((event: VaultFsEvent) => {
      if (!vault) return;
      const dirEvent =
        event.type === 'dir-added' ||
        event.type === 'dir-removed' ||
        event.type === 'file-added' ||
        event.type === 'file-removed' ||
        event.type === 'file-changed';

      if (event.type === 'file-removed') {
        void window.desktopAPI.workspace.removeRecentFile(vault.path, event.path);
      }

      if (dirEvent) {
        // dir-removed 需要刷新父目录（被删除的目录已不存在）
        // dir-added 刷新新增目录本身
        // file-added/removed/changed 刷新文件所在目录
        const target = event.type === 'dir-added' ? event.path : getParentDirectoryPath(event.path);

        // 当目录被删除时，清理 expandedPaths 中被删除目录及其子目录的路径
        if (event.type === 'dir-removed') {
          const removedPath = event.path;
          updateExpandedPaths((prev) =>
            prev.filter((p) => p !== removedPath && !p.startsWith(removedPath + '/'))
          );
        }

        void refreshSubtree(target);
      } else {
        setFsEventTick((tick) => tick + 1);
      }
    });
    return () => dispose();
  }, [vault, refreshSubtree, updateExpandedPaths]);

  useEffect(() => {
    if (!vault || fsEventTick === 0) {
      return;
    }
    const timer = setTimeout(() => {
      void fetchTree(vault.path);
    }, 400);
    return () => clearTimeout(timer);
  }, [vault, fsEventTick, fetchTree]);

  const handleSelectTreeNode = useCallback((node: VaultTreeNode) => {
    setSelectedEntry(node);
  }, []);

  // 处理展开路径变化（由 Files 组件的 onOpenChange 触发）
  const handleExpandedPathsChange = useCallback(
    (newPaths: string[]) => {
      const oldSet = expandedPathsRef.current;
      // 找出新增的路径（需要加载子节点）
      const addedPaths = newPaths.filter((p) => !oldSet.has(p));

      // 更新展开路径
      updateExpandedPaths(() => newPaths);

      // 为新展开的路径加载子节点
      addedPaths.forEach((path) => {
        const node = findNodeByPath(tree, path);
        if (node && (!node.children || node.children.length === 0)) {
          window.desktopAPI.vault
            .readTreeChildren(path)
            .then((children) => {
              setTree((prev) => mergeChildrenIntoTree(prev, path, children));
            })
            .catch((error) => {
              setTreeError(error instanceof Error ? error.message : t('loadSubdirFailed'));
            });
        }
      });
    },
    [tree, updateExpandedPaths]
  );

  const handleRefreshTree = useCallback(() => {
    if (!vault) {
      return;
    }
    void fetchTree(vault.path);
  }, [vault, fetchTree]);

  return {
    tree,
    treeState,
    treeError,
    expandedPaths,
    selectedEntry,
    setSelectedEntry,
    fetchTree,
    refreshSubtree,
    handleExpandedPathsChange,
    handleSelectTreeNode,
    handleRefreshTree,
  };
};
