import { describe, expect, it } from 'vitest';
import { INTERNAL_GLOBAL_PREFIX_EXCLUDES } from './internal-routes';

describe('INTERNAL_GLOBAL_PREFIX_EXCLUDES', () => {
  it('keeps internal metrics and sync control plane outside api prefix', () => {
    expect(INTERNAL_GLOBAL_PREFIX_EXCLUDES).toEqual([
      'health',
      'health/(.*)',
      'internal/metrics',
      'internal/metrics/(.*)',
      'internal/sync',
      'internal/sync/(.*)',
    ]);
  });
});
