import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActionPacingService } from '../runtime';

describe('ActionPacingService', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not delay non-risk actions', async () => {
    vi.useFakeTimers();
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
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const service = new ActionPacingService();

    const task = service.beforeAction({
      sessionId: 'bs_1',
      actionType: 'click',
    });
    await vi.runAllTimersAsync();
    const result = await task;

    expect(result.applied).toBe(true);
    expect(result.delayMs).toBeGreaterThanOrEqual(120);
    expect(result.delayMs).toBeLessThanOrEqual(350);
  });

  it('adds cooldown delay when click burst exceeds threshold', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const service = new ActionPacingService();

    let delayedResult = { applied: false, delayMs: 0 };

    for (let index = 0; index < 4; index += 1) {
      const task = service.beforeAction({
        sessionId: 'bs_1',
        actionType: 'click',
      });
      await vi.runAllTimersAsync();
      const current = await task;
      if (index === 3) {
        delayedResult = current;
      }
    }

    expect(delayedResult.applied).toBe(true);
    expect(delayedResult.delayMs).toBeGreaterThan(350);
  });

  it('cleans pacing states by session id', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const service = new ActionPacingService();

    const taskA = service.beforeAction({
      sessionId: 'bs_1',
      actionType: 'click',
    });
    const taskB = service.beforeAction({
      sessionId: 'bs_2',
      actionType: 'click',
    });
    await vi.runAllTimersAsync();
    await taskA;
    await taskB;

    service.cleanupSession('bs_1');
    const states = (service as unknown as { states: Map<string, unknown> })
      .states;

    expect(states.has('bs_1:click')).toBe(false);
    expect(states.has('bs_2:click')).toBe(true);
  });
});
