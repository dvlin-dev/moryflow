/**
 * Browser Session DTO - Zod Schemas
 *
 * [DEFINES]: L2 Browser API 请求/响应类型
 * [USED_BY]: browser-session.controller.ts, browser-session.service.ts
 * [POS]: Zod schemas + 推断类型（单一数据源）
 */

import { z } from 'zod';

// ========== 会话管理 Schemas ==========

/** 创建会话请求 */
export const CreateSessionSchema = z.object({
  /** 视口宽度 */
  viewport: z
    .object({
      width: z.number().int().min(320).max(3840).default(1280),
      height: z.number().int().min(240).max(2160).default(800),
    })
    .optional(),
  /** 自定义 User-Agent */
  userAgent: z.string().max(500).optional(),
  /** 会话超时时间（毫秒，默认 5 分钟） */
  timeout: z.number().int().min(10000).max(1800000).default(300000),
  /** 是否启用 JavaScript */
  javaScriptEnabled: z.boolean().default(true),
  /** 是否忽略 HTTPS 错误 */
  ignoreHTTPSErrors: z.boolean().default(true),
});

export type CreateSessionInput = z.infer<typeof CreateSessionSchema>;

/** 打开 URL 请求 */
export const OpenUrlSchema = z.object({
  /** 要打开的 URL */
  url: z.string().url(),
  /** 等待条件 */
  waitUntil: z
    .enum(['load', 'domcontentloaded', 'networkidle', 'commit'])
    .default('domcontentloaded'),
  /** 超时时间（毫秒） */
  timeout: z.number().int().min(1000).max(60000).default(30000),
});

export type OpenUrlInput = z.infer<typeof OpenUrlSchema>;

// ========== Snapshot Schemas ==========

/** 获取快照请求 */
export const SnapshotSchema = z.object({
  /** 仅返回可交互元素 */
  interactive: z.boolean().default(false),
  /** 紧凑模式（省略空白和结构元素） */
  compact: z.boolean().default(false),
  /** 最大深度限制 */
  maxDepth: z.number().int().min(1).max(50).optional(),
  /** CSS 选择器范围（仅快照指定元素内容） */
  scope: z.string().max(500).optional(),
});

export type SnapshotInput = z.infer<typeof SnapshotSchema>;

// ========== Action Schemas ==========

/** 动作类型枚举 */
export const ActionTypeEnum = z.enum([
  // 导航
  'back',
  'forward',
  'reload',
  // 交互
  'click',
  'dblclick',
  'fill',
  'type',
  'press',
  'hover',
  'focus',
  'blur',
  'check',
  'uncheck',
  'selectOption',
  // 滚动
  'scroll',
  'scrollIntoView',
  // 等待
  'wait',
  // 信息获取
  'getText',
  'getInnerHTML',
  'getAttribute',
  'getInputValue',
  // 状态检查
  'isVisible',
  'isEnabled',
  'isChecked',
]);

export type ActionType = z.infer<typeof ActionTypeEnum>;

/** 执行动作请求 */
export const ActionSchema = z.object({
  /** 动作类型 */
  type: ActionTypeEnum,
  /** 元素选择器（支持 @ref 格式或 CSS 选择器） */
  selector: z.string().max(1000).optional(),
  /** fill/type 的值 */
  value: z.string().max(10000).optional(),
  /** press 的按键 */
  key: z.string().max(50).optional(),
  /** getAttribute 的属性名 */
  attribute: z.string().max(100).optional(),
  /** selectOption 的选项值 */
  options: z.array(z.string()).optional(),
  /** scroll 的方向 */
  direction: z.enum(['up', 'down', 'left', 'right']).optional(),
  /** scroll 的距离（像素） */
  distance: z.number().int().optional(),
  /** wait 的条件 */
  waitFor: z
    .object({
      /** 等待时间（毫秒） */
      time: z.number().int().min(0).max(30000).optional(),
      /** 等待选择器出现 */
      selector: z.string().max(500).optional(),
      /** 等待选择器消失 */
      selectorGone: z.string().max(500).optional(),
      /** 等待 URL 变化（支持正则） */
      url: z.string().max(500).optional(),
      /** 等待文本出现 */
      text: z.string().max(500).optional(),
      /** 等待网络空闲 */
      networkIdle: z.boolean().optional(),
    })
    .optional(),
  /** 操作超时（毫秒） */
  timeout: z.number().int().min(100).max(30000).default(5000),
  /** click 选项 */
  clickOptions: z
    .object({
      button: z.enum(['left', 'right', 'middle']).default('left'),
      clickCount: z.number().int().min(1).max(3).default(1),
      modifiers: z
        .array(z.enum(['Alt', 'Control', 'Meta', 'Shift']))
        .optional(),
    })
    .optional(),
});

export type ActionInput = z.infer<typeof ActionSchema>;

// ========== 截图 Schemas ==========

/** 截图请求 */
export const ScreenshotSchema = z.object({
  /** 元素选择器（可选，不提供则截取整个视口） */
  selector: z.string().max(500).optional(),
  /** 是否全页截图 */
  fullPage: z.boolean().default(false),
  /** 图片格式 */
  format: z.enum(['png', 'jpeg']).default('png'),
  /** JPEG 质量（1-100） */
  quality: z.number().int().min(1).max(100).optional(),
});

export type ScreenshotInput = z.infer<typeof ScreenshotSchema>;

// ========== 响应类型 ==========

/** 会话信息 */
export interface SessionInfo {
  id: string;
  createdAt: string;
  expiresAt: string;
  url: string | null;
  title: string | null;
}

/** Ref 元素信息 */
export interface RefData {
  /** ARIA 角色 */
  role: string;
  /** 元素名称/文本 */
  name?: string;
  /** 重复元素索引（仅当存在多个相同 role+name 时） */
  nth?: number;
}

/** 快照响应 */
export interface SnapshotResponse {
  /** 可访问性树文本 */
  tree: string;
  /** 元素引用映射 */
  refs: Record<string, RefData>;
  /** 统计信息 */
  stats: {
    /** 总行数 */
    lines: number;
    /** 总字符数 */
    chars: number;
    /** ref 数量 */
    refs: number;
    /** 可交互元素数量 */
    interactive: number;
  };
}

/** 动作执行响应 */
export interface ActionResponse {
  success: boolean;
  /** 获取类操作的返回值 */
  result?: unknown;
  /** 错误信息 */
  error?: string;
  /** AI 友好的错误修复建议 */
  suggestion?: string;
}

/** 截图响应 */
export interface ScreenshotResponse {
  /** Base64 编码的图片数据 */
  data: string;
  /** MIME 类型 */
  mimeType: string;
  /** 宽度 */
  width: number;
  /** 高度 */
  height: number;
}
