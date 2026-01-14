/**
 * Browser Tools for Agent
 *
 * [PROVIDES]: Agent 可使用的浏览器操作工具
 * [DEPENDS]: @aiget/agents-core, browser/ports
 * [POS]: 将 L2 Browser API 封装为 Agent Tools（通过 ports/facade 隔离 Playwright 类型，支持取消）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { tool, type RunContext, type Tool } from '@aiget/agents-core';
import { z } from 'zod';
import type { BrowserAgentPort } from '../../browser/ports';

/** Browser Tool 上下文 */
export interface BrowserAgentContext {
  sessionId: string;
  browser: BrowserAgentPort;
  abortSignal?: AbortSignal;
}

// ========== Schema 定义 ==========

const snapshotSchema = z.object({
  interactive: z
    .boolean()
    .optional()
    .default(true)
    .describe('仅返回可交互元素'),
  maxDepth: z.number().optional().describe('最大深度限制'),
});

const selectorSchema = z.object({
  selector: z
    .string()
    .describe('元素选择器，支持 @ref 格式（如 @e1）或 CSS 选择器'),
});

const fillSchema = z.object({
  selector: z.string().describe('输入框选择器'),
  value: z.string().describe('要填写的文本'),
});

const typeSchema = z.object({
  selector: z.string().describe('输入框选择器'),
  text: z.string().describe('要逐字输入的文本'),
});

const urlSchema = z.object({
  url: z.string().url().describe('要打开的 URL'),
});

const querySchema = z.object({
  query: z.string().describe('搜索关键词'),
});

const scrollSchema = z.object({
  selector: z.string().optional().describe('要滚动的元素，不传则滚动整个页面'),
  direction: z.enum(['up', 'down', 'left', 'right']).describe('滚动方向'),
  distance: z.number().optional().default(500).describe('滚动距离（像素）'),
});

const waitSchema = z.object({
  time: z.number().optional().describe('等待时间（毫秒）'),
  selector: z.string().optional().describe('等待选择器出现'),
  selectorGone: z.string().optional().describe('等待选择器消失'),
  text: z.string().optional().describe('等待文本出现'),
});

const pressSchema = z.object({
  selector: z.string().optional().describe('目标元素'),
  key: z.string().describe('按键名称（如 Enter、Tab、Escape）'),
});

type BrowserToolRunContext = RunContext<BrowserAgentContext>;
type JsonObjectSchemaStrictLike = {
  type: 'object';
  properties: Record<string, Record<string, unknown>>;
  required: string[];
  additionalProperties: false;
};

const snapshotParameters: JsonObjectSchemaStrictLike = {
  type: 'object',
  properties: {
    interactive: {
      type: 'boolean',
      description: '仅返回可交互元素',
    },
    maxDepth: {
      type: 'number',
      description: '最大深度限制',
    },
  },
  required: [],
  additionalProperties: false,
};

const selectorParameters: JsonObjectSchemaStrictLike = {
  type: 'object',
  properties: {
    selector: {
      type: 'string',
      description: '元素选择器，支持 @ref 格式（如 @e1）或 CSS 选择器',
    },
  },
  required: ['selector'],
  additionalProperties: false,
};

const fillParameters: JsonObjectSchemaStrictLike = {
  type: 'object',
  properties: {
    selector: { type: 'string', description: '输入框选择器' },
    value: { type: 'string', description: '要填写的文本' },
  },
  required: ['selector', 'value'],
  additionalProperties: false,
};

const typeParameters: JsonObjectSchemaStrictLike = {
  type: 'object',
  properties: {
    selector: { type: 'string', description: '输入框选择器' },
    text: { type: 'string', description: '要逐字输入的文本' },
  },
  required: ['selector', 'text'],
  additionalProperties: false,
};

const urlParameters: JsonObjectSchemaStrictLike = {
  type: 'object',
  properties: {
    url: { type: 'string', description: '要打开的 URL' },
  },
  required: ['url'],
  additionalProperties: false,
};

