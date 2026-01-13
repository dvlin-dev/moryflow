/**
 * Browser Tools for Agent
 *
 * [PROVIDES]: Agent 可使用的浏览器操作工具
 * [DEPENDS]: @aiget/agents-core, browser 模块
 * [POS]: 将 L2 Browser API 封装为 Agent Tools
 */

import { tool } from '@aiget/agents-core';
import { z } from 'zod';
import type { BrowserSession } from '../../browser/session';
import type { SnapshotService } from '../../browser/snapshot';
import type { ActionHandler } from '../../browser/handlers';
import type { UrlValidator } from '../../common';

/** Browser Tool 上下文 */
export interface BrowserToolContext {
  session: BrowserSession;
  snapshotService: SnapshotService;
  actionHandler: ActionHandler;
  urlValidator: UrlValidator;
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

// ========== Tool 定义 ==========

/** 获取页面快照 */
export const snapshotTool = tool({
  name: 'browser_snapshot',
  description: `获取当前页面的可访问性树快照。返回页面结构和可交互元素的引用（@e1, @e2...）。
返回的 ref 可用于后续 click、fill 等操作。
- interactive=true: 仅返回可交互元素（button, link, input 等）
- 每次操作后应调用此工具以了解页面变化`,
  parameters: snapshotSchema,
  execute: async (input, runContext) => {
    const ctx = runContext?.context as BrowserToolContext | undefined;
    if (!ctx) {
      throw new Error('Browser context not available');
    }
    const { snapshotService, session } = ctx;
    const result = await snapshotService.capture(session.page, {
      interactive: input.interactive,
      maxDepth: input.maxDepth,
    });

    // 更新会话的 refs 映射，确保后续操作可以使用新的 refs
    session.refs = result.refs;

    return result.snapshot;
  },
});

/** 点击元素 */
export const clickTool = tool({
  name: 'browser_click',
  description: '点击指定元素。使用 @ref 格式（如 @e1）或 CSS 选择器定位元素。',
  parameters: selectorSchema,
  execute: async (input, runContext) => {
    const ctx = runContext?.context as BrowserToolContext | undefined;
    if (!ctx) {
      throw new Error('Browser context not available');
    }
    const { actionHandler, session } = ctx;
    return await actionHandler.execute(session, {
      type: 'click',
      selector: input.selector,
    });
  },
});

/** 填写输入框（清空后填入） */
export const fillTool = tool({
  name: 'browser_fill',
  description: '在输入框中填写文本。会先清空原有内容，然后填入新内容。',
  parameters: fillSchema,
  execute: async (input, runContext) => {
    const ctx = runContext?.context as BrowserToolContext | undefined;
    if (!ctx) {
      throw new Error('Browser context not available');
    }
    const { actionHandler, session } = ctx;
    return await actionHandler.execute(session, {
      type: 'fill',
      selector: input.selector,
      value: input.value,
    });
  },
});

/** 逐字输入文本 */
export const typeTool = tool({
  name: 'browser_type',
  description:
    '在输入框中逐字输入文本。不会清空原有内容，适合追加输入或触发输入事件。',
  parameters: typeSchema,
  execute: async (input, runContext) => {
    const ctx = runContext?.context as BrowserToolContext | undefined;
    if (!ctx) {
      throw new Error('Browser context not available');
    }
    const { actionHandler, session } = ctx;
    return await actionHandler.execute(session, {
      type: 'type',
      selector: input.selector,
      value: input.text,
    });
  },
});

/** 打开 URL */
export const openTool = tool({
  name: 'browser_open',
  description: '在浏览器中打开指定 URL。',
  parameters: urlSchema,
  execute: async (input, runContext) => {
    const ctx = runContext?.context as BrowserToolContext | undefined;
    if (!ctx) {
      throw new Error('Browser context not available');
    }
    const { session, urlValidator } = ctx;

    // SSRF 防护
    if (!urlValidator.isAllowed(input.url)) {
      return {
        success: false,
        error: `URL not allowed: ${input.url}. Access to internal/private addresses is blocked.`,
      };
    }

    await session.page.goto(input.url, { waitUntil: 'domcontentloaded' });
    return { success: true, url: session.page.url() };
  },
});

/** Web 搜索 */
export const searchTool = tool({
  name: 'web_search',
  description: '使用搜索引擎搜索信息。返回搜索结果页面的快照。',
  parameters: querySchema,
  execute: async (input, runContext) => {
    const ctx = runContext?.context as BrowserToolContext | undefined;
    if (!ctx) {
      throw new Error('Browser context not available');
    }
    const { session, snapshotService } = ctx;
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(input.query)}`;
    await session.page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    const result = await snapshotService.capture(session.page, {
      interactive: true,
    });
    return {
      success: true,
      url: session.page.url(),
      snapshot: result.snapshot,
    };
  },
});

/** 获取文本内容 */
export const getTextTool = tool({
  name: 'browser_getText',
  description: '获取指定元素的文本内容。',
  parameters: selectorSchema,
  execute: async (input, runContext) => {
    const ctx = runContext?.context as BrowserToolContext | undefined;
    if (!ctx) {
      throw new Error('Browser context not available');
    }
    const { actionHandler, session } = ctx;
    return await actionHandler.execute(session, {
      type: 'getText',
      selector: input.selector,
    });
  },
});

/** 滚动页面或元素 */
export const scrollTool = tool({
  name: 'browser_scroll',
  description: '滚动页面或指定元素。可用于查看更多内容或加载懒加载项。',
  parameters: scrollSchema,
  execute: async (input, runContext) => {
    const ctx = runContext?.context as BrowserToolContext | undefined;
    if (!ctx) {
      throw new Error('Browser context not available');
    }
    const { actionHandler, session } = ctx;
    return await actionHandler.execute(session, {
      type: 'scroll',
      selector: input.selector,
      direction: input.direction,
      distance: input.distance,
    });
  },
});

/** 等待条件 */
export const waitTool = tool({
  name: 'browser_wait',
  description: '等待指定条件满足。可等待时间、元素出现/消失、或文本出现。',
  parameters: waitSchema,
  execute: async (input, runContext) => {
    const ctx = runContext?.context as BrowserToolContext | undefined;
    if (!ctx) {
      throw new Error('Browser context not available');
    }
    const { actionHandler, session } = ctx;
    return await actionHandler.execute(session, {
      type: 'wait',
      waitFor: {
        time: input.time,
        selector: input.selector,
        selectorGone: input.selectorGone,
        text: input.text,
      },
    });
  },
});

/** 按键 */
export const pressTool = tool({
  name: 'browser_press',
  description:
    '模拟按下键盘按键。可用于提交表单（Enter）、取消操作（Escape）等。',
  parameters: pressSchema,
  execute: async (input, runContext) => {
    const ctx = runContext?.context as BrowserToolContext | undefined;
    if (!ctx) {
      throw new Error('Browser context not available');
    }
    const { actionHandler, session } = ctx;
    return await actionHandler.execute(session, {
      type: 'press',
      selector: input.selector,
      key: input.key,
    });
  },
});

/** 悬停 */
export const hoverTool = tool({
  name: 'browser_hover',
  description: '将鼠标悬停在指定元素上。可用于触发下拉菜单或工具提示。',
  parameters: selectorSchema,
  execute: async (input, runContext) => {
    const ctx = runContext?.context as BrowserToolContext | undefined;
    if (!ctx) {
      throw new Error('Browser context not available');
    }
    const { actionHandler, session } = ctx;
    return await actionHandler.execute(session, {
      type: 'hover',
      selector: input.selector,
    });
  },
});

/** 导出所有 Browser Tools */
export const browserTools = [
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
