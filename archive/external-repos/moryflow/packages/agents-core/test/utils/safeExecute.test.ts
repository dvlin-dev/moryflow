import { describe, it, expect } from 'vitest';
import { safeExecute } from '../../src/utils/safeExecute';

describe('safeExecute', () => {
  it('returns value when function succeeds', async () => {
    const [err, value] = await safeExecute(() => 'ok');
    expect(err).toBeNull();
    expect(value).toBe('ok');
  });

  it('returns error when function throws', async () => {
    const [err, value] = await safeExecute(() => {
      throw new Error('fail');
    });
    expect(value).toBeNull();
    expect(err).toBeInstanceOf(Error);
  });
});