const queryParameters: JsonObjectSchemaStrictLike = {
  type: 'object',
  properties: {
    query: { type: 'string', description: '搜索关键词' },
  },
  required: ['query'],
  additionalProperties: false,
};

const scrollParameters: JsonObjectSchemaStrictLike = {
  type: 'object',
  properties: {
    selector: {
      type: 'string',
      description: '要滚动的元素，不传则滚动整个页面',
    },
    direction: {
      type: 'string',
      enum: ['up', 'down', 'left', 'right'],
      description: '滚动方向',
    },
    distance: {
      type: 'number',
      description: '滚动距离（像素）',
    },
  },
  required: ['direction'],
  additionalProperties: false,
};

const waitParameters: JsonObjectSchemaStrictLike = {
  type: 'object',
  properties: {
    time: { type: 'number', description: '等待时间（毫秒）' },
    selector: { type: 'string', description: '等待选择器出现' },
    selectorGone: { type: 'string', description: '等待选择器消失' },
    text: { type: 'string', description: '等待文本出现' },
  },
  required: [],
  additionalProperties: false,
};

const pressParameters: JsonObjectSchemaStrictLike = {
  type: 'object',
  properties: {
    selector: { type: 'string', description: '目标元素' },
    key: { type: 'string', description: '按键名称（如 Enter、Tab、Escape）' },
  },
  required: ['key'],
  additionalProperties: false,
};

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

// ========== Tool 定义 ==========

/** 获取页面快照 */
export const snapshotTool = tool({
  name: 'browser_snapshot',
  description: `获取当前页面的可访问性树快照。返回页面结构和可交互元素的引用（@e1, @e2...）。
返回的 ref 可用于后续 click、fill 等操作。
- interactive=true: 仅返回可交互元素（button, link, input 等）
- 每次操作后应调用此工具以了解页面变化`,
  parameters: snapshotParameters,
  execute: async (input: unknown, runContext?: BrowserToolRunContext) => {
    const parsed = snapshotSchema.parse(input);
    const { browser, sessionId } = getBrowserContext(runContext);
    return browser.snapshot(sessionId, {
      interactive: parsed.interactive,
      maxDepth: parsed.maxDepth,
    });
  },
});

/** 点击元素 */
export const clickTool = tool({
  name: 'browser_click',
  description: '点击指定元素。使用 @ref 格式（如 @e1）或 CSS 选择器定位元素。',
  parameters: selectorParameters,
  execute: async (input: unknown, runContext?: BrowserToolRunContext) => {
    const parsed = selectorSchema.parse(input);
    const { browser, sessionId } = getBrowserContext(runContext);
    return await browser.executeAction(sessionId, {
      type: 'click',
      selector: parsed.selector,
      timeout: 5000,
    });
  },
});

/** 填写输入框（清空后填入） */
export const fillTool = tool({
  name: 'browser_fill',
  description: '在输入框中填写文本。会先清空原有内容，然后填入新内容。',
  parameters: fillParameters,
  execute: async (input: unknown, runContext?: BrowserToolRunContext) => {
    const parsed = fillSchema.parse(input);
    const { browser, sessionId } = getBrowserContext(runContext);
    return await browser.executeAction(sessionId, {
      type: 'fill',
      selector: parsed.selector,
      value: parsed.value,
      timeout: 5000,
    });
  },
});

/** 逐字输入文本 */
export const typeTool = tool({
  name: 'browser_type',
  description:
    '在输入框中逐字输入文本。不会清空原有内容，适合追加输入或触发输入事件。',
  parameters: typeParameters,
  execute: async (input: unknown, runContext?: BrowserToolRunContext) => {
    const parsed = typeSchema.parse(input);
    const { browser, sessionId } = getBrowserContext(runContext);
    return await browser.executeAction(sessionId, {
      type: 'type',
      selector: parsed.selector,
      value: parsed.text,
      timeout: 5000,
    });
  },
});

