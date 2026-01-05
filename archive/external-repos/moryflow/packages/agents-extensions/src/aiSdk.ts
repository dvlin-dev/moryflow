import type {
  JSONSchema7,
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3Content,
  LanguageModelV3FunctionTool,
  LanguageModelV3Message,
  LanguageModelV3Prompt,
  LanguageModelV3ProviderTool,
  LanguageModelV3StreamPart,
  LanguageModelV3Text,
  LanguageModelV3ToolCall,
  LanguageModelV3ToolCallPart,
  LanguageModelV3ToolChoice,
  LanguageModelV3ToolResultPart,
  LanguageModelV3Usage,
} from '@ai-sdk/provider';
import {
  createGenerationSpan,
  Model,
  ModelRequest,
  ModelResponse,
  protocol,
  resetCurrentSpan,
  ResponseStreamEvent,
  SerializedHandoff,
  SerializedOutputType,
  SerializedTool,
  setCurrentSpan,
  Usage,
  UserError,
  withGenerationSpan,
  getLogger,
  ModelSettingsToolChoice,
} from '@moryflow/agents';
import { isZodObject } from '@moryflow/agents/utils';
import { encodeUint8ArrayToBase64 } from '@moryflow/agents/utils';

/**
 * 从 AI SDK v6 的 LanguageModelV3Usage 中提取 token 数量
 * v6 使用嵌套对象格式: { inputTokens: { total, ... }, outputTokens: { total, ... } }
 */
function extractTokenCounts(usage: LanguageModelV3Usage): {
  inputTokens: number;
  outputTokens: number;
} {
  const { inputTokens, outputTokens } = usage;
  return {
    inputTokens: inputTokens?.total ?? 0,
    outputTokens: outputTokens?.total ?? 0,
  };
}

// ============ 类型守卫函数 ============

/** 检查 LanguageModelV3Content 是否为 tool-call 类型 */
function isToolCallContent(
  content: LanguageModelV3Content,
): content is LanguageModelV3ToolCall {
  return content.type === 'tool-call';
}

/** 检查 LanguageModelV3Content 是否为 text 类型 */
function isTextContent(
  content: LanguageModelV3Content,
): content is LanguageModelV3Text {
  return content.type === 'text';
}

// ============ StreamPart 类型提取 ============

type TextDeltaPart = Extract<LanguageModelV3StreamPart, { type: 'text-delta' }>;
type ToolCallPart = Extract<LanguageModelV3StreamPart, { type: 'tool-call' }>;
type ResponseMetadataPart = Extract<
  LanguageModelV3StreamPart,
  { type: 'response-metadata' }
>;
type FinishPart = Extract<LanguageModelV3StreamPart, { type: 'finish' }>;

/**
 * @internal
 * Converts a list of model items to a list of language model messages.
 *
 * @param items - The items to convert.
 * @returns The list of language model messages.
 */
