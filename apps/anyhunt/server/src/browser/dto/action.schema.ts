/**
 * Action Schema - 动作执行
 *
 * [DEFINES]: ActionTypeEnum, ActionSchema
 * [USED_BY]: browser-session.controller.ts, action.handler.ts
 * [POS]: 浏览器动作的请求验证（upload Base64 长度受限）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { z } from 'zod';
import { BROWSER_UPLOAD_MAX_BYTES } from '../browser.constants';

const MAX_UPLOAD_BASE64_LENGTH = Math.ceil(BROWSER_UPLOAD_MAX_BYTES / 3) * 4;

/** 语义定位器 */
const LocatorSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('selector'),
    selector: z.string().max(1000),
  }),
  z.object({
    type: z.literal('role'),
    role: z.string().max(100),
    name: z.string().max(500).optional(),
    exact: z.boolean().optional(),
  }),
  z.object({
    type: z.literal('text'),
    text: z.string().max(1000),
    exact: z.boolean().optional(),
  }),
  z.object({
    type: z.literal('label'),
    label: z.string().max(500),
    exact: z.boolean().optional(),
  }),
  z.object({
    type: z.literal('placeholder'),
    placeholder: z.string().max(500),
    exact: z.boolean().optional(),
  }),
  z.object({
    type: z.literal('alt'),
    alt: z.string().max(500),
    exact: z.boolean().optional(),
  }),
  z.object({
    type: z.literal('title'),
    title: z.string().max(500),
    exact: z.boolean().optional(),
  }),
  z.object({
    type: z.literal('testId'),
    testId: z.string().max(200),
  }),
]);

const LocatorInputSchema = z.union([z.string().max(1000), LocatorSchema]);

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
  // 高级交互
  'drag',
  'upload',
  'highlight',
  // 内容/脚本
  'evaluate',
  'setContent',
  'pdf',
  'download',
  // 信息获取
  'getText',
  'getInnerHTML',
  'getAttribute',
  'getInputValue',
  'getCount',
  'getBoundingBox',
  // 状态检查
  'isVisible',
  'isEnabled',
  'isChecked',
  // 运行时环境
  'setViewport',
  'setGeolocation',
  'setPermissions',
  'clearPermissions',
  'setMedia',
  'setOffline',
  'setHeaders',
  'setHttpCredentials',
]);

export type ActionType = z.infer<typeof ActionTypeEnum>;

/** 点击选项 Schema */
const ClickOptionsSchema = z.object({
  button: z.enum(['left', 'right', 'middle']).default('left'),
  clickCount: z.number().int().min(1).max(3).default(1),
  modifiers: z.array(z.enum(['Alt', 'Control', 'Meta', 'Shift'])).optional(),
});

/** 上传文件 payload（Base64） */
const UploadFileSchema = z.object({
  name: z.string().min(1).max(200),
  mimeType: z.string().max(200).optional(),
  dataBase64: z
    .string()
    .min(1)
    .max(
      MAX_UPLOAD_BASE64_LENGTH,
      `Base64 payload exceeds ${MAX_UPLOAD_BASE64_LENGTH} characters.`,
    ),
});

const UploadFilesSchema = z.union([
  UploadFileSchema,
  z.array(UploadFileSchema).min(1).max(10),
]);

/** 等待条件 Schema */
const WaitForSchema = z.object({
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
  /** 等待加载状态 */
  loadState: z.enum(['load', 'domcontentloaded', 'networkidle']).optional(),
  /** 等待函数返回 true（JS 字符串） */
  function: z.string().max(2000).optional(),
  /** 等待下载触发 */
  download: z.boolean().optional(),
});

/** 执行动作请求 */
const BaseActionSchema = z.object({
  /** 动作类型 */
  type: ActionTypeEnum,
  /** 元素选择器（支持 @ref 格式或 CSS 选择器） */
  selector: z.string().max(1000).optional(),
  /** 语义定位器（role/text/label/placeholder/alt/title/testId） */
  locator: LocatorSchema.optional(),
  /** drag 源元素 */
  source: LocatorInputSchema.optional(),
  /** drag 目标元素 */
  target: LocatorInputSchema.optional(),
  /** fill/type 的值 */
  value: z.string().max(10000).optional(),
  /** upload 的文件 payload（Base64） */
  files: UploadFilesSchema.optional(),
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
  waitFor: WaitForSchema.optional(),
  /** evaluate 的脚本 */
  script: z.string().max(10000).optional(),
  /** evaluate 的参数 */
  arg: z.unknown().optional(),
  /** setContent 的 HTML */
  html: z.string().optional(),
  /** pdf 输出格式 */
  pdfFormat: z
    .enum([
      'Letter',
      'Legal',
      'Tabloid',
      'Ledger',
      'A0',
      'A1',
      'A2',
      'A3',
      'A4',
      'A5',
      'A6',
    ])
    .optional(),
  /** 是否上传下载结果到存储 */
  storeDownload: z.boolean().optional(),
  /** viewport 设置 */
  viewport: z
    .object({
      width: z.number().int().min(320).max(3840),
      height: z.number().int().min(240).max(2160),
    })
    .optional(),
  /** geolocation 设置 */
  geolocation: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      accuracy: z.number().min(0).max(10000).optional(),
    })
    .optional(),
  /** permissions 设置 */
  permissions: z.array(z.string()).max(50).optional(),
  /** media 设置 */
  colorScheme: z.enum(['light', 'dark', 'no-preference']).optional(),
  reducedMotion: z.enum(['reduce', 'no-preference']).optional(),
  /** offline 设置 */
  offline: z.boolean().optional(),
  /** 全局 headers */
  headers: z.record(z.string(), z.string()).optional(),
  /** HTTP 基本认证 */
  httpCredentials: z
    .object({
      username: z.string().min(1).max(200),
      password: z.string().min(1).max(200),
    })
    .optional(),
  /** 操作超时（毫秒） */
  timeout: z.number().int().min(100).max(30000).default(5000),
  /** click 选项 */
  clickOptions: ClickOptionsSchema.optional(),
});

