import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { AiImageService } from './ai-image.service';
import { CreditService } from '../credit';
import { CreditLedgerService } from '../credit-ledger';
import { ActivityLogService } from '../activity-log';
import { SubscriptionTier } from '../testing/factories';
import { ImageProviderFactory } from './providers';

describe('AiImageService', () => {
  let service: AiImageService;
  let creditServiceMock: {
    getCreditsBalance: ReturnType<typeof vi.fn>;
  };
  let creditLedgerServiceMock: {
    recordAiImageSettlement: ReturnType<typeof vi.fn>;
    recordAiSettlementFailure: ReturnType<typeof vi.fn>;
  };
  let activityLogServiceMock: {
    logImageGeneration: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    creditServiceMock = {
      getCreditsBalance: vi.fn().mockResolvedValue({
        daily: 20,
        subscription: 0,
        purchased: 0,
        total: 20,
        debt: 0,
        available: 20,
      }),
    };
    creditLedgerServiceMock = {
      recordAiImageSettlement: vi.fn().mockResolvedValue({
        id: 'ledger-image-1',
        status: 'APPLIED',
        anomalyCode: null,
        creditsDelta: -10,
        computedCredits: 10,
        appliedCredits: 10,
        debtDelta: 0,
      }),
      recordAiSettlementFailure: vi.fn().mockResolvedValue({
        id: 'ledger-image-failed-1',
        status: 'FAILED',
        anomalyCode: 'SETTLEMENT_FAILED',
        creditsDelta: 0,
        computedCredits: 0,
        appliedCredits: 0,
        debtDelta: 0,
      }),
    };
    activityLogServiceMock = {
      logImageGeneration: vi.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        AiImageService,
        { provide: CreditService, useValue: creditServiceMock },
        { provide: CreditLedgerService, useValue: creditLedgerServiceMock },
        { provide: ActivityLogService, useValue: activityLogServiceMock },
      ],
    }).compile();

    service = module.get(AiImageService);
  });

  it('writes AI_IMAGE ledger entries on successful image generation', async () => {
    vi.spyOn(ImageProviderFactory, 'createFromConfig').mockReturnValue({
      type: 'fal',
      generate: vi.fn().mockResolvedValue({
        images: [{ url: 'https://example.com/1.png' }],
        usage: { imageCount: 1 },
      }),
    } as never);

    const result = await service.generateImage(
      'user-1',
      SubscriptionTier.free,
      {
        model: 'z-image-turbo',
        prompt: 'mountain lake',
        n: 1,
      },
    );

    expect(result.data).toHaveLength(1);
    expect(
      creditLedgerServiceMock.recordAiImageSettlement,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        modelId: 'z-image-turbo',
        computedCredits: expect.any(Number),
      }),
    );
    expect(activityLogServiceMock.logImageGeneration).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        ledgerStatus: 'APPLIED',
        anomalyCode: null,
      }),
    );
  });

  it('stores skipped anomaly rows for zero-count image outcomes', async () => {
    vi.spyOn(ImageProviderFactory, 'createFromConfig').mockReturnValue({
      type: 'fal',
      generate: vi.fn().mockResolvedValue({
        images: [],
        usage: { imageCount: 0 },
      }),
    } as never);
    creditLedgerServiceMock.recordAiImageSettlement.mockResolvedValue({
      id: 'ledger-image-skipped-1',
      status: 'SKIPPED',
      anomalyCode: 'ZERO_USAGE',
      creditsDelta: 0,
      computedCredits: 0,
      appliedCredits: 0,
      debtDelta: 0,
    });

    const result = await service.generateImage(
      'user-1',
      SubscriptionTier.free,
      {
        model: 'z-image-turbo',
        prompt: 'empty response',
        n: 1,
      },
    );

    expect(result.data).toEqual([]);
    expect(activityLogServiceMock.logImageGeneration).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        ledgerStatus: 'SKIPPED',
        anomalyCode: 'ZERO_USAGE',
      }),
    );
  });

  it('persists a failed ledger row without breaking the image response', async () => {
    vi.spyOn(ImageProviderFactory, 'createFromConfig').mockReturnValue({
      type: 'fal',
      generate: vi.fn().mockResolvedValue({
        images: [{ url: 'https://example.com/2.png' }],
        usage: { imageCount: 1 },
      }),
    } as never);
    creditLedgerServiceMock.recordAiImageSettlement.mockRejectedValue(
      new Error('ledger write failed'),
    );

    const result = await service.generateImage(
      'user-1',
      SubscriptionTier.free,
      {
        model: 'z-image-turbo',
        prompt: 'sunrise',
        n: 1,
      },
    );

    expect(result.data).toHaveLength(1);
    expect(
      creditLedgerServiceMock.recordAiSettlementFailure,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'AI_IMAGE',
        idempotencyKey: expect.stringMatching(/:failed$/),
        computedCredits: expect.any(Number),
        errorMessage: 'ledger write failed',
      }),
    );
  });
});
