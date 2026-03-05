/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const electronMock = vi.hoisted(() => {
  class MockTray {
    handlers = new Map<string, () => void>();
    setTitle = vi.fn();
    setToolTip = vi.fn();
    popUpContextMenu = vi.fn();
    destroy = vi.fn();

    on = (event: string, handler: () => void) => {
      this.handlers.set(event, handler);
    };

    emit = (event: string) => {
      this.handlers.get(event)?.();
    };
  }

  const trayInstances: MockTray[] = [];
  const buildFromTemplate = vi.fn((template) => ({ template }));
  const resizedImage = {
    setTemplateImage: vi.fn(),
  };
  class Tray extends MockTray {
    constructor(_icon: unknown) {
      super();
      trayInstances.push(this);
    }
  }

  return {
    trayInstances,
    buildFromTemplate,
    resizedImage,
    Tray,
  };
});

vi.mock('electron', () => ({
  Tray: electronMock.Tray,
  Menu: {
    buildFromTemplate: electronMock.buildFromTemplate,
  },
  nativeImage: {
    createFromDataURL: vi.fn(() => ({
      resize: vi.fn(() => electronMock.resizedImage),
    })),
  },
}));

import { createMenubarController } from './menubar-controller';

describe('menubar-controller', () => {
  beforeEach(() => {
    electronMock.trayInstances.length = 0;
    electronMock.buildFromTemplate.mockClear();
    electronMock.resizedImage.setTemplateImage.mockClear();
  });

  it('should toggle quick chat when tray icon is left-clicked', () => {
    const onToggleQuickChat = vi.fn();
    createMenubarController({
      onOpenMainWindow: vi.fn(),
      onToggleQuickChat,
      onQuit: vi.fn(),
      getLaunchAtLoginState: vi.fn(async () => ({
        enabled: false,
        supported: true,
        source: 'system',
      })),
      setLaunchAtLogin: vi.fn(async () => ({
        enabled: false,
        supported: true,
        source: 'system',
      })),
    });

    const tray = electronMock.trayInstances[0];
    tray.emit('click');

    expect(onToggleQuickChat).toHaveBeenCalledTimes(1);
  });

  it('should render right-click menu with simplified labels', async () => {
    createMenubarController({
      onOpenMainWindow: vi.fn(),
      onToggleQuickChat: vi.fn(),
      onQuit: vi.fn(),
      getLaunchAtLoginState: vi.fn(async () => ({
        enabled: true,
        supported: true,
        source: 'system',
      })),
      setLaunchAtLogin: vi.fn(async () => ({
        enabled: true,
        supported: true,
        source: 'system',
      })),
    });

    const tray = electronMock.trayInstances[0];
    tray.emit('right-click');
    await Promise.resolve();

    expect(electronMock.buildFromTemplate).toHaveBeenCalledTimes(1);
    const template = electronMock.buildFromTemplate.mock.calls[0]?.[0] as Array<{
      label?: string;
      type?: string;
    }>;
    const labels = template.filter((item) => item.type !== 'separator').map((item) => item.label);

    expect(labels).toEqual(['Open', 'Quick Chat', 'Launch at Login', 'Quit']);
  });

  it('should update badge dot by unread count', () => {
    const controller = createMenubarController({
      onOpenMainWindow: vi.fn(),
      onToggleQuickChat: vi.fn(),
      onQuit: vi.fn(),
      getLaunchAtLoginState: vi.fn(async () => ({
        enabled: false,
        supported: false,
        source: 'system',
      })),
      setLaunchAtLogin: vi.fn(async () => ({
        enabled: false,
        supported: false,
        source: 'system',
      })),
    });

    const tray = electronMock.trayInstances[0];
    controller.setUnreadCount(2);
    expect(tray.setTitle).toHaveBeenLastCalledWith('•');

    controller.clearUnreadCount();
    expect(tray.setTitle).toHaveBeenLastCalledWith('');
  });
});
