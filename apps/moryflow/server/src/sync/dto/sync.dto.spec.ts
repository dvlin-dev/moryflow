import { describe, it, expect } from 'vitest';
import { SyncCommitRequestSchema } from './sync.dto';

describe('SyncCommitRequestSchema receipt contract', () => {
  it('rejects deprecated vectorizeEnabled and any unknown fields', () => {
    const parsed = SyncCommitRequestSchema.safeParse({
      vaultId: '550e8400-e29b-41d4-a716-446655440000',
      deviceId: '550e8400-e29b-41d4-a716-446655440001',
      receipts: [
        {
          actionId: '550e8400-e29b-41d4-a716-446655440002',
          receiptToken: 'receipt-token-1',
        },
      ],
      vectorizeEnabled: true,
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects malformed action receipt', () => {
    const parsed = SyncCommitRequestSchema.safeParse({
      vaultId: '550e8400-e29b-41d4-a716-446655440000',
      deviceId: '550e8400-e29b-41d4-a716-446655440001',
      receipts: [
        {
          actionId: 'not-a-uuid',
          receiptToken: '',
        },
      ],
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects duplicate actionId receipts in a single commit', () => {
    const parsed = SyncCommitRequestSchema.safeParse({
      vaultId: '550e8400-e29b-41d4-a716-446655440000',
      deviceId: '550e8400-e29b-41d4-a716-446655440001',
      receipts: [
        {
          actionId: '550e8400-e29b-41d4-a716-446655440002',
          receiptToken: 'receipt-token-1',
        },
        {
          actionId: '550e8400-e29b-41d4-a716-446655440002',
          receiptToken: 'receipt-token-2',
        },
      ],
    });

    expect(parsed.success).toBe(false);
  });
});
