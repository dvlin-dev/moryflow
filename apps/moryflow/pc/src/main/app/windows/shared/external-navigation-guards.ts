/**
 * [PROVIDES]: 共享的 BrowserWindow 外链与导航拦截绑定
 * [DEPENDS]: electron webContents, external link policy
 * [POS]: 主进程窗口安全边界复用层
 */

import type { WebContents } from 'electron';
import {
  type ExternalLinkPolicy,
  isAllowedNavigationUrl,
  openExternalSafe,
} from '../../security/external-links.js';

export const bindExternalNavigationGuards = (
  webContents: WebContents,
  externalLinkPolicy: ExternalLinkPolicy
): void => {
  webContents.setWindowOpenHandler(({ url }) => {
    void openExternalSafe(url, externalLinkPolicy);
    return { action: 'deny' };
  });

  const handleNavigation = (event: Electron.Event, url: string) => {
    if (!isAllowedNavigationUrl(url, externalLinkPolicy)) {
      event.preventDefault();
      void openExternalSafe(url, externalLinkPolicy);
    }
  };

  webContents.on('will-navigate', handleNavigation);
  webContents.on('will-redirect', handleNavigation);
};
