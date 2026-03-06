/**
 * [INPUT]: IPC 请求
 * [OUTPUT]: 站点发布相关操作结果
 * [POS]: IPC 处理器，注册所有站点发布相关的 IPC 通道
 */

import { ipcMain, BrowserWindow } from 'electron';
import { access } from 'fs/promises';
import { apiRequest } from './api.js';
import { buildSite, detectChanges } from './builder/index.js';
import type {
  Site,
  BuildSiteInput,
  BuildProgressEvent,
  BuildSiteResult,
  CreateSiteInput,
  UpdateSiteInput,
  SubdomainCheckResult,
  SubdomainSuggestResult,
  PublishResult,
} from '../../shared/ipc/site-publish.js';

type ProgressCallback = (progress: BuildProgressEvent) => void;

/** 过滤存在的文件路径 */
async function filterExistingPaths(paths: string[]): Promise<string[]> {
  const existing: string[] = [];
  for (const p of paths) {
    try {
      await access(p);
      existing.push(p);
    } catch {
      // 文件不存在，跳过
    }
  }
  return existing;
}

/** 构建站点并发布到服务器 */
async function buildAndPublishSite(
  siteId: string,
  sourcePaths: string[],
  siteTitle: string | undefined,
  description: string | undefined,
  onProgress: ProgressCallback
): Promise<Site> {
  // 构建站点
  onProgress({ phase: 'rendering', current: 0, total: sourcePaths.length, message: 'Building...' });
  const buildResult = await buildSite(sourcePaths, { siteTitle, description, onProgress });

  // 发布站点
  onProgress({ phase: 'uploading', current: 0, total: 1, message: 'Uploading...' });
  await apiRequest<PublishResult>(`/api/v1/sites/${siteId}/publish`, {
    method: 'POST',
    body: JSON.stringify({
      files: buildResult.files,
      pages: JSON.stringify(buildResult.pages),
      navigation: JSON.stringify(buildResult.navigation),
    }),
  });

  // 返回更新后的站点信息
  return apiRequest<Site>(`/api/v1/sites/${siteId}`);
}

/**
 * 注册站点发布相关的 IPC 处理器
 */