/** 打开 URL */
export const openTool = tool({
  name: 'browser_open',
  description: '在浏览器中打开指定 URL。',
  parameters: urlParameters,
  execute: async (input: unknown, runContext?: BrowserToolRunContext) => {
    const parsed = urlSchema.parse(input);
    const { browser, sessionId } = getBrowserContext(runContext);
    try {
      return await browser.openUrl(sessionId, {
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
  },
});

/** Web 搜索 */
export const searchTool = tool({
  name: 'web_search',
  description: '使用搜索引擎搜索信息。返回搜索结果页面的快照。',
  parameters: queryParameters,
  execute: async (input: unknown, runContext?: BrowserToolRunContext) => {
    const parsed = querySchema.parse(input);
    const { browser, sessionId } = getBrowserContext(runContext);
    try {
      const result = await browser.search(sessionId, parsed.query);
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
  },
});

/** 获取文本内容 */
export const getTextTool = tool({
  name: 'browser_getText',
  description: '获取指定元素的文本内容。',
  parameters: selectorParameters,
  execute: async (input: unknown, runContext?: BrowserToolRunContext) => {
    const parsed = selectorSchema.parse(input);
    const { browser, sessionId } = getBrowserContext(runContext);
    return await browser.executeAction(sessionId, {
      type: 'getText',
      selector: parsed.selector,
      timeout: 5000,
    });
  },
});

/** 滚动页面或元素 */
export const scrollTool = tool({
  name: 'browser_scroll',
  description: '滚动页面或指定元素。可用于查看更多内容或加载懒加载项。',
  parameters: scrollParameters,
  execute: async (input: unknown, runContext?: BrowserToolRunContext) => {
    const parsed = scrollSchema.parse(input);
    const { browser, sessionId } = getBrowserContext(runContext);
    return await browser.executeAction(sessionId, {
      type: 'scroll',
      selector: parsed.selector,
      direction: parsed.direction,
      distance: parsed.distance,
      timeout: 5000,
    });
  },
});

/** 等待条件 */
export const waitTool = tool({
  name: 'browser_wait',
  description: '等待指定条件满足。可等待时间、元素出现/消失、或文本出现。',
  parameters: waitParameters,
  execute: async (input: unknown, runContext?: BrowserToolRunContext) => {
    const parsed = waitSchema.parse(input);
    const { browser, sessionId } = getBrowserContext(runContext);
    return await browser.executeAction(sessionId, {
      type: 'wait',
      waitFor: {
        time: parsed.time,
        selector: parsed.selector,
        selectorGone: parsed.selectorGone,
        text: parsed.text,
      },
      timeout: 5000,
    });
  },
});

/** 按键 */
export const pressTool = tool({
  name: 'browser_press',
  description:
    '模拟按下键盘按键。可用于提交表单（Enter）、取消操作（Escape）等。',
  parameters: pressParameters,
  execute: async (input: unknown, runContext?: BrowserToolRunContext) => {
    const parsed = pressSchema.parse(input);
    const { browser, sessionId } = getBrowserContext(runContext);
    return await browser.executeAction(sessionId, {
      type: 'press',
      selector: parsed.selector,
      key: parsed.key,
      timeout: 5000,
    });
  },
});

/** 悬停 */
export const hoverTool = tool({
  name: 'browser_hover',
  description: '将鼠标悬停在指定元素上。可用于触发下拉菜单或工具提示。',
  parameters: selectorParameters,
  execute: async (input: unknown, runContext?: BrowserToolRunContext) => {
    const parsed = selectorSchema.parse(input);
    const { browser, sessionId } = getBrowserContext(runContext);
    return await browser.executeAction(sessionId, {
      type: 'hover',
      selector: parsed.selector,
      timeout: 5000,
    });
  },
});

/** 导出所有 Browser Tools（使用显式类型避免复杂类型推断） */
export const browserTools: Tool<BrowserAgentContext>[] = [
  snapshotTool,
  clickTool,
  fillTool,
  typeTool,
  openTool,
  searchTool,
  getTextTool,
  scrollTool,
  waitTool,
  pressTool,
  hoverTool,
];
