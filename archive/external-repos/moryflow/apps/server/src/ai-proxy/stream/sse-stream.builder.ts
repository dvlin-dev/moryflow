/**
 * SSE 流构建器
 * 负责构建 OpenAI 兼容的 SSE 流式响应
 */

// StreamTextResult 类型通过 ReturnType<typeof streamText> 推断
import type {
  ChatCompletionChunk,
  TokenUsage,
  InternalTokenUsage,
  FinishReason,
  ReasoningDetail,
} from '../dto';

/** 流上下文，用于跟踪流状态 */
interface StreamContext {
  id: string;
  model: string;
  created: number;
}

/** 流处理回调 */
interface StreamCallbacks {
  onUsage: (usage: InternalTokenUsage) => Promise<void>;
}

/**
 * SSE 流构建器
 * 将 AI SDK 的流式响应转换为 OpenAI 兼容的 SSE 格式
 */
export class SSEStreamBuilder {
  private readonly encoder = new TextEncoder();

  /**
   * 创建 SSE 流
   * 使用 Parameters/ReturnType 工具类型推断 streamText 的返回类型
   */
  createStream(
    streamResult: ReturnType<typeof import('ai').streamText>,
    model: string,
    callbacks: StreamCallbacks,
  ): ReadableStream<Uint8Array> {
    const context: StreamContext = {
      id: `chatcmpl-${Date.now()}`,
      model,
      created: Math.floor(Date.now() / 1000),
    };

    return new ReadableStream({
      start: async (controller) => {
        try {
          await this.processStream(
            streamResult,
            context,
            controller,
            callbacks,
          );
        } catch (error) {
          this.sendError(controller, context, error);
        }
      },
    });
  }

  /**
   * 处理流
   */
  private async processStream(
    streamResult: ReturnType<typeof import('ai').streamText>,
    context: StreamContext,
    controller: ReadableStreamDefaultController<Uint8Array>,
    callbacks: StreamCallbacks,
  ): Promise<void> {
    // 发送初始 chunk
    this.sendChunk(controller, this.createInitialChunk(context));

    // 跟踪 tool calls
    let hasToolCalls = false;
    let toolCallIndex = 0;

    // 收集 reasoning_details
    let reasoningIndex = 0;

    // 处理流事件
    for await (const part of streamResult.fullStream) {
      switch (part.type) {
        case 'reasoning-delta': {
          // AI SDK v6: reasoning-delta 有 .text 属性（思考模型输出）
          if ((part as { text?: string }).text) {
            const reasoningText = (part as { text: string }).text;

            // 发送 reasoning_content（向后兼容）
            this.sendChunk(
              controller,
              this.createReasoningDeltaChunk(context, reasoningText),
            );

            // 同时发送 reasoning_details（新格式）
            const detail: ReasoningDetail = {
              type: 'reasoning.text',
              text: reasoningText,
              index: reasoningIndex++,
            };
            this.sendChunk(
              controller,
              this.createReasoningDetailsChunk(context, [detail]),
            );
          }
          break;
        }

        case 'text-delta': {
          // AI SDK v6: text-delta 有 .text 属性
          if (part.text) {
            this.sendChunk(
              controller,
              this.createTextDeltaChunk(context, part.text),
            );
          }
          break;
        }

        case 'tool-call': {
          hasToolCalls = true;
          // AI SDK v6: tool-call 有 .toolCallId, .toolName, .input 属性
          this.sendChunk(
            controller,
            this.createToolCallChunk(context, {
              index: toolCallIndex,
              id: part.toolCallId,
              name: part.toolName,
              arguments: JSON.stringify(part.input ?? {}),
            }),
          );
          toolCallIndex++;
          break;
        }
      }
    }

    // 获取 usage 并回调
    const finalUsage = await streamResult.usage;
    const usage: InternalTokenUsage = {
      promptTokens: finalUsage.inputTokens || 0,
      completionTokens: finalUsage.outputTokens || 0,
      totalTokens:
        (finalUsage.inputTokens || 0) + (finalUsage.outputTokens || 0),
    };

    await callbacks.onUsage(usage);

    // 发送最终 chunk
    const finishReason: FinishReason = hasToolCalls ? 'tool_calls' : 'stop';
    this.sendChunk(
      controller,
      this.createFinalChunk(context, finishReason, this.toOpenAIUsage(usage)),
    );

    // 发送结束标记
    controller.enqueue(this.encoder.encode('data: [DONE]\n\n'));
    controller.close();
  }

