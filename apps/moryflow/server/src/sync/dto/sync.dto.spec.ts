import { describe, it, expect } from 'vitest';
import { SyncCommitRequestSchema } from './sync.dto';

describe('SyncCommitRequestSchema path validation', () => {
  it('rejects path traversal in completed file path', () => {
    const parsed = SyncCommitRequestSchema.safeParse({
      vaultId: '550e8400-e29b-41d4-a716-446655440000',
      deviceId: '550e8400-e29b-41d4-a716-446655440001',
      completed: [
        {
          fileId: '550e8400-e29b-41d4-a716-446655440002',
          action: 'upload',
          path: '../escape.md',
          title: 'escape',
          size: 1,
          contentHash: 'hash-1',
          vectorClock: {},
        },
      ],
      deleted: [],
      vectorizeEnabled: false,
    });

    expect(parsed.success).toBe(false);
  });

  it('accepts normalized relative path', () => {
    const parsed = SyncCommitRequestSchema.safeParse({
      vaultId: '550e8400-e29b-41d4-a716-446655440000',
      deviceId: '550e8400-e29b-41d4-a716-446655440001',
      completed: [
        {
          fileId: '550e8400-e29b-41d4-a716-446655440002',
          action: 'upload',
          path: 'notes/ok.markdown',
          title: 'ok',
          size: 1,
          contentHash: 'hash-1',
          vectorClock: {},
        },
      ],
      deleted: [],
      vectorizeEnabled: false,
    });

    expect(parsed.success).toBe(true);
  });
});
