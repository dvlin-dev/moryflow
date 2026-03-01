import { describe, expect, it } from 'vitest';
import { DEFAULT_AI_MODEL_LIST } from '../aiModels';
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

  it('keeps openrouter paid top20 order and maxOutput limits', () => {
    const expectedPaidTop20 = [
      'minimax/minimax-m2.5-20260211',
      'google/gemini-3-flash-preview-20251217',
      'deepseek/deepseek-v3.2-20251201',
      'moonshotai/kimi-k2.5-0127',
      'anthropic/claude-4.6-opus-20260205',
      'x-ai/grok-4.1-fast',
      'anthropic/claude-4.6-sonnet-20260217',
      'z-ai/glm-5-20260211',
      'anthropic/claude-4.5-sonnet-20250929',
      'google/gemini-2.5-flash',
      'google/gemini-2.5-flash-lite',
      'minimax/minimax-m2.1',
      'openai/gpt-oss-120b',
      'google/gemini-3.1-pro-preview-20260219',
      'openai/gpt-5.2-20251211',
      'anthropic/claude-4.5-haiku-20251001',
      'google/gemini-2.0-flash-001',
      'openai/gpt-5-nano-2025-08-07',
      'x-ai/grok-4-fast',
      'z-ai/glm-4.7-20251222',
    ] as const;

    const openrouterModels = DEFAULT_AI_MODEL_LIST.filter(
      (model) => model.providerId === 'openrouter' && model.type === 'chat'
    );

    expect(openrouterModels).toHaveLength(20);
    expect(openrouterModels.map((model) => model.id)).toEqual(expectedPaidTop20);
    for (const model of openrouterModels) {
      expect(model.id.includes(':free')).toBe(false);
      expect(model.maxOutput).toBeGreaterThan(4096);
    }
  });
});
