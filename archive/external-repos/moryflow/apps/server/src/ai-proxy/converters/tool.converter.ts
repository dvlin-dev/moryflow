/**
 * 工具格式转换器
 * 负责 OpenAI tools 格式与 AI SDK ToolSet 格式之间的转换
 */

import { jsonSchema, type ToolSet } from 'ai';
import type { ToolFunction, ToolChoice, AISDKToolChoice } from '../dto';

/**
 * 工具转换器
 * 将 OpenAI 格式的 tools 和 tool_choice 转换为 AI SDK 格式
 */
export class ToolConverter {
  /**
   * 将 OpenAI tools 转换为 AI SDK ToolSet
   * 注意：后端不执行工具，只传递 schema 给模型
   */
  static convertTools(tools?: ToolFunction[]): ToolSet | undefined {
    if (!tools || tools.length === 0) {
      return undefined;
    }

    const result: Record<
      string,
      { description?: string; inputSchema: unknown }
    > = {};

    for (const tool of tools) {
      if (tool.type === 'function') {
        // 使用 jsonSchema() 包装原始 JSON Schema
        // 这样 AI SDK 能正确识别并传递给模型
        const schema = tool.function.parameters || {
          type: 'object',
          properties: {},
        };
        result[tool.function.name] = {
          description: tool.function.description,
          inputSchema: jsonSchema(schema as Parameters<typeof jsonSchema>[0]),
        };
      }
    }

    return Object.keys(result).length > 0 ? (result as ToolSet) : undefined;
  }

  /**
   * 将 OpenAI tool_choice 转换为 AI SDK 格式
   */
  static convertToolChoice(
    toolChoice?: ToolChoice,
  ): AISDKToolChoice | undefined {
    if (!toolChoice) {
      return undefined;
    }

    // 字符串类型：'auto' | 'none' | 'required'
    if (typeof toolChoice === 'string') {
      return toolChoice;
    }

    // 对象类型：指定特定工具
    if (toolChoice.type === 'function') {
      return {
        type: 'tool',
        toolName: toolChoice.function.name,
      };
    }

    return undefined;
  }
}
