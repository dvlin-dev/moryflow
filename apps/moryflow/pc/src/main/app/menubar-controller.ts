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

const TRAY_ICON_PNG_1X_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAEqADAAQAAAABAAAAEgAAAACaqbJVAAABOUlEQVQ4Ea2TMW7CQBBF7QRS0FCGEpQzROIAlOQQFOnooISKIk1EmlS5BAUtnCCX4ASRaCMi+M87Y2zFi6MkX/q7s/NnRrvjcZL8E9KKOm35euJ1hYbrIO7EvViJG3lfxU/xWENiiCUnQ8MN7UvxUVyIG5HgKpA8EGcmjotBPIdEF4tazJ5bDrnJlUXRk6a4tfOt9qHYsTMbNj40wK3J6Yp5IW+sP+de2lpciQRDbHxowGOz9hR7FOTy2tfxyVzYUfjTYgHPEiZG7CjqbvSizDvLxp7GKtUVYp5GltyKFcFfV4gYn+CLhbxHX2QIPqnvsh/ED5wGbHxowGMP4RjWtjY+J0P2U5QG0p/G9d9EJpu+MJg+JzJLKP4i5PjT8yACfv3TpnmZs8Ezu6Lf9qwEi57sxG83CfIf1xOpuELz3btQ8wAAAABJRU5ErkJggg==';

const TRAY_ICON_PNG_2X_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAJKADAAQAAAABAAAAJAAAAAAqDuP8AAACJElEQVRYCe2YvUoDQRSF40+hhZ2NWPkEFiKoaG9nK2IhCPoKgiAB8SXERgxYWVha2CjYqOATKFhqaWPh3/nMTLjObn52Z0NWyIGTuTP37r3HO5PNrpVKH/+sAwMd6B1SzKw4JY51EJ8W8qbFJ/FW/EwL6GRtVEG74qv4XRDJRc4RMRMmFH0nFiUkzENuaiSQtmV05lqccdG0+Fy8EWl9HrDVC+KKyBEA9+Ki+M6kFWip/4ueZU+3Cs7oIxc5fX5qtQTq/Zn5kF2kGF+YnORGFLV8x2QmMaclr/4s6S5shdy+DjUbGGxYdYOvtgdnpluwuW3NynBQkcPnkXaA1+VccgEkPfbBwbih+bxb4wtSc7YfbG5bMyHIX9BsRMyWc25qfBQpaEHMkWjPRijIxv+xwy3742wzoeCpOG7isFmzYoy7vRkjiOyT4onI/Qxis5Yb4RnKkogbJp1YFnfchdjA++qzDJ8xHdpTnS9Xa18jBKzhy4UYQReqeOCq0ikIWMOXCzGCKFgVLzEcsKt+kmeMOUPUY3vWxAcmArbfxt+FrB+xgqj3Iq66wthRKEIQAq6iVJiLY8+QSVWMWTpBWbfs2vSBZ5lmwHfonPaaZvGN9VBQ019hd0VNI2yHZwVstwiyv/C2ZiXcsieThGfgbsHmtjUT9bjbluoRFoU9fcjnkSFE6V6DEMhLXE9eFMPu2HlPXqXTtsyKwuagl+KfDaGw/rwUHfgBKoy7m9LoVeQAAAAASUVORK5CYII=';

const createTrayIcon = () => {
  try {
    const image = nativeImage.createEmpty();
    image.addRepresentation({
      scaleFactor: 1,
      width: 18,
      height: 18,
      buffer: Buffer.from(TRAY_ICON_PNG_1X_BASE64, 'base64'),
    });
    image.addRepresentation({
      scaleFactor: 2,
      width: 18,
      height: 18,
      buffer: Buffer.from(TRAY_ICON_PNG_2X_BASE64, 'base64'),
    });
    image.setTemplateImage(true);
    if (!image.isEmpty()) {
      return image;
    }
  } catch (error) {
    console.warn('[menubar] failed to build tray icon representation', error);
  }

  const fallback = nativeImage
    .createFromDataURL(`data:image/png;base64,${TRAY_ICON_PNG_1X_BASE64}`)
    .resize({
      width: 18,
      height: 18,
    });
  fallback.setTemplateImage(true);
  return fallback;
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
