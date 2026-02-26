/**
 * [PROVIDES]: useSidebarPublishController - Sidebar 发布入口状态与登录门禁
 * [DEPENDS]: useRequireLoginForSitePublish
 * [POS]: Sidebar 发布能力编排层（避免 index.tsx 混合过多本地状态）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useCallback, useEffect, useState } from 'react';
import type { VaultTreeNode } from '@shared/ipc';
import type { SettingsSection } from '@/components/settings-dialog/const';
import { useRequireLoginForSitePublish } from '../../../../hooks/use-require-login-for-site-publish';

type UseSidebarPublishControllerOptions = {
  openSettings: (section?: SettingsSection) => void;
};

type SidebarPublishController = {
  publishDialogOpen: boolean;
  publishSourcePaths: string[];
  publishTitle: string | undefined;
  handlePublish: (node: VaultTreeNode) => void;
  handlePublishDialogOpenChange: (open: boolean) => void;
};

export const useSidebarPublishController = ({
  openSettings,
}: UseSidebarPublishControllerOptions): SidebarPublishController => {
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishSourcePaths, setPublishSourcePaths] = useState<string[]>([]);
  const [publishTitle, setPublishTitle] = useState<string | undefined>();
  const { authLoading, isAuthenticated, requireLoginForSitePublish } =
    useRequireLoginForSitePublish(openSettings);

  const handlePublish = useCallback(
    (node: VaultTreeNode) => {
      if (!requireLoginForSitePublish()) return;
      setPublishSourcePaths([node.path]);
      setPublishTitle(node.name.replace(/\.md$/, ''));
      setPublishDialogOpen(true);
    },
    [requireLoginForSitePublish]
  );

  const handlePublishDialogOpenChange = useCallback((open: boolean) => {
    setPublishDialogOpen(open);
    if (open) return;
    setPublishSourcePaths([]);
    setPublishTitle(undefined);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated) return;
    if (!publishDialogOpen) return;

    setPublishDialogOpen(false);
    setPublishSourcePaths([]);
    setPublishTitle(undefined);
  }, [authLoading, isAuthenticated, publishDialogOpen]);

  return {
    publishDialogOpen,
    publishSourcePaths,
    publishTitle,
    handlePublish,
    handlePublishDialogOpenChange,
  };
};

