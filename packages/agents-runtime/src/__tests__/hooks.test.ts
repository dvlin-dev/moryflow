import { tool, type FunctionTool } from '@openai/agents-core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  applyChatParamsHook,
  applyChatSystemHook,
  sanitizeHooksConfig,
  wrapToolWithHooks,
  type RuntimeHooksConfig,
} from '../hooks';

describe('hooks', () => {
  it('applies chat.system hooks with append/prepend/replace', () => {
    expect(applyChatSystemHook('base', { mode: 'append', text: 'tail' })).toBe('base\n\ntail');
    expect(applyChatSystemHook('base', { mode: 'prepend', text: 'head' })).toBe('head\n\nbase');
    expect(applyChatSystemHook('base', { mode: 'replace', text: 'only' })).toBe('only');
  });

  it('merges chat.params with overrides', () => {
    const merged = applyChatParamsHook({ temperature: 0.7, maxTokens: 100 }, { temperature: 0.2 });
    expect(merged).toEqual({ temperature: 0.2, maxTokens: 100 });
  });

  it('sanitizes hook config', () => {
    const config = sanitizeHooksConfig({
      chat: {
        params: { temperature: 0.3, foo: 'bar' },
        system: { mode: 'append', text: 'extra' },
      },
      tool: {
        before: [{ tool: 'read', mergeInput: { offset: 1 } }],
        after: [{ tool: 'read', prependText: '[', appendText: ']' }],
      },
    });
    expect(config?.chat?.params?.temperature).toBe(0.3);
    expect((config?.chat?.params as Record<string, unknown>)?.foo).toBeUndefined();
    expect(config?.tool?.before?.[0]?.tool).toBe('read');
  });

  it('wraps tool with before/after hooks safely', async () => {
    const baseTool = tool({
      name: 'echo',
      description: 'echo tool',
      parameters: z.record(z.unknown()),
      async execute(input) {
        return JSON.stringify(input);
      },
    });

    const hooks: RuntimeHooksConfig = {
      tool: {
        before: [{ tool: 'echo', mergeInput: { injected: true } }],
        after: [{ tool: 'echo', prependText: 'prefix:' }],
      },
    };

    const wrapped = wrapToolWithHooks(baseTool, hooks) as FunctionTool;
    const result = await wrapped.invoke(
      undefined as never,
      JSON.stringify({ foo: 'bar' }),
      undefined
    );
    expect(result).toBe('prefix:{"injected":true,"foo":"bar"}');
  });
});
