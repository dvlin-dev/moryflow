import { describe, expect, it } from 'vitest';
import { getSortedProviders } from '@shared/model-registry';

describe('provider registry', () => {
  it('provides default base URLs for preset providers', () => {
    const providers = getSortedProviders();
    const missing = providers.filter((provider) => !provider.defaultBaseUrl?.trim());
    expect(missing).toEqual([]);
  });
});