export function itemsToLanguageModelMessages(
  items: protocol.ModelItem[],
): LanguageModelV3Message[] {
  const messages: LanguageModelV3Message[] = [];
  let currentAssistantMessage: LanguageModelV3Message | undefined;

  for (const item of items) {
    if (item.type === 'message' || typeof item.type === 'undefined') {
      const { role, content, providerData } = item;
      if (role === 'system') {
        messages.push({
          role: 'system',
          content: content,
          providerOptions: {
            ...(providerData ?? {}),
          },
        });
        continue;
      }

      if (role === 'user') {
        messages.push({
          role,
          content:
            typeof content === 'string'
              ? [{ type: 'text', text: content }]
              : content.map((c) => {
                  const { providerData: contentProviderData } = c;
                  if (c.type === 'input_text') {
                    return {
                      type: 'text',
                      text: c.text,
                      providerOptions: {
                        ...(contentProviderData ?? {}),
                      },
                    };
                  }
                  if (c.type === 'input_image') {
                    if (typeof c.image !== 'string') {
                      throw new UserError(
                        'Only image URLs/base64 strings are supported for user inputs.',
                      );
                    }

                    const url = new URL(c.image);
                    return {
                      type: 'file',
                      data: url,
                      mediaType: 'image/*',
                      providerOptions: {
                        ...(contentProviderData ?? {}),
                      },
                    };
                  }
                  if (c.type === 'input_file') {
                    throw new UserError('File inputs are not supported.');
                  }
                  throw new UserError(`Unknown content type: ${c.type}`);
                }),
          providerOptions: {
            ...(providerData ?? {}),
          },
        });
        continue;
      }

      if (role === 'assistant') {
        if (currentAssistantMessage) {
          messages.push(currentAssistantMessage);
          currentAssistantMessage = undefined;
        }

        messages.push({
          role,
          content: content
            .filter((c) => c.type === 'output_text')
            .map((c) => {
              const { providerData: contentProviderData } = c;
              return {
                type: 'text',
                text: c.text,
                providerOptions: {
                  ...(contentProviderData ?? {}),
                },
              };
            }),
          providerOptions: {
            ...(providerData ?? {}),
          },
        });
        continue;
      }

      const exhaustiveMessageTypeCheck = item satisfies never;
      throw new Error(`Unknown message type: ${exhaustiveMessageTypeCheck}`);
    } else if (item.type === 'function_call') {
      if (!currentAssistantMessage) {
        currentAssistantMessage = {
          role: 'assistant',
          content: [],
          providerOptions: {
            ...(item.providerData ?? {}),
          },
        };
      }
      if (
        Array.isArray(currentAssistantMessage.content) &&
        currentAssistantMessage.role === 'assistant'
      ) {
        const content: LanguageModelV3ToolCallPart = {
          type: 'tool-call',
          toolCallId: item.callId,
          toolName: item.name,
          input: parseArguments(item.arguments),
          providerOptions: {
            ...(item.providerData ?? {}),
          },
        };
        currentAssistantMessage.content.push(content);
      }
      continue;
    } else if (item.type === 'function_call_result') {
      if (currentAssistantMessage) {
        messages.push(currentAssistantMessage);
        currentAssistantMessage = undefined;
      }
      const toolResult: LanguageModelV3ToolResultPart = {
        type: 'tool-result',
        toolCallId: item.callId,
        toolName: item.name,
        output: convertToAiSdkOutput(item.output),
        providerOptions: {
          ...(item.providerData ?? {}),
        },
      };
      messages.push({
        role: 'tool',
        content: [toolResult],
        providerOptions: {
          ...(item.providerData ?? {}),
        },
      });
      continue;
    }

    if (item.type === 'hosted_tool_call') {
      throw new UserError('Hosted tool calls are not supported');
    }

    if (item.type === 'computer_call') {
      throw new UserError('Computer calls are not supported');
    }

    if (item.type === 'computer_call_result') {
      throw new UserError('Computer call results are not supported');
    }

    if (item.type === 'shell_call') {
      throw new UserError('Shell calls are not supported');
    }

    if (item.type === 'shell_call_output') {
      throw new UserError('Shell call results are not supported');
    }

    if (item.type === 'apply_patch_call') {
      throw new UserError('Apply patch calls are not supported');
    }

    if (item.type === 'apply_patch_call_output') {
      throw new UserError('Apply patch call results are not supported');
    }

    if (
      item.type === 'reasoning' &&
      item.content.length > 0 &&
      typeof item.content[0].text === 'string'
    ) {
      messages.push({
        role: 'assistant',
        content: [
          {
            type: 'reasoning',
            text: item.content[0].text,
            providerOptions: { ...(item.providerData ?? {}) },
          },
        ],
        providerOptions: {
          ...(item.providerData ?? {}),
        },
      });
      continue;
    }

    if (item.type === 'unknown') {
      messages.push({ ...(item.providerData ?? {}) } as LanguageModelV3Message);
      continue;
    }

    if (item) {
      throw new UserError(`Unknown item type: ${item.type}`);
    }

    const itemType = item satisfies never;
    throw new UserError(`Unknown item type: ${itemType}`);
  }

  if (currentAssistantMessage) {
    messages.push(currentAssistantMessage);
  }

  return messages;
}

/**
 * @internal
 * Converts a handoff to a language model tool.
 *
 * @param handoff - The handoff to convert.
 */
