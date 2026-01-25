import { describe, it, expect } from 'vitest';
import { normalizeAgentSettings } from '../normalize';
import { defaultAgentSettings } from '../const';

describe('agent-settings normalize', () => {
  it('returns defaults for invalid input', () => {
    const normalized = normalizeAgentSettings(null);
    expect(normalized.systemPrompt).toEqual(defaultAgentSettings.systemPrompt);
    expect(normalized.modelParams).toEqual(defaultAgentSettings.modelParams);
  });

  it('preserves custom system prompt and params', () => {
    const normalized = normalizeAgentSettings({
      systemPrompt: { mode: 'custom', template: 'Custom prompt' },
      modelParams: {
        temperature: { mode: 'custom', value: 0.9 },
        topP: { mode: 'custom', value: 0.6 },
        maxTokens: { mode: 'custom', value: 2048 },
      },
    });

    expect(normalized.systemPrompt.mode).toBe('custom');
    expect(normalized.systemPrompt.template).toBe('Custom prompt');
    expect(normalized.modelParams).toEqual({
      temperature: { mode: 'custom', value: 0.9 },
      topP: { mode: 'custom', value: 0.6 },
      maxTokens: { mode: 'custom', value: 2048 },
    });
  });

  it('clamps model params to safe ranges', () => {
    const normalized = normalizeAgentSettings({
      systemPrompt: { mode: 'custom', template: 'Custom prompt' },
      modelParams: {
        temperature: { mode: 'custom', value: 9 },
        topP: { mode: 'custom', value: -1 },
        maxTokens: { mode: 'custom', value: 0 },
      },
    });

    expect(normalized.modelParams).toEqual({
      temperature: { mode: 'custom', value: 2 },
      topP: { mode: 'custom', value: 0 },
      maxTokens: { mode: 'custom', value: 1 },
    });
  });
});
