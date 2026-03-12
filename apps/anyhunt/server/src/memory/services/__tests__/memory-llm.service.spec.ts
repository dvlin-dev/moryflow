import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateText } from 'ai';
import type { LlmLanguageModelService } from '../../../llm';
import { MemoryLlmService } from '../memory-llm.service';

vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

describe('MemoryLlmService', () => {
  let llmLanguageModelService: {
    resolveModel: ReturnType<typeof vi.fn>;
    resolveExtractModel: ReturnType<typeof vi.fn>;
  };
  let service: MemoryLlmService;

  beforeEach(() => {
    vi.clearAllMocks();
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

    service = new MemoryLlmService(
      llmLanguageModelService as unknown as LlmLanguageModelService,
    );
  });

  it('extractGraph resolves extract model through AI SDK text generation', async () => {
    vi.mocked(generateText).mockResolvedValue({
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
    expect(generateText).toHaveBeenCalled();
    expect(result).toEqual({
      entities: [{ id: 'lin', name: 'Lin', type: 'person' }],
      relations: [{ source: 'Lin', target: 'Moryflow', relation: 'works_on' }],
    });
  });
});
