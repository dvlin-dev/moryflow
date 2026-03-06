import { describe, expect, it } from 'vitest';
import type { Request } from 'express';
import type { Reflector } from '@nestjs/core';
import type {
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { UserThrottlerGuard } from './user-throttler.guard';

const createGuard = () =>
  new UserThrottlerGuard(
    [] as unknown as ThrottlerModuleOptions,
    {} as ThrottlerStorage,
    {} as Reflector,
  );

describe('UserThrottlerGuard', () => {
  it('should prefer user id when authenticated', async () => {
    const guard = createGuard();
    const tracker = await (
      guard as unknown as { getTracker: (req: Request) => Promise<string> }
    ).getTracker({
      user: { id: 'user_123' },
      ip: '127.0.0.1',
    } as Request);

    expect(tracker).toBe('user:user_123');
  });

  it('should fallback to ip when user is missing', async () => {
    const guard = createGuard();
    const tracker = await (
      guard as unknown as { getTracker: (req: Request) => Promise<string> }
    ).getTracker({
      ip: '127.0.0.1',
    } as Request);

    expect(tracker).toBe('ip:127.0.0.1');
  });
});
