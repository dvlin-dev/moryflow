import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { RequestLogCleanupService } from '../request-log-cleanup.service';
import type { RequestLogService } from '../request-log.service';

describe('RequestLogCleanupService', () => {
  let service: RequestLogCleanupService;
  let mockRequestLogService: {
    deleteExpiredBatch: Mock;
  };

  beforeEach(() => {
    mockRequestLogService = {
      deleteExpiredBatch: vi.fn(),
    };

    service = new RequestLogCleanupService(
      mockRequestLogService as unknown as RequestLogService,
    );

    delete process.env.REQUEST_LOG_RETENTION_DAYS;
  });

  it('should cleanup in batches until less than batch size', async () => {
    mockRequestLogService.deleteExpiredBatch
      .mockResolvedValueOnce(2000)
      .mockResolvedValueOnce(10);

    await service.cleanupExpiredLogs();

    expect(mockRequestLogService.deleteExpiredBatch).toHaveBeenCalledTimes(2);
  });

  it('should fallback to default retention days when env is invalid', async () => {
    process.env.REQUEST_LOG_RETENTION_DAYS = 'invalid';
    mockRequestLogService.deleteExpiredBatch.mockResolvedValueOnce(0);

    await service.cleanupExpiredLogs();

    expect(mockRequestLogService.deleteExpiredBatch).toHaveBeenCalledTimes(1);
  });
});