function handoffToLanguageModelTool(
  handoff: SerializedHandoff,
): LanguageModelV3FunctionTool {
  return {
    type: 'function',
    name: handoff.toolName,
    description: handoff.toolDescription,
    inputSchema: handoff.inputJsonSchema as JSONSchema7,
  };
}

function convertToAiSdkOutput(
  output: protocol.FunctionCallResultItem['output'],
): LanguageModelV3ToolResultPart['output'] {
  if (typeof output === 'string') {
    return { type: 'text', value: output };
  }
  if (Array.isArray(output)) {
    return convertStructuredOutputsToAiSdkOutput(output);
  }
  if (isRecord(output) && typeof output.type === 'string') {
    if (output.type === 'text' && typeof output.text === 'string') {
      return { type: 'text', value: output.text };
    }
    if (output.type === 'image' || output.type === 'file') {
      const structuredOutputs = convertLegacyToolOutputContent(
        output as protocol.ToolCallOutputContent,
      );
      return convertStructuredOutputsToAiSdkOutput(structuredOutputs);
    }
  }
  return { type: 'text', value: String(output) };
}

/**
 * Normalises legacy ToolOutput* objects into the protocol `input_*` shapes so that the AI SDK
 * bridge can treat all tool results uniformly.
 */
function convertLegacyToolOutputContent(
  output: protocol.ToolCallOutputContent,
): protocol.ToolCallStructuredOutput[] {
  if (output.type === 'text') {
    const structured: protocol.InputText = {
      type: 'input_text',
      text: output.text,
    };
    if (output.providerData) {
      structured.providerData = output.providerData;
    }
    return [structured];
  }

  if (output.type === 'image') {
    const structured: protocol.InputImage = { type: 'input_image' };

    if (output.detail) {
      structured.detail = output.detail;
    }

    if (typeof output.image === 'string' && output.image.length > 0) {
      structured.image = output.image;
    } else if (output.image && typeof output.image === 'object') {
      // image 是 { data, mediaType? } | { url } | { fileId } 的联合类型
      if ('url' in output.image && typeof output.image.url === 'string') {
        structured.image = output.image.url;
      } else if ('data' in output.image) {
        const mediaType =
          'mediaType' in output.image ? output.image.mediaType : undefined;
        if (typeof output.image.data === 'string' && output.image.data.length > 0) {
          structured.image = formatInlineData(output.image.data, mediaType);
        } else if (
          output.image.data instanceof Uint8Array &&
          output.image.data.length > 0
        ) {
          structured.image = formatInlineData(output.image.data, mediaType);
        }
      } else if ('fileId' in output.image && typeof output.image.fileId === 'string') {
        structured.image = { id: output.image.fileId };
      }
    }
    if (output.providerData) {
      structured.providerData = output.providerData;
    }
    return [structured];
  }

  if (output.type === 'file') {
    return [];
  }
  throw new UserError(
    `Unsupported tool output type: ${JSON.stringify(output)}`,
  );
}

function schemaAcceptsObject(schema: JSONSchema7 | undefined): boolean {
  if (!schema) {
    return false;
  }
  const schemaType = schema.type;
  if (Array.isArray(schemaType)) {
    if (schemaType.includes('object')) {
      return true;
    }
  } else if (schemaType === 'object') {
    return true;
  }
  return Boolean(schema.properties || schema.additionalProperties);
}

function expectsObjectArguments(
  tool: SerializedTool | SerializedHandoff | undefined,
): boolean {
  if (!tool) {
    return false;
  }
  if ('toolName' in tool) {
    return schemaAcceptsObject(tool.inputJsonSchema as JSONSchema7 | undefined);
  }
  if (tool.type === 'function') {
    return schemaAcceptsObject(tool.parameters as JSONSchema7 | undefined);
  }
  return false;
}

/**
 * Maps the protocol-level structured outputs into the Language Model V2 result primitives.
 * The AI SDK expects either plain text or content parts (text + media), so we merge multiple
 * items accordingly.
 */
