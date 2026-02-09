/**
 * [PROVIDES]: useRequireLoginForSitePublish - 站点发布登录态 gate（toast + 跳转 Account 设置）
 * [DEPENDS]: useAuth, SettingsDialog(openSettings), sonner toast
 * [POS]: Sites/Publish 入口统一登录校验，避免散落在多个组件中重复实现
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useCallback } from 'react';
import { toast } from 'sonner';
import type { SettingsSection } from '@/components/settings-dialog/const';
import { useAuth } from '@/lib/server';

export function useRequireLoginForSitePublish(openSettings: (section?: SettingsSection) => void) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const openAccountSettings = useCallback(() => {
    openSettings('account');
  }, [openSettings]);

  const requireLoginForSitePublish = useCallback(() => {
    if (authLoading || !isAuthenticated) {
      toast.error('Please log in to publish sites', { id: 'site-publish-login-required' });
      openAccountSettings();
      return false;
    }
    return true;
  }, [authLoading, isAuthenticated, openAccountSettings]);

  return {
    isAuthenticated,
    authLoading,
    openAccountSettings,
    requireLoginForSitePublish,
  };
}
