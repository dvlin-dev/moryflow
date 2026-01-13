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

// ========== 多窗口 Schemas ==========

/** 创建窗口请求（独立 BrowserContext，隔离 cookies/storage） */
export const CreateWindowSchema = z.object({
  /** 视口配置 */
  viewport: z
    .object({
      width: z.number().int().min(320).max(3840).default(1280),
      height: z.number().int().min(240).max(2160).default(800),
    })
    .optional(),
  /** 自定义 User-Agent */
  userAgent: z.string().max(500).optional(),
});

export type CreateWindowInput = z.infer<typeof CreateWindowSchema>;

/** 窗口信息 */
export interface WindowInfo {
  /** 窗口索引 */
  index: number;
  /** 当前 URL */
  url: string;
  /** 页面标题 */
  title: string;
  /** 是否为活跃窗口 */
  active: boolean;
  /** 标签页数量 */
  tabCount: number;
}

// ========== CDP 连接 Schemas ==========

/** CDP 连接请求 */
export const ConnectCdpSchema = z.object({
  /** WebSocket 端点 URL（优先使用） */
  wsEndpoint: z.string().url().optional(),
  /** CDP 端口（使用 HTTP 获取 wsEndpoint） */
  port: z.number().int().min(1).max(65535).optional(),
  /** 连接超时时间（毫秒） */
  timeout: z.number().int().min(1000).max(60000).default(30000),
});

export type ConnectCdpInput = z.infer<typeof ConnectCdpSchema>;

/** CDP 会话信息 */
export interface CdpSessionInfo extends SessionInfo {
  /** 是否为 CDP 连接 */
  isCdpConnection: true;
  /** WebSocket 端点 */
  wsEndpoint: string;
}

// ========== 网络拦截 Schemas ==========

/** 请求拦截规则 */
export const InterceptRuleSchema = z.object({
  /** 规则 ID（用于更新/删除） */
  id: z.string().optional(),
  /** URL 匹配模式（支持 glob） */
  urlPattern: z.string().max(500),
  /** 请求方法过滤 */
  method: z
    .enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'])
    .optional(),
  /** 修改请求头 */
  modifyHeaders: z.record(z.string()).optional(),
  /** Mock 响应（如果设置，则不转发请求） */
  mockResponse: z
    .object({
      status: z.number().int().min(100).max(599).default(200),
      headers: z.record(z.string()).optional(),
      body: z.string().optional(),
      contentType: z.string().default('application/json'),
    })
    .optional(),
  /** 是否阻止请求 */
  block: z.boolean().default(false),
});

export type InterceptRule = z.infer<typeof InterceptRuleSchema>;

/** 设置拦截规则请求 */
export const SetInterceptRulesSchema = z.object({
  rules: z.array(InterceptRuleSchema).max(50),
});

export type SetInterceptRulesInput = z.infer<typeof SetInterceptRulesSchema>;

/** 网络请求记录 */
export interface NetworkRequestRecord {
  /** 请求 ID */
  id: string;
  /** 请求 URL */
  url: string;
  /** 请求方法 */
  method: string;
  /** 请求头 */
  headers: Record<string, string>;
  /** POST 数据（如果有） */
  postData?: string;
  /** 响应状态码 */
  status?: number;
  /** 响应头 */
  responseHeaders?: Record<string, string>;
  /** 是否被拦截 */
  intercepted: boolean;
  /** 时间戳 */
  timestamp: number;
}

// ========== 会话持久化 Schemas ==========

/** 导出存储请求 */
export const ExportStorageSchema = z.object({
  /** 要导出的内容 */
  include: z
    .object({
      cookies: z.boolean().default(true),
      localStorage: z.boolean().default(true),
      sessionStorage: z.boolean().default(false),
    })
    .default({}),
  /** 过滤域名（可选，不设置则导出所有） */
  domains: z.array(z.string()).optional(),
});

export type ExportStorageInput = z.infer<typeof ExportStorageSchema>;

/** 导入存储请求 */
export const ImportStorageSchema = z.object({
  /** Cookies */
  cookies: z
    .array(
      z.object({
        name: z.string(),
        value: z.string(),
        domain: z.string(),
        path: z.string().default('/'),
        expires: z.number().optional(),
        httpOnly: z.boolean().default(false),
        secure: z.boolean().default(false),
        sameSite: z.enum(['Strict', 'Lax', 'None']).default('Lax'),
      }),
    )
    .optional(),
  /** LocalStorage 数据（按域名组织） */
  localStorage: z.record(z.record(z.string())).optional(),
  /** SessionStorage 数据（按域名组织） */
  sessionStorage: z.record(z.record(z.string())).optional(),
});

export type ImportStorageInput = z.infer<typeof ImportStorageSchema>;

/** 存储导出结果 */
export interface StorageExportResult {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires?: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'Strict' | 'Lax' | 'None';
  }>;
  localStorage: Record<string, Record<string, string>>;
  sessionStorage?: Record<string, Record<string, string>>;
  exportedAt: string;
}

// ========== 增量快照 Schemas ==========

/** 增量快照请求（扩展 SnapshotSchema） */
export const DeltaSnapshotSchema = SnapshotSchema.extend({
  /** 是否返回增量（与上次快照的差异） */
  delta: z.boolean().default(false),
});

export type DeltaSnapshotInput = z.infer<typeof DeltaSnapshotSchema>;

/** 增量快照响应 */
export interface DeltaSnapshotResponse extends SnapshotResponse {
  /** 是否为增量快照 */
  isDelta: boolean;
  /** 新增的 refs */
  addedRefs?: Record<string, RefData>;
  /** 移除的 refs */
  removedRefs?: string[];
  /** 变更的 refs */
  changedRefs?: Record<string, RefData>;
  /** 上次快照的哈希（用于验证增量基准） */
  baseHash?: string;
  /** 当前快照的哈希 */
  currentHash: string;
}
