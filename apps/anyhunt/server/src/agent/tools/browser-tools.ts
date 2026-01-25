/**
 * Browser Tools for Agent
 *
 * [PROVIDES]: Agent 可使用的浏览器操作工具
 * [DEPENDS]: @openai/agents-core, browser/ports
 * [POS]: 将 L2 Browser API 封装为 Agent Tools（通过 ports/facade 隔离 Playwright 类型，支持取消）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { tool, type RunContext, type Tool } from '@openai/agents-core';
import { z } from 'zod';
import type { BrowserAgentPort } from '../../browser/ports';
import { ActionSchema, ActionBatchSchema } from '../../browser/dto';
import { zodToJsonSchema } from './zod-to-json-schema';

export interface BrowserAgentContext {
  browser: BrowserAgentPort;
  getSessionId: () => Promise<string>;
  abortSignal?: AbortSignal;
}

type BrowserToolRunContext = RunContext<BrowserAgentContext>;

type SessionHandler<T> = (
  context: BrowserAgentContext,
  sessionId: string,
) => Promise<T>;

const snapshotSchema = z.object({
  interactive: z
    .boolean()
    .optional()
    .default(true)
    .describe('仅返回可交互元素'),
  maxDepth: z.number().optional().describe('最大深度限制'),
});

const urlSchema = z.object({
  url: z.string().url().describe('要打开的 URL'),
});

const querySchema = z.object({
  query: z.string().describe('搜索关键词'),
});

const getBrowserContext = (
  runContext?: BrowserToolRunContext,
): BrowserAgentContext => {
  const context = runContext?.context;
  if (!context) {
    throw new Error('Browser agent context not available');
  }
  if (context.abortSignal?.aborted) {
    throw new Error('Task cancelled by user');
  }
  return context;
};

const withSession = async <T>(
  runContext: BrowserToolRunContext | undefined,
  handler: SessionHandler<T>,
): Promise<T> => {
  const context = getBrowserContext(runContext);
  const sessionId = await context.getSessionId();
  return handler(context, sessionId);
};

export const snapshotTool = tool({
  name: 'browser_snapshot',
  description: `获取当前页面的可访问性树快照。返回页面结构和可交互元素的引用（@e1, @e2...）。
返回的 ref 可用于后续 action 操作。
- interactive=true: 仅返回可交互元素（button, link, input 等）
- 每次操作后应调用此工具以了解页面变化`,
  parameters: zodToJsonSchema(snapshotSchema),
  execute: async (input: unknown, runContext?: BrowserToolRunContext) => {
    const parsed = snapshotSchema.parse(input);
    return withSession(runContext, (context, sessionId) =>
      context.browser.snapshot(sessionId, {
        interactive: parsed.interactive,
        maxDepth: parsed.maxDepth,
      }),
    );
  },
});

export const openTool = tool({
  name: 'browser_open',
  description: '在浏览器中打开指定 URL。',
  parameters: zodToJsonSchema(urlSchema),
  execute: async (input: unknown, runContext?: BrowserToolRunContext) => {
    const parsed = urlSchema.parse(input);
    return withSession(runContext, async (context, sessionId) => {
      try {
        return await context.browser.openUrl(sessionId, {
          url: parsed.url,
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          error: message,
        };
      }
    });
  },
});

export const searchTool = tool({
  name: 'web_search',
  description: '使用搜索引擎搜索信息。返回搜索结果页面的快照。',
  parameters: zodToJsonSchema(querySchema),
  execute: async (input: unknown, runContext?: BrowserToolRunContext) => {
    const parsed = querySchema.parse(input);
    return withSession(runContext, async (context, sessionId) => {
      try {
        const result = await context.browser.search(sessionId, parsed.query);
        return {
          success: true,
          url: result.url,
          snapshot: result.snapshot,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          error: message,
        };
      }
    });
  },
});

export const browserTools: Tool<BrowserAgentContext>[] = [
  snapshotTool,
  openTool,
  searchTool,
  tool({
    name: 'browser_action',
    description:
      '执行任意浏览器动作（支持语义定位、下载、PDF、evaluate、等待等高级能力）。',
    parameters: zodToJsonSchema(ActionSchema),
    execute: async (input: unknown, runContext?: BrowserToolRunContext) => {
      const parsed = ActionSchema.parse(input);
      return withSession(runContext, (context, sessionId) =>
        context.browser.executeAction(sessionId, parsed),
      );
    },
  }),
  tool({
    name: 'browser_action_batch',
    description: '批量执行浏览器动作，减少往返。',
    parameters: zodToJsonSchema(ActionBatchSchema),
    execute: async (input: unknown, runContext?: BrowserToolRunContext) => {
      const parsed = ActionBatchSchema.parse(input);
      return withSession(runContext, (context, sessionId) =>
        context.browser.executeActionBatch(sessionId, parsed),
      );
    },
  }),
];
