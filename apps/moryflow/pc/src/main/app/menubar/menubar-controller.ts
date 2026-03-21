/**
 * [INPUT]: 菜单栏交互回调（open / quick chat / launch at login / quit）
 * [OUTPUT]: Tray 控制器（菜单栏菜单 + unread badge）
 * [POS]: macOS 菜单栏常驻入口
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { Menu, Tray, nativeImage } from 'electron';
import type { LaunchAtLoginState } from '../runtime/launch-at-login.js';

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
  'iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAACXBIWXMAAAsTAAALEwEAmpwYAAAA4klEQVR42rWTUQ6CMAyGwWuAkQfxjhP0NngB4VkkEiN3ALyE8ohd0iVN04Im2ORLlrb713ab5/3Z1kAKVECP2HUChN8I+MARGIBR4Y2H+JrICjhNCHAyTezwg4gjkWYyKG3UiBYP5qp5ABuSY9eNkLenQpVwkt24AwogB2IgEiorqdCTBW/oL4gvR1/Ncjsq1LNgLQid0XdnuS0VurLggK3FWIkV2SqtXahQKgyxwY3OImXYhgqFOOBRqGzq+l/8+rWq5jDaP8uW+CJOLFHapO2YKRFqAb7YEt9Jh2sjzWRR+wC76KubxvAICAAAAABJRU5ErkJggg==';

const TRAY_ICON_PNG_2X_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAAACXBIWXMAAAsTAAALEwEAmpwYAAAB00lEQVR42u2Y30sCQRDHj1ADe6s/Q0Htn8gerTdJFNF+vHT6Z6SB0BWk0VV/SVk+Vy9a5nv4XH+AzcIcLMu6zO7dHj048IHjdnb46s7Ozp7jrMyO5YE2cA+MgFdkhO/YWM62iA2gBXwACyLM1wXSUYs5AOYaQkS+gXIUQhLAZQghIjdAylTMFvAcoZiAIcbWsiTwaEFMwAuwriOob1FMwJ1OAi9iYo+ytecxCppieiy1lkHADtAAmvg81YxxohJELXo/QAVYk8Rg76roQ4k1UR0HVDF5Qi4WNERlZQHaxMkVYV4R6CFFYaxGjOnKBD0Qc4ZfpiuJjycs3xchri8TRKnKZ8I/s8xvl/PrEuI+yQS9EyY2OP+ewq/P+R0S4r6ZCmoaCDoyFURZsg7nv6Pw45P73HTJTJLak/hcCEk9M01q6ravCvNYAg8QcdvXiTFPZYJyGoWxQCiM28AvMWYmiqOjpjg66hpiJqpf5WoejDOsM03c3l1izvAcqwSlsSGPq/34xL5daeUYBZWoXeN1DGL8/9bkp0yuQUMLYlhV3gxzUfQiFDMIc1Hkbd+gVxZ3U8mJ2JLYkI81hIyxziQcy5bFIupjngWfY9jzLY5lVl+tbNgf99CuVReBl8cAAAAASUVORK5CYII=';

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