  /**
   * 发送错误
   */
  private sendError(
    controller: ReadableStreamDefaultController<Uint8Array>,
    context: StreamContext,
    error: unknown,
  ): void {
    const errorMessage =
      error instanceof Error ? error.message : 'Stream processing error';

    const errorChunk = {
      id: context.id,
      object: 'chat.completion.chunk',
      created: context.created,
      model: context.model,
      error: {
        message: errorMessage,
        type: 'stream_error',
        code: 'stream_processing_failed',
      },
    };

    controller.enqueue(
      this.encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`),
    );
    controller.enqueue(this.encoder.encode('data: [DONE]\n\n'));
    controller.close();
  }

  /**
   * 发送单个 chunk
   */
  private sendChunk(
    controller: ReadableStreamDefaultController<Uint8Array>,
    chunk: ChatCompletionChunk,
  ): void {
    controller.enqueue(
      this.encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`),
    );
  }

  /**
   * 创建初始 chunk
   */
  private createInitialChunk(context: StreamContext): ChatCompletionChunk {
    return {
      id: context.id,
      object: 'chat.completion.chunk',
      created: context.created,
      model: context.model,
      choices: [
        {
          index: 0,
          delta: { role: 'assistant', content: '' },
          finish_reason: null,
        },
      ],
    };
  }

  /**
   * 创建 reasoning 增量 chunk（思考模型）
   */
  private createReasoningDeltaChunk(
    context: StreamContext,
    reasoningContent: string,
  ): ChatCompletionChunk {
    return {
      id: context.id,
      object: 'chat.completion.chunk',
      created: context.created,
      model: context.model,
      choices: [
        {
          index: 0,
          delta: { reasoning_content: reasoningContent },
          finish_reason: null,
        },
      ],
    };
  }

  /**
   * 创建 reasoning_details 增量 chunk（新格式）
   */
  private createReasoningDetailsChunk(
    context: StreamContext,
    reasoningDetails: ReasoningDetail[],
  ): ChatCompletionChunk {
    return {
      id: context.id,
      object: 'chat.completion.chunk',
      created: context.created,
      model: context.model,
      choices: [
        {
          index: 0,
          delta: { reasoning_details: reasoningDetails },
          finish_reason: null,
        },
      ],
    };
  }

  /**
   * 创建文本增量 chunk
   */
  private createTextDeltaChunk(
    context: StreamContext,
    content: string,
  ): ChatCompletionChunk {
    return {
      id: context.id,
      object: 'chat.completion.chunk',
      created: context.created,
      model: context.model,
      choices: [
        {
          index: 0,
          delta: { content },
          finish_reason: null,
        },
      ],
    };
  }

  /**
   * 创建工具调用 chunk
   */
  private createToolCallChunk(
    context: StreamContext,
    toolCall: { index: number; id: string; name: string; arguments: string },
  ): ChatCompletionChunk {
    return {
      id: context.id,
      object: 'chat.completion.chunk',
      created: context.created,
      model: context.model,
      choices: [
        {
          index: 0,
          delta: {
            tool_calls: [
              {
                index: toolCall.index,
                id: toolCall.id,
                type: 'function',
                function: {
                  name: toolCall.name,
                  arguments: toolCall.arguments,
                },
              },
            ],
          },
          finish_reason: null,
        },
      ],
    };
  }

  /**
   * 创建最终 chunk
   */
  private createFinalChunk(
    context: StreamContext,
    finishReason: FinishReason,
    usage: TokenUsage,
  ): ChatCompletionChunk {
    return {
      id: context.id,
      object: 'chat.completion.chunk',
      created: context.created,
      model: context.model,
      choices: [
        {
          index: 0,
          delta: {},
          finish_reason: finishReason,
        },
      ],
      usage,
    };
  }

  /**
   * 转换内部 usage 格式为 OpenAI 格式
   */
  private toOpenAIUsage(usage: InternalTokenUsage): TokenUsage {
    return {
      prompt_tokens: usage.promptTokens,
      completion_tokens: usage.completionTokens,
      total_tokens: usage.totalTokens,
    };
  }
}
