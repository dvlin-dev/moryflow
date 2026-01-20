/**
 * [INPUT]: ConfigService env stubs
 * [OUTPUT]: Ensures agents-core default model provider is set at init
 * [POS]: 回归测试：防止 anyhunt-server 忘记初始化 ModelProvider 导致 Agent/Playground 报错
 */

import { describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import * as agentsCore from '@anyhunt/agents-core';
import { AgentModelProviderInitializer } from '../../src/agent/agent-model-provider.initializer';

describe('AgentModelProviderInitializer', () => {
  it('sets a default model provider (and trims env)', () => {
    const mockConfig = {
      get: vi.fn((key: string) => {
        if (key === 'OPENAI_API_KEY') return '  test-key  ';
        if (key === 'OPENAI_BASE_URL') return '  https://llm.example.com/v1  ';
        return undefined;
      }),
    } as unknown as ConfigService;

    const spy = vi.spyOn(agentsCore, 'setDefaultModelProvider');

    const initializer = new AgentModelProviderInitializer(mockConfig);
    initializer.onModuleInit();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        getModel: expect.any(Function),
      }),
    );
  });
});
