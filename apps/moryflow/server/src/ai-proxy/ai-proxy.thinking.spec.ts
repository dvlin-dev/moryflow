import { describe, expect, it } from 'vitest';
import { AiProxyService } from './ai-proxy.service';
import { InvalidRequestException } from './exceptions';
import { createMockAiModel, createMockAiProvider } from '../testing/factories';

describe('AiProxyService thinking profile/runtime', () => {
  const service = new AiProxyService({} as never, {} as never, {} as never);

  it('fills default visible params for configured level', () => {
    const provider = createMockAiProvider({
      providerType: 'openai',
    });
    const model = createMockAiModel({
      modelId: 'gpt-5.2',
      capabilitiesJson: {
        reasoning: {
          levels: ['off', 'high'],
          defaultLevel: 'high',
        },
      },
    });

    const profile = (
      service as unknown as {
        resolveThinkingProfileForModel: (
          value: typeof model & { provider: typeof provider },
        ) => {
          defaultLevel: string;
          levels: Array<{
            id: string;
            visibleParams?: Array<{ key: string; value: string }>;
          }>;
        };
      }
    ).resolveThinkingProfileForModel({ ...model, provider });

    expect(profile.defaultLevel).toBe('high');
    expect(
      profile.levels.find((item) => item.id === 'high')?.visibleParams,
    ).toEqual([{ key: 'reasoningEffort', value: 'high' }]);
  });

  it('preserves non-whitelisted thinking visible params from model contract', () => {
    const provider = createMockAiProvider({
      providerType: 'anthropic',
    });
    const model = createMockAiModel({
      modelId: 'claude-opus-4-6',
      capabilitiesJson: {
        reasoning: {
          defaultLevel: 'high',
          levels: [
            {
              id: 'off',
              label: 'Off',
            },
            {
              id: 'high',
              label: 'High',
              visibleParams: [{ key: 'effort', value: 'high' }],
            },
          ],
        },
      },
    });

    const profile = (
      service as unknown as {
        resolveThinkingProfileForModel: (
          value: typeof model & { provider: typeof provider },
        ) => {
          supportsThinking: boolean;
          levels: Array<{
            id: string;
            visibleParams?: Array<{ key: string; value: string }>;
          }>;
        };
      }
    ).resolveThinkingProfileForModel({ ...model, provider });

    expect(profile.supportsThinking).toBe(true);
    expect(
      profile.levels.find((item) => item.id === 'high')?.visibleParams,
    ).toEqual([{ key: 'effort', value: 'high' }]);
  });

  it('resolves google includeThoughts from thinking visible params', () => {
    const provider = createMockAiProvider({
      providerType: 'google',
    });
    const model = createMockAiModel({
      modelId: 'gemini-2.5-pro',
      capabilitiesJson: {
        reasoning: {
          defaultLevel: 'high',
          levels: [
            {
              id: 'off',
              label: 'Off',
            },
            {
              id: 'high',
              label: 'High',
              visibleParams: [
                { key: 'includeThoughts', value: 'false' },
                { key: 'thinkingBudget', value: '20000' },
              ],
            },
          ],
        },
      },
    });

    const reasoning = (
      service as unknown as {
        resolveReasoningConfig: (
          modelValue: typeof model,
          providerValue: typeof provider,
          thinking: { mode: 'level'; level: string },
        ) => {
          enabled: boolean;
          includeThoughts?: boolean;
          maxTokens?: number;
        };
      }
    ).resolveReasoningConfig(model, provider, {
      mode: 'level',
      level: 'high',
    });

    expect(reasoning).toEqual({
      enabled: true,
      includeThoughts: false,
      maxTokens: 20000,
    });
  });

  it('rejects unknown thinking level with structured code', () => {
    const provider = createMockAiProvider({
      providerType: 'openai',
    });
    const model = createMockAiModel({
      modelId: 'gpt-5.2',
      capabilitiesJson: {
        reasoning: {
          levels: [
            { id: 'off', label: 'Off' },
            {
              id: 'medium',
              label: 'Medium',
              visibleParams: [{ key: 'reasoningEffort', value: 'medium' }],
            },
          ],
          defaultLevel: 'medium',
        },
      },
    });

    let error: unknown;
    try {
      (
        service as unknown as {
          resolveReasoningConfig: (
            modelValue: typeof model,
            providerValue: typeof provider,
            thinking: { mode: 'level'; level: string },
          ) => unknown;
        }
      ).resolveReasoningConfig(model, provider, {
        mode: 'level',
        level: 'ultra',
      });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(InvalidRequestException);
    expect((error as InvalidRequestException).getResponse()).toMatchObject({
      code: 'THINKING_LEVEL_INVALID',
    });
  });

  it('uses level-token fallback for google when params are partial', () => {
    const provider = createMockAiProvider({
      providerType: 'google',
    });
    const model = createMockAiModel({
      modelId: 'gemini-2.5-pro',
      capabilitiesJson: {
        reasoning: {
          defaultLevel: 'high',
          levels: [
            { id: 'off', label: 'Off' },
            {
              id: 'high',
              label: 'High',
              visibleParams: [{ key: 'reasoningSummary', value: 'detailed' }],
            },
          ],
        },
      },
    });

    const reasoning = (
      service as unknown as {
        resolveReasoningConfig: (
          modelValue: typeof model,
          providerValue: typeof provider,
          thinking: { mode: 'level'; level: string },
        ) => {
          enabled: boolean;
          includeThoughts?: boolean;
          maxTokens?: number;
        };
      }
    ).resolveReasoningConfig(model, provider, {
      mode: 'level',
      level: 'high',
    });

    expect(reasoning).toEqual({
      enabled: true,
      includeThoughts: true,
      maxTokens: 16384,
    });
  });
});
