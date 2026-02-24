import { Runner, setDefaultModelProvider, type ModelProvider } from '@openai/agents-core';
import { describe, expect, it } from 'vitest';

import { bindDefaultModelProvider } from '../default-model-provider';
import type { ModelFactory } from '../model-factory';

describe('default-model-provider', () => {
  it('binds model factory as default provider for Runner', () => {
    setDefaultModelProvider(undefined as unknown as ModelProvider);
    expect(() => new Runner()).toThrow(/No default model provider set/);

    bindDefaultModelProvider(
      () =>
        ({
          buildModel: () => {
            throw new Error('should not be called in Runner constructor');
          },
        }) as unknown as ModelFactory
    );

    expect(() => new Runner()).not.toThrow();
  });
});
