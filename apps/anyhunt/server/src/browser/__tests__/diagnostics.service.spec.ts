/**
 * BrowserDiagnosticsService 单元测试
 */

import { describe, it, expect, vi } from 'vitest';
import type { BrowserContext, Page } from 'playwright';
import { BrowserDiagnosticsService } from '../diagnostics/diagnostics.service';

const createMockPage = () => {
  const handlers: Record<string, Array<(payload: any) => void>> = {};
  const page = {
    on: (event: string, handler: (payload: any) => void) => {
      handlers[event] = handlers[event] ?? [];
      handlers[event].push(handler);
    },
    emit: (event: string, payload: any) => {
      for (const handler of handlers[event] ?? []) {
        handler(payload);
      }
    },
  } as unknown as Page;
  return { page, handlers };
};

const createMockContext = () =>
  ({
    tracing: {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
    },
  }) as unknown as BrowserContext;

describe('BrowserDiagnosticsService', () => {
  it('captures console messages and page errors', () => {
    const service = new BrowserDiagnosticsService();
    const { page } = createMockPage();

    service.registerPage('session-1', page);

    (page as any).emit('console', {
      type: () => 'log',
      text: () => 'hello',
    });
    (page as any).emit('pageerror', new Error('boom'));

    const consoleMessages = service.getConsoleMessages('session-1');
    const errors = service.getPageErrors('session-1');

    expect(consoleMessages).toHaveLength(1);
    expect(consoleMessages[0].text).toBe('hello');
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('boom');
  });

  it('supports log limit and clear', () => {
    const service = new BrowserDiagnosticsService();
    const { page } = createMockPage();

    service.registerPage('session-2', page);

    (page as any).emit('console', { type: () => 'log', text: () => 'a' });
    (page as any).emit('console', { type: () => 'log', text: () => 'b' });

    expect(service.getConsoleMessages('session-2', 1)).toHaveLength(1);

    service.clearConsoleMessages('session-2');
    expect(service.getConsoleMessages('session-2')).toHaveLength(0);
  });

  it('starts and stops tracing', async () => {
    const service = new BrowserDiagnosticsService();
    const context = createMockContext();

    await service.startTracing('session-3', context, { screenshots: false });
    expect(context.tracing.start).toHaveBeenCalledWith({
      screenshots: false,
      snapshots: true,
    });

    const result = await service.stopTracing('session-3', context, false);
    expect(context.tracing.stop).toHaveBeenCalled();
    expect(result.data).toBeUndefined();
  });
});
