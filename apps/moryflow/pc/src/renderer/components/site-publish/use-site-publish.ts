/**
 * Site Publish Hook
 * 站点发布相关的状态管理 Hook
 *
 * [UPDATE]: 2026-02-09 - 默认不在 mount 时自动拉取站点列表，避免未登录/未打开页面时的后台请求与 toast 循环
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  Site,
  BuildSiteInput,
  BuildProgressEvent,
  CreateSiteInput,
} from '../../../shared/ipc/site-publish';
import { extractIpcErrorMessage } from '@/lib/ipc-errors';

export interface UseSitePublishReturn {
  // 状态
  sites: Site[];
  loading: boolean;
  error: string | null;
  progress: BuildProgressEvent | null;

  // 操作
  refreshSites: () => Promise<void>;
  createSite: (input: CreateSiteInput) => Promise<Site>;
  deleteSite: (siteId: string) => Promise<void>;
  offlineSite: (siteId: string) => Promise<void>;
  onlineSite: (siteId: string) => Promise<void>;
  buildAndPublish: (input: BuildSiteInput) => Promise<void>;
  checkSubdomain: (subdomain: string) => Promise<{ available: boolean; message?: string }>;
}

export interface UseSitePublishOptions {
  /**
   * 是否在 mount 时自动拉取站点列表。
   * 默认 false，避免隐式网络请求（尤其是 keep-alive/预热挂载时）。
   */
  autoRefresh?: boolean;
}

export function useSitePublish(options: UseSitePublishOptions = {}): UseSitePublishReturn {
  const autoRefresh = options.autoRefresh ?? false;
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<BuildProgressEvent | null>(null);

  // 刷新站点列表
  const refreshSites = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await window.desktopAPI.sitePublish.list();
      setSites(list);
    } catch (err) {
      setError(extractIpcErrorMessage(err, 'Failed to get sites'));
    } finally {
      setLoading(false);
    }
  }, []);

  // 创建站点
  const createSite = useCallback(
    async (input: CreateSiteInput): Promise<Site> => {
      setLoading(true);
      setError(null);
      try {
        const site = await window.desktopAPI.sitePublish.create(input);
        await refreshSites();
        return site;
      } catch (err) {
        const message = extractIpcErrorMessage(err, 'Failed to create site');
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [refreshSites]
  );

  // 删除站点
  const deleteSite = useCallback(
    async (siteId: string) => {
      setLoading(true);
      setError(null);
      try {
        await window.desktopAPI.sitePublish.delete(siteId);
        await refreshSites();
      } catch (err) {
        setError(extractIpcErrorMessage(err, 'Failed to delete site'));
      } finally {
        setLoading(false);
      }
    },
    [refreshSites]
  );

  // 下线站点
  const offlineSite = useCallback(
    async (siteId: string) => {
      setLoading(true);
      setError(null);
      try {
        await window.desktopAPI.sitePublish.offline(siteId);
        await refreshSites();
      } catch (err) {
        setError(extractIpcErrorMessage(err, 'Failed to take site offline'));
      } finally {
        setLoading(false);
      }
    },
    [refreshSites]
  );

  // 上线站点
  const onlineSite = useCallback(
    async (siteId: string) => {
      setLoading(true);
      setError(null);
      try {
        await window.desktopAPI.sitePublish.online(siteId);
        await refreshSites();
      } catch (err) {
        setError(extractIpcErrorMessage(err, 'Failed to bring site online'));
      } finally {
        setLoading(false);
      }
    },
    [refreshSites]
  );

  // 构建并发布
  const buildAndPublish = useCallback(
    async (input: BuildSiteInput) => {
      setLoading(true);
      setError(null);
      setProgress(null);

      try {
        const result = await window.desktopAPI.sitePublish.buildAndPublish(input);
        if (!result.success) {
          throw new Error(result.error || 'Publish failed');
        }
        await refreshSites();
      } catch (err) {
        const message = extractIpcErrorMessage(err, 'Publish failed');
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
        setProgress(null);
      }
    },
    [refreshSites]
  );

  // 检查子域名
  const checkSubdomain = useCallback(async (subdomain: string) => {
    try {
      return await window.desktopAPI.sitePublish.checkSubdomain(subdomain);
    } catch (err) {
      const message = extractIpcErrorMessage(err, 'Check failed');
      return { available: false, message };
    }
  }, []);

  // 订阅进度事件
  useEffect(() => {
    const unsubscribe = window.desktopAPI.sitePublish.onProgress((event) => {
      setProgress(event);
    });
    return unsubscribe;
  }, []);

  // 初始化加载（可选）
  useEffect(() => {
    if (!autoRefresh) return;
    void refreshSites();
  }, [autoRefresh, refreshSites]);

  return {
    sites,
    loading,
    error,
    progress,
    refreshSites,
    createSite,
    deleteSite,
    offlineSite,
    onlineSite,
    buildAndPublish,
    checkSubdomain,
  };
}
