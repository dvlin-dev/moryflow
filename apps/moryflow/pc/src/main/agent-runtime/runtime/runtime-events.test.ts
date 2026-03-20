/* @vitest-environment node */

import { describe, expect, it, vi } from 'vitest';
import { bindRuntimeEvents } from './runtime-events.js';

describe('bindRuntimeEvents', () => {
  it('membership 变更成功路径也会失效 agent factory', async () => {
    let membershipListener: (() => void) | null = null;
    const refreshModelFactory = vi.fn();
    const refreshMemoryTooling = vi.fn(async () => undefined);
    const invalidateAgentFactory = vi.fn();

    bindRuntimeEvents(
      {
        onMembershipChange: (listener) => {
          membershipListener = listener;
        },
        onSettingsChange: vi.fn(),
      },
      {
        refreshModelFactory,
        refreshMemoryTooling,
        invalidateAgentFactory,
        scheduleMcpReload: vi.fn(),
      }
    );

    membershipListener?.();
    await Promise.resolve();

    expect(refreshModelFactory).toHaveBeenCalledTimes(1);
    expect(invalidateAgentFactory).toHaveBeenCalledTimes(1);
    expect(refreshMemoryTooling).toHaveBeenCalledTimes(1);
  });
});
