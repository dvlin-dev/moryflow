/**
 * Action Schema - 动作执行
 *
 * [DEFINES]: ActionTypeEnum, ActionSchema
 * [USED_BY]: browser-session.controller.ts, action.handler.ts
 * [POS]: 浏览器动作的请求验证
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { z } from 'zod';

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

/** 点击选项 Schema */
const ClickOptionsSchema = z.object({
  button: z.enum(['left', 'right', 'middle']).default('left'),
  clickCount: z.number().int().min(1).max(3).default(1),
  modifiers: z.array(z.enum(['Alt', 'Control', 'Meta', 'Shift'])).optional(),
});

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
});

/** 执行动作请求 */
const BaseActionSchema = z.object({
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
  waitFor: WaitForSchema.optional(),
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
  'getText',
  'getInnerHTML',
  'getAttribute',
  'getInputValue',
  'isVisible',
  'isEnabled',
  'isChecked',
]);

export const ActionSchema = BaseActionSchema.superRefine((value, ctx) => {
  if (ACTIONS_REQUIRE_SELECTOR.has(value.type) && !value.selector) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['selector'],
      message: `selector is required for action type ${value.type}`,
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
      value.waitFor.networkIdle,
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
