import { describe, expect, it, vi } from 'vitest';
import { QuotaController } from '../quota.controller';
import type { QuotaService } from '../quota.service';
import type { ApiKeyValidationResult } from '../../api-key/api-key.types';

describe('QuotaController', () => {
  it('delegates quota status lookup without forwarding cached subscription tier hints', async () => {
    const getStatus = vi.fn().mockResolvedValue({
      daily: {
        limit: 0,
        used: 0,
        remaining: 0,
        resetsAt: new Date('2026-03-22T00:00:00.000Z'),
      },
      monthly: {
        limit: 10,
        used: 2,
        remaining: 8,
      },
      purchased: 1,
      totalRemaining: 9,
      periodEndsAt: new Date('2026-04-01T00:00:00.000Z'),
      periodStartsAt: new Date('2026-03-01T00:00:00.000Z'),
    });
    const controller = new QuotaController({
      getStatus,
    } as unknown as QuotaService);

    const apiKey = {
      userId: 'user-1',
      user: {
        id: 'user-1',
        email: 'test@example.com',
        name: null,
        subscriptionTier: 'PRO',
        isAdmin: false,
      },
    } as ApiKeyValidationResult;

    const result = await controller.getQuotaStatus(apiKey);

    expect(getStatus).toHaveBeenCalledWith('user-1');
    expect(result.totalRemaining).toBe(9);
  });
});
