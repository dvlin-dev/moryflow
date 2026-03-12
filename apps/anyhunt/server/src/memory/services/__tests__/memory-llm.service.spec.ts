import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LlmLanguageModelService } from '../../../llm';

const mockGenerateText = vi.hoisted(() => vi.fn());

vi.mock('ai', () => ({
  generateText: mockGenerateText,
}));

describe('MemoryLlmService', () => {
  let llmLanguageModelService: {
    resolveModel: ReturnType<typeof vi.fn>;
    resolveExtractModel: ReturnType<typeof vi.fn>;
  };
  let service: import('../memory-llm.service').MemoryLlmService;
  let MemoryLlmServiceRef: typeof import('../memory-llm.service').MemoryLlmService;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    mockGenerateText.mockReset();
    ({ MemoryLlmService: MemoryLlmServiceRef } =
      await import('../memory-llm.service'));
    llmLanguageModelService = {
      resolveModel: vi.fn().mockResolvedValue({
        model: { provider: 'test-model' },
        upstreamModelId: 'test-extract-model',
        modelConfig: {
          maxContextTokens: 128000,
          maxOutputTokens: 4096,
        },
      }),
      resolveExtractModel: vi.fn(),
    };

    service = new MemoryLlmServiceRef(
      llmLanguageModelService as unknown as LlmLanguageModelService,
    );
  });

  it('extractGraph resolves extract model through AI SDK text generation', async () => {
    mockGenerateText.mockResolvedValue({
      text: JSON.stringify({
        entities: [{ id: 'lin', name: 'Lin', type: 'person' }],
        relations: [
          { source: 'Lin', target: 'Moryflow', relation: 'works_on' },
        ],
      }),
    } as never);

    const result = await service.extractGraph(
      'Lin works on Moryflow. Moryflow uses Anyhunt.',
    );

    expect(llmLanguageModelService.resolveModel).toHaveBeenCalledWith({
      purpose: 'extract',
      requestedModelId: undefined,
    });
    expect(mockGenerateText).toHaveBeenCalled();
    expect(result).toEqual({
      entities: [{ id: 'lin', name: 'Lin', type: 'person' }],
      relations: [{ source: 'Lin', target: 'Moryflow', relation: 'works_on' }],
    });
  });
});