function convertStructuredOutputsToAiSdkOutput(
  outputs: protocol.ToolCallStructuredOutput[],
): LanguageModelV3ToolResultPart['output'] {
  const textParts: string[] = [];
  const mediaParts: Array<{ type: 'image-data'; data: string; mediaType: string }> =
    [];

  for (const item of outputs) {
    if (item.type === 'input_text') {
      textParts.push(item.text);
      continue;
    }
    if (item.type === 'input_image') {
      if (typeof item.image === 'string') {
        try {
          const url = new URL(item.image);
          mediaParts.push({
            type: 'image-data',
            data: url.toString(),
            mediaType: 'image/*',
          });
        } catch {
          // 非 URL 字符串（如 base64），作为文本处理
          textParts.push(item.image);
        }
      } else if (isRecord(item.image) && typeof item.image.id === 'string') {
        // OpenAI file ID
        textParts.push(`[image file_id=${item.image.id}]`);
      } else {
        textParts.push('[image]');
      }
      continue;
    }

    if (item.type === 'input_file') {
      textParts.push('[file output skipped]');
      continue;
    }
  }

  if (mediaParts.length === 0) {
    return { type: 'text', value: textParts.join('') };
  }

  const value: Array<
    | { type: 'text'; text: string }
    | { type: 'image-data'; data: string; mediaType: string }
  > = [];

  if (textParts.length > 0) {
    value.push({ type: 'text', text: textParts.join('') });
  }
  value.push(...mediaParts);
  return { type: 'content', value };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function formatInlineData(
  data: string | Uint8Array,
  mediaType?: string,
): string {
  const base64 =
    typeof data === 'string' ? data : encodeUint8ArrayToBase64(data);
  return mediaType ? `data:${mediaType};base64,${base64}` : base64;
}

/**
 * @internal
 * Converts a tool to a language model tool.
 *
 * @param model - The model to use.
 * @param tool - The tool to convert.
 */
export function toolToLanguageModelTool(
  model: LanguageModelV3,
  tool: SerializedTool,
): LanguageModelV3FunctionTool | LanguageModelV3ProviderTool {
  if (tool.type === 'function') {
    return {
      type: 'function',
      name: tool.name,
      description: tool.description,
      inputSchema: tool.parameters as JSONSchema7,
    };
  }

  if (tool.type === 'hosted_tool') {
    return {
      type: 'provider',
      id: `${model.provider}.${tool.name}`,
      name: tool.name,
      args: tool.providerData?.args ?? {},
    };
  }

  if (tool.type === 'computer') {
    return {
      type: 'provider',
      id: `${model.provider}.${tool.name}`,
      name: tool.name,
      args: {
        environment: tool.environment,
        display_width: tool.dimensions[0],
        display_height: tool.dimensions[1],
      },
    };
  }

  throw new Error(`Unsupported tool type: ${JSON.stringify(tool)}`);
}

/**
 * @internal
 * Converts an output type to a language model V2 response format.
 *
 * @param outputType - The output type to convert.
 * @returns The language model V2 response format.
 */
export function getResponseFormat(
  outputType: SerializedOutputType,
): LanguageModelV3CallOptions['responseFormat'] {
  if (outputType === 'text') {
    return {
      type: 'text',
    };
  }

  return {
    type: 'json',
    name: outputType.name,
    schema: outputType.schema,
  };
}

/**
 * Wraps a model from the AI SDK that adheres to the LanguageModelV3 spec to be used used as a model
 * in the OpenAI Agents SDK to use other models.
 *
 * While you can use this with the OpenAI models, it is recommended to use the default OpenAI model
 * provider instead.
 *
 * If tracing is enabled, the model will send generation spans to your traces processor.
 *
 * ```ts
 * import { aisdk } from '@moryflow/agents-extensions';
 * import { openai } from '@ai-sdk/openai';
 *
 * const model = aisdk(openai('gpt-4o'));
 *
 * const agent = new Agent({
 *   name: 'My Agent',
 *   model
 * });
 * ```
 *
 * @param model - The Vercel AI SDK model to wrap.
 * @returns The wrapped model.
 */
export class AiSdkModel implements Model {
  #model: LanguageModelV3;
  #logger = getLogger('openai-agents:extensions:ai-sdk');
  constructor(model: LanguageModelV3) {
    this.#model = model;
  }

  async getResponse(request: ModelRequest) {
    return withGenerationSpan(async (span) => {
      try {
        span.spanData.model = this.#model.provider + ':' + this.#model.modelId;
        span.spanData.model_config = {
          provider: this.#model.provider,
          model_impl: 'ai-sdk',
        };

        let input: LanguageModelV3Prompt =
          typeof request.input === 'string'
            ? [
                {
                  role: 'user',
                  content: [{ type: 'text', text: request.input }],
                },
              ]
            : itemsToLanguageModelMessages(request.input);

        if (request.systemInstructions) {
          input = [
            {
              role: 'system',
              content: request.systemInstructions,
            },
            ...input,
          ];
        }

        const tools = request.tools.map((tool) =>
          toolToLanguageModelTool(this.#model, tool),
        );

        request.handoffs.forEach((handoff) => {
          tools.push(handoffToLanguageModelTool(handoff));
        });

        if (span && request.tracing === true) {
          span.spanData.input = input;
        }

        if (isZodObject(request.outputType)) {
          throw new UserError('Zod output type is not yet supported');
        }

        const responseFormat: LanguageModelV3CallOptions['responseFormat'] =
          getResponseFormat(request.outputType);

        const aiSdkRequest: LanguageModelV3CallOptions = {
          tools,
          toolChoice: toolChoiceToLanguageModelFormat(
            request.modelSettings.toolChoice,
          ),
          prompt: input,
          temperature: request.modelSettings.temperature,
          topP: request.modelSettings.topP,
          frequencyPenalty: request.modelSettings.frequencyPenalty,
          presencePenalty: request.modelSettings.presencePenalty,
          maxOutputTokens: request.modelSettings.maxTokens,
          responseFormat,
          abortSignal: request.signal,

          ...(request.modelSettings.providerData ?? {}),
        };

        if (this.#logger.dontLogModelData) {
          this.#logger.debug('Request sent');
        } else {
          this.#logger.debug('Request:', JSON.stringify(aiSdkRequest, null, 2));
        }

        const result = await this.#model.doGenerate(aiSdkRequest);

        const output: ModelResponse['output'] = [];

        const resultContent: LanguageModelV3Content[] = result.content;
        const toolCalls = resultContent.filter(isToolCallContent);
        const hasToolCalls = toolCalls.length > 0;

        const toolsNameToToolMap = new Map<
          string,
          SerializedTool | SerializedHandoff
        >(request.tools.map((tool) => [tool.name, tool] as const));

        for (const handoff of request.handoffs) {
          toolsNameToToolMap.set(handoff.toolName, handoff);
        }
        for (const toolCall of toolCalls) {
          const requestedTool = toolsNameToToolMap.get(toolCall.toolName);

          if (!requestedTool && toolCall.toolName) {
            this.#logger.warn(
              `Received tool call for unknown tool '${toolCall.toolName}'.`,
            );
          }

          let toolCallArguments: string;
          if (typeof toolCall.input === 'string') {
            toolCallArguments =
              toolCall.input === '' && expectsObjectArguments(requestedTool)
                ? JSON.stringify({})
                : toolCall.input;
          } else {
            // AI SDK v6 的 input 总是 string，这里保留逻辑兼容性
            toolCallArguments = JSON.stringify(toolCall.input ?? {});
          }
          output.push({
            type: 'function_call',
            callId: toolCall.toolCallId,
            name: toolCall.toolName,
            arguments: toolCallArguments,
            status: 'completed',
            providerData:
              toolCall.providerMetadata ??
              (hasToolCalls ? result.providerMetadata : undefined),
          });
        }

        // Some of other platforms may return both tool calls and text.
        // Putting a text message here will let the agent loop to complete,
        // so adding this item only when the tool calls are empty.
        // Note that the same support is not available for streaming mode.
        if (!hasToolCalls) {
          const textItem = resultContent.find(isTextContent);
          if (textItem) {
            output.push({
              type: 'message',
              content: [{ type: 'output_text', text: textItem.text }],
              role: 'assistant',
              status: 'completed',
              providerData: result.providerMetadata,
            });
          }
        }

        if (span && request.tracing === true) {
          span.spanData.output = output;
        }

        const { inputTokens, outputTokens } = extractTokenCounts(result.usage);

        const response = {
          responseId: result.response?.id ?? 'FAKE_ID',
          usage: new Usage({
            inputTokens,
            outputTokens,
            totalTokens: inputTokens + outputTokens,
          }),
          output,
          providerData: result,
        } as const;

        if (span && request.tracing === true) {
          span.spanData.usage = {
            // Note that tracing supports only input and output tokens for Chat Completions.
            // So, we don't include other properties here.
            input_tokens: response.usage.inputTokens,
            output_tokens: response.usage.outputTokens,
          };
        }

        if (this.#logger.dontLogModelData) {
          this.#logger.debug('Response ready');
        } else {
          this.#logger.debug('Response:', JSON.stringify(response, null, 2));
        }

        return response;
      } catch (error) {
        if (error instanceof Error) {
          span.setError({
            message: request.tracing === true ? error.message : 'Unknown error',
            data: {
              error:
                request.tracing === true
                  ? String(error)
                  : error instanceof Error
                    ? error.name
                    : undefined,
            },
          });
        } else {
          span.setError({
            message: 'Unknown error',
            data: {
              error:
                request.tracing === true
                  ? String(error)
                  : error instanceof Error
                    ? error.name
                    : undefined,
            },
          });
        }
        throw error;
      }
    });
  }

  async *getStreamedResponse(
    request: ModelRequest,
  ): AsyncIterable<ResponseStreamEvent> {
    const span = request.tracing ? createGenerationSpan() : undefined;
    try {
      if (span) {
        span.start();
        setCurrentSpan(span);
      }

      if (span?.spanData) {
        span.spanData.model = this.#model.provider + ':' + this.#model.modelId;
        span.spanData.model_config = {
          provider: this.#model.provider,
          model_impl: 'ai-sdk',
        };
      }

      let input: LanguageModelV3Prompt =
        typeof request.input === 'string'
          ? [
              {
                role: 'user',
                content: [{ type: 'text', text: request.input }],
              },
            ]
          : itemsToLanguageModelMessages(request.input);

      if (request.systemInstructions) {
        input = [
          {
            role: 'system',
            content: request.systemInstructions,
          },
          ...input,
        ];
      }

      const tools = request.tools.map((tool) =>
        toolToLanguageModelTool(this.#model, tool),
      );

      request.handoffs.forEach((handoff) => {
        tools.push(handoffToLanguageModelTool(handoff));
      });

      if (span && request.tracing === true) {
        span.spanData.input = input;
      }

      const responseFormat: LanguageModelV3CallOptions['responseFormat'] =
        getResponseFormat(request.outputType);

      const aiSdkRequest: LanguageModelV3CallOptions = {
        tools,
        prompt: input,
        temperature: request.modelSettings.temperature,
        topP: request.modelSettings.topP,
        frequencyPenalty: request.modelSettings.frequencyPenalty,
        presencePenalty: request.modelSettings.presencePenalty,
        maxOutputTokens: request.modelSettings.maxTokens,
        responseFormat,
        abortSignal: request.signal,
        ...(request.modelSettings.providerData ?? {}),
      };

      if (this.#logger.dontLogModelData) {
        this.#logger.debug('Request received (streamed)');
      } else {
        this.#logger.debug(
          'Request (streamed):',
          JSON.stringify(aiSdkRequest, null, 2),
        );
      }

      const { stream } = await this.#model.doStream(aiSdkRequest);

      let started = false;
      let responseId: string | undefined;
      let usagePromptTokens = 0;
      let usageCompletionTokens = 0;
      const functionCalls: Record<string, protocol.FunctionCallItem> = {};
      let textOutput: protocol.OutputText | undefined;

      for await (const part of stream) {
        if (!started) {
          started = true;
          yield { type: 'response_started' };
        }

        yield { type: 'model', event: part };

        switch (part.type) {
          case 'text-delta': {
            const textDeltaPart = part as TextDeltaPart;
            if (!textOutput) {
              textOutput = { type: 'output_text', text: '' };
            }
            textOutput.text += textDeltaPart.delta;
            yield { type: 'output_text_delta', delta: textDeltaPart.delta };
            break;
          }
          case 'tool-call': {
            const toolCallPart = part as ToolCallPart;
            const toolCallId = toolCallPart.toolCallId;
            if (toolCallId) {
              // AI SDK v6 的 input 是 string 类型
              const toolCallArguments = toolCallPart.input;
              functionCalls[toolCallId] = {
                type: 'function_call',
                callId: toolCallId,
                name: toolCallPart.toolName,
                arguments: toolCallArguments,
                status: 'completed',
                ...(toolCallPart.providerMetadata
                  ? { providerData: toolCallPart.providerMetadata }
                  : {}),
              };
            }
            break;
          }
          case 'response-metadata': {
            const metadataPart = part as ResponseMetadataPart;
            if (metadataPart.id) {
              responseId = metadataPart.id;
            }
            break;
          }
          case 'finish': {
            const finishPart = part as FinishPart;
            const { inputTokens, outputTokens } = extractTokenCounts(
              finishPart.usage,
            );
            usagePromptTokens = inputTokens;
            usageCompletionTokens = outputTokens;
            break;
          }
          case 'error': {
            throw part.error;
          }
          default:
            break;
        }
      }

      const outputs: protocol.OutputModelItem[] = [];
      if (textOutput) {
        outputs.push({
          type: 'message',
          role: 'assistant',
          content: [textOutput],
          status: 'completed',
        });
      }
      for (const fc of Object.values(functionCalls)) {
        outputs.push(fc);
      }

      const finalEvent: protocol.StreamEventResponseCompleted = {
        type: 'response_done',
        response: {
          id: responseId ?? 'FAKE_ID',
          usage: {
            inputTokens: usagePromptTokens,
            outputTokens: usageCompletionTokens,
            totalTokens: usagePromptTokens + usageCompletionTokens,
          },
          output: outputs,
        },
      };

      if (span && request.tracing === true) {
        span.spanData.output = outputs;
        span.spanData.usage = {
          // Note that tracing supports only input and output tokens for Chat Completions.
          // So, we don't include other properties here.
          input_tokens: finalEvent.response.usage.inputTokens,
          output_tokens: finalEvent.response.usage.outputTokens,
        };
      }

      if (this.#logger.dontLogModelData) {
        this.#logger.debug('Response ready (streamed)');
      } else {
        this.#logger.debug(
          'Response (streamed):',
          JSON.stringify(finalEvent.response, null, 2),
        );
      }

      yield finalEvent;
    } catch (error) {
      if (span) {
        span.setError({
          message: 'Error streaming response',
          data: {
            error:
              request.tracing === true
                ? String(error)
                : error instanceof Error
                  ? error.name
                  : undefined,
          },
        });
      }
      throw error;
    } finally {
      if (span) {
        span.end();
        resetCurrentSpan();
      }
    }
  }
}

