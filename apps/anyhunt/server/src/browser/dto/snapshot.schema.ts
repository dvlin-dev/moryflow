/**
 * Snapshot Schema - 快照相关
 *
 * [DEFINES]: SnapshotSchema, DeltaSnapshotSchema
 * [USED_BY]: browser-session.controller.ts, snapshot.service.ts
 * [POS]: 页面快照的请求验证
 */

import { z } from 'zod';
import type { RefData } from './types';

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

/** 增量快照请求（扩展 SnapshotSchema） */
export const DeltaSnapshotSchema = SnapshotSchema.extend({
  /** 是否返回增量（与上次快照的差异） */
  delta: z.boolean().default(false),
});

export type DeltaSnapshotInput = z.infer<typeof DeltaSnapshotSchema>;

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
