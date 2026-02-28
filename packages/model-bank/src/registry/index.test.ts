import { describe, expect, it } from 'vitest';
import {
  buildProviderModelRef,
  getAllModelIds,
  getModelById,
  getModelsByCategory,
  getSortedProviders,
  parseProviderModelRef,
} from './index';

describe('registry canonical model ids', () => {
  it('resolves model only by provider/modelId', () => {
    const provider = getSortedProviders().find((entry) => entry.modelIds.length > 0);
    expect(provider).toBeDefined();
    const modelId = provider!.modelIds[0];
    const modelRef = buildProviderModelRef(provider!.id, modelId);

    expect(getModelById(modelRef)).not.toBeNull();
    expect(getModelById(modelId)).toBeNull();
  });

  it('returns canonical model ids from getAllModelIds', () => {
    const ids = getAllModelIds();
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every((id) => parseProviderModelRef(id) !== null)).toBe(true);
  });

  it('returns canonical model ids from category queries', () => {
    const ids = getModelsByCategory('chat');
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every((id) => parseProviderModelRef(id) !== null)).toBe(true);
  });
});
