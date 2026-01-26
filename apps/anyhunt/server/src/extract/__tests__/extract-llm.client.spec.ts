import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { ExtractLlmClient } from '../extract-llm.client';
import { LlmError } from '../extract.errors';
import type { LlmLanguageModelService } from '../../llm';
import { generateObject } from 'ai';

vi.mock('ai', () => ({
  generateObject: vi.fn(),
  generateText: vi.fn(),
  streamText: vi.fn(),
}));

function createClient(): ExtractLlmClient {
  const llmService = {
    resolveModel: vi.fn(),
  } as unknown as LlmLanguageModelService;
  return new ExtractLlmClient(llmService);
}

async function captureError<T>(promise: Promise<T>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Expected promise to reject');
}

describe('ExtractLlmClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws LlmError when structured output is empty', async () => {
    vi.mocked(generateObject).mockResolvedValue({ object: undefined } as any);

    const client = createClient();
    const error = await captureError(
      client.completeParsed(
        { model: {} as any, upstreamModelId: 'gpt-4o' },
        {
          systemPrompt: 'sys',
          userPrompt: 'user',
          schema: z.object({ title: z.string() }),
          schemaName: 'extracted_data',
        },
      ),
    );

    expect(error).toBeInstanceOf(LlmError);
    const response = (error as LlmError).getResponse() as any;
    expect(response.details.schema).toBe('extracted_data');
    expect(response.details.model).toBe('gpt-4o');
  });

  it('wraps generateObject errors as LlmError', async () => {
    vi.mocked(generateObject).mockRejectedValue(new Error('boom'));

    const client = createClient();
    const error = await captureError(
      client.completeParsed(
        { model: {} as any, upstreamModelId: 'gpt-4o-mini' },
        {
          systemPrompt: 'sys',
          userPrompt: 'user',
          schema: z.object({ title: z.string() }),
          schemaName: 'schema_test',
        },
      ),
    );

    expect(error).toBeInstanceOf(LlmError);
    const response = (error as LlmError).getResponse() as any;
    expect(response.details.schema).toBe('schema_test');
    expect(response.details.model).toBe('gpt-4o-mini');
  });
});
