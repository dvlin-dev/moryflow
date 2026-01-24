/**
 * Better Auth 配置测试
 */
import { describe, it, expect } from 'vitest';
import { createBetterAuth } from '../better-auth';
import type { PrismaClient } from '../../../generated/prisma-main/client';

describe('createBetterAuth', () => {
  it('should auto sign in after email verification', async () => {
    const originalSecret = process.env.BETTER_AUTH_SECRET;
    process.env.BETTER_AUTH_SECRET = 'test-secret-should-be-long-enough-32+';

    try {
      const auth = createBetterAuth({} as PrismaClient, async () => undefined);
      const context = await auth.$context;

      expect(
        context.options.emailVerification?.autoSignInAfterVerification,
      ).toBe(true);
    } finally {
      if (originalSecret === undefined) {
        delete process.env.BETTER_AUTH_SECRET;
      } else {
        process.env.BETTER_AUTH_SECRET = originalSecret;
      }
    }
  });
});
