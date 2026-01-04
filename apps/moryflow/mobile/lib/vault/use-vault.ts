/**
 * Vault Hook
 *
 * 提供 Vault 文件操作的 React Hooks。
 */

import { useState, useEffect, useCallback } from 'react';
import type { VaultTreeNode, VaultInfo } from './types';
import {
  readTree,
  readFile,
  writeFile,
  fileExists,
  onVaultChange,
} from './vault-service';
import { initVaultManager } from './vault-manager';

// ============ useVault Hook ============

export interface UseVaultReturn {
  /** Vault 信息 */
  vault: VaultInfo | null;
  /** 是否已初始化 */
  isInitialized: boolean;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 初始化 Vault */
  initialize: () => Promise<void>;
}

/**
 * Vault 初始化 Hook
 */
export function useVault(): UseVaultReturn {
  const [vault, setVault] = useState<VaultInfo | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const initialize = useCallback(async () => {
    setIsLoading(true);
    try {
      const managed = await initVaultManager();
      setVault({ name: managed.name, path: managed.path });
      setIsInitialized(true);
    } catch (error) {
      console.error('[useVault] Failed to initialize:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return { vault, isInitialized, isLoading, initialize };
}

// ============ useVaultTree Hook ============

export interface UseVaultTreeReturn {
  /** 文件列表 */
  items: VaultTreeNode[];
  /** 是否正在加载 */
  isLoading: boolean;
  /** 是否正在刷新 */
  isRefreshing: boolean;
  /** 当前路径 */
  currentPath: string;
  /** 刷新列表 */
  refresh: () => Promise<void>;
  /** 导航到路径 */
  navigateTo: (path: string) => void;
  /** 返回上一级 */
  goBack: () => void;
  /** 是否可以返回 */
  canGoBack: boolean;
  /** 路径历史 */
  pathHistory: string[];
}

/**
 * Vault 文件树 Hook
 */
export function useVaultTree(initialPath: string = ''): UseVaultTreeReturn {
  const [items, setItems] = useState<VaultTreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [pathHistory, setPathHistory] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const nodes = await readTree();
      setItems(nodes);
    } catch (error) {
      console.error('[useVaultTree] Failed to read tree:', error);
      setItems([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentPath]);

  // 初始加载
  useEffect(() => {
    setIsLoading(true);
    refresh();
  }, [refresh]);

  // 监听变更
  useEffect(() => {
    const unsubscribe = onVaultChange(() => {
      refresh();
    });
    return unsubscribe;
  }, [refresh]);

  const navigateTo = useCallback((path: string) => {
    setPathHistory((prev) => [...prev, currentPath]);
    setCurrentPath(path);
  }, [currentPath]);

  const goBack = useCallback(() => {
    if (pathHistory.length > 0) {
      const prevPath = pathHistory[pathHistory.length - 1];
      setPathHistory((prev) => prev.slice(0, -1));
      setCurrentPath(prevPath);
    }
  }, [pathHistory]);

  const canGoBack = pathHistory.length > 0;

  return {
    items,
    isLoading,
    isRefreshing,
    currentPath,
    refresh,
    navigateTo,
    goBack,
    canGoBack,
    pathHistory,
  };
}

// ============ useVaultFile Hook ============

export interface UseVaultFileReturn {
  /** 文件内容 */
  content: string | null;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 是否正在保存 */
  isSaving: boolean;
  /** 错误信息 */
  error: Error | null;
  /** 加载文件 */
  load: () => Promise<void>;
  /** 保存文件 */
  save: (newContent: string) => Promise<void>;
  /** 是否文件存在 */
  exists: boolean;
}

/**
 * 单个文件操作 Hook
 */
export function useVaultFile(path: string): UseVaultFileReturn {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [exists, setExists] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fileExistsResult = await fileExists(path);
      setExists(fileExistsResult);
      if (fileExistsResult) {
        const fileContent = await readFile(path);
        setContent(fileContent);
      } else {
        setContent(null);
      }
    } catch (err) {
      setError(err as Error);
      setContent(null);
    } finally {
      setIsLoading(false);
    }
  }, [path]);

  const save = useCallback(
    async (newContent: string) => {
      setIsSaving(true);
      setError(null);
      try {
        await writeFile(path, newContent);
        setContent(newContent);
        setExists(true);
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [path]
  );

  useEffect(() => {
    load();
  }, [load]);

  return { content, isLoading, isSaving, error, load, save, exists };
}