export function registerSitePublishHandlers() {
  // 获取站点列表
  ipcMain.handle('site-publish:list', async () => {
    const result = await apiRequest<{ sites: Site[]; total: number }>('/api/v1/sites');
    return result.sites;
  });

  // 创建站点
  ipcMain.handle('site-publish:create', async (_event, input: CreateSiteInput) => {
    return apiRequest<Site>('/api/v1/sites', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  });

  // 获取站点详情
  ipcMain.handle('site-publish:get', async (_event, { siteId }: { siteId: string }) => {
    return apiRequest<Site>(`/api/v1/sites/${siteId}`);
  });

  // 更新站点
  ipcMain.handle('site-publish:update', async (_event, input: UpdateSiteInput) => {
    const { siteId, ...data } = input;
    return apiRequest<Site>(`/api/v1/sites/${siteId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  });

  // 删除站点
  ipcMain.handle('site-publish:delete', async (_event, { siteId }: { siteId: string }) => {
    await apiRequest(`/api/v1/sites/${siteId}`, { method: 'DELETE' });
    return { ok: true };
  });

  // 下线站点
  ipcMain.handle('site-publish:offline', async (_event, { siteId }: { siteId: string }) => {
    await apiRequest(`/api/v1/sites/${siteId}/offline`, { method: 'POST' });
    return { ok: true };
  });

  // 上线站点
  ipcMain.handle('site-publish:online', async (_event, { siteId }: { siteId: string }) => {
    await apiRequest(`/api/v1/sites/${siteId}/online`, { method: 'POST' });
    return { ok: true };
  });

  // 获取站点页面列表
  ipcMain.handle('site-publish:getPages', async (_event, { siteId }: { siteId: string }) => {
    return apiRequest<{ path: string; localFilePath: string | null }[]>(
      `/api/v1/sites/${siteId}/pages`
    );
  });

  // 检查子域名可用性
  ipcMain.handle(
    'site-publish:checkSubdomain',
    async (_event, { subdomain }: { subdomain: string }) => {
      return apiRequest<SubdomainCheckResult>(
        `/api/v1/sites/subdomain/check?subdomain=${encodeURIComponent(subdomain)}`
      );
    }
  );

  // 推荐子域名
  ipcMain.handle('site-publish:suggestSubdomain', async (_event, { base }: { base: string }) => {
    return apiRequest<SubdomainSuggestResult>(
      `/api/v1/sites/subdomain/suggest?base=${encodeURIComponent(base)}`
    );
  });

  // 构建并发布站点
  ipcMain.handle(
    'site-publish:buildAndPublish',
    async (event, input: BuildSiteInput): Promise<BuildSiteResult> => {
      const window = BrowserWindow.fromWebContents(event.sender);
      const onProgress = (progress: BuildProgressEvent) => {
        window?.webContents.send('site-publish:progress', progress);
      };

      try {
        onProgress({ phase: 'scanning', current: 0, total: 0, message: 'Preparing...' });

        // 获取或创建站点
        let siteId: string;
        if (input.siteId) {
          siteId = input.siteId;
        } else if (input.subdomain) {
          const site = await apiRequest<Site>('/api/v1/sites', {
            method: 'POST',
            body: JSON.stringify({
              subdomain: input.subdomain,
              type: input.type,
              title: input.title,
              description: input.description,
            }),
          });
          siteId = site.id;
        } else {
          throw new Error('Missing site ID or subdomain');
        }

        // 构建并发布
        const site = await buildAndPublishSite(
          siteId,
          input.sourcePaths,
          input.title,
          input.description,
          onProgress
        );
        onProgress({ phase: 'done', current: 1, total: 1, message: 'Published!' });

        return { success: true, site };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Publish failed';
        onProgress({
          phase: 'error',
          current: 0,
          total: 0,
          message: errorMessage,
          error: errorMessage,
        });
        return { success: false, error: errorMessage };
      }
    }
  );

  // 检测文件变更
  ipcMain.handle(
    'site-publish:detectChanges',
    async (
      _event,
      { sourcePaths, lastHashes }: { sourcePaths: string[]; lastHashes: Record<string, string> }
    ) => {
      return detectChanges(sourcePaths, lastHashes);
    }
  );

  // 更新站点内容
  ipcMain.handle(
    'site-publish:updateContent',
    async (event, { siteId }: { siteId: string }): Promise<BuildSiteResult> => {
      const window = BrowserWindow.fromWebContents(event.sender);
      const onProgress = (progress: BuildProgressEvent) => {
        window?.webContents.send('site-publish:progress', progress);
      };

      try {
        onProgress({ phase: 'scanning', current: 0, total: 0, message: 'Loading site info...' });

        // 获取站点信息和关联的本地文件路径
        const [site, pages] = await Promise.all([
          apiRequest<Site>(`/api/v1/sites/${siteId}`),
          apiRequest<{ path: string; localFilePath: string | null }[]>(
            `/api/v1/sites/${siteId}/pages`
          ),
        ]);

        const sourcePaths = pages
          .map((p) => p.localFilePath)
          .filter((p): p is string => p !== null);
        if (sourcePaths.length === 0) {
          throw new Error('No source files found. Files may have been moved or deleted.');
        }

        // 过滤存在的文件
        const existingPaths = await filterExistingPaths(sourcePaths);
        if (existingPaths.length === 0) {
          throw new Error('No source files found. Files may have been moved or deleted.');
        }

        // 构建并发布
        const updatedSite = await buildAndPublishSite(
          siteId,
          existingPaths,
          site.title || undefined,
          site.description || undefined,
          onProgress
        );
        onProgress({ phase: 'done', current: 1, total: 1, message: 'Updated!' });

        return { success: true, site: updatedSite };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Update failed';
        onProgress({
          phase: 'error',
          current: 0,
          total: 0,
          message: errorMessage,
          error: errorMessage,
        });
        return { success: false, error: errorMessage };
      }
    }
  );
}
