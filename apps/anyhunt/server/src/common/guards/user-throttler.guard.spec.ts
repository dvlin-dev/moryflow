import { createHash } from 'crypto';
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
  it('should prefer api key id when present on request', async () => {
    const guard = createGuard();
    const tracker = await (
      guard as unknown as { getTracker: (req: Request) => Promise<string> }
    ).getTracker({
      apiKey: { id: 'api_key_123' },
      user: { id: 'user_123' },
      ip: '127.0.0.1',
    } as unknown as Request);

    expect(tracker).toBe('apiKey:api_key_123');
  });

  it('should hash raw Anyhunt api key when api key context is not attached yet', async () => {
    const guard = createGuard();
    const token = 'ah_test_key_123';
    const tracker = await (
      guard as unknown as { getTracker: (req: Request) => Promise<string> }
    ).getTracker({
      headers: { authorization: `Bearer ${token}` },
      ip: '127.0.0.1',
    } as unknown as Request);

    const expectedHash = createHash('sha256').update(token).digest('hex');
    expect(tracker).toBe(`apiKeyHash:${expectedHash}`);
  });

  it('should fallback to user id when authenticated session exists', async () => {
    const guard = createGuard();
    const tracker = await (
      guard as unknown as { getTracker: (req: Request) => Promise<string> }
    ).getTracker({
      user: { id: 'user_123' },
      ip: '127.0.0.1',
    } as unknown as Request);

    expect(tracker).toBe('user:user_123');
  });

  it('should fallback to ip when identity is missing', async () => {
    const guard = createGuard();
    const tracker = await (
      guard as unknown as { getTracker: (req: Request) => Promise<string> }
    ).getTracker({
      ip: '127.0.0.1',
    } as unknown as Request);

    expect(tracker).toBe('ip:127.0.0.1');
  });
});
