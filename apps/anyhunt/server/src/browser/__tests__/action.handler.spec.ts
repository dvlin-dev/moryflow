import { describe, it, expect, vi, afterEach } from 'vitest';
import type { SessionManager } from '../session';
import type { ActionPacingService } from '../runtime';

const loadHandler = async () => {
  const module = await import('../handlers/action.handler');
  return module.ActionHandler;
};

const createHumanBehaviorMock = () => ({
  humanMouseMove: vi.fn().mockResolvedValue(undefined),
  computeTypingDelay: vi.fn().mockReturnValue(50),
  computeNavigationDelay: vi.fn().mockReturnValue(500),
  computeMousePath: vi.fn().mockReturnValue([]),
});

const createHandler = async () => {
  const ActionHandler = await loadHandler();
  return new ActionHandler(
    {} as SessionManager,
    {
      beforeAction: vi.fn().mockResolvedValue({ applied: false, delayMs: 0 }),
    } as unknown as ActionPacingService,
    {
      recordActionPacing: vi.fn(),
    } as any,
    createHumanBehaviorMock() as any,
  );
};

const createHandlerWithMocks = async () => {
  const ActionHandler = await loadHandler();
  const page = {
    goBack: vi.fn().mockResolvedValue(undefined),
    url: vi.fn().mockReturnValue('https://example.com/path'),
  };
  const sessionManager = {
    getActivePage: vi.fn().mockReturnValue(page),
    getActiveContext: vi.fn().mockReturnValue({}),
  };
  const actionPacing = {
    beforeAction: vi.fn().mockResolvedValue({ applied: false, delayMs: 0 }),
  };
  const riskTelemetry = {
    recordActionPacing: vi.fn(),
  };
  const humanBehavior = createHumanBehaviorMock();
  const handler = new ActionHandler(
    sessionManager as unknown as SessionManager,
    actionPacing as unknown as ActionPacingService,
    riskTelemetry as any,
    humanBehavior as any,
  );
  return { handler, page, actionPacing, riskTelemetry, humanBehavior };
};

describe('ActionHandler', () => {
  const originalUploadMax = process.env.BROWSER_UPLOAD_MAX_MB;

  afterEach(() => {
    if (originalUploadMax === undefined) {
      delete process.env.BROWSER_UPLOAD_MAX_MB;
    } else {
      process.env.BROWSER_UPLOAD_MAX_MB = originalUploadMax;
    }
    vi.resetModules();
  });

  it('sanitizes upload filenames', async () => {
    vi.resetModules();
    const handler = await createHandler();
    expect((handler as any).sanitizeFilename('../secret.txt')).toBe(
      'secret.txt',
    );
  });

  it('builds upload payloads with base64 content', async () => {
    vi.resetModules();
    const handler = await createHandler();
    const payloads = (handler as any).buildUploadPayloads({
      name: '../hello.txt',
      mimeType: 'text/plain',
      dataBase64: Buffer.from('hello').toString('base64'),
    }) as Array<{ name: string; mimeType?: string; buffer: Buffer }>;
    expect(payloads).toHaveLength(1);
    expect(payloads[0].name).toBe('hello.txt');
    expect(payloads[0].mimeType).toBe('text/plain');
    expect(payloads[0].buffer.toString()).toBe('hello');
  });

  it('rejects oversized upload payloads', async () => {
    process.env.BROWSER_UPLOAD_MAX_MB = '1';
    vi.resetModules();
    const handler = await createHandler();
    const largeBuffer = Buffer.alloc(1024 * 1024 + 1, 'a');
    const payload = {
      name: 'big.bin',
      dataBase64: largeBuffer.toString('base64'),
    };
    expect(() => (handler as any).buildUploadPayloads(payload)).toThrow(
      'Upload file too large',
    );
  });

  it('calls action pacing before executing action', async () => {
    const { handler, page, actionPacing, riskTelemetry } =
      await createHandlerWithMocks();
    await handler.execute({ id: 'bs_1' } as any, { type: 'back' } as any);
    expect(actionPacing.beforeAction).toHaveBeenCalledWith({
      sessionId: 'bs_1',
      actionType: 'back',
    });
    expect(riskTelemetry.recordActionPacing).not.toHaveBeenCalled();
    expect(page.goBack).toHaveBeenCalledTimes(1);
  });

  it('records pacing telemetry when delay is applied', async () => {
    const { handler, page, actionPacing, riskTelemetry } =
      await createHandlerWithMocks();
    actionPacing.beforeAction.mockResolvedValueOnce({
      applied: true,
      delayMs: 180,
    });

    await handler.execute({ id: 'bs_1' } as any, { type: 'back' } as any);

    expect(riskTelemetry.recordActionPacing).toHaveBeenCalledWith({
      sessionId: 'bs_1',
      host: 'example.com',
      actionType: 'back',
      delayMs: 180,
    });
  });

  it('moves mouse with human behavior before click', async () => {
    const { handler, humanBehavior } = await createHandlerWithMocks();
    const locator = {
      boundingBox: vi.fn().mockResolvedValue({
        x: 100,
        y: 200,
        width: 80,
        height: 40,
      }),
      click: vi.fn().mockResolvedValue(undefined),
    };
    const page = {
      mouse: { move: vi.fn() },
    };

    await (handler as any).handleClick(locator, { type: 'click' }, page);

    expect(humanBehavior.humanMouseMove).toHaveBeenCalledTimes(1);
    expect(locator.click).toHaveBeenCalledTimes(1);
  });

  it('uses typing jitter delay when executing type action', async () => {
    const { handler, humanBehavior, actionPacing } =
      await createHandlerWithMocks();
    const pressSequentially = vi.fn().mockResolvedValue(undefined);
    const session = { id: 'bs_1' };
    const locator = { pressSequentially };

    actionPacing.beforeAction.mockResolvedValueOnce({
      applied: false,
      delayMs: 0,
    });
    (handler as any).sessionManager.resolveSelector = vi
      .fn()
      .mockReturnValue(locator);
    humanBehavior.computeTypingDelay.mockReturnValueOnce(63);

    await handler.execute(
      session as any,
      {
        type: 'type',
        selector: '#name',
        value: 'hello',
      } as any,
    );

    expect(humanBehavior.computeTypingDelay).toHaveBeenCalledWith(50);
    expect(pressSequentially).toHaveBeenCalledWith('hello', {
      delay: 63,
      timeout: 5000,
    });
  });
});