const ACTIONS_REQUIRE_SELECTOR = new Set<ActionType>([
  'click',
  'dblclick',
  'fill',
  'type',
  'hover',
  'focus',
  'blur',
  'check',
  'uncheck',
  'selectOption',
  'scrollIntoView',
  'upload',
  'highlight',
  'getText',
  'getInnerHTML',
  'getAttribute',
  'getInputValue',
  'getCount',
  'getBoundingBox',
  'isVisible',
  'isEnabled',
  'isChecked',
]);

export const ActionSchema = BaseActionSchema.superRefine((value, ctx) => {
  const hasTarget = Boolean(value.selector || value.locator);

  if (ACTIONS_REQUIRE_SELECTOR.has(value.type) && !hasTarget) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['selector'],
      message: `selector or locator is required for action type ${value.type}`,
    });
  }

  if (value.type === 'fill' || value.type === 'type') {
    if (value.value === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['value'],
        message: `${value.type} requires a value`,
      });
    }
  }

  if (value.type === 'selectOption') {
    if (!value.options || value.options.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['options'],
        message: 'selectOption requires options',
      });
    }
  }

  if (value.type === 'upload') {
    if (!value.files) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['files'],
        message: 'upload requires files',
      });
    }
  }

  if (value.type === 'drag') {
    if (!value.source || !value.target) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['source'],
        message: 'drag requires source and target',
      });
    }
  }

  if (value.type === 'evaluate' && !value.script) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['script'],
      message: 'evaluate requires script',
    });
  }

  if (value.type === 'setContent' && !value.html) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['html'],
      message: 'setContent requires html',
    });
  }

  if (value.type === 'setViewport' && !value.viewport) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['viewport'],
      message: 'setViewport requires viewport',
    });
  }

  if (value.type === 'setGeolocation' && !value.geolocation) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['geolocation'],
      message: 'setGeolocation requires geolocation',
    });
  }

  if (value.type === 'setPermissions' && !value.permissions) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['permissions'],
      message: 'setPermissions requires permissions',
    });
  }

  if (value.type === 'setMedia') {
    if (!value.colorScheme && !value.reducedMotion) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['colorScheme'],
        message: 'setMedia requires colorScheme or reducedMotion',
      });
    }
  }

  if (value.type === 'setOffline' && value.offline === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['offline'],
      message: 'setOffline requires offline boolean',
    });
  }

  if (value.type === 'setHeaders' && !value.headers) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['headers'],
      message: 'setHeaders requires headers',
    });
  }

  if (value.type === 'setHttpCredentials' && !value.httpCredentials) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['httpCredentials'],
      message: 'setHttpCredentials requires httpCredentials',
    });
  }

  if (value.type === 'press') {
    if (!value.key) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['key'],
        message: 'press requires a key',
      });
    }
  }

  if (value.type === 'getAttribute') {
    if (!value.attribute) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['attribute'],
        message: 'getAttribute requires an attribute name',
      });
    }
  }

  if (value.type === 'wait') {
    if (!value.waitFor) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['waitFor'],
        message: 'wait requires a waitFor condition',
      });
      return;
    }

    const hasCondition = Boolean(
      value.waitFor.time !== undefined ||
      value.waitFor.selector ||
      value.waitFor.selectorGone ||
      value.waitFor.url ||
      value.waitFor.text ||
      value.waitFor.networkIdle ||
      value.waitFor.loadState ||
      value.waitFor.function ||
      value.waitFor.download,
    );

    if (!hasCondition) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['waitFor'],
        message: 'wait requires at least one condition',
      });
    }
  }
});

export type ActionInput = z.infer<typeof ActionSchema>;
export type LocatorInput = z.infer<typeof LocatorSchema>;
export type LocatorSelectorInput = z.infer<typeof LocatorInputSchema>;

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