/**
 * Wraps a model from the AI SDK that adheres to the LanguageModelV3 spec to be used used as a model
 * in the OpenAI Agents SDK to use other models.
 *
 * While you can use this with the OpenAI models, it is recommended to use the default OpenAI model
 * provider instead.
 *
 * If tracing is enabled, the model will send generation spans to your traces processor.
 *
 * ```ts
 * import { aisdk } from '@moryflow/agents-extensions';
 * import { openai } from '@ai-sdk/openai';
 *
 * const model = aisdk(openai('gpt-4o'));
 *
 * const agent = new Agent({
 *   name: 'My Agent',
 *   model
 * });
 * ```
 *
 * @param model - The Vercel AI SDK model to wrap.
 * @returns The wrapped model.
 */
export function aisdk(model: LanguageModelV3) {
  return new AiSdkModel(model);
}

export function parseArguments(args: string | undefined | null): unknown {
  if (!args) {
    return {};
  }

  try {
    return JSON.parse(args) as unknown;
  } catch (_) {
    return {};
  }
}

export function toolChoiceToLanguageModelFormat(
  toolChoice: ModelSettingsToolChoice | undefined,
): LanguageModelV3ToolChoice | undefined {
  if (!toolChoice) {
    return undefined;
  }
  switch (toolChoice) {
    case 'auto':
      return { type: 'auto' };
    case 'required':
      return { type: 'required' };
    case 'none':
      return { type: 'none' };
    default:
      return { type: 'tool', toolName: toolChoice };
  }
}
