/**
 * [INPUT]: 菜单栏交互回调（open / quick chat / launch at login / quit）
 * [OUTPUT]: Tray 控制器（菜单栏菜单 + unread badge）
 * [POS]: macOS 菜单栏常驻入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Menu, Tray, nativeImage } from 'electron';

export type LaunchAtLoginState = {
  enabled: boolean;
  supported: boolean;
  source: 'system';
};

export type MenubarController = {
  setUnreadCount: (count: number) => void;
  incrementUnreadCount: () => void;
  clearUnreadCount: () => void;
  destroy: () => void;
};

export type CreateMenubarControllerOptions = {
  onOpenMainWindow: () => Promise<void> | void;
  onToggleQuickChat: () => Promise<void> | void;
  onQuit: () => void;
  getLaunchAtLoginState: () => Promise<LaunchAtLoginState>;
  setLaunchAtLogin: (enabled: boolean) => Promise<LaunchAtLoginState>;
};

const TRAY_ICON_SVG = `
<svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
  <path d="M5.4 13.5h7.2c1.656 0 3-1.344 3-3v-3c0-3.314-2.686-6-6-6s-6 2.686-6 6v3c0 1.656 1.344 3 3 3Zm0-1.5c-.828 0-1.5-.672-1.5-1.5v-3A4.5 4.5 0 0 1 8.4 3h1.2a4.5 4.5 0 0 1 4.5 4.5v3c0 .828-.672 1.5-1.5 1.5H5.4Z" fill="black"/>
  <rect x="7.5" y="14.1" width="3" height="1.5" rx=".75" fill="black"/>
</svg>
`;

const createTrayIcon = () => {
  const dataUrl = `data:image/svg+xml,${encodeURIComponent(TRAY_ICON_SVG)}`;
  const image = nativeImage.createFromDataURL(dataUrl).resize({
    width: 18,
    height: 18,
  });
  image.setTemplateImage(true);
  return image;
};

const safeUnreadCount = (count: number) => {
  if (!Number.isFinite(count)) return 0;
  return Math.max(0, Math.floor(count));
};

export const createMenubarController = (
  options: CreateMenubarControllerOptions
): MenubarController => {
  const tray = new Tray(createTrayIcon());
  let unreadCount = 0;

  const updateBadge = () => {
    tray.setTitle(unreadCount > 0 ? '•' : '');
    tray.setToolTip(unreadCount > 0 ? `Moryflow (${unreadCount} new)` : 'Moryflow');
  };

  const buildContextMenu = async () => {
    let launchAtLoginState: LaunchAtLoginState = {
      enabled: false,
      supported: false,
      source: 'system',
    };

    try {
      launchAtLoginState = await options.getLaunchAtLoginState();
    } catch (error) {
      console.warn('[menubar] failed to read launch at login state', error);
    }

    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'Open',
        click: () => {
          void options.onOpenMainWindow();
        },
      },
      {
        label: 'Quick Chat',
        click: () => {
          void options.onToggleQuickChat();
        },
      },
    ];

    if (launchAtLoginState.supported) {
      template.push({
        label: 'Launch at Login',
        type: 'checkbox',
        checked: launchAtLoginState.enabled,
        click: (menuItem) => {
          void options.setLaunchAtLogin(menuItem.checked).catch((error) => {
            console.warn('[menubar] failed to set launch at login', error);
          });
        },
      });
    }

    template.push(
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          options.onQuit();
        },
      }
    );

    return Menu.buildFromTemplate(template);
  };

  const showContextMenu = async () => {
    const menu = await buildContextMenu();
    tray.popUpContextMenu(menu);
  };

  tray.on('click', () => {
    void options.onToggleQuickChat();
  });

  tray.on('right-click', () => {
    void showContextMenu();
  });

  updateBadge();

  return {
    setUnreadCount: (count: number) => {
      unreadCount = safeUnreadCount(count);
      updateBadge();
    },
    incrementUnreadCount: () => {
      unreadCount += 1;
      updateBadge();
    },
    clearUnreadCount: () => {
      unreadCount = 0;
      updateBadge();
    },
    destroy: () => {
      tray.destroy();
    },
  };
};
