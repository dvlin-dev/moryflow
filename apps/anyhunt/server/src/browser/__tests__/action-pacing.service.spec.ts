import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActionPacingService } from '../runtime';

const mockImmediateTimeout = () =>
  vi.spyOn(globalThis, 'setTimeout').mockImplementation(((
    handler: TimerHandler,
  ): ReturnType<typeof setTimeout> => {
    if (typeof handler === 'function') {
      handler();
    }
    return 0 as unknown as ReturnType<typeof setTimeout>;
  }) as typeof setTimeout);

describe('ActionPacingService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not delay non-risk actions', async () => {
    const service = new ActionPacingService();

    const result = await service.beforeAction({
      sessionId: 'bs_1',
      actionType: 'wait',
    });

    expect(result).toEqual({
      applied: false,
      delayMs: 0,
    });
  });

  it('applies jitter delay within configured range', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    mockImmediateTimeout();
    const service = new ActionPacingService();

    const result = await service.beforeAction({
      sessionId: 'bs_1',
      actionType: 'click',
    });

    expect(result.applied).toBe(true);
    expect(result.delayMs).toBeGreaterThanOrEqual(120);
    expect(result.delayMs).toBeLessThanOrEqual(350);
  });

  it('adds cooldown delay when click burst exceeds threshold', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    mockImmediateTimeout();
    const service = new ActionPacingService();

    let delayedResult = { applied: false, delayMs: 0 };

    for (let index = 0; index < 4; index += 1) {
      const current = await service.beforeAction({
        sessionId: 'bs_1',
        actionType: 'click',
      });
      if (index === 3) {
        delayedResult = current;
      }
    }

    expect(delayedResult.applied).toBe(true);
    expect(delayedResult.delayMs).toBeGreaterThan(350);
  });

  it('cleans pacing states by session id', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    mockImmediateTimeout();
    const service = new ActionPacingService();

    await service.beforeAction({
      sessionId: 'bs_1',
      actionType: 'click',
    });
    await service.beforeAction({
      sessionId: 'bs_2',
      actionType: 'click',
    });

    service.cleanupSession('bs_1');
    const states = (service as unknown as { states: Map<string, unknown> })
      .states;

    expect(states.has('bs_1:click')).toBe(false);
    expect(states.has('bs_2:click')).toBe(true);
  });
});
