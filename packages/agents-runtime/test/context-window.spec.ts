import { describe, expect, it } from 'vitest';
import { resolveContextWindow } from '../src/context-window';

describe('resolveContextWindow', () => {
  it('returns undefined when modelId is missing', () => {
    expect(resolveContextWindow({ modelId: undefined, providers: [] })).toBeUndefined();
  });

  it('prefers customContext when available', () => {
    const context = resolveContextWindow({
      modelId: 'gpt-4o',
      providers: [
        {
          models: [
            { id: 'gpt-4o', customContext: 64000 },
            { id: 'gpt-4.1', customContext: 128000 },
          ],
        },
      ],
      getDefaultContext: () => 123456,
    });
    expect(context).toBe(64000);
  });

  it('falls back to default context when customContext is invalid', () => {
    const context = resolveContextWindow({
      modelId: 'gpt-4o',
      providers: [{ models: [{ id: 'gpt-4o', customContext: 0 }] }],
      getDefaultContext: () => 128000,
    });
    expect(context).toBe(128000);
  });

  it('returns undefined when no customContext or default context', () => {
    const context = resolveContextWindow({
      modelId: 'gpt-4o',
      providers: [{ models: [{ id: 'gpt-4o' }] }],
    });
    expect(context).toBeUndefined();
  });
});
