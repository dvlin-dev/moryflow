/**
 * [INPUT]: 菜单栏交互回调（open / quick chat / launch at login / quit）
 * [OUTPUT]: Tray 控制器（菜单栏菜单 + unread badge）
 * [POS]: macOS 菜单栏常驻入口
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
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
  'iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAACXBIWXMAAAsTAAALEwEAmpwYAAAA7klEQVR4nLWTXQ4BQRCEP66B8IA7+r0NF8AzNjbCHViXYB9XOmnSRo8l6KSSyXRNTVdPD/w5GsAQSIBMIesBUH9HoAKMgRwoIrjoJcJ1owpMXwgUASYxsdEHIoVi4PUkj9hIFbF8rayaHdA0HFnvHV7fCiXOTXKwCyyAOdABWk5lKyt0CpIb3V+YPRFDbVru0QplQTJ1hGa6tw24Byu0DpK5WutoJSLSjlhbWqGh08S9HrxFK9Ls3p2hY39xSHnJ85/D549VVZTgoZpbVHTsv/4iaELG3rNp7UglUREb4lsmVoZN5kQgaxF46slP4wq76KubLlkjugAAAABJRU5ErkJggg==';

const TRAY_ICON_PNG_2X_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAAACXBIWXMAAAsTAAALEwEAmpwYAAAB4ElEQVR4nO2YyUoDQRRFD+IOutPPUIj6E+pS3YmSEIzDRpPPMBEEB3DAqF/iuFY3ccpeXMcPaCl4gaLt7ryqTgcXXrjQdL26XFJvqA78IxtMAhXgEngAHoUP8s6s5cgYI0AZeAUCJU3sNjDcbTPLwJeDkTA/gaVuGOkHDlMYCfMMGPQ1MwbcddFMm7ei7YQB4DoDM23eA0Muhk4yNBMIL1wSOOgRFzSlnaaaAke+S3rEouwhWAVWgZI8vztqbCYZ0ja9FrAC9EVomHd5idFovSSNA62ZyU5nD0w5mJqIEqgoN6+E9s0Ce0LzbKOg1DTj5ReulDnTZ+05iog5CB3fh0K3HmVI05V3Qr9MXNycFVdT6N5EGXpWbFy14vcS4kxjbWNNofvka6jkYWjd15DmyKpW/ExCnJ3cu75H5pPUBxEx+9a6iW36JrW27POhfSaBT4Xhsi8qNbeiDOWUm1vS9DphGvhWao53Y3QUEkZH0cFM7OhAOmbgwKb0mZKUd02ZMzY3kgwNy4U86BHf5N6eiKUeGppHieMemKnzxy75gzjCfKrcZmDGdOVRPNEf0419eZrmQ9HGosddOVxN6gR2yatNoOFgpCF9pmNpp8WENNG65Fn77xjzfC5rsePgH6TAD/fQrlUs54rZAAAAAElFTkSuQmCC';

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
