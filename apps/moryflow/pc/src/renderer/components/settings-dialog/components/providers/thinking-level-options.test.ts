import { describe, expect, it } from 'vitest';

import { resolveThinkingLevelSelection } from './thinking-level-options';

const toLevelIds = (selection: ReturnType<typeof resolveThinkingLevelSelection>) =>
  selection.options.map((option) => option.id);

describe('resolveThinkingLevelSelection', () => {
  it('returns gpt-5.2 native levels for openai provider', () => {
    const selection = resolveThinkingLevelSelection({
      providerId: 'openai',
      sdkType: 'openai',
      modelId: 'gpt-5.2',
      reasoningEnabled: true,
    });

    expect(toLevelIds(selection)).toEqual(['off', 'low', 'medium', 'high', 'xhigh']);
    expect(selection.defaultLevel).toBe('off');
    expect(selection.supportsThinking).toBe(true);
  });

  it('returns gpt-5.2 native levels for openrouter model id', () => {
    const selection = resolveThinkingLevelSelection({
      providerId: 'openrouter',
      sdkType: 'openrouter',
      modelId: 'openai/gpt-5.2',
      reasoningEnabled: true,
    });

    expect(toLevelIds(selection)).toEqual(['off', 'low', 'medium', 'high', 'xhigh']);
    expect(selection.defaultLevel).toBe('off');
    expect(selection.supportsThinking).toBe(true);
  });

  it('returns off-only for unknown custom model', () => {
    const selection = resolveThinkingLevelSelection({
      providerId: 'custom-provider-1',
      sdkType: 'openai-compatible',
      modelId: 'unknown-model-2026',
      reasoningEnabled: true,
    });

    expect(toLevelIds(selection)).toEqual(['off']);
    expect(selection.defaultLevel).toBe('off');
    expect(selection.normalizedLevel).toBe('off');
    expect(selection.supportsThinking).toBe(false);
  });

  it('uses profile default level when selected level is invalid', () => {
    const selection = resolveThinkingLevelSelection({
      providerId: 'openai',
      sdkType: 'openai',
      modelId: 'gpt-5',
      reasoningEnabled: true,
      selectedLevel: 'xhigh',
    });

    expect(selection.defaultLevel).toBe('medium');
    expect(selection.normalizedLevel).toBe('medium');
  });

  it('returns off-only when reasoning capability is disabled', () => {
    const selection = resolveThinkingLevelSelection({
      providerId: 'openai',
      sdkType: 'openai',
      modelId: 'gpt-5.2',
      reasoningEnabled: false,
      selectedLevel: 'high',
    });

    expect(toLevelIds(selection)).toEqual(['off']);
    expect(selection.defaultLevel).toBe('off');
    expect(selection.normalizedLevel).toBe('off');
    expect(selection.supportsThinking).toBe(false);
  });
});
