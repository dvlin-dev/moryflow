import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ModelSettings } from '@openai/agents-core';

const agentCtor = vi.hoisted(() => vi.fn());

vi.mock('@openai/agents-core', async () => ({
  Agent: agentCtor,
}));

import { createAgentFactory } from '../agent-factory';

describe('agent-factory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    agentCtor.mockImplementation((config: { tools?: unknown[] }) => ({
      tools: config.tools ?? [],
    }));
  });

  it('injects model providerOptions into modelSettings.providerData', () => {
    const buildModel = vi.fn().mockReturnValue({
      modelId: 'claude-sonnet-4-5',
      baseModel: {},
      providerOptions: {
        anthropic: {
          thinking: {
            type: 'enabled',
            budgetTokens: 16000,
          },
        },
      },
    });
    const getModelSettings = vi.fn((): ModelSettings => ({
      temperature: 0.2,
      providerData: {
        traceId: 'trace-1',
        providerOptions: {
          openai: {
            reasoningEffort: 'low',
          },
        },
      },
    }));

    const factory = createAgentFactory({
      getModelFactory: () =>
        ({
          buildModel,
        }) as any,
      baseTools: [],
      getMcpTools: () => [],
      getModelSettings,
    });

    factory.getAgent('claude-sonnet-4-5', {
      thinking: { mode: 'level', level: 'high' },
    });

    expect(agentCtor).toHaveBeenCalledTimes(1);
    const config = agentCtor.mock.calls[0]?.[0] as {
      modelSettings?: ModelSettings;
    };
    expect(config.modelSettings).toEqual({
      temperature: 0.2,
      providerData: {
        traceId: 'trace-1',
        providerOptions: {
          openai: {
            reasoningEffort: 'low',
          },
          anthropic: {
            thinking: {
              type: 'enabled',
              budgetTokens: 16000,
            },
          },
        },
      },
    });
  });
});
