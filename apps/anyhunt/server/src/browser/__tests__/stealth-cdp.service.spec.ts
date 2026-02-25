import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StealthCdpService } from '../stealth/stealth-cdp.service';

// CDP session mock
function createMockCdpSession() {
  return {
    send: vi.fn(),
    detach: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockBrowser(
  cdpSession: ReturnType<typeof createMockCdpSession>,
) {
  return {
    newBrowserCDPSession: vi.fn().mockResolvedValue(cdpSession),
  };
}

function createMockPage(cdpSession: ReturnType<typeof createMockCdpSession>) {
  return {
    context: () => ({
      newCDPSession: vi.fn().mockResolvedValue(cdpSession),
    }),
    once: vi.fn(),
  };
}

describe('StealthCdpService', () => {
  let service: StealthCdpService;

  beforeEach(() => {
    service = new StealthCdpService();
  });

  describe('applyBrowserLevelStealth', () => {
    it('替换 HeadlessChrome 为 Chrome 并覆写所有 targets', async () => {
      const cdp = createMockCdpSession();
      const browser = createMockBrowser(cdp);

      cdp.send.mockImplementation(async (method: string) => {
        if (method === 'Browser.getVersion') {
          return { userAgent: 'Mozilla/5.0 HeadlessChrome/120.0.0.0' };
        }
        if (method === 'Target.getTargets') {
          return { targetInfos: [{ targetId: 'target-1' }] };
        }
        if (method === 'Target.attachToTarget') {
          return { sessionId: 'session-1' };
        }
        return {};
      });

      await service.applyBrowserLevelStealth(browser as any);

      const sendMessageCall = cdp.send.mock.calls.find(
        ([method]: [string]) => method === 'Target.sendMessageToTarget',
      );
      expect(sendMessageCall).toBeDefined();
      const payload = JSON.parse(sendMessageCall![1].message);
      expect(payload.method).toBe('Emulation.setUserAgentOverride');
      expect(payload.params.userAgent).toContain('Chrome/120');
      expect(payload.params.userAgent).not.toContain('HeadlessChrome');
      expect(payload.params.userAgentMetadata).toBeDefined();
      expect(payload.params.userAgentMetadata.brands).toHaveLength(3);

      // 验证 browser CDP session 被 detach
      expect(cdp.detach).toHaveBeenCalled();
    });

    it('非 headless UA 时跳过覆写', async () => {
      const cdp = createMockCdpSession();
      const browser = createMockBrowser(cdp);

      cdp.send.mockImplementation(async (method: string) => {
        if (method === 'Browser.getVersion') {
          return { userAgent: 'Mozilla/5.0 Chrome/120.0.0.0' };
        }
        return {};
      });

      await service.applyBrowserLevelStealth(browser as any);

      const sendMessageCall = cdp.send.mock.calls.find(
        ([method]: [string]) => method === 'Target.sendMessageToTarget',
      );
      expect(sendMessageCall).toBeUndefined();
    });

    it('newBrowserCDPSession 不可用时静默跳过', async () => {
      const browser = {
        newBrowserCDPSession: vi
          .fn()
          .mockRejectedValue(new Error('not available')),
      };

      await expect(
        service.applyBrowserLevelStealth(browser as any),
      ).resolves.toBeUndefined();
    });

    it('使用显式 userAgent 覆写', async () => {
      const cdp = createMockCdpSession();
      const browser = createMockBrowser(cdp);

      cdp.send.mockImplementation(async (method: string) => {
        if (method === 'Browser.getVersion') {
          return { userAgent: 'Mozilla/5.0 Chrome/120.0.0.0' };
        }
        if (method === 'Target.getTargets') {
          return { targetInfos: [{ targetId: 'target-1' }] };
        }
        if (method === 'Target.attachToTarget') {
          return { sessionId: 'session-1' };
        }
        return {};
      });

      await service.applyBrowserLevelStealth(browser as any, {
        userAgent: 'CustomUA/1.0',
      });

      const sendMessageCall = cdp.send.mock.calls.find(
        ([method]: [string]) => method === 'Target.sendMessageToTarget',
      );
      expect(sendMessageCall).toBeDefined();
      const payload = JSON.parse(sendMessageCall![1].message);
      expect(payload.params.userAgent).toBe('CustomUA/1.0');
    });
  });

  describe('applyPageLevelStealth', () => {
    it('覆写 Page 级别 UA + 背景色', async () => {
      const cdp = createMockCdpSession();
      const page = createMockPage(cdp);

      cdp.send.mockImplementation(async (method: string) => {
        if (method === 'Browser.getVersion') {
          return { userAgent: 'Mozilla/5.0 HeadlessChrome/120.0.0.0' };
        }
        return {};
      });

      await service.applyPageLevelStealth(page as any);

      const emulationCall = cdp.send.mock.calls.find(
        ([method]: [string]) => method === 'Emulation.setUserAgentOverride',
      );
      expect(emulationCall).toBeDefined();
      expect(emulationCall![1].userAgent).not.toContain('HeadlessChrome');
      expect(emulationCall![1].acceptLanguage).toBeUndefined();

      const bgCall = cdp.send.mock.calls.find(
        ([method]: [string]) =>
          method === 'Emulation.setDefaultBackgroundColorOverride',
      );
      expect(bgCall).toBeDefined();
      expect(bgCall![1].color).toEqual({ r: 255, g: 255, b: 255, a: 1 });

      // Page 级别 CDP 不 detach
      expect(cdp.detach).not.toHaveBeenCalled();
    });

    it('传入 acceptLanguage 时保留值并去重 q-factor', async () => {
      const cdp = createMockCdpSession();
      const page = createMockPage(cdp);

      cdp.send.mockImplementation(async (method: string) => {
        if (method === 'Browser.getVersion') {
          return { userAgent: 'Mozilla/5.0 HeadlessChrome/120.0.0.0' };
        }
        return {};
      });

      await service.applyPageLevelStealth(page as any, {
        acceptLanguage: 'en-US,en;q=0.9;q=0.9',
      });

      const emulationCall = cdp.send.mock.calls.find(
        ([method]: [string]) => method === 'Emulation.setUserAgentOverride',
      );
      expect(emulationCall).toBeDefined();
      expect(emulationCall![1].acceptLanguage).toBe('en-US,en;q=0.9');
    });

    it('CDP 不可用时静默跳过', async () => {
      const page = {
        context: () => ({
          newCDPSession: vi.fn().mockRejectedValue(new Error('not available')),
        }),
      };

      await expect(
        service.applyPageLevelStealth(page as any),
      ).resolves.toBeUndefined();
    });
  });
});
