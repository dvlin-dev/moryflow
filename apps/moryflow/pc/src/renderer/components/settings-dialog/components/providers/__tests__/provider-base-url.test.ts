import { describe, expect, it } from 'vitest';
import { getSortedProviders } from '@moryflow/model-bank/registry';

describe('provider registry', () => {
  it('uses valid default base URLs when providers declare one', () => {
    const providers = getSortedProviders();
    const declared = providers
      .map((provider) => provider.defaultBaseUrl?.trim() ?? '')
      .filter((baseUrl) => baseUrl.length > 0);
    expect(declared.length).toBeGreaterThan(0);
    const invalid = declared.filter(
      (baseUrl) => !/^https?:\/\//.test(baseUrl) && !baseUrl.startsWith('http://localhost')
    );
    expect(invalid).toEqual([]);
  });
});
