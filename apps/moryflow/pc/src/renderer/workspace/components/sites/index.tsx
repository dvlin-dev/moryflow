/**
 * [PROPS]: -
 * [EMITS]: -
 * [POS]: Sites CMS 主页面（就地读取 workspace contexts），整合列表和详情视图
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 * [UPDATE]: 2026-02-09 - 未登录时不请求站点列表/不弹循环 toast，改为显示登录提示空态并引导到 Account 设置页
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';
import { Button } from '@moryflow/ui/components/button';
import type { Site } from '../../../../shared/ipc/site-publish';
import { PublishDialog } from '@/components/site-publish';
import { SiteList } from './site-list';
import { SiteDetail } from './site-detail';
import { FilePickerDialog } from './file-picker-dialog';
import type { SitesView, SiteAction, SiteSettings } from './const';
import { extractErrorMessage } from './const';
import { useRequireLoginForSitePublish } from '../../hooks/use-require-login-for-site-publish';
import {
  useWorkspaceNav,
  useWorkspaceShell,
  useWorkspaceTree,
  useWorkspaceVault,
} from '../../context';

export function SitesPage() {
  const { destination } = useWorkspaceNav();
  const { openSettings } = useWorkspaceShell();
  const { isAuthenticated, authLoading, openAccountSettings, requireLoginForSitePublish } =
    useRequireLoginForSitePublish(openSettings);
  const { vault } = useWorkspaceVault();
  const { tree: currentTree } = useWorkspaceTree();
  const currentVaultPath = vault?.path ?? '';
  const [view, setView] = useState<SitesView>('list');
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);

  // 文件选择和发布对话框状态
  const [filePickerOpen, setFilePickerOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishSourcePaths, setPublishSourcePaths] = useState<string[]>([]);

  // 加载站点列表
  const loadSites = useCallback(async () => {
    setLoading(true);
    try {
      const list = await window.desktopAPI.sitePublish.list();
      setSites(list);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to load sites'));
    } finally {
      setLoading(false);
    }
  }, []);

  // 同步选中的站点（当站点列表更新时）
  useEffect(() => {
    if (!selectedSite) return;
    const updated = sites.find((s) => s.id === selectedSite.id);
    if (!updated) {
      // 站点被删除，返回列表
      setSelectedSite(null);
      setView('list');
    } else if (updated !== selectedSite) {
      // 站点被更新
      setSelectedSite(updated);
    }
  }, [sites, selectedSite]);

  // 初始化加载（仅在已登录且处于 destination=sites 时请求）
  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      setSites((prev) => (prev.length === 0 ? prev : []));
      setSelectedSite((prev) => (prev ? null : prev));
      setView((prev) => (prev === 'list' ? prev : 'list'));
      setFilePickerOpen(false);
      setPublishDialogOpen(false);
      setPublishSourcePaths((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    if (destination !== 'sites') return;
    void loadSites();
  }, [authLoading, isAuthenticated, destination, loadSites]);

  // 点击站点卡片
  const handleSiteClick = useCallback((site: Site) => {
    setSelectedSite(site);
    setView('detail');
  }, []);

  // 站点操作 - 统一处理所有操作
  const handleSiteAction = useCallback(
    async (siteId: string, action: SiteAction) => {
      const site = sites.find((s) => s.id === siteId);
      if (!site) return;

      switch (action) {
        case 'open':
          window.open(site.url, '_blank');
          break;

        case 'copy':
          navigator.clipboard.writeText(site.url);
          toast.success('Link copied');
          break;

        case 'settings':
          setSelectedSite(site);
          setView('detail');
          break;

        case 'publish':
          try {
            await window.desktopAPI.sitePublish.online(siteId);
            toast.success('Site is now online');
            await loadSites();
          } catch (err) {
            toast.error(extractErrorMessage(err, 'Failed to publish'));
          }
          break;

        case 'update':
          try {
            toast.loading('Updating...', { id: 'update' });
            const result = await window.desktopAPI.sitePublish.updateContent(siteId);
            if (result.success) {
              toast.success('Site updated', { id: 'update' });
              await loadSites();
            } else {
              toast.error(result.error || 'Failed to update', { id: 'update' });
            }
          } catch (err) {
            toast.error(extractErrorMessage(err, 'Failed to update'), { id: 'update' });
          }
          break;

        case 'unpublish':
          try {
            await window.desktopAPI.sitePublish.offline(siteId);
            toast.success('Site unpublished');
            await loadSites();
          } catch (err) {
            toast.error(extractErrorMessage(err, 'Failed to unpublish'));
          }
          break;

        case 'delete':
          try {
            await window.desktopAPI.sitePublish.delete(siteId);
            toast.success('Site deleted');
            // 如果删除的是当前选中的站点，返回列表
            if (selectedSite?.id === siteId) {
              setSelectedSite(null);
              setView('list');
            }
            await loadSites();
          } catch (err) {
            toast.error(extractErrorMessage(err, 'Failed to delete'));
          }
          break;
      }
    },
    [sites, loadSites, selectedSite]
  );

  // 发布按钮点击 - 打开文件选择器
  const handlePublishClick = useCallback(() => {
    if (!requireLoginForSitePublish()) return;
    setFilePickerOpen(true);
  }, [requireLoginForSitePublish]);

  // 文件选择完成 - 打开发布对话框
  const handleFilesSelected = useCallback((paths: string[]) => {
    setPublishSourcePaths(paths);
    setPublishDialogOpen(true);
  }, []);

  // 发布对话框关闭 - 刷新站点列表
  const handlePublishDialogClose = useCallback(
    (open: boolean) => {
      setPublishDialogOpen(open);
      if (!open) {
        // 刷新站点列表（仅在已登录且处于 destination=sites 时）
        if (isAuthenticated && destination === 'sites') {
          void loadSites();
        }
      }
    },
    [isAuthenticated, destination, loadSites]
  );

  // 返回列表
  const handleBackToList = useCallback(() => {
    setSelectedSite(null);
    setView('list');
  }, []);

  // 详情页操作代理 - 复用 handleSiteAction
  const handlePublish = useCallback(() => {
    if (selectedSite) handleSiteAction(selectedSite.id, 'publish');
  }, [selectedSite, handleSiteAction]);

  const handleUpdate = useCallback(() => {
    if (selectedSite) handleSiteAction(selectedSite.id, 'update');
  }, [selectedSite, handleSiteAction]);

  const handleUnpublish = useCallback(() => {
    if (selectedSite) handleSiteAction(selectedSite.id, 'unpublish');
  }, [selectedSite, handleSiteAction]);

  const handleDelete = useCallback(() => {
    if (selectedSite) handleSiteAction(selectedSite.id, 'delete');
  }, [selectedSite, handleSiteAction]);

  // 更新设置
  const handleSettingsChange = useCallback(
    async (settings: Partial<SiteSettings>) => {
      if (!selectedSite) return;
      try {
        await window.desktopAPI.sitePublish.update({
          siteId: selectedSite.id,
          ...settings,
        });
        await loadSites();
      } catch (err) {
        throw new Error(extractErrorMessage(err, 'Failed to update settings'));
      }
    },
    [selectedSite, loadSites]
  );

  const mainView =
    view === 'detail' && selectedSite ? (
      <SiteDetail
        site={selectedSite}
        onBack={handleBackToList}
        onPublish={handlePublish}
        onUpdate={handleUpdate}
        onUnpublish={handleUnpublish}
        onSettingsChange={handleSettingsChange}
        onDelete={handleDelete}
      />
    ) : (
      <SiteList
        sites={sites}
        loading={loading}
        onSiteClick={handleSiteClick}
        onSiteAction={handleSiteAction}
        onPublishClick={handlePublishClick}
      />
    );

  if (authLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-medium">Log in required</h3>
          <p className="text-sm text-muted-foreground">
            Please log in to publish and manage sites.
          </p>
        </div>
        <Button onClick={openAccountSettings}>Log in</Button>
      </div>
    );
  }

  return (
    <>
      {mainView}
      {filePickerOpen ? (
        <FilePickerDialog
          open={filePickerOpen}
          onOpenChange={setFilePickerOpen}
          onSelect={handleFilesSelected}
          currentVaultPath={currentVaultPath}
          currentTree={currentTree}
        />
      ) : null}
      {publishDialogOpen ? (
        <PublishDialog
          open={publishDialogOpen}
          onOpenChange={handlePublishDialogClose}
          sourcePaths={publishSourcePaths}
        />
      ) : null}
    </>
  );
}

export { SiteList } from './site-list';
export { SiteCard } from './site-card';
export { SiteDetail } from './site-detail';
export { SiteEmptyState } from './site-empty-state';
export * from './const';
