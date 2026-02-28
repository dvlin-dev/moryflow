import { describe, expect, it } from 'vitest';
import {
  buildProviderModelRef,
  getAllModelIds,
  getModelById,
  getModelsByCategory,
  getSortedProviders,
  parseProviderModelRef,
  toApiModelId,
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

  it('keeps openrouter multi-segment model ids unchanged', () => {
    expect(toApiModelId('openrouter', 'minimax/minimax-m2.1')).toBe('minimax/minimax-m2.1');
    expect(toApiModelId('openrouter', 'qwen/qwen3-32b')).toBe('qwen/qwen3-32b');
    expect(toApiModelId('openrouter', 'openrouter/auto')).toBe('openrouter/auto');
  });
});
