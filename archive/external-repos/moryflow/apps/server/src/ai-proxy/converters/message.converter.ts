/**
 * 消息格式转换器
 * 负责 OpenAI 消息格式与 AI SDK 消息格式之间的转换
 */

import type {
  Message,
  MessageContentPart,
  ReasoningDetail,
  AISDKMessage,
  AISDKSystemMessage,
  AISDKUserMessage,
  AISDKUserContentPart,
  AISDKAssistantTextMessage,
  AISDKAssistantToolCallMessage,
  AISDKToolResultMessage,
} from '../dto';

/** 工具调用 ID 到名称的映射 */
type ToolCallIdToNameMap = Map<string, string>;

/**
 * 消息转换器
 * 将 OpenAI 格式的消息转换为 AI SDK 格式
 */
export class MessageConverter {
  /**
   * 将 OpenAI 消息数组转换为 AI SDK 消息数组
   */
  static convert(messages: Message[]): AISDKMessage[] {
    // 先收集所有 tool_calls 的 ID -> name 映射
    const toolCallMap = this.buildToolCallMap(messages);

    return messages.map((msg) => this.convertMessage(msg, toolCallMap));
  }

  /**
   * 构建 tool_call_id 到 toolName 的映射
   * AI SDK 的 tool-result 需要 toolName，但 OpenAI 格式的 tool 消息只有 tool_call_id
   */
  private static buildToolCallMap(messages: Message[]): ToolCallIdToNameMap {
    const map = new Map<string, string>();

    for (const msg of messages) {
      if (msg.role === 'assistant' && msg.tool_calls) {
        for (const tc of msg.tool_calls) {
          map.set(tc.id, tc.function.name);
        }
      }
    }

    return map;
  }

  /**
   * 转换单条消息
   */
  private static convertMessage(
    msg: Message,
    toolCallMap: ToolCallIdToNameMap,
  ): AISDKMessage {
    switch (msg.role) {
      case 'system':
        return this.convertSystemMessage(msg);
      case 'user':
        return this.convertUserMessage(msg);
      case 'assistant':
        return this.convertAssistantMessage(msg);
      case 'tool':
        return this.convertToolMessage(msg, toolCallMap);
      default:
        // TypeScript 确保这里不会到达
        throw new Error(`Unknown message role: ${msg.role}`);
    }
  }

  /**
   * 转换 system 消息
   */
  private static convertSystemMessage(msg: Message): AISDKSystemMessage {
    return {
      role: 'system',
      content: this.extractTextContent(msg.content),
    };
  }

  /**
   * 转换 user 消息
   * 支持纯文本和多模态（文本+图片）
   */
  private static convertUserMessage(msg: Message): AISDKUserMessage {
    // 如果是字符串或 null/undefined，返回纯文本
    if (
      msg.content === null ||
      msg.content === undefined ||
      typeof msg.content === 'string'
    ) {
      return {
        role: 'user',
        content: msg.content ?? '',
      };
    }

    // 如果是内容数组，检查是否包含图片
    const hasImage = msg.content.some((part) => part.type === 'image_url');

    if (!hasImage) {
      // 纯文本数组，提取文本
      return {
        role: 'user',
        content: this.extractTextContent(msg.content),
      };
    }

    // 多模态内容：转换为 AI SDK 格式
    const contentParts: AISDKUserContentPart[] = [];

    for (const part of msg.content) {
      if (part.type === 'text') {
        contentParts.push({ type: 'text', text: part.text });
      } else if (part.type === 'image_url') {
        contentParts.push({ type: 'image', image: part.image_url.url });
      }
    }

    return {
      role: 'user',
      content: contentParts,
    };
  }

  /**
   * 转换 assistant 消息
   * 可能是纯文本或包含 tool_calls
   */
  private static convertAssistantMessage(
    msg: Message,
  ): AISDKAssistantTextMessage | AISDKAssistantToolCallMessage {
    const hasToolCalls = msg.tool_calls && msg.tool_calls.length > 0;

    if (hasToolCalls) {
      const result: AISDKAssistantToolCallMessage & {
        reasoning_details?: ReasoningDetail[];
      } = {
        role: 'assistant',
        content: msg.tool_calls!.map((tc) => ({
          type: 'tool-call' as const,
          toolCallId: tc.id,
          toolName: tc.function.name,
          input: this.safeParseJson(tc.function.arguments),
        })),
      };

      // 透传 reasoning_details（保持推理连续性）
      if (msg.reasoning_details?.length) {
        result.reasoning_details = msg.reasoning_details;
      }

      return result;
    }

    // 普通文本消息
    const result: AISDKAssistantTextMessage & {
      reasoning_details?: ReasoningDetail[];
    } = {
      role: 'assistant',
      content: this.extractTextContent(msg.content),
    };

    // 透传 reasoning_details
    if (msg.reasoning_details?.length) {
      result.reasoning_details = msg.reasoning_details;
    }

    return result;
  }

  /**
   * 转换 tool 消息（工具执行结果）
   */
  private static convertToolMessage(
    msg: Message,
    toolCallMap: ToolCallIdToNameMap,
  ): AISDKToolResultMessage {
    const toolCallId = msg.tool_call_id || '';
    const toolName = toolCallMap.get(toolCallId) || 'unknown';
    const textContent = this.extractTextContent(msg.content);

    return {
      role: 'tool',
      content: [
        {
          type: 'tool-result',
          toolCallId,
          toolName,
          // AI SDK v5 需要结构化的 output 格式
          output: { type: 'text', value: textContent },
        },
      ],
    };
  }

  /**
   * 提取文本内容
   * 处理字符串、内容数组、null 等不同格式
   */
  private static extractTextContent(
    content: string | MessageContentPart[] | null | undefined,
  ): string {
    if (content === null || content === undefined) {
      return '';
    }

    if (typeof content === 'string') {
      return content;
    }

    // 从内容数组中提取所有文本部分
    return content
      .filter(
        (part): part is { type: 'text'; text: string } => part.type === 'text',
      )
      .map((part) => part.text)
      .join('');
  }

  /**
   * 安全解析 JSON 字符串
   */
  private static safeParseJson(str: string): unknown {
    try {
      return JSON.parse(str);
    } catch {
      return {};
    }
  }
}
