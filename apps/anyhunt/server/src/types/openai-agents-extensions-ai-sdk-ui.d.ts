/**
 * [DEFINES]: `@openai/agents-extensions/ai-sdk-ui` 本地类型声明（moduleResolution=node 兼容）
 * [USED_BY]: src/agent/agent.controller.ts
 * [POS]: 服务端类型补丁，保证官方 ai-sdk-ui helper 在当前 Nest tsconfig 下可被 TypeScript 解析
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

declare module '@openai/agents-extensions/ai-sdk-ui' {
  import type { RunStreamEvent, StreamedRunResult } from '@openai/agents-core';

  type AiSdkUiMessageStreamSource =
    | StreamedRunResult<any, any>
    | ReadableStream<RunStreamEvent>
    | AsyncIterable<RunStreamEvent>
    | { toStream: () => ReadableStream<RunStreamEvent> };

  type AiSdkUiMessageStreamHeaders =
    | Headers
    | Record<string, string>
    | Array<[string, string]>;

  type AiSdkUiMessageStreamResponseOptions = {
    headers?: AiSdkUiMessageStreamHeaders;
    status?: number;
    statusText?: string;
  };

  export function createAiSdkUiMessageStreamResponse(
    source: AiSdkUiMessageStreamSource,
    options?: AiSdkUiMessageStreamResponseOptions,
  ): Response;
}
