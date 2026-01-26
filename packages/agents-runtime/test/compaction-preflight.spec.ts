import { describe, expect, it } from 'vitest';

import { createCompactionPreflightGate } from '../src/compaction-preflight';

describe('createCompactionPreflightGate', () => {
  it('consumes only when model matches and within ttl', () => {
    let now = 0;
    const gate = createCompactionPreflightGate({
      ttlMs: 1000,
      now: () => now,
    });

    gate.markPrepared('chat-1', 'model-a');
    now = 500;
    expect(gate.consumePrepared('chat-1', 'model-a')).toBe(true);
    expect(gate.consumePrepared('chat-1', 'model-a')).toBe(false);
  });

  it('rejects when model mismatches', () => {
    const gate = createCompactionPreflightGate({
      ttlMs: 1000,
      now: () => 0,
    });

    gate.markPrepared('chat-1', 'model-a');
    expect(gate.consumePrepared('chat-1', 'model-b')).toBe(false);
  });

  it('expires after ttl', () => {
    let now = 0;
    const gate = createCompactionPreflightGate({
      ttlMs: 1000,
      now: () => now,
    });

    gate.markPrepared('chat-1', 'model-a');
    now = 2000;
    expect(gate.consumePrepared('chat-1', 'model-a')).toBe(false);
  });
});
