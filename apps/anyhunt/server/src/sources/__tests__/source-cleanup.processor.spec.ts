import { describe, expect, it, vi } from 'vitest';
import { SourceCleanupProcessor } from '../source-cleanup.processor';
import type { KnowledgeSourceDeletionService } from '../knowledge-source-deletion.service';

describe('SourceCleanupProcessor', () => {
  it('delegates cleanup job to deletion service', async () => {
    const deletionService = {
      processCleanupJob: vi.fn().mockResolvedValue(undefined),
    } as unknown as KnowledgeSourceDeletionService;
    const processor = new SourceCleanupProcessor(deletionService);

    const result = await processor.process({
      id: 'cleanup-1',
      data: {
        apiKeyId: 'api-key-1',
        sourceId: 'source-1',
      },
    } as never);

    expect(
      deletionService.processCleanupJob as ReturnType<typeof vi.fn>,
    ).toHaveBeenCalledWith('api-key-1', 'source-1');
    expect(result).toEqual({
      sourceId: 'source-1',
      status: 'COMPLETED',
    });
  });
});
